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
import { Plus, Trash2, Tag, BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format } from 'date-fns';
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
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState('2000');

  const monthId = format(new Date(), 'yyyyMM');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Firestore References
  const categoriesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenseCategories');
  }, [db, user]);

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

  // Handlers
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

      // Find matching category ID
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
      let missingFields = [];
      if (!newExpense.description) missingFields.push('description');
      if (!newExpense.categoryId) missingFields.push('category');
      if (!newExpense.amount) missingFields.push('amount');
      
      toast({ 
        variant: 'destructive', 
        title: 'Incomplete data', 
        description: `Please provide: ${missingFields.join(', ')}.` 
      });
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
              <CardDescription>Track your daily spending with category control.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="expense-desc">
                  What did you buy? <span className="text-destructive">*</span>
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
                    Category <span className="text-destructive">*</span>
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
                    Amount <span className="text-destructive">*</span>
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 p-0 ml-1 rounded-full" 
                      onClick={() => deleteCategory(c.id)}
                    >
                      <Trash2 className="h-2 w-2 text-destructive" />
                    </Button>
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
