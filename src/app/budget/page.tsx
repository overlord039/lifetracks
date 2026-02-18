"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, Tag, BrainCircuit, Loader2, Wallet, ReceiptText, CalendarDays, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format, getDaysInMonth, isWeekend } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFixed, setNewFixed] = useState({ name: '', amount: '' });
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
    if (!newCategoryName.trim() || !categoriesRef) return;
    addDocumentNonBlocking(categoriesRef, {
      userId: user?.uid,
      name: newCategoryName.trim(),
      createdAt: new Date().toISOString()
    });
    setNewCategoryName('');
  };

  const deleteCategory = (id: string) => {
    if (!categoriesRef) return;
    deleteDocumentNonBlocking(doc(categoriesRef, id));
  };

  const addFixedExpense = () => {
    if (!newFixed.name || !newFixed.amount || !fixedExpensesRef) return;
    setLoading(true);
    addDocumentNonBlocking(fixedExpensesRef, {
      userId: user?.uid,
      monthlyBudgetId: monthId,
      name: newFixed.name,
      amount: parseFloat(newFixed.amount),
      includeInBudget: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      setNewFixed({ name: '', amount: '' });
      setLoading(false);
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
    if (!newExpense.description || !categories) {
      toast({ variant: 'destructive', title: 'Need description', description: 'Enter what you bought first.' });
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: newExpense.description,
        existingCategories: categories.map(c => c.name)
      });

      toast({
        title: "AI Suggested Category",
        description: `${result.suggestedCategoryName}: ${result.reasoning}`,
      });

      const matched = categories.find(c => c.name.toLowerCase() === result.suggestedCategoryName.toLowerCase());
      if (matched) {
        setNewExpense(prev => ({ ...prev, categoryId: matched.id }));
      } else if (result.isNewCategorySuggested) {
        toast({ title: "New category suggested", description: `You might want to add "${result.suggestedCategoryName}" to your list.` });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Categorization failed' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogExpense = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.categoryId || !user || !expensesRef) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all mandatory fields.' });
      return;
    }
    
    setLoading(true);
    addDocumentNonBlocking(expensesRef, {
      userId: user.uid,
      monthlyBudgetId: monthId,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      expenseCategoryId: newExpense.categoryId,
      date: todayStr,
      createdAt: new Date().toISOString()
    });

    setNewExpense({ description: '', amount: '', categoryId: '' });
    setLoading(false);
    toast({ title: "Expense logged", description: "Successfully saved your spending." });
  };

  // Automated Budget Calculations
  const totalBudgetAmount = monthlyBudgetDoc?.totalBudgetAmount || 0;
  const totalFixedIncluded = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthly = Math.max(0, totalBudgetAmount - totalFixedIncluded);
  
  // Logic for Auto-Calculation (50% extra on weekends)
  const isWeekendEnabled = monthlyBudgetDoc?.isWeekendExtraBudgetEnabled || false;
  const multiplier = 1.5; // weekends get 50% more than weekdays
  
  // netMonthly = (weekdaysInMonth * Rate) + (weekendDaysInMonth * multiplier * Rate)
  const weekdayRate = netMonthly > 0 
    ? (isWeekendEnabled 
        ? netMonthly / (weekdaysInMonth + (multiplier * weekendDaysInMonth))
        : netMonthly / daysInMonth)
    : 0;
  
  const weekendRate = isWeekendEnabled ? weekdayRate * multiplier : weekdayRate;
  const autoWeekendBonus = isWeekendEnabled ? (weekendRate - weekdayRate) : 0;
  const todayAllowed = isTodayWeekend ? weekendRate : weekdayRate;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Monthly Budget Plan
              </CardTitle>
              <CardDescription>Set your total spending limit and weekend incentives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Total Monthly Budget</Label>
                  <Input 
                    id="total-budget" 
                    type="number" 
                    placeholder="2000"
                    value={monthlyBudgetDoc?.totalBudgetAmount || ''} 
                    onChange={(e) => saveMonthlyBudget({ totalBudgetAmount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Your gross budget for {format(now, 'MMMM')}.</p>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekend-toggle" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Weekend Extra Budget
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
                        ₹{autoWeekendBonus.toFixed(2)} / day
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Automatically calculated for {weekendDaysInMonth} weekend days (50% bonus).
                      </p>
                    </div>
                  )}
                  {!isWeekendEnabled && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Enable to automatically shift 50% extra budget to your weekends.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 flex flex-col items-start gap-1 border-t py-3">
              <div className="flex justify-between w-full text-sm">
                <span>Net Monthly Pool (After Fixed):</span>
                <span className="font-bold">₹{netMonthly.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full text-sm">
                <span>Standard Daily Allocation:</span>
                <span className="font-bold text-primary">₹{weekdayRate.toFixed(2)} / day</span>
              </div>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Fixed Monthly Expenses
              </CardTitle>
              <CardDescription>Recurring costs deducted from your monthly pool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Expense Name</Label>
                    <Input 
                      placeholder="Rent, Internet, etc." 
                      value={newFixed.name}
                      onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newFixed.amount}
                      onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addFixedExpense} disabled={loading} size="icon" className="w-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Included</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses && fixedExpenses.length > 0 ? (
                        fixedExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.name}</TableCell>
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
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground italic text-xs">
                            No fixed expenses added yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between border-t py-4">
              <span className="text-sm font-medium">Total Fixed Deductions:</span>
              <span className="font-bold text-destructive">₹{totalFixedIncluded.toFixed(2)}</span>
            </CardFooter>
          </Card>

          <Card className="shadow-md border-t-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Smart Expense Logger
              </CardTitle>
              <CardDescription>Track your daily spending with category control.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="expense-desc">
                  What did you buy? <span className="text-destructive font-bold">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="expense-desc" 
                    placeholder="e.g., Dinner at Italian place" 
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    required
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleAiSuggest} 
                    disabled={aiLoading}
                    title="AI Suggest Category"
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
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-amount">
                    Amount <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input 
                    id="expense-amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLogExpense} className="w-full" disabled={loading}>
                {loading ? "Logging..." : "Log Expense"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={`shadow-md text-primary-foreground ${isTodayWeekend ? 'bg-secondary' : 'bg-primary'}`}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Allowed Today
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {isTodayWeekend ? 'Weekend Bonus Active! 🚀' : 'Standard Weekday Allocation'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-headline">₹{todayAllowed.toFixed(2)}</div>
              <div className="mt-4 p-3 rounded-lg bg-white/10 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span>₹{weekdayRate.toFixed(2)}</span>
                </div>
                {isWeekendEnabled && (
                  <div className="flex justify-between border-t border-white/20 pt-1">
                    <span>Weekend Bonus:</span>
                    <span>{isTodayWeekend ? `+₹${autoWeekendBonus.toFixed(2)}` : 'N/A'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Manage Categories</CardTitle>
              <CardDescription>Your custom spending labels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="New Category" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <Button size="icon" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories?.map(c => (
                  <div key={c.id} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-muted rounded-full text-xs">
                    <Tag className="h-3 w-3" />
                    {c.name}
                    <button 
                      className="h-4 w-4 p-0 ml-1 rounded-full flex items-center justify-center hover:bg-destructive/10 text-destructive/50 hover:text-destructive" 
                      onClick={() => deleteCategory(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(!categories || categories.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">No categories added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
