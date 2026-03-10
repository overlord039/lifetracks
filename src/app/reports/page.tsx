
"use client";

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, parse, isValid } from 'date-fns';
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
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Wallet, 
  Banknote, 
  ShoppingCart, 
  PiggyBank, 
  TableProperties,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // State for selected month
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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

  // --- Previous Month Data (for comparison) ---
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

  // --- Calculations ---
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

  // --- Prepare Chart Data ---
  const chartsData = useMemo(() => {
    if (!monthlyBudgetDoc || !monthExpenses) {
      return { spendingData: [], categoryData: [] };
    }

    const dailyExpensesMap: Record<string, number> = {};
    monthExpenses.forEach(exp => {
      dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
    });

    const config: MonthlyConfig = {
      totalBudget: monthlyBudgetDoc.totalBudgetAmount || 0,
      month: selectedDate.getMonth(),
      year: selectedDate.getFullYear(),
      fixedExpenses: (fixedExpenses || []).map(f => ({
        id: f.id,
        name: f.name,
        amount: f.amount,
        included: f.includeInBudget
      })),
      saturdayExtra: monthlyBudgetDoc.saturdayExtraAmount || 0,
      sundayExtra: monthlyBudgetDoc.sundayExtraAmount || 0,
      holidayExtra: 0,
      isWeekendEnabled: monthlyBudgetDoc.isWeekendExtraBudgetEnabled || false,
      isHolidayEnabled: false
    };

    const rollingReports = calculateRollingBudget(config, dailyExpensesMap, []);
    
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const sData = days.map(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const r = rollingReports[dStr];
      return {
        name: format(d, 'dd MMM'),
        spent: r?.spent || 0,
        budget: Math.max(0, r?.allowedBudget || 0),
        rawBudget: r?.allowedBudget || 0
      };
    });

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

    return { spendingData: sData, categoryData: cData };
  }, [monthlyBudgetDoc, monthExpenses, fixedExpenses, categories, selectedDate]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => subMonths(prev, -delta));
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Month Selector Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{format(selectedDate, 'MMMM yyyy')}</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Reporting Period</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="h-9 px-3">
              <ChevronLeft className="h-4 w-4 mr-1" /> {format(prevDate, 'MMM')}
            </Button>
            <Button variant="secondary" size="sm" disabled className="h-9 font-bold px-6">
              Current Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => changeMonth(1)} 
              disabled={format(selectedDate, 'yyyyMM') === format(new Date(), 'yyyyMM')}
              className="h-9 px-3"
            >
              {format(subMonths(selectedDate, -1), 'MMM')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Main Tally Report */}
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
                    "text-3xl font-black",
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
            <CardFooter className="bg-muted/30 py-3 flex justify-center border-t">
              <span className={cn(
                "text-[10px] font-bold uppercase px-3 py-1 rounded-full",
                totals.remaining >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {totals.remaining >= 0 ? 'Surplus' : 'Deficit'} Detected
              </span>
            </CardFooter>
          </Card>

          {/* Comparison Stats */}
          <Card className="shadow-md lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-secondary-foreground" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] p-0">
              {chartsData.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartsData.categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                  No categorical data found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparison Summary */}
          <Card className="shadow-md lg:col-span-1 bg-muted/10 border-dashed border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Minus className="h-5 w-5 text-muted-foreground" />
                Vs. Previous Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Budget Set</p>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-black">₹{totals.budget.toLocaleString()}</span>
                    {totals.budgetDiff !== 0 && (
                      <span className={cn(
                        "text-[10px] font-bold",
                        totals.budgetDiff > 0 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {totals.budgetDiff > 0 ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Daily Spend</p>
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
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {totals.dailyDiff > 0 
                    ? `Your daily spending has increased by ₹${Math.abs(totals.dailyDiff).toLocaleString()} compared to ${format(prevDate, 'MMMM')}. Consider reviewing your new "Smart Logger" entries.` 
                    : totals.dailyDiff < 0 
                    ? `Great job! You spent ₹${Math.abs(totals.dailyDiff).toLocaleString()} less on daily expenses than you did in ${format(prevDate, 'MMMM')}.`
                    : `Your daily spending is exactly the same as last month. Consistent!`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Daily Spending Chart */}
          <Card className="md:col-span-2 lg:col-span-3 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Daily Spending vs Dynamic Allowance</CardTitle>
              <CardDescription>Track how your actual spend aligns with daily targets.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData.spendingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Actual Spend" />
                  <Bar dataKey="budget" fill="hsl(var(--primary)/20%)" stroke="hsl(var(--primary))" strokeDasharray="5 5" name="Allowed Budget" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
