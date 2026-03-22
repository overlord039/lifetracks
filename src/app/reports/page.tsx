"use client";

import React, { useState, useMemo } from 'react';
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
  Activity
} from 'lucide-react';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // State for selected month and view type
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  
  const monthId = format(selectedDate, 'yyyyMM');
  const prevDate = subMonths(selectedDate, 1);
  const prevMonthId = format(prevDate, 'yyyyMM');

  // --- Current Month Data ---
  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [firestore, user, monthId]);
  const { data: monthlyBudgetDoc } = useDoc(monthlyBudgetRef);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [firestore, user, monthId]);
  const { data: fixedExpenses } = useCollection(fixedExpensesRef);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [firestore, user, monthId]);
  const { data: monthExpenses } = useCollection(monthExpensesRef);

  // --- Previous Month Data ---
  const prevMonthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId);
  }, [firestore, user, prevMonthId]);
  const { data: prevMonthlyBudgetDoc } = useDoc(prevMonthlyBudgetRef);

  const prevMonthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId, 'expenses');
  }, [firestore, user, prevMonthId]);
  const { data: prevMonthExpenses } = useCollection(prevMonthExpensesRef);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'expenseCategories');
  }, [firestore, user]);
  const { data: categories } = useCollection(categoriesRef);

  // --- Totals ---
  const totals = useMemo(() => {
    const budget = monthlyBudgetDoc?.totalBudgetAmount || 0;
    const fixed = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
    const daily = monthExpenses?.reduce((s, e) => s + e.amount, 0) || 0;
    const spent = fixed + daily;
    const remaining = budget - spent;

    const prevDaily = prevMonthExpenses?.reduce((s, e) => s + e.amount, 0) || 0;
    const prevBudget = prevMonthlyBudgetDoc?.totalBudgetAmount || 0;

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
  }, [monthlyBudgetDoc, fixedExpenses, monthExpenses, prevMonthExpenses, prevMonthlyBudgetDoc]);

  // --- Weekly Analysis (Inside Month) ---
  const weeklyReport = useMemo(() => {
    if (!monthExpenses) return { currentWeekSpent: 0, lastWeekSpent: 0, weeklyData: [] };

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

    const weeklyData = weeks.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart);
      const spent = monthExpenses
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
       currentWeekSpent = monthExpenses
        .filter(exp => isSameWeek(new Date(exp.date), today))
        .reduce((sum, exp) => sum + exp.amount, 0);
       
       lastWeekSpent = monthExpenses
        .filter(exp => isSameWeek(new Date(exp.date), subWeeks(today, 1)))
        .reduce((sum, exp) => sum + exp.amount, 0);
    } else {
      const lastWeek = weeklyData[weeklyData.length - 1];
      const prevWeek = weeklyData[weeklyData.length - 2];
      currentWeekSpent = lastWeek?.spent || 0;
      lastWeekSpent = prevWeek?.spent || 0;
    }

    return { currentWeekSpent, lastWeekSpent, weeklyData };
  }, [monthExpenses, selectedDate]);

  // --- Prepare Chart Data based on View Type ---
  const chartsData = useMemo(() => {
    if (!monthExpenses) {
      return { spendingData: [], categoryData: [] };
    }

    // Category data remains mostly the same (filtered by month)
    const categoryTotals: Record<string, number> = {};
    monthExpenses.forEach(exp => {
      const catName = categories?.find(c => c.id === exp.expenseCategoryId)?.name || 'Misc';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + exp.amount;
    });

    const cData = Object.entries(categoryTotals).map(([name, value], idx) => ({
      name,
      value,
      color: [`#64B5F6`, `#A5D6A7`, `#FFB74D`, `#BA68C8`, `#F06292`][idx % 5]
    }));

    // Spending data depends on viewType
    let sData: any[] = [];
    const dailyExpensesMap: Record<string, number> = {};
    monthExpenses.forEach(exp => {
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
          spent: isCurrentMonth ? totals.daily : 0, // We only have data for the currently selected month in this context
          fullLabel: format(m, 'MMMM yyyy')
        };
      });
    }

    return { spendingData: sData, categoryData: cData };
  }, [monthExpenses, categories, selectedDate, viewType, weeklyReport, totals.daily]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => subMonths(prev, -delta));
  };

  const weekDiff = weeklyReport.currentWeekSpent - weeklyReport.lastWeekSpent;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl shadow-sm border">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">{format(selectedDate, 'MMMM yyyy')}</h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Reporting Period</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="h-9 px-3 flex-1 md:flex-initial">
              <ChevronLeft className="h-4 w-4 mr-1" /> {format(prevDate, 'MMM')}
            </Button>
            <Button variant="secondary" size="sm" disabled className="h-9 font-bold px-4 md:px-6 flex-1 md:flex-initial whitespace-nowrap">
              Current Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => changeMonth(1)} 
              disabled={format(selectedDate, 'yyyyMM') === format(new Date(), 'yyyyMM')}
              className="h-9 px-3 flex-1 md:flex-initial"
            >
              {format(subMonths(selectedDate, -1), 'MMM')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md border-t-4 border-t-primary lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TableProperties className="h-5 w-5 text-primary" />
                Monthly Tally
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Monthly Pool</span>
                  <span className="font-black">₹{totals.budget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Fixed Expenses</span>
                  <span className="font-bold text-destructive">₹{totals.fixed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Daily Spending</span>
                  <div className="flex flex-col items-end">
                    <span className="font-bold">₹{totals.daily.toLocaleString()}</span>
                    {totals.dailyDiff !== 0 && (
                      <span className={cn(
                        "text-[10px] font-bold flex items-center gap-0.5",
                        totals.dailyDiff > 0 ? "text-destructive" : "text-green-600"
                      )}>
                        {totals.dailyDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        ₹{Math.abs(totals.dailyDiff).toLocaleString()} from {format(prevDate, 'MMM')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remaining Balance</p>
                  <p className={cn(
                    "text-xl md:text-3xl font-black",
                    totals.remaining >= 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    ₹{totals.remaining.toLocaleString()}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl",
                  totals.remaining >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                  {totals.remaining >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Weekly Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyReport.weeklyData}>
                    <Bar dataKey="spent" fill="#FFB74D" radius={[2, 2, 0, 0]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                      formatter={(v: number) => `₹${v.toLocaleString()}`}
                      labelClassName="text-[10px] font-bold"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Week</span>
                  <span className="text-sm font-black">₹{weeklyReport.currentWeekSpent.toLocaleString()}</span>
                </div>
                {weeklyReport.lastWeekSpent > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Vs. Last Week</span>
                    <span className={cn(
                      "text-[10px] font-bold flex items-center",
                      weekDiff > 0 ? "text-destructive" : "text-green-600"
                    )}>
                      {weekDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      ₹{Math.abs(weekDiff).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-orange-50/50 dark:bg-orange-950/20 py-2 border-t">
              <p className="text-[10px] font-medium text-orange-700 dark:text-orange-400 mx-auto">
                {weekDiff > 0 ? "Weekly spend trending up" : weekDiff < 0 ? "Spending less this week" : "Stable weekly pace"}
              </p>
            </CardFooter>
          </Card>

          <Card className="shadow-md lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-secondary-foreground" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] p-0 flex items-center justify-center">
              {chartsData.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartsData.categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-xs italic">
                  No categorical data.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md lg:col-span-1 bg-muted/10 border-dashed border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Minus className="h-5 w-5 text-muted-foreground" />
                Vs. Prev Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-3 bg-card rounded-xl border shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Monthly Spend</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black">₹{totals.daily.toLocaleString()}</span>
                  {totals.dailyDiff !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold",
                      totals.dailyDiff > 0 ? "text-destructive" : "text-green-600"
                    )}>
                      {totals.dailyDiff > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/20">
                <p className="text-[10px] font-medium text-foreground leading-relaxed">
                  {totals.dailyDiff > 0 
                    ? `Increased by ₹${Math.abs(totals.dailyDiff).toLocaleString()} vs ${format(prevDate, 'MMM')}.` 
                    : totals.dailyDiff < 0 
                    ? `Saved ₹${Math.abs(totals.dailyDiff).toLocaleString()} vs ${format(prevDate, 'MMM')}.`
                    : `Same as last month.`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-4 shadow-md overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Spending Tracker</CardTitle>
                <CardDescription>Visualizing your spending trends over time.</CardDescription>
              </div>
              <Tabs value={viewType} onValueChange={(v: any) => setViewType(v)} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-[300px]">
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="annual">Annual</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="h-[300px] md:h-[400px] pt-4 -ml-4 md:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData.spendingData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number, name: string, props: any) => [
                      `₹${value.toLocaleString()}`, 
                      props.payload.fullLabel || props.payload.name
                    ]} 
                  />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Actual Spend" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
