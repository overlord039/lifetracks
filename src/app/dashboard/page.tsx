"use client";

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
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
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayBudget: 0,
    spentToday: 0,
    learningProgress: 0,
    diaryCompleted: false,
    lastEntry: ''
  });

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Real app would fetch budget reports here
      // For demo, we'll set some placeholder values
      setStats({
        todayBudget: 45.50,
        spentToday: 12.00,
        learningProgress: 65,
        diaryCompleted: false,
        lastEntry: 'Yesterday at 9:00 PM'
      });
    };

    fetchSummary();
  }, [user]);

  const budgetPercent = (stats.spentToday / stats.todayBudget) * 100;

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
            <div className="text-2xl font-bold">${stats.todayBudget.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Allowed for today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Spent Today</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.spentToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.spentToday > stats.todayBudget ? "You've overspent!" : "Well within limits"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Learning Goal</CardTitle>
            <BookOpen className="w-4 h-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.learningProgress}%</div>
            <Progress value={stats.learningProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Diary Status</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.diaryCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-secondary" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <div className="text-lg font-bold">
                {stats.diaryCompleted ? "Recorded" : "Missing Entry"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Last: {stats.lastEntry}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>Here is what you have planned for today.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="bg-primary/20 p-2 rounded-full text-primary">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Interview Prep</h4>
                  <p className="text-sm text-muted-foreground">Python Easy (2/2) completed.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="bg-secondary/20 p-2 rounded-full text-secondary-foreground">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-foreground">Budget Savings</h4>
                  <p className="text-sm text-muted-foreground">You saved $33.50 so far this month!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Upcoming Learning</CardTitle>
            <CardDescription>Track your progress across skills.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['SQL - Medium', 'DSA - Hard', 'System Design'].map((skill, i) => (
                <div key={skill} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{skill}</span>
                    <span className="text-muted-foreground">{i * 20 + 30}%</span>
                  </div>
                  <Progress value={i * 20 + 30} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
