"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Plus, Trash2, BrainCircuit, Loader2, Wallet, ReceiptText, CalendarDays, Coins, LayoutGrid, History, Pencil, X, ShieldAlert, AlertTriangle, Lock, ShieldCheck, Activity, PiggyBank, TrendingUp, HeartPulse, Smile, Check, Tag, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { cn } from '@/lib/utils';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ALLOCATION_BUCKETS = [
  { id: 'expense', label: 'Expenses', icon: Wallet, color: 'text-blue-500' },
  { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-green-500' },
  { id: 'investment', label: 'Investments', icon: TrendingUp, color: 'text-orange-500' },
  { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-purple-500' },
  { id: 'personal', label: 'Personal', icon: Smile, color: 'text-pink-500' }
];

export default function BudgetPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState('logger');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      if (!user || !mounted) return;
      setIsDecrypting(true);

      if (rawCategories) {
        const cats = await Promise.all(rawCategories.map(async c => ({
          ...c,
          name: c.isEncrypted ? await decryptData(c.name, user.uid) : (c.name || '')
        })));
        setDecryptedCategories(cats);
      }

      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
          baseBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.baseBudgetAmount, user.uid) : (rawBudget.baseBudgetAmount || 0),
          extraBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.extraBudgetAmount, user.uid) : (rawBudget.extraBudgetAmount || 0),
          actualSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualSpent, user.uid) : (rawBudget.actualSpent || 0),
          actualFixedSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualFixedSpent, user.uid) : (rawBudget.actualFixedSpent || 0),
          isDailyLimitEnabled: rawBudget.isDailyLimitEnabled ?? true,
        });
      }

      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          name: f.isEncrypted ? await decryptData(f.name, user.uid) : (f.name || ''),
          amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
          allocationBucket: f.allocationBucket || 'expense'
        })));
        setDecryptedFixed(fixed);
      }

      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          description: e.isEncrypted ? await decryptData(e.description, user.uid) : (e.description || ''),
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
          allocationBucket: e.allocationBucket || 'expense'
        })));
        setDecryptedExpenses(exps);
      }
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawCategories, rawBudget, rawFixed, rawExpenses, user, mounted]);

  // Aggregate Sync Effect - Specifically for 'expense' pillar pool
  useEffect(() => {
    const syncAggregates = async () => {
      if (!user || !monthlyBudgetRef || isDecrypting || !mounted || !decryptedBudget) return;
      
      const spent = decryptedExpenses?.filter(e => (e.allocationBucket || 'expense') === 'expense').reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const fixedSpent = decryptedFixed?.filter(f => f.includeInBudget && (f.allocationBucket || 'expense') === 'expense').reduce((s, f) => s + f.amount, 0) || 0;
      
      const prevSpent = decryptedBudget.actualSpent || 0;
      const prevFixed = decryptedBudget.actualFixedSpent || 0;

      if (Math.abs(spent - prevSpent) > 0.01 || Math.abs(fixedSpent - prevFixed) > 0.01) {
        setDocumentNonBlocking(monthlyBudgetRef, {
          actualSpent: await encryptData(spent.toFixed(2), user.uid),
          actualFixedSpent: await encryptData(fixedSpent.toFixed(2), user.uid),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    };
    
    syncAggregates();
  }, [decryptedExpenses, decryptedFixed, decryptedBudget?.actualSpent, decryptedBudget?.actualFixedSpent, user, monthlyBudgetRef, isDecrypting, mounted]);

  useEffect(() => {
    if (editingExpenseId) {
      setActiveInputTab('logger');
    }
  }, [editingExpenseId]);

  useEffect(() => {
    if (editingFixedId) {
      setActiveInputTab('fixed');
    }
  }, [editingFixedId]);

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    const normalize = (s: string) => (s || '').trim().toUpperCase();
    return (decryptedCategories || [])
      .filter(c => {
        const norm = normalize(c.name);
        if (!norm || seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });
  }, [decryptedCategories]);

  // Only count fixed expenses belonging to the 'expense' pillar towards the month pool reduction
  const totalIncludedFixed = decryptedFixed?.filter(f => f.includeInBudget && (f.allocationBucket || 'expense') === 'expense').reduce((s, f) => s + f.amount, 0) || 0;
  const netMonthlyPool = (decryptedBudget?.totalBudgetAmount || 0) - totalIncludedFixed;
  
  // Only count variable expenses belonging to the 'expense' pillar towards the pool consumption
  const totalSpentThisMonth = decryptedExpenses?.filter(exp => (exp.allocationBucket || 'expense') === 'expense').reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remainingNetPool = netMonthlyPool - totalSpentThisMonth;
  const dailyBase = netMonthlyPool / daysInMonth;
  const calculatedWeekendBonus = Math.round(dailyBase * 0.5);

  const budgetReport = useMemo(() => {
    if (!decryptedBudget || !decryptedExpenses || !mounted) return null;
    const dailyExpensesMap: Record<string, number> = {};
    
    // Filtering for 'expense' pillar only to impact rolling budget
    decryptedExpenses
      .filter(exp => (exp.allocationBucket || 'expense') === 'expense')
      .forEach(exp => {
        dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
      });

    const config: MonthlyConfig = {
      totalBudget: decryptedBudget.totalBudgetAmount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
      fixedExpenses: (decryptedFixed || []).map(f => ({ 
        id: f.id, 
        name: f.name, 
        amount: f.amount, 
        included: f.includeInBudget && (f.allocationBucket || 'expense') === 'expense' 
      })),
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
  const [newCategory, setNewCategory] = useState({ name: '', type: 'daily', isPrivate: false });
  const [newFixed, setNewFixed] = useState({ name: '', amount: '', categoryId: '', allocationBucket: 'expense' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', categoryId: '', allocationBucket: 'expense' });

  const saveMonthlyBudget = async (updates: any) => {
    if (!monthlyBudgetRef || !user) return;
    const encryptedUpdates = { ...updates };
    if (updates.totalBudgetAmount !== undefined) encryptedUpdates.totalBudgetAmount = await encryptData(updates.totalBudgetAmount, user.uid);
    if (updates.baseBudgetAmount !== undefined) encryptedUpdates.baseBudgetAmount = await encryptData(updates.baseBudgetAmount, user.uid);
    if (updates.extraBudgetAmount !== undefined) encryptedUpdates.extraBudgetAmount = await encryptData(updates.extraBudgetAmount, user.uid);
    if (updates.actualSpent !== undefined) encryptedUpdates.actualSpent = await encryptData(updates.actualSpent.toString(), user.uid);
    if (updates.actualFixedSpent !== undefined) encryptedUpdates.actualFixedSpent = await encryptData(updates.actualFixedSpent.toString(), user.uid);

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
    const normalizedName = newCategory.name.trim().toUpperCase();
    if (!normalizedName || !categoriesRef || !user) return;
    
    const isDuplicate = decryptedCategories.some(
      c => (c.name || '').trim().toUpperCase() === normalizedName
    );

    if (isDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "Label Exists", 
        description: `"${normalizedName}" is already defined in your vault.` 
      });
      return;
    }

    addDocumentNonBlocking(categoriesRef, {
      userId: user?.uid,
      name: await encryptData(normalizedName, user.uid),
      type: newCategory.type,
      isPrivate: newCategory.isPrivate,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    setNewCategory({ ...newCategory, name: '', isPrivate: false });
  };

  const toggleCategoryPrivacy = (id: string, currentPrivate: boolean) => {
    if (!categoriesRef) return;
    updateDocumentNonBlocking(doc(categoriesRef, id), { 
      isPrivate: !currentPrivate,
      updatedAt: new Date().toISOString()
    });
    toast({ 
      title: !currentPrivate ? "Isolation Active" : "Public Mode Active", 
      description: !currentPrivate ? "Label isolated from collaborative sync." : "Label now visible to Split Pay matching." 
    });
  };

  const addFixedExpense = async () => {
    if (!newFixed.amount || !newFixed.categoryId || !fixedExpensesRef || !user) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Amount and Label are required for Fixed costs." });
      return;
    }
    setLoading(true);

    const payload = {
      userId: user?.uid,
      monthlyBudgetId: monthId,
      name: await encryptData(newFixed.name || 'Recurring Cost', user.uid),
      amount: await encryptData(newFixed.amount, user.uid),
      expenseCategoryId: newFixed.categoryId,
      allocationBucket: newFixed.allocationBucket,
      includeInBudget: true,
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };

    if (editingFixedId) {
      updateDocumentNonBlocking(doc(fixedExpensesRef, editingFixedId), payload);
      setEditingFixedId(null);
      setNewFixed({ name: '', amount: '', categoryId: '', allocationBucket: 'expense' });
      toast({ title: "Fixed Cost Updated" });
    } else {
      addDocumentNonBlocking(fixedExpensesRef, {
        ...payload,
        createdAt: new Date().toISOString()
      }).then(() => {
        setNewFixed({ name: '', amount: '', categoryId: '', allocationBucket: 'expense' });
        toast({ title: "Fixed Cost Secured", description: "Record synchronized with Wealth Planner." });
      });
    }
    setLoading(false);
  };

  const handleLogExpense = async () => {
    if (!newExpense.amount || !newExpense.categoryId || !user || !expensesRef) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Amount and Label are required." });
      return;
    }
    setLoading(true);
    const expenseData = {
      userId: user.uid,
      monthlyBudgetId: monthId,
      description: await encryptData(newExpense.description || '', user.uid),
      amount: await encryptData(newExpense.amount, user.uid),
      expenseCategoryId: newExpense.categoryId,
      allocationBucket: newExpense.allocationBucket,
      date: editingExpenseId ? (decryptedExpenses?.find(e => e.id === editingExpenseId)?.date || todayStr) : todayStr,
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };
    if (editingExpenseId) {
      updateDocumentNonBlocking(doc(expensesRef, editingExpenseId), expenseData);
      setEditingExpenseId(null);
      toast({ title: "Daily Spent Updated" });
    } else {
      addDocumentNonBlocking(expensesRef, { ...expenseData, createdAt: new Date().toISOString() });
      toast({ title: "Daily Spent Logged" });
    }
    setNewExpense({ description: '', amount: '', categoryId: '', allocationBucket: 'expense' });
    setLoading(false);
  };

  const downloadActivityCsv = () => {
    if (!decryptedExpenses || decryptedExpenses.length === 0) {
      toast({ title: "No Data", description: "No records found to export for this month." });
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Pillar', 'Amount (₹)'];
    const rows = [...decryptedExpenses].sort((a,b) => b.date.localeCompare(a.date)).map(exp => {
      const catName = allCategories.find(c => c.id === exp.expenseCategoryId)?.name || 'MISC';
      return [
        exp.date,
        `"${(exp.description || 'SECURED ITEM').replace(/"/g, '""')}"`,
        `"${catName.replace(/"/g, '""')}"`,
        exp.allocationBucket,
        exp.amount
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LifeTrack_Activity_${monthId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "CSV has been saved to your downloads." });
  };

  // Immediate layout transition once component is mounted.
  // Cached Firestore data will populate almost instantly.
  if (!mounted) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Privacy Vault...</p>
        </div>
      </AppShell>
    );
  }

  const isDailyEnabled = decryptedBudget?.isDailyLimitEnabled !== false;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Card className={cn("shadow-lg border-t-4 border-t-primary rounded-2xl overflow-hidden transition-opacity", isDecrypting && "opacity-60")}>
            <CardHeader className="bg-muted/30 pb-3 md:pb-4 px-4 md:px-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg font-black tracking-tight"><Wallet className="h-5 w-5 text-primary" /> Monthly Vault</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-tight">Protected targets for {monthName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6 px-4 md:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expense Pool (E2EE)</Label>
                  {decryptedBudget?.totalBudgetAmount > 0 ? (
                    <div className="space-y-3 md:space-y-4">
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="p-2 md:p-3 border rounded-xl bg-muted/20">
                          <span className="text-muted-foreground block text-[8px] md:text-[9px] uppercase font-black">Base</span>
                          <span className="font-black text-xs md:text-sm">₹{decryptedBudget.baseBudgetAmount.toLocaleString()}</span>
                        </div>
                        <div className="p-2 md:p-3 border rounded-xl bg-muted/20">
                          <span className="text-muted-foreground block text-[8px] md:text-[9px] uppercase font-black">Extra</span>
                          <span className="font-black text-xs md:text-sm text-primary">₹{decryptedBudget.extraBudgetAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-12 md:h-14 px-3 md:px-4 py-2 rounded-2xl border bg-primary/5 font-black text-xl md:text-2xl flex items-center justify-between shadow-inner">
                          <span className="text-[8px] md:text-[9px] uppercase text-primary font-black">Total</span>
                          <span className="tracking-tighter">₹{decryptedBudget.totalBudgetAmount.toLocaleString()}</span>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setIsAddingExtra(!isAddingExtra)} className={cn("h-12 w-12 md:h-14 md:w-14 rounded-2xl", isAddingExtra && "bg-primary text-white")}>
                          {isAddingExtra ? <X className="h-4 w-4 md:h-5 md:w-5" /> : <Plus className="h-4 w-4 md:h-5 md:w-5" />}
                        </Button>
                      </div>
                      {isAddingExtra && (
                        <div className="p-3 md:p-4 border rounded-2xl bg-primary/5 animate-in slide-in-from-top-2">
                          <Label className="text-[9px] md:text-[10px] font-black uppercase mb-2 md:mb-3 block text-primary">Add Private Extra</Label>
                          <div className="flex gap-2">
                            <Input type="number" placeholder="₹ Amount" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()} autoFocus className="h-10 text-sm" />
                            <Button onClick={handleAddExtra} className="h-10 font-bold px-4 text-xs">Add</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !isDecrypting ? (
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Enter Monthly Limit..." value={tempInitialBudget} onChange={(e) => setTempInitialBudget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetInitialBudget()} className="h-12 text-base md:text-lg font-bold rounded-xl" />
                      <Button onClick={handleSetInitialBudget} className="h-12 font-bold px-4 md:px-6 rounded-xl">Set</Button>
                    </div>
                  ) : (
                    <div className="h-12 w-full animate-pulse bg-muted rounded-xl" />
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3 p-4 border rounded-2xl bg-muted/10 relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                      <Label className="flex items-center gap-2 font-black text-xs"><CalendarDays className="h-4 w-4 text-primary" /> Weekend Boost</Label>
                      <Switch checked={decryptedBudget?.isWeekendExtraBudgetEnabled || false} onCheckedChange={(checked) => saveMonthlyBudget({ isWeekendExtraBudgetEnabled: checked })} />
                    </div>
                    {decryptedBudget?.isWeekendExtraBudgetEnabled && (
                      <div className="pt-2 animate-in fade-in zoom-in-95 relative z-10 text-center">
                        <div className="p-3 bg-background/50 dark:bg-muted/30 rounded-xl border border-dashed border-primary/30">
                          <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-1">Encrypted Bonus</p>
                          <p className="text-xl font-black text-primary tracking-tighter">₹{calculatedWeekendBonus}</p>
                        </div>
                      </div>
                    )}
                    <ShieldCheck className="absolute -bottom-4 -right-4 w-16 h-16 text-primary/5 -rotate-12" />
                  </div>

                  <div className="space-y-3 p-4 border rounded-2xl bg-muted/10 relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                      <Label className="flex items-center gap-2 font-black text-xs"><Activity className="h-4 w-4 text-primary" /> Daily Tracking</Label>
                      <Switch 
                        checked={isDailyEnabled} 
                        onCheckedChange={(checked) => saveMonthlyBudget({ isDailyLimitEnabled: checked })} 
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground font-medium mt-1 relative z-10">
                      {isDailyEnabled ? "Rolling daily allowance active." : "Month-wide pool mode active."}
                    </p>
                    <History className="absolute -bottom-4 -right-4 w-16 h-16 text-primary/5 -rotate-12" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 grid grid-cols-2 gap-4 py-4 md:py-5 border-t px-4 md:px-6">
              <div className="flex flex-col"><span className="text-muted-foreground text-[8px] md:text-[9px] uppercase font-black tracking-widest">Net Month Pool</span><span className="text-lg md:text-xl font-black tracking-tighter">₹{remainingNetPool.toFixed(0)}</span></div>
              {isDailyEnabled && (
                <div className="flex flex-col border-l pl-4"><span className="text-muted-foreground text-[8px] md:text-[9px] uppercase font-black tracking-widest">Daily Base Limit</span><span className="text-lg md:text-xl font-black tracking-tighter">₹{dailyBase.toFixed(0)}</span></div>
              )}
            </CardFooter>
          </Card>

          <Card className={cn("shadow-lg rounded-2xl border-none ring-1 ring-border overflow-hidden transition-all", (editingExpenseId || editingFixedId) ? "ring-2 ring-orange-400 bg-orange-50/10" : "")}>
            <Tabs value={activeInputTab} onValueChange={setActiveInputTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/30 rounded-none border-b">
                <TabsTrigger value="logger" className="rounded-none font-black text-[10px] uppercase gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Wallet className="h-3.5 w-3.5" /> Expense Logger
                </TabsTrigger>
                <TabsTrigger value="fixed" className="rounded-none font-black text-[10px] uppercase gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <ReceiptText className="h-3.5 w-3.5" /> Fixed Vault
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="logger" className="mt-0 p-4 md:p-6 space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Private Description</Label>
                    <Input placeholder="What was this for?..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="h-11 text-[11px] md:text-sm rounded-xl" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Category Label</Label>
                      <Select value={newExpense.categoryId} onValueChange={(val) => setNewExpense({ ...newExpense, categoryId: val })}>
                        <SelectTrigger className="h-11 text-[11px] rounded-xl"><SelectValue placeholder="Select Label" /></SelectTrigger>
                        <SelectContent>{allCategories.map(cat => <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Strategy Pillar</Label>
                      <Select value={newExpense.allocationBucket} onValueChange={(val) => setNewExpense({ ...newExpense, allocationBucket: val })}>
                        <SelectTrigger className="h-11 text-[11px] rounded-xl"><SelectValue placeholder="Select Pillar" /></SelectTrigger>
                        <SelectContent>
                          {ALLOCATION_BUCKETS.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                <b.icon className={cn("h-3 w-3", b.color)} />
                                <span className="text-[10px] font-bold uppercase">{b.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Amount (₹)</Label>
                      <Input type="number" placeholder="0.00" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="h-11 text-base md:text-lg font-black tracking-tighter rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleLogExpense} className={cn("flex-1 h-12 font-black shadow-md rounded-2xl text-xs", editingExpenseId && "bg-orange-500 hover:bg-orange-600")} disabled={loading}>
                      {loading ? "Encrypting..." : editingExpenseId ? "Update Record" : "Log Daily Spent"}
                    </Button>
                    {editingExpenseId && <Button variant="outline" className="h-12 px-4 rounded-2xl" onClick={() => { setEditingExpenseId(null); setNewExpense({ description: '', amount: '', categoryId: '', allocationBucket: 'expense' }); }}><X className="h-5 w-5" /></Button>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fixed" className="mt-0 p-4 md:p-6 space-y-4 animate-in fade-in slide-in-from-right-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Item Name (Optional)</Label>
                    <Input placeholder="Rent, SIP, Insurance, etc. ..." value={newFixed.name} onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })} className="h-11 text-[11px] md:text-sm rounded-xl" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Category Label</Label>
                      <Select value={newFixed.categoryId} onValueChange={(val) => setNewFixed({ ...newFixed, categoryId: val })}>
                        <SelectTrigger className="h-11 text-[11px] rounded-xl"><SelectValue placeholder="Select Label" /></SelectTrigger>
                        <SelectContent>{allCategories.map(cat => <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Strategy Pillar</Label>
                      <Select value={newFixed.allocationBucket} onValueChange={(val) => setNewFixed({ ...newFixed, allocationBucket: val })}>
                        <SelectTrigger className="h-11 text-[11px] rounded-xl"><SelectValue placeholder="Select Pillar" /></SelectTrigger>
                        <SelectContent>
                          {ALLOCATION_BUCKETS.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                <b.icon className={cn("h-3 w-3", b.color)} />
                                <span className="text-[10px] font-bold uppercase">{b.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Amount (₹)</Label>
                      <Input type="number" placeholder="0.00" value={newFixed.amount} onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })} className="h-11 text-base md:text-lg font-black tracking-tighter rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={addFixedExpense} className={cn("flex-1 h-12 font-black shadow-md rounded-2xl text-xs", editingFixedId && "bg-orange-500 hover:bg-orange-600")} disabled={loading}>
                      {loading ? "Encrypting..." : editingFixedId ? "Update Fixed Cost" : "Secure Fixed Record"}
                    </Button>
                    {editingFixedId && <Button variant="outline" className="h-12 px-4 rounded-2xl" onClick={() => { setEditingFixedId(null); setNewFixed({ name: '', amount: '', categoryId: '', allocationBucket: 'expense' }); }}><X className="h-5 w-5" /></Button>}
                  </div>

                  <Separator className="my-2" />
                  
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fixed Records History</p>
                    <ScrollArea className="h-[200px] border rounded-2xl bg-muted/10">
                      <Table>
                        <TableBody>
                          {decryptedFixed?.length ? decryptedFixed.map((expense) => {
                            const bucket = ALLOCATION_BUCKETS.find(b => b.id === expense.allocationBucket) || ALLOCATION_BUCKETS[0];
                            const catName = allCategories.find(c => c.id === expense.expenseCategoryId)?.name || 'MISC';
                            return (
                              <TableRow key={expense.id} className={cn("h-12 hover:bg-muted/20", editingFixedId === expense.id && "bg-orange-50/50")}>
                                <TableCell className="py-2">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[11px] truncate max-w-[120px]">{expense.name || 'UNNAMED'}</span>
                                    <span className="text-[7px] uppercase font-black text-muted-foreground flex items-center gap-1"><Tag className="h-2 w-2" /> {catName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50 border border-dashed w-fit">
                                    <bucket.icon className={cn("h-2.5 w-2.5", bucket.color)} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">{bucket.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-black py-2">₹{expense.amount.toLocaleString()}</TableCell>
                                <TableCell className="w-16 text-right py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingFixedId(expense.id);
                                      setNewFixed({
                                        name: expense.name,
                                        amount: expense.amount.toString(),
                                        categoryId: expense.expenseCategoryId,
                                        allocationBucket: expense.allocationBucket || 'expense'
                                      });
                                    }} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(fixedExpensesRef!, expense.id))} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }) : <TableRow><TableCell className="text-center py-12 text-[10px] italic text-muted-foreground">No secure fixed items found.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <Button 
            variant="outline" 
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full h-14 rounded-2xl font-black gap-3 shadow-sm border-dashed border-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
          >
            <History className="h-5 w-5 text-primary group-hover:rotate-[-30deg] transition-transform" />
            <span className="flex-1 text-left">View Activity History</span>
            <Badge variant="secondary" className="text-[10px] font-black uppercase bg-primary/10 text-primary px-3">
              {decryptedExpenses?.length || 0} Records
            </Badge>
          </Button>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="hidden lg:block">
            <SustainableTodayCard isOverspentToday={isOverspentToday} isWithinBudget={isWithinBudget} todayStr={todayStr} dailyAllocationToday={dailyAllocationToday} todayReport={todayReport} isDailyEnabled={isDailyEnabled} remainingNetPool={remainingNetPool} totalSpentThisMonth={totalSpentThisMonth} monthName={monthName} isDecrypting={isDecrypting} />
          </div>
          
          <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-2.5 px-4">
              <CardTitle className="text-sm md:text-base flex items-center gap-2 font-black">
                <LayoutGrid className="h-4 w-4 text-primary" /> Label Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6 px-4">
              <Tabs defaultValue="daily" onValueChange={(v) => setNewCategory({ ...newCategory, type: v as any })}>
                <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 h-9 md:h-10 p-1 bg-muted rounded-xl"><TabsTrigger value="daily" className="rounded-lg font-bold text-[11px] md:text-xs">Daily</TabsTrigger><TabsTrigger value="fixed" className="rounded-lg font-bold text-[11px] md:text-xs">Fixed</TabsTrigger></TabsList>
                
                <div className="space-y-3 mb-4 md:mb-6">
                  <div className="flex gap-2">
                    <Input placeholder="New private label..." value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCategory()} className="h-9 text-[11px]" />
                    <Button size="icon" onClick={addCategory} className="h-9 w-9 shrink-0 rounded-xl"><Plus className="h-4 w-4" /></Button>
                  </div>
                  {newCategory.type === 'daily' && (
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> Isolation Mode (Private)
                      </Label>
                      <Switch 
                        checked={newCategory.isPrivate} 
                        onCheckedChange={(checked) => setNewCategory({ ...newCategory, isPrivate: checked })}
                      />
                    </div>
                  )}
                </div>

                <TabsContent value="daily" className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-right-2">
                  {decryptedCategories.filter(c => c.type === 'daily').map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-primary/10 text-primary rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-tighter border border-primary/20 whitespace-nowrap">
                      <button 
                        onClick={() => toggleCategoryPrivacy(c.id, c.isPrivate)}
                        title={c.isPrivate ? "Make Public (Visible to Split Pay)" : "Make Private (Isolated from Split Pay)"}
                        className={cn(
                          "p-1 rounded-full transition-all duration-200",
                          c.isPrivate ? "bg-primary text-white shadow-sm" : "text-primary/40 hover:text-primary hover:bg-primary/10"
                        )}
                      >
                        <Lock className="h-2.5 w-2.5" />
                      </button>
                      <span className="px-1">{c.name}</span>
                      <button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-1 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="fixed" className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2">
                  {decryptedCategories.filter(c => c.type === 'fixed').map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-secondary/20 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-tighter border border-secondary/30 whitespace-nowrap">
                      {c.name}
                      <button onClick={() => deleteDocumentNonBlocking(doc(categoriesRef!, c.id))} className="ml-1 text-destructive p-0.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-muted/30 border-b py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-base flex items-center gap-2 font-black">
                  <History className="h-5 w-5 text-primary" />
                  Transaction Ledger
                </DialogTitle>
                <DialogDescription className="text-[10px] uppercase font-bold tracking-tight">Comprehensive history of your secured spends</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadActivityCsv}
                  className="h-8 px-3 text-[10px] font-black uppercase gap-2 bg-background shadow-sm hover:bg-primary/5"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Export CSV
                </Button>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-background h-8">
                  {decryptedExpenses?.length || 0} Total Records
                </Badge>
              </div>
            </div>
          </DialogHeader>
          <div className="p-0">
            <ScrollArea className="h-[60vh] w-full">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Item Details</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Amount</TableHead>
                    <TableHead className="w-20 text-right px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decryptedExpenses?.length ? [...decryptedExpenses].sort((a,b) => b.date.localeCompare(a.date)).map((exp) => (
                    <TableRow key={exp.id} className={cn("h-14 text-[12px] hover:bg-muted/30 group", editingExpenseId === exp.id && "bg-orange-50/50")}>
                      <TableCell className="text-muted-foreground font-black px-6">{format(new Date(exp.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="px-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold truncate max-w-[200px] text-sm">{exp.description || 'SECURED ITEM'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] uppercase font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/10">{exp.allocationBucket}</span>
                            <span className="text-[8px] uppercase font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-muted-foreground/10">
                              {allCategories.find(c => c.id === exp.expenseCategoryId)?.name || 'MISC'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-sm px-6">₹{exp.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => { 
                            setEditingExpenseId(exp.id); 
                            setNewExpense({ description: exp.description || '', amount: exp.amount.toString(), categoryId: exp.expenseCategoryId, allocationBucket: exp.allocationBucket || 'expense' }); 
                            setIsActivityModalOpen(false);
                          }} className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(expensesRef!, exp.id))} className="h-8 w-8 hover:bg-destructive/10 text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24">
                        <div className="flex flex-col items-center gap-3 opacity-30 grayscale">
                          <History className="h-12 w-12" />
                          <p className="text-sm font-black uppercase tracking-widest">No secure activity recorded.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <div className="p-4 border-t bg-muted/10 flex justify-end">
            <Button variant="secondary" onClick={() => setIsActivityModalOpen(false)} className="rounded-xl font-black h-9 text-[10px] uppercase px-6">Close Ledger</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SustainableTodayCard({ isOverspentToday, isWithinBudget, todayStr, dailyAllocationToday, todayReport, isDailyEnabled, remainingNetPool, totalSpentThisMonth, monthName, isDecrypting }: any) {
  if (!isDailyEnabled) {
    const total = remainingNetPool + totalSpentThisMonth;
    return (
      <Card className={cn("shadow-2xl transition-all duration-500 rounded-3xl border-none ring-4 ring-offset-4 ring-offset-background bg-primary text-primary-foreground ring-primary", isDecrypting && "animate-pulse opacity-80")}>
        <CardHeader className="pb-1 px-5 pt-5 md:px-6 md:pt-6">
          <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3 drop-shadow-md"><Coins className="h-6 w-6 md:h-7 md:h-7" /> Monthly Pool</CardTitle>
          <CardDescription className="text-inherit opacity-80 font-black text-[9px] md:text-[10px] uppercase tracking-widest mt-1">Vault Status • {monthName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 px-5 md:px-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Remaining Balance</p>
            <div className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-xl">₹{remainingNetPool.toFixed(0)}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Total Amount</p>
              <p className="text-lg font-black">₹{total.toFixed(0)}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Spent Amount</p>
              <p className="text-lg font-black">₹{totalSpentThisMonth.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-4 md:pb-5 flex justify-center px-5 md:px-6"><div className="bg-white/10 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm">Pool Guidance Strategy</div></CardFooter>
      </Card>
    );
  }

  const spentToday = (todayReport?.spent || 0);
  const remaining = Math.max(0, dailyAllocationToday - spentToday);
  
  return (
    <Card className={cn(
      "shadow-2xl transition-all duration-500 rounded-3xl border-none ring-4 ring-offset-4 ring-offset-background", 
      isDecrypting ? "bg-muted text-muted-foreground ring-muted animate-pulse" :
      isOverspentToday ? "bg-destructive text-destructive-foreground ring-destructive animate-pulse" : 
      isWithinBudget ? "bg-secondary text-secondary-foreground ring-secondary" : 
      "bg-primary text-primary-foreground ring-primary"
    )}>
      <CardHeader className="pb-1 px-5 pt-5 md:px-6 md:pt-6">
        <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3 drop-shadow-md"><Coins className="h-6 w-6 md:h-7 md:h-7" /> Safe Today</CardTitle>
        <CardDescription className="text-inherit opacity-80 font-black text-[9px] md:text-[10px] uppercase tracking-widest mt-1">{todayStr} • Daily Limit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2 px-5 md:px-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Remaining Today</p>
          <div className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-xl">₹{remaining.toFixed(0)}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Total Amount</p>
            <p className="text-lg font-black">₹{dailyAllocationToday.toFixed(0)}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Spent Amount</p>
            <p className="text-lg font-black">₹{spentToday.toFixed(0)}</p>
          </div>
        </div>

        {isOverspentToday && !isDecrypting && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase bg-white/20 py-3 rounded-2xl shadow-inner animate-bounce">
            <AlertTriangle className="h-4 w-4" /> 
            Limit Exceeded by ₹{(spentToday - dailyAllocationToday).toFixed(0)}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-4 md:pb-5 flex justify-center px-5 md:px-6"><div className="bg-white/10 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm">Protected Vault Strategy</div></CardFooter>
    </Card>
  );
}
