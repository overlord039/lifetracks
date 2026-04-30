
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Check,
  Lock,
  IndianRupee,
  BrainCircuit
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
import { Separator } from '@/components/ui/separator';

const COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292'];
const INV_COLORS = ['#BA68C8', '#64B5F6', '#FFD54F'];

type Percents = {
  expense: number;
  savings: number;
  investment: number;
  health: number;
  personal: number;
};

const DEFAULT_RATIOS: Percents = {
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
  const [isAutoBalanceEnabled, setIsAutoBalanceEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [salary, setSalary] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [percents, setPercents] = useState<Percents>(DEFAULT_RATIOS);
  const [showResults, setShowResults] = useState(false);

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
        const s = savedProfile.isEncrypted ? await decryptData(savedProfile.salary, user.uid) : savedProfile.salary.toString();
        const a = savedProfile.isEncrypted ? await decryptData(savedProfile.age, user.uid) : savedProfile.age.toString();
        
        setSalary(s);
        setAge(a);
        setPercents({
          expense: savedProfile.expensePercent,
          savings: savedProfile.savingsPercent,
          investment: savedProfile.investmentPercent,
          health: savedProfile.healthPercent,
          personal: savedProfile.personalPercent
        });
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
    const totals: Record<string, number> = { expense: 0, savings: 0, investment: 0, health: 0, personal: 0 };
    
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
  }, [decryptedFixed, decryptedExpenses]);

  const numSalary = parseFloat(salary) || 0;
  const numAge = parseInt(age) || 0;

  const updatePercent = useCallback((id: keyof Percents, newVal: number) => {
    const sanitizedVal = Math.min(100, Math.max(0, newVal));
    setPercents(prev => {
      const oldVal = prev[id];
      if (oldVal === sanitizedVal) return prev;
      
      const nextPercents = { ...prev, [id]: sanitizedVal };

      if (!isAutoBalanceEnabled) {
        return nextPercents;
      }

      const otherKeys = (Object.keys(prev) as (keyof Percents)[]).filter(k => k !== id);
      const totalOthers = otherKeys.reduce((sum, k) => sum + prev[k], 0);
      const targetOthersTotal = 100 - sanitizedVal;

      if (totalOthers > 0) {
        const multiplier = targetOthersTotal / totalOthers;
        otherKeys.forEach(k => {
          nextPercents[k] = Math.max(0, Math.round(prev[k] * multiplier * 10) / 10);
        });
      } else {
        const defaultTotalOthers = otherKeys.reduce((sum, k) => sum + DEFAULT_RATIOS[k], 0);
        otherKeys.forEach(k => {
          const ratio = DEFAULT_RATIOS[k] / defaultTotalOthers;
          nextPercents[k] = Math.max(0, Math.round(targetOthersTotal * ratio * 10) / 10);
        });
      }

      const currentSum = Object.values(nextPercents).reduce((a, b) => a + b, 0);
      const diff = 100 - currentSum;
      if (Math.abs(diff) > 0.01) {
        const keyToAdjust = otherKeys.find(k => nextPercents[k] > 0) || otherKeys[0];
        nextPercents[keyToAdjust] = Math.round((nextPercents[keyToAdjust] + diff) * 10) / 10;
      }

      return nextPercents;
    });
  }, [isAutoBalanceEnabled]);

  const updateAmount = useCallback((id: keyof Percents, val: string) => {
    const numVal = parseFloat(val) || 0;
    const newPercent = numSalary > 0 ? (numVal / numSalary) * 100 : 0;
    updatePercent(id, newPercent);
  }, [numSalary, updatePercent]);

  const amounts = useMemo(() => {
    return {
      expense: numSalary * (percents.expense / 100),
      savings: numSalary * (percents.savings / 100),
      investment: numSalary * (percents.investment / 100),
      health: numSalary * (percents.health / 100),
      personal: numSalary * (percents.personal / 100)
    };
  }, [numSalary, percents]);

  const invAllocation = useMemo(() => {
    const equityP = Math.min(Math.max(100 - numAge, 30), 80);
    const goldP = 5;
    const debtP = 100 - equityP - goldP;
    return {
      equityP, debtP, goldP,
      equityAmt: amounts.investment * (equityP / 100),
      debtAmt: amounts.investment * (debtP / 100),
      goldAmt: amounts.investment * (goldP / 100)
    };
  }, [numAge, amounts.investment]);

  const salaryData = useMemo(() => [
    { name: 'Expenses', value: amounts.expense, color: COLORS[0] },
    { name: 'Savings', value: amounts.savings, color: COLORS[1] },
    { name: 'Investments', value: amounts.investment, color: COLORS[2] },
    { name: 'Health', value: amounts.health, color: COLORS[3] },
    { name: 'Personal', value: amounts.personal, color: COLORS[4] }
  ].filter(d => d.value > 0), [amounts]);

  const invData = useMemo(() => [
    { name: 'Equity', value: invAllocation.equityAmt, color: INV_COLORS[0] },
    { name: 'Debt', value: invAllocation.debtAmt, color: INV_COLORS[1] },
    { name: 'Gold', value: invAllocation.goldAmt, color: INV_COLORS[2] }
  ].filter(d => d.value > 0), [invAllocation]);

  const totalPercent = useMemo(() => Math.round(Object.values(percents).reduce((a, b) => a + b, 0)), [percents]);

  const handleSave = async () => {
    if (!user || !salaryRef) return;
    setDocumentNonBlocking(salaryRef, {
      userId: user.uid,
      salary: await encryptData(salary, user.uid),
      age: await encryptData(age, user.uid),
      expensePercent: percents.expense,
      savingsPercent: percents.savings,
      investmentPercent: percents.investment,
      healthPercent: percents.health,
      personalPercent: percents.personal,
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

  const syncWithBudget = async () => {
    if (!user || !db) return;
    const monthId = format(new Date(), 'yyyyMM');
    const budgetRef = doc(db, 'users', user.uid, 'monthlyBudgets', monthId);
    setDocumentNonBlocking(budgetRef, {
      userId: user.uid,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalBudgetAmount: await encryptData(amounts.expense.toString(), user.uid),
      baseBudgetAmount: await encryptData(amounts.expense.toString(), user.uid),
      isEncrypted: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
    setIsSynced(true);
    toast({ title: 'Budget Synced', description: `₹${Math.round(amounts.expense).toLocaleString()} set as monthly target.` });
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

            {showResults && (
              <Card className="shadow-xl rounded-2xl border-none ring-1 ring-blue-500/30 bg-blue-50/10 dark:bg-blue-900/10 animate-in slide-in-from-left-4">
                <CardHeader className="pb-2 px-4 md:px-6">
                  <CardTitle className="text-sm flex items-center gap-2 font-black">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Budget Bridge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 md:px-6 pb-5 md:pb-6">
                  <p className="text-[10px] md:text-[11px] leading-relaxed text-muted-foreground font-medium">
                    Your planned expenses are <span className="font-black text-foreground">₹{Math.round(amounts.expense).toLocaleString()}</span>. 
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
                      <div>
                        <CardTitle className="text-lg md:text-xl font-black tracking-tight">Income Allocation</CardTitle>
                        <CardDescription className="text-[9px] md:text-[10px] font-black uppercase tracking-tight opacity-70">Customizable funds split</CardDescription>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 rounded-full border border-dashed">
                          <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <BrainCircuit className={cn("h-3 w-3", isAutoBalanceEnabled ? "text-primary" : "text-muted-foreground")} />
                            AI Scaler
                          </Label>
                          <Switch checked={isAutoBalanceEnabled} onCheckedChange={setIsAutoBalanceEnabled} className="scale-75" />
                        </div>
                        <Badge variant={totalPercent === 100 ? "secondary" : "destructive"} className="h-7 md:h-8 px-3 md:px-4 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-sm">
                          Total: {totalPercent}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:gap-8 md:grid-cols-5 p-5 md:p-8">
                    <div className="md:col-span-3 space-y-8 md:space-y-10">
                      {[
                        { id: 'expense', label: 'Expenses', icon: Wallet, color: 'text-blue-500' },
                        { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-green-500' },
                        { id: 'investment', label: 'Investments', icon: TrendingUp, color: 'text-orange-500' },
                        { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-purple-500' },
                        { id: 'personal', label: 'Personal', icon: Smile, color: 'text-pink-500' }
                      ].map((item) => {
                        const committed = committedCosts[item.id] || 0;
                        const totalAllowed = amounts[item.id as keyof typeof amounts];
                        const committedPercent = totalAllowed > 0 ? (committed / totalAllowed) * 100 : 0;
                        const isOverspent = committed > totalAllowed;
                        
                        return (
                          <div key={item.id} className="space-y-4 group">
                            <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-3">
                              <div className="flex items-center gap-2">
                                <item.icon className={cn("h-4 w-4 md:h-5 md:w-5", item.color)} />
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
                                <div className="flex-1 md:flex-initial flex items-center gap-1.5 bg-muted/20 px-3 py-1.5 rounded-xl border border-primary/10 shadow-inner group-hover:border-primary/30 transition-all">
                                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Cap</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-50">₹</span>
                                    <Input 
                                      type="number"
                                      value={Math.round(totalAllowed)}
                                      onChange={(e) => updateAmount(item.id as keyof Percents, e.target.value)}
                                      className="w-16 h-5 border-none bg-transparent p-0 text-[10px] md:text-xs font-black focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                </div>

                                <div className="flex-1 md:flex-initial flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 shadow-inner">
                                  <span className="text-[8px] font-black uppercase text-primary tracking-widest">Scale</span>
                                  <div className="flex items-center gap-1">
                                    <Input 
                                      type="number"
                                      value={Math.round(percents[item.id as keyof Percents] * 10) / 10}
                                      onChange={(e) => updatePercent(item.id as keyof Percents, parseFloat(e.target.value) || 0)}
                                      className="w-8 h-5 border-none bg-transparent p-0 text-[10px] md:text-xs font-black text-right focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-primary"
                                    />
                                    <span className="text-[10px] font-bold text-primary">%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="relative pt-1">
                                <Slider 
                                  value={[percents[item.id as keyof Percents]]}
                                  max={100}
                                  step={0.5}
                                  onValueChange={([val]) => updatePercent(item.id as keyof Percents, val)}
                                  className="h-1.5 md:h-2"
                                />
                                <div 
                                  className={cn(
                                    "absolute top-1 h-1.5 md:h-2 rounded-full pointer-events-none transition-all duration-700",
                                    isOverspent ? "bg-destructive/40" : "bg-primary/30"
                                  )}
                                  style={{ width: `${Math.min(100, committedPercent)}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground tracking-widest">Strategy Utilization</span>
                                <span className={cn(
                                  "text-[9px] font-black",
                                  isOverspent ? "text-destructive" : "text-primary"
                                )}>
                                  {Math.round(committedPercent)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                          <p className="text-sm md:text-lg font-black tracking-tighter">₹{Math.round(amounts.investment).toLocaleString()}</p>
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

                  <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/10 px-5 md:px-6">
                      <CardTitle className="text-xs md:text-sm flex items-center gap-2 font-black">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Strategic Logic
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-5 px-5 md:px-6 max-h-[300px] md:max-h-[350px] overflow-y-auto pb-6">
                      <div className="space-y-3 md:space-y-4">
                        <h4 className="text-[8px] md:text-[9px] font-black uppercase text-primary border-b pb-1">Core Allocation</h4>
                        <StrategyDesc committed={committedCosts.expense} label="Expenses" text="Daily living costs like rent, food, travel, and bills." />
                        <StrategyDesc committed={committedCosts.savings} label="Savings" text="Emergency fund for unexpected situations." />
                        <StrategyDesc committed={committedCosts.investment} label="Investments" text="Capital used to grow long-term wealth." />
                        <StrategyDesc committed={committedCosts.health} label="Health" text="Medical, insurance, and fitness expenses." />
                        <StrategyDesc committed={committedCosts.personal} label="Personal" text="Entertainment, hobbies, and lifestyle spending." />
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
