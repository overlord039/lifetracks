
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
  subMonths,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  isSameWeek,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth
} from 'date-fns';
import { collection, doc } from 'firebase/firestore';
import { 
  BarChart, 
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
  Loader2
} from 'lucide-react';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { decryptData, decryptNumber } from '@/lib/encryption';

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [mounted, setMounted] = useState(false);

  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedPrevBudget, setDecryptedPrevBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedPrevExpenses, setDecryptedPrevExpenses] = useState<any[]>([]);
  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
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

  useEffect(() => {
    const decryptAll = async () => {
      if (!user || !mounted) return;
      setIsDecrypting(true);

      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
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
        })));
        setDecryptedFixed(fixed);
      }

      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          description: e.isEncrypted ? await decryptData(e.description, user.uid) : (e.description || ''),
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
        })));
        setDecryptedExpenses(exps);
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
      }

      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawBudget, rawPrevBudget, rawFixed, rawExpenses, rawPrevExpenses, rawCategories, user, mounted]);

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
      color: [`#64B5F6`, `#A5D6A7`, `#FFB74D`, `#BA68C8`, `#F06292`][idx % 5]
    }));

    let sData: any[] = [];
    const dailyExpensesMap: Record<string, number> = {};
    decryptedExpenses.forEach(exp => {
      dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
    });

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
      const today = new Date();

      sData = days
        .filter(d => d <= today || dailyExpensesMap[format(d, 'yyyy-MM-dd')])
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

      sData = months.map(m => {
        const isCurrentMonth = isSameMonth(m, selectedDate);
        return {
          name: format(m, 'MMM'),
          spent: isCurrentMonth ? totals.daily : 0,
          fullLabel: format(m, 'MMMM yyyy')
        };
      });
    }

    return { spendingData: sData, categoryData: cData };
  }, [decryptedExpenses, decryptedCategories, selectedDate, viewType, weeklyReport, totals.daily]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => subMonths(prev, -delta));
  };

  const weekDiff = weeklyReport.currentWeekSpent - weeklyReport.lastWeekSpent;

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

  // Common Tooltip Style for all charts
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

  return (
    <AppShell>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 md:p-4 rounded-2xl shadow-sm border">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black tracking-tight">{format(selectedDate, 'MMMM yyyy')}</h2>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Reporting Period</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
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
          <Card className="shadow-md border-t-4 border-t-primary lg:col-span-1 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                <TableProperties className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Monthly Tally
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground font-medium">Monthly Pool</span>
                  <span className="font-black">₹{totals.budget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground font-medium">Fixed Expenses</span>
                  <span className="font-bold text-destructive">₹{totals.fixed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-muted-foreground font-medium">Daily Spending</span>
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
                <div>
                  <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remaining Balance</p>
                  <p className={cn(
                    "text-xl md:text-3xl font-black tracking-tighter",
                    totals.remaining >= 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    ₹{totals.remaining.toLocaleString()}
                  </p>
                </div>
                <div className={cn(
                  "p-2 md:p-3 rounded-xl",
                  totals.remaining >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                  {totals.remaining >= 0 ? <TrendingUp className="h-5 w-5 md:h-6 md:w-6" /> : <TrendingDown className="h-5 w-5 md:h-6 md:w-6" />}
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
                  <BarChart data={weeklyReport.weeklyData}>
                    <Bar dataKey="spent" fill="#FFB74D" radius={[2, 2, 0, 0]} />
                    <Tooltip 
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number) => `₹${v.toLocaleString()}`}
                      labelClassName="text-[10px] font-bold text-popover-foreground"
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                  </BarChart>
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

          <Card className="shadow-md lg:col-span-1 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[180px] md:h-[200px] p-0 flex items-center justify-center">
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
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-4 shadow-md overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 pt-4">
              <div>
                <CardTitle className="text-base md:text-lg font-black">Spending Tracker</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight">Visualizing your spending trends over time.</CardDescription>
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
                <BarChart data={chartsData.spendingData} margin={{ left: -10, right: 10, bottom: 0 }}>
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
                  <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Actual Spend" animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
