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

  const { data: rawProfiles } = useCollection(salaryProfilesRef);
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
      color: p.color,
      percent: percents[p.id] || 0
    })).filter(d => d.value > 0);
  }, [pillars, amounts, percents]);

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
    borderRadius: '12px',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    padding: '6px 10px',
    fontSize: '9px',
    fontWeight: 'bold'
  };

  const renderAllocationLabel = ({ name, percent }: any) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <AppShell>
      {!mounted || (isDecrypting && !decryptedProfiles.length) ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Planner...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/10">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter">
                  {showResults ? (activeStrategyId ? "Strategy Refinement" : "New Strategy Creation") : "Wealth Planner"}
                </h2>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  {activeStrategyId ? strategyName : "Design your financial architecture"}
                </p>
              </div>
            </div>
            {showResults && (
              <Button onClick={() => setIsSaveModalOpen(true)} className="shadow-lg h-10 px-6 font-black rounded-xl bg-primary hover:bg-primary/90 text-xs gap-2">
                <Save className="h-4 w-4" /> {activeStrategyId ? "Update strategy" : "Secure strategy"}
              </Button>
            )}
          </div>

          {!showResults || isEditingMetrics ? (
            <div className="flex items-center justify-center py-6 md:py-12 animate-in zoom-in-95 duration-500">
              {(!isStartingNew && !isEditingMetrics && decryptedProfiles.length > 0) ? (
                <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border max-w-xl w-full overflow-hidden bg-card/50 backdrop-blur-md">
                   <CardHeader className="bg-primary/5 border-b p-6 sm:p-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/20 rounded-xl text-primary"><History className="h-6 w-6" /></div>
                        <div>
                          <CardTitle className="text-xl font-black tracking-tight">Strategic Hub</CardTitle>
                          <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Welcome back to your financial center</CardDescription>
                        </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-6 sm:p-8 space-y-6">
                      {latestProfile && (
                        <div className="space-y-3">
                           <p className="text-[9px] font-black uppercase text-primary tracking-widest ml-1">Continue Latest</p>
                           <button 
                             onClick={() => loadStrategy(latestProfile)}
                             className="w-full p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group text-left flex items-center justify-between"
                           >
                              <div className="pointer-events-none">
                                <h4 className="text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">{latestProfile.name}</h4>
                                <div className="flex items-center gap-3 mt-1 opacity-70">
                                   <Badge variant="outline" className="text-[8px] font-black bg-background">₹{parseFloat(latestProfile.salary).toLocaleString()}</Badge>
                                   <span className="text-[8px] font-black uppercase tracking-widest">Modified {format(new Date(latestProfile.updatedAt), 'MMM dd')}</span>
                                </div>
                              </div>
                              <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform pointer-events-none">
                                <ChevronRight className="h-5 w-5" />
                              </div>
                           </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Intent</p>
                            <Button onClick={() => setIsStartingNew(true)} variant="outline" className="w-full h-14 rounded-xl border-dashed font-black text-xs uppercase gap-2 hover:bg-primary/5 hover:border-primary/40">
                               <Plus className="h-4 w-4" /> Create New Strategy
                            </Button>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Vault</p>
                            <Popover>
                               <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full h-14 rounded-xl font-black text-xs uppercase gap-2">
                                     <Library className="h-4 w-4" /> Choose From Vault
                                  </Button>
                               </PopoverTrigger>
                               <PopoverContent align="center" className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-none ring-1 ring-border">
                                  <div className="bg-muted/30 p-3 border-b">
                                     <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Strategic Profiles</p>
                                  </div>
                                  <ScrollArea className="h-64">
                                     <div className="divide-y divide-dashed">
                                        {decryptedProfiles.map(p => (
                                           <div key={p.id} className="w-full hover:bg-primary/5 transition-colors group flex items-center justify-between p-4">
                                              <button 
                                                onClick={() => loadStrategy(p)}
                                                className="flex-1 text-left flex flex-col gap-0.5 focus:outline-none"
                                              >
                                                <span className="text-[11px] font-black uppercase group-hover:text-primary transition-colors">{p.name}</span>
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">₹{parseFloat(p.salary).toLocaleString()} • Age {p.age}</span>
                                              </button>
                                              <Button variant="ghost" size="icon" onClick={(e) => deleteStrategy(p.id, e)} className="h-7 w-7 text-destructive/40 hover:text-destructive shrink-0 ml-2">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                           </div>
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
                <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border max-w-md w-full overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b px-6 pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          Initial Metrics
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Define your financial baseline</CardDescription>
                      </div>
                      {(isEditingMetrics || (decryptedProfiles.length > 0 && isStartingNew)) && (
                        <Button variant="ghost" size="icon" onClick={() => { setIsEditingMetrics(false); setIsStartingNew(false); }} className="h-8 w-8 rounded-full">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6 px-6 pb-8">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Strategy Alias</Label>
                      <Input placeholder="e.g. AGGRESSIVE 2026" value={strategyName} onChange={(e) => setStrategyName(e.target.value)} className="h-10 font-black rounded-lg text-sm uppercase bg-muted/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Salary (₹)</Label>
                        <Input type="number" placeholder="75000" value={salary} onChange={(e) => setSalary(e.target.value)} className="font-black text-lg h-12 bg-muted/20 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age</Label>
                        <Input type="number" placeholder="28" value={age} onChange={(e) => setAge(e.target.value)} className="h-12 font-black rounded-xl text-lg bg-muted/20" />
                      </div>
                    </div>
                    <Button 
                      onClick={() => { setShowResults(true); setIsEditingMetrics(false); setIsStartingNew(false); }} 
                      disabled={!salary || !age}
                      className="w-full h-12 text-sm font-black shadow-lg rounded-xl gap-2 mt-2"
                    >
                      Generate Dashboard <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 grid-cols-1 animate-in slide-in-from-top-2 duration-500">
              {/* Compact Metrics Bar */}
              <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
                    <div className="space-y-0.5">
                      <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Monthly Income</p>
                      <p className="text-lg font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8 hidden md:block" />
                    <div className="space-y-0.5">
                      <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Age Baseline</p>
                      <p className="text-lg font-black tracking-tighter">{numAge}y</p>
                    </div>
                    <Separator orientation="vertical" className="h-8 hidden md:block" />
                    <div className="space-y-0.5">
                      <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Alias</p>
                      <p className="text-base font-black tracking-tight uppercase text-primary truncate max-w-[120px]">{strategyName || "Unnamed"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingMetrics(true)} className="rounded-lg h-9 px-3 font-black uppercase text-[8px] tracking-widest gap-1.5 border-dashed">
                      <PencilLine className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={createNewStrategy} className="rounded-lg h-9 px-3 font-black uppercase text-[8px] tracking-widest gap-1.5 border border-dashed">
                      <PlusCircle className="h-3.5 w-3.5" /> Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Main Allocation Logic */}
              <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4 px-6 md:px-8">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-xl text-primary"><BrainCircuit className="h-5 w-5 animate-pulse" /></div>
                      <div>
                        <CardTitle className="text-lg font-black tracking-tight">Income Allocation Engine</CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Utilization tracking & scaling</CardDescription>
                      </div>
                    </div>
                    <Badge variant={totalPercent === 100 ? "secondary" : "destructive"} className="h-8 px-4 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                      {totalPercent}% Allocated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 md:gap-8 p-6 md:p-8">
                  {/* Compact Chart Container */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/5 rounded-[2rem] border border-dashed border-primary/10">
                    <div className="w-full aspect-square max-w-[300px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={salaryData} 
                            innerRadius={65} 
                            outerRadius={95} 
                            paddingAngle={5} 
                            dataKey="value" 
                            stroke="none"
                            label={renderAllocationLabel}
                            labelLine={false}
                            animationDuration={1000}
                          >
                            {salaryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={{ color: 'hsl(var(--popover-foreground))' }} formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-sm">
                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Total</span>
                        <p className="text-2xl font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-6">
                      {pillars.map((item) => {
                        const committed = committedCosts[item.id] || 0;
                        const totalAllowed = amounts[item.id] || 0;
                        const committedPercent = totalAllowed > 0 ? (committed / totalAllowed) * 100 : 0;
                        const isOverspent = committed > totalAllowed;
                        const isLocked = lockedPillars.has(item.id);
                        const Icon = item.icon || Coins;
                        
                        return (
                          <div key={item.id} className="space-y-3 group relative border-b last:border-0 pb-4 last:pb-0">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleLock(item.id)} className={cn("p-1.5 rounded-lg transition-all", isLocked ? "bg-orange-100 text-orange-600 ring-1 ring-orange-200" : "bg-muted text-muted-foreground hover:text-foreground")}>
                                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </button>
                                <div className={cn("p-1.5 rounded-lg shadow-sm text-white", isOverspent ? "bg-destructive animate-pulse" : "")} style={{ backgroundColor: isOverspent ? undefined : item.color }}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col min-w-[80px]">
                                  <Label className="font-black text-[11px] uppercase tracking-tighter leading-none mb-0.5">{item.label}</Label>
                                  <span className={cn("text-[7px] font-bold uppercase", isOverspent ? "text-destructive" : "text-primary/60")}>₹{committed.toLocaleString()} Used</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className={cn("flex flex-col items-center px-3 py-1.5 rounded-xl border shadow-inner transition-all w-28", isLocked ? "bg-orange-50 border-orange-200" : "bg-muted/20 border-primary/10")}>
                                  <span className="text-[7px] font-black uppercase text-muted-foreground mb-0.5">Planned Cap</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-muted-foreground opacity-40">₹</span>
                                    <Input type="number" value={Math.round(totalAllowed)} onChange={(e) => updateAmount(item.id, e.target.value)} className="w-16 h-5 border-none bg-transparent p-0 text-[13px] font-black focus-visible:ring-0 shadow-none tracking-tighter" />
                                  </div>
                                </div>
                                <div className={cn("flex flex-col items-center px-3 py-1.5 rounded-xl border shadow-inner transition-all w-16", isLocked ? "bg-orange-100 border-orange-300" : "bg-primary/5 border-primary/20")}>
                                  <span className="text-[7px] font-black uppercase text-primary/60 mb-0.5">Scale</span>
                                  <div className="flex items-center gap-0.5">
                                    <Input type="number" value={Math.round((percents[item.id] || 0) * 10) / 10} onChange={(e) => updatePercent(item.id, parseFloat(e.target.value) || 0)} className="w-8 h-5 border-none bg-transparent p-0 text-[13px] font-black text-right focus-visible:ring-0 shadow-none tracking-tighter" />
                                    <span className="text-[11px] font-bold text-primary opacity-60">%</span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deletePillar(item.id)} className="h-8 w-8 text-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Slider value={[percents[item.id] || 0]} max={100} step={0.5} onValueChange={([val]) => updatePercent(item.id, val)} className={cn("h-2", isLocked && "[&_.relative]:opacity-50")} />
                              <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest opacity-50">
                                 <span>{isOverspent ? "CAP EXCEEDED" : "ALLOCATION LOAD"}</span>
                                 <span>{Math.round(committedPercent)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-6 rounded-[1.5rem] bg-primary/5 border border-dashed border-primary/20 flex flex-col sm:flex-row items-center gap-3">
                      <Input placeholder="ADD CUSTOM PILLAR..." value={newPillarName} onChange={e => setNewPillarName(e.target.value)} className="h-10 text-[10px] uppercase font-black tracking-tight rounded-lg bg-background shadow-sm px-4" />
                      <Button onClick={addPillar} className="h-10 px-6 shrink-0 rounded-lg shadow-md gap-2 uppercase font-black text-[9px] tracking-widest"><Plus className="h-4 w-4" /> Add Pillar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sub Analysis Grid - More compact */}
              <div className="grid gap-4 md:grid-cols-2">
                {percents['investment'] !== undefined && (
                  <Card className="shadow-lg rounded-[1.5rem] border-none ring-1 ring-orange-500/10 overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/10 px-6 pt-4">
                      <CardTitle className="text-xs flex items-center gap-2 font-black"><Target className="h-3.5 w-3.5 text-orange-500" /> Asset matrix</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-6 pb-6 space-y-4">
                      <div className="h-[150px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={invData} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                              {invData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                           <p className="text-xs font-black tracking-tighter">₹{Math.round(amounts['investment'] || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ label: 'Eq', p: invAllocation.equityP, color: 'text-purple-500' }, { label: 'Db', p: invAllocation.debtP, color: 'text-blue-500' }, { label: 'Gl', p: invAllocation.goldP, color: 'text-yellow-500' }].map(item => (
                          <div key={item.label} className="p-2 border rounded-xl bg-muted/5 text-center space-y-0.5">
                            <p className="text-[7px] font-black text-muted-foreground uppercase">{item.label}</p>
                            <span className={cn("text-[10px] font-black", item.color)}>{item.p}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="shadow-lg rounded-[1.5rem] border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="pb-2 border-b bg-muted/10 px-6 pt-4">
                    <CardTitle className="text-xs flex items-center gap-2 font-black"><Info className="h-3.5 w-3.5 text-muted-foreground" /> Strategy logic</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-6 space-y-4 max-h-[300px] overflow-y-auto pb-6">
                    <div className="space-y-3">
                      {pillars.map(p => (
                         <div key={p.id} className="space-y-1 group">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase text-foreground tracking-tight">{p.label}</p>
                              {committedCosts[p.id] > 0 && <Badge className="text-[6px] font-black uppercase bg-orange-100 text-orange-600 border-none px-1.5 h-3.5">Active</Badge>}
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-snug font-medium opacity-70 truncate">Encrypted node for {p.label} allocation.</p>
                         </div>
                      ))}
                    </div>
                    <Separator className="border-dashed" />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase leading-relaxed italic opacity-60">Protected by client-side AES-GCM encryption.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[1.5rem] p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Vault Strategy
            </DialogTitle>
            <DialogDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Assign an alias for this strategic node.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-primary ml-1">Strategy Alias</Label>
              <Input placeholder="e.g. BALANCED 2026..." value={strategyName} onChange={(e) => setStrategyName(e.target.value)} className="h-12 rounded-xl font-black uppercase tracking-tight text-base bg-muted/20" autoFocus />
            </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20 text-[9px] font-bold leading-relaxed text-muted-foreground uppercase tracking-tight">
              Synchronizing: Monthly income of <span className="text-foreground">₹{numSalary.toLocaleString()}</span> will be locked into the vault.
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)} className="rounded-lg font-black text-[9px] uppercase tracking-widest h-11 flex-1">Abort</Button>
            <Button onClick={handleSaveStrategy} disabled={!strategyName.trim()} className="rounded-lg font-black text-[9px] uppercase tracking-[0.15em] h-11 flex-1 shadow-lg gap-2">
              <ShieldCheck className="h-4 w-4" /> Secure Strategy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}