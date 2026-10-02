
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  subMonths
} from 'date-fns';
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
  Coins,
  Wallet,
  Info,
  History,
  ReceiptText,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Calendar,
  Layers,
  ArrowRightLeft,
  ArrowLeft,
  ChevronRight as ChevronRightIcon,
  CheckSquare,
  BellRing
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateRollingBudget, MonthlyConfig } from '@/lib/budget-logic';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { decryptNumber, decryptData } from '@/lib/encryption';
import { sendLocalNotification } from '@/lib/notifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [selectedPillarReport, setSelectedPillarReport] = useState<any | null>(null);
  const [pillarReportViewType, setPillarReportViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  
  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedDebts, setDecryptedDebts] = useState<any[]>([]);
  const [decryptedCravingLogs, setDecryptedCravingLogs] = useState<any[]>([]);
  const [decryptedSalaryProfile, setDecryptedSalaryProfile] = useState<any>(null);
  const [decryptedAllBudgets, setDecryptedAllBudgets] = useState<any[]>([]);
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
        });
      }

      if (rawFixed) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          name: f.isEncrypted ? await decryptData(f.name, user.uid) : (f.name || 'Fixed Record'),
          amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
          includeInBudget: f.includeInBudget ?? true,
          allocationBucket: f.allocationBucket || 'expense'
        })));
        setDecryptedFixed(fixed);
      }

      if (rawExpenses) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          description: e.isEncrypted ? await decryptData(e.description, user.uid) : (e.description || 'Spend Record'),
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
  }, [rawBudget, rawFixed, rawExpenses, rawDebts, rawCravingLogs, rawSalaryProfile, rawAllBudgets, user, mounted]);

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
      saturdayExtra: 0,
      sundayExtra: 0,
      holidayExtra: 0,
      isWeekendEnabled: false,
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

  const totalOwed = useMemo(() => decryptedDebts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0, [decryptedDebts]);
  const goalsProgress = learningGoals?.length ? Math.round((learningGoals.filter(g => (g.completedCount || 0) >= (g.target || 0)).length / learningGoals.length) * 100) : 0;
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
        fixedSpent,
        dailySpent,
        utilization,
        remaining: target - totalSpent
      };
    });
  }, [decryptedSalaryProfile, decryptedFixed, decryptedExpenses]);

  // Expenditure Reminder Logic
  useEffect(() => {
    if (mounted && !isDecrypting && decryptedExpenses.length >= 0) {
      const remindersActive = localStorage.getItem('lifetrack_daily_reminders') === 'true';
      const hasLoggedToday = decryptedExpenses.some(e => e.date === todayStr);
      
      if (remindersActive && !hasLoggedToday) {
        const lastReminded = localStorage.getItem('lifetrack_last_reminded');
        if (lastReminded !== todayStr) {
          sendLocalNotification('Expenditure Entry Required', {
            body: "The ledger is empty for today. Record your transactions to stay on target!",
            tag: 'daily-reminder',
            requireInteraction: true
          });
          localStorage.setItem('lifetrack_last_reminded', todayStr);
        }
      }
    }
  }, [mounted, isDecrypting, decryptedExpenses, todayStr]);

  const selectedPillarGraphData = useMemo(() => {
    if (!selectedPillarReport || !decryptedExpenses) return [];
    
    if (pillarReportViewType === 'weekly') {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
      
      return weeks.map((weekStart, idx) => {
        const weekEnd = endOfWeek(weekStart);
        const spent = (decryptedExpenses || [])
          .filter(e => {
            const d = new Date(e.date);
            return d >= weekStart && d <= weekEnd && (e.allocationBucket || 'expense') === selectedPillarReport.id;
          })
          .reduce((s, e) => s + e.amount, 0);
        return {
          name: `W${idx + 1}`,
          spent,
          fullDate: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
        };
      });
    }

    if (pillarReportViewType === 'annual') {
      const yearStart = startOfYear(now);
      const months = eachMonthOfInterval({ start: yearStart, end: now });
      
      return months.map(m => {
        const mKey = format(m, 'yyyyMM');
        const isCurrentMonth = mKey === monthId;
        let spent = 0;
        
        if (isCurrentMonth) {
          spent = (decryptedExpenses || [])
            .filter(e => (e.allocationBucket || 'expense') === 'expense')
            .reduce((s, e) => s + e.amount, 0);
            
          const fixedSpent = (decryptedFixed || [])
            .filter(f => f.allocationBucket === 'expense')
            .reduce((s, f) => s + f.amount, 0);
          spent += fixedSpent;
        } else {
          const historical = decryptedAllBudgets?.find(b => b.id === mKey);
          if (historical) {
            spent = (historical.actualSpent || 0) + (historical.actualFixedSpent || 0);
          }
        }
        
        return {
          name: format(m, 'MMM'),
          spent,
          fullLabel: format(m, 'MMMM yyyy')
        };
      });
    }
    
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => {
      const dStr = format(day, 'yyyy-MM-dd');
      const spent = decryptedExpenses
        .filter(e => e.date === dStr && (e.allocationBucket || 'expense') === selectedPillarReport.id)
        .reduce((s, e) => s + e.amount, 0);
      return {
        name: format(day, 'd'),
        spent,
        fullDate: format(day, 'dd MMM yyyy')
      };
    });
  }, [selectedPillarReport, decryptedExpenses, decryptedFixed, pillarReportViewType, now, monthId, decryptedAllBudgets]);

  const selectedPillarRecentExpenses = useMemo(() => {
    if (!selectedPillarReport || !decryptedExpenses) return [];
    return decryptedExpenses
      .filter(e => (e.allocationBucket || 'expense') === selectedPillarReport.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);
  }, [selectedPillarReport, decryptedExpenses]);

  const hasLoggedToday = useMemo(() => {
     return decryptedExpenses.some(e => e.date === todayStr);
  }, [decryptedExpenses, todayStr]);

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
              <Card className={cn(
                "shadow-lg overflow-hidden border-none ring-1 rounded-2xl relative group transition-all duration-500",
                (!hasLoggedToday && localStorage.getItem('lifetrack_daily_reminders') === 'true') ? "ring-primary/40 bg-primary/[0.02]" : "ring-border"
              )}>
                <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6 flex flex-row items-center justify-between">
                  <Link href="/reports" className="flex-1">
                    <CardTitle className="text-sm md:text-base font-black flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Budget Insight
                    </CardTitle>
                    <CardDescription className="text-[9px] md:text-[10px] font-medium uppercase tracking-tight">
                      {isDecrypting ? "Syncing metrics..." : "Real-time performance metrics"}
                    </CardDescription>
                  </Link>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-none ring-1 ring-border">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Budget Analysis</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          This section tracks your variable spending velocity. 'Base Remaining' shows your current daily allowance status, while 'Spent Today' aggregates all logged expenses for the current date.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {!hasLoggedToday && localStorage.getItem('lifetrack_daily_reminders') === 'true' && (
                    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20 animate-pulse mb-2">
                      <BellRing className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-tight text-primary">Entry Required: Ledger is empty for today</p>
                    </div>
                  )}
                  <Link href="/reports">
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
                  </Link>
                </CardContent>
              </Card>
            </div>
            {hasActiveGoals && (
              <div className="lg:col-span-5">
                <Card className="shadow-lg h-full border-none ring-1 ring-border rounded-2xl relative">
                  <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6 flex flex-row items-center justify-between">
                    <Link href="/learning" className="flex-1">
                      <CardTitle className="text-sm md:text-base font-black">Active Skills</CardTitle>
                      <CardDescription className="text-[9px] md:text-[10px] font-medium uppercase tracking-tight">Daily Progress tracker</CardDescription>
                    </Link>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4 rounded-2xl shadow-xl border-none ring-1 ring-border">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Skill Progress</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Monitor your daily learning targets. This shows a summary of your most active skills and your current completion percentage for the day.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                    <Link href="/learning" className="space-y-3 md:space-y-4 block">
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
                    </Link>
                  </CardContent>
                </Card>
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase px-3 py-1">
                  Strategic Health
                </Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-none ring-1 ring-border">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Allocation Logic</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This row visualizes your current spending against the pillars defined in your Salary Strategy. Click on any card to see a detailed report and spending trend for that pillar.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
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
                      <div 
                        key={pillar.id} 
                        onClick={() => setSelectedPillarReport(pillar)}
                        className="min-w-[150px] md:min-w-[190px] flex-shrink-0 snap-center p-4 rounded-3xl border bg-card hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ring-1 ring-border shadow-sm"
                      >
                        <div className={cn("absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity", Config.color)}>
                           <Icon className="h-12 w-12 rotate-12" />
                        </div>
                        
                        <div className="space-y-4 relative z-10">
                          <div className="flex items-center gap-2.5">
                             <div className={cn("p-1.5 rounded-xl text-white shadow-sm transition-transform group-hover:scale-110", Config.bg)}>
                                <Icon className="h-3 w-3" />
                             </div>
                             <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground truncate">{pillar.label}</span>
                          </div>

                          <div className="space-y-0.5">
                             <div className="flex items-baseline gap-1">
                                <span className="text-xl md:text-2xl font-black tracking-tighter">₹{Math.round(pillar.spent).toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between items-center text-[7px] font-bold uppercase tracking-tight text-muted-foreground/60">
                                <span>Cap: ₹{Math.round(pillar.target).toLocaleString()}</span>
                             </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                             <div className="flex justify-between items-center">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md", 
                                  isOverspent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                )}>
                                   {isOverspent ? "Limit Exceeded" : "Healthy Load"}
                                </span>
                                <span className="text-[10px] font-black tracking-tighter">{Math.round(pillar.utilization)}%</span>
                             </div>
                             <Progress value={Math.min(100, pillar.utilization)} className={cn("h-1.5", isOverspent ? "bg-destructive/20" : "bg-primary/10")} />
                          </div>
                        </div>
                        
                        <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                           <ArrowUpRight className="h-3 w-3 text-primary" />
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
              variant="default" 
              accentColor="orange"
              loading={isDecrypting}
              info="Tracks the nutritional and financial impact of resisted cravings. Streaks represent consecutive days of logging resistance."
            />
            <DashboardCard 
              href="/future-vision" 
              title="Future Vision" 
              value={`${visionStats.active} Visions`} 
              subtext={`${visionStats.achieved} Achievements`} 
              icon={<Mountain className="w-4 h-4" />} 
              variant="default"
              accentColor="indigo"
              info="A private board for your long-term aspirations. Items are end-to-end encrypted to ensure your dreams remain confidential."
            />
            <DashboardCard 
              href="/split-pay" 
              title="Split & Debt" 
              value={`₹${totalOwed.toFixed(0)}`} 
              subtext="Receivable total" 
              icon={<HandCoins className="w-4 h-4" />} 
              variant="default" 
              accentColor="green"
              loading={isDecrypting}
              info="Manages shared expense rooms and personal debts. Tracks net balances across collaborative groups."
            />
            <DashboardCard 
              href="/learning" 
              title="Skill Mastery" 
              value={`${goalsProgress}%`} 
              subtext="Completion rate" 
              icon={<BookOpen className="w-4 h-4" />} 
              progress={goalsProgress}
              accentColor="blue"
              info="Tracks your progress across active skill goals. Completion rate represents the ratio of met daily targets."
            />
            <DashboardCard 
              href="/diary" 
              title="Daily Reflection" 
              value={todayDiary ? "Logged" : "Pending"} 
              subtext={todayDiary ? "Well done!" : "Record thoughts"} 
              icon={todayDiary ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} 
              variant={todayDiary ? "default" : "default"} 
              accentColor={todayDiary ? "emerald" : "slate"}
              info="Your private E2EE reflection vault. Securely record achievements, learnings, and plans for tomorrow."
            />
          </div>
        </div>
      )}

      {/* Pillar Report Exclusive Dialog */}
      <Dialog open={!!selectedPillarReport} onOpenChange={(open) => !open && setSelectedPillarReport(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl h-[95vh] md:h-auto max-h-[95vh] flex flex-col">
          {selectedPillarReport && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedPillarReport.label} Performance Report</DialogTitle>
                <DialogDescription>Detailed analytics and transaction history for the {selectedPillarReport.label} strategic node.</DialogDescription>
              </DialogHeader>

              <div className={cn("px-4 py-3 md:px-6 md:py-4 text-white relative shrink-0 overflow-hidden", (PILLAR_ICONS[selectedPillarReport.id] || { bg: 'bg-primary' }).bg)}>
                <div className="absolute -top-4 -right-4 opacity-10 rotate-12">
                   {React.createElement((PILLAR_ICONS[selectedPillarReport.id] || { icon: Coins }).icon, { className: "h-16 w-16" })}
                </div>
                
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                      {React.createElement((PILLAR_ICONS[selectedPillarReport.id] || { icon: Coins }).icon, { className: "h-4 w-4" })}
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-black tracking-tighter uppercase leading-none">{selectedPillarReport.label}</h2>
                      <p className="text-white/70 text-[7px] font-black uppercase tracking-widest leading-none mt-1">Performance Report</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
                     <div className="flex flex-col items-center">
                        <p className="text-[6px] font-black uppercase tracking-widest opacity-60">Target</p>
                        <p className="text-[10px] md:text-xs font-black">₹{Math.round(selectedPillarReport.target).toLocaleString()}</p>
                     </div>
                     <div className="w-px h-6 bg-white/20" />
                     <div className="flex flex-col items-center">
                        <p className="text-[6px] font-black uppercase tracking-widest opacity-60">Spent</p>
                        <p className="text-[10px] md:text-xs font-black">₹{Math.round(selectedPillarReport.spent).toLocaleString()}</p>
                     </div>
                     <div className="w-px h-6 bg-white/20" />
                     <div className={cn("px-3 py-1.5 rounded-xl backdrop-blur-md border flex flex-col items-center shadow-lg", selectedPillarReport.remaining >= 0 ? "bg-white/20 border-white/20" : "bg-red-50/40 border-red-50/20")}>
                        <p className="text-[6px] font-black uppercase tracking-widest opacity-60">Balance</p>
                        <p className="text-[10px] md:text-xs font-black">
                          {selectedPillarReport.remaining >= 0 ? `₹${Math.round(selectedPillarReport.remaining).toLocaleString()}` : "EXCEEDED"}
                        </p>
                     </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-background">
                <div className="p-4 md:p-6 space-y-6">
                  {/* Visualization Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between px-1 gap-4">
                      <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                        Utilization Pulse
                      </h4>
                      <Tabs value={pillarReportViewType} onValueChange={(v: any) => setPillarReportViewType(v)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3 sm:w-[240px] h-8 p-1 bg-muted/50 rounded-xl border">
                          <TabsTrigger value="weekly" className="text-[8px] font-black uppercase">Weekly</TabsTrigger>
                          <TabsTrigger value="monthly" className="text-[8px] font-black uppercase">Monthly</TabsTrigger>
                          <TabsTrigger value="annual" className="text-[8px] font-black uppercase">Yearly</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    
                    <div className="h-[200px] md:h-[240px] w-full bg-muted/5 rounded-[1.5rem] md:rounded-3xl border border-dashed p-3 md:p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedPillarGraphData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                          <XAxis 
                            dataKey="name" 
                            fontSize={7} 
                            fontWeight="bold" 
                            tickLine={false} 
                            axisLine={false} 
                            interval={pillarReportViewType === 'monthly' ? "preserveStartEnd" : 0}
                            minTickGap={pillarReportViewType === 'monthly' ? 10 : 0}
                          />
                          <YAxis 
                            fontSize={7} 
                            fontWeight="bold" 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(v) => `₹${v}`}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '9px', fontWeight: 'bold' }}
                            labelStyle={{ color: 'hsl(var(--primary))' }}
                            formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Spent']}
                            labelFormatter={(label, payload) => payload[0]?.payload.fullDate || payload[0]?.payload.fullLabel}
                          />
                          <Bar 
                            dataKey="spent" 
                            radius={[3, 3, 0, 0]}
                            animationDuration={1000}
                          >
                            {selectedPillarGraphData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.spent > (selectedPillarReport.target / (pillarReportViewType === 'monthly' ? 30 : pillarReportViewType === 'weekly' ? 4 : 1)) ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ledger Section */}
                  <div className="space-y-4 pb-4">
                     <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <History className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                          Recent Pillar Activity
                        </h4>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">{selectedPillarRecentExpenses.length} Records</span>
                     </div>
                     
                     <div className="grid gap-2">
                        {selectedPillarRecentExpenses.length > 0 ? selectedPillarRecentExpenses.map((exp) => (
                          <div key={exp.id} className="flex items-center justify-between p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-muted/20 border border-border/50 group hover:bg-muted/30 transition-all shadow-sm">
                             <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg md:rounded-xl bg-background flex flex-col items-center justify-center border shadow-sm shrink-0">
                                   <span className="text-[8px] font-black text-primary leading-none">{format(new Date(exp.date), 'dd')}</span>
                                   <span className="text-[6px] font-black text-muted-foreground uppercase leading-none mt-0.5">{format(new Date(exp.date), 'MMM')}</span>
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[11px] md:text-xs font-black uppercase tracking-tight truncate max-w-[140px] md:max-w-[320px]">{exp.description}</p>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                      <Badge variant="outline" className="text-[6px] font-black uppercase px-1 py-0 h-3 leading-none opacity-60 bg-background">Verified</Badge>
                                      <span className="text-[7px] font-bold text-muted-foreground/60 uppercase tracking-widest">{format(new Date(exp.date), 'yyyy')}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right shrink-0">
                                <p className="text-xs md:text-sm font-black tracking-tighter">₹{exp.amount.toLocaleString()}</p>
                             </div>
                          </div>
                        )) : (
                          <div className="py-12 flex flex-col items-center justify-center opacity-30 grayscale space-y-2 border-2 border-dashed rounded-[1.5rem] md:rounded-3xl">
                             <ReceiptText className="h-8 w-8" />
                             <p className="text-[9px] font-black uppercase tracking-widest">No recent transactions found</p>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-3 md:p-4 border-t bg-muted/20 shrink-0 flex items-center justify-start shadow-sm relative z-20 px-4 md:px-6">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPillarReport(null)}
                  className="rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest h-9 md:h-10 px-5 gap-2 bg-background shadow-sm hover:bg-primary/5"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
  info?: string;
  accentColor?: string;
}

function DashboardCard({ href, title, value, subtext, icon, variant = 'default', progress, loading, info, accentColor }: DashboardCardProps) {
  const colorMap: Record<string, string> = {
    orange: "text-orange-500 bg-orange-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    green: "text-green-500 bg-green-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    slate: "text-slate-500 bg-slate-500/10"
  };

  const activeColor = accentColor ? colorMap[accentColor] || "text-primary bg-primary/10" : "text-primary bg-primary/10";

  return (
    <div className="relative group">
      <Link href={href} className="block transition-all duration-300 hover:translate-y-[-2px] active:scale-[0.98] h-full">
        <Card className={cn(
          "shadow-sm h-full transition-all duration-300 border-none ring-1 ring-border relative overflow-hidden rounded-[2rem] bg-card hover:shadow-xl hover:ring-primary/20",
          loading && "opacity-50 grayscale"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 pt-4 md:pt-5 px-4 md:px-5">
            <CardTitle className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">{title}</CardTitle>
            <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", activeColor)}>
              {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })}
            </div>
          </CardHeader>
          <CardContent className="pb-4 md:pb-6 px-4 md:px-5 mt-2">
            <div className="text-base md:text-xl font-black tracking-tighter truncate leading-none mb-1.5">₹{value}</div>
            <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-tight text-muted-foreground/80 truncate">{subtext}</p>
            {progress !== undefined && (
              <div className="mt-4">
                <Progress value={progress} className="h-1.5 bg-muted/40" />
              </div>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
      </Link>
      {info && (
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Popover>
            <PopoverTrigger asChild>
              <button 
                onClick={(e) => e.preventDefault()}
                className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm shadow-md ring-1 ring-border text-muted-foreground/40 hover:text-primary transition-all"
              >
                <Info className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-2xl shadow-2xl border-none ring-1 ring-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{title} Node</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{info}</p>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
