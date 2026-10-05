
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Activity,
  Search,
  Timer,
  Coffee,
  Pizza,
  Apple,
  Cookie,
  Target
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
import { Progress } from '@/components/ui/progress';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { estimateCraving } from '@/ai/flows/estimate-craving-flow';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

const DAILY_CALORIE_GOAL = 2100;

const CATEGORIES: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Beverages"
};

const CATEGORY_ICONS: Record<string, any> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Pizza,
  snacks: Cookie,
  drinks: Apple
};

const QUICK_SUGGESTIONS = [
  { name: 'Oatmeal & Fruits', emoji: '🥣', calories: 350, price: 120, category: 'breakfast' },
  { name: 'Chicken Salad', emoji: '🥗', calories: 450, price: 250, category: 'lunch' },
  { name: 'Grilled Salmon', emoji: '🐟', calories: 550, price: 450, category: 'dinner' },
  { name: 'Greek Yogurt', emoji: '🥛', calories: 150, price: 80, category: 'snacks' },
  { name: 'Black Coffee', emoji: '☕', calories: 5, price: 100, category: 'drinks' },
  { name: 'Protein Shake', emoji: '🥤', calories: 220, price: 150, category: 'snacks' },
  { name: 'Vegetable Wrap', emoji: '🌯', calories: 380, price: 180, category: 'lunch' },
  { name: 'Steamed Rice & Dal', emoji: '🍛', calories: 520, price: 150, category: 'dinner' },
  { name: 'Apple & PB', emoji: '🍎', calories: 280, price: 60, category: 'snacks' },
  { name: 'Green Tea', emoji: '🍵', calories: 0, price: 40, category: 'drinks' },
];

