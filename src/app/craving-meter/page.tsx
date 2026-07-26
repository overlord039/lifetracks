"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useDoc, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  setDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { 
  Flame, 
  Zap, 
  IndianRupee, 
  Scale, 
  History, 
  BrainCircuit, 
  Loader2, 
  CheckCircle2, 
  Trash2, 
  TrendingUp, 
  Utensils, 
  PieChart as PieChartIcon,
  BarChart3,
  Weight,
  Heart,
  TrendingDown,
  Info,
  Legend,
  LayoutGrid
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, startOfWeek, isSameDay } from 'date-fns';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend as RechartsLegend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { estimateCraving } from '@/ai/flows/estimate-craving-flow';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const REASONS = [
  "Weight loss",
  "Saving money",
  "Diet",
  "Fasting",
  "Health",
  "Self Control",
  "Other"
];

const CATEGORIES: Record<string, string> = {
  drinks: "Drinks",
  desserts: "Desserts",
  fast_food: "Fast Food",
  snacks: "Snacks",
  others: "Others"
};

const QUICK_SUGGESTIONS = [
  { name: 'Ice Cream', emoji: '🍦' },
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Chocolate', emoji: '🍫' },
  { name: 'Coke', emoji: '🥤' },
  { name: 'Burger', emoji: '🍔' },
  { name: 'Fries', emoji: '🍟' },
  { name: 'Biryani', emoji: '🍚' }
];

