"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { 
  Calculator, 
  TrendingUp, 
  HeartPulse, 
  Smile, 
  PiggyBank, 
  Info, 
  Save, 
  ChevronRight,
  Wallet,
  Coins,
  ShieldCheck,
  Target,
  Loader2,
  Pencil,
  Lock,
  Unlock,
  Plus,
  Trash2,
  BrainCircuit,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import Link from 'next/link';

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const STANDARD_PILLARS = [
  { id: 'expense', label: 'EXPENSES', icon: Wallet, color: '#64B5F6' },
  { id: 'savings', label: 'SAVINGS', icon: PiggyBank, color: '#81C784' },
  { id: 'investment', label: 'INVESTMENTS', icon: TrendingUp, color: '#FFB74D' },
  { id: 'health', label: 'HEALTH', icon: HeartPulse, color: '#BA68C8' },
  { id: 'personal', label: 'PERSONAL', icon: Smile, color: '#F06292' }
];

const DEFAULT_RATIOS: Record<string, number> = {
  expense: 50,
  savings: 20,
  investment: 20,
  health: 5,
  personal: 5
};

export default function SalaryPlannerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [lockedPillars, setLockedPillars] = useState<Set<string>>(new Set());
  const [newPillarName, setNewPillarName] = useState('');
  
  const [salary, setSalary] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [percents, setPercents] = useState<Record<string, number>>(DEFAULT_RATIOS);
  const [pillars, setPillars] = useState<any[]>(STANDARD_PILLARS);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monthId = mounted ? format(new Date(), 'yyyyMM') : '';

  const salaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'salaryProfiles', 'current');
  }, [db, user]);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [db, user, monthId]);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [db, user, monthId]);

  const { data: savedProfile } = useDoc(salaryRef);
  const { data: rawFixed } = useCollection(fixedExpensesRef);
  const { data: rawExpenses } = useCollection(monthExpensesRef);
  
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);

  useEffect(() => {
    const decryptProfile = async () => {
      if (savedProfile && user && mounted) {
        setIsDecrypting(true);
        const s = savedProfile.isEncrypted ? await decryptData(savedProfile.salary, user.uid) : (savedProfile.salary?.toString() || '');
        const a = savedProfile.isEncrypted ? await decryptData(savedProfile.age, user.uid) : (savedProfile.age?.toString() || '');
        
        setSalary(s);
        setAge(a);

        if (savedProfile.pillars && Array.isArray(savedProfile.pillars)) {
          const restored = savedProfile.pillars.map((p: any) => ({
            ...p,
            icon: STANDARD_PILLARS.find(s => s.id === p.id)?.icon || Coins
          }));
          setPillars(restored);
          setPercents(savedProfile.percents || DEFAULT_RATIOS);
        } else {
          setPercents({
            expense: savedProfile.expensePercent || 50,
            savings: savedProfile.savingsPercent || 20,
            investment: savedProfile.investmentPercent || 20,
            health: savedProfile.healthPercent || 5,
            personal: savedProfile.personalPercent || 5
          });
        }
        
        setShowResults(true);
        setIsDecrypting(false);
      }
    };
    decryptProfile();
  }, [savedProfile, user, mounted]);

  useEffect(() => {
    const decryptFixedData = async () => {
      if (rawFixed && user && mounted) {
        const fixed = await Promise.all(rawFixed.map(async f => ({
          ...f,
          amount: f.isEncrypted ? await decryptNumber(f.amount, user.uid) : (f.amount || 0),
          allocationBucket: f.allocationBucket || 'expense'
        })));
        setDecryptedFixed(fixed);
      }
    };
    decryptFixedData();
  }, [rawFixed, user, mounted]);

  useEffect(() => {
    const decryptExps = async () => {
      if (rawExpenses && user && mounted) {
        const exps = await Promise.all(rawExpenses.map(async e => ({
          ...e,
          amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : (e.amount || 0),
          allocationBucket: e.allocationBucket || 'expense'
        })));
        setDecryptedExpenses(exps);
      }
    };
    decryptExps();
  }, [rawExpenses, user, mounted]);

  const committedCosts = useMemo(() => {
    const totals: Record<string, number> = {};
    pillars.forEach(p => totals[p.id] = 0);
    
    decryptedFixed.forEach(f => {
      if (totals[f.allocationBucket] !== undefined) {
        totals[f.allocationBucket] += f.amount;
      }
    });
    
    decryptedExpenses.forEach(e => {
      const bucket = e.allocationBucket || 'expense';
      if (totals[bucket] !== undefined) {
        totals[bucket] += e.amount;
      }
    });
    
    return totals;
  }, [decryptedFixed, decryptedExpenses, pillars]);

  const numSalary = parseFloat(salary) || 0;
  const numAge = parseInt(age) || 0;

  const toggleLock = (id: string) => {
    setLockedPillars(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updatePercent = useCallback((id: string, newVal: number) => {
    const sanitizedVal = Math.min(100, Math.max(0, newVal));
    setPercents(prev => {
      const oldVal = prev[id] ?? 0;
      if (oldVal === sanitizedVal) return prev;
      
      const nextPercents = { ...prev, [id]: sanitizedVal };
      const adjustKeys = Object.keys(prev).filter(k => k !== id && !lockedPillars.has(k));
      
      if (adjustKeys.length === 0) return nextPercents;

      const fixedSum = Object.entries(nextPercents)
        .filter(([k]) => k === id || lockedPillars.has(k))
        .reduce((sum, [, val]) => sum + val, 0);

      const targetRemaining = Math.max(0, 100 - fixedSum);
      const currentOthersTotal = adjustKeys.reduce((sum, k) => sum + (prev[k] ?? 0), 0);

      if (currentOthersTotal > 0) {
        const multiplier = targetRemaining / currentOthersTotal;
        adjustKeys.forEach(k => {
          nextPercents[k] = Math.max(0, Math.round((prev[k] ?? 0) * multiplier * 10) / 10);
        });
      } else {
        const count = adjustKeys.length;
        adjustKeys.forEach(k => {
          nextPercents[k] = Math.round((targetRemaining / count) * 10) / 10;
        });
      }

      const currentSum = Object.values(nextPercents).reduce((a, b) => a + b, 0);
      const diff = 100 - currentSum;
      if (Math.abs(diff) > 0.01 && adjustKeys.length > 0) {
        const keyToAdjust = adjustKeys[0];
        nextPercents[keyToAdjust] = Math.round((nextPercents[keyToAdjust] + diff) * 10) / 10;
      }

      return nextPercents;
    });
  }, [lockedPillars]);

  const updateAmount = useCallback((id: string, val: string) => {
    const numVal = parseFloat(val) || 0;
    const newPercent = numSalary > 0 ? (numVal / numSalary) * 100 : 0;
    updatePercent(id, newPercent);
  }, [numSalary, updatePercent]);

  const amounts = useMemo(() => {
    const ams: Record<string, number> = {};
    Object.entries(percents).forEach(([id, p]) => {
      ams[id] = numSalary * (p / 100);
    });
    return ams;
  }, [numSalary, percents]);

  const invAllocation = useMemo(() => {
    const equityP = Math.min(Math.max(100 - numAge, 30), 80);
    const goldP = 5;
    const debtP = 100 - equityP - goldP;
    const invAmt = amounts['investment'] || 0;
    return {
      equityP, debtP, goldP,
      equityAmt: invAmt * (equityP / 100),
      debtAmt: invAmt * (debtP / 100),
      goldAmt: invAmt * (goldP / 100)
    };
  }, [numAge, amounts]);

  const salaryData = useMemo(() => {
    return pillars.map(p => ({
      name: p.label,
      value: amounts[p.id] || 0,
      color: p.color
    })).filter(d => d.value > 0);
  }, [pillars, amounts]);

  const invData = useMemo(() => [
    { name: 'Equity', value: invAllocation.equityAmt, color: '#BA68C8' },
    { name: 'Debt', value: invAllocation.debtAmt, color: '#64B5F6' },
    { name: 'Gold', value: invAllocation.goldAmt, color: '#FFD54F' }
  ].filter(d => d.value > 0), [invAllocation]);

  const totalPercent = useMemo(() => Math.round(Object.values(percents).reduce((a, b) => a + b, 0)), [percents]);

  const handleSave = async () => {
    if (!user || !salaryRef) return;
    setDocumentNonBlocking(salaryRef, {
      userId: user.uid,
      salary: await encryptData(salary, user.uid),
      age: await encryptData(age, user.uid),
      percents: percents,
      pillars: pillars.map(p => ({ id: p.id, label: p.label, color: p.color })),
      isEncrypted: true,
      createdAt: savedProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    toast({ title: 'Plan Secured', description: 'Strategy encrypted and saved to vault.' });
  };

  const handleGenerate = () => {
    if (numSalary <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Salary', description: 'Please enter a valid monthly income.' });
      return;
    }
    setShowResults(true);
    handleSave();
  };

  const addPillar = () => {
    const name = newPillarName.trim().toUpperCase();
    if (!name) return;
    const id = `custom_${Math.random().toString(36).substring(2, 7)}`;
    const newPillar = { id, label: name, icon: Coins, color: CHART_COLORS[pillars.length % CHART_COLORS.length] };
    setPillars([...pillars, newPillar]);
    setPercents({ ...percents, [id]: 0 });
    setNewPillarName('');
    toast({ title: "Pillar Added", description: `"${name}" integrated into strategy.` });
  };

  const deletePillar = (id: string) => {
    const deletedPercent = percents[id] || 0;
    const remainingPillars = pillars.filter(p => p.id !== id);
    const remainingPercents = { ...percents };
    delete remainingPercents[id];

    setPillars(remainingPillars);
    
    const unlockedKeys = remainingPillars.filter(p => !lockedPillars.has(p.id)).map(p => p.id);
    if (unlockedKeys.length > 0) {
      const share = deletedPercent / unlockedKeys.length;
      unlockedKeys.forEach(k => remainingPercents[k] = (remainingPercents[k] || 0) + share);
    }
    
    setPercents(remainingPercents);
    toast({ title: "Pillar Removed", description: "Remaining funds redistributed." });
  };

  const syncWithBudget = async () => {
    if (!user || !db) return;
    const monthId = format(new Date(), 'yyyyMM');
    const budgetRef = doc(db, 'users', user.uid, 'monthlyBudgets', monthId);
    const expenseAmt = amounts['expense'] || 0;
    setDocumentNonBlocking(budgetRef, {
      userId: user.uid,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalBudgetAmount: await encryptData(expenseAmt.toString(), user.uid),
      baseBudgetAmount: await encryptData(expenseAmt.toString(), user.uid),
      isEncrypted: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
    setIsSynced(true);
    toast({ title: 'Budget Synced', description: `₹${Math.round(expenseAmt).toLocaleString()} set as monthly target.` });
  };

  if (!mounted || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Planner...</p>
        </div>
      </AppShell>
    );
  }

  const chartTooltipStyle = {
    borderRadius: '16px',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    padding: '8px 12px',
    fontSize: '10px',
    fontWeight: 'bold'
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
              <Calculator className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black tracking-tighter">Wealth Planner</h2>
              <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Optimized Income Allocation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showResults && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setShowResults(false);
                  setIsSynced(false);
                  setTimeout(() => document.getElementById('salary-input')?.focus(), 100);
                }} 
                className="h-10 w-10 md:h-12 md:w-12 rounded-2xl text-muted-foreground hover:text-primary transition-colors"
                title="Edit Base Metrics"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {showResults && (
              <Button onClick={handleSave} className="shadow-lg h-10 md:h-12 px-5 md:px-6 font-black rounded-2xl bg-primary hover:bg-primary/90 text-[11px] md:text-sm">
                <Save className="h-4 w-4 mr-2" /> Save Strategy
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">
            <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 md:pb-4 border-b px-4 md:px-6">
                <CardTitle className="text-sm md:text-base flex items-center gap-2 font-black">
                  <Coins className="h-4 w-4 text-primary" />
                  Base Metrics
                </CardTitle>
                <CardDescription className="text-[9px] md:text-[10px] uppercase font-bold tracking-tight">Enter details to start allocation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6 px-4 md:px-6">
                <div className="space-y-2">
                  <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Salary (₹)</Label>
                  <Input 
                    id="salary-input"
                    type="number" 
                    placeholder="e.g. 75000" 
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value)}
                    className="font-black text-xl md:text-2xl h-12 md:h-14 bg-muted/20 border-primary/10 focus:ring-2 focus:ring-primary/20 rounded-2xl tracking-tighter"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Age</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 28" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)}
                    className="h-10 md:h-12 font-black rounded-xl text-sm md:text-base"
                  />
                </div>
                <Button onClick={handleGenerate} className="w-full h-10 md:h-12 text-[11px] md:text-sm font-black shadow-md rounded-xl gap-2">
                  Generate Strategy <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>

            {showResults && percents['expense'] !== undefined && (
              <Card className="shadow-xl rounded-2xl border-none ring-1 ring-blue-500/30 bg-blue-50/10 dark:bg-blue-900/10 animate-in slide-in-from-left-4">
                <CardHeader className="pb-2 px-4 md:px-6">
                  <CardTitle className="text-sm flex items-center gap-2 font-black">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Budget Bridge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 md:px-6 pb-5 md:pb-6">
                  <p className="text-[10px] md:text-[11px] leading-relaxed text-muted-foreground font-medium">
                    Your planned expenses are <span className="font-black text-foreground">₹{Math.round(amounts['expense'] || 0).toLocaleString()}</span>. 
                    Set this as your daily budget cap?
                  </p>
                  
                  {isSynced ? (
                    <div className="p-3 md:p-4 bg-green-500/10 border border-green-200 dark:border-green-800/50 rounded-2xl flex flex-col items-center gap-2 animate-in zoom-in-95">
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="h-4 w-4" />
                      </div>
                      <p className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Vault Synchronized</p>
                      <Button variant="ghost" asChild className="h-7 text-[8px] font-black uppercase text-green-700 hover:bg-green-500/10">
                        <Link href="/budget">View Budget <ChevronRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 md:p-4 bg-white/50 dark:bg-background/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl space-y-3 shadow-sm">
                      <p className="text-[8px] md:text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest text-center">Auto-sync monthly target?</p>
                      <Button size="sm" onClick={syncWithBudget} className="w-full bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-md h-8 md:h-9 text-[10px]">Sync Now</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-8">
            {!showResults ? (
              <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-3xl bg-muted/5 opacity-50 grayscale space-y-4">
                <Calculator className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-base md:text-lg font-black uppercase tracking-tighter">Strategy Pending</p>
                  <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Provide metrics to visualize wealth</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-4 md:space-y-6">
                <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-4 md:py-5 px-5 md:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
                      <div className="flex items-center gap-4">
                         <div>
                          <CardTitle className="text-lg md:text-xl font-black tracking-tight">Income Allocation</CardTitle>
                          <CardDescription className="text-[9px] md:text-[10px] font-black uppercase tracking-tight opacity-70">Customizable funds split</CardDescription>
                        </div>
                        <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={totalPercent === 100 ? "secondary" : "destructive"} className="h-7 md:h-8 px-3 md:px-4 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-sm">
                          Total: {totalPercent}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:gap-8 md:grid-cols-5 p-5 md:p-8">
                    <div className="md:col-span-3 space-y-8 md:space-y-10">
                      <div className="space-y-6">
                        {pillars.map((item) => {
                          const committed = committedCosts[item.id] || 0;
                          const totalAllowed = amounts[item.id] || 0;
                          const committedPercent = totalAllowed > 0 ? (committed / totalAllowed) * 100 : 0;
                          const isOverspent = committed > totalAllowed;
                          const isLocked = lockedPillars.has(item.id);
                          const Icon = item.icon || Coins;
                          
                          return (
                            <div key={item.id} className="space-y-4 group relative">
                              <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-3">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => toggleLock(item.id)}
                                    className={cn(
                                      "p-1.5 rounded-lg transition-all",
                                      isLocked ? "bg-orange-100 text-orange-600 shadow-sm" : "text-muted-foreground hover:bg-muted"
                                    )}
                                    title={isLocked ? "Unlock Pillar" : "Lock Pillar (Exclude from AI Scaler)"}
                                  >
                                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                  </button>
                                  <Icon className="h-4 w-4 md:h-5 md:w-5" style={{ color: item.color }} />
                                  <div className="flex flex-col">
                                    <Label className="font-black text-[11px] md:text-[13px] uppercase tracking-tighter group-hover:text-primary transition-colors">
                                      {item.label}
                                    </Label>
                                    <span className={cn(
                                      "text-[9px] md:text-[10px] font-black tracking-tight",
                                      isOverspent ? "text-destructive" : "text-primary"
                                    )}>
                                      ₹{committed.toLocaleString()} Spent
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                  <div className={cn(
                                    "flex-1 md:flex-initial flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-inner transition-all",
                                    isLocked ? "bg-orange-50/50 border-orange-200" : "bg-muted/20 border-primary/10 group-hover:border-primary/30"
                                  )}>
                                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Cap</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-muted-foreground opacity-50">₹</span>
                                      <Input 
                                        type="number"
                                        value={Math.round(totalAllowed)}
                                        onChange={(e) => updateAmount(item.id, e.target.value)}
                                        className="w-16 h-5 border-none bg-transparent p-0 text-[10px] md:text-xs font-black focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </div>
                                  </div>

                                  <div className={cn(
                                    "flex-1 md:flex-initial flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-inner transition-all",
                                    isLocked ? "bg-orange-100/50 border-orange-300" : "bg-primary/5 border-primary/20"
                                  )}>
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", isLocked ? "text-orange-600" : "text-primary")}>Scale</span>
                                    <div className="flex items-center gap-1">
                                      <Input 
                                        type="number"
                                        value={Math.round((percents[item.id] || 0) * 10) / 10}
                                        onChange={(e) => updatePercent(item.id, parseFloat(e.target.value) || 0)}
                                        className={cn(
                                          "w-8 h-5 border-none bg-transparent p-0 text-[10px] md:text-xs font-black text-right focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                          isLocked ? "text-orange-600" : "text-primary"
                                        )}
                                      />
                                      <span className={cn("text-[10px] font-bold", isLocked ? "text-orange-600" : "text-primary")}>%</span>
                                    </div>
                                  </div>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => deletePillar(item.id)}
                                    className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-1.5">
                                <div className="relative pt-1">
                                  <Slider 
                                    value={[percents[item.id] || 0]}
                                    max={100}
                                    step={0.5}
                                    onValueChange={([val]) => updatePercent(item.id, val)}
                                    className={cn("h-1.5 md:h-2", isLocked && "[&_.relative]:opacity-50")}
                                  />
                                  <div 
                                    className={cn(
                                      "absolute top-1 h-1.5 md:h-2 rounded-full pointer-events-none transition-all duration-700",
                                      isOverspent ? "bg-destructive/40" : isLocked ? "bg-orange-500/30" : "bg-primary/30"
                                    )}
                                    style={{ width: `${Math.min(100, committedPercent)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground tracking-widest">Strategy Utilization</span>
                                  <span className={cn(
                                    "text-[9px] font-black",
                                    isOverspent ? "text-destructive" : isLocked ? "text-orange-600" : "text-primary"
                                  )}>
                                    {Math.round(committedPercent)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-4 rounded-2xl bg-muted/20 border border-dashed flex items-center gap-3">
                        <Input 
                          placeholder="New Pillar Name..." 
                          value={newPillarName} 
                          onChange={e => setNewPillarName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addPillar()}
                          className="h-10 text-[10px] uppercase font-black tracking-tight"
                        />
                        <Button onClick={addPillar} size="icon" className="h-10 w-10 shrink-0 rounded-xl shadow-md">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col items-center justify-center p-2 md:p-4">
                      <div className="w-full h-[200px] md:h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={salaryData} 
                              innerRadius={55} 
                              outerRadius={80} 
                              paddingAngle={4} 
                              dataKey="value" 
                              stroke="none"
                              animationDuration={500}
                            >
                              {salaryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={chartTooltipStyle}
                              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                              formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} 
                            />
                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[7px] md:text-[8px] uppercase font-black text-muted-foreground">Monthly</span>
                          <p className="text-base md:text-xl font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                  {percents['investment'] !== undefined && (
                    <Card className="shadow-xl rounded-3xl border-none ring-1 ring-orange-500/20">
                      <CardHeader className="pb-2 border-b bg-muted/10 px-5 md:px-6">
                        <CardTitle className="text-xs md:text-sm flex items-center gap-2 font-black">
                          <Target className="h-4 w-4 text-orange-500" />
                          Asset Matrix
                        </CardTitle>
                        <CardDescription className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60">Risk Profile: Age {numAge}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 md:pt-6 space-y-5 md:space-y-6 px-5 md:px-6">
                        <div className="h-[150px] md:h-[180px] w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={invData} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                                {invData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={chartTooltipStyle}
                                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} 
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-sm md:text-lg font-black tracking-tighter">₹{Math.round(amounts['investment'] || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pb-5">
                          {[
                            { label: 'Equity', amt: invAllocation.equityAmt, p: invAllocation.equityP },
                            { label: 'Debt', amt: invAllocation.debtAmt, p: invAllocation.debtP },
                            { label: 'Gold', amt: invAllocation.goldAmt, p: invAllocation.goldP }
                          ].map(item => (
                            <div key={item.label} className="p-2 md:p-3 border rounded-2xl bg-muted/5 text-center space-y-1">
                              <p className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase truncate">{item.label}</p>
                              <p className="text-[10px] md:text-xs font-black tracking-tighter">₹{Math.round(item.amt).toLocaleString()}</p>
                              <span className="text-[8px] md:text-[9px] font-black text-primary">{item.p}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/10 px-5 md:px-6">
                      <CardTitle className="text-xs md:text-sm flex items-center gap-2 font-black">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Strategic Logic
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-5 px-5 md:px-6 max-h-[300px] md:max-h-[350px] overflow-y-auto pb-6">
                      <div className="space-y-3 md:space-y-4">
                        <h4 className="text-[8px] md:text-[9px] font-black uppercase text-primary border-b pb-1">Dynamic Allocation</h4>
                        {pillars.map(p => (
                           <StrategyDesc key={p.id} committed={committedCosts[p.id]} label={p.label} text={`Custom allocation for ${p.label}.`} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StrategyDesc({ label, text, committed }: any) {
  return (
    <div className="space-y-0.5 md:space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[9px] md:text-[10px] font-black uppercase text-foreground">{label}</p>
        {committed > 0 && (
          <span className="text-[7px] font-black uppercase text-orange-600">₹{committed.toLocaleString()} Locked</span>
        )}
      </div>
      <p className="text-[9px] md:text-[10px] text-muted-foreground leading-snug font-medium italic">{text}</p>
    </div>
  );
}
