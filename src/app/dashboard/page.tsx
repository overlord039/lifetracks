"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format } from 'date-fns';
import { collection, doc } from 'firebase/firestore';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen,
  DollarSign,
  TrendingDown,
  Loader2,
  ShieldCheck,
  HandCoins
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { decryptNumber } from '@/lib/encryption';

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  
  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedDebts, setDecryptedDebts] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = useMemo(() => new Date(), []);
  const todayStr = mounted ? format(now, 'yyyy-MM-dd') : '';
  const monthId = mounted ? format(now, 'yyyyMM') : '';

  const monthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user || !monthId) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', monthId);
  }, [firestore, user, monthId]);
  const { data: rawBudget } = useDoc(monthlyBudgetRef);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user || !monthId) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [firestore, user, monthId]);
  const { data: rawFixed } = useCollection(fixedExpensesRef);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user || !monthId) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [firestore, user, monthId]);
  const { data: rawExpenses } = useCollection(monthExpensesRef);

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'learningGoals');
  }, [firestore, user]);
  const { data: learningGoals } = useCollection(goalsQuery);

  const diaryRef = useMemoFirebase(() => {
    if (!firestore || !user || !todayStr) return null;
    return doc(firestore, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [firestore, user, todayStr]);
  const { data: todayDiary } = useDoc(diaryRef);

  const debtsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'debts');
  }, [firestore, user]);
  const { data: rawDebts } = useCollection(debtsRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!user || !mounted) return;
      setIsDecrypting(true);

      if (rawBudget) {
        setDecryptedBudget({
          ...rawBudget,
          totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
          saturdayExtraAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.saturdayExtraAmount, user.uid) : (rawBudget.saturdayExtraAmount || 0),
          sundayExtraAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.sundayExtraAmount, user.uid) : (rawBudget.sundayExtraAmount || 0),
          isWeekendExtraBudgetEnabled: rawBudget.isWeekendExtraBudgetEnabled ?? false,
        });
      }

      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
          includeInBudget: f.includeInBudget ?? true,
        })));
        setDecryptedFixed(fixed);
      }

      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
          date: e.date || '',
        })));
        setDecryptedExpenses(exps);
      }

      if (rawDebts) {
        const debts = await Promise.all(rawDebts.map(async d => ({
          ...d,
          amount: d.isEncrypted ? await decryptNumber(d.amount, user.uid) : (d.amount || 0),
        })));
        setDecryptedDebts(debts);
      }

      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawBudget, rawFixed, rawExpenses, rawDebts, user, mounted]);

  const budgetReport = useMemo(() => {
    if (!decryptedBudget || !mounted) return null;

    const dailyExpensesMap: Record<string, number> = {};
    (decryptedExpenses || []).forEach(exp => {
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
        included: f.includeInBudget
      })),
      saturdayExtra: decryptedBudget.saturdayExtraAmount || 0,
      sundayExtra: decryptedBudget.sundayExtraAmount || 0,
      holidayExtra: 0,
      isWeekendEnabled: decryptedBudget.isWeekendExtraBudgetEnabled || false,
      isHolidayEnabled: false
    };

    return calculateRollingBudget(config, dailyExpensesMap, []);
  }, [decryptedBudget, decryptedExpenses, decryptedFixed, now, mounted]);

  const todayReport = budgetReport?.[todayStr];
  
  const baseAllocation = todayReport?.baseBudget || 0;
  const spentToday = todayReport?.spent || 0;
  const rollingAllowance = (todayReport?.baseBudget || 0) + (todayReport?.extraBudget || 0) + (todayReport?.carryForwardFromYesterday || 0);
  const remaining = Math.max(0, rollingAllowance - spentToday);
  const baseRemaining = baseAllocation - spentToday;

  const goalsProgress = learningGoals?.length ? Math.round((learningGoals.filter(g => (g.completedCount || 0) >= (g.target || 0)).length / learningGoals.length) * 100) : 0;

  const totalOwed = useMemo(() => decryptedDebts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0, [decryptedDebts]);

  const isOverspent = spentToday > rollingAllowance;
  const isWithinBudget = spentToday <= rollingAllowance && spentToday > 0;

  const hasActiveGoals = !!(learningGoals && learningGoals.length > 0);

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

  return (
    <AppShell>
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard 
          href="/budget"
          title="Daily Allowance"
          value={`₹${baseAllocation.toFixed(0)}`}
          subtext="Base Allocation"
          icon={<DollarSign className="w-4 h-4" />}
          variant="primary"
        />

        <DashboardCard 
          href="/budget"
          title="Spent Today"
          value={`₹${spentToday.toFixed(0)}`}
          subtext={isOverspent ? "Above limit" : "Safe zone"}
          icon={<TrendingUp className="w-4 h-4" />}
          variant={isOverspent ? "destructive" : isWithinBudget ? "secondary" : "default"}
        />

        {totalOwed > 0 && (
          <DashboardCard 
            href="/debts"
            title="Debt Vault"
            value={`₹${totalOwed.toFixed(0)}`}
            subtext="Receivable total"
            icon={<HandCoins className="w-4 h-4" />}
            variant="default"
          />
        )}

        <DashboardCard 
          href="/learning"
          title="Skill Mastery"
          value={`${goalsProgress}%`}
          subtext="Completion rate"
          icon={<BookOpen className="w-4 h-4" />}
          progress={goalsProgress}
        />

        <DashboardCard 
          href="/diary"
          title="Daily Reflection"
          value={todayDiary ? "Logged" : "Pending"}
          subtext={todayDiary ? "Well done!" : "Record thoughts"}
          icon={todayDiary ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          variant={todayDiary ? "secondary" : "default"}
        />
      </div>

      <div className="grid gap-4 md:gap-6 mt-4 md:mt-6 lg:grid-cols-12">
        <div className={cn("space-y-4 md:space-y-6", hasActiveGoals ? "lg:col-span-7" : "lg:col-span-12")}>
          <Link href="/reports" className="block group">
            <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border group-hover:ring-primary/30 transition-all duration-300 rounded-2xl">
              <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Budget Insight
                </CardTitle>
                <CardDescription className="text-[9px] md:text-[10px] font-medium uppercase tracking-tight">Real-time performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className={cn(
                  "p-4 md:p-5 rounded-2xl border transition-all grid grid-cols-2 gap-4",
                  baseRemaining >= 0 
                    ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' 
                    : 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl shadow-sm",
                      baseRemaining >= 0 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                    )}>
                      {baseRemaining >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Remaining</p>
                      <p className={cn(
                        "text-xl md:text-2xl font-black tracking-tighter",
                        baseRemaining >= 0 ? "text-green-700" : "text-red-700"
                      )}>₹{baseRemaining.toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-end border-l border-dashed border-muted-foreground/20 pl-4">
                    <p className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest">Spent Today</p>
                    <p className="text-xl md:text-2xl font-black tracking-tighter">₹{spentToday.toFixed(0)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase">Base Target</p>
                    <p className="text-xs md:text-sm font-black">₹{baseAllocation.toFixed(0)}</p>
                  </div>
                  <div className="space-y-0.5 md:space-y-1 text-right">
                    <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase">Total Safe</p>
                    <p className={cn(
                      "text-xs md:text-sm font-black",
                      remaining > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      ₹{remaining.toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {hasActiveGoals && (
          <div className="lg:col-span-5">
            <Link href="/learning" className="block group h-full">
              <Card className="shadow-lg h-full border-none ring-1 ring-border group-hover:ring-primary/30 transition-all duration-300 rounded-2xl">
                <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6">
                  <CardTitle className="text-sm md:text-base font-black">Active Skills</CardTitle>
                  <CardDescription className="text-[9px] md:text-[10px] font-medium uppercase tracking-tight">Daily Progress tracker</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  {learningGoals!.slice(0, 4).map((goal) => {
                    const p = Math.min(100, Math.round(((goal.completedCount || 0) / (goal.target || 1)) * 100));
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] md:text-[11px] font-black uppercase tracking-tighter">
                          <span className="truncate max-w-[70%]">{goal.skill}</span>
                          <span className="text-muted-foreground">{p}%</span>
                        </div>
                        <Progress value={p} className="h-1 md:h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

interface DashboardCardProps {
  href: string;
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'default';
  progress?: number;
}

function DashboardCard({ href, title, value, subtext, icon, variant = 'default', progress }: DashboardCardProps) {
  return (
    <Link href={href} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
      <Card className={cn(
        "shadow-md h-full transition-all duration-300 border-none ring-1 ring-border relative overflow-hidden rounded-2xl",
        variant === 'primary' && "bg-primary text-primary-foreground ring-primary/20",
        variant === 'secondary' && "bg-secondary text-secondary-foreground ring-secondary/20",
        variant === 'destructive' && "bg-destructive text-destructive-foreground ring-destructive/20 animate-pulse"
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 pt-3 md:pt-4 px-3 md:px-4">
          <CardTitle className={cn(
            "text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-tight",
            variant === 'default' ? "text-muted-foreground" : "text-inherit opacity-80"
          )}>{title}</CardTitle>
          <div className={cn(
            "p-1 rounded-lg shrink-0",
            variant === 'default' ? "bg-muted text-primary" : "bg-white/10"
          )}>
            {icon}
          </div>
        </CardHeader>
        <CardContent className="pb-3 md:pb-4 px-3 md:px-4">
          <div className="text-lg md:text-2xl font-black tracking-tighter truncate">{value}</div>
          <p className={cn(
            "text-[7px] md:text-[9px] font-bold uppercase mt-0.5 truncate",
            variant === 'default' ? "text-muted-foreground" : "text-inherit opacity-70"
          )}>{subtext}</p>
          {progress !== undefined && (
            <Progress value={progress} className="h-0.5 md:h-1 mt-2 md:mt-2.5 bg-muted/20" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
