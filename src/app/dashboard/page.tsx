
"use client";

import React, { useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { collection, doc } from 'firebase/firestore';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const monthId = format(now, 'yyyyMM');

  // 1. Fetch Monthly Budget Settings
  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [firestore, user, monthId]);
  const { data: monthlyBudgetDoc } = useDoc(monthlyBudgetRef);

  // 2. Fetch Fixed Expenses
  const fixedExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [firestore, user, monthId]);
  const { data: fixedExpenses } = useCollection(fixedExpensesRef);

  // 3. Fetch All Expenses for the Month
  const monthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [firestore, user, monthId]);
  const { data: monthExpenses } = useCollection(monthExpensesRef);

  // 4. Fetch Learning Goals
  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'learningGoals');
  }, [firestore, user]);
  const { data: learningGoals } = useCollection(goalsQuery);

  // 5. Fetch Today's Diary Entry
  const diaryRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [firestore, user, todayStr]);
  const { data: todayDiary } = useDoc(diaryRef);

  // Sustainable Calculations
  const { allowedToday, spentToday } = useMemo(() => {
    if (!monthlyBudgetDoc || !monthExpenses) {
      return { allowedToday: 0, spentToday: 0 };
    }

    const totalBudget = monthlyBudgetDoc.totalBudgetAmount || 0;
    const totalFixed = fixedExpenses?.filter(f => f.includeInBudget).reduce((s, f) => s + f.amount, 0) || 0;
    const totalSpentBeforeToday = monthExpenses.filter(e => e.date < todayStr).reduce((s, e) => s + e.amount, 0) || 0;
    const spentTodayValue = monthExpenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0) || 0;

    const netMonthlyPool = Math.max(0, totalBudget - totalFixed);
    const remainingBudgetPool = Math.max(0, netMonthlyPool - totalSpentBeforeToday);
    
    const isWeekendEnabled = monthlyBudgetDoc.isWeekendExtraBudgetEnabled || false;
    const weekendMultiplier = 1.5;

    const remainingDaysInMonth = eachDayOfInterval({ start: now, end: endOfMonth(now) });
    let remainingWeight = 0;
    remainingDaysInMonth.forEach(d => {
      if (isWeekend(d) && isWeekendEnabled) {
        remainingWeight += weekendMultiplier;
      } else {
        remainingWeight += 1;
      }
    });

    const sustainableWeekdayRate = remainingWeight > 0 ? remainingBudgetPool / remainingWeight : 0;
    const todaySustainableAllowed = (isWeekend(now) && isWeekendEnabled) 
      ? sustainableWeekdayRate * weekendMultiplier 
      : sustainableWeekdayRate;

    return {
      allowedToday: todaySustainableAllowed,
      spentToday: spentTodayValue
    };
  }, [monthlyBudgetDoc, monthExpenses, fixedExpenses, todayStr, now]);

  const totalGoals = learningGoals?.length || 0;
  const completedGoals = learningGoals?.filter(g => (g.completedCount || 0) >= (g.target || 0)).length || 0;
  const goalsProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Quick Stats */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Daily Budget</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{allowedToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Sustainable limit for today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Spent Today</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{spentToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {spentToday > allowedToday ? "Exceeding daily plan" : "Within daily plan"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
            <BookOpen className="w-4 h-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goalsProgress}%</div>
            <Progress value={goalsProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Diary Status</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {todayDiary ? (
                <CheckCircle2 className="w-5 h-5 text-secondary" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <div className="text-lg font-bold">
                {todayDiary ? "Recorded" : "Missing Entry"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Today's Reflection</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Daily Insights</CardTitle>
            <CardDescription>Real-time view of your sustainable metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="bg-primary/20 p-2 rounded-full text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Budget Status</h4>
                  <p className="text-sm text-muted-foreground">
                    ₹{Math.max(0, allowedToday - spentToday).toFixed(2)} remaining for today.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Skill Progress</CardTitle>
            <CardDescription>Tracking mastery across your learning goals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningGoals?.length === 0 && <p className="text-sm text-muted-foreground">No active goals found.</p>}
              {learningGoals?.map((goal) => {
                const percent = Math.min(100, Math.round(((goal.completedCount || 0) / (goal.target || 1)) * 100));
                return (
                  <div key={goal.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{goal.skill} ({goal.difficulty})</span>
                      <span className="text-muted-foreground">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
