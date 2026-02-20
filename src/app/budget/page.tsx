
"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, Tag, BrainCircuit, Loader2, Wallet, ReceiptText, CalendarDays, Coins, LayoutGrid, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format, getDaysInMonth, isWeekend } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [newCategory, setNewCategory] = useState({ name: '', type: 'daily' });
  const [newFixed, setNewFixed] = useState({ name: '', amount: '', categoryId: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', categoryId: '' });

  const now = new Date();
  const monthId = format(now, 'yyyyMM');
  const todayStr = format(now, 'yyyy-MM-dd');
  const daysInMonth = getDaysInMonth(now);
  const isTodayWeekend = isWeekend(now);

  // Count weekend and weekday occurrences in the current month
  let weekendDaysInMonth = 0;
  let weekdaysInMonth = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), i);
    if (isWeekend(d)) weekendDaysInMonth++;
    else weekdaysInMonth++;
  }

  // Firestore References
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

  // Data fetching
  const { data: categories } = useCollection(categoriesRef);
  const { data: fixedExpenses } = useCollection(fixedExpensesRef);
  const { data: monthlyBudgetDoc } = useDoc(monthlyBudgetRef);
  const { data: expenses } = useCollection(expensesRef);

  const dailyCategories = categories?.filter(c => c.type === 'daily') || [];
  const fixedCategories = categories?.filter(c => c.type === 'fixed') || [];

  // Handlers
  const saveMonthlyBudget = (updates: any) => {
    if (!monthlyBudgetRef || !user) return;
    setDocumentNonBlocking(monthlyBudgetRef, {
      ...updates,
      userId: user.uid,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      updatedAt: new Date().toISOString(),
      createdAt: monthlyBudgetDoc?.createdAt || new Date().toISOString(),
    }, { merge: true });
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
    toast({ title: "Category added", description: `"${newCategory.name}" added to ${newCategory.type} expenses.` });
  };

  const deleteCategory = (id: string) => {
    if (!categoriesRef) return;
    deleteDocumentNonBlocking(doc(categoriesRef, id));
  };

  const addFixedExpense = () => {
    if (!newFixed.name || !newFixed.amount || !newFixed.categoryId || !fixedExpensesRef) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Name, Amount, and Category are required.' });
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

  const handleAiSuggest = async () => {
    if (!newExpense.description || !dailyCategories.length) {
      toast({ variant: 'destructive', title: 'Need info', description: 'Enter description and ensure you have daily categories.' });
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: newExpense.description,
        existingCategories: dailyCategories.map(c => c.name)
      });

      toast({
        title: "AI Suggested Category",
        description: `${result.suggestedCategoryName}: ${result.reasoning}`,
      });

      const matched = dailyCategories.find(c => c.name.toLowerCase() === result.suggestedCategoryName.toLowerCase());
      if (matched) {
        setNewExpense(prev => ({ ...prev, categoryId: matched.id }));
      } else if (result.isNewCategorySuggested) {
        toast({ title: "New category suggested", description: `You might want to add "${result.suggestedCategoryName}" to your daily categories.` });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Categorization failed' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogExpense = () => {
    if (!newExpense.amount || !newExpense.categoryId || !user || !expensesRef) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all mandatory fields (Category and Amount).' });
      return;
    }
    
    setLoading(true);
    addDocumentNonBlocking(expensesRef, {
      userId: user.uid,
      monthlyBudgetId: monthId,
      description: newExpense.description || 'No description',
      amount: parseFloat(newExpense.amount),
      expenseCategoryId: newExpense.categoryId,
      date: todayStr,
      createdAt: new Date().toISOString()
    });

    setNewExpense({ description: '', amount: '', categoryId: '' });
    setLoading(false);
    toast({ title: "Expense logged", description: "Successfully saved your spending." });
  };

  const deleteExpense = (id: string) => {
    if (!expensesRef) return;
    deleteDocumentNonBlocking(doc(expensesRef, id));
    toast({ title: "Expense removed" });
  };

  // Automated Budget Calculations
  const totalBudgetAmount = monthlyBudgetDoc?.totalBudgetAmount || 0;
  const totalFixedIncluded = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthly = Math.max(0, totalBudgetAmount - totalFixedIncluded);
  
  // Logic for Auto-Calculation (50% extra on weekends)
  const isWeekendEnabled = monthlyBudgetDoc?.isWeekendExtraBudgetEnabled || false;
  const multiplier = 1.5; 
  
  const weekdayRate = netMonthly > 0 
    ? (isWeekendEnabled 
        ? netMonthly / (weekdaysInMonth + (multiplier * weekendDaysInMonth))
        : netMonthly / daysInMonth)
    : 0;
  
  const weekendRate = isWeekendEnabled ? weekdayRate * multiplier : weekdayRate;
  const autoWeekendBonus = isWeekendEnabled ? (weekendRate - weekdayRate) : 0;
  
  // Rolling budget logic: compare total allowed up to today vs total spent up to today
  const calculateRollingAllowance = () => {
    if (!expenses) return weekendRate; // Fallback

    let totalAllowedUntilToday = 0;
    let totalSpentUntilToday = 0;

    for (let i = 1; i <= now.getDate(); i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayIsWeekend = isWeekend(d);
      
      const allowedForDay = dayIsWeekend && isWeekendEnabled ? weekendRate : weekdayRate;
      
      if (i < now.getDate()) {
        totalAllowedUntilToday += allowedForDay;
        // Filter expenses for that specific day
        const spentOnDay = expenses
          .filter(e => e.date === dStr)
          .reduce((sum, e) => sum + e.amount, 0);
        totalSpentUntilToday += spentOnDay;
      } else {
        // Today's base allowance + the carry over from previous days
        const carryOver = totalAllowedUntilToday - totalSpentUntilToday;
        return allowedForDay + carryOver;
      }
    }
    return weekdayRate;
  };

  const todayAllowed = calculateRollingAllowance();
  const spentToday = expenses?.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0) || 0;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Setup */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Monthly Budget Plan
              </CardTitle>
              <CardDescription>Set your total spending limit for {format(now, 'MMMM yyyy')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Total Monthly Budget (₹)</Label>
                  <Input 
                    id="total-budget" 
                    type="number" 
                    placeholder="e.g. 50000"
                    value={monthlyBudgetDoc?.totalBudgetAmount || ''} 
                    onChange={(e) => saveMonthlyBudget({ totalBudgetAmount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Your gross budget before any deductions.</p>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekend-toggle" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Weekend Boost
                    </Label>
                    <Switch 
                      id="weekend-toggle"
                      checked={isWeekendEnabled}
                      onCheckedChange={(checked) => saveMonthlyBudget({ isWeekendExtraBudgetEnabled: checked })}
                    />
                  </div>
                  {isWeekendEnabled && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                      <div className="text-sm font-medium text-primary flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        ₹{autoWeekendBonus.toFixed(2)} extra / day
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Calculated automatically (50% bonus on weekends).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 flex flex-col items-start gap-1 border-t py-3">
              <div className="flex justify-between w-full text-sm">
                <span>Net Spending Pool:</span>
                <span className="font-bold">₹{netMonthly.toFixed(2)}</span>
              </div>
            </CardFooter>
          </Card>

          {/* Fixed Expenses */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Fixed Monthly Expenses
              </CardTitle>
              <CardDescription>Recurring bills like Rent, EMIs, or Subscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input 
                    placeholder="e.g. Rent" 
                    value={newFixed.name}
                    onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select 
                    value={newFixed.categoryId} 
                    onValueChange={(v) => setNewFixed({ ...newFixed, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fixedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={newFixed.amount}
                    onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addFixedExpense} disabled={loading} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Expense</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Include</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedExpenses && fixedExpenses.length > 0 ? (
                      fixedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {fixedCategories.find(c => c.id === expense.expenseCategoryId)?.name || 'Uncategorized'}
                          </TableCell>
                          <TableCell>₹{expense.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={expense.includeInBudget} 
                              onCheckedChange={() => toggleFixed(expense.id, expense.includeInBudget)} 
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteFixed(expense.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground italic text-xs">
                          No fixed expenses recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between border-t py-4">
              <span className="text-sm font-medium">Total Deductions:</span>
              <span className="font-bold text-destructive">₹{totalFixedIncluded.toFixed(2)}</span>
            </CardFooter>
          </Card>

          {/* Daily Logger */}
          <Card className="shadow-md border-t-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Smart Expense Logger
              </CardTitle>
              <CardDescription>Log today's daily spending. Use AI to auto-categorize.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="expense-desc">Description</Label>
                <div className="flex gap-2">
                  <Input 
                    id="expense-desc" 
                    placeholder="e.g. Lunch with team" 
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleAiSuggest} 
                    disabled={aiLoading}
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>
                    Category <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Select 
                    value={newExpense.categoryId} 
                    onValueChange={(val) => setNewExpense({ ...newExpense, categoryId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {dailyCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-amount">
                    Amount (₹) <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input 
                    id="expense-amount" 
                    type="number" 
                    placeholder="0" 
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLogExpense} className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Log Expense"}
              </Button>
            </CardFooter>
          </Card>

          {/* Logged Expenses View */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Expenses
              </CardTitle>
              <CardDescription>Your logged spending for this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses && expenses.length > 0 ? (
                      [...expenses]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(exp.date), 'dd MMM')}
                          </TableCell>
                          <TableCell className="font-medium text-sm truncate max-w-[150px]">
                            {exp.description}
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase font-bold tracking-tighter">
                              {dailyCategories.find(c => c.id === exp.expenseCategoryId)?.name || 'Misc'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            ₹{exp.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteExpense(exp.id)} className="h-8 w-8">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic text-sm">
                          No expenses logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            <CardFooter className="bg-muted/10 flex justify-between py-3 border-t">
              <span className="text-xs font-medium">Total Spent (Month):</span>
              <span className="text-sm font-bold">₹{expenses?.reduce((s, e) => s + e.amount, 0).toFixed(2) || '0.00'}</span>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Daily Status Card */}
          <Card className={`shadow-md text-primary-foreground ${isTodayWeekend ? 'bg-secondary' : 'bg-primary'}`}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Allowed Today
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {isTodayWeekend ? 'Weekend Bonus Active! 🚀' : 'Weekday Allocation'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">₹{todayAllowed.toFixed(2)}</div>
              <div className="mt-4 p-3 rounded-lg bg-white/10 text-xs space-y-2">
                <div className="flex justify-between">
                  <span>Standard Rate:</span>
                  <span>₹{weekdayRate.toFixed(2)}</span>
                </div>
                {isWeekendEnabled && isTodayWeekend && (
                  <div className="flex justify-between border-t border-white/20 pt-1">
                    <span>Weekend Bonus:</span>
                    <span>+₹{autoWeekendBonus.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/20 pt-1 font-bold">
                  <span>Spent Today:</span>
                  <span className={spentToday > todayAllowed ? 'text-destructive font-black' : ''}>
                    ₹{spentToday.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-1 opacity-80">
                  <span>Remaining:</span>
                  <span>₹{Math.max(0, todayAllowed - spentToday).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Management */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Manage Categories
              </CardTitle>
              <CardDescription>Define separate labels for daily and fixed spending.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" className="w-full" onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="fixed">Fixed</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2 mb-6">
                  <Input 
                    placeholder={`New ${newCategory.type} label...`} 
                    value={newCategory.name} 
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <Button size="icon" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
                </div>

                <TabsContent value="daily" className="mt-0">
                  <div className="flex flex-wrap gap-2">
                    {dailyCategories.map(c => (
                      <div key={c.id} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        <Tag className="h-3 w-3" />
                        {c.name}
                        <button onClick={() => deleteCategory(c.id)} className="ml-1 text-destructive hover:bg-destructive/10 rounded-full p-0.5">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {!dailyCategories.length && <p className="text-xs text-muted-foreground italic">No daily categories.</p>}
                  </div>
                </TabsContent>

                <TabsContent value="fixed" className="mt-0">
                  <div className="flex flex-wrap gap-2">
                    {fixedCategories.map(c => (
                      <div key={c.id} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-xs">
                        <Tag className="h-3 w-3" />
                        {c.name}
                        <button onClick={() => deleteCategory(c.id)} className="ml-1 text-destructive hover:bg-destructive/10 rounded-full p-0.5">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {!fixedCategories.length && <p className="text-xs text-muted-foreground italic">No fixed categories.</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