export default function CravingMeterPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('Self Control');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('others');

  const [decryptedLogs, setDecryptedLogs] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayStr = mounted ? format(new Date(), 'yyyy-MM-dd') : '';

  const logsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'cravingLogs');
  }, [db, user]);

  const statsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'cravingStats', 'summary');
  }, [db, user]);

  const { data: rawLogs } = useCollection(logsRef);
  const { data: stats } = useDoc(statsRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!rawLogs || !user || !mounted) {
        setDecryptedLogs(rawLogs || []);
        return;
      }
      setIsDecrypting(true);
      const logs = await Promise.all(rawLogs.map(async l => ({
        ...l,
        foodName: l.isEncrypted ? await decryptData(l.foodName, user.uid) : (l.foodName || ''),
        quantity: l.isEncrypted ? await decryptData(l.quantity, user.uid) : (l.quantity || ''),
        caloriesAvoided: l.isEncrypted ? await decryptNumber(l.caloriesAvoided, user.uid) : (l.caloriesAvoided || 0),
        moneySaved: l.isEncrypted ? await decryptNumber(l.moneySaved, user.uid) : (l.moneySaved || 0),
        notes: l.isEncrypted ? await decryptData(l.notes, user.uid) : (l.notes || ''),
      })));
      setDecryptedLogs(logs);
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawLogs, user, mounted]);

  const handleAIAnalyze = async (customDesc?: string) => {
    const targetDesc = customDesc || description;
    if (!targetDesc.trim()) return;
    
    setIsAIThinking(true);
    try {
      const result = await estimateCraving({ description: targetDesc });
      setCalories(result.calories.toString());
      setPrice(result.estimatedPrice.toString());
      setCategory(result.category);
      toast({ title: "AI Estimated", description: result.reasoning });
    } catch (e) {
      toast({ variant: "destructive", title: "Estimation failed" });
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleSuggestionClick = (name: string) => {
    setDescription(name);
    handleAIAnalyze(name);
  };

  const getResistCount = (name: string) => {
    if (!decryptedLogs) return 0;
    const normName = name.trim().toUpperCase();
    return decryptedLogs.filter(l => (l.foodName || '').trim().toUpperCase() === normName).length;
  };

  const handleLogCraving = async () => {
    if (!description.trim() || !calories || !price || !user || !logsRef) {
      toast({ variant: "destructive", title: "Missing Fields" });
      return;
    }
    setLoading(true);

    const newLog = {
      userId: user.uid,
      date: todayStr,
      foodName: await encryptData(description.trim().toUpperCase(), user.uid),
      quantity: await encryptData("1", user.uid),
      caloriesAvoided: await encryptData(calories, user.uid),
      moneySaved: await encryptData(price, user.uid),
      reason,
      notes: await encryptData(notes, user.uid),
      category,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };

    await addDocumentNonBlocking(logsRef, newLog);

    // Update Streak
    const lastLogDateStr = stats?.lastLogDate || '';
    let currentStreak = stats?.currentStreak || 0;
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (lastLogDateStr === yesterdayStr) {
      currentStreak += 1;
    } else if (lastLogDateStr === todayStr) {
      // already logged today, streak stays same
    } else {
      currentStreak = 1;
    }

    const longestStreak = Math.max(currentStreak, stats?.longestStreak || 0);

    setDocumentNonBlocking(statsRef!, {
      userId: user.uid,
      currentStreak,
      longestStreak,
      lastLogDate: todayStr,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setDescription('');
    setCalories('');
    setPrice('');
    setNotes('');
    setLoading(false);
    toast({ title: "Resist Recorded", description: "Your willpower has been logged." });
  };

  const dashboardStats = useMemo(() => {
    if (!decryptedLogs) return { todayCals: 0, todayMoney: 0, todayCount: 0 };
    const today = decryptedLogs.filter(l => l.date === todayStr);
    return {
      todayCals: today.reduce((s, l) => s + l.caloriesAvoided, 0),
      todayMoney: today.reduce((s, l) => s + l.moneySaved, 0),
      todayCount: today.length
    };
  }, [decryptedLogs, todayStr]);

  const aggregateInsights = useMemo(() => {
    if (!decryptedLogs) return null;
    const totalCals = decryptedLogs.reduce((s, l) => s + l.caloriesAvoided, 0);
    const totalMoney = decryptedLogs.reduce((s, l) => s + l.moneySaved, 0);
    const estWeight = (totalCals / 7700).toFixed(2);
    
    const categoryCounts: Record<string, number> = {};
    decryptedLogs.forEach(l => {
      const cat = CATEGORIES[l.category] || "Others";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const pieData = Object.entries(categoryCounts).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    // Weekly/Daily chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
    const dailyData = last7Days.map(d => ({
      name: format(new Date(d), 'EEE'),
      calories: decryptedLogs.filter(l => l.date === d).reduce((s, l) => s + l.caloriesAvoided, 0)
    }));

    return { totalCals, totalMoney, estWeight, pieData, dailyData };
  }, [decryptedLogs]);

  return (
    <AppShell>
      {!mounted || isDecrypting ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Willpower...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-600 shadow-sm border border-orange-500/10">
                <Flame className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Craving Meter</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Track the impact of your resisted temptations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 text-white px-5 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                <Zap className="h-4 w-4 fill-current" />
                <span className="font-black text-sm uppercase tracking-widest">{stats?.currentStreak || 0} Day Streak</span>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-6">
              <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-primary" />
                    "I Resisted This!"
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 px-4 md:px-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                      <LayoutGrid className="h-3 w-3" /> Quick Resists
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_SUGGESTIONS.map(s => {
                        const count = getResistCount(s.name);
                        return (
                          <button
                            key={s.name}
                            onClick={() => handleSuggestionClick(s.name)}
                            disabled={isAIThinking}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 relative",
                              "hover:border-primary/50 hover:bg-primary/5 active:scale-95 group",
                              isAIThinking ? "opacity-50 grayscale" : "bg-card shadow-sm"
                            )}
                          >
                            <span>{s.emoji}</span>
                            <span>{s.name}</span>
                            {count > 0 && (
                              <Badge className="h-4 min-w-4 p-0 px-1 bg-orange-500 text-white text-[7px] flex items-center justify-center rounded-full group-hover:scale-110 transition-transform">
                                {count}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">What was the craving?</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. 1 Pizza slice, Large Coke..." 
                          value={description} 
                          onChange={e => setDescription(e.target.value)} 
                          className="h-11 rounded-xl font-bold"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleAIAnalyze()} 
                          disabled={isAIThinking || !description}
                          className="h-11 w-11 shrink-0 rounded-xl"
                        >
                          {isAIThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Calories (kcal)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={calories} 
                          onChange={e => setCalories(e.target.value)} 
                          className="h-11 rounded-xl font-black text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Saved (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={price} 
                          onChange={e => setPrice(e.target.value)} 
                          className="h-11 rounded-xl font-black text-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Resisted For</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="h-11 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REASONS.map(r => <SelectItem key={r} value={r} className="font-bold">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Private Notes</Label>
                      <Input 
                        placeholder="Optional details..." 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <Button 
                      onClick={handleLogCraving} 
                      disabled={loading || !calories || !price}
                      className="w-full h-12 rounded-2xl font-black shadow-lg bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      Log Resisted Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Weight Impact Insight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tighter">≈{aggregateInsights?.estWeight}</span>
                    <span className="text-xl font-black text-muted-foreground mb-1 uppercase">kg</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tight">
                    Estimated body fat avoided based on your cumulative logs (Calculated at 7700 kcal / kg).
                  </p>
                  <Separator className="border-dashed" />
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                    <span>Total Avoided</span>
                    <span>{aggregateInsights?.totalCals.toLocaleString()} kcal</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard title="Saved Today" value={`₹${dashboardStats.todayMoney}`} icon={<IndianRupee className="h-4 w-4" />} />
                <SummaryCard title="Avoided Today" value={`${dashboardStats.todayCals} kcal`} icon={<Scale className="h-4 w-4" />} />
                <SummaryCard title="Monthly Saved" value={`₹${aggregateInsights?.totalMoney.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
                <SummaryCard title="Total Resists" value={`${decryptedLogs.length}`} icon={<History className="h-4 w-4" />} />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-3">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Weekly Resistance Pulse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[250px] pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={aggregateInsights?.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-3">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Craving Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[250px] pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aggregateInsights?.pieData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {aggregateInsights?.pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Willpower Ledger
                  </CardTitle>
                  <Badge variant="outline" className="text-[8px] font-black uppercase px-2">{decryptedLogs.length} Records</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {decryptedLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                        <Zap className="h-10 w-10 mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest">No resisting actions logged</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-dashed">
                        {decryptedLogs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(log => (
                          <div key={log.id} className="p-4 flex items-center justify-between group hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm",
                                log.category === 'fast_food' ? "bg-red-500" : 
                                log.category === 'desserts' ? "bg-pink-500" :
                                log.category === 'drinks' ? "bg-blue-500" :
                                log.category === 'snacks' ? "bg-orange-500" : "bg-primary"
                              )}>
                                <Utensils className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-black text-sm tracking-tight">{log.foodName}</h4>
                                <div className="flex items-center gap-2 text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                  <span>{format(new Date(log.date), 'dd MMM yyyy')}</span>
                                  <Separator orientation="vertical" className="h-2" />
                                  <span className="text-primary">{log.reason}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm font-black text-primary">₹{log.moneySaved}</p>
                                <p className="text-[8px] font-black text-muted-foreground uppercase">{log.caloriesAvoided} kcal</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteDocumentNonBlocking(doc(logsRef!, log.id))}
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm ring-1 ring-border p-4 space-y-1">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[8px] font-black uppercase tracking-widest">{title}</span>
        <div className="p-1 bg-muted rounded-lg">{icon}</div>
      </div>
      <p className="text-xl font-black tracking-tighter">{value}</p>
    </Card>
  );
}
