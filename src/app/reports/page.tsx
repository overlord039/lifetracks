
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  eachWeekOfInterval,
  isSameWeek,
  subMonths,
  eachMonthOfInterval,
  endOfWeek,
  subWeeks,
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
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
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
  ArrowUp,
  ArrowDown,
  Zap,
  ArrowLeft,
  ChevronRight as ChevronRightIcon,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { decryptData, decryptNumber } from '@/lib/encryption';
import { useToast } from '@/hooks/use-toast';

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: '600'
};

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const PILLAR_ICONS: Record<string, any> = {
  expense: { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500' },
  savings: { icon: PiggyBank, color: 'text-green-500', bg: 'bg-green-500' },
  investment: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500' },
  health: { icon: HeartPulse, color: 'text-purple-500', bg: 'bg-purple-500' },
  personal: { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-500' }
};

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeAuditCategoryId, setActiveAuditCategoryId] = useState<string | null>(null);

  const [decryptedBudget, setDecryptedBudget] = useState<any>(null);
  const [decryptedPrevBudget, setDecryptedPrevBudget] = useState<any>(null);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedPrevExpenses, setDecryptedPrevExpenses] = useState<any[]>([]);
  const [decryptedCategories, setDecryptedCategories] = useState<any[]>([]);
  const [decryptedSalaryProfile, setDecryptedSalaryProfile] = useState<any>(null);
  const [decryptedAllBudgets, setDecryptedAllBudgets] = useState<any[]>([]);
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
  const { data: rawFixed, isLoading: isFixedLoading } = useCollection(fixedExpensesRef);

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

  const prevMonthExpensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'monthlyBudgets', prevMonthId, 'expenses');
  }, [firestore, user, prevMonthId]);
  const { data: rawPrevExpenses } = useCollection(prevMonthExpensesRef);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'expenseCategories');
  }, [firestore, user]);
  const { data: rawCategories } = useCollection(categoriesRef);

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

      try {
        if (rawBudget) {
          setDecryptedBudget({
            ...rawBudget,
            totalBudgetAmount: rawBudget.isEncrypted ? await decryptNumber(rawBudget.totalBudgetAmount, user.uid) : (rawBudget.totalBudgetAmount || 0),
            actualSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualSpent, user.uid) : (rawBudget.actualSpent || 0),
            actualFixedSpent: rawBudget.isEncrypted ? await decryptNumber(rawBudget.actualFixedSpent, user.uid) : (rawBudget.actualFixedSpent || 0),
          });
        } else {
          setDecryptedBudget(null);
        }

        if (rawPrevBudget) {
          setDecryptedPrevBudget({
            ...rawPrevBudget,
            totalBudgetAmount: rawPrevBudget.isEncrypted ? await decryptNumber(rawPrevBudget.totalBudgetAmount, user.uid) : (rawPrevBudget.totalBudgetAmount || 0),
            actualSpent: rawPrevBudget.isEncrypted ? await decryptNumber(rawPrevBudget.actualSpent, user.uid) : (rawPrevBudget.actualSpent || 0),
            actualFixedSpent: rawPrevBudget.isEncrypted ? await decryptNumber(rawPrevBudget.actualFixedSpent, user.uid) : (rawPrevBudget.actualFixedSpent || 0),
          });
        } else {
          setDecryptedPrevBudget(null);
        }

        if (rawFixed) {
          const fixed = await Promise.all(rawFixed.map(async f => ({
            ...f,
            name: f.isEncrypted ? await decryptData(f.name, user.uid) : (f.name || ''),
            amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
            allocationBucket: f.allocationBucket || 'expense'
          })));
          setDecryptedFixed(fixed);
        } else {
          setDecryptedFixed([]);
        }

        if (rawExpenses) {
          const exps = await Promise.all(rawExpenses.map(async e => ({
            ...e,
            description: e.isEncrypted ? await decryptData(e.description, user.uid) : (e.description || ''),
            amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
            allocationBucket: e.allocationBucket || 'expense'
          })));
          setDecryptedExpenses(exps);
        } else {
          setDecryptedExpenses([]);
        }

        if (rawPrevExpenses) {
          const pExps = await Promise.all(rawPrevExpenses.map(async e => ({
            ...e,
            amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
            allocationBucket: e.allocationBucket || 'expense'
          })));
          setDecryptedPrevExpenses(pExps);
        }

        if (rawCategories) {
          const cats = await Promise.all(rawCategories.map(async c => ({
            ...c,
            name: c.isEncrypted ? await decryptData(c.name, user.uid) : (c.name || ''),
          })));
          setDecryptedCategories(cats);
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
      } catch (err) {
        console.error("Decryption failed in Reports", err);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptAll();
  }, [rawBudget, rawPrevBudget, rawFixed, rawExpenses, rawPrevExpenses, rawCategories, rawSalaryProfile, rawAllBudgets, user, mounted]);

  const totals = useMemo(() => {
    const budget = decryptedBudget?.totalBudgetAmount || 0;
    const fixed = (decryptedFixed || []).filter(f => f.includeInBudget && (f.allocationBucket || 'expense') === 'expense').reduce((s, f) => s + f.amount, 0);
    const daily = (decryptedExpenses || []).filter(e => (e.allocationBucket || 'expense') === 'expense').reduce((s, e) => s + e.amount, 0);
    const spent = fixed + daily;
    const remaining = budget - spent;

    const prevDaily = (decryptedPrevExpenses || []).filter(e => (e.allocationBucket || 'expense') === 'expense').reduce((s, e) => s + e.amount, 0);
    const prevBudget = decryptedPrevBudget?.totalBudgetAmount || 0;
    const prevSpent = (decryptedPrevBudget?.actualSpent || 0) + (decryptedPrevBudget?.actualFixedSpent || 0);

    return {
      budget,
      fixed,
      daily,
      spent,
      remaining,
      prevDaily,
      prevBudget,
      prevSpent,
      dailyDiff: daily - prevDaily,
      spentDiff: spent - prevSpent,
      budgetDiff: budget - prevBudget
    };
  }, [decryptedBudget, decryptedFixed, decryptedExpenses, decryptedPrevExpenses, decryptedPrevBudget]);

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

  const weeklyReport = useMemo(() => {
    const targetExps = categoryFilter === 'all' 
      ? (decryptedExpenses || [])
      : (decryptedExpenses || []).filter(e => e.expenseCategoryId === categoryFilter);

    if (!decryptedExpenses) return { currentWeekSpent: 0, lastWeekSpent: 0, weeklyData: [] };

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

    const weeklyData = weeks.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart);
      const spent = targetExps
        .filter(exp => (exp.allocationBucket || 'expense') === 'expense')
        .filter(exp => {
          const d = new Date(exp.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const rangeStr = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
      return {
        name: `Week ${idx + 1} (${rangeStr})`,
        spent,
        range: rangeStr
      };
    });

    const today = new Date();
    const isSelectedMonthCurrent = format(selectedDate, 'yyyyMM') === format(today, 'yyyyMM');
    
    let currentWeekSpent = 0;
    let lastWeekSpent = 0;

    if (isSelectedMonthCurrent) {
       currentWeekSpent = targetExps
        .filter(exp => (exp.allocationBucket || 'expense') === 'expense')
        .filter(exp => isSameWeek(new Date(exp.date), today))
        .reduce((sum, exp) => sum + exp.amount, 0);
       
       lastWeekSpent = targetExps
        .filter(exp => (exp.allocationBucket || 'expense') === 'expense')
        .filter(exp => isSameWeek(new Date(exp.date), subWeeks(today, 1)))
        .reduce((sum, exp) => sum + exp.amount, 0);
    } else {
      const lastWeek = weeklyData[weeklyData.length - 1];
      const prevWeek = weeklyData[weeklyData.length - 2];
      currentWeekSpent = lastWeek?.spent || 0;
      lastWeekSpent = prevWeek?.spent || 0;
    }

    return { currentWeekSpent, lastWeekSpent, weeklyData };
  }, [decryptedExpenses, selectedDate, categoryFilter]);

  const chartsData = useMemo(() => {
    if (!decryptedExpenses || !decryptedFixed) {
      return { spendingData: [], categoryData: [], highest: 0, lowest: 0, average: 0 };
    }

    const targetExps = categoryFilter === 'all' 
      ? decryptedExpenses 
      : decryptedExpenses.filter(e => e.expenseCategoryId === categoryFilter);

    const categoryTotals: Record<string, number> = {};
    const allItems = [...decryptedExpenses, ...decryptedFixed];
    allItems.forEach(item => {
      const cat = decryptedCategories?.find(c => c.id === item.expenseCategoryId);
      const catName = cat?.name || 'Misc';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + item.amount;
    });

    const cData = Object.entries(categoryTotals).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    let sData: any[] = [];

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
      const dailyExpensesMap: Record<string, number> = {};
      
      targetExps
        .filter(e => (e.allocationBucket || 'expense') === 'expense')
        .forEach(exp => {
          dailyExpensesMap[exp.date] = (dailyExpensesMap[exp.date] || 0) + exp.amount;
        });

      sData = days
        .map(d => {
          return {
            name: format(d, 'd'),
            spent: dailyExpensesMap[format(d, 'yyyy-MM-dd')] || 0,
            fullLabel: format(d, 'dd MMM yyyy')
          };
        });
    } else if (viewType === 'annual') {
      const yearStart = startOfYear(selectedDate);
      const yearEnd = endOfYear(selectedDate);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const budgetMap: Record<string, any> = {};
      (decryptedAllBudgets || []).forEach(b => {
        budgetMap[b.id] = b;
      });

      sData = months.map(m => {
        const mKey = format(m, 'yyyyMM');
        const b = budgetMap[mKey];
        return {
          name: format(m, 'MMM'),
          spent: (b?.actualSpent || 0) + (b?.actualFixedSpent || 0),
          budgeted: b?.totalBudgetAmount || 0,
          fullLabel: format(m, 'MMMM yyyy')
        };
      });
    }

    const activeEntries = sData.filter(d => d.spent > 0);
    const spentValues = activeEntries.map(d => d.spent);
    const highest = spentValues.length > 0 ? Math.max(...spentValues) : 0;
    const lowest = spentValues.length > 0 ? Math.min(...spentValues) : 0;
    const average = spentValues.length > 0 ? spentValues.reduce((a, b) => a + b, 0) / sData.length : 0;
    const hasVariation = activeEntries.length > 1 && highest !== lowest;

    sData = sData.map(d => ({
      ...d,
      fill: (hasVariation && d.spent === highest && d.spent > 0)
        ? "hsl(var(--destructive))"
        : (hasVariation && d.spent === lowest && d.spent > 0)
          ? "hsl(var(--secondary))"
          : "hsl(var(--primary))"
    }));

    return { spendingData: sData, categoryData: cData, highest, lowest, average };
  }, [decryptedExpenses, decryptedFixed, decryptedCategories, decryptedAllBudgets, selectedDate, viewType, weeklyReport, categoryFilter]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => subMonths(prev, -delta));
    setActiveAuditCategoryId(null);
  };

  const auditExpenses = useMemo(() => {
    if (!activeAuditCategoryId) return [];
    
    const targetCat = decryptedCategories.find(c => c.id === activeAuditCategoryId);
    const targetCatName = targetCat?.name || 'Misc';

    const combined = [
      ...(decryptedExpenses || []).map(e => {
        const cat = decryptedCategories.find(c => c.id === e.expenseCategoryId);
        const catName = cat?.name || 'Misc';
        return { 
          ...e, 
          type: 'daily', 
          displayDesc: (e.description && e.description.trim()) ? e.description : catName,
          catName,
          sortDate: e.date || ''
        };
      }),
      ...(decryptedFixed || []).map(f => {
        const cat = decryptedCategories.find(c => c.id === f.expenseCategoryId);
        const catName = cat?.name || 'Misc';
        return { 
          ...f, 
          type: 'fixed', 
          displayDesc: (f.name && f.name.trim()) ? f.name : catName, 
          catName,
          date: format(selectedDate, 'yyyy-MM-01'),
          sortDate: format(selectedDate, 'yyyy-MM-01') 
        };
      })
    ];

    return combined
      .filter(item => {
        const matchesId = (item.expenseCategoryId || 'misc') === activeAuditCategoryId;
        const matchesName = item.catName === targetCatName;
        return matchesId || matchesName;
      })
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  }, [decryptedExpenses, decryptedFixed, activeAuditCategoryId, selectedDate, decryptedCategories]);

  const downloadAuditCsv = () => {
    const combined = [
      ...(decryptedExpenses || []).map(e => {
        const cat = decryptedCategories.find(c => c.id === e.expenseCategoryId);
        const catName = cat?.name || 'MISC';
        return { ...e, description: (e.description && e.description.trim()) ? e.description : catName, catName };
      }),
      ...(decryptedFixed || []).map(f => {
        const cat = decryptedCategories.find(c => c.id === f.expenseCategoryId);
        const catName = cat?.name || 'MISC';
        return { ...f, description: (f.name && f.name.trim()) ? f.name : catName, date: format(selectedDate, 'yyyy-MM-01'), catName };
      })
    ];

    if (combined.length === 0) {
      toast({ title: "No Data", description: "No records found to export for this month." });
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Pillar', 'Amount (₹)'];
    const rows = combined.sort((a,b) => b.date.localeCompare(a.date)).map(item => {
      return [
        item.date,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.catName || 'MISC').replace(/"/g, '""')}"`,
        item.allocationBucket || 'expense',
        item.amount
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LifeTrack_Audit_${format(selectedDate, 'yyyyMM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Audit Exported", description: "CSV has been saved to your downloads." });
  };

  const weekDiff = weeklyReport.currentWeekSpent - weeklyReport.lastWeekSpent;

  return (
    <AppShell>
      {!mounted ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Vault...</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
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
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <Button variant="outline" size="sm" onClick={() => setIsAuditModalOpen(true)} className="h-8 md:h-9 px-2 md:px-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20">
                <History className="h-3.5 w-3.5" /> Tranc History
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
              <Button variant="outline" size="sm" onClick={() => changeMonth(-1)} className="h-8 md:h-9 px-2 md:px-3 flex-1 md:flex-initial text-[10px] md:text-xs">
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5 md:mr-1" /> {format(prevDate, 'MMM')}
              </Button>
              <Button variant="secondary" size="sm" disabled className="h-8 md:h-9 font-bold px-3 md:px-6 flex-1 md:flex-initial whitespace-nowrap text-[10px] md:text-xs">
                Current
              </Button>
            </div>
          </div>

          <div className={cn("grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 transition-opacity", isDecrypting && "opacity-80")}>
            <Card className="shadow-md border-t-4 border-t-primary rounded-2xl overflow-hidden relative">
              {isBudgetLoading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                  <TableProperties className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Expense Pool Tally
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start text-xs md:sm">
                    <div className="flex flex-col">
                      <span className="text-foreground font-black uppercase text-[10px] tracking-tight">Monthly Pool</span>
                      <span className="text-muted-foreground text-[9px] font-medium leading-tight">Total target for Expenses pillar</span>
                    </div>
                    <span className="font-black text-lg tracking-tighter">₹{totals.budget.toLocaleString()}</span>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="space-y-2">
                    <p className="text-foreground font-black uppercase text-[10px] tracking-tight">Total Amount Spends</p>
                    
                    <div className="pl-2 space-y-1.5 border-l-2 border-primary/20">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-bold uppercase tracking-tighter">Fixed Vault</span>
                        <span className="font-black">₹{totals.fixed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-bold uppercase tracking-tighter">Daily Spends</span>
                        <span className="font-black">₹{totals.daily.toLocaleString()}</span>
                      </div>
                      
                      <Separator className="my-1 border-dashed" />
                      
                      <div className="flex justify-between items-start">
                        <span className="text-foreground font-black uppercase text-[10px]">Total</span>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-lg tracking-tighter">₹{totals.spent.toLocaleString()}</span>
                          {totals.spentDiff !== 0 && (
                            <span className={cn(
                              "text-[8px] md:text-[9px] font-bold flex items-center gap-0.5",
                              totals.spentDiff > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                            )}>
                              {totals.spentDiff > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                              ₹{Math.abs(totals.spentDiff).toLocaleString()} {totals.spentDiff > 0 ? 'Greater' : 'Less'} than {format(prevDate, 'MMM')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-1 md:pt-2 flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Remaining Vault</p>
                    <p className="text-[9px] text-muted-foreground font-medium mb-1">Funds available before exhaustion</p>
                  </div>
                  <p className={cn(
                    "text-3xl md:text-4xl font-black tracking-tighter leading-none text-right",
                    totals.remaining >= 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    ₹{totals.remaining.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md lg:col-span-1 rounded-2xl overflow-hidden relative">
              {(isExpensesLoading || isDecrypting) && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>}
              <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                  Weekly Pulse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="h-[80px] md:h-[100px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={weeklyReport.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} stroke="hsl(var(--muted-foreground))" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={8}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="spent" fill="#FFB74D" radius={[2, 2, 0, 0]} />
                      <Tooltip 
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number) => `₹${v.toLocaleString()}`}
                        labelClassName="text-[10px] font-bold text-popover-foreground"
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="pt-1 md:pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground">Current Week</span>
                    <span className="text-xs md:sm font-black">₹{weeklyReport.currentWeekSpent.toLocaleString()}</span>
                  </div>
                  {weeklyReport.lastWeekSpent > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn(
                        "text-[9px] md:text-[10px] font-bold flex items-center",
                        weekDiff > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                      )}>
                        {weekDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        ₹{Math.abs(weekDiff).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-orange-50/50 dark:bg-orange-950/20 py-2 border-t px-4">
                <p className="text-[9px] font-bold text-orange-700 dark:text-orange-400 mx-auto uppercase tracking-tighter">
                  {weekDiff > 0 ? "Weekly spend trending up" : weekDiff < 0 ? "Spending less this week" : "Stable weekly pace"}
                </p>
              </CardFooter>
            </Card>

            <Card 
              className="shadow-md lg:col-span-1 rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group relative"
              onClick={() => setIsAuditModalOpen(true)}
            >
              {(isExpensesLoading || isDecrypting) && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-secondary-foreground" /></div>}
              <CardHeader className="pb-2 pt-4 px-4 md:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base md:text-lg flex items-center gap-2 font-black">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
                  Categories
                </CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="h-[180px] md:h-[200px] p-0 flex items-center justify-center relative">
                {chartsData.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartsData.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartsData.categoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-xs italic py-10">
                    No categorical data.
                  </div>
                )}
                <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest bg-background/80 backdrop-blur-sm mx-auto w-fit px-2 py-0.5 rounded-full shadow-sm">Click to Audit Spends</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-4 shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden relative">
              {isDecrypting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              <CardHeader className="bg-muted/30 border-b py-4 md:py-5 px-5 md:px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl font-black flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Strategic Income Allocation
                  </CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-tight opacity-70">Wealth strategy utilization for {format(selectedDate, 'MMMM')}</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase px-3 py-1">
                  Strategic Health
                </Badge>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {!allocationReport ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50 grayscale">
                    <Target className="h-12 w-12 text-muted-foreground" />
                    <p className="text-xs font-black uppercase tracking-widest">No strategic profile linked</p>
                    <Button variant="outline" asChild className="rounded-xl h-9 text-[10px] font-black uppercase">
                      <a href="/salary-planner">Configure Strategy</a>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-3">
                    {allocationReport.map(pillar => {
                      const Config = PILLAR_ICONS[pillar.id] || { icon: Coins, color: 'text-primary', bg: 'bg-primary' };
                      const Icon = Config.icon;
                      const isOverspent = pillar.utilization > 100;
                      
                      return (
                        <div key={pillar.id} className="space-y-3 p-3 md:p-4 rounded-2xl border bg-muted/5 transition-all hover:bg-muted/10 group">
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

            <Card className="md:col-span-2 lg:col-span-4 shadow-xl overflow-hidden rounded-3xl border-none ring-1 ring-border relative">
              {isDecrypting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 pt-4 bg-muted/20 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <BarChartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg font-black tracking-tight">Spending Tracker</CardTitle>
                    <CardDescription className="text-[9px] md:text-[10px] uppercase font-bold tracking-tight">Track how your spending changes over time.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                  <Tabs value={viewType} onValueChange={(v: any) => setViewType(v)} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-3 md:w-[240px] h-9 p-1 bg-muted/50 rounded-xl border">
                      <TabsTrigger value="weekly" className="text-[9px] font-black uppercase">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly" className="text-[9px] font-black uppercase">Monthly</TabsTrigger>
                      <TabsTrigger value="annual" className="text-[9px] font-black uppercase">Annual</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <div className="p-3 rounded-2xl bg-destructive/5 border border-destructive/10 flex flex-col items-center justify-center space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-destructive">Highest</p>
                    <p className="text-sm md:text-base font-black tracking-tighter text-destructive">₹{Math.round(chartsData.highest).toLocaleString()}</p>
                    <ArrowUp className="h-3 w-3 text-destructive opacity-30" />
                  </div>
                  <div className="p-3 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col items-center justify-center space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-secondary-foreground">Lowest</p>
                    <p className="text-sm md:text-base font-black tracking-tighter text-secondary-foreground">₹{Math.round(chartsData.lowest).toLocaleString()}</p>
                    <ArrowDown className="h-3 w-3 text-secondary opacity-30" />
                  </div>
                  <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary">Average</p>
                    <p className="text-sm md:text-base font-black tracking-tighter text-primary">₹{Math.round(chartsData.average).toLocaleString()}</p>
                    <Zap className="h-3 w-3 text-primary opacity-30" />
                  </div>
                </div>

                <div className="h-[250px] md:h-[400px] w-full pt-4 -ml-4 md:ml-0 relative">
                  {viewType !== 'annual' && (
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 shadow-sm">
                            <Filter className={cn("h-3.5 w-3.5", categoryFilter !== 'all' ? "text-primary" : "text-muted-foreground")} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground py-1.5 px-2">Filter by Label</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                            <DropdownMenuRadioItem value="all" className="text-[9px] font-black uppercase py-1.5">All Labels</DropdownMenuRadioItem>
                            {decryptedCategories.map(cat => (
                              <DropdownMenuRadioItem key={cat.id} value={cat.id} className="text-[9px] font-black uppercase py-1.5">
                                {cat.name}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart 
                      data={chartsData.spendingData} 
                      margin={{ left: -10, right: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} stroke="hsl(var(--muted-foreground))" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={8} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                        axisLine={{ stroke: 'hsl(var(--border))' }} 
                        tickLine={false}
                        interval={0}
                        angle={viewType === 'weekly' ? -15 : 0}
                        textAnchor={viewType === 'weekly' ? "end" : "middle"}
                      />
                      <YAxis fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                      <Tooltip 
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                        formatter={(value: number, name: string, props: any) => [
                          `₹${value.toLocaleString()}`, 
                          props.payload.fullLabel || props.payload.name
                        ]} 
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Bar 
                        dataKey="spent" 
                        radius={[4, 4, 0, 0]} 
                        name="Actual Spend" 
                        animationDuration={1000}
                      >
                        {chartsData.spendingData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                      {viewType === 'annual' && (
                        <Bar dataKey="budgeted" radius={[4, 4, 0, 0]} name="Target Budget" fill="hsl(var(--muted))" fillOpacity={0.3} animationDuration={1000} />
                      )}
                      {chartsData.highest > 0 && (
                        <ReferenceLine 
                          y={chartsData.highest} 
                          stroke="hsl(var(--destructive))" 
                          strokeDasharray="4 4" 
                          label={{ value: `High: ₹${Math.round(chartsData.highest)}`, position: 'insideTopLeft', fill: 'hsl(var(--destructive))', fontSize: 8, fontWeight: 'bold' }} 
                        />
                      )}
                      {chartsData.lowest > 0 && chartsData.lowest !== chartsData.highest && (
                        <ReferenceLine 
                          y={chartsData.lowest} 
                          stroke="hsl(var(--secondary))" 
                          strokeDasharray="4 4" 
                          label={{ value: `Low: ₹${Math.round(chartsData.lowest)}`, position: 'insideBottomLeft', fill: 'hsl(var(--secondary))', fontSize: 8, fontWeight: 'bold' }} 
                        />
                      )}
                      {chartsData.average > 0 && (
                        <ReferenceLine 
                          y={chartsData.average} 
                          stroke="hsl(var(--primary))" 
                          strokeDasharray="3 3" 
                          label={{ value: `Avg: ₹${Math.round(chartsData.average)}`, position: 'right', fill: 'hsl(var(--primary))', fontSize: 8, fontWeight: 'bold' }} 
                        />
                      )}
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isAuditModalOpen} onOpenChange={(open) => { setIsAuditModalOpen(open); if(!open) setActiveAuditCategoryId(null); }}>
            <DialogContent className="max-w-[98vw] md:max-w-4xl rounded-none md:rounded-2xl p-0 overflow-hidden border shadow-2xl h-[95vh] md:h-[80vh] flex flex-col">
              <div className="bg-primary p-4 sm:p-5 text-primary-foreground relative shrink-0 flex items-center justify-between gap-4 border-b">
                <div className="flex flex-col space-y-0.5">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-lg md:text-xl font-black tracking-tighter flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      Category Audit
                    </DialogTitle>
                    <DialogDescription className="text-[9px] font-black uppercase tracking-widest text-primary-foreground/70 hidden sm:block">
                      {activeAuditCategoryId ? "Detailed Ledger View" : "Spend reconciliation"}
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="flex items-center gap-2 mr-8">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAuditCsv}
                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-black uppercase text-[8px] tracking-widest h-7 px-2 rounded-lg gap-1.5"
                  >
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden relative">
                {!activeAuditCategoryId ? (
                  <ScrollArea className="flex-1">
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {chartsData.categoryData.length > 0 ? chartsData.categoryData.map((cat: any) => {
                        const catItem = decryptedCategories.find(c => c.name === cat.name);
                        const catId = catItem?.id || 'misc';
                        
                        const targetCatName = cat.name;
                        const dailyCount = (decryptedExpenses || []).filter(e => {
                           const eCat = decryptedCategories.find(c => c.id === e.expenseCategoryId);
                           const eCatName = eCat?.name || 'Misc';
                           return e.expenseCategoryId === catId || eCatName === targetCatName;
                        }).length;
                        const fixedCount = (decryptedFixed || []).filter(f => {
                           const fCat = decryptedCategories.find(c => c.id === f.expenseCategoryId);
                           const fCatName = fCat?.name || 'Misc';
                           return f.expenseCategoryId === catId || fCatName === targetCatName;
                        }).length;
                        const totalCount = dailyCount + fixedCount;
                        
                        return (
                          <div 
                            key={catId + cat.name} 
                            className="flex flex-col justify-between p-3 rounded-xl border transition-all cursor-pointer group hover:border-primary/50 hover:shadow-md bg-card shadow-sm"
                            onClick={() => setActiveAuditCategoryId(catId)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="p-1.5 bg-muted rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <ReceiptText className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-black tracking-tighter text-foreground">₹{cat.value.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase truncate tracking-tight leading-tight">{cat.name}</span>
                                <ChevronRightIcon className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                              </div>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none mt-1">{totalCount} Items in ledger</span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale space-y-2 col-span-2">
                          <BarChartIcon className="h-10 w-10" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-center">No audit records found for this period</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-3 border-b bg-muted/[0.05] flex items-center justify-between shrink-0 px-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveAuditCategoryId(null)}
                        className="h-8 px-2 font-black uppercase text-[10px] gap-2 hover:bg-primary/5"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to Labels
                      </Button>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                          {decryptedCategories.find(c => c.id === activeAuditCategoryId)?.name || 'Misc'}
                        </p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 border-primary/20 text-primary px-2 py-0.5 leading-none">
                          {auditExpenses.length} Records
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="p-3 sm:p-4">
                        {auditExpenses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                            {auditExpenses.map((item) => (
                              <div 
                                key={item.id} 
                                className="flex justify-between items-center p-3.5 rounded-xl bg-card border shadow-sm group hover:border-primary/20 transition-all relative overflow-hidden"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                                  <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0">
                                    <span className="text-[10px] font-black uppercase">{format(new Date(item.date), 'dd')}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-black truncate tracking-tight text-foreground">
                                      {item.displayDesc || item.catName || 'SECURED ITEM'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[8px] font-black uppercase text-muted-foreground">
                                        {format(new Date(item.date), 'MMM yyyy')}
                                      </span>
                                      <Separator orientation="vertical" className="h-2" />
                                      <span className="text-[8px] text-primary/60 font-black uppercase truncate">
                                        {item.allocationBucket || 'Expense'}
                                      </span>
                                      {item.type === 'fixed' && (
                                        <Badge className="h-3 px-1 text-[6px] uppercase font-black bg-orange-100 text-orange-700 border-none">Recurring</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right ml-4 relative z-10">
                                  <span className="text-base font-black tracking-tighter text-foreground">
                                    ₹{item.amount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <ReceiptText className="h-10 w-10 text-primary/20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                              where are the transactions
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    
                    <div className="p-4 border-t bg-card shrink-0 flex flex-row items-center justify-between shadow-sm relative z-20">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Verified Label Sum</span>
                        <p className="text-[12px] font-black text-foreground uppercase tracking-tight">
                          {decryptedCategories.find(c => c.id === activeAuditCategoryId)?.name || 'Misc'} Workspace
                        </p>
                      </div>
                      
                      <div className="bg-primary/[0.04] px-5 py-2.5 rounded-2xl border border-dashed border-primary/20 flex flex-row items-center gap-4 shadow-inner">
                        <p className="text-2xl font-black text-primary tracking-tighter leading-none">
                          ₹{auditExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
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
