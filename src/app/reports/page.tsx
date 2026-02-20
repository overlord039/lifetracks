
"use client";

import React, { use, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
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
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';

export default function ReportsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  use(props.searchParams);
  const { user } = useUser();
  const firestore = useFirestore();
  const now = new Date();
  const monthId = format(now, 'yyyyMM');

  // Firestore Data
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

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'expenseCategories');
  }, [firestore, user]);
  const { data: categories } = useCollection(categoriesRef);

  // Prepare Chart Data
  const { spendingData, categoryData } = useMemo(() => {
    if (!monthlyBudgetDoc || !monthExpenses) {
      return { spendingData: [], categoryData: [] };
    }

    const dailyExpensesMap: Record<string, number> = {};
    monthExpenses.forEach(exp => {
      dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
    });

    const config: MonthlyConfig = {
      totalBudget: monthlyBudgetDoc.totalBudgetAmount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
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
    
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
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
  }, [monthlyBudgetDoc, monthExpenses, fixedExpenses, categories, now]);

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Daily Spending vs Dynamic Budget</CardTitle>
            <CardDescription>Visualizing your sustainable limits vs actual spend (₹).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => `₹${value.toFixed(0)}`} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                <Bar dataKey="spent" fill="#64B5F6" radius={[4, 4, 0, 0]} name="Actual Spend" />
                <Bar dataKey="budget" fill="#E3F2FD" stroke="#64B5F6" strokeDasharray="5 5" name="Allowed Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution of your monthly spending.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(0)}`} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                No expense data recorded.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Sustainability Trend</CardTitle>
            <CardDescription>How your daily limits are evolving over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(0)}`} />
                <Line type="monotone" dataKey="spent" stroke="#A5D6A7" strokeWidth={3} dot={{ fill: '#A5D6A7', r: 3 }} name="Spending" />
                <Line type="step" dataKey="rawBudget" stroke="#64B5F6" strokeWidth={2} strokeDasharray="4 4" name="Budget Limit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
