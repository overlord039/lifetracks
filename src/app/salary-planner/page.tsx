
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

  // Firestore Refs
  const salaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'salaryProfiles', 'current');
  }, [db, user]);

  const investmentRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'investmentAllocations', 'current');
  }, [db, user]);

  const { data: savedProfile } = useDoc(salaryRef);

  // Load saved data
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

  // Calculations
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
      equityP,
      debtP,
      goldP,
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
      toast({ variant: 'destructive', title: 'Invalid Split', description: 'Total percentage must sum to 100%.' });
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
    if (numSalary <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Salary', description: 'Monthly salary must be greater than 0.' });
      return;
    }
    if (numAge < 0) {
      toast({ variant: 'destructive', title: 'Invalid Age', description: 'Age cannot be negative.' });
      return;
    }
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

    toast({ title: 'Budget Synced', description: `₹${amounts.expense.toLocaleString()} set as your monthly budget.` });
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-foreground">Salary Planner</h2>
              <p className="text-sm text-muted-foreground font-medium">Strategize and optimize your monthly income split.</p>
            </div>
          </div>
          {showResults && (
            <Button onClick={handleSave} className="shadow-lg px-6 gap-2 bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4" /> Save Strategy
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Panel */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-md border-t-4 border-t-primary overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Income Input
                </CardTitle>
                <CardDescription>Define your base numbers to start the allocation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Salary (₹)</Label>
                  <Input 
                    id="salary" 
                    type="number" 
                    placeholder="e.g. 50000" 
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value)}
                    className="font-black text-2xl h-14 bg-muted/20 border-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Age</Label>
                  <Input 
                    id="age" 
                    type="number" 
                    placeholder="e.g. 25" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)}
                    className="h-12 font-bold"
                  />
                  {numAge > 0 && (numAge < 18 || numAge > 70) && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 mt-2 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p className="text-[10px] font-bold">Risk profile optimized for ages 18-70.</p>
                    </div>
                  )}
                </div>
                <Button onClick={handleGenerate} className="w-full h-12 text-base font-bold shadow-md gap-2">
                  Generate Plan <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {showResults && (
              <Card className="shadow-md border-l-4 border-l-blue-400 bg-blue-50/10 transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    Budget Bridge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                    Your planned expenses are <span className="font-black text-foreground">₹{amounts.expense.toLocaleString()}</span>. 
                    Sync this to your budget module to automate your monthly target.
                  </p>
                  <div className="p-4 bg-white/50 border border-blue-100 rounded-2xl space-y-4 shadow-sm">
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-tighter">Automate Monthly Target?</p>
                    <Button size="sm" onClick={syncWithBudget} className="w-full bg-blue-600 hover:bg-blue-700 font-bold shadow-sm">Sync with Budget</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8 space-y-6">
            {!showResults ? (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl opacity-40 space-y-4 bg-muted/5">
                <Calculator className="h-16 w-16 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-black text-muted-foreground">Ready for Strategy</p>
                  <p className="text-xs text-muted-foreground/80 font-medium">Enter your income details to visualize your wealth map.</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-6">
                <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border">
                  <CardHeader className="bg-muted/30 border-b py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2 font-black tracking-tight">
                          <ArrowRightLeft className="h-5 w-5 text-primary" />
                          Salary Breakup
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">Customizable splits for balanced living.</CardDescription>
                      </div>
                      <div className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border transition-colors duration-500",
                        totalPercent === 100 
                          ? "bg-secondary/20 text-secondary-foreground border-secondary/30" 
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        Total Allocation: {totalPercent}%
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-8 md:grid-cols-5 p-8">
                    <div className="md:col-span-3 space-y-6">
                      {[
                        { id: 'expense', label: 'Expenses', icon: Wallet, color: 'text-blue-500', trackColor: COLORS[0] },
                        { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-green-500', trackColor: COLORS[1] },
                        { id: 'investment', label: 'Investments', icon: TrendingUp, color: 'text-orange-500', trackColor: COLORS[2] },
                        { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-purple-500', trackColor: COLORS[3] },
                        { id: 'personal', label: 'Personal', icon: Smile, color: 'text-pink-500', trackColor: COLORS[4] }
                      ].map((item) => (
                        <div key={item.id} className="space-y-2 group">
                          <div className="flex justify-between items-center">
                            <Label className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                              <item.icon className={cn("h-4 w-4", item.color)} />
                              {item.label} <span className="text-muted-foreground font-medium ml-1">({percents[item.id as keyof typeof percents]}%)</span>
                            </Label>
                            <span className="text-base font-black tracking-tighter">₹{amounts[item.id as keyof typeof amounts].toLocaleString()}</span>
                          </div>
                          <Slider 
                            value={[percents[item.id as keyof typeof percents]]}
                            max={100}
                            step={1}
                            onValueChange={([val]) => setPercents({...percents, [item.id]: val})}
                            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-primary"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="md:col-span-2 flex flex-col items-center justify-center space-y-4">
                      <div className="w-full h-[280px] relative drop-shadow-sm">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={salaryData}
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {salaryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '10px', fontWeight: 'bold' }}
                              formatter={(v: number) => `₹${v.toLocaleString()}`} 
                            />
                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Total Plan</span>
                          <p className="text-xl font-black tracking-tighter">₹{numSalary.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-md border-t-4 border-t-orange-400 overflow-hidden">
                    <CardHeader className="pb-2 bg-muted/30 border-b">
                      <CardTitle className="text-base flex items-center gap-2 font-black tracking-tight">
                        <Target className="h-4 w-4 text-orange-500" />
                        Investment Matrix
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase">Optimized for age {numAge}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                      <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={invData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                            >
                              {invData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              formatter={(v: number) => `₹${v.toLocaleString()}`} 
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-lg font-black tracking-tighter">₹{amounts.investment.toLocaleString()}</p>
                          <span className="text-[8px] uppercase font-bold text-muted-foreground">Portfolio</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Equity', amt: invAllocation.equityAmt, p: invAllocation.equityP },
                          { label: 'Debt', amt: invAllocation.debtAmt, p: invAllocation.debtP },
                          { label: 'Gold', amt: invAllocation.goldAmt, p: invAllocation.goldP }
                        ].map(item => (
                          <div key={item.label} className="p-4 border rounded-2xl bg-muted/10 text-center space-y-1 ring-1 ring-transparent hover:ring-primary/20 transition-all duration-300">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
                            <p className="text-sm font-black tracking-tight">₹{item.amt.toFixed(0)}</p>
                            <div className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full">
                              {item.p}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md overflow-hidden">
                    <CardHeader className="pb-2 bg-muted/30 border-b">
                      <CardTitle className="text-base flex items-center gap-2 font-black tracking-tight">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Strategic Logic
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase">Asset & Allocation Guidelines</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-1">Core Split</h4>
                        <SectionDesc label="Expenses" text="Daily living costs like rent, food, travel, and bills." />
                        <SectionDesc label="Savings" text="Emergency fund for unexpected situations." />
                        <SectionDesc label="Investments" text="Used to grow wealth over time." />
                        <SectionDesc label="Health" text="Medical, insurance, and fitness expenses." />
                        <SectionDesc label="Personal" text="Entertainment, hobbies, and lifestyle spending." />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 border-b pb-1">Asset Strategy</h4>
                        <SectionDesc label="Equity" text="High return, high risk investments like stocks." />
                        <SectionDesc label="Debt" text="Stable, low-risk investments like fixed deposits." />
                        <SectionDesc label="Gold" text="Safe asset that protects against inflation." />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted));
          border-radius: 10px;
        }
      `}</style>
    </AppShell>
  );
}

function SectionDesc({ label, text }: { label: string, text: string }) {
  return (
    <div className="group space-y-0.5">
      <p className="text-[11px] font-black uppercase text-foreground group-hover:text-primary transition-colors tracking-tighter">{label}</p>
      <p className="text-[11px] text-muted-foreground leading-snug font-medium">{text}</p>
    </div>
  );
}
