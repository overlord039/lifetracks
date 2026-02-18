
"use client";

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, Tag, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format } from 'date-fns';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>(['Food', 'Transport', 'Entertainment', 'Shopping']);
  
  const [newFixed, setNewFixed] = useState({ name: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState('2000');

  const monthId = format(new Date(), 'yyyyMM');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [db, user, monthId]);

  const { data: fixedExpenses } = useCollection(fixedExpensesRef);

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

  const handleLogExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !user || !db) return;
    setLoading(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: newExpense.description,
        existingCategories: categories
      });

      toast({
        title: "AI Suggested Category",
        description: `${result.suggestedCategoryName}: ${result.reasoning}`,
      });

      if (result.isNewCategorySuggested && !categories.includes(result.suggestedCategoryName)) {
        setCategories([...categories, result.suggestedCategoryName]);
      }

      const expensesRef = collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
      addDocumentNonBlocking(expensesRef, {
        userId: user.uid,
        monthlyBudgetId: monthId,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: result.suggestedCategoryName,
        date: todayStr,
        createdAt: new Date().toISOString()
      });

      setNewExpense({ description: '', amount: '' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to log expense' });
    } finally {
      setLoading(false);
    }
  };

  const totalFixedIncluded = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Monthly Budget Setup</CardTitle>
              <CardDescription>Configure your income and fixed deductions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="total-budget">Total Monthly Budget</Label>
                <Input 
                  id="total-budget" 
                  type="number" 
                  value={monthlyBudgetLimit} 
                  onChange={(e) => setMonthlyBudgetLimit(e.target.value)}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Fixed Monthly Expenses</h4>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <Input 
                    className="col-span-2" 
                    placeholder="Rent, Internet, etc." 
                    value={newFixed.name}
                    onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })}
                  />
                  <Input 
                    className="col-span-2" 
                    type="number" 
                    placeholder="Amount" 
                    value={newFixed.amount}
                    onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })}
                  />
                  <Button onClick={addFixedExpense} disabled={loading} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Include</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses?.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>${expense.amount.toFixed(2)}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between">
              <span className="text-sm text-muted-foreground">Fixed Deductions:</span>
              <span className="font-bold text-destructive">${totalFixedIncluded.toFixed(2)}</span>
            </CardFooter>
          </Card>

          <Card className="shadow-md border-t-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Smart Expense Logger
              </CardTitle>
              <CardDescription>Let AI categorize your spending based on description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="expense-desc">What did you buy?</Label>
                <Input 
                  id="expense-desc" 
                  placeholder="e.g., Dinner at Italian place with friends" 
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input 
                  id="expense-amount" 
                  type="number" 
                  placeholder="0.00" 
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLogExpense} className="w-full" disabled={loading}>
                {loading ? "Categorizing..." : "Log Expense"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-md bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-xl">Rolling Balance</CardTitle>
              <CardDescription className="text-primary-foreground/80">Available for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-headline">$54.20</div>
              <div className="mt-4 p-3 rounded-lg bg-white/10 text-xs">
                Base Daily: $40.00 + Carry: $14.20
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Your Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <div key={c} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                    <Tag className="h-3 w-3" />
                    {c}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
