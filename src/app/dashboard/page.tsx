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
  HandCoins,
  Users,
  Flame,
  Zap,
  Scale,
  Mountain,
  Target,
  PiggyBank,
  HeartPulse,
  Smile,
  Coins
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { decryptNumber, decryptData } from '@/lib/encryption';

const PILLAR_ICONS: Record<string, any> = {
  expense: { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500' },
  savings: { icon: PiggyBank, color: 'text-green-500', bg: 'bg-green-500' },
  investment: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500' },
  health: { icon: HeartPulse, color: 'text-purple-500', bg: 'bg-purple-500' },
  personal: { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-500' }
};

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  
  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedDebts, setDecryptedDebts] = useState<any[]>([]);
  const [decryptedCravingLogs, setDecryptedCravingLogs] = useState<any[]>([]);
  const [decryptedSalaryProfile, setDecryptedSalaryProfile] = useState<any>(null);
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

  const cravingLogsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'cravingLogs');
  }, [firestore, user]);
  const { data: rawCravingLogs } = useCollection(cravingLogsRef);

  const cravingStatsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'cravingStats', 'summary');
  }, [firestore, user]);
  const { data: cravingStats } = useDoc(cravingStatsRef);

  const visionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'visionBoard');
  }, [firestore, user]);
  const { data: visionItems } = useCollection(visionRef);

  const salaryProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'salaryProfiles', 'current');
  }, [firestore, user]);
  const { data: rawSalaryProfile } = useDoc(salaryProfileRef);

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
          allocationBucket: f.allocationBucket || 'expense'
        })));
        setDecryptedFixed(fixed);
      }

      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
          date: e.date || '',
          allocationBucket: e.allocationBucket || 'expense'
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

      if (rawCravingLogs) {
        const logs = await Promise.all(rawCravingLogs.map(async l => ({
          ...l,
          caloriesAvoided: l.isEncrypted ? await decryptNumber(l.caloriesAvoided, user.uid) : (l.caloriesAvoided || 0),
          moneySaved: l.isEncrypted ? await decryptNumber(l.moneySaved, user.uid) : (l.moneySaved || 0),
          date: l.date || ''
        })));
        setDecryptedCravingLogs(logs);
      }

      if (rawSalaryProfile) {
        setDecryptedSalaryProfile({
          ...rawSalaryProfile,
          salary: rawSalaryProfile.isEncrypted ? await decryptNumber(rawSalaryProfile.salary, user.uid) : (rawSalaryProfile.salary || 0),
          pillars: rawSalaryProfile.pillars || [],
          percents: rawSalaryProfile.percents || {},
        });
      }

      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawBudget, rawFixed, rawExpenses, rawDebts, rawCravingLogs, rawSalaryProfile, user, mounted]);

  const budgetReport = useMemo(() => {
    if (!decryptedBudget || !mounted) return null;

    const dailyExpensesMap: Record<string, number> = {};
    (decryptedExpenses || [])
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
  const baseRemaining = baseAllocation - spentToday;

  const cravingToday = useMemo(() => {
    const today = decryptedCravingLogs.filter(l => l.date === todayStr);
    return {
      cals: today.reduce((s, l) => s + l.caloriesAvoided, 0),
      money: today.reduce((s, l) => s + l.moneySaved, 0)
    };
  }, [decryptedCravingLogs, todayStr]);

  const goalsProgress = learningGoals?.length ? Math.round((learningGoals.filter(g => (g.completedCount || 0) >= (g.target || 0)).length / learningGoals.length) * 100) : 0;
  const totalOwed = useMemo(() => decryptedDebts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0, [decryptedDebts]);
  const hasActiveGoals = !!(learningGoals && learningGoals.length > 0);

  const visionStats = useMemo(() => {
    if (!visionItems) return { active: 0, achieved: 0 };
    return {
      active: visionItems.filter(v => !v.isAchieved).length,
      achieved: visionItems.filter(v => v.isAchieved).length
    };
  }, [visionItems]);

  const allocationReport = useMemo(() => {
    if (!decryptedSalaryProfile || !decryptedFixed || !decryptedExpenses) return null;

    const salary = decryptedSalaryProfile.salary || 0;
    const profilePillars = decryptedSalaryProfile.pillars || [];
    const profilePercents = decryptedSalaryProfile.percents || {};

    if (profilePillars.length === 0) return null;

    return profilePillars.map((p: any) => {
      const percent = profilePercents[p.id] || 0;
      const target = (salary * (percent / 100));
      const fixedSpent = decryptedFixed.filter(f => f.allocationBucket === p.id).reduce((s, f) => s + f.amount, 0);
      const dailySpent = decryptedExpenses.filter(e => (e.allocationBucket || 'expense') === p.id).reduce((s, e) => s + e.amount, 0);
      const totalSpent = fixedSpent + dailySpent;
      const utilization = target > 0 ? (totalSpent / target) * 100 : 0;

      return {
        id: p.id,
        label: p.label,
        percent,
        target,
        spent: totalSpent,
        utilization,
        remaining: target - totalSpent
      };
    });
  }, [decryptedSalaryProfile, decryptedFixed, decryptedExpenses]);

  return (
    <AppShell>
      {!mounted ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Vault...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4 md:space-y-6">
          <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
            <div className={cn("space-y-4 md:space-y-6", hasActiveGoals ? "lg:col-span-7" : "lg:col-span-12")}>
              <Link href="/reports" className="block group">
                <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border group-hover:ring-primary/30 transition-all duration-300 rounded-2xl">
                  <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6">
                    <CardTitle className="text-sm md:text-base font-black flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Budget Insight
                    </CardTitle>
                    <CardDescription className="text-[9px] md:text-[10px] font-medium uppercase tracking-tight">
                      {isDecrypting ? "Syncing metrics..." : "Real-time performance metrics"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className={cn(
                      "p-4 md:p-5 rounded-2xl border transition-all grid grid-cols-2 gap-4",
                      isDecrypting ? "opacity-50 grayscale" : (
                        baseRemaining >= 0 
                          ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' 
                          : 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30'
                      )
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

          <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden relative">
            {isDecrypting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            <CardHeader className="bg-muted/30 border-b py-4 md:py-5 px-5 md:px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl font-black flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Strategic Income Allocation
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-tight opacity-70">Wealth strategy utilization for {format(now, 'MMMM')}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase px-3 py-1">
                Strategic Health
              </Badge>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {!allocationReport ? (
                <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center space-y-4 opacity-50 grayscale">
                  <Target className="h-12 w-12 text-muted-foreground" />
                  <p className="text-xs font-black uppercase tracking-widest">No strategic profile linked</p>
                  <Button variant="outline" asChild className="rounded-xl h-9 text-[10px] font-black uppercase">
                    <Link href="/salary-planner">Configure Strategy</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {allocationReport.map(pillar => {
                    const Config = PILLAR_ICONS[pillar.id] || { icon: Coins, color: 'text-primary', bg: 'bg-primary' };
                    const Icon = Config.icon;
                    const isOverspent = pillar.utilization > 100;
                    
                    return (
                      <div key={pillar.id} className="min-w-[160px] md:min-w-[200px] flex-shrink-0 snap-center space-y-3 p-3 md:p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10 group">
                        <div className="flex items-center justify-between">
                          <Badge variant={isOverspent ? "destructive" : "secondary"} className="text-[7px] md:text-[9px] font-black uppercase px-1 md:px-2">
                            {Math.round(pillar.utilization)}%
                          </Badge>
                          <div className={cn("p-1.5 rounded-lg text-white shadow-md transition-transform group-hover:scale-110", Config.bg)}>
                            <Icon className="h-3 w-3" />
                          </div>
                        </div>
                        
                        <div className="space-y-0.5">
                          <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{pillar.label}</p>
                          <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-1">
                            <span className="text-[10px] md:text-lg font-black tracking-tighter">₹{Math.round(pillar.spent).toLocaleString()}</span>
                            <span className="text-[6px] md:text-[8px] font-bold text-muted-foreground opacity-60">/ ₹{Math.round(pillar.target).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Progress value={Math.min(100, pillar.utilization)} className={cn("h-1", isOverspent ? "bg-destructive/20" : "bg-muted")} />
                          <div className="flex justify-between items-center text-[6px] md:text-[8px] font-black uppercase tracking-tighter">
                            <span className={cn(isOverspent ? "text-destructive" : "text-muted-foreground")}>
                              {isOverspent ? "Over" : "Free"}
                            </span>
                            <span className={cn(pillar.remaining >= 0 ? "text-primary" : "text-destructive")}>
                              ₹{Math.abs(Math.round(pillar.remaining)).toLocaleString()}
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

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
            <DashboardCard 
              href="/craving-meter" 
              title="Willpower" 
              value={`${cravingToday.cals} kcal`} 
              subtext={`₹${cravingToday.money} Saved | ${cravingStats?.currentStreak || 0}d Streak`} 
              icon={<Flame className="w-4 h-4" />} 
              variant="primary" 
              loading={isDecrypting} 
            />
            <DashboardCard 
              href="/future-vision" 
              title="Future Vision" 
              value={`${visionStats.active} Visions`} 
              subtext={`${visionStats.achieved} Achievements`} 
              icon={<Mountain className="w-4 h-4" />} 
              variant="default" 
            />
            <DashboardCard href="/split-pay" title="Split & Debt" value={`₹${totalOwed.toFixed(0)}`} subtext="Receivable total" icon={<HandCoins className="w-4 h-4" />} variant="default" loading={isDecrypting} />
            <DashboardCard href="/learning" title="Skill Mastery" value={`${goalsProgress}%`} subtext="Completion rate" icon={<BookOpen className="w-4 h-4" />} progress={goalsProgress} />
            <DashboardCard href="/diary" title="Daily Reflection" value={todayDiary ? "Logged" : "Pending"} subtext={todayDiary ? "Well done!" : "Record thoughts"} icon={todayDiary ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} variant={todayDiary ? "secondary" : "default"} />
          </div>
        </div>
      )}
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
  loading?: boolean;
}

function DashboardCard({ href, title, value, subtext, icon, variant = 'default', progress, loading }: DashboardCardProps) {
  return (
    <Link href={href} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
      <Card className={cn(
        "shadow-md h-full transition-all duration-300 border-none ring-1 ring-border relative overflow-hidden rounded-2xl",
        variant === 'primary' && "bg-primary text-primary-foreground ring-primary/20",
        variant === 'secondary' && "bg-secondary text-secondary-foreground ring-secondary/20",
        variant === 'destructive' && "bg-destructive text-destructive-foreground ring-destructive/20 animate-pulse",
        loading && "opacity-50 grayscale"
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 pt-3 md:pt-4 px-3 md:px-4">
          <CardTitle className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-tight", variant === 'default' ? "text-muted-foreground" : "text-inherit opacity-80")}>{title}</CardTitle>
          <div className={cn("p-1 rounded-lg shrink-0", variant === 'default' ? "bg-muted text-primary" : "bg-white/10")}>{icon}</div>
        </CardHeader>
        <CardContent className="pb-3 md:pb-4 px-3 md:px-4">
          <div className="text-sm md:text-xl font-black tracking-tighter truncate">{value}</div>
          <p className={cn("text-[7px] md:text-[9px] font-bold uppercase mt-0.5 truncate", variant === 'default' ? "text-muted-foreground" : "text-inherit opacity-70")}>{subtext}</p>
          {progress !== undefined && <Progress value={progress} className="h-0.5 md:h-1 mt-2 md:mt-2.5 bg-muted/20" />}
        </CardContent>
      </Card>
    </Link>
  );
}