export default function CalorieTrackerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const recommendationRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>('snacks');
  const [notes, setNotes] = useState('');

  const [decryptedLogs, setDecryptedLogs] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (recommendationRef.current && !recommendationRef.current.contains(event.target as Node)) {
        setShowRecommendations(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          calories: l.isEncrypted ? await decryptNumber(l.caloriesAvoided, user.uid) : (l.caloriesAvoided || 0),
          cost: l.isEncrypted ? await decryptNumber(l.moneySaved, user.uid) : (l.moneySaved || 0),
          notes: l.isEncrypted ? await decryptData(l.notes, user.uid) : (l.notes || ''),
        })));
        setDecryptedLogs(logs);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptAll();
  }, [rawLogs, user, mounted]);

  const predictiveSuggestions = useMemo(() => {
    if (!description.trim() || description.length < 2) return [];
    const query = description.toLowerCase();
    
    const historyMap = new Map();
    decryptedLogs.forEach(log => {
      if (log.foodName.toLowerCase().includes(query)) {
        historyMap.set(log.foodName.toUpperCase(), {
          name: log.foodName,
          emoji: '🍽️',
          calories: log.calories,
          price: log.cost,
          category: log.category,
          isHistory: true
        });
      }
    });

    const templateMatches = QUICK_SUGGESTIONS.filter(s => 
      s.name.toLowerCase().includes(query) && !historyMap.has(s.name.toUpperCase())
    );

    return [...Array.from(historyMap.values()), ...templateMatches].slice(0, 5);
  }, [description, decryptedLogs]);

  const handleAIAnalyze = async () => {
    if (!description.trim()) return;
    setIsAIThinking(true);
    setShowRecommendations(false);
    try {
      const result = await estimateCraving({ description });
      setCalories(result.calories.toString());
      setPrice(result.estimatedPrice.toString());
      setCategory(result.category === 'others' ? 'snacks' : (result.category === 'drinks' ? 'drinks' : 'lunch'));
      toast({ title: "Nutritional Insight", description: result.reasoning });
    } catch (e) {
      toast({ variant: "destructive", title: "Estimation failed" });
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleSuggestionClick = (item: any) => {
    setDescription(item.name);
    setCalories(item.calories.toString());
    setPrice(item.price.toString());
    setCategory(item.category);
    setShowRecommendations(false);
  };

  const handleLogMeal = async () => {
    if (!description.trim() || !calories || !user || !logsRef) {
      toast({ variant: "destructive", title: "Details required" });
      return;
    }
    setLoading(true);

    const newLog = {
      userId: user.uid,
      date: todayStr,
      foodName: await encryptData(description.trim().toUpperCase(), user.uid),
      caloriesAvoided: await encryptData(calories, user.uid), // mapped to legacy schema
      moneySaved: await encryptData(price || '0', user.uid),   // mapped to legacy schema
      category,
      notes: await encryptData(notes, user.uid),
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(logsRef, newLog);

    // Update streak stats
    const lastLogDateStr = stats?.lastLogDate || '';
    let currentStreak = stats?.currentStreak || 0;
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (lastLogDateStr === yesterdayStr) {
      currentStreak += 1;
    } else if (lastLogDateStr !== todayStr) {
      currentStreak = 1;
    }

    setDocumentNonBlocking(statsRef!, {
      userId: user.uid,
      currentStreak,
      longestStreak: Math.max(currentStreak, stats?.longestStreak || 0),
      lastLogDate: todayStr,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setDescription('');
    setCalories('');
    setPrice('');
    setNotes('');
    setLoading(false);
    toast({ title: "Meal Tracked", description: "Fuel intake synchronized to vault." });
  };

  const insights = useMemo(() => {
    if (!decryptedLogs) return null;
    const todayLogs = decryptedLogs.filter(l => l.date === todayStr);
    const todayCals = todayLogs.reduce((s, l) => s + l.calories, 0);
    const todayCost = todayLogs.reduce((s, l) => s + l.cost, 0);
    const totalCost = decryptedLogs.reduce((s, l) => s + l.cost, 0);
    
    const categoryCounts: Record<string, number> = {};
    decryptedLogs.forEach(l => {
      const label = CATEGORIES[l.category] || "Others";
      categoryCounts[label] = (categoryCounts[label] || 0) + l.calories;
    });

    const pieData = Object.entries(categoryCounts).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
    const dailyData = last7Days.map(d => ({
      name: format(new Date(d), 'EEE'),
      calories: decryptedLogs.filter(l => l.date === d).reduce((s, l) => s + l.calories, 0)
    }));

    return { todayCals, todayCost, totalCost, pieData, dailyData, totalEntries: decryptedLogs.length };
  }, [decryptedLogs, todayStr]);

  const intakePercent = Math.min(100, Math.round(((insights?.todayCals || 0) / DAILY_CALORIE_GOAL) * 100));

  return (
    <AppShell>
      {!mounted || isDecrypting ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Nutrition Vault...</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
                <Utensils className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Calorie Vault</h2>
                <p className="text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-widest">Precision Fuel & Intake Tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Logging Streak</p>
                <p className="text-sm font-black">{stats?.currentStreak || 0} Days</p>
              </div>
              <div className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-3 ring-4 ring-primary/20">
                <Target className="h-5 w-5 animate-pulse" />
                <span className="font-black text-sm uppercase tracking-widest">{intakePercent}% Goal Reach</span>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4 md:space-y-6">
              <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b py-4 md:py-5">
                  <CardTitle className="text-base md:text-lg font-black flex items-center gap-3">
                    <Plus className="h-5 w-5 text-primary" />
                    Track New Meal
                  </CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight">E2EE Protected Entry</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 px-4 md:px-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" /> Frequent Fuel
                    </Label>
                    <ScrollArea className="h-[140px] border rounded-2xl p-3 bg-muted/5">
                      <div className="flex flex-wrap gap-2">
                        {QUICK_SUGGESTIONS.map(s => (
                          <button
                            key={s.name}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-3 py-1.5 rounded-xl border text-[9px] md:text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-background shadow-sm border-primary/10 hover:border-primary/50"
                          >
                            <span className="text-sm">{s.emoji}</span>
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 relative" ref={recommendationRef}>
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Meal Description</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Scrambled eggs with toast..." 
                          value={description} 
                          onChange={e => {
                            setDescription(e.target.value);
                            setShowRecommendations(e.target.value.trim().length > 1);
                          }}
                          className="h-12 rounded-xl font-black text-sm border-primary/10"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleAIAnalyze} 
                          disabled={isAIThinking || !description}
                          className="h-12 w-12 shrink-0 rounded-xl border-primary/20 bg-primary/5"
                        >
                          {isAIThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5 text-primary" />}
                        </Button>
                      </div>

                      {showRecommendations && predictiveSuggestions.length > 0 && (
                        <Card className="absolute z-[60] w-full mt-1.5 shadow-2xl border-primary/20 rounded-2xl overflow-hidden bg-background animate-in fade-in slide-in-from-top-2">
                           <div className="divide-y divide-dashed">
                              {predictiveSuggestions.map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSuggestionClick(item)}
                                  className="w-full px-4 py-3 text-left hover:bg-primary/[0.03] transition-colors flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                                      <span className="text-base">{item.emoji}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black uppercase tracking-tight">{item.name}</span>
                                      <span className="text-[8px] font-bold text-muted-foreground uppercase">{item.isHistory ? "Logged Before" : "Standard Template"}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-primary">{item.calories} kcal</p>
                                  </div>
                                </button>
                              ))}
                           </div>
                        </Card>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Calories (kcal)</Label>
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
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cost (₹)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={price} 
                            onChange={e => setPrice(e.target.value)} 
                            className="h-11 rounded-xl font-black text-lg pl-10"
                          />
                          <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Meal Timing</Label>
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

                    <Button 
                      onClick={handleLogMeal} 
                      disabled={loading || !calories}
                      className="w-full h-14 rounded-2xl font-black shadow-xl bg-primary hover:bg-primary/90 text-white gap-3 text-base"
                    >
                      {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                      LOG FUEL ENTRY
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="bg-primary/5 py-3 flex items-center justify-center gap-2 border-t">
                   <ShieldCheck className="h-3 w-3 text-primary" />
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Private AES-GCM Encryption Active</span>
                </CardFooter>
              </Card>

              <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
                    <Activity className="h-4 w-4 text-primary" />
                    Goal status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Consumed vs Daily Target</p>
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="text-right">
                        <p className="text-3xl font-black tracking-tighter text-primary">{insights?.todayCals || 0}</p>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground">Intake</p>
                      </div>
                      <Separator orientation="vertical" className="h-10 border-dashed" />
                      <div className="text-left">
                        <p className="text-3xl font-black tracking-tighter text-muted-foreground">{DAILY_CALORIE_GOAL}</p>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground">Target</p>
                      </div>
                    </div>
                    <Progress value={intakePercent} className="h-2 rounded-full" />
                  </div>
                  <div className="bg-background/50 p-3 rounded-xl border border-dashed text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {DAILY_CALORIE_GOAL - (insights?.todayCals || 0) > 0 
                        ? `₹${(DAILY_CALORIE_GOAL - (insights?.todayCals || 0)).toLocaleString()} kcal remaining` 
                        : "Daily target reached"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-1">
                <MiniInsightCard title="Intake Today" value={`${insights?.todayCals || 0} kcal`} icon={<Flame className="h-4 w-4" />} color="text-orange-500" />
                <MiniInsightCard title="Meal Cost Today" value={`₹${insights?.todayCost || 0}`} icon={<IndianRupee className="h-4 w-4" />} color="text-green-600" />
                <MiniInsightCard title="Monthly Spent" value={`₹${(insights?.totalCost || 0).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} color="text-primary" />
                <MiniInsightCard title="Total Entries" value={`${insights?.totalEntries || 0}`} icon={<Trophy className="h-4 w-4" />} color="text-purple-500" />
              </div>

              <div className="grid gap-4 md:gap-6 md:grid-cols-2 px-1">
                <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 border-b py-3">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Intake Pulse (7D)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[220px] pt-6 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={insights?.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--primary)/0.05)' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                        />
                        <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 border-b py-3">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Nutrient matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[220px] pt-6 flex items-center justify-center">
                    {insights && insights.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={insights?.pieData} innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none">
                            {insights?.pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                          <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} layout="vertical" align="right" verticalAlign="middle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center opacity-30 grayscale gap-2">
                         <Activity className="h-8 w-8" />
                         <p className="text-[9px] font-black uppercase tracking-widest">No intake data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6 md:px-8">
                  <CardTitle className="text-base font-black flex items-center gap-3">
                    <History className="h-5 w-5 text-primary" />
                    Intake Ledger
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-3 py-1 bg-background h-7">{decryptedLogs.length} Records</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-dashed">
                      {decryptedLogs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(log => {
                        const Icon = CATEGORY_ICONS[log.category] || Apple;
                        return (
                          <div key={log.id} className="p-5 md:px-8 flex items-center justify-between group hover:bg-primary/[0.02] transition-colors relative">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={cn(
                                "h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-105",
                                log.category === 'breakfast' ? "bg-orange-400" : 
                                log.category === 'lunch' ? "bg-green-500" :
                                log.category === 'dinner' ? "bg-indigo-500" :
                                log.category === 'drinks' ? "bg-blue-400" : "bg-primary"
                              )}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-sm md:text-base tracking-tight truncate uppercase">{log.foodName}</h4>
                                <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-70">
                                  <span>{format(new Date(log.date), 'dd MMM yyyy')}</span>
                                  <Separator orientation="vertical" className="h-2.5" />
                                  <span className="text-primary">{CATEGORIES[log.category]}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="text-right flex flex-col items-end">
                                <div className="font-black text-sm text-primary tracking-tighter">
                                   {log.calories} kcal
                                </div>
                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                   ₹{log.cost}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => { deleteDocumentNonBlocking(doc(logsRef!, log.id)); toast({ title: "Record Erased" }); }} className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
