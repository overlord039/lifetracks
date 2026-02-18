"use client";

import React, { useState, useEffect, use } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Tag, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';

export default function BudgetPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Unwrap searchParams to satisfy Next.js 15 requirements
  use(props.searchParams);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Food', 'Transport', 'Entertainment', 'Shopping']);
  
  const [newFixed, setNewFixed] = useState({ name: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [monthlyBudget, setMonthlyBudget] = useState('2000');

  useEffect(() => {
    if (!user) return;
    const fetchFixed = async () => {
      const q = query(collection(db, 'fixed_expenses'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchFixed();
  }, [user, db]);

  const addFixedExpense = async () => {
    if (!newFixed.name || !newFixed.amount) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'fixed_expenses'), {
        userId: user?.uid,
        name: newFixed.name,
        amount: parseFloat(newFixed.amount),
        included: true
      });
      setFixedExpenses([...fixedExpenses, { id: docRef.id, name: newFixed.name, amount: parseFloat(newFixed.amount), included: true }]);
      setNewFixed({ name: '', amount: '' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFixed = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'fixed_expenses', id), { included: !current });
    setFixedExpenses(fixedExpenses.map(f => f.id === id ? { ...f, included: !current } : f));
  };

  const deleteFixed = async (id: string) => {
    await deleteDoc(doc(db, 'fixed_expenses', id));
    setFixedExpenses(fixedExpenses.filter(f => f.id !== id));
  };

  const handleLogExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    setLoading(true);
    try {
      // AI Categorization
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

      await addDoc(collection(db, 'expenses'), {
        userId: user?.uid,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: result.suggestedCategoryName,
        date: new Date().toISOString()
      });

      setNewExpense({ description: '', amount: '' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to log expense' });
    } finally {
      setLoading(false);
    }
  };

  const totalFixedIncluded = fixedExpenses.filter(f => f.included).reduce((s, f) => s + f.amount, 0);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Budget Setup */}
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
                  value={monthlyBudget} 
                  onChange={(e) => setMonthlyBudget(e.target.value)}
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
                      {fixedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>${expense.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={expense.included} 
                              onCheckedChange={() => toggleFixed(expense.id, expense.included)} 
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

          {/* Log New Expense */}
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

        {/* Rolling Budget Summary */}
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
              <CardTitle className="text-sm">Budget Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekend Extra</Label>
                  <p className="text-xs text-muted-foreground">Add bonus for Sat/Sun</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Holidays</Label>
                  <p className="text-xs text-muted-foreground">Add bonus for holidays</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label>Extra Amount (per day)</Label>
                <Input type="number" defaultValue="20" className="h-8" />
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
