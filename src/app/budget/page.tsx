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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [privacyKey, setPrivacyKey] = useState<string | null>(null);

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
  const todayStr = mounted ? format(now, 'yyyy-MM-dd') : '';
  const monthId = mounted ? format(now, 'yyyyMM') : '';
  const monthName = mounted ? format(now, 'MMMM yyyy') : '';
  const daysInMonth = mounted ? getDaysInMonth(now) : 30;

  const categoriesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenseCategories');
  }, [db, user]);

  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return doc(db, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [db, user, monthId]);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [db, user, monthId]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [db, user, monthId]);

  const { data: rawCategories } = useCollection(categoriesRef);
  const { data: rawFixed } = useCollection(fixedExpensesRef);
  const { data: rawBudget } = useDoc(monthlyBudgetRef);
  const { data: rawExpenses } = useCollection(expensesRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!privacyKey || !mounted) return;
      setIsDecrypting(true);

      if (rawCategories) {
        const cats = await Promise.all(rawCategories.map(async c => ({
          ...c,
          name: await decryptData(c.name, privacyKey)
        })));
        setDecryptedCategories(cats);
      }

      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: await decryptNumber(rawBudget.totalBudgetAmount, privacyKey),
          baseBudgetAmount: await decryptNumber(rawBudget.baseBudgetAmount, privacyKey),
          extraBudgetAmount: await decryptNumber(rawBudget.extraBudgetAmount, privacyKey),
        });
      }

      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          name: await decryptData(f.name, privacyKey),
          amount: await decryptNumber(f.amount, privacyKey),
        })));
        setDecryptedFixed(fixed);
      }

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
  }, [rawCategories, rawBudget, rawFixed, rawExpenses, privacyKey, mounted]);

  const dailyCategories = decryptedCategories?.filter(c => c.type === 'daily') || [];
  const fixedCategories = decryptedCategories?.filter(c => c.type === 'fixed') || [];
  const totalIncludedFixed = decryptedFixed?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthlyPool = (decryptedBudget?.totalBudgetAmount || 0) - totalIncludedFixed;
  const totalSpentThisMonth = decryptedExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remainingNetPool = netMonthlyPool - totalSpentThisMonth;
  const dailyBase = netMonthlyPool / daysInMonth;
  const calculatedWeekendBonus = Math.round(dailyBase * 0.5);

  const budgetReport = useMemo(() => {
    if (!decryptedBudget || !decryptedExpenses || !mounted) return null;
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
  }, [decryptedBudget, decryptedExpenses, decryptedFixed, now, calculatedWeekendBonus, mounted]);

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
    toast({ title: "Vault Balanced" });
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
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Privacy Vault...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!privacyKey && (
        <Alert variant="destructive" className="mb-6 border-2 rounded-2xl shadow-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-black uppercase tracking-tighter">Security Lock Active</AlertTitle>
          <AlertDescription className="text-xs">
            Unlock your Master Key from the sidebar to manage your budget.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="lg:hidden">
            <SustainableTodayCard isOverspentToday={isOverspentToday} isWithinBudget={isWithinBudget} todayStr={todayStr} dailyAllocationToday={dailyAllocationToday} todayReport={todayReport} />
          </div>

          <Card className="shadow-lg border-t-4 border-t-primary rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight"><Wallet className="h-5 w-5 text-primary" /> Monthly Vault</CardTitle>
              <CardDescription className="text-xs">Protected targets for {monthName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial Pool (E2EE)</Label>
                  {decryptedBudget?.totalBudgetAmount > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 border rounded-xl bg-muted/20">
                          <span className="text-muted-foreground block text-[9px] uppercase font-black">Base</span>
                          <span className="font-black text-sm">₹{decryptedBudget.baseBudgetAmount.toLocaleString()}</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-muted/20">
                          <span className="text-muted-foreground block text-[9px] uppercase font-black">Extra</span>
                          <span className="font-black text-sm text-primary">₹{decryptedBudget.extraBudgetAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-14 px-4 py-2 rounded-2xl border bg-primary/5 font-black text-2xl flex items-center justify-between shadow-inner">
                          <span className="text-[9px] uppercase text-primary font-black">Total</span>
                          <span>₹{decryptedBudget.totalBudgetAmount.toLocaleString()}</span>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setIsAddingExtra(!isAddingExtra)} className={cn("h-14 w-14 rounded-2xl", isAddingExtra && "bg-primary text-white")}>
                          {isAddingExtra ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </Button>
                      </div>
                      {isAddingExtra && (
                        <div className="p-4 border rounded-2xl bg-primary/5 animate-in slide-in-from-top-2">
                          <Label className="text-[10px] font-black uppercase mb-3 block text-primary">Add Private Extra</Label>
                          <div className="flex gap-2">
                            <Input type="number" placeholder="₹ Amount" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()} autoFocus className="h-10" />
                            <Button onClick={handleAddExtra} className="h-10 font-bold px-4">Add</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Enter Monthly Limit..." value={tempInitialBudget} onChange={(e) => setTempInitialBudget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetInitialBudget()} className="h-12 text-lg font-bold" />
                      <Button onClick={handleSetInitialBudget} className="h-12 font-bold px-6">Set</Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/10 relative overflow-hidden group">
                  <div className="flex items-center justify-between relative z-10">
                    <Label className="flex items-center gap-2 font-black text-xs"><CalendarDays className="h-4 w-4 text-primary" /> Weekend Boost</Label>
                    <Switch checked={decryptedBudget?.isWeekendExtraBudgetEnabled || false} onCheckedChange={(checked) => saveMonthlyBudget({ isWeekendExtraBudgetEnabled: checked })} />
                  </div>
                  {decryptedBudget?.isWeekendExtraBudgetEnabled && (
                    <div className="pt-2 animate-in fade-in zoom-in-95 relative z-10 text-center">
                      <div className="p-4 bg-background/50 dark:bg-muted/30 rounded-xl border border-dashed border-primary/30">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Encrypted Bonus</p>
                        <p className="text-3xl font-black text-primary">₹{calculatedWeekendBonus}</p>
                        <p className="text-[8px] text-muted-foreground font-medium mt-1">Applied Sat & Sun</p>
                      </div>
                    </div>
                  )}
                  <ShieldAlert className="absolute -bottom-4 -right-4 w-20 h-20 text-primary/5 -rotate-12" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 grid grid-cols-2 gap-4 py-5 border-t">
              <div className="flex flex-col"><span className="text-muted-foreground text-[9px] uppercase font-black tracking-widest">Net Month Pool</span><span className="text-xl font-black">₹{remainingNetPool.toLocaleString()}</span></div>
              <div className="flex flex-col border-l pl-4"><span className="text-muted-foreground text-[9px] uppercase font-black tracking-widest">Daily Base Limit</span><span className="text-xl font-black">₹{dailyBase.toFixed(0)}</span></div>
            </CardFooter>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border">
              <CardHeader className="bg-muted/30 border-b py-3"><CardTitle className="text-base flex items-center gap-2 font-black"><ReceiptText className="h-4 w-4 text-primary" /> Fixed Vault</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <Input placeholder="Item Name" value={newFixed.name} onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })} className="h-9 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newFixed.categoryId} onValueChange={(v) => setNewFixed({ ...newFixed, categoryId: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{fixedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Amount" value={newFixed.amount} onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })} className="h-9 text-xs font-bold" />
                  </div>
                  <Button onClick={addFixedExpense} className="w-full h-9 font-bold text-xs"><Plus className="h-3 w-3 mr-1" /> Add Secure Item</Button>
                </div>
                <ScrollArea className="h-[200px] border rounded-xl">
                  <Table>
                    <TableBody>
                      {decryptedFixed?.length ? decryptedFixed.map((expense) => (
                        <TableRow key={expense.id} className="h-12">
                          <TableCell className="font-bold text-xs truncate max-w-[100px]">{expense.name}</TableCell>
                          <TableCell className="text-xs font-black">₹{expense.amount.toLocaleString()}</TableCell>
                          <TableCell className="w-10 text-right"><Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(fixedExpensesRef!, expense.id))} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell className="text-center py-10 text-[10px] italic text-muted-foreground">No secure fixed items.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className={cn("shadow-lg rounded-2xl transition-all border-none ring-1 ring-border", editingExpenseId ? "ring-2 ring-orange-400 bg-orange-50/10" : "")}>
              <CardHeader className="bg-muted/30 border-b py-3"><CardTitle className="text-base flex items-center gap-2 font-black">{editingExpenseId ? <Pencil className="h-4 w-4 text-orange-500" /> : <BrainCircuit className="h-4 w-4 text-primary" />} Secure Logger</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Input placeholder="Private Description..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="h-11 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newExpense.categoryId} onValueChange={(val) => setNewExpense({ ...newExpense, categoryId: val })}>
                    <SelectTrigger className="h-11 text-xs"><SelectValue placeholder="Label" /></SelectTrigger>
                    <SelectContent>{dailyCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="₹ Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="h-11 text-lg font-black" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleLogExpense} className={cn("flex-1 h-11 font-black shadow-md", editingExpenseId && "bg-orange-500")} disabled={loading}>
                    {loading ? "Encrypting..." : editingExpenseId ? "Update Item" : "Secure Log"}
                  </Button>
                  {editingExpenseId && <Button variant="outline" className="h-11 px-4" onClick={() => { setEditingExpenseId(null); setNewExpense({ description: '', amount: '', categoryId: '' }); }}><X className="h-4 w-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 font-black"><History className="h-4 w-4 text-primary" /> Activity History</CardTitle>
              <Badge variant="outline" className="text-[9px] font-black uppercase">{decryptedExpenses?.length || 0} Records</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] w-full">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10"><TableRow className="h-10"><TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead><TableHead className="text-[10px] font-black uppercase tracking-widest">Item</TableHead><TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead><TableHead className="w-20 text-right px-4"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {decryptedExpenses?.length ? [...decryptedExpenses].sort((a,b) => b.date.localeCompare(a.date)).map((exp) => (
                      <TableRow key={exp.id} className={cn("h-12 text-xs hover:bg-muted/30", editingExpenseId === exp.id && "bg-orange-50/50")}>
                        <TableCell className="text-muted-foreground font-bold">{format(new Date(exp.date), 'dd MMM')}</TableCell>
                        <TableCell className="font-bold truncate max-w-[150px]">{exp.description || '[Protected]'}</TableCell>
                        <TableCell className="font-black text-sm">₹{exp.amount}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1 h-12 pr-4">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingExpenseId(exp.id); setNewExpense({ description: exp.description || '', amount: exp.amount.toString(), categoryId: exp.expenseCategoryId }); }} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(expensesRef!, exp.id))} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-xs">No secure activity recorded.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="hidden lg:block">
            <SustainableTodayCard isOverspentToday={isOverspentToday} isWithinBudget={isWithinBudget} todayStr={todayStr} dailyAllocationToday={dailyAllocationToday} todayReport={todayReport} />
          </div>
          
          <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30 border-b py-3"><CardTitle className="text-base flex items-center gap-2 font-black"><LayoutGrid className="h-4 w-4 text-primary" /> Label Vault</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="daily" onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <TabsList className="grid w-full grid-cols-2 mb-6 h-10 p-1 bg-muted rounded-xl"><TabsTrigger value="daily" className="rounded-lg font-bold">Daily</TabsTrigger><TabsTrigger value="fixed" className="rounded-lg font-bold">Fixed</TabsTrigger></TabsList>
                <div className="flex gap-2 mb-6"><Input placeholder="New private label..." value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCategory()} className="h-10 text-xs" /><Button size="icon" onClick={addCategory} className="h-10 w-10 shrink-0 rounded-xl"><Plus className="h-4 w-4" /></Button></div>
                <TabsContent value="daily" className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-right-2">{dailyCategories.map(c => <div key={c.id} className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-tighter border border-primary/20">{c.name}<button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-0.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="h-3 w-3" /></button></div>)}</TabsContent>
                <TabsContent value="fixed" className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2">{fixedCategories.map(c => <div key={c.id} className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-secondary/20 rounded-full text-[10px] font-black uppercase tracking-tighter border border-secondary/30">{c.name}<button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-0.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="h-3 w-3" /></button></div>)}</TabsContent>
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
      "shadow-2xl transition-all duration-500 rounded-2xl border-none ring-4 ring-offset-4 ring-offset-background", 
      isOverspentToday ? "bg-destructive text-destructive-foreground ring-destructive animate-pulse" : 
      isWithinBudget ? "bg-secondary text-secondary-foreground ring-secondary" : 
      "bg-primary text-primary-foreground ring-primary"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-black flex items-center gap-3 drop-shadow-md"><Coins className="h-7 w-7" /> Safe Today</CardTitle>
        <CardDescription className="text-inherit opacity-80 font-black text-[10px] uppercase tracking-widest">{todayStr} • Daily Limit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="text-6xl font-black tracking-tighter drop-shadow-xl">₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}</div>
        <div className="space-y-4 pt-4 border-t border-white/20">
          <div className="flex justify-between items-center text-xs font-black opacity-90 uppercase tracking-tighter"><span>Private Spent</span><span className="text-xl">₹{(todayReport?.spent || 0).toFixed(0)}</span></div>
          <div className="flex justify-between items-center text-[10px] font-black pt-3 border-t border-white/10 uppercase tracking-widest opacity-80"><span>Remaining Cap</span><span className="text-3xl">₹{Math.max(0, dailyAllocationToday - (todayReport?.spent || 0)).toFixed(0)}</span></div>
          {isOverspentToday && <div className="pt-3 flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase animate-bounce bg-white/20 py-2.5 rounded-xl shadow-inner"><AlertTriangle className="h-4 w-4" /> Limit Exceeded by ₹{((todayReport?.spent || 0) - dailyAllocationToday).toFixed(0)}</div>}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-5 flex justify-center"><div className="bg-white/10 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">Protected Vault Strategy</div></CardFooter>
    </Card>
  );
}
