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
  LayoutGrid,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Star,
  Activity
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
  Legend as RechartsLegend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { estimateCraving } from '@/ai/flows/estimate-craving-flow';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const REASONS = [
  "Weight loss goal",
  "Budget discipline",
  "Clean eating",
  "Intermittent Fasting",
  "Better health",
  "Building self-control",
  "Others"
];

const CATEGORIES: Record<string, string> = {
  drinks: "Liquid Calories",
  desserts: "Sweet Treats",
  fast_food: "Quick Bites",
  snacks: "Casual Nibbles",
  others: "Misc Cravings"
};

const QUICK_SUGGESTIONS = [
  { name: 'Vanilla Ice Cream', emoji: '🍦', calories: 210, price: 35, category: 'desserts' },
  { name: 'Chocolate Shake', emoji: '🥤', calories: 380, price: 60, category: 'drinks' },
  { name: 'Pizza Slice', emoji: '🍕', calories: 285, price: 99, category: 'fast_food' },
  { name: 'Coca-Cola', emoji: '🥤', calories: 140, price: 40, category: 'drinks' },
  { name: 'Thums Up', emoji: '🥤', calories: 120, price: 40, category: 'drinks' },
  { name: 'French Fries', emoji: '🍟', calories: 312, price: 80, category: 'fast_food' },
  { name: 'Potato Chips', emoji: '🍟', calories: 290, price: 20, category: 'snacks' },
  { name: 'Samosa (1 pc)', emoji: '🥟', calories: 260, price: 15, category: 'snacks' },
  { name: 'Vada Pav', emoji: '🍔', calories: 300, price: 20, category: 'fast_food' },
  { name: 'Chocolate Bar', emoji: '🍫', calories: 230, price: 40, category: 'desserts' },
  { name: 'Cream Bun', emoji: '🍞', calories: 280, price: 15, category: 'others' },
  { name: 'Chicken Burger', emoji: '🍗', calories: 450, price: 180, category: 'fast_food' },
  { name: 'Gulab Jamun (2 pcs)', emoji: '🍬', calories: 300, price: 60, category: 'desserts' },
  { name: 'Jalebi', emoji: '🥨', calories: 520, price: 80, category: 'desserts' },
  { name: 'Donut', emoji: '🍩', calories: 250, price: 75, category: 'desserts' },
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
  const [reason, setReason] = useState('Building self-control');
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
      try {
        const logs = await Promise.all(rawLogs.map(async l => ({
          ...l,
          foodName: l.isEncrypted ? await decryptData(l.foodName, user.uid) : (l.foodName || ''),
          quantity: l.isEncrypted ? await decryptData(l.quantity, user.uid) : (l.quantity || ''),
          caloriesAvoided: l.isEncrypted ? await decryptNumber(l.caloriesAvoided, user.uid) : (l.caloriesAvoided || 0),
          moneySaved: l.isEncrypted ? await decryptNumber(l.moneySaved, user.uid) : (l.moneySaved || 0),
          notes: l.isEncrypted ? await decryptData(l.notes, user.uid) : (l.notes || ''),
        })));
        setDecryptedLogs(logs);
      } finally {
        setIsDecrypting(false);
      }
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
      toast({ title: "AI Victory Insight", description: result.reasoning });
    } catch (e) {
      toast({ variant: "destructive", title: "Victory estimation failed" });
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleSuggestionClick = (item: any) => {
    setDescription(item.name);
    setCalories(item.calories.toString());
    setPrice(item.price.toString());
    setCategory(item.category);
    toast({ title: "Victory Template Applied", description: `Baseline for ${item.name} loaded.` });
  };

  const getResistCount = (name: string) => {
    if (!decryptedLogs) return 0;
    const normName = name.trim().toUpperCase();
    return decryptedLogs.filter(l => (l.foodName || '').trim().toUpperCase() === normName).length;
  };

  const handleLogCraving = async () => {
    if (!description.trim() || !calories || !price || !user || !logsRef) {
      toast({ variant: "destructive", title: "Details required for Victory" });
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

    addDocumentNonBlocking(logsRef, newLog);

    const lastLogDateStr = stats?.lastLogDate || '';
    let currentStreak = stats?.currentStreak || 0;
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (lastLogDateStr === yesterdayStr) {
      currentStreak += 1;
    } else if (lastLogDateStr === todayStr) {
      // already logged today
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
    toast({ title: "Victory Vaulted!", description: "Another win for your willpower." });
  };

  const aggregateInsights = useMemo(() => {
    if (!decryptedLogs) return null;
    const totalCals = decryptedLogs.reduce((s, l) => s + l.caloriesAvoided, 0);
    const totalMoney = decryptedLogs.reduce((s, l) => s + l.moneySaved, 0);
    const estWeight = (totalCals / 7700).toFixed(2);
    
    const categoryCounts: Record<string, number> = {};
    decryptedLogs.forEach(l => {
      const cat = CATEGORIES[l.category] || "Misc Cravings";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const pieData = Object.entries(categoryCounts).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
    const dailyData = last7Days.map(d => ({
      name: format(new Date(d), 'EEE'),
      calories: decryptedLogs.filter(l => l.date === d).reduce((s, l) => s + l.caloriesAvoided, 0)
    }));

    const today = decryptedLogs.filter(l => l.date === todayStr);
    const todayCals = today.reduce((s, l) => s + l.caloriesAvoided, 0);
    const todayMoney = today.reduce((s, l) => s + l.moneySaved, 0);

    return { totalCals, totalMoney, estWeight, pieData, dailyData, todayCals, todayMoney, totalResists: decryptedLogs.length };
  }, [decryptedLogs, todayStr]);

  return (
    <AppShell>
      {!mounted || isDecrypting ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Willpower Vault...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-600 shadow-sm border border-orange-500/10">
                <Flame className="w-8 h-8 md:w-9 md:h-9" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Willpower Vault</h2>
                <p className="text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-widest">Turn temptations into tangible victories</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex flex-col items-end">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Longest Streak</p>
                  <p className="text-sm font-black">{stats?.longestStreak || 0} Days</p>
               </div>
               <div className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-3 ring-4 ring-orange-500/20">
                <Zap className="h-5 w-5 fill-current animate-pulse" />
                <span className="font-black text-sm uppercase tracking-widest">{stats?.currentStreak || 0} Day Streak</span>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4 md:space-y-6">
              <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b py-4 md:py-5">
                  <CardTitle className="text-base md:text-lg font-black flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary" />
                    Record Your Victory
                  </CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight">E2EE Protected Insight</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 px-4 md:px-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                         <LayoutGrid className="h-3.5 w-3.5" /> Victory Templates
                       </Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-4 rounded-2xl shadow-xl border-none ring-1 ring-border">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Quickly log common cravings using templates. This sets baseline estimates for calories and cost based on typical restaurant averages.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <ScrollArea className="h-[180px] border rounded-2xl p-3 bg-muted/5">
                      <div className="flex flex-wrap gap-2">
                        {QUICK_SUGGESTIONS.map(s => {
                          const count = getResistCount(s.name);
                          return (
                            <button
                              key={s.name}
                              onClick={() => handleSuggestionClick(s)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl border text-[9px] md:text-[10px] font-black uppercase transition-all flex items-center gap-2 relative",
                                "hover:border-primary/50 hover:bg-primary/5 active:scale-95 group bg-background shadow-sm border-primary/10"
                              )}
                            >
                              <span className="text-sm">{s.emoji}</span>
                              <span className="truncate max-w-[110px]">{s.name}</span>
                              {count > 0 && (
                                <Badge className="h-4 min-w-4 p-0 px-1 bg-orange-500 text-white text-[7px] flex items-center justify-center rounded-full ring-2 ring-background">
                                  {count}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">What did you resist?</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. 2 Slices of Pepperoni Pizza..." 
                          value={description} 
                          onChange={e => setDescription(e.target.value)} 
                          className="h-12 rounded-xl font-black text-sm border-primary/10"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleAIAnalyze()} 
                          disabled={isAIThinking || !description}
                          className="h-12 w-12 shrink-0 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10"
                        >
                          {isAIThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5 text-primary" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Avoided (kcal)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={calories} 
                            onChange={e => setCalories(e.target.value)} 
                            className="h-11 rounded-xl font-black text-lg pl-10"
                          />
                          <Flame className="absolute left-3 top-3 h-5 w-5 text-orange-400" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Saved (₹)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={price} 
                            onChange={e => setPrice(e.target.value)} 
                            className="h-11 rounded-xl font-black text-lg pl-10"
                          />
                          <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Victory Type</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-11 rounded-xl font-black text-[10px] uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORIES).map(([id, label]) => (
                              <SelectItem key={id} value={id} className="font-black text-[10px] uppercase">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Why did you win?</Label>
                        <Select value={reason} onValueChange={setReason}>
                          <SelectTrigger className="h-11 rounded-xl font-black text-[10px] uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REASONS.map(r => <SelectItem key={r} value={r} className="font-black text-[10px] uppercase">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Victory Notes (Private)</Label>
                      <Input 
                        placeholder="Any extra context about this win..." 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="h-11 rounded-xl text-xs bg-muted/10 border-dashed"
                      />
                    </div>

                    <Button 
                      onClick={handleLogCraving} 
                      disabled={loading || !calories || !price}
                      className="w-full h-14 rounded-2xl font-black shadow-xl bg-orange-600 hover:bg-orange-700 text-white gap-3 text-base active:scale-[0.98] transition-all"
                    >
                      {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                      LOG MY VICTORY
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="bg-primary/5 py-3 flex items-center justify-center gap-2 border-t">
                   <ShieldCheck className="h-3 w-3 text-primary" />
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Private AES-GCM Encryption Active</span>
                </CardFooter>
              </Card>

              <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Heart className="h-32 w-32 text-red-500 -rotate-12" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Impact Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 relative z-10">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estimated Body Fat Avoided</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter text-primary">{aggregateInsights?.estWeight}</span>
                      <span className="text-xl font-black text-muted-foreground uppercase">kg</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tight opacity-70">
                    Calculated at the standard 7,700 kcal per kilogram of body fat. Every resist counts towards your health baseline.
                  </p>
                  <Separator className="border-dashed" />
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary bg-background/50 p-3 rounded-xl border border-dashed">
                    <div className="flex items-center gap-2">
                       <Flame className="h-3.5 w-3.5" /> Total Energy Avoided
                    </div>
                    <span className="text-sm">{aggregateInsights?.totalCals.toLocaleString()} kcal</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-1">
                <MiniInsightCard title="Saved Today" value={`₹${aggregateInsights?.todayMoney || 0}`} icon={<IndianRupee className="h-4 w-4" />} color="text-green-600" />
                <MiniInsightCard title="Avoided Today" value={`${aggregateInsights?.todayCals || 0} kcal`} icon={<Flame className="h-4 w-4" />} color="text-orange-500" />
                <MiniInsightCard title="Monthly Gain" value={`₹${(aggregateInsights?.totalMoney || 0).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} color="text-primary" />
                <MiniInsightCard title="Total Victories" value={`${aggregateInsights?.totalResists || 0}`} icon={<Trophy className="h-4 w-4" />} color="text-purple-500" />
              </div>

              <div className="grid gap-4 md:gap-6 md:grid-cols-2 px-1">
                <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Victory Pulse (7D)
                    </CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl border-none ring-1 ring-border">
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          Your calorie avoidance trends over the last 7 days. High bars represent significant willpower wins.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </CardHeader>
                  <CardContent className="h-[240px] pt-6 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={aggregateInsights?.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} />
                        <YAxis fontSize={9} fontWeight="900" tickLine={false} axisLine={false} hide />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--primary)/0.05)' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                          formatter={(v: any) => [`${v} kcal`, 'Avoided']}
                        />
                        <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Cravings Matrix
                    </CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl border-none ring-1 ring-border">
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          Categorical breakdown of what you've resisted most. Understand your primary temptation zones.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </CardHeader>
                  <CardContent className="h-[240px] pt-6 flex items-center justify-center">
                    {aggregateInsights && aggregateInsights.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={aggregateInsights?.pieData}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {aggregateInsights?.pieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                          <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} layout="vertical" align="right" verticalAlign="middle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center opacity-30 grayscale gap-2">
                         <Activity className="h-8 w-8" />
                         <p className="text-[9px] font-black uppercase tracking-widest">No matrix data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6 md:px-8">
                  <CardTitle className="text-base font-black flex items-center gap-3">
                    <History className="h-5 w-5 text-primary" />
                    Victory Ledger
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-3 py-1 bg-background h-7">{decryptedLogs.length} Records</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[420px]">
                    {decryptedLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 opacity-30 grayscale space-y-3">
                        <Star className="h-12 w-12 text-primary/40" />
                        <p className="text-xs font-black uppercase tracking-widest text-center">Your Victory Ledger is waiting for its first record</p>
                        <p className="text-[10px] font-medium text-center px-12">Log a resisted craving to start tracking your willpower impact.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-dashed border-t border-dashed">
                        {decryptedLogs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(log => (
                          <div key={log.id} className="p-5 md:px-8 flex items-center justify-between group hover:bg-primary/[0.02] transition-colors relative">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={cn(
                                "h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-105",
                                log.category === 'fast_food' ? "bg-red-500" : 
                                log.category === 'desserts' ? "bg-pink-500" :
                                log.category === 'drinks' ? "bg-blue-500" :
                                log.category === 'snacks' ? "bg-orange-500" : "bg-primary"
                              )}>
                                <Utensils className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-sm md:text-base tracking-tight truncate uppercase">{log.foodName}</h4>
                                <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-70">
                                  <span className="flex items-center gap-1.5"><History className="h-3 w-3" /> {format(new Date(log.date), 'dd MMM yyyy')}</span>
                                  <Separator orientation="vertical" className="h-2.5" />
                                  <span className="text-primary truncate max-w-[120px]">{log.reason}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="text-right flex flex-col items-end">
                                <div className="flex items-center gap-1.5 font-black text-sm text-primary tracking-tighter">
                                   <IndianRupee className="h-3 w-3" /> {log.moneySaved}
                                </div>
                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                   <Flame className="h-2.5 w-2.5" /> {log.caloriesAvoided} kcal
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteItem(log.id)}
                                className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-xl"
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

  function deleteItem(id: string) {
    if (!logsRef) return;
    deleteDocumentNonBlocking(doc(logsRef, id));
    toast({ title: "Record Erased" });
  }
}

function MiniInsightCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <Card className="rounded-[1.5rem] border-none shadow-sm ring-1 ring-border p-3.5 md:p-5 space-y-2 bg-card/50 hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity scale-150">
         {icon}
      </div>
      <div className="flex items-center justify-between text-muted-foreground relative z-10">
        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] opacity-60">{title}</span>
        <div className={cn("p-1.5 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors", color)}>
           {React.cloneElement(icon as React.ReactElement, { className: "h-3.5 w-3.5" })}
        </div>
      </div>
      <p className="text-lg md:text-xl font-black tracking-tighter relative z-10">{value}</p>
    </Card>
  );
}

