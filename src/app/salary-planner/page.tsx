"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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
  Lock,
  Unlock,
  Plus,
  Trash2,
  BrainCircuit,
  Check,
  Library,
  Sparkles,
  PlusCircle,
  Clock,
  Tag,
  PencilLine,
  ArrowRightLeft,
  X,
  History
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [isStartingNew, setIsStartingNew] = useState(false);
  
  const [salary, setSalary] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [percents, setPercents] = useState<Record<string, number>>(DEFAULT_RATIOS);
  const [pillars, setPillars] = useState<any[]>(STANDARD_PILLARS);
  const [showResults, setShowResults] = useState(false);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monthId = mounted ? format(new Date(), 'yyyyMM') : '';

  const salaryProfilesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'salaryProfiles');
  }, [db, user]);

  const fixedExpensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'fixedExpenses');
  }, [db, user, monthId]);

  const monthExpensesRef = useMemoFirebase(() => {
    if (!db || !user || !monthId) return null;
    return collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
  }, [db, user, monthId]);

  const { data: rawProfiles, isLoading: isProfilesLoading } = useCollection(salaryProfilesRef);
  const { data: rawFixed } = useCollection(fixedExpensesRef);
  const { data: rawExpenses } = useCollection(monthExpensesRef);
  
  const [decryptedProfiles, setDecryptedProfiles] = useState<any[]>([]);
  const [decryptedFixed, setDecryptedFixed] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);

  useEffect(() => {
    const decryptProfiles = async () => {
      if (rawProfiles && user && mounted) {
        setIsDecrypting(true);
        const decrypted = await Promise.all(rawProfiles.map(async p => ({
          ...p,
          name: p.isEncrypted ? await decryptData(p.name, user.uid) : (p.name || 'Unnamed Strategy'),
          salary: p.isEncrypted ? await decryptData(p.salary, user.uid) : (p.salary?.toString() || '0'),
          age: p.isEncrypted ? await decryptData(p.age, user.uid) : (p.age?.toString() || '0'),
        })));
        setDecryptedProfiles(decrypted);
        setIsDecrypting(false);
      }
    };
    decryptProfiles();
  }, [rawProfiles, user, mounted]);

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

  const latestProfile = useMemo(() => {
    if (!decryptedProfiles.length) return null;
    return [...decryptedProfiles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }, [decryptedProfiles]);

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

  const addPillar = () => {
    const name = newPillarName.trim();
    if (!name) return;
    
    const id = name.toLowerCase().replace(/\s+/g, '_');
    if (pillars.find(p => p.id === id)) {
      toast({ variant: "destructive", title: "Pillar Exists", description: "This category name is already used." });
      return;
    }

    const newPillar = {
      id,
      label: name.toUpperCase(),
      icon: Coins,
      color: CHART_COLORS[pillars.length % CHART_COLORS.length]
    };

    setPillars([...pillars, newPillar]);
    setPercents(prev => ({ ...prev, [id]: 0 }));
    setNewPillarName('');
    toast({ title: "Pillar Added", description: `${name.toUpperCase()} included in strategy.` });
  };

  const deletePillar = (id: string) => {
    if (pillars.length <= 2) {
      toast({ variant: "destructive", title: "Min Pillars Reached", description: "Keep at least 2 pillars for a valid strategy." });
      return;
    }

    setPillars(prev => prev.filter(p => p.id !== id));
    setPercents(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLockedPillars(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast({ title: "Pillar Removed" });
  };

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

  const handleSaveStrategy = async () => {
    if (!user || !salaryProfilesRef || !strategyName.trim()) {
      if (!strategyName.trim()) {
        toast({ variant: "destructive", title: "Name Required", description: "Please provide a name for this strategy." });
      }
      return;
    }
    
    const payload = {
      userId: user.uid,
      name: await encryptData(strategyName.trim().toUpperCase(), user.uid),
      salary: await encryptData(salary, user.uid),
      age: await encryptData(age, user.uid),
      percents: percents,
      pillars: pillars.map(p => ({ id: p.id, label: p.label, color: p.color })),
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };

    if (activeStrategyId) {
      setDocumentNonBlocking(doc(salaryProfilesRef, activeStrategyId), payload, { merge: true });
      toast({ 
        title: 'Strategy Updated', 
        description: `"${strategyName.toUpperCase()}" has been refined.`,
        action: (
          <Button variant="outline" size="sm" className="h-8 font-black uppercase text-[10px]" onClick={syncWithBudget}>Sync to Budget</Button>
        )
      });
    } else {
      addDocumentNonBlocking(salaryProfilesRef, {
        ...payload,
        createdAt: new Date().toISOString()
      }).then(docRef => {
        if (docRef) setActiveStrategyId(docRef.id);
      });
      toast({ 
        title: 'Strategy Vaulted', 
        description: `"${strategyName.toUpperCase()}" secured in vault.`,
        action: (
          <Button variant="outline" size="sm" className="h-8 font-black uppercase text-[10px]" onClick={syncWithBudget}>Sync to Budget</Button>
        )
      });
    }

    setIsSaveModalOpen(false);
  };

  const loadStrategy = (strat: any) => {
    setActiveStrategyId(strat.id);
    setStrategyName(strat.name);
    setSalary(strat.salary);
    setAge(strat.age);
    setPercents(strat.percents || DEFAULT_RATIOS);
    
    if (strat.pillars && Array.isArray(strat.pillars)) {
      const restored = strat.pillars.map((p: any) => ({
        ...p,
        icon: STANDARD_PILLARS.find(s => s.id === p.id)?.icon || Coins
      }));
      setPillars(restored);
    }
    
    setShowResults(true);
    setIsSynced(false);
    setIsEditingMetrics(false);
    setIsStartingNew(false);
    toast({ title: "Strategy Loaded", description: strat.name });
  };

  const createNewStrategy = () => {
    setActiveStrategyId(null);
    setStrategyName('');
    setSalary('');
    setAge('');
    setPercents(DEFAULT_RATIOS);
    setPillars(STANDARD_PILLARS);
    setShowResults(false);
    setIsSynced(false);
    setIsEditingMetrics(false);
    setIsStartingNew(true);
    setLockedPillars(new Set());
  };

  const deleteStrategy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!salaryProfilesRef) return;
    deleteDocumentNonBlocking(doc(salaryProfilesRef, id));
    if (activeStrategyId === id) createNewStrategy();
    toast({ title: "Strategy Erased" });
  };

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

  const renderCustomLabel = ({ name, percent, value }: any) => {
    return `${name} ${(percent * 100).toFixed(0)}% (₹${Math.round(value).toLocaleString()})`;
  };

  return (
    <AppShell>
      {!mounted || (isDecrypting && !decryptedProfiles.length) ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Planner...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
                <Calculator className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">
                  {showResults ? (activeStrategyId ? "Strategy Refinement" : "New Strategy Creation") : "Wealth Planner"}
                </h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {activeStrategyId ? strategyName : "Design your financial architecture"}
                </p>
              </div>
            </div>
            {showResults && (
              <div className="flex items-center gap-3">
                <Button onClick={() => setIsSaveModalOpen(true)} className="shadow-lg h-11 px-8 font-black rounded-2xl bg-primary hover:bg-primary/90 text-xs gap-2">
                  <Save className="h-4 w-4" /> {activeStrategyId ? "Update strategy" : "Secure strategy"}
                </Button>
              </div>
            )}
          </div>

          {!showResults || isEditingMetrics ? (
            <div className="flex items-center justify-center py-10 md:py-20 animate-in zoom-in-95 duration-500">
              {(!isStartingNew && !isEditingMetrics && decryptedProfiles.length > 0) ? (
                <Card className="shadow-2xl rounded-[2.5rem] border-none ring-1 ring-border max-w-2xl w-full overflow-hidden bg-card/50 backdrop-blur-md">
                   <CardHeader className="bg-primary/5 border-b p-8 sm:p-10">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                          <History className="h-7 w-7" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black tracking-tight">Strategic Hub</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Welcome back to your financial control center</CardDescription>
                        </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-8 sm:p-10 space-y-8">
                      {latestProfile && (
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Continue Latest</p>
                           <button 
                             onClick={() => loadStrategy(latestProfile)}
                             className="w-full p-6 rounded-3xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group text-left flex items-center justify-between"
                           >
                              <div>
                                <h4 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{latestProfile.name}</h4>
                                <div className="flex items-center gap-3 mt-1.5 opacity-70">
                                   <Badge variant="outline" className="text-[9px] font-black bg-background">₹{parseFloat(latestProfile.salary).toLocaleString()}</Badge>
                                   <span className="text-[9px] font-black uppercase tracking-widest">Modified {format(new Date(latestProfile.updatedAt), 'MMM dd')}</span>
                                </div>
                              </div>
                              <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <ChevronRight className="h-6 w-6" />
                              </div>
                           </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Intent</p>
                            <Button onClick={() => setIsStartingNew(true)} variant="outline" className="w-full h-16 rounded-2xl border-dashed font-black text-xs uppercase gap-2 hover:bg-primary/5 hover:border-primary/40">
                               <Plus className="h-4 w-4" /> Create New Strategy
                            </Button>
                         </div>
                         <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Vault</p>
                            <Popover>
                               <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full h-16 rounded-2xl font-black text-xs uppercase gap-2">
                                     <Library className="h-4 w-4" /> Choose From Vault
                                  </Button>
                               </PopoverTrigger>
                               <PopoverContent align="center" className="w-80 p-0 rounded-3xl overflow-hidden shadow-2xl border-none ring-1 ring-border">
                                  <div className="bg-muted/30 p-4 border-b">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Profiles</p>
                                  </div>
                                  <ScrollArea className="h-64">
                                     <div className="divide-y divide-dashed">
                                        {decryptedProfiles.map(p => (
                                           <button 
                                             key={p.id} 
                                             onClick={() => loadStrategy(p)}
                                             className="w-full p-4 hover:bg-primary/5 transition-colors text-left flex flex-col gap-1 group"
                                           >
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase group-hover:text-primary transition-colors">{p.name}</span>
                                                <Button variant="ghost" size="icon" onClick={(e) => deleteStrategy(p.id, e)} className="h-6 w-6 text-destructive/40 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                              </div>
                                              <span className="text-[8px] font-bold text-muted-foreground uppercase">₹{parseFloat(p.salary).toLocaleString()} • Age {p.age}</span>
                                           </button>
                                        ))}
                                     </div>
                                  </ScrollArea>
                               </PopoverContent>
                            </Popover>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              ) : (
                <Card className="shadow-2xl rounded-3xl border-none ring-1 ring-border max-w-lg w-full overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-6 border-b px-8 pt-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                          <Target className="h-6 w-6 text-primary" />
                          Initial Metrics
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Define your financial baseline</CardDescription>
                      </div>
                      {(isEditingMetrics || (decryptedProfiles.length > 0 && isStartingNew)) && (
                        <Button variant="ghost" size="icon" onClick={() => { setIsEditingMetrics(false); setIsStartingNew(false); }} className="h-8 w-8 rounded-full">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-8 px-8 pb-10">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Strategy Alias (Optional)</Label>
                      <Input 
                        placeholder="e.g. AGGRESSIVE 2026" 
                        value={strategyName} 
                        onChange={(e) => setStrategyName(e.target.value)}
                        className="h-12 font-black rounded-xl text-base uppercase bg-muted/10 border-primary/5 focus:ring-primary/20"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly Salary (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 75000" 
                          value={salary} 
                          onChange={(e) => setSalary(e.target.value)}
                          className="font-black text-xl h-14 bg-muted/20 border-primary/10 rounded-2xl tracking-tighter"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Age</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 28" 
                          value={age} 
                          onChange={(e) => setAge(e.target.value)}
                          className="h-14 font-black rounded-2xl text-xl bg-muted/20 border-primary/10 tracking-tighter"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => { setShowResults(true); setIsEditingMetrics(false); setIsStartingNew(false); }} 
                      disabled={!salary || !age}
                      className="w-full h-14 text-base font-black shadow-lg rounded-2xl gap-2 mt-4"
                    >
                      Generate Wealth Dashboard <ChevronRight className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1">
              <div className="space-y-6">
                {/* Compact Metrics Bar */}
                <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border bg-card/50 backdrop-blur-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
                  <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8 flex-wrap justify-center md:justify-start">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Monthly Income</p>
                        <p className="text-2xl font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                      </div>
                      <Separator orientation="vertical" className="h-10 hidden md:block" />
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Age Baseline</p>
                        <p className="text-2xl font-black tracking-tighter">{numAge} Years</p>
                      </div>
                      <Separator orientation="vertical" className="h-10 hidden md:block" />
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Active Alias</p>
                        <p className="text-xl font-black tracking-tight uppercase text-primary truncate max-w-[150px]">{strategyName || "Unnamed Strategy"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={() => setIsEditingMetrics(true)} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all border-dashed">
                        <PencilLine className="h-4 w-4" /> Edit Metrics
                      </Button>
                      <Button variant="ghost" onClick={createNewStrategy} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 border border-dashed">
                        <PlusCircle className="h-4 w-4" /> Change Strategy
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Main Allocation Logic */}
                <Card className="shadow-2xl rounded-[2.5rem] border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-5 px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                          <BrainCircuit className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black tracking-tight">Income Allocation Engine</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dynamic funds split with utilization tracking</CardDescription>
                        </div>
                      </div>
                      <Badge variant={totalPercent === 100 ? "secondary" : "destructive"} className="h-9 px-5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                        Total Distribution: {totalPercent}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-10 lg:grid-cols-12 p-8 md:p-12">
                    <div className="lg:col-span-7 space-y-10">
                      <div className="space-y-8">
                        {pillars.map((item) => {
                          const committed = committedCosts[item.id] || 0;
                          const totalAllowed = amounts[item.id] || 0;
                          const committedPercent = totalAllowed > 0 ? (committed / totalAllowed) * 100 : 0;
                          const isOverspent = committed > totalAllowed;
                          const isLocked = lockedPillars.has(item.id);
                          const Icon = item.icon || Coins;
                          
                          return (
                            <div key={item.id} className="space-y-5 group relative animate-in fade-in slide-in-from-left-2">
                              <div className="flex justify-between items-end flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => toggleLock(item.id)} className={cn("p-2 rounded-xl transition-all shadow-sm", isLocked ? "bg-orange-100 text-orange-600 ring-1 ring-orange-200" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
                                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                  </button>
                                  <div className={cn("p-2 rounded-xl shadow-md text-white", isOverspent ? "bg-destructive animate-pulse" : "")} style={{ backgroundColor: isOverspent ? undefined : item.color }}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <Label className="font-black text-sm uppercase tracking-tighter leading-none mb-1">{item.label}</Label>
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit", isOverspent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                                      ₹{committed.toLocaleString()} Logged Spend
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex flex-col gap-0.5 px-4 py-2 rounded-2xl border shadow-inner transition-all min-w-[120px]", isLocked ? "bg-orange-50/50 border-orange-200" : "bg-muted/20 border-primary/10 group-hover:border-primary/30")}>
                                    <span className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Planned Cap</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-bold text-muted-foreground opacity-50">₹</span>
                                      <Input type="number" value={Math.round(totalAllowed)} onChange={(e) => updateAmount(item.id, e.target.value)} className="w-20 h-6 border-none bg-transparent p-0 text-base font-black focus-visible:ring-0 shadow-none tracking-tighter" />
                                    </div>
                                  </div>
                                  <div className={cn("flex flex-col gap-0.5 px-4 py-2 rounded-2xl border shadow-inner transition-all w-24", isLocked ? "bg-orange-100/50 border-orange-300" : "bg-primary/5 border-primary/20")}>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-primary/60">Scale</span>
                                    <div className="flex items-center gap-1">
                                      <Input type="number" value={Math.round((percents[item.id] || 0) * 10) / 10} onChange={(e) => updatePercent(item.id, parseFloat(e.target.value) || 0)} className="w-10 h-6 border-none bg-transparent p-0 text-base font-black text-right focus-visible:ring-0 shadow-none tracking-tighter" />
                                      <span className="text-sm font-bold text-primary">%</span>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => deletePillar(item.id)} className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Slider value={[percents[item.id] || 0]} max={100} step={0.5} onValueChange={([val]) => updatePercent(item.id, val)} className={cn("h-2", isLocked && "[&_.relative]:opacity-50")} />
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner ring-1 ring-border">
                                  <div className={cn("h-full transition-all duration-1000", isOverspent ? "bg-destructive" : "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]")} style={{ width: `${Math.min(100, committedPercent)}%` }} />
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-60">
                                   <span>{isOverspent ? "Warning: Exceeded Strategy" : "Strategic Usage"}</span>
                                   <span>{Math.round(committedPercent)}% of pillar</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-6 rounded-[2rem] bg-primary/5 border border-dashed border-primary/20 flex flex-col sm:flex-row items-center gap-4 shadow-inner">
                        <Input placeholder="Add New Strategy Pillar Name..." value={newPillarName} onChange={e => setNewPillarName(e.target.value)} className="h-12 text-xs uppercase font-black tracking-tight rounded-xl bg-background shadow-sm" />
                        <Button onClick={addPillar} className="h-12 px-8 shrink-0 rounded-xl shadow-lg gap-2 uppercase font-black text-[10px] tracking-widest"><Plus className="h-4 w-4" /> Add Pillar</Button>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col items-center justify-start pt-10">
                      <div className="w-full aspect-square max-w-[350px] relative animate-in zoom-in-95 duration-1000 lg:sticky lg:top-20">
                        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-50 animate-pulse" />
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={salaryData} 
                              innerRadius={70} 
                              outerRadius={110} 
                              paddingAngle={6} 
                              dataKey="value" 
                              stroke="none"
                              labelLine={false}
                              animationDuration={1500}
                              animationBegin={0}
                            >
                              {salaryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={{ color: 'hsl(var(--popover-foreground))' }} formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} />
                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '40px', textTransform: 'uppercase' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-sm">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Total Monthly</span>
                          <p className="text-3xl font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sub Analysis Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {percents['investment'] !== undefined && (
                    <Card className="shadow-xl rounded-[2.5rem] border-none ring-1 ring-orange-500/20 overflow-hidden">
                      <CardHeader className="pb-3 border-b bg-muted/10 px-8 pt-6">
                        <CardTitle className="text-sm flex items-center gap-3 font-black">
                          <Target className="h-5 w-5 text-orange-500" /> 
                          Investment Asset Matrix
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-8 px-8 pb-10 space-y-8">
                        <div className="h-[250px] w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={invData} 
                                innerRadius={60} 
                                outerRadius={90} 
                                paddingAngle={5} 
                                dataKey="value" 
                                stroke="none"
                                label={renderCustomLabel}
                                labelLine={true}
                              >
                                {invData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={{ color: 'hsl(var(--popover-foreground))' }} formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                             <p className="text-xl font-black tracking-tighter">₹{Math.round(amounts['investment'] || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[{ label: 'Equity', amt: invAllocation.equityAmt, p: invAllocation.equityP, color: 'text-purple-500' }, { label: 'Debt', amt: invAllocation.debtAmt, p: invAllocation.debtP, color: 'text-blue-500' }, { label: 'Gold', amt: invAllocation.goldAmt, p: invAllocation.goldP, color: 'text-yellow-500' }].map(item => (
                            <div key={item.label} className="p-4 border rounded-3xl bg-muted/5 text-center space-y-1.5 shadow-inner">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
                              <p className="text-xs font-black tracking-tight">₹{Math.round(item.amt).toLocaleString()}</p>
                              <span className={cn("text-[10px] font-black", item.color)}>{item.p}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="shadow-xl rounded-[2.5rem] border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/10 px-8 pt-6">
                      <CardTitle className="text-sm flex items-center gap-3 font-black">
                        <Info className="h-5 w-5 text-muted-foreground" /> 
                        Strategic Logic Logic
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 space-y-6 max-h-[500px] overflow-y-auto pb-10">
                      <div className="space-y-5">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase text-primary border-b border-primary/10 pb-2">
                           <ArrowRightLeft className="h-4 w-4" />
                           Dynamic Allocation Breakdown
                        </div>
                        {pillars.map(p => (
                           <StrategyDesc key={p.id} committed={committedCosts[p.id]} label={p.label} text={`End-to-end encrypted allocation for ${p.label}. Your Master Key ensures this stay invisible to everyone.`} />
                        ))}
                      </div>
                      <Separator className="border-dashed" />
                      <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-dashed border-primary/10">
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-relaxed italic">
                           Note: Allocations are recalculated in real-time as you adjust your income or age baseline. Your strategy is protected by client-side AES-GCM encryption.
                         </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              Vault Strategy
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Confirm the unique identity for this strategic profile.</DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-5">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Strategy Alias</Label>
              <Input 
                placeholder="e.g. BALANCED 2026, AGGRESSIVE GROWTH..." 
                value={strategyName} 
                onChange={(e) => setStrategyName(e.target.value)}
                className="h-14 rounded-2xl font-black uppercase tracking-tight text-lg shadow-inner bg-muted/20"
                autoFocus
              />
            </div>
            <div className="p-5 bg-muted/30 rounded-2xl border border-dashed border-primary/20 text-[10px] font-bold leading-relaxed text-muted-foreground uppercase tracking-tight">
              Synchronizing: Monthly income of <span className="text-foreground">₹{numSalary.toLocaleString()}</span> and its specific pillar distribution will be locked into the vault.
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)} className="rounded-xl font-black text-[10px] uppercase tracking-widest h-12 flex-1">Abort</Button>
            <Button onClick={handleSaveStrategy} disabled={!strategyName.trim()} className="rounded-xl font-black text-[10px] uppercase tracking-[0.2em] h-12 flex-1 shadow-lg shadow-primary/20 gap-2">
              <ShieldCheck className="h-4 w-4" /> Secure Strategy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StrategyDesc({ label, text, committed }: any) {
  return (
    <div className="space-y-2 group animate-in slide-in-from-bottom-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase text-foreground tracking-tight group-hover:text-primary transition-colors">{label}</p>
        {committed > 0 && (
          <Badge className="text-[8px] font-black uppercase bg-orange-100 text-orange-600 border-none px-2 py-0">₹{committed.toLocaleString()} Locked</Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed font-medium opacity-80">{text}</p>
    </div>
  );
}
