
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
  ShieldCheck, 
  HeartPulse, 
  Smile, 
  PiggyBank, 
  PieChart as PieChartIcon, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ArrowRightLeft,
  ChevronRight
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
  };

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
      createdAt: new Date().toISOString()
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

    toast({ title: 'Plan Saved', description: 'Your salary profile has been updated.' });
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl text-primary shadow-sm">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Salary Planner</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Strategize your monthly income allocation.</p>
            </div>
          </div>
          {showResults && (
            <Button onClick={handleSave} className="shadow-md bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Save Strategy
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 shadow-lg border-t-4 border-t-primary h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Income Input
              </CardTitle>
              <CardDescription>Enter your basics to start planning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Monthly Salary (₹)</Label>
                <Input 
                  id="salary" 
                  type="number" 
                  placeholder="e.g. 50000" 
                  value={salary} 
                  onChange={(e) => setSalary(e.target.value)}
                  className="font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input 
                  id="age" 
                  type="number" 
                  placeholder="e.g. 25" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)}
                />
                {numAge > 0 && (numAge < 18 || numAge > 70) && (
                  <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Note: Investment advice is optimized for age 18-70.
                  </p>
                )}
              </div>
              <Button onClick={handleGenerate} className="w-full mt-2">Generate Plan</Button>
            </CardContent>
          </Card>

          {showResults && (
            <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    Salary Breakup (Total: {totalPercent}%)
                  </CardTitle>
                  <CardDescription>Adjust sliders to customize your monthly split.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-6">
                    {[
                      { id: 'expense', label: 'Expenses', icon: Wallet, color: 'text-blue-500' },
                      { id: 'savings', label: 'Savings', icon: PiggyBank, color: 'text-green-500' },
                      { id: 'investment', label: 'Investments', icon: TrendingUp, color: 'text-orange-500' },
                      { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-purple-500' },
                      { id: 'personal', label: 'Personal', icon: Smile, color: 'text-pink-500' }
                    ].map((item) => (
                      <div key={item.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2">
                            <item.icon className={cn("h-4 w-4", item.color)} />
                            {item.label} ({percents[item.id as keyof typeof percents]}%)
                          </Label>
                          <span className="text-sm font-black">₹{amounts[item.id as keyof typeof amounts].toLocaleString()}</span>
                        </div>
                        <Slider 
                          value={[percents[item.id as keyof typeof percents]]}
                          max={100}
                          step={1}
                          onValueChange={([val]) => setPercents({...percents, [item.id]: val})}
                        />
                      </div>
                    ))}
                    
                    {totalPercent !== 100 && (
                      <Alert variant="destructive" className="py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">Percentages must sum to 100%. Current: {totalPercent}%</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="h-[250px] flex items-center justify-center bg-muted/10 rounded-xl relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salaryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {salaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Monthly</span>
                        <p className="text-lg font-black tracking-tight">₹{numSalary.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg border-l-4 border-l-orange-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      Investment Split
                    </CardTitle>
                    <CardDescription>Based on age {numAge} (Risk Optimized)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={invData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {invData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 border rounded-lg bg-muted/20">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Equity</p>
                        <p className="text-sm font-black">₹{invAllocation.equityAmt.toFixed(0)}</p>
                        <p className="text-[10px] text-primary">{invAllocation.equityP}%</p>
                      </div>
                      <div className="p-2 border rounded-lg bg-muted/20">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Debt</p>
                        <p className="text-sm font-black">₹{invAllocation.debtAmt.toFixed(0)}</p>
                        <p className="text-[10px] text-primary">{invAllocation.debtP}%</p>
                      </div>
                      <div className="p-2 border rounded-lg bg-muted/20">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Gold</p>
                        <p className="text-sm font-black">₹{invAllocation.goldAmt.toFixed(0)}</p>
                        <p className="text-[10px] text-primary">{invAllocation.goldP}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-l-4 border-l-blue-400 bg-blue-50/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-blue-500" />
                      Budget Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm leading-relaxed">
                      Your planned expenses for this month are <span className="font-bold text-blue-600">₹{amounts.expense.toLocaleString()}</span>. 
                      Setting this as your monthly budget helps you stay accountable.
                    </p>
                    <div className="p-4 bg-white/50 border border-blue-100 rounded-xl space-y-3">
                      <p className="text-xs font-bold text-blue-800">Do you want to use this as your monthly budget?</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={syncWithBudget} className="flex-1 bg-blue-600 hover:bg-blue-700">Yes, Set Budget</Button>
                        <Button size="sm" variant="outline" className="flex-1">Not Now</Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {amounts.savings < (numSalary * 0.1) && (
                      <div className="flex items-start gap-2 text-[10px] font-bold text-orange-600 bg-orange-50 p-2 rounded w-full">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Your savings are below the recommended 10-20% level. Consider reducing expenses.
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Allocation Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SectionDesc label="Expenses" text="Daily living costs like rent, food, travel, and bills." />
                    <SectionDesc label="Savings" text="Emergency fund for unexpected situations." />
                    <SectionDesc label="Investments" text="Used to grow wealth over time." />
                    <SectionDesc label="Health" text="Medical, insurance, and fitness expenses." />
                    <SectionDesc label="Personal" text="Entertainment, hobbies, and lifestyle spending." />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-500" /> Asset Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SectionDesc label="Equity" text="High return, high risk investments like stocks." />
                    <SectionDesc label="Debt" text="Stable, low-risk investments like fixed deposits." />
                    <SectionDesc label="Gold" text="Safe asset that protects against inflation." />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SectionDesc({ label, text }: { label: string, text: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-black uppercase text-muted-foreground tracking-tighter">{label}</p>
      <p className="text-[11px] text-foreground/80 leading-snug">{text}</p>
    </div>
  );
}
