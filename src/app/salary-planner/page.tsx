
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  Calculator, 
  TrendingUp, 
  HeartPulse, 
  Smile, 
  PiggyBank, 
  Info, 
  AlertTriangle, 
  Save, 
  ArrowRightLeft,
  ChevronRight,
  Wallet,
  Coins,
  ShieldCheck,
  Target
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

const COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292'];
const INV_COLORS = ['#BA68C8', '#64B5F6', '#FFD54F'];

export default function SalaryPlannerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [salary, setSalary] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [percents, setPercents] = useState({
    expense: 50,
    savings: 20,
    investment: 20,
    health: 5,
    personal: 5
  });

  const [showResults, setShowResults] = useState(false);

  const salaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'salaryProfiles', 'current');
  }, [db, user]);

  const investmentRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'investmentAllocations', 'current');
  }, [db, user]);

  const { data: savedProfile } = useDoc(salaryRef);

  useEffect(() => {
    if (savedProfile) {
      setSalary(savedProfile.salary.toString());
      setAge(savedProfile.age.toString());
      setPercents({
        expense: savedProfile.expensePercent,
        savings: savedProfile.savingsPercent,
        investment: savedProfile.investmentPercent,
        health: savedProfile.healthPercent,
        personal: savedProfile.personalPercent
      });
      setShowResults(true);
    }
  }, [savedProfile]);

  const numSalary = parseFloat(salary) || 0;
  const numAge = parseInt(age) || 0;

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

  const salaryData = [
    { name: 'Expenses', value: amounts.expense, color: COLORS[0] },
    { name: 'Savings', value: amounts.savings, color: COLORS[1] },
    { name: 'Investments', value: amounts.investment, color: COLORS[2] },
    { name: 'Health', value: amounts.health, color: COLORS[3] },
    { name: 'Personal', value: amounts.personal, color: COLORS[4] }
  ].filter(d => d.value > 0);

  const invData = [
    { name: 'Equity', value: invAllocation.equityAmt, color: INV_COLORS[0] },
    { name: 'Debt', value: invAllocation.debtAmt, color: INV_COLORS[1] },
    { name: 'Gold', value: invAllocation.goldAmt, color: INV_COLORS[2] }
  ].filter(d => d.value > 0);

  const totalPercent = Object.values(percents).reduce((a, b) => a + b, 0);

  const handleSave = () => {
    if (!user || !salaryRef || !investmentRef) return;
    if (totalPercent !== 100) {
      toast({ variant: 'destructive', title: 'Invalid Split', description: 'Total must sum to 100%.' });
      return;
    }
    setDocumentNonBlocking(salaryRef, {
      userId: user.uid,
      salary: numSalary,
      age: numAge,
      expensePercent: percents.expense,
      savingsPercent: percents.savings,
      investmentPercent: percents.investment,
      healthPercent: percents.health,
      personalPercent: percents.personal,
      createdAt: savedProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setDocumentNonBlocking(investmentRef, {
      userId: user.uid,
      equityPercent: invAllocation.equityP,
      debtPercent: invAllocation.debtP,
      goldPercent: invAllocation.goldP,
      equityAmount: invAllocation.equityAmt,
      debtAmount: invAllocation.debtAmt,
      goldAmount: invAllocation.goldAmt,
      createdAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: 'Plan Saved', description: 'Your salary profile has been stored successfully.' });
  };

  const handleGenerate = () => {
    if (numSalary <= 0) return;
    setShowResults(true);
    handleSave();
  };

  const syncWithBudget = () => {
    if (!user || !db) return;
    const monthId = format(new Date(), 'yyyyMM');
    const budgetRef = doc(db, 'users', user.uid, 'monthlyBudgets', monthId);
    setDocumentNonBlocking(budgetRef, {
      userId: user.uid,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalBudgetAmount: amounts.expense,
      baseBudgetAmount: amounts.expense,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: 'Budget Synced', description: `₹${amounts.expense.toLocaleString()} set as monthly target.` });
  };

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Wealth Planner</h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Optimized Income Allocation</p>
            </div>
          </div>
          {showResults && (
            <Button onClick={handleSave} className="shadow-lg h-12 px-6 font-black rounded-2xl bg-primary hover:bg-primary/90 text-sm">
              <Save className="h-4 w-4 mr-2" /> Save Strategy
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <Coins className="h-4 w-4 text-primary" />
                  Base Metrics
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight">Enter details to start allocation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Salary (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 75000" 
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value)}
                    className="font-black text-2xl h-14 bg-muted/20 border-primary/10 focus:ring-2 focus:ring-primary/20 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Age</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 28" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)}
                    className="h-12 font-black rounded-xl"
                  />
                </div>
                <Button onClick={handleGenerate} className="w-full h-12 text-sm font-black shadow-md rounded-xl gap-2">
                  Generate Strategy <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {showResults && (
              <Card className="shadow-xl rounded-2xl border-none ring-1 ring-blue-500/30 bg-blue-50/10 dark:bg-blue-900/10 animate-in slide-in-from-left-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Budget Bridge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                    Your planned expenses are <span className="font-black text-foreground">₹{amounts.expense.toLocaleString()}</span>. 
                    Set this as your daily budget cap?
                  </p>
                  <div className="p-4 bg-white/50 dark:bg-background/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl space-y-4 shadow-sm">
                    <p className="text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest text-center">Auto-sync monthly target?</p>
                    <Button size="sm" onClick={syncWithBudget} className="w-full bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-md h-9">Sync Now</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-8">
            {!showResults ? (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-muted/5 opacity-50 grayscale space-y-4">
                <Calculator className="h-16 w-16 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-black uppercase tracking-tighter">Strategy Pending</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Provide metrics to visualize wealth</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-5 px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight">Income Allocation</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-tight opacity-70">Customizable funds split</CardDescription>
                      </div>
                      <Badge className={cn(
                        "h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                        totalPercent === 100 ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"
                      )}>
                        Total: {totalPercent}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-8 md:grid-cols-5 p-8">
                    <div className="md:col-span-3 space-y-6">
                      {[
                        { id: 'expense', label: 'Expenses', icon: Wallet, color: 'text-blue-500', track: COLORS[0] },
                        { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-green-500', track: COLORS[1] },
                        { id: 'investment', label: 'Investments', icon: TrendingUp, color: 'text-orange-500', track: COLORS[2] },
                        { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-purple-500', track: COLORS[3] },
                        { id: 'personal', label: 'Personal', icon: Smile, color: 'text-pink-500', track: COLORS[4] }
                      ].map((item) => (
                        <div key={item.id} className="space-y-3 group">
                          <div className="flex justify-between items-center">
                            <Label className="flex items-center gap-2 font-black text-[11px] uppercase tracking-tighter text-muted-foreground group-hover:text-primary transition-colors">
                              <item.icon className={cn("h-4 w-4", item.color)} />
                              {item.label} <span className="font-bold ml-1 text-[10px]">({percents[item.id as keyof typeof percents]}%)</span>
                            </Label>
                            <span className="text-sm font-black tracking-tight">₹{amounts[item.id as keyof typeof amounts].toLocaleString()}</span>
                          </div>
                          <Slider 
                            value={[percents[item.id as keyof typeof percents]]}
                            max={100}
                            step={1}
                            onValueChange={([val]) => setPercents({...percents, [item.id]: val})}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-2 flex flex-col items-center justify-center p-4">
                      <div className="w-full h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={salaryData} innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                              {salaryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[8px] uppercase font-black text-muted-foreground">Monthly</span>
                          <p className="text-xl font-black">₹{numSalary.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-xl rounded-3xl border-none ring-1 ring-orange-500/20">
                    <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-sm flex items-center gap-2 font-black">
                        <Target className="h-4 w-4 text-orange-500" />
                        Asset Matrix
                      </CardTitle>
                      <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Risk Profile: Age {numAge}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="h-[180px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={invData} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                              {invData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-lg font-black tracking-tight">₹{amounts.investment.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Equity', amt: invAllocation.equityAmt, p: invAllocation.equityP },
                          { label: 'Debt', amt: invAllocation.debtAmt, p: invAllocation.debtP },
                          { label: 'Gold', amt: invAllocation.goldAmt, p: invAllocation.goldP }
                        ].map(item => (
                          <div key={item.label} className="p-3 border rounded-2xl bg-muted/5 text-center space-y-1">
                            <p className="text-[8px] font-black text-muted-foreground uppercase">{item.label}</p>
                            <p className="text-xs font-black">₹{item.amt.toFixed(0)}</p>
                            <span className="text-[9px] font-black text-primary">{item.p}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-sm flex items-center gap-2 font-black">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Strategic Logic
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5 max-h-[350px] overflow-y-auto">
                      <div className="space-y-4">
                        <h4 className="text-[9px] font-black uppercase text-primary border-b pb-1">Core Allocation</h4>
                        <StrategyDesc label="Expenses" text="Daily living costs like rent, food, travel, and bills." />
                        <StrategyDesc label="Savings" text="Emergency fund for unexpected situations." />
                        <StrategyDesc label="Investments" text="Capital used to grow long-term wealth." />
                        <StrategyDesc label="Health" text="Medical, insurance, and fitness expenses." />
                        <StrategyDesc label="Personal" text="Entertainment, hobbies, and lifestyle spending." />
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

function StrategyDesc({ label, text }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground leading-snug font-medium italic">{text}</p>
    </div>
  );
}

function Badge({ children, className, variant = 'default' }: any) {
  return (
    <div className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
      variant === 'default' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      className
    )}>
      {children}
    </div>
  );
}
