"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  eachWeekOfInterval,
  isSameWeek,
  subMonths,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  endOfWeek
} from 'date-fns';
import { collection, doc } from 'firebase/firestore';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TableProperties,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Activity,
  Loader2,
  CheckSquare,
  ReceiptText,
  History,
  Target,
  Wallet,
  PiggyBank,
  HeartPulse,
  Smile,
  ShieldCheck,
  BarChart as BarChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { decryptData, decryptNumber } from '@/lib/encryption';

const PILLAR_ICONS: Record<string, any> = {
  expense: { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500' },
  savings: { icon: PiggyBank, color: 'text-green-500', bg: 'bg-green-500' },
  investment: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500' },
  health: { icon: HeartPulse, color: 'text-purple-500', bg: 'bg-purple-500' },
  personal: { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-500' }
};

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: '600'
};

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [mounted, setMounted] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAuditCategories, setSelectedAuditCategories] = useState<Set<string>>(new Set());
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());

  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedPrevBudget, setDecryptedPrevBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedPrevExpenses, setDecryptedPrevExpenses] = useState<any[]>([]);
  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
  const [decryptedSalaryProfile, setDecryptedSalaryProfile] = useState<any>(null);
  const [decryptedAllBudgets, setDecryptedAllBudgets] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monthId = format(selectedDate, 'yyyyMM');
  const prevDate = subMonths(selectedDate, 1);
  const prevMonthId = format(prevDate, 'yyyyMM');

  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [firestore, user, monthId]);
  const { data: rawBudget } = useDoc(monthlyBudgetRef);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [firestore, user, monthId]);
  const { data: rawFixed } = useCollection(fixedExpensesRef);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [firestore, user, monthId]);
  const { data: rawExpenses } = useCollection(monthExpensesRef);

  const prevMonthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId);
  }, [firestore, user, prevMonthId]);
  const { data: rawPrevBudget } = useDoc(prevMonthlyBudgetRef);

  const prevMonthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId, 'expenses');
  }, [firestore, user, prevMonthId]);
  const { data: rawPrevExpenses } = useCollection(prevMonthExpensesRef);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'expenseCategories');
  }, [firestore, user]);
  const { data: rawCategories } = useCollection(categoriesRef);

  const salaryProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'salaryProfiles', 'current');
  }, [firestore, user]);
  const { data: rawSalaryProfile } = useDoc(salaryProfileRef);

  const allBudgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets');
  }, [firestore, user]);
  const { data: rawAllBudgets } = useCollection(allBudgetsQuery);

  useEffect(() => {
    const decryptAll = async () => {
      if (!user || !mounted) return;
      setIsDecrypting(true);

      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
          actualSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualSpent, user.uid) : (rawBudget.actualSpent || 0),
          actualFixedSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualFixedSpent, user.uid) : (rawBudget.actualFixedSpent || 0),
        });
      }

      if (rawPrevBudget) {
        setDecryptedPrevBudget({
          ...rawPrevBudget,
          totalBudgetAmount: rawPrevBudget.isEncrypted ? await decryptNumber(rawPrevBudget.totalBudgetAmount, user.uid) : (rawPrevBudget.totalBudgetAmount || 0),
        });
      }

      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          name: f.isEncrypted ? await decryptData(f.name, user.uid) : (f.name || ''),
          amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
          includeInBudget: f.includeInBudget ?? true,
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
        setSelectedTransactionIds(new Set(exps.map(e => e.id)));
      }

      if (rawPrevExpenses) {
        const pExps = await Promise.all(rawPrevExpenses.map(async e => ({
          ...e,
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
        })));
        setDecryptedPrevExpenses(pExps);
      }

      if (rawCategories) {
        const cats = await Promise.all(rawCategories.map(async c => ({
          ...c,
          name: c.isEncrypted ? await decryptData(c.name, user.uid) : (c.name || ''),
        })));
        setDecryptedCategories(cats);
        if (selectedAuditCategories.size === 0) {
          setSelectedAuditCategories(new Set(cats.map(c => c.id).concat(['misc'])));
        }
      }

      if (rawSalaryProfile) {
        setDecryptedSalaryProfile({
          ...rawSalaryProfile,
          salary: rawSalaryProfile.isEncrypted ? await decryptNumber(rawSalaryProfile.salary, user.uid) : (rawSalaryProfile.salary || 0),
          expensePercent: rawSalaryProfile.expensePercent ?? 50,
          savingsPercent: rawSalaryProfile.savingsPercent ?? 20,
          investmentPercent: rawSalaryProfile.investmentPercent ?? 20,
          healthPercent: rawSalaryProfile.healthPercent ?? 5,
          personalPercent: rawSalaryProfile.personalPercent ?? 5,
        });
      }

      if (rawAllBudgets) {
        const budgets = await Promise.all(rawAllBudgets.map(async b => ({
          ...b,
          actualSpent: b.isEncrypted ? await decryptNumber(b.actualSpent, user.uid) : (b.actualSpent || 0),
          actualFixedSpent: b.isEncrypted ? await decryptNumber(b.actualFixedSpent, user.uid) : (b.actualFixedSpent || 0),
          totalBudgetAmount: b.isEncrypted ? await decryptNumber(b.totalBudgetAmount, user.uid) : (b.totalBudgetAmount || 0),
        })));
        setDecryptedAllBudgets(budgets);
      }

      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawBudget, rawPrevBudget, rawFixed, rawExpenses, rawPrevExpenses, rawCategories, rawSalaryProfile, rawAllBudgets, user, mounted]);

  const totals = useMemo(() => {
    const budget = decryptedBudget?.totalBudgetAmount || 0;
    const fixed = (decryptedFixed || []).filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0);
    const daily = (decryptedExpenses || []).reduce((s, e) => s + e.amount, 0);
    const spent = fixed + daily;
    const remaining = budget - spent;

    const prevDaily = (decryptedPrevExpenses || []).reduce((s, e) => s + e.amount, 0);
    const prevBudget = decryptedPrevBudget?.totalBudgetAmount || 0;

    return {
      budget,
      fixed,
      daily,
      spent,
      remaining,
      prevDaily,
      prevBudget,
      dailyDiff: daily - prevDaily,
      budgetDiff: budget - prevBudget
    };
  }, [decryptedBudget, decryptedFixed, decryptedExpenses, decryptedPrevExpenses, decryptedPrevBudget]);

  const allocationReport = useMemo(() => {
    if (!decryptedSalaryProfile || !decryptedFixed || !decryptedExpenses) return null;

    const salary = decryptedSalaryProfile.salary || 0;
    const buckets = [
      { id: 'expense', label: 'Expenses', percent: decryptedSalaryProfile.expensePercent || 50 },
      { id: 'savings', label: 'Savings', percent: decryptedSalaryProfile.savingsPercent || 20 },
      { id: 'investment', label: 'Investments', percent: decryptedSalaryProfile.investmentPercent || 20 },
      { id: 'health', label: 'Health', percent: decryptedSalaryProfile.healthPercent || 5 },
      { id: 'personal', label: 'Personal', percent: decryptedSalaryProfile.personalPercent || 5 },
    ];

    return buckets.map(b => {
      const target = (salary * (b.percent / 100));
      const fixedSpent = decryptedFixed.filter(f => f.allocationBucket === b.id).reduce((s, f) => s + f.amount, 0);
      const dailySpent = decryptedExpenses.filter(e => (e.allocationBucket || 'expense') === b.id).reduce((s, e) => s + e.amount, 0);
      const totalSpent = fixedSpent + dailySpent;
      const utilization = target > 0 ? (totalSpent / target) * 100 : 0;

      return {
        ...b,
        target,
        spent: totalSpent,
        utilization,
        remaining: target - totalSpent
      };
    });
  }, [decryptedSalaryProfile, decryptedFixed, decryptedExpenses]);

  const auditTotal = useMemo(() => {
    return (decryptedExpenses || [])
      .filter(exp => selectedTransactionIds.has(exp.id))
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [decryptedExpenses, selectedTransactionIds]);

  const auditExpenses = useMemo(() => {
    return (decryptedExpenses || [])
      .filter(exp => selectedAuditCategories.has(exp.expenseCategoryId || 'misc'))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [decryptedExpenses, selectedAuditCategories]);

  const weeklyReport = useMemo(() => {
    if (!decryptedExpenses) return { currentWeekSpent: 0, lastWeekSpent: 0, weeklyData: [] };

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

    const weeklyData = weeks.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart);
      const spent = decryptedExpenses
        .filter(exp => {
          const d = new Date(exp.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        name: `Week ${idx + 1}`,
        spent,
        range: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
      };
    });

    const today = new Date();
    const isSelectedMonthCurrent = format(selectedDate, 'yyyyMM') === format(today, 'yyyyMM');
    
    let currentWeekSpent = 0;
    let lastWeekSpent = 0;

    if (isSelectedMonthCurrent) {
       currentWeekSpent = decryptedExpenses
        .filter(exp => isSameWeek(new Date(exp.date), today))
        .reduce((sum, exp) => sum + exp.amount, 0);
       
       lastWeekSpent = decryptedExpenses
        .filter(exp => isSameWeek(new Date(exp.date), subWeeks(today, 1)))
        .reduce((sum, exp) => sum + exp.amount, 0);
    } else {
      const lastWeek = weeklyData[weeklyData.length - 1];
      const prevWeek = weeklyData[weeklyData.length - 2];
      currentWeekSpent = lastWeek?.spent || 0;
      lastWeekSpent = prevWeek?.spent || 0;
    }

    return { currentWeekSpent, lastWeekSpent, weeklyData };
  }, [decryptedExpenses, selectedDate]);

  const chartsData = useMemo(() => {
    if (!decryptedExpenses) {
      return { spendingData: [], categoryData: [] };
    }

    const categoryTotals: Record<string, number> = {};
    decryptedExpenses.forEach(exp => {
      const catName = decryptedCategories?.find(c => c.id === exp.expenseCategoryId)?.name || 'Misc';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + exp.amount;
    });

    const cData = Object.entries(categoryTotals).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    let sData: any[] = [];

    if (viewType === 'weekly') {
      sData = weeklyReport.weeklyData.map(w => ({
        name: w.name,
        spent: w.spent,
        fullLabel: w.range
      }));
    } else if (viewType === 'monthly') {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const dailyExpensesMap: Record<string, number> = {};
      decryptedExpenses.forEach(exp => {
        dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
      });

      sData = days
        .map(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          return {
            name: format(d, 'dd MMM'),
            spent: dailyExpensesMap[dStr] || 0,
          };
        });
    } else if (viewType === 'annual') {
      const yearStart = startOfYear(selectedDate);
      const yearEnd = endOfYear(selectedDate);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const budgetMap: Record<string, any> = {};
      (decryptedAllBudgets || []).forEach(b => {
        budgetMap[b.id] = b;
      });

      sData = months.map(m => {
        const mKey = format(m, 'yyyyMM');
        const b = budgetMap[mKey];
        return {
          name: format(m, 'MMM'),
          spent: (b?.actualSpent || 0) + (b?.actualFixedSpent || 0),
          budgeted: b?.totalBudgetAmount || 0,
          fullLabel: format(m, 'MMMM yyyy')
        };
      });
    }

    const activeEntries = sData.filter(d => d.spent > 0);
    const spentValues = activeEntries.map(d => d.spent);
    const maxSpent = spentValues.length > 0 ? Math.max(...spentValues) : -1;
    const minSpent = spentValues.length > 0 ? Math.min(...spentValues) : -1;
    const hasVariation = activeEntries.length > 1 && maxSpent !== minSpent;

    sData = sData.map(d => ({
      ...d,
      fill: (hasVariation && d.spent === maxSpent && d.spent > 0)
        ? "hsl(var(--destructive))"
        : (hasVariation && d.spent === minSpent && d.spent > 0)
          ? "hsl(var(--secondary))"
          : "hsl(var(--primary))"
    }));

    return { spendingData: sData, categoryData: cData };
  }, [decryptedExpenses, decryptedCategories, decryptedAllBudgets, selectedDate, viewType, weeklyReport]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => subMonths(prev, -delta));
  };

  const toggleAuditCategory = (catId: string) => {
    const nextCats = new Set(selectedAuditCategories);
    const nextTxns = new Set(selectedTransactionIds);
    const isAdding = !nextCats.has(catId);
    if (isAdding) {
      nextCats.add(catId);
      decryptedExpenses.filter(e => (e.expenseCategoryId || 'misc') === catId).forEach(e => nextTxns.add(e.id));
    } else {
      nextCats.delete(catId);
      decryptedExpenses.filter(e => (e.expenseCategoryId || 'misc') === catId).forEach(e => nextTxns.delete(e.id));
    }
    setSelectedAuditCategories(nextCats);
    setSelectedTransactionIds(nextTxns);
  };

  const toggleTransaction = (txnId: string) => {
    const next = new Set(selectedTransactionIds);
    if (next.has(txnId)) next.delete(txnId);
    else next.add(txnId);
    setSelectedTransactionIds(next);
  };

  const handleToggleAll = (checked: any) => {
    if (checked === true) {
      const allCatIds = new Set(decryptedCategories.map(c => c.id).concat(['misc']));
      const allTxnIds = new Set(decryptedExpenses.map(e => e.id));
      setSelectedAuditCategories(allCatIds);
      setSelectedTransactionIds(allTxnIds);
    } else {
      setSelectedAuditCategories(new Set());
      setSelectedTransactionIds(new Set());
    }
  };

  if (!mounted || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Vault...</p>
        </div>
      </AppShell>
    );
  }

  const weekDiff = weeklyReport.currentWeekSpent - weeklyReport.lastWeekSpent;

  return (
    <AppShell>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 md:p-4 rounded-2xl shadow-sm border">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg md:text-2xl font-black tracking-tight leading-tight">{format(selectedDate, 'MMMM yyyy')}</h2>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Reporting Period</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <Button variant="outline" size="sm" onClick={() => setIsAuditModalOpen(true)} className="h-8 md:h-9 px-2 md:px-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20">
              <History className="h-3.5 w-3.5" /> Tranc History
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="h-8 md:h-9 px-2 md:px-3 flex-1 md:flex-initial text-[10px] md:text-xs">
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5 md:mr-1" /> {format(prevDate, 'MMM')}
            </Button>
            <Button variant="secondary" size="sm" disabled className="h-8 md:h-9 font-bold px-3 md:px-6 flex-1 md:flex-initial whitespace-nowrap text-[10px] md:text-xs">
              Current
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => changeMonth(1)} 
              disabled={format(selectedDate, 'yyyyMM') === format(new Date(), 'yyyyMM')}
              className="h-8 md:h-9 px-2 md:px-3 flex-1 md:flex-initial text-[10px] md:text-xs"
            >
              {format(subMonths(selectedDate, -1), 'MMM')} <ChevronRight className="h-3.5 w-3.5 ml-0.5 md:ml-1" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md border-t-4 border-t-primary rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                <TableProperties className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Monthly Tally
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start text-xs md:sm">
                  <div className="flex flex-col">
                    <span className="text-foreground font-black uppercase text-[10px] tracking-tight">Monthly Pool</span>
                    <span className="text-muted-foreground text-[9px] font-medium leading-tight">Total target budget for this period</span>
                  </div>
                  <span className="font-black text-lg tracking-tighter">₹{totals.budget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start text-xs md:sm">
                  <div className="flex flex-col">
                    <span className="text-foreground font-black uppercase text-[10px] tracking-tight">Fixed Vault</span>
                    <span className="text-muted-foreground text-[9px] font-medium leading-tight">Scheduled non-negotiable costs</span>
                  </div>
                  <span className="font-bold text-destructive">₹{totals.fixed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start text-xs md:sm">
                  <div className="flex flex-col">
                    <span className="text-foreground font-black uppercase text-[10px] tracking-tight">Daily Spends</span>
                    <span className="text-muted-foreground text-[9px] font-medium leading-tight">Cumulative records for variable labels</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold">₹{totals.daily.toLocaleString()}</span>
                    {totals.dailyDiff !== 0 && (
                      <span className={cn(
                        "text-[8px] md:text-[10px] font-bold flex items-center gap-0.5",
                        totals.dailyDiff > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                      )}>
                        {totals.dailyDiff > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        ₹{Math.abs(totals.dailyDiff).toLocaleString()} vs {format(prevDate, 'MMM')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="pt-1 md:pt-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Remaining Vault</p>
                  <p className="text-[9px] text-muted-foreground font-medium mb-1">Funds available before exhaustion</p>
                  <p className={cn(
                    "text-3xl md:text-4xl font-black tracking-tighter leading-none",
                    totals.remaining >= 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    ₹{totals.remaining.toLocaleString()}
                  </p>
                </div>
                <div className={cn(
                  "p-3 md:p-4 rounded-2xl shadow-inner",
                  totals.remaining >= 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                )}>
                  {totals.remaining >= 0 ? <TrendingUp className="h-6 w-6 md:h-8 md:w-8" /> : <TrendingDown className="h-6 w-6 md:h-8 md:w-8" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md lg:col-span-1 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                Weekly Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="h-[80px] md:h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={weeklyReport.weeklyData}>
                    <Bar dataKey="spent" fill="#FFB74D" radius={[2, 2, 0, 0]} />
                    <Tooltip 
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number) => `₹${v.toLocaleString()}`}
                      labelClassName="text-[10px] font-bold text-popover-foreground"
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
              <div className="pt-1 md:pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground">Current Week</span>
                  <span className="text-xs md:text-sm font-black">₹{weeklyReport.currentWeekSpent.toLocaleString()}</span>
                </div>
                {weeklyReport.lastWeekSpent > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground">Vs. Last Week</span>
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-bold flex items-center",
                      weekDiff > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                    )}>
                      {weekDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      ₹{Math.abs(weekDiff).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-orange-50/50 dark:bg-orange-950/20 py-2 border-t px-4">
              <p className="text-[9px] font-bold text-orange-700 dark:text-orange-400 mx-auto uppercase tracking-tighter">
                {weekDiff > 0 ? "Weekly spend trending up" : weekDiff < 0 ? "Spending less this week" : "Stable weekly pace"}
              </p>
            </CardFooter>
          </Card>

          <Card 
            className="shadow-md lg:col-span-1 rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group"
            onClick={() => setIsAuditModalOpen(true)}
          >
            <CardHeader className="pb-2 pt-4 px-4 md:px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
                Categories
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent className="h-[180px] md:h-[200px] p-0 flex items-center justify-center relative">
              {chartsData.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartsData.categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={chartTooltipStyle}
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-xs italic py-10">
                  No categorical data.
                </div>
              )}
              <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest bg-background/80 backdrop-blur-sm mx-auto w-fit px-2 py-0.5 rounded-full shadow-sm">Click to Audit Spends</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md lg:col-span-1 bg-muted/10 border-dashed border-2 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Minus className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 pt-2 md:pt-4 p-4 md:p-6">
              <div className="p-3 bg-card rounded-xl border shadow-sm">
                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1">Monthly Spend</p>
                <div className="flex items-center gap-1">
                  <span className="text-base md:text-lg font-black tracking-tighter">₹{totals.daily.toLocaleString()}</span>
                  {totals.dailyDiff !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold",
                      totals.dailyDiff > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                    )}>
                      {totals.dailyDiff > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/20">
                <p className="text-[9px] md:text-[10px] font-black text-foreground leading-snug tracking-tight">
                  {totals.dailyDiff > 0 
                    ? `Increased by ₹${Math.abs(totals.dailyDiff).toLocaleString()} vs ${format(prevDate, 'MMM')}.` 
                    : totals.dailyDiff < 0 
                    ? `Saved ₹${Math.abs(totals.dailyDiff).toLocaleString()} vs ${format(prevDate, 'MMM')}.`
                    : `Spending is exactly same as last month.`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                   <ShieldCheck className="h-3 w-3 text-green-600" />
                   <span className="text-[8px] font-black uppercase text-green-600">Secure Vault Data</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-4 shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4 md:py-5 px-5 md:px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl font-black flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Strategic Income Allocation
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-tight opacity-70">Wealth strategy utilization for {format(selectedDate, 'MMMM')}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase px-3 py-1">
                Strategic Health
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              {!allocationReport ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50 grayscale">
                  <Target className="h-12 w-12 text-muted-foreground" />
                  <p className="text-xs font-black uppercase tracking-widest">No strategic profile linked</p>
                  <Button variant="outline" asChild className="rounded-xl h-9 text-[10px] font-black uppercase">
                    <a href="/salary-planner">Configure Strategy</a>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                  {allocationReport.map(pillar => {
                    const Config = PILLAR_ICONS[pillar.id];
                    const Icon = Config.icon;
                    const isOverspent = pillar.utilization > 100;
                    
                    return (
                      <div key={pillar.id} className="space-y-4 p-4 rounded-3xl border bg-muted/5 transition-all hover:bg-muted/10 group">
                        <div className="flex items-center justify-between">
                          <div className={cn("p-2 rounded-xl text-white shadow-md transition-transform group-hover:scale-110", Config.bg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <Badge variant={isOverspent ? "destructive" : "secondary"} className="text-[8px] font-black uppercase">
                            {Math.round(pillar.utilization)}% Utilized
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{pillar.label}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black tracking-tighter">₹{Math.round(pillar.spent).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-muted-foreground opacity-60">/ ₹{Math.round(pillar.target).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Progress value={Math.min(100, pillar.utilization)} className={cn("h-1.5", isOverspent ? "bg-destructive/20" : "bg-muted")} />
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter">
                            <span className={cn(isOverspent ? "text-destructive" : "text-muted-foreground")}>
                              {isOverspent ? "Allocation Exceeded" : "Strategy Capacity"}
                            </span>
                            <span className={cn(pillar.remaining >= 0 ? "text-primary" : "text-destructive")}>
                              {pillar.remaining >= 0 ? `₹${Math.round(pillar.remaining).toLocaleString()} Free` : `₹${Math.abs(Math.round(pillar.remaining)).toLocaleString()} Over`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-4 shadow-md overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 pt-4">
              <div>
                <CardTitle className="text-base md:text-lg font-black">Spending Tracker</CardTitle>
                <CardDescription className="text-[9px] md:text-[10px] uppercase font-bold tracking-tight">Visualizing your spending trends over time.</CardDescription>
              </div>
              <Tabs value={viewType} onValueChange={(v: any) => setViewType(v)} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-[300px] h-8 p-1">
                  <TabsTrigger value="weekly" className="text-[10px] font-bold">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-[10px] font-bold">Monthly</TabsTrigger>
                  <TabsTrigger value="annual" className="text-[10px] font-bold">Annual</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="h-[250px] md:h-[400px] pt-4 -ml-4 md:ml-0 p-4 md:p-6">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartsData.spendingData} margin={{ left: -10, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} stroke="hsl(var(--muted-foreground))" />
                  <XAxis dataKey="name" fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                  <YAxis fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                  <Tooltip 
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number, name: string, props: any) => [
                      `₹${value.toLocaleString()}`, 
                      props.payload.fullLabel || props.payload.name
                    ]} 
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar dataKey="spent" radius={[4, 4, 0, 0]} name="Actual Spend" animationDuration={1000}>
                    {chartsData.spendingData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  {viewType === 'annual' && (
                    <Bar dataKey="budgeted" radius={[4, 4, 0, 0]} name="Target Budget" fill="hsl(var(--muted))" fillOpacity={0.3} animationDuration={1000} />
                  )}
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-[98vw] md:max-w-6xl rounded-none md:rounded-2xl p-0 overflow-hidden border shadow-2xl h-[95vh] md:h-[90vh] flex flex-col">
          <div className="bg-primary p-4 sm:p-6 text-primary-foreground relative shrink-0">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                <CheckSquare className="h-6 w-6" />
                Category Audit
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
                Perform manual spend reconciliation and detailed transactional review
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-background">
            {/* Sidebar: Categories */}
            <div className="w-full md:w-1/3 border-r flex flex-col bg-muted/5">
              <div className="p-4 border-b bg-muted/10 flex items-center justify-between shrink-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Labels to Tally</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="audit-select-all" 
                      checked={decryptedExpenses.length > 0 && selectedTransactionIds.size === decryptedExpenses.length}
                      onCheckedChange={handleToggleAll}
                      className="h-4 w-4 rounded border-primary/30"
                    />
                    <label htmlFor="audit-select-all" className="text-[10px] font-black uppercase text-primary cursor-pointer hover:opacity-80">All</label>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 grid gap-3">
                  {chartsData.categoryData.length > 0 ? chartsData.categoryData.map((cat: any) => {
                    const catId = decryptedCategories.find(c => c.name === cat.name)?.id || 'misc';
                    const isChecked = selectedAuditCategories.has(catId);
                    const txnsCount = decryptedExpenses.filter(e => (e.expenseCategoryId || 'misc') === catId).length;
                    
                    return (
                      <div 
                        key={catId} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md",
                          isChecked 
                            ? "bg-primary/[0.04] border-primary/30 ring-1 ring-primary/10 shadow-sm" 
                            : "bg-card border-border opacity-70 hover:opacity-100"
                        )}
                        onClick={() => toggleAuditCategory(catId)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Checkbox 
                              id={`audit-${catId}`}
                              checked={isChecked} 
                              onCheckedChange={() => toggleAuditCategory(catId)}
                              className="rounded-lg h-5 w-5 border-2"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <label htmlFor={`audit-${catId}`} className="text-[11px] font-black uppercase cursor-pointer truncate max-w-[120px] tracking-tight">{cat.name}</label>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{txnsCount} Line Items</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black tracking-tight">₹{cat.value.toLocaleString()}</span>
                          <div className="h-1 w-full bg-muted rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (cat.value / (totals.daily || 1)) * 100)}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale space-y-3">
                      <BarChartIcon className="h-10 w-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No labels recorded</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main Content: Transactions */}
            <div className="flex-1 flex flex-col min-h-0 bg-background">
              <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0 px-6">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <ReceiptText className="h-3.5 w-3.5 text-primary" />
                  Line Item Ledger
                </p>
                <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 border-primary/20 text-primary px-3 py-0.5">{auditExpenses.length} Records Found</Badge>
              </div>
              
              <ScrollArea className="flex-1 flex flex-col bg-muted/[0.02]">
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  {auditExpenses.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {auditExpenses.map((exp) => (
                        <div 
                          key={exp.id} 
                          className={cn(
                            "flex justify-between items-center p-5 rounded-2xl bg-card border shadow-sm group transition-all cursor-pointer relative overflow-hidden",
                            selectedTransactionIds.has(exp.id) 
                              ? "border-primary/40 ring-1 ring-primary/10" 
                              : "opacity-40 grayscale border-transparent hover:opacity-60"
                          )}
                          onClick={() => toggleTransaction(exp.id)}
                        >
                          <div className="flex items-center gap-5 min-w-0 flex-1 relative z-10">
                            <Checkbox 
                              checked={selectedTransactionIds.has(exp.id)} 
                              onCheckedChange={() => toggleTransaction(exp.id)}
                              className="rounded-lg h-5 w-5 border-2 shadow-inner"
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[13px] font-black truncate tracking-tight text-foreground">{exp.description || 'Secured Item'}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg border">
                                  {format(new Date(exp.date), 'dd MMM yyyy')}
                                </span>
                                <span className="text-[8px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black uppercase border border-primary/10 shadow-sm">
                                  {decryptedCategories.find(c => c.id === exp.expenseCategoryId)?.name || 'Misc'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4 relative z-10">
                            <span className={cn(
                              "text-lg font-black tracking-tighter", 
                              selectedTransactionIds.has(exp.id) ? "text-foreground" : "text-muted-foreground line-through"
                            )}>
                              ₹{exp.amount.toLocaleString()}
                            </span>
                          </div>
                          {selectedTransactionIds.has(exp.id) && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/30" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-6">
                      <div className="relative">
                        <div className="absolute -inset-6 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                        <div className="relative p-8 bg-card rounded-3xl border-2 border-dashed shadow-2xl">
                          <ReceiptText className="h-16 w-16 text-primary/30" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-black uppercase tracking-widest text-foreground">Ledger Selection Required</h3>
                        <p className="text-[11px] font-medium text-muted-foreground max-w-[240px] leading-relaxed mx-auto italic">
                          Choose labels from the tally sidebar to perform detailed transactional analysis.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Summary Footer for the main pane */}
              <div className="p-4 sm:p-6 border-t bg-card shrink-0 flex flex-row items-center justify-between shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] relative z-20">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">Total</span>
                  <p className="text-[10px] font-black text-foreground uppercase tracking-tight">Audit Workspace Sum</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-primary/[0.03] px-6 py-3 rounded-2xl border border-dashed border-primary/20 flex flex-row items-center gap-6 relative overflow-hidden group shadow-inner min-w-[220px] transition-all hover:bg-primary/[0.06]">
                    <div className="relative z-10">
                      <p className="text-3xl font-black text-primary tracking-tighter leading-none">₹{auditTotal.toLocaleString()}</p>
                    </div>
                    <div className="text-right relative z-10 border-l border-primary/10 pl-4">
                      <Badge className="bg-primary text-white font-black text-[9px] uppercase px-2.5 py-1 rounded-xl border-none shadow-lg">
                        {selectedTransactionIds.size} Verified
                      </Badge>
                    </div>
                    <TrendingDown className="absolute top-1/2 -right-4 -translate-y-1/2 h-16 w-16 text-primary/[0.04] -rotate-12 pointer-events-none transition-transform group-hover:scale-110" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 bg-muted/10 border-t flex justify-end shrink-0 gap-3">
            <Button onClick={() => setIsAuditModalOpen(false)} variant="outline" className="font-black rounded-2xl text-[11px] uppercase h-12 px-10 bg-background shadow-md border-primary/10 hover:bg-muted/5 transition-all">Close Audit Workspace</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
