
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
  Library,
  Sparkles,
  PencilLine,
  X,
  History,
  Scale,
  Activity,
  Flame,
  Zap,
  Utensils,
  Stethoscope,
  CookingPot,
  ListChecks,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  LabelList
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { generateDietPlan, type GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [lockedPillars, setLockedPillars] = useState<Set<string>>(new Set());
  const [newPillarName, setNewPillarName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [isStartingNew, setIsStartingNew] = useState(false);
  
  // Wealth Strategy State
  const [salary, setSalary] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [percents, setPercents] = useState<Record<string, number>>(DEFAULT_RATIOS);
  const [pillars, setPillars] = useState<any[]>(STANDARD_PILLARS);
  const [showResults, setShowResults] = useState(false);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);

  // Health Strategy State
  const [hWeight, setHWeight] = useState<string>('');
  const [hHeight, setHHeight] = useState<string>('');
  const [hAge, setHAge] = useState<string>('');
  const [hGender, setHGender] = useState<'male' | 'female'>('male');
  const [hActivity, setHActivity] = useState<string>('moderate');
  const [hGoal, setHGoal] = useState<string>('maintain');
  const [hIntensity, setHIntensity] = useState<string>('moderate');
  const [isHealthSaving, setIsHealthSaving] = useState(false);
  const [aiPlan, setAiPlan] = useState<GenerateDietPlanOutput | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monthId = mounted ? format(new Date(), 'yyyyMM') : '';

  const salaryProfilesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'salaryProfiles');
  }, [db, user]);

  const healthProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'healthProfile', 'current');
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
  const { data: rawHealthProfile } = useDoc(healthProfileRef);
  
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
    const decryptHealth = async () => {
      if (rawHealthProfile && user && mounted) {
        setHWeight(rawHealthProfile.isEncrypted ? await decryptData(rawHealthProfile.weight, user.uid) : (rawHealthProfile.weight || ''));
        setHHeight(rawHealthProfile.isEncrypted ? await decryptData(rawHealthProfile.height, user.uid) : (rawHealthProfile.height || ''));
        setHAge(rawHealthProfile.isEncrypted ? await decryptData(rawHealthProfile.age, user.uid) : (rawHealthProfile.age || ''));
        setHGender(rawHealthProfile.gender || 'male');
        setHActivity(rawHealthProfile.activityLevel || 'moderate');
        setHGoal(rawHealthProfile.goalType || 'maintain');
        setHIntensity(rawHealthProfile.goalIntensity || 'moderate');
      }
    };
    decryptHealth();
  }, [rawHealthProfile, user, mounted]);

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

  // Health Logic
  const healthStats = useMemo(() => {
    const w = parseFloat(hWeight) || 0;
    const h = parseFloat(hHeight) || 0;
    const a = parseInt(hAge) || numAge || 25;
    if (!w || !h) return null;

    // Mifflin-St Jeor Equation
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = hGender === 'male' ? bmr + 5 : bmr - 161;

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const tdee = bmr * (activityMultipliers[hActivity] || 1.55);

    let target = tdee;
    const intensityMap: Record<string, number> = {
      low: 250,
      moderate: 500,
      aggressive: 750
    };
    const offset = intensityMap[hIntensity] || 500;

    if (hGoal === 'lose') target -= offset;
    if (hGoal === 'gain') target += offset;

    const bmi = w / ((h / 100) * (h / 100));

    // Recommendation logic
    let recommendation = "Maintain Current Weight";
    if (bmi < 18.5) recommendation = "Weight Gain Recommended";
    else if (bmi >= 25) recommendation = "Weight Loss Recommended";

    return { 
      bmr, 
      tdee, 
      target: Math.round(target), 
      bmi: parseFloat(bmi.toFixed(1)),
      recommendation
    };
  }, [hWeight, hHeight, hAge, hGender, hActivity, hGoal, hIntensity, numAge]);

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Healthy', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500' };
    return { label: 'Obese', color: 'text-red-500' };
  };

  const salaryData = useMemo(() => {
    return pillars.map(p => ({
      name: p.label,
      value: amounts[p.id] || 0,
      color: p.color,
      percent: percents[p.id] || 0
    })).filter(d => d.value > 0);
  }, [pillars, amounts, percents]);

  const totalPercent = useMemo(() => Math.round(Object.values(percents).reduce((a, b) => a + b, 0)), [percents]);

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
      toast({ title: 'Strategy Updated' });
    } else {
      addDocumentNonBlocking(salaryProfilesRef, {
        ...payload,
        createdAt: new Date().toISOString()
      }).then(docRef => {
        if (docRef) setActiveStrategyId(docRef.id);
      });
      toast({ title: 'Strategy Vaulted' });
    }

    setIsSaveModalOpen(false);
  };

  const handleSaveHealthStrategy = async () => {
    if (!user || !healthProfileRef || !healthStats) return;
    setIsHealthSaving(true);
    
    const payload = {
      userId: user.uid,
      weight: await encryptData(hWeight, user.uid),
      height: await encryptData(hHeight, user.uid),
      age: await encryptData(hAge || age, user.uid),
      gender: hGender,
      activityLevel: hActivity,
      goalType: hGoal,
      goalIntensity: hIntensity,
      dailyCalorieTarget: await encryptData(healthStats.target.toString(), user.uid),
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(healthProfileRef, payload, { merge: true });
    toast({ 
      title: "Health Strategy Locked", 
      description: `Daily target: ${healthStats.target} kcal.`,
      icon: <Utensils className="h-4 w-4" />
    });
    setIsHealthSaving(false);
  };

  const handleGenerateAiPlan = async () => {
    if (!healthStats) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await generateDietPlan({
        weight: parseFloat(hWeight),
        height: parseFloat(hHeight),
        age: parseInt(hAge || age),
        gender: hGender,
        activityLevel: hActivity,
        goal: hGoal,
        targetCalories: healthStats.target,
        bmi: healthStats.bmi
      });
      setAiPlan(plan);
      toast({ title: "AI Strategy Proposed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Generation failed" });
    } finally {
      setIsGeneratingPlan(false);
    }
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
    setIsEditingMetrics(false);
    setIsStartingNew(false);
    toast({ title: "Strategy Loaded" });
  };

  const createNewStrategy = () => {
    setActiveStrategyId(null);
    setStrategyName('');
    setSalary('');
    setAge('');
    setPercents(DEFAULT_RATIOS);
    setPillars(STANDARD_PILLARS);
    setShowResults(false);
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

  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, name, fill } = props;
    if (cx === undefined || cy === undefined || midAngle === undefined || outerRadius === undefined) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-black text-[7px] md:text-[8px] uppercase tracking-tighter">
        {name}
      </text>
    );
  };

  return (
    <AppShell>
      {!mounted || (isDecrypting && !decryptedProfiles.length) ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Planner...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Tabs defaultValue="wealth" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/10">
                  <Calculator className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Life Planner</h2>
                  <p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest">Multi-perspective Strategic Hub</p>
                </div>
              </div>
              <TabsList className="bg-muted/50 rounded-xl h-10 p-1 border">
                <TabsTrigger value="wealth" className="rounded-lg font-black text-[10px] uppercase gap-2"><Coins className="h-3.5 w-3.5" /> Wealth</TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg font-black text-[10px] uppercase gap-2"><HeartPulse className="h-3.5 w-3.5" /> Nutrition</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="wealth" className="mt-0 space-y-6">
              {!showResults || isEditingMetrics ? (
                <div className="flex items-center justify-center py-6 md:py-12 animate-in zoom-in-95 duration-500 px-1">
                  {(!isStartingNew && !isEditingMetrics && decryptedProfiles.length > 0) ? (
                    <Card className="shadow-xl rounded-[1.5rem] md:rounded-[2rem] border-none ring-1 ring-border max-w-xl w-full overflow-hidden bg-card/50 backdrop-blur-md">
                       <CardHeader className="bg-primary/5 border-b p-5 md:p-8">
                          <div className="flex items-center gap-3">
                            <div className="p-2 md:p-2.5 bg-primary/20 rounded-xl text-primary"><History className="h-5 w-5 md:h-6 md:w-6" /></div>
                            <div>
                              <CardTitle className="text-lg md:text-xl font-black tracking-tight">Strategic Hub</CardTitle>
                              <CardDescription className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Wealth Strategy Vault</CardDescription>
                            </div>
                          </div>
                       </CardHeader>
                       <CardContent className="p-5 md:p-8 space-y-6">
                          {latestProfile && (
                            <div className="space-y-3">
                               <p className="text-[9px] font-black uppercase text-primary tracking-widest ml-1">Continue Latest</p>
                               <button onClick={() => loadStrategy(latestProfile)} className="w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group text-left flex items-center justify-between">
                                  <div className="pointer-events-none">
                                    <h4 className="text-base md:text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">{latestProfile.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 opacity-70">
                                       <Badge variant="outline" className="text-[7px] md:text-[8px] font-black bg-background">₹{parseFloat(latestProfile.salary).toLocaleString()}</Badge>
                                       <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Modified {format(new Date(latestProfile.updatedAt), 'MMM dd')}</span>
                                    </div>
                                  </div>
                                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform pointer-events-none">
                                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                                  </div>
                               </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Intent</p>
                                <Button onClick={() => setIsStartingNew(true)} variant="outline" className="w-full h-12 md:h-14 rounded-xl border-dashed font-black text-[10px] md:text-xs uppercase gap-2 hover:bg-primary/5 hover:border-primary/40"><Plus className="h-4 w-4" /> Create New</Button>
                             </div>
                             <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Vault</p>
                                <Popover>
                                   <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full h-12 md:h-14 rounded-xl font-black text-[10px] md:text-xs uppercase gap-2"><Library className="h-4 w-4" /> Choose From Vault</Button>
                                   </PopoverTrigger>
                                   <PopoverContent align="center" className="w-72 md:w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-none ring-1 ring-border">
                                      <div className="bg-muted/30 p-3 border-b"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Strategic Profiles</p></div>
                                      <ScrollArea className="h-64">
                                         <div className="divide-y divide-dashed">
                                            {decryptedProfiles.map(p => (
                                               <div key={p.id} className="w-full hover:bg-primary/5 transition-colors group flex items-center justify-between p-3 md:p-4">
                                                  <button onClick={() => loadStrategy(p)} className="flex-1 text-left flex flex-col gap-0.5 focus:outline-none">
                                                    <span className="text-[10px] md:text-[11px] font-black uppercase group-hover:text-primary transition-colors">{p.name}</span>
                                                    <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase">₹{parseFloat(p.salary).toLocaleString()} • Age {p.age}</span>
                                                  </button>
                                                  <Button variant="ghost" size="icon" onClick={(e) => deleteStrategy(p.id, e)} className="h-7 w-7 text-destructive/40 hover:text-destructive shrink-0 ml-2"><Trash2 className="h-3.5 w-3.5" /></Button>
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
                    <Card className="shadow-xl rounded-[1.5rem] md:rounded-[2rem] border-none ring-1 ring-border max-w-md w-full overflow-hidden">
                      <CardHeader className="bg-muted/30 pb-4 border-b px-5 md:px-6 pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2"><Target className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Wealth Baseline</CardTitle>
                            <CardDescription className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Define your income baseline</CardDescription>
                          </div>
                          {(isEditingMetrics || (decryptedProfiles.length > 0 && isStartingNew)) && (
                            <Button variant="ghost" size="icon" onClick={() => { setIsEditingMetrics(false); setIsStartingNew(false); }} className="h-8 w-8 rounded-full"><X className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6 px-5 md:px-6 pb-8">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Strategy Alias (Optional)</Label>
                          <Input placeholder="e.g. AGGRESSIVE 2026" value={strategyName} onChange={(e) => setStrategyName(e.target.value)} className="h-10 font-black rounded-lg text-sm uppercase bg-muted/10" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly Salary (₹)</Label>
                            <Input type="number" placeholder="75000" value={salary} onChange={(e) => setSalary(e.target.value)} className="font-black text-base md:text-lg h-11 md:h-12 bg-muted/20 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Age</Label>
                            <Input type="number" placeholder="28" value={age} onChange={(e) => setAge(e.target.value)} className="h-11 md:h-12 font-black rounded-xl text-base md:text-lg bg-muted/20" />
                          </div>
                        </div>
                        <Button onClick={() => { setShowResults(true); setIsEditingMetrics(false); setIsStartingNew(false); }} disabled={!salary || !age} className="w-full h-12 text-[11px] md:text-sm font-black shadow-lg rounded-xl gap-2 mt-2">Generate Wealth Matrix <ChevronRight className="h-4 w-4" /></Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:gap-6 grid-cols-1 animate-in slide-in-from-top-2 duration-500 px-1">
                  <Card className="shadow-lg rounded-xl md:rounded-2xl border-none ring-1 ring-border bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 md:gap-6 flex-wrap justify-center md:justify-start">
                        <div className="space-y-0.5 text-center md:text-left flex flex-col items-center md:items-start">
                          <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Monthly Income</p>
                          <p className="text-base md:text-lg font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                        </div>
                        <Separator orientation="vertical" className="h-6 hidden md:block" />
                        <div className="space-y-0.5 text-center md:text-left flex flex-col items-center md:items-start">
                          <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Age Baseline</p>
                          <p className="text-base md:text-lg font-black tracking-tighter">{numAge} Years</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingMetrics(true)} className="rounded-lg h-8 md:h-9 px-3 font-black uppercase text-[8px] tracking-widest gap-1.5 border-dashed flex-1 md:flex-none">Edit Metrics</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(true)} className="rounded-lg h-8 md:h-9 px-3 font-black uppercase text-[8px] tracking-widest gap-1.5 bg-primary text-white flex-1 md:flex-none">Save Strategy</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xl rounded-[1.5rem] md:rounded-[2rem] border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b py-3 px-5 md:px-8">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base md:text-lg font-black tracking-tight flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary animate-pulse" /> Income Allocation Engine</CardTitle>
                        <Badge variant={totalPercent === 100 ? "secondary" : "destructive"} className="h-7 px-3 rounded-full text-[8px] font-black uppercase tracking-widest">{totalPercent}% Allocated</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 md:gap-6 p-5 md:p-8">
                      <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-muted/5 rounded-[1.5rem] md:rounded-3xl border border-dashed border-primary/10">
                        <div className="w-[220px] h-[220px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={salaryData} innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none" label={renderLabel} labelLine={false} animationDuration={1000}>
                                {salaryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `₹${Math.round(v).toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-sm">
                            <span className="text-[7px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Total</span>
                            <p className="text-[10px] md:text-xs font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 md:space-y-5">
                        {pillars.map((item) => {
                          const committed = committedCosts[item.id] || 0;
                          const totalAllowed = amounts[item.id] || 0;
                          const committedPercent = totalAllowed > 0 ? (committed / totalAllowed) * 100 : 0;
                          const isOverspent = committed > totalAllowed;
                          const isLocked = lockedPillars.has(item.id);
                          const Icon = item.icon || Coins;
                          
                          return (
                            <div key={item.id} className="p-3 md:p-4 rounded-2xl border bg-card hover:shadow-md transition-all space-y-4 group relative overflow-hidden">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn("p-2 rounded-xl text-white shadow-sm shrink-0 transition-transform group-hover:scale-110")} style={{ backgroundColor: item.color }}><Icon className="h-4 w-4" /></div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-black text-[10px] md:text-xs uppercase tracking-tight truncate">{item.label}</span>
                                    <span className={cn("text-[8px] font-bold uppercase", isOverspent ? "text-destructive" : "text-muted-foreground")}>Used: ₹{committed.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => toggleLock(item.id)} className={cn("p-1.5 rounded-lg transition-colors", isLocked ? "bg-orange-100 text-orange-600" : "hover:bg-muted text-muted-foreground")}>
                                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                  </button>
                                  <Button variant="ghost" size="icon" onClick={() => deletePillar(item.id)} className="h-8 w-8 text-destructive/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className={cn("flex flex-col p-2.5 rounded-xl border bg-muted/10 transition-all", isLocked && "border-orange-200 bg-orange-50/20")}>
                                  <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Planned Target</span>
                                  <div className="flex items-center gap-1"><span className="text-[10px] font-bold opacity-30">₹</span><input type="number" value={Math.round(totalAllowed)} onChange={(e) => updateAmount(item.id, e.target.value)} className="w-full bg-transparent font-black text-xs md:text-sm focus:outline-none tracking-tight" /></div>
                                </div>
                                <div className={cn("flex flex-col p-2.5 rounded-xl border bg-muted/10 transition-all", isLocked && "border-orange-200 bg-orange-50/20")}>
                                  <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Scale Ratio</span>
                                  <div className="flex items-center gap-1"><input type="number" value={Math.round(percents[item.id] * 10) / 10} onChange={(e) => updatePercent(item.id, parseFloat(e.target.value) || 0)} className="w-full bg-transparent font-black text-xs md:text-sm text-right focus:outline-none tracking-tight" /><span className="text-[10px] font-bold opacity-30">%</span></div>
                                </div>
                              </div>
                              <div className="space-y-1.5 px-0.5"><Slider value={[percents[item.id] || 0]} max={100} step={0.5} onValueChange={([val]) => updatePercent(item.id, val)} className={cn(isLocked && "opacity-50")} /><div className="flex justify-between items-center text-[7px] md:text-[8px] font-black uppercase tracking-widest px-0.5"><span className={cn(isOverspent ? "text-destructive animate-pulse" : "text-muted-foreground")}>{isOverspent ? "CAP EXCEEDED" : "ALLOCATION LOAD"}</span><span className={cn(isOverspent ? "text-destructive" : "text-primary")}>{Math.round(committedPercent)}% of pillar</span></div></div>
                            </div>
                          );
                        })}
                        <div className="p-4 md:p-6 rounded-[1.2rem] md:rounded-[1.5rem] bg-primary/5 border border-dashed border-primary/20 flex flex-col sm:flex-row items-center gap-3">
                          <Input placeholder="ADD CUSTOM PILLAR..." value={newPillarName} onChange={e => setNewPillarName(e.target.value)} className="h-10 md:h-11 text-[9px] md:text-[10px] uppercase font-black tracking-tight rounded-lg bg-background shadow-sm px-4" />
                          <Button onClick={addPillar} className="h-10 md:h-11 w-full sm:w-auto px-6 shrink-0 rounded-lg shadow-md gap-2 uppercase font-black text-[9px] tracking-widest"><Plus className="h-4 w-4" /> Add Pillar</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="health" className="mt-0 space-y-6">
              <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-2 duration-500 px-1">
                <div className="lg:col-span-5 space-y-6">
                  <Card className="shadow-xl rounded-[1.5rem] md:rounded-[2rem] border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b py-4 px-6">
                      <CardTitle className="text-lg md:text-xl font-black flex items-center gap-3">
                        <Activity className="h-5 w-5 text-primary" />
                        Nutrition Engine
                      </CardTitle>
                      <CardDescription className="text-[8px] font-bold uppercase tracking-widest">Physiological Architecture</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Current Weight (kg)</Label>
                          <Input type="number" placeholder="70" value={hWeight} onChange={e => setHWeight(e.target.value)} className="h-11 rounded-xl font-black text-base md:text-lg bg-muted/20" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Current Height (cm)</Label>
                          <Input type="number" placeholder="175" value={hHeight} onChange={e => setHHeight(e.target.value)} className="h-11 rounded-xl font-black text-base md:text-lg bg-muted/20" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Current Age</Label>
                          <Input type="number" placeholder="25" value={hAge || age} onChange={e => setHAge(e.target.value)} className="h-11 rounded-xl font-black text-base md:text-lg bg-muted/20" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Gender</Label>
                          <Select value={hGender} onValueChange={(v: any) => setHGender(v)}>
                            <SelectTrigger className="h-11 rounded-xl font-black uppercase text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male" className="font-black uppercase text-[10px]">Male</SelectItem>
                              <SelectItem value="female" className="font-black uppercase text-[10px]">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Activity Load</Label>
                        <Select value={hActivity} onValueChange={setHActivity}>
                          <SelectTrigger className="h-11 rounded-xl font-black uppercase text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentary" className="font-black uppercase text-[10px]">Sedentary (No Exercise)</SelectItem>
                            <SelectItem value="light" className="font-black uppercase text-[10px]">Light (1-3 days/wk)</SelectItem>
                            <SelectItem value="moderate" className="font-black uppercase text-[10px]">Moderate (3-5 days/wk)</SelectItem>
                            <SelectItem value="active" className="font-black uppercase text-[10px]">Active (6-7 days/wk)</SelectItem>
                            <SelectItem value="very_active" className="font-black uppercase text-[10px]">Very Active (Hard labor)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="border-dashed" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Primary Objective</Label>
                          {healthStats && (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[7px] font-black uppercase">
                              Recommendation: {hGoal === 'lose' ? 'Weight Loss' : hGoal === 'gain' ? 'Weight Gain' : 'Maintenance'}
                            </Badge>
                          )}
                        </div>
                        <Tabs value={hGoal} onValueChange={setHGoal} className="w-full">
                          <TabsList className="grid w-full grid-cols-3 h-10 p-1 rounded-xl bg-muted/50 border">
                            <TabsTrigger value="lose" className="text-[9px] font-black uppercase">Lose</TabsTrigger>
                            <TabsTrigger value="maintain" className="text-[9px] font-black uppercase">Maintain</TabsTrigger>
                            <TabsTrigger value="gain" className="text-[9px] font-black uppercase">Gain</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {hGoal !== 'maintain' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-primary ml-1">Goal Intensity</Label>
                          <Tabs value={hIntensity} onValueChange={setHIntensity} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-10 p-1 rounded-xl bg-muted/50 border">
                              <TabsTrigger value="low" className="text-[9px] font-black uppercase">Low</TabsTrigger>
                              <TabsTrigger value="moderate" className="text-[9px] font-black uppercase">Standard</TabsTrigger>
                              <TabsTrigger value="aggressive" className="text-[9px] font-black uppercase text-destructive">Aggressive</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  {healthStats ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                      <div className="grid grid-cols-2 gap-4">
                         <Card className="rounded-[1.5rem] border-none ring-1 ring-border p-5 space-y-2 bg-card/50">
                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Activity Factor</p>
                            <div className="flex items-center justify-between">
                               <span className="text-lg font-black uppercase tracking-tighter text-foreground">{hActivity.replace('_', ' ')}</span>
                               <Activity className="h-5 w-5 text-primary opacity-30" />
                            </div>
                         </Card>
                         <Card className="rounded-[1.5rem] border-none ring-1 ring-border p-5 space-y-2 bg-card/50">
                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Weight Trajectory</p>
                            <div className="flex items-center justify-between">
                               <span className="text-lg font-black uppercase tracking-tighter text-foreground">{hGoal}</span>
                               <TrendingUp className={cn("h-5 w-5 opacity-30", hGoal === 'lose' ? "text-destructive rotate-180" : "text-primary")} />
                            </div>
                         </Card>
                      </div>

                      <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden">
                        <CardHeader className="text-center pb-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Strategic Calculation Output</p>
                          <h3 className="text-5xl md:text-7xl font-black tracking-tighter text-primary drop-shadow-md">{healthStats.target}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Planned Daily Calorie Target</p>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-dashed border-primary/20 pt-6">
                             <div className="text-center space-y-1">
                               <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">BMR</p>
                               <p className="text-base md:text-xl font-black text-foreground">{Math.round(healthStats.bmr)}</p>
                             </div>
                             <div className="text-center space-y-1 border-l md:border-x border-dashed border-primary/20 px-2 md:px-4">
                               <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">TDEE</p>
                               <p className="text-base md:text-xl font-black text-foreground">{Math.round(healthStats.tdee)}</p>
                             </div>
                             <div className="text-center space-y-1 border-l border-dashed border-primary/20 px-2 md:px-4">
                               <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">BMI</p>
                               <div className="flex flex-col items-center">
                                 <p className="text-base md:text-xl font-black text-foreground">{healthStats.bmi}</p>
                                 <span className={cn("text-[7px] font-black uppercase", getBMICategory(healthStats.bmi).color)}>{getBMICategory(healthStats.bmi).label}</span>
                               </div>
                             </div>
                             <div className="text-center space-y-1 border-l border-dashed border-primary/20">
                               <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Goal Offset</p>
                               <p className={cn(
                                 "text-base md:text-xl font-black",
                                 hGoal === 'lose' ? "text-destructive" : hGoal === 'gain' ? "text-green-600" : "text-primary"
                               )}>
                                 {hGoal === 'maintain' ? "0" : (hGoal === 'lose' ? "-" : "+") + (hIntensity === 'low' ? '250' : hIntensity === 'aggressive' ? '750' : '500')}
                               </p>
                             </div>
                           </div>

                           <div className="mt-8 p-5 bg-card/50 rounded-2xl border border-dashed border-primary/20 space-y-3 relative overflow-hidden">
                              <Zap className="absolute -right-2 -bottom-2 h-16 w-16 text-primary/[0.03] -rotate-12" />
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Strategy Forecast</span>
                                  </h4>
                                  <p className="text-[10px] font-black uppercase text-muted-foreground">{healthStats.recommendation}</p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={handleGenerateAiPlan}
                                  disabled={isGeneratingPlan}
                                  className="h-8 px-4 text-[8px] font-black uppercase tracking-widest rounded-lg bg-primary/5 border-primary/20 shadow-sm"
                                >
                                  {isGeneratingPlan ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <BrainCircuit className="h-3 w-3 mr-2" />}
                                  {aiPlan ? "Regenerate Proposal" : "Generate AI Diet Plan"}
                                </Button>
                              </div>
                              <div className="p-3 bg-muted/20 rounded-xl border border-dashed flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                  Based on your BMI of <strong>{healthStats.bmi}</strong> ({getBMICategory(healthStats.bmi).label}), the system recommends <strong>{hGoal === 'lose' ? 'Weight Loss' : hGoal === 'gain' ? 'Weight Gain' : 'Maintenance'}</strong>. Consuming <strong>{healthStats.target} kcal/day</strong> will result in a projected {hGoal === 'maintain' ? 'maintenance' : `${hGoal === 'lose' ? 'reduction' : 'increase'} of approx ${hIntensity === 'low' ? '0.25kg' : hIntensity === 'aggressive' ? '0.75kg' : '0.5kg'} per week`}.
                                </p>
                              </div>
                           </div>

                           <div className="mt-8 space-y-4">
                              <Button onClick={handleSaveHealthStrategy} disabled={!hWeight || !hHeight || isHealthSaving} className="w-full h-14 rounded-2xl font-black shadow-xl bg-primary hover:bg-primary/90 text-white gap-3 text-base">
                                {isHealthSaving ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                                SECURE HEALTH STRATEGY
                              </Button>
                              <div className="flex items-center justify-center gap-2">
                                <ShieldCheck className="h-3 w-3 text-primary opacity-60" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">Private Biological Encryption Active</span>
                              </div>
                           </div>

                           {aiPlan && (
                             <div className="mt-6 animate-in slide-in-from-top-4 duration-500">
                               <Card className="rounded-2xl border-none ring-1 ring-primary/20 bg-primary/[0.02] overflow-hidden">
                                 <CardHeader className="bg-primary/5 py-3 px-4 flex flex-row items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <CookingPot className="h-4 w-4 text-primary" />
                                      <CardTitle className="text-xs font-black uppercase tracking-tight">{aiPlan.planName}</CardTitle>
                                   </div>
                                   <Badge variant="outline" className="bg-background text-primary border-primary/20 text-[7px] font-black uppercase">AI Recommended</Badge>
                                 </CardHeader>
                                 <CardContent className="p-4 space-y-4">
                                   <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">"{aiPlan.description}"</p>
                                   
                                   <div className="grid grid-cols-3 gap-2">
                                      <div className="p-2 rounded-xl bg-background border border-dashed flex flex-col items-center">
                                         <span className="text-[7px] font-black uppercase text-muted-foreground">Protein</span>
                                         <span className="text-[10px] font-black text-primary">{aiPlan.macros.protein}</span>
                                      </div>
                                      <div className="p-2 rounded-xl bg-background border border-dashed flex flex-col items-center">
                                         <span className="text-[7px] font-black uppercase text-muted-foreground">Carbs</span>
                                         <span className="text-[10px] font-black text-orange-500">{aiPlan.macros.carbs}</span>
                                      </div>
                                      <div className="p-2 rounded-xl bg-background border border-dashed flex flex-col items-center">
                                         <span className="text-[7px] font-black uppercase text-muted-foreground">Fats</span>
                                         <span className="text-[10px] font-black text-green-600">{aiPlan.macros.fats}</span>
                                      </div>
                                   </div>

                                   <div className="space-y-3">
                                      <h5 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Utensils className="h-3 w-3 text-primary" /> Meal Architecture
                                      </h5>
                                      <div className="grid gap-2">
                                        {aiPlan.mealSuggestions.map((m, idx) => (
                                          <div key={idx} className="p-2.5 rounded-xl bg-background border text-[10px]">
                                            <span className="font-black uppercase text-primary mb-1 block">{m.meal}</span>
                                            <ul className="space-y-0.5 text-muted-foreground font-medium">
                                              {m.suggestions.map((s, i) => <li key={i} className="flex items-start gap-1.5"><div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" /> {s}</li>)}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                   </div>

                                   <div className="space-y-2">
                                      <h5 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <ListChecks className="h-3 w-3 text-primary" /> Strategic Tips
                                      </h5>
                                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                         {aiPlan.tips.map((t, idx) => (
                                           <li key={idx} className="p-2 rounded-lg bg-primary/5 text-[9px] font-bold text-primary/80 flex items-center gap-2 border border-primary/10">
                                              <CheckCircle2 className="h-3 w-3 shrink-0" /> {t}
                                           </li>
                                         ))}
                                      </ul>
                                   </div>
                                 </CardContent>
                               </Card>
                             </div>
                           )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40 grayscale border-2 border-dashed rounded-[2rem]">
                      <Scale className="h-16 w-16 text-muted-foreground" />
                      <div className="space-y-1">
                        <h3 className="text-lg font-black uppercase tracking-tight">Awaiting Biological Inputs</h3>
                        <p className="text-xs font-medium text-muted-foreground">Complete the form to generate your BMI-based recommendation and AI diet proposal.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[1.2rem] md:rounded-[1.5rem] p-5 md:p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-black tracking-tighter flex items-center gap-2">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" /> Vault Strategy
            </DialogTitle>
            <DialogDescription className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Assign an alias for this strategic node.</DialogDescription>
          </DialogHeader>
          <div className="py-5 md:py-6 space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary ml-1">Strategy Alias</Label>
              <Input placeholder="e.g. BALANCED 2026..." value={strategyName} onChange={(e) => setStrategyName(e.target.value)} className="h-11 md:h-12 rounded-xl font-black uppercase tracking-tight text-base bg-muted/20" autoFocus />
            </div>
            <div className="p-3 md:p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20 text-[8px] md:text-[9px] font-bold leading-relaxed text-muted-foreground uppercase tracking-tight">
              Synchronizing: Monthly income of <span className="text-foreground">₹{numSalary.toLocaleString()}</span> will be locked into the vault.
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)} className="rounded-lg font-black text-[8px] md:text-[9px] uppercase tracking-widest h-10 md:h-11 flex-1">Abort</Button>
            <Button onClick={handleSaveStrategy} disabled={!strategyName.trim()} className="rounded-lg font-black text-[8px] md:text-[9px] uppercase tracking-[0.15em] h-10 md:h-11 flex-1 shadow-lg gap-2">
              <ShieldCheck className="h-4 w-4" /> Secure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
