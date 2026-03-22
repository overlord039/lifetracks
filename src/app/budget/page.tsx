
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
import { Plus, Trash2, BrainCircuit, Loader2, Wallet, ReceiptText, CalendarDays, Coins, LayoutGrid, History, AlertTriangle, Pencil, X, Check, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [privacyKey, setPrivacyKey] = useState<string | null>(null);

  // Decrypted Data State
  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPrivacyKey(localStorage.getItem('lifetrack_privacy_key'));
  }, []);

  const now = useMemo(() => new Date(), []);
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

  const { data: rawCategories } = useCollection(categoriesRef);
  const { data: rawFixed } = useCollection(fixedExpensesRef);
  const { data: rawBudget } = useDoc(monthlyBudgetRef);
  const { data: rawExpenses } = useCollection(expensesRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!privacyKey) return;
      setIsDecrypting(true);

      // Decrypt Categories
      if (rawCategories) {
        const cats = await Promise.all(rawCategories.map(async c => ({
          ...c,
          name: await decryptData(c.name, privacyKey)
        })));
        setDecryptedCategories(cats);
      }

      // Decrypt Budget
      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: await decryptNumber(rawBudget.totalBudgetAmount, privacyKey),
          baseBudgetAmount: await decryptNumber(rawBudget.baseBudgetAmount, privacyKey),
          extraBudgetAmount: await decryptNumber(rawBudget.extraBudgetAmount, privacyKey),
        });
      }

      // Decrypt Fixed
      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          name: await decryptData(f.name, privacyKey),
          amount: await decryptNumber(f.amount, privacyKey),
        })));
        setDecryptedFixed(fixed);
      }

      // Decrypt Expenses
      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          description: await decryptData(e.description, privacyKey),
          amount: await decryptNumber(e.amount, privacyKey),
        })));
        setDecryptedExpenses(exps);
      }
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawCategories, rawBudget, rawFixed, rawExpenses, privacyKey]);

  // Rest of logic using decrypted data...
  const dailyCategories = decryptedCategories?.filter(c => c.type === 'daily') || [];
  const fixedCategories = decryptedCategories?.filter(c => c.type === 'fixed') || [];
  const totalIncludedFixed = decryptedFixed?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthlyPool = (decryptedBudget?.totalBudgetAmount || 0) - totalIncludedFixed;
  const totalSpentThisMonth = decryptedExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remainingNetPool = netMonthlyPool - totalSpentThisMonth;
  const dailyBase = netMonthlyPool / daysInMonth;
  const calculatedWeekendBonus = Math.round(dailyBase * 0.5);

  const budgetReport = useMemo(() => {
    if (!decryptedBudget || !decryptedExpenses) return null;
    const dailyExpensesMap: Record<string, number> = {};
    decryptedExpenses.forEach(exp => {
      dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
    });
    const config: MonthlyConfig = {
      totalBudget: decryptedBudget.totalBudgetAmount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
      fixedExpenses: (decryptedFixed || []).map(f => ({ id: f.id, name: f.name, amount: f.amount, included: f.includeInBudget })),
      saturdayExtra: decryptedBudget.isWeekendExtraBudgetEnabled ? calculatedWeekendBonus : 0,
      sundayExtra: decryptedBudget.isWeekendExtraBudgetEnabled ? calculatedWeekendBonus : 0,
      holidayExtra: 0,
      isWeekendEnabled: decryptedBudget.isWeekendExtraBudgetEnabled || false,
      isHolidayEnabled: false
    };
    return calculateRollingBudget(config, dailyExpensesMap, []);
  }, [decryptedBudget, decryptedExpenses, decryptedFixed, now, calculatedWeekendBonus]);

  const todayReport = budgetReport?.[todayStr];
  const dailyAllocationToday = dailyBase + (todayReport?.extraBudget || 0);
  const isOverspentToday = (todayReport?.spent || 0) > dailyAllocationToday;
  const isWithinBudget = (todayReport?.spent || 0) > 0 && !isOverspentToday;

  const [extraAmount, setExtraAmount] = useState('');
  const [tempInitialBudget, setTempInitialBudget] = useState('');
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'daily' });
  const [newFixed, setNewFixed] = useState({ name: '', amount: '', categoryId: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', categoryId: '' });

  const saveMonthlyBudget = async (updates: any) => {
    if (!monthlyBudgetRef || !user || !privacyKey) return;
    
    const encryptedUpdates = { ...updates };
    if (updates.totalBudgetAmount !== undefined) encryptedUpdates.totalBudgetAmount = await encryptData(updates.totalBudgetAmount, privacyKey);
    if (updates.baseBudgetAmount !== undefined) encryptedUpdates.baseBudgetAmount = await encryptData(updates.baseBudgetAmount, privacyKey);
    if (updates.extraBudgetAmount !== undefined) encryptedUpdates.extraBudgetAmount = await encryptData(updates.extraBudgetAmount, privacyKey);

    setDocumentNonBlocking(monthlyBudgetRef, {
      ...encryptedUpdates,
      userId: user.uid,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      updatedAt: new Date().toISOString(),
      createdAt: rawBudget?.createdAt || new Date().toISOString(),
      isEncrypted: true,
    }, { merge: true });
  };

  const handleSetInitialBudget = () => {
    const val = parseFloat(tempInitialBudget) || 0;
    if (val <= 0) return;
    saveMonthlyBudget({ totalBudgetAmount: val, baseBudgetAmount: val, extraBudgetAmount: 0 });
    setTempInitialBudget('');
    toast({ title: "Budget Vault Locked" });
  };

  const handleAddExtra = () => {
    const added = parseFloat(extraAmount) || 0;
    if (added <= 0) return;
    const currentTotal = decryptedBudget?.totalBudgetAmount || 0;
    const currentExtra = decryptedBudget?.extraBudgetAmount || 0;
    saveMonthlyBudget({ totalBudgetAmount: currentTotal + added, extraBudgetAmount: currentExtra + added });
    setExtraAmount('');
    setIsAddingExtra(false);
  };

  const addCategory = async () => {
    if (!newCategory.name.trim() || !categoriesRef || !privacyKey) return;
    addDocumentNonBlocking(categoriesRef, {
      userId: user?.uid,
      name: await encryptData(newCategory.name.trim(), privacyKey),
      type: newCategory.type,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    setNewCategory({ ...newCategory, name: '' });
  };

  const addFixedExpense = async () => {
    if (!newFixed.name || !newFixed.amount || !newFixed.categoryId || !fixedExpensesRef || !privacyKey) return;
    setLoading(true);
    addDocumentNonBlocking(fixedExpensesRef, {
      userId: user?.uid,
      monthlyBudgetId: monthId,
      name: await encryptData(newFixed.name, privacyKey),
      amount: await encryptData(newFixed.amount, privacyKey),
      expenseCategoryId: newFixed.categoryId,
      includeInBudget: true,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      setNewFixed({ name: '', amount: '', categoryId: '' });
      setLoading(false);
    });
  };

  const handleLogExpense = async () => {
    if (!newExpense.amount || !newExpense.categoryId || !user || !expensesRef || !privacyKey) return;
    setLoading(true);
    const expenseData = {
      userId: user.uid,
      monthlyBudgetId: monthId,
      description: await encryptData(newExpense.description || '', privacyKey),
      amount: await encryptData(newExpense.amount, privacyKey),
      expenseCategoryId: newExpense.categoryId,
      date: editingExpenseId ? (decryptedExpenses?.find(e => e.id === editingExpenseId)?.date || todayStr) : todayStr,
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };
    if (editingExpenseId) {
      updateDocumentNonBlocking(doc(expensesRef, editingExpenseId), expenseData);
      setEditingExpenseId(null);
    } else {
      addDocumentNonBlocking(expensesRef, { ...expenseData, createdAt: new Date().toISOString() });
    }
    setNewExpense({ description: '', amount: '', categoryId: '' });
    setLoading(false);
  };

  if (!mounted || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Opening Privacy Vault...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!privacyKey && (
        <Alert variant="destructive" className="mb-6 border-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Master Key Required</AlertTitle>
          <AlertDescription>
            You must set your Master Privacy Key in the sidebar to view or manage your budget.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:hidden">
          <SustainableTodayCard isOverspentToday={isOverspentToday} isWithinBudget={isWithinBudget} todayStr={todayStr} dailyAllocationToday={dailyAllocationToday} todayReport={todayReport} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Monthly Budget Vault</CardTitle>
              <CardDescription>Protected financial targets for {monthName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total Monthly Pool (Encrypted)</Label>
                  <div className="flex flex-col gap-2">
                    {decryptedBudget?.totalBudgetAmount > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                          <div className="p-2 border rounded bg-muted/30">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Base Target</span>
                            <span className="font-bold text-sm">₹{decryptedBudget.baseBudgetAmount.toLocaleString()}</span>
                          </div>
                          <div className="p-2 border rounded bg-muted/30">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Encrypted Extra</span>
                            <span className="font-bold text-sm text-primary">₹{decryptedBudget.extraBudgetAmount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-12 px-4 py-2 rounded-md border bg-primary/5 font-black text-xl flex items-center justify-between">
                            <span className="text-xs uppercase text-primary/70 font-bold">Total Pool</span>
                            <span>₹{decryptedBudget.totalBudgetAmount.toLocaleString()}</span>
                          </div>
                          <Button variant="outline" size="icon" onClick={() => setIsAddingExtra(!isAddingExtra)} className={cn("h-12 w-12", isAddingExtra && "bg-primary text-white")}>
                            {isAddingExtra ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Set Monthly Target..." value={tempInitialBudget} onChange={(e) => setTempInitialBudget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetInitialBudget()} />
                        <Button onClick={handleSetInitialBudget}>Lock</Button>
                      </div>
                    )}
                    {isAddingExtra && (
                      <div className="p-3 border rounded-lg bg-primary/5 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] font-bold uppercase mb-2 block text-primary">Add Private Extra</Label>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Extra amount..." value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()} autoFocus />
                          <Button size="sm" onClick={handleAddExtra}><Check className="h-3 w-3 mr-1" /> Add</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Weekend Boost</Label>
                    <Switch checked={decryptedBudget?.isWeekendExtraBudgetEnabled || false} onCheckedChange={(checked) => saveMonthlyBudget({ isWeekendExtraBudgetEnabled: checked })} />
                  </div>
                  {decryptedBudget?.isWeekendExtraBudgetEnabled && (
                    <div className="pt-2">
                      <div className="p-3 bg-white/50 dark:bg-muted/30 rounded-lg border border-dashed border-primary/30 text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Encrypted Daily Bonus</p>
                        <p className="text-xl font-black text-primary">₹{calculatedWeekendBonus}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 grid grid-cols-2 gap-4 py-4 border-t text-sm">
              <div className="flex flex-col"><span className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Private Net Pool</span><span className="text-lg font-black">₹{remainingNetPool.toLocaleString()}</span></div>
              <div className="flex flex-col border-l pl-4"><span className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Daily Target</span><span className="text-lg font-black">₹{dailyBase.toFixed(0)}</span></div>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" /> Protected Fixed Expenses</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Item Name" value={newFixed.name} onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })} />
                <Select value={newFixed.categoryId} onValueChange={(v) => setNewFixed({ ...newFixed, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{fixedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={newFixed.amount} onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })} />
                <Button onClick={addFixedExpense}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-xs">Item</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="text-xs">Incl.</TableHead><TableHead className="text-xs text-right">Delete</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {decryptedFixed?.length ? decryptedFixed.map((expense) => (
                      <TableRow key={expense.id} className="h-12">
                        <TableCell className="font-medium text-sm">{expense.name}</TableCell>
                        <TableCell className="text-sm font-bold">₹{expense.amount.toLocaleString()}</TableCell>
                        <TableCell><Switch checked={expense.includeInBudget} onCheckedChange={() => updateDocumentNonBlocking(doc(fixedExpensesRef!, expense.id), { includeInBudget: !expense.includeInBudget })} /></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(fixedExpensesRef!, expense.id))} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-4 text-xs italic text-muted-foreground">No secure fixed expenses.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("shadow-md border-l-4 transition-all", editingExpenseId ? "border-l-orange-400 bg-orange-50/30" : "border-l-primary")}>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2">{editingExpenseId ? <Pencil className="h-5 w-5 text-orange-500" /> : <BrainCircuit className="h-5 w-5 text-primary" />} Secure Logger</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Private Description..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={newExpense.categoryId} onValueChange={(val) => setNewExpense({ ...newExpense, categoryId: val })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{dailyCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Amount ₹" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogExpense} className={cn("flex-1", editingExpenseId && "bg-orange-500")} disabled={loading}>
                  {loading ? "Encrypting..." : editingExpenseId ? "Update Item" : "Securely Log Item"}
                </Button>
                {editingExpenseId && <Button variant="outline" onClick={() => { setEditingExpenseId(null); setNewExpense({ description: '', amount: '', categoryId: '' }); }}><X className="h-4 w-4" /></Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Secure Activity History</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] w-full border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10"><TableRow><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Item</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="w-20 text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {decryptedExpenses?.length ? [...decryptedExpenses].sort((a,b) => b.date.localeCompare(a.date)).map((exp) => (
                      <TableRow key={exp.id} className={cn("h-10 text-xs", editingExpenseId === exp.id && "bg-orange-50")}>
                        <TableCell className="text-muted-foreground">{format(new Date(exp.date), 'dd MMM')}</TableCell>
                        <TableCell className="font-medium truncate max-w-[120px]">{exp.description || '[Encrypted]'}</TableCell>
                        <TableCell className="font-bold">₹{exp.amount}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingExpenseId(exp.id); setNewExpense({ description: exp.description || '', amount: exp.amount.toString(), categoryId: exp.expenseCategoryId }); }} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(expensesRef!, exp.id))} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No history logged yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block space-y-6">
          <SustainableTodayCard isOverspentToday={isOverspentToday} isWithinBudget={isWithinBudget} todayStr={todayStr} dailyAllocationToday={dailyAllocationToday} todayReport={todayReport} />
          <Card className="shadow-md">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Label Vault</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="fixed">Fixed</TabsTrigger></TabsList>
                <div className="flex gap-2 mb-6"><Input placeholder="New private label..." value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCategory()} /><Button size="icon" onClick={addCategory}><Plus className="h-4 w-4" /></Button></div>
                <TabsContent value="daily" className="flex flex-wrap gap-2">{dailyCategories.map(c => <div key={c.id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">{c.name}<button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button></div>)}</TabsContent>
                <TabsContent value="fixed" className="flex flex-wrap gap-2">{fixedCategories.map(c => <div key={c.id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-secondary/20 rounded-full text-[10px] font-bold uppercase">{c.name}<button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button></div>)}</TabsContent>
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
    <Card className={cn("shadow-xl transition-colors duration-500", isOverspentToday ? "bg-destructive text-destructive-foreground animate-pulse" : isWithinBudget ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")}>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Coins className="h-6 w-6" /> Safe Today</CardTitle>
        <CardDescription className="text-inherit opacity-80 font-medium">{todayStr} • Encrypted Daily Cap</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-5xl font-black tracking-tighter drop-shadow-sm">₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}</div>
        <div className="space-y-4 pt-4 border-t border-white/20">
          <div className="flex justify-between items-center text-sm font-bold opacity-90"><span>Private Spent:</span><span className="text-lg">₹{(todayReport?.spent || 0).toFixed(0)}</span></div>
          <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-white/10"><span>Remaining Daily Cap:</span><span className="text-2xl">₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}</span></div>
          {isOverspentToday && <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-white uppercase animate-bounce bg-white/10 py-2 rounded-lg"><AlertTriangle className="h-4 w-4" /> Limit Exceeded by ₹{((todayReport?.spent || 0) - dailyAllocationToday).toFixed(0)}</div>}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 flex justify-center"><div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm">Vault enforces your monthly caps.</div></CardFooter>
    </Card>
  );
}
