
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, BrainCircuit, Loader2, Wallet, ReceiptText, CalendarDays, Coins, LayoutGrid, History, AlertTriangle, Pencil, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format, getDaysInMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  // Extra budget state
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');

  const [newCategory, setNewCategory] = useState({ name: '', type: 'daily' });
  const [newFixed, setNewFixed] = useState({ name: '', amount: '', categoryId: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', categoryId: '' });

  const now = new Date();
  const monthId = format(now, 'yyyyMM');
  const todayStr = format(now, 'yyyy-MM-dd');
  const monthName = format(now, 'MMMM yyyy');
  const daysInMonth = getDaysInMonth(now);

  const categoriesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenseCategories');
  }, [db, user]);

  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [db, user, monthId]);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [db, user, monthId]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [db, user, monthId]);

  const { data: categories } = useCollection(categoriesRef);
  const { data: fixedExpenses } = useCollection(fixedExpensesRef);
  const { data: monthlyBudgetDoc } = useDoc(monthlyBudgetRef);
  const { data: expenses } = useCollection(expensesRef);

  const dailyCategories = categories?.filter(c => c.type === 'daily') || [];
  const fixedCategories = categories?.filter(c => c.type === 'fixed') || [];

  const totalIncludedFixed = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthlyPool = (monthlyBudgetDoc?.totalBudgetAmount || 0) - totalIncludedFixed;
  const totalSpentThisMonth = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remainingNetPool = netMonthlyPool - totalSpentThisMonth;

  // Standard static daily base budget (Net Pool / Days in Month)
  const dailyBase = netMonthlyPool / daysInMonth;
  const calculatedWeekendBonus = Math.round(dailyBase * 0.5);

  const budgetReport = useMemo(() => {
    if (!monthlyBudgetDoc || !expenses) return null;

    const dailyExpensesMap: Record<string, number> = {};
    expenses.forEach(exp => {
      dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
    });

    const config: MonthlyConfig = {
      totalBudget: monthlyBudgetDoc.totalBudgetAmount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
      fixedExpenses: (fixedExpenses || []).map(f => ({
        id: f.id,
        name: f.name,
        amount: f.amount,
        included: f.includeInBudget
      })),
      saturdayExtra: monthlyBudgetDoc.isWeekendExtraBudgetEnabled ? calculatedWeekendBonus : 0,
      sundayExtra: monthlyBudgetDoc.isWeekendExtraBudgetEnabled ? calculatedWeekendBonus : 0,
      holidayExtra: 0,
      isWeekendEnabled: monthlyBudgetDoc.isWeekendExtraBudgetEnabled || false,
      isHolidayEnabled: false
    };

    return calculateRollingBudget(config, dailyExpensesMap, []);
  }, [monthlyBudgetDoc, expenses, fixedExpenses, now, calculatedWeekendBonus]);

  const todayReport = budgetReport?.[todayStr];
  const dailyAllocationToday = dailyBase + (todayReport?.extraBudget || 0);
  const isOverspentToday = (todayReport?.spent || 0) > dailyAllocationToday;
  const isWithinBudget = (todayReport?.spent || 0) > 0 && !isOverspentToday;

  useEffect(() => {
    if (isOverspentToday) {
      toast({
        variant: "destructive",
        title: "Daily Budget Exceeded!",
        description: `You've spent ₹${(todayReport?.spent || 0).toFixed(0)}, which is ₹${((todayReport?.spent || 0) - dailyAllocationToday).toFixed(0)} more than your daily target.`,
      });
    }
  }, [isOverspentToday, todayReport?.spent, dailyAllocationToday, toast]);

  const saveMonthlyBudget = (updates: any) => {
    if (!monthlyBudgetRef || !user) return;
    
    const currentData = monthlyBudgetDoc || {};
    const finalUpdates = { ...updates };
    
    // If setting total for the first time, initialize base budget
    if (updates.totalBudgetAmount !== undefined && !currentData.baseBudgetAmount) {
      finalUpdates.baseBudgetAmount = updates.totalBudgetAmount;
      finalUpdates.extraBudgetAmount = 0;
    }

    setDocumentNonBlocking(monthlyBudgetRef, {
      ...finalUpdates,
      userId: user.uid,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      updatedAt: new Date().toISOString(),
      createdAt: currentData.createdAt || new Date().toISOString(),
    }, { merge: true });
  };

  const handleAddExtra = () => {
    const added = parseFloat(extraAmount) || 0;
    if (added <= 0) return;
    
    const currentTotal = monthlyBudgetDoc?.totalBudgetAmount || 0;
    const currentExtra = monthlyBudgetDoc?.extraBudgetAmount || 0;
    
    saveMonthlyBudget({ 
      totalBudgetAmount: currentTotal + added,
      extraBudgetAmount: currentExtra + added
    });
    
    setExtraAmount('');
    setIsAddingExtra(false);
    toast({ title: "Extra funds added", description: `Added ₹${added} to your monthly budget.` });
  };

  const addCategory = () => {
    if (!newCategory.name.trim() || !categoriesRef) return;
    addDocumentNonBlocking(categoriesRef, {
      userId: user?.uid,
      name: newCategory.name.trim(),
      type: newCategory.type,
      createdAt: new Date().toISOString()
    });
    setNewCategory({ ...newCategory, name: '' });
    toast({ title: "Category added" });
  };

  const deleteCategory = (id: string) => {
    if (!categoriesRef) return;
    deleteDocumentNonBlocking(doc(categoriesRef, id));
  };

  const addFixedExpense = () => {
    if (!newFixed.name || !newFixed.amount || !newFixed.categoryId || !fixedExpensesRef) {
      toast({ variant: 'destructive', title: 'Missing Info' });
      return;
    }
    setLoading(true);
    addDocumentNonBlocking(fixedExpensesRef, {
      userId: user?.uid,
      monthlyBudgetId: monthId,
      name: newFixed.name,
      amount: parseFloat(newFixed.amount),
      expenseCategoryId: newFixed.categoryId,
      includeInBudget: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      setNewFixed({ name: '', amount: '', categoryId: '' });
      setLoading(false);
      toast({ title: "Fixed expense added" });
    });
  };

  const toggleFixed = (id: string, current: boolean) => {
    if (!fixedExpensesRef) return;
    updateDocumentNonBlocking(doc(fixedExpensesRef, id), { includeInBudget: !current });
  };

  const deleteFixed = (id: string) => {
    if (!fixedExpensesRef) return;
    deleteDocumentNonBlocking(doc(fixedExpensesRef, id));
  };

  const handleLogExpense = () => {
    if (!newExpense.amount || !newExpense.categoryId || !user || !expensesRef) {
      toast({ variant: 'destructive', title: 'Missing Information' });
      return;
    }
    
    setLoading(true);
    const expenseData = {
      userId: user.uid,
      monthlyBudgetId: monthId,
      description: newExpense.description || '',
      amount: parseFloat(newExpense.amount),
      expenseCategoryId: newExpense.categoryId,
      date: editingExpenseId ? (expenses?.find(e => e.id === editingExpenseId)?.date || todayStr) : todayStr,
      updatedAt: new Date().toISOString()
    };

    if (editingExpenseId) {
      updateDocumentNonBlocking(doc(expensesRef, editingExpenseId), expenseData);
      setEditingExpenseId(null);
      toast({ title: "Expense updated" });
    } else {
      addDocumentNonBlocking(expensesRef, {
        ...expenseData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Expense logged" });
    }

    setNewExpense({ description: '', amount: '', categoryId: '' });
    setLoading(false);
  };

  const handleStartEdit = (exp: any) => {
    setEditingExpenseId(exp.id);
    setNewExpense({
      description: exp.description || '',
      amount: exp.amount.toString(),
      categoryId: exp.expenseCategoryId
    });
    // Scroll to logger on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingExpenseId(null);
    setNewExpense({ description: '', amount: '', categoryId: '' });
  };

  const deleteExpense = (id: string) => {
    if (!expensesRef) return;
    deleteDocumentNonBlocking(doc(expensesRef, id));
    toast({ title: "Expense removed" });
  };

  const handleAiSuggest = async () => {
    if (!newExpense.description || !dailyCategories.length) return;
    setAiLoading(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: newExpense.description,
        existingCategories: dailyCategories.map(c => c.name)
      });
      const matched = dailyCategories.find(c => c.name.toLowerCase() === result.suggestedCategoryName.toLowerCase());
      if (matched) setNewExpense(prev => ({ ...prev, categoryId: matched.id }));
      toast({ title: "AI Suggestion", description: `Suggested: ${result.suggestedCategoryName}` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI failed' });
    } finally {
      setAiLoading(false);
    }
  };

  const isBudgetSet = (monthlyBudgetDoc?.totalBudgetAmount || 0) > 0;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* On mobile, show the "Sustainable Today" card first */}
        <div className="lg:hidden">
          <SustainableTodayCard 
            isOverspentToday={isOverspentToday}
            isWithinBudget={isWithinBudget}
            todayStr={todayStr}
            dailyAllocationToday={dailyAllocationToday}
            todayReport={todayReport}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isOverspentToday && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Daily Limit Exceeded</AlertTitle>
              <AlertDescription>
                You've spent more than your daily slice. Stay within your daily target to sustain your monthly goal.
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Monthly Budget Plan
              </CardTitle>
              <CardDescription>System auto-detected for {monthName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Monthly Budget Breakdown (₹)</Label>
                  <div className="flex flex-col gap-2">
                    {isBudgetSet ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                          <div className="p-2 border rounded bg-muted/30">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Initial Base</span>
                            <span className="font-bold text-sm">₹{(monthlyBudgetDoc?.baseBudgetAmount || monthlyBudgetDoc?.totalBudgetAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="p-2 border rounded bg-muted/30">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Extra Added</span>
                            <span className="font-bold text-sm text-primary">₹{(monthlyBudgetDoc?.extraBudgetAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-12 px-4 py-2 rounded-md border bg-primary/5 font-black text-xl flex items-center justify-between">
                            <span className="text-xs uppercase text-primary/70 font-bold">Total Pool</span>
                            <span>₹{monthlyBudgetDoc?.totalBudgetAmount?.toLocaleString()}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setIsAddingExtra(!isAddingExtra)}
                            className={cn("shrink-0 h-12 w-12 transition-all", isAddingExtra && "bg-primary text-white hover:bg-primary/90")}
                          >
                            {isAddingExtra ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Input 
                        id="total-budget" 
                        type="number" 
                        placeholder="e.g. 15000"
                        value={monthlyBudgetDoc?.totalBudgetAmount || ''} 
                        onChange={(e) => saveMonthlyBudget({ totalBudgetAmount: parseFloat(e.target.value) || 0 })}
                      />
                    )}

                    {isAddingExtra && (
                      <div className="p-3 border rounded-lg bg-primary/5 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-bold uppercase mb-2 block text-primary">Add Extra Funds</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            placeholder="Amount to add" 
                            value={extraAmount}
                            onChange={(e) => setExtraAmount(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" className="h-8 px-2" onClick={handleAddExtra}>
                            <Check className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekend-toggle" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Weekend Boost
                    </Label>
                    <Switch 
                      id="weekend-toggle"
                      checked={monthlyBudgetDoc?.isWeekendExtraBudgetEnabled || false}
                      onCheckedChange={(checked) => saveMonthlyBudget({ isWeekendExtraBudgetEnabled: checked })}
                    />
                  </div>
                  
                  {monthlyBudgetDoc?.isWeekendExtraBudgetEnabled && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 bg-white/50 rounded-lg border border-dashed border-primary/30">
                        <p className="text-xs text-muted-foreground mb-1">Calculated Bonus (50% of daily base)</p>
                        <p className="text-xl font-black text-primary">₹{calculatedWeekendBonus}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 italic">Applied automatically to Saturday & Sunday</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 grid grid-cols-2 gap-4 py-4 border-t text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Net Pool Remaining</span>
                <div className="flex flex-col">
                  <span className="text-lg font-black">₹{remainingNetPool.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">of ₹{netMonthlyPool.toLocaleString()} pool</span>
                </div>
              </div>
              <div className="flex flex-col border-l pl-4">
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Daily Base Budget</span>
                <span className="text-lg font-black">₹{dailyBase.toFixed(0)}</span>
              </div>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Fixed Monthly Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Name" value={newFixed.name} onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })} className="h-9" />
                <Select value={newFixed.categoryId} onValueChange={(v) => setNewFixed({ ...newFixed, categoryId: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {fixedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={newFixed.amount} onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })} className="h-9" />
                <Button onClick={addFixedExpense} className="h-9 w-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50 h-10">
                    <TableRow>
                      <TableHead className="text-xs h-10">Item</TableHead>
                      <TableHead className="text-xs h-10">Amount</TableHead>
                      <TableHead className="text-xs h-10">Incl.</TableHead>
                      <TableHead className="text-xs h-10 text-right">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedExpenses?.length ? fixedExpenses.map((expense) => (
                      <TableRow key={expense.id} className="h-12">
                        <TableCell className="font-medium text-sm">{expense.name}</TableCell>
                        <TableCell className="text-sm font-bold">₹{expense.amount.toLocaleString()}</TableCell>
                        <TableCell><Switch checked={expense.includeInBudget} onCheckedChange={() => toggleFixed(expense.id, expense.includeInBudget)} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteFixed(expense.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-xs italic text-muted-foreground">No fixed expenses.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("shadow-md border-l-4 transition-all duration-300", editingExpenseId ? "border-l-orange-400 bg-orange-50/30" : "border-l-primary")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {editingExpenseId ? <Pencil className="h-5 w-5 text-orange-500" /> : <BrainCircuit className="h-5 w-5 text-primary" />}
                {editingExpenseId ? "Edit Logged Item" : "Smart Logger"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Description (Optional)" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                <Button variant="outline" size="icon" onClick={handleAiSuggest} disabled={aiLoading || !!editingExpenseId}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={newExpense.categoryId} onValueChange={(val) => setNewExpense({ ...newExpense, categoryId: val })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{dailyCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Amount ₹" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogExpense} className={cn("flex-1", editingExpenseId && "bg-orange-500 hover:bg-orange-600")} disabled={loading}>
                  {loading ? "Saving..." : editingExpenseId ? "Update Expense" : "Log Daily Expense"}
                </Button>
                {editingExpenseId && (
                  <Button variant="outline" onClick={cancelEdit} className="gap-2">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Logged Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] w-full border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses?.length ? [...expenses].sort((a,b) => b.date.localeCompare(a.date)).map((exp) => (
                      <TableRow key={exp.id} className={cn("h-10 text-xs", editingExpenseId === exp.id && "bg-orange-50")}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(exp.date), 'dd MMM')}</TableCell>
                        <TableCell className="font-medium truncate max-w-[120px]">{exp.description || 'Expense'}</TableCell>
                        <TableCell className="font-bold">₹{exp.amount}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleStartEdit(exp)} className="h-7 w-7 text-muted-foreground hover:text-orange-500"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteExpense(exp.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No spending logged yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block space-y-6">
          <SustainableTodayCard 
            isOverspentToday={isOverspentToday}
            isWithinBudget={isWithinBudget}
            todayStr={todayStr}
            dailyAllocationToday={dailyAllocationToday}
            todayReport={todayReport}
          />

          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="fixed">Fixed</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2 mb-6">
                  <Input placeholder="New label..." value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCategory()} className="h-9" />
                  <Button size="icon" onClick={addCategory} className="h-9 w-9"><Plus className="h-4 w-4" /></Button>
                </div>

                <TabsContent value="daily" className="flex flex-wrap gap-2">
                  {dailyCategories.map(c => (
                    <div key={c.id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-tight">
                      {c.name}
                      <button onClick={() => deleteCategory(c.id)} className="ml-1 text-destructive hover:bg-destructive/10 rounded-full p-0.5"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="fixed" className="flex flex-wrap gap-2">
                  {fixedCategories.map(c => (
                    <div key={c.id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-[10px] font-bold uppercase tracking-tight">
                      {c.name}
                      <button onClick={() => deleteCategory(c.id)} className="ml-1 text-destructive hover:bg-destructive/10 rounded-full p-0.5"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SustainableTodayCard({ isOverspentToday, isWithinBudget, todayStr, dailyAllocationToday, todayReport }: any) {
  return (
    <Card className={cn(
      "shadow-xl transition-colors duration-500",
      isOverspentToday ? "bg-destructive text-destructive-foreground animate-pulse" : 
      isWithinBudget ? "bg-secondary text-secondary-foreground" : 
      "bg-primary text-primary-foreground"
    )}>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Coins className="h-6 w-6" />
          Sustainable Today
        </CardTitle>
        <CardDescription className="text-inherit opacity-80 font-medium">
          {todayStr} • Dynamic Daily Budget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-5xl font-black tracking-tighter drop-shadow-sm">
          ₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}
        </div>
        
        <div className="space-y-4 pt-4 border-t border-white/20">
          <div className="flex justify-between items-center text-sm font-bold opacity-90">
            <span>Spent Today:</span>
            <span className="text-lg">₹{(todayReport?.spent || 0).toFixed(0)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-white/10">
            <span>Remaining Daily Base Budget:</span>
            <span className="text-2xl">₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}</span>
          </div>

          {isOverspentToday && (
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-white uppercase animate-bounce bg-white/10 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4" /> Overspent by ₹{((todayReport?.spent || 0) - dailyAllocationToday).toFixed(0)}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 flex justify-center">
        <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm">
          System maintains your monthly budget cap.
        </div>
      </CardFooter>
    </Card>
  );
}
