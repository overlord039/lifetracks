
"use client";

import React, { useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format } from 'date-fns';
import { collection, doc } from 'firebase/firestore';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  BookOpen,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
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

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'learningGoals');
  }, [firestore, user]);
  const { data: learningGoals } = useCollection(goalsQuery);

  const diaryRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [firestore, user, todayStr]);
  const { data: todayDiary } = useDoc(diaryRef);

  // Smart Rolling Budget Calculations
  const budgetReport = useMemo(() => {
    if (!monthlyBudgetDoc || !monthExpenses) return null;

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

    return calculateRollingBudget(config, dailyExpensesMap, []);
  }, [monthlyBudgetDoc, monthExpenses, fixedExpenses, now]);

  const todayReport = budgetReport?.[todayStr];
  const allowedToday = todayReport?.allowedBudget || 0;
  const spentToday = todayReport?.spent || 0;
  const remaining = Math.max(0, allowedToday - spentToday);

  const goalsProgress = learningGoals?.length ? Math.round((learningGoals.filter(g => (g.completedCount || 0) >= (g.target || 0)).length / learningGoals.length) * 100) : 0;

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md border-b-4 border-b-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">Allowed Today</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹{allowedToday.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Including carry-forward balance</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">Spent Today</CardTitle>
            <TrendingUp className="w-4 h-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹{spentToday.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {spentToday > allowedToday ? "Exceeding daily target" : "Within sustainable limits"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">Goal Progress</CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{goalsProgress}%</div>
            <Progress value={goalsProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">Diary Entry</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {todayDiary ? <CheckCircle2 className="w-6 h-6 text-secondary-foreground" /> : <AlertCircle className="w-6 h-6 text-destructive" />}
              <div className="text-lg font-black">{todayDiary ? "Complete" : "Pending"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card className="shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle>Budget Insights</CardTitle>
            <CardDescription>Real-time sustainability check.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${remaining > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${remaining > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {remaining > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Remaining Today</p>
                  <p className="text-2xl font-black">₹{remaining.toFixed(0)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Daily Base Allocation:</span>
                <span className="font-bold">₹{todayReport?.baseBudget.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Carry-Forward Adjustment:</span>
                <span className={`font-bold ${(todayReport?.carryForwardFromYesterday || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(todayReport?.carryForwardFromYesterday || 0) >= 0 ? '+' : ''}₹{todayReport?.carryForwardFromYesterday.toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Learning Mastery</CardTitle>
            <CardDescription>Tracking your active goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {learningGoals?.length ? learningGoals.map((goal) => {
              const p = Math.min(100, Math.round(((goal.completedCount || 0) / (goal.target || 1)) * 100));
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{goal.skill}</span>
                    <span className="text-muted-foreground">{p}%</span>
                  </div>
                  <Progress value={p} className="h-1.5" />
                </div>
              );
            }) : <p className="text-xs italic text-muted-foreground">No goals active.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
