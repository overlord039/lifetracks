"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  eachWeekOfInterval,
  subMonths,
  eachMonthOfInterval,
  endOfWeek,
  startOfYear,
  endOfYear
} from 'date-fns';
import { collection, doc, query, where } from 'firebase/firestore';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  TableProperties,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  Activity,
  Loader2,
  CheckSquare,
  ReceiptText,
  History,
  Target,
  ShieldCheck,
  BarChart as BarChartIcon,
  Download,
  Wallet,
  PiggyBank,
  HeartPulse,
  Smile,
  Coins,
  Zap,
  ArrowLeft,
  ChevronRight as ChevronRightIcon,
  Filter,
  Info,
  Utensils,
  Flame,
  ArrowRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { decryptData, decryptNumber } from '@/lib/encryption';
import { useToast } from '@/hooks/use-toast';

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: '600'
};

const CHART_COLORS = ['#6366f1', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeAuditType, setActiveAuditType] = useState<'financial' | 'nutrition'>('financial');
  const [viewType, setViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [categoryFilter, setCategoryFilter] = useState<string[]>(['all']);
  const [mounted, setMounted] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeAuditCategoryId, setActiveAuditCategoryId] = useState<string | null>(null);

  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedPrevBudget, setDecryptedPrevBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedPrevExpenses, setDecryptedPrevExpenses] = useState<any[]>([]);
  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
  const [decryptedAllBudgets, setDecryptedAllBudgets] = useState<any[]>([]);
  const [decryptedCravingLogs, setDecryptedCravingLogs] = useState<any[]>([]);
  const [decryptedHealthProfile, setDecryptedHealthProfile] = useState<any>(null);
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
  const { data: rawBudget, isLoading: isBudgetLoading } = useDoc(monthlyBudgetRef);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [firestore, user, monthId]);
  const { data: rawFixed } = useCollection(fixedExpensesRef);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [firestore, user, monthId]);
  const { data: rawExpenses, isLoading: isExpensesLoading } = useCollection(monthExpensesRef);

  const prevMonthlyBudgetRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId);
  }, [firestore, user, prevMonthId]);
  const { data: rawPrevBudget } = useDoc(prevMonthlyBudgetRef);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'expenseCategories');
  }, [firestore, user]);
  const { data: rawCategories } = useCollection(categoriesRef);

  const allBudgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets');
  }, [firestore, user]);
  const { data: rawAllBudgets } = useCollection(allBudgetsQuery);

  const cravingLogsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'cravingLogs');
  }, [firestore, user]);
  const { data: rawCravingLogs } = useCollection(cravingLogsRef);

  const healthProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'healthProfile', 'current');
  }, [firestore, user]);
  const { data: rawHealthProfile } = useDoc(healthProfileRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!user || !mounted) return;
      setIsDecrypting(true);

      try {
        if (rawBudget) {
          setDecryptedBudget({
            ...rawBudget,
            totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
            actualSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualSpent, user.uid) : (rawBudget.actualSpent || 0),
            actualFixedSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualFixedSpent, user.uid) : (rawBudget.actualFixedSpent || 0),
          });
        }

        if (rawFixed) {
          const fixed = await Promise.all(rawFixed.map(async f => ({
            ...f,
            name: f.isEncrypted ? await decryptData(f.name, user.uid) : (f.name || ''),
            amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
            allocationBucket: f.allocationBucket || 'expense'
          })));
          setDecryptedFixed(fixed);
        }

        if (rawExpenses) {
          const exps = await Promise.all(rawExpenses.map(async e => ({
            ...e,
            description: e.isEncrypted ? await decryptData(e.description, user.uid) : (e.description || ''),
            amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
            allocationBucket: e.allocationBucket || 'expense'
          })));
          setDecryptedExpenses(exps);
        }

        if (rawCategories) {
          const cats = await Promise.all(rawCategories.map(async c => ({
            ...c,
            name: c.isEncrypted ? await decryptData(c.name, user.uid) : (c.name || ''),
          })));
          setDecryptedCategories(cats);
        }

        if (rawCravingLogs) {
          const logs = await Promise.all(rawCravingLogs.map(async l => ({
            ...l,
            foodName: l.isEncrypted ? await decryptData(l.foodName, user.uid) : (l.foodName || ''),
            calories: l.isEncrypted ? await decryptNumber(l.caloriesAvoided, user.uid) : (l.caloriesAvoided || 0),
            cost: l.isEncrypted ? await decryptNumber(l.moneySaved, user.uid) : (l.moneySaved || 0),
          })));
          setDecryptedCravingLogs(logs);
        }

        if (rawHealthProfile) {
          setDecryptedHealthProfile({
            ...rawHealthProfile,
            dailyCalorieTarget: rawHealthProfile.isEncrypted ? await decryptNumber(rawHealthProfile.dailyCalorieTarget, user.uid) : (rawHealthProfile.dailyCalorieTarget || 2100),
          });
        }
      } catch (err) {
        console.error("Decryption failed", err);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptAll();
  }, [rawBudget, rawFixed, rawExpenses, rawCategories, rawCravingLogs, rawHealthProfile, user, mounted]);

  const financialTotals = useMemo(() => {
    const budget = decryptedBudget?.totalBudgetAmount || 0;
    const fixed = (decryptedFixed || []).filter(f => f.includeInBudget && (f.allocationBucket || 'expense') === 'expense').reduce((s, f) => s + f.amount, 0);
    const daily = (decryptedExpenses || []).filter(e => (e.allocationBucket || 'expense') === 'expense').reduce((s, e) => s + e.amount, 0);
    const spent = fixed + daily;
    return { budget, fixed, daily, spent, remaining: budget - spent };
  }, [decryptedBudget, decryptedFixed, decryptedExpenses]);

  const nutritionTotals = useMemo(() => {
    const target = decryptedHealthProfile?.dailyCalorieTarget || 2100;
    const currentMonthLogs = decryptedCravingLogs.filter(l => l.date.startsWith(format(selectedDate, 'yyyy-MM')));
    const totalCals = currentMonthLogs.reduce((s, l) => s + l.calories, 0);
    const daysInMonthSoFar = eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }).filter(d => format(d, 'yyyy-MM-dd') <= format(new Date(), 'yyyy-MM-dd')).length;
    const dailyAverage = totalCals / (daysInMonthSoFar || 1);
    
    return { target, dailyAverage, totalCals, efficiency: Math.min(100, Math.round((dailyAverage / target) * 100)) };
  }, [decryptedCravingLogs, decryptedHealthProfile, selectedDate]);

  const chartsData = useMemo(() => {
    if (activeAuditType === 'financial') {
      const categoryTotals: Record<string, number> = {};
      const allItems = [...decryptedExpenses, ...decryptedFixed];
      allItems.forEach(item => {
        const cat = decryptedCategories.find(c => c.id === item.expenseCategoryId);
        const catName = cat?.name || 'Misc';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + item.amount;
      });

      const categoryData = Object.entries(categoryTotals).map(([name, value], idx) => ({
        name,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      })).sort((a, b) => b.value - a.value);

      const monthStart = startOfMonth(selectedDate);
      const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(selectedDate) });
      const spendingData = days.map(d => ({
        name: format(d, 'd'),
        spent: decryptedExpenses.filter(e => e.date === format(d, 'yyyy-MM-dd')).reduce((s, e) => s + e.amount, 0),
        fullLabel: format(d, 'dd MMM yyyy')
      }));

      return { categoryData, spendingData };
    } else {
      const mealTotals: Record<string, number> = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0, Beverages: 0 };
      const currentMonthLogs = decryptedCravingLogs.filter(l => l.date.startsWith(format(selectedDate, 'yyyy-MM')));
      currentMonthLogs.forEach(l => {
        const cat = l.category === 'drinks' ? 'Beverages' : (l.category?.charAt(0).toUpperCase() + l.category?.slice(1) || 'Snacks');
        if (mealTotals[cat] !== undefined) mealTotals[cat] += l.calories;
        else mealTotals['Others'] = (mealTotals['Others'] || 0) + l.calories;
      });

      const categoryData = Object.entries(mealTotals).map(([name, value], idx) => ({
        name,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      })).filter(d => d.value > 0);

      const monthStart = startOfMonth(selectedDate);
      const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(selectedDate) });
      const spendingData = days.map(d => ({
        name: format(d, 'd'),
        spent: decryptedCravingLogs.filter(l => l.date === format(d, 'yyyy-MM-dd')).reduce((s, l) => s + l.calories, 0),
        fullLabel: format(d, 'dd MMM yyyy')
      }));

      return { categoryData, spendingData };
    }
  }, [activeAuditType, decryptedExpenses, decryptedFixed, decryptedCategories, decryptedCravingLogs, selectedDate]);

  const auditItems = useMemo(() => {
    if (!activeAuditCategoryId) return [];
    if (activeAuditType === 'financial') {
      const combined = [
        ...decryptedExpenses.map(e => ({ ...e, type: 'daily', date: e.date, displayDesc: e.description })),
        ...decryptedFixed.map(f => ({ ...f, type: 'fixed', date: format(selectedDate, 'yyyy-MM-01'), displayDesc: f.name }))
      ];
      return combined.filter(i => i.expenseCategoryId === activeAuditCategoryId).sort((a,b) => b.date.localeCompare(a.date));
    } else {
      const currentMonthLogs = decryptedCravingLogs.filter(l => l.date.startsWith(format(selectedDate, 'yyyy-MM')));
      return currentMonthLogs.filter(l => {
        const cat = l.category === 'drinks' ? 'Beverages' : (l.category?.charAt(0).toUpperCase() + l.category?.slice(1) || 'Snacks');
        return cat === activeAuditCategoryId;
      }).sort((a,b) => b.date.localeCompare(a.date));
    }
  }, [activeAuditCategoryId, activeAuditType, decryptedExpenses, decryptedFixed, decryptedCravingLogs, selectedDate]);

  const downloadAuditCsv = () => {
    const combined = activeAuditType === 'financial' 
      ? [...decryptedExpenses.map(e => ({ ...e, type: 'daily' })), ...decryptedFixed.map(f => ({ ...f, type: 'fixed' }))]
      : decryptedCravingLogs.filter(l => l.date.startsWith(format(selectedDate, 'yyyy-MM')));

    if (combined.length === 0) return;

    const headers = activeAuditType === 'financial' ? ['Date', 'Description', 'Amount (₹)'] : ['Date', 'Item', 'Calories (kcal)', 'Cost (₹)'];
    const rows = combined.map((i: any) => activeAuditType === 'financial' ? [i.date || format(selectedDate, 'yyyy-MM-01'), i.description || i.name, i.amount] : [i.date, i.foodName, i.calories, i.cost]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LifeTrack_${activeAuditType}_Audit_${format(selectedDate, 'yyyyMM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {!mounted ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Audit Hub...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
                   <CheckSquare className="h-7 w-7" />
                </div>
                <div>
                   <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Audit reports</h2>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Multi-dimensional strategy analysis</p>
                </div>
             </div>
             <Tabs value={activeAuditType} onValueChange={(v: any) => setActiveAuditType(v)} className="bg-muted/50 p-1 rounded-xl border">
                <TabsList className="h-9">
                   <TabsTrigger value="financial" className="text-[10px] font-black uppercase gap-2"><Coins className="h-3.5 w-3.5" /> Financial</TabsTrigger>
                   <TabsTrigger value="nutrition" className="text-[10px] font-black uppercase gap-2"><Utensils className="h-3.5 w-3.5" /> Nutrition</TabsTrigger>
                </TabsList>
             </Tabs>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 md:p-4 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg text-primary">
                <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg md:text-2xl font-black tracking-tight leading-tight">{format(selectedDate, 'MMMM yyyy')}</h2>
                <p className="text-[8px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Reporting Period</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={() => setIsAuditModalOpen(true)} className="h-8 md:h-9 px-2 md:px-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20">
                <History className="h-3.5 w-3.5" /> Room history
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className="h-8 md:h-9 px-2 md:px-3 text-[10px] md:text-xs">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {format(subMonths(selectedDate, 1), 'MMM')}
              </Button>
              <Button variant="secondary" size="sm" disabled className="h-8 md:h-9 font-bold px-3 md:px-6 whitespace-nowrap text-[10px] md:text-xs">
                Current
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
             {activeAuditType === 'financial' ? (
                <Card className="shadow-md border-t-4 border-t-primary rounded-2xl overflow-hidden relative lg:col-span-2">
                  <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black uppercase">
                      <TableProperties className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      Expense Pool Tally
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-4 md:p-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-muted/10 border border-dashed">
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Monthly Pool</p>
                          <p className="text-2xl font-black tracking-tighter">₹{financialTotals.budget.toLocaleString()}</p>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase mt-1">Strategic baseline</p>
                       </div>
                       <div className="p-4 rounded-2xl bg-muted/10 border border-dashed">
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Total Spent</p>
                          <p className="text-2xl font-black tracking-tighter">₹{financialTotals.spent.toLocaleString()}</p>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase mt-1">Verified tallies</p>
                       </div>
                    </div>
                    <div className="p-5 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Remaining Vault</p>
                          <p className="text-sm font-medium text-muted-foreground">Strategic headroom available</p>
                       </div>
                       <p className={cn("text-3xl md:text-4xl font-black tracking-tighter", financialTotals.remaining >= 0 ? "text-primary" : "text-destructive")}>
                          ₹{financialTotals.remaining.toLocaleString()}
                       </p>
                    </div>
                  </CardContent>
                </Card>
             ) : (
                <Card className="shadow-md border-t-4 border-t-orange-400 rounded-2xl overflow-hidden relative lg:col-span-2">
                  <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black uppercase">
                      <Utensils className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                      Intake status vault
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-4 md:p-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-muted/10 border border-dashed">
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Daily intake target</p>
                          <p className="text-2xl font-black tracking-tighter text-orange-500">{nutritionTotals.target} kcal</p>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase mt-1">Planned strategic baseline</p>
                       </div>
                       <div className="p-4 rounded-2xl bg-muted/10 border border-dashed">
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Daily average</p>
                          <p className="text-2xl font-black tracking-tighter">{Math.round(nutritionTotals.dailyAverage)} kcal</p>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase mt-1">{Math.round(nutritionTotals.dailyAverage)} vs last month</p>
                       </div>
                    </div>
                    <div className="p-5 rounded-[2rem] bg-orange-50/20 border border-orange-200 flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Burn efficiency</p>
                          <p className="text-sm font-medium text-muted-foreground">Utilization of daily target</p>
                       </div>
                       <p className="text-3xl md:text-4xl font-black tracking-tighter text-orange-600">
                          {nutritionTotals.efficiency}%
                       </p>
                    </div>
                  </CardContent>
                </Card>
             )}

            <Card className="shadow-md rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group relative" onClick={() => setIsAuditModalOpen(true)}>
              <CardHeader className="pb-2 pt-4 px-4 md:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm md:text-base flex items-center gap-2 font-black uppercase">
                   <PieChartIcon className="h-4 w-4 text-primary" />
                   {activeAuditType === 'financial' ? "Categories" : "Meal distribution"}
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
              </CardHeader>
              <CardContent className="h-[250px] p-0 flex items-center justify-center">
                {chartsData.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartsData.categoryData} cx="50%" cy="45%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                        {chartsData.categoryData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30 italic">No distribution data</div>}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 shadow-xl overflow-hidden rounded-3xl border-none ring-1 ring-border relative">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 pt-4 bg-muted/20 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <BarChartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg font-black tracking-tight uppercase">{activeAuditType === 'financial' ? "Spending Pulse" : "Fuel velocity"}</CardTitle>
                    <CardDescription className="text-[9px] uppercase font-bold tracking-tight">Temporal trend analysis</CardDescription>
                  </div>
                </div>
                <Tabs value={viewType} onValueChange={(v: any) => setViewType(v)} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-3 md:w-[240px] h-9 p-1 bg-muted/50 rounded-xl border">
                      <TabsTrigger value="weekly" className="text-[9px] font-black uppercase">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly" className="text-[9px] font-black uppercase">Monthly</TabsTrigger>
                      <TabsTrigger value="annual" className="text-[9px] font-black uppercase">Yearly</TabsTrigger>
                    </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="h-[300px] md:h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={chartsData.spendingData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                        <YAxis fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => activeAuditType === 'financial' ? `₹${v}` : `${v}`} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="spent" fill={activeAuditType === 'financial' ? "hsl(var(--primary))" : "hsl(var(--orange-400))"} radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isAuditModalOpen} onOpenChange={(open) => { setIsAuditModalOpen(open); if(!open) setActiveAuditCategoryId(null); }}>
            <DialogContent className="max-w-[98vw] md:max-w-4xl rounded-3xl p-0 overflow-hidden border shadow-2xl h-[90vh] flex flex-col">
               <div className="bg-primary p-5 text-white relative shrink-0 flex items-center justify-between border-b">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-3">
                       <CheckSquare className="h-6 w-6" />
                       Strategic Audit Ledger
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/70">
                       {activeAuditType === 'financial' ? "Wealth Reconciliation" : "Nutritional Verification"}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 mr-8">
                     <Button variant="outline" size="sm" onClick={downloadAuditCsv} className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-black uppercase text-[8px] tracking-widest h-8 px-4 rounded-xl gap-2">
                        <Download className="h-3 w-3" /> Audit CSV
                     </Button>
                  </div>
               </div>

               <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
                  {!activeAuditCategoryId ? (
                     <ScrollArea className="flex-1">
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                           {chartsData.categoryData.map((cat: any) => (
                              <div key={cat.name} onClick={() => setActiveAuditCategoryId(cat.name)} className="p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group shadow-sm">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-muted rounded-xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                       {activeAuditType === 'financial' ? <Coins className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                                    </div>
                                    <span className="text-xs font-black tracking-tighter">{activeAuditType === 'financial' ? '₹' : ''}{cat.value.toLocaleString()}</span>
                                 </div>
                                 <h4 className="text-[11px] font-black uppercase tracking-tight truncate mb-1">{cat.name}</h4>
                                 <p className="text-[8px] font-bold text-muted-foreground uppercase">Audit Node Distribution</p>
                              </div>
                           ))}
                        </div>
                     </ScrollArea>
                  ) : (
                     <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
                           <Button variant="ghost" size="sm" onClick={() => setActiveAuditCategoryId(null)} className="h-8 px-2 font-black uppercase text-[10px] gap-2">
                              <ArrowLeft className="h-4 w-4" /> Back to Analysis
                           </Button>
                           <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20">{activeAuditCategoryId}</Badge>
                        </div>
                        <ScrollArea className="flex-1">
                           <div className="p-4 space-y-3">
                              {auditItems.map((item: any, idx: number) => (
                                 <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-card border shadow-sm group hover:ring-1 hover:ring-primary/20 transition-all">
                                    <div className="flex items-center gap-4 min-w-0">
                                       <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black text-[10px] uppercase">{format(new Date(item.date), 'dd')}</div>
                                       <div className="min-w-0">
                                          <p className="text-sm font-black truncate uppercase tracking-tight">{item.displayDesc || item.foodName || 'SECURED ITEM'}</p>
                                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{format(new Date(item.date), 'MMM yyyy')}</p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-base font-black tracking-tighter">{activeAuditType === 'financial' ? `₹${item.amount.toLocaleString()}` : `${item.calories} kcal`}</p>
                                       {activeAuditType === 'nutrition' && <p className="text-[9px] font-black text-muted-foreground">₹{item.cost}</p>}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </ScrollArea>
                     </div>
                  )}
               </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
