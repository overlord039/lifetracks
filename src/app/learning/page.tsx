
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { CheckCircle2, GraduationCap, Plus, Flame, Trash2, Loader2, ShieldCheck, Target, Zap, TrendingUp, Info, BookOpen, Pencil, Save, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subDays, parseISO, addDays } from 'date-fns';
import { encryptData, decryptData } from '@/lib/encryption';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from '@/components/ui/separator';

export default function LearningPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isRuleEnabled, setIsRuleEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const todayStr = format(selectedDate, 'yyyy-MM-dd');
  
  const goalsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'learningGoals');
  }, [db, user]);

  const dailyLearningRef = useMemoFirebase(() => {
    if (!db || !user || !todayStr) return null;
    return doc(db, 'users', user.uid, 'dailyLearning', todayStr);
  }, [db, user, todayStr]);

  const allDiariesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'dailyDiaries');
  }, [db, user]);

  const { data: rawGoals } = useCollection(goalsRef);
  const { data: diaries } = useCollection(allDiariesRef);
  const { data: dailyLearning } = useDoc(dailyLearningRef);
  
  const [decryptedGoals, setDecryptedGoals] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [newGoal, setNewGoal] = useState({ skill: '', difficulty: 'Easy', target: '2' });

  const [dailyForm, setDailyEntry] = useState({
    learned: ['', '', ''],
    practiced: ['', ''],
    takeaway: '',
    learnedSkills: ['', '', ''],
    practicedSkills: ['', ''],
    takeawaySkill: ''
  });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('lifetrack_321_rule_enabled');
    if (saved === 'true') setIsRuleEnabled(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('lifetrack_321_rule_enabled', isRuleEnabled.toString());
    }
  }, [isRuleEnabled, mounted]);

  useEffect(() => {
    const decryptAll = async () => {
      if (!rawGoals || !user || !mounted) {
        setDecryptedGoals(rawGoals || []);
        return;
      }
      setIsDecrypting(true);
      try {
        const decrypted = await Promise.all(rawGoals.map(async (goal) => ({
          ...goal,
          skill: goal.isEncrypted ? await decryptData(goal.skill, user.uid) : (goal.skill || ''),
        })));
        setDecryptedGoals(decrypted);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptAll();
  }, [rawGoals, user, mounted]);

  useEffect(() => {
    const decryptDaily = async () => {
      if (dailyLearning && user && mounted) {
        const d = dailyLearning;
        const entry = {
          learned: await Promise.all((d.learned || ['', '', '']).map(v => decryptData(v, user.uid))),
          practiced: await Promise.all((d.practiced || ['', '']).map(v => decryptData(v, user.uid))),
          takeaway: await decryptData(d.takeaway || '', user.uid),
          learnedSkills: d.learnedSkills || ['', '', ''],
          practicedSkills: d.practicedSkills || ['', ''],
          takeawaySkill: d.takeawaySkill || ''
        };
        setDailyEntry(entry);
      } else {
        setDailyEntry({
          learned: ['', '', ''],
          practiced: ['', ''],
          takeaway: '',
          learnedSkills: ['', '', ''],
          practicedSkills: ['', ''],
          takeawaySkill: ''
        });
      }
    };
    decryptDaily();
  }, [dailyLearning, user, mounted, todayStr]);

  const streak = useMemo(() => {
    if (!diaries || diaries.length === 0) return 0;
    const dates = Array.from(new Set(diaries.map(d => d.date))).sort().reverse();
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let currentStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const current = parseISO(dates[i]);
      const expectedPrev = format(subDays(current, 1), 'yyyy-MM-dd');
      if (dates[i + 1] === expectedPrev) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [diaries]);

  const addGoal = async () => {
    if (!newGoal.skill || !newGoal.target || !goalsRef || !user) return;
    setLoading(true);
    try {
      const encryptedSkill = await encryptData(newGoal.skill.trim().toUpperCase(), user.uid);
      await addDocumentNonBlocking(goalsRef, {
        userId: user?.uid,
        skill: encryptedSkill,
        difficulty: newGoal.difficulty,
        target: parseInt(newGoal.target),
        completedCount: 0,
        isEncrypted: true,
        createdAt: new Date().toISOString()
      });
      setNewGoal({ skill: '', difficulty: 'Easy', target: '2' });
      toast({ title: "Goal secured in vault" });
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = (id: string, delta: number) => {
    if (!goalsRef) return;
    const goal = decryptedGoals?.find(g => g.id === id);
    if (!goal) return;
    const newCount = Math.max(0, (goal.completedCount || 0) + delta);
    updateDocumentNonBlocking(doc(goalsRef, id), { 
      completedCount: newCount, 
      updatedAt: new Date().toISOString() 
    });
  };

  const saveDailyLearning = async () => {
    if (!user || !dailyLearningRef) return;
    setLoading(true);
    const completedCount = [
      ...dailyForm.learned.filter(v => !!v.trim()),
      ...dailyForm.practiced.filter(v => !!v.trim()),
      ...(dailyForm.takeaway.trim() ? [dailyForm.takeaway] : [])
    ].length;

    const payload = {
      userId: user.uid,
      date: todayStr,
      learned: await Promise.all(dailyForm.learned.map(v => encryptData(v, user.uid))),
      practiced: await Promise.all(dailyForm.practiced.map(v => encryptData(v, user.uid))),
      takeaway: await encryptData(dailyForm.takeaway, user.uid),
      learnedSkills: dailyForm.learnedSkills,
      practicedSkills: dailyForm.practicedSkills,
      takeawaySkill: dailyForm.takeawaySkill,
      completedCount,
      isEncrypted: true,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(dailyLearningRef, payload, { merge: true });
    toast({ title: "Daily Learning Vaulted" });
    setLoading(false);
  };

  const deleteGoal = (id: string) => {
    if (!goalsRef) return;
    deleteDocumentNonBlocking(doc(goalsRef, id));
    toast({ title: "Goal removed" });
  };

  const dailyProgress = useMemo(() => {
    const lCount = dailyForm.learned.filter(v => !!v.trim()).length;
    const pCount = dailyForm.practiced.filter(v => !!v.trim()).length;
    const rCount = dailyForm.takeaway.trim() ? 1 : 0;
    return {
      learned: lCount,
      practiced: pCount,
      reflected: rCount,
      total: lCount + pCount + rCount,
      percent: Math.round(((lCount + pCount + rCount) / 6) * 100)
    };
  }, [dailyForm]);

  if (!mounted || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Skill Forge...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Block - Compact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
              <GraduationCap className="h-6 w-6 md:h-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Skill Forge</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[7px] md:text-[8px] uppercase px-1.5 py-0">
                  <ShieldCheck className="h-2 w-2 mr-1" /> E2EE
                </Badge>
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Tactical progress tracking</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border">
                <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">3-2-1 Rule</Label>
                <Switch checked={isRuleEnabled} onCheckedChange={setIsRuleEnabled} className="scale-[0.6] origin-right" />
             </div>
             <div className="bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 flex items-center gap-2">
                <Flame className={cn("h-4 w-4", streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground opacity-30")} />
                <div className="flex flex-col">
                   <span className="text-[7px] font-black uppercase text-orange-600/70">Streak</span>
                   <span className="text-sm font-black leading-none text-orange-600">{streak}d</span>
                </div>
             </div>
          </div>
        </div>

        {isRuleEnabled && (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
              {/* Rules Header - Combined with Progress */}
              <div className="bg-primary/10 border-b px-5 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-shrink-0">
                      <Progress value={dailyProgress.percent} className="h-10 w-10 md:h-12 md:w-12 rounded-full rotate-[-90deg] bg-muted/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] md:text-xs font-black">{dailyProgress.percent}%</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                         <Zap className="h-4 w-4 text-primary" />
                         3-2-1 Learning Dashboard
                      </CardTitle>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-primary/70">Daily Strategic Forge • {format(selectedDate, 'MMM dd')}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-xl border backdrop-blur-sm w-full sm:w-auto justify-between">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="h-7 w-7 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex items-center gap-1.5 px-1">
                       <Calendar className="h-3 w-3 text-primary" />
                       <span className="text-[9px] font-black uppercase tracking-widest">{format(selectedDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-7 w-7 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                 </div>
              </div>

              <CardContent className="p-4 md:p-6 space-y-6">
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-12 space-y-6">
                    {/* Learn 3 Section - Tight */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                          <BookOpen className="h-3.5 w-3.5" /> 3 Concepts Learned
                        </h3>
                        <span className="text-[8px] font-black opacity-40">{dailyProgress.learned}/3</span>
                      </div>
                      <div className="grid gap-2">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="flex gap-2 p-1.5 bg-primary/[0.03] rounded-xl border border-primary/5 transition-all focus-within:border-primary/20">
                            <Input 
                              placeholder={`Insight #${i+1}...`} 
                              value={dailyForm.learned[i]} 
                              onChange={e => {
                                const next = [...dailyForm.learned];
                                next[i] = e.target.value;
                                setDailyEntry({...dailyForm, learned: next});
                              }}
                              className="h-8 md:h-9 bg-transparent border-none text-[11px] font-medium placeholder:opacity-50"
                            />
                            <Select 
                              value={dailyForm.learnedSkills[i]} 
                              onValueChange={v => {
                                const next = [...dailyForm.learnedSkills];
                                next[i] = v;
                                setDailyEntry({...dailyForm, learnedSkills: next});
                              }}
                            >
                              <SelectTrigger className="w-[100px] md:w-[130px] h-8 md:h-9 border-none bg-background/50 rounded-lg text-[9px] font-black uppercase shadow-none focus:ring-0">
                                <SelectValue placeholder="SKILL" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-[9px] font-black uppercase">General</SelectItem>
                                {decryptedGoals.map(g => <SelectItem key={g.id} value={g.id} className="text-[9px] font-black uppercase">{g.skill}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Practice 2 Section - Tight */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-orange-500">
                          <Pencil className="h-3.5 w-3.5" /> 2 Skills Practiced
                        </h3>
                        <span className="text-[8px] font-black opacity-40">{dailyProgress.practiced}/2</span>
                      </div>
                      <div className="grid gap-2">
                        {[0, 1].map(i => (
                          <div key={i} className="flex gap-2 p-1.5 bg-orange-500/[0.03] rounded-xl border border-orange-500/5 transition-all focus-within:border-orange-500/20">
                            <Input 
                              placeholder={`Activity #${i+1}...`} 
                              value={dailyForm.practiced[i]} 
                              onChange={e => {
                                const next = [...dailyForm.practiced];
                                next[i] = e.target.value;
                                setDailyEntry({...dailyForm, practiced: next});
                              }}
                              className="h-8 md:h-9 bg-transparent border-none text-[11px] font-medium placeholder:opacity-50"
                            />
                            <Select 
                              value={dailyForm.practicedSkills[i]} 
                              onValueChange={v => {
                                const next = [...dailyForm.practicedSkills];
                                next[i] = v;
                                setDailyEntry({...dailyForm, practicedSkills: next});
                              }}
                            >
                              <SelectTrigger className="w-[100px] md:w-[130px] h-8 md:h-9 border-none bg-background/50 rounded-lg text-[9px] font-black uppercase shadow-none focus:ring-0">
                                <SelectValue placeholder="SKILL" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-[9px] font-black uppercase">General</SelectItem>
                                {decryptedGoals.map(g => <SelectItem key={g.id} value={g.id} className="text-[9px] font-black uppercase">{g.skill}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reflect 1 Section - Tight */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-indigo-500">
                          <Target className="h-3.5 w-3.5" /> 1 Strategic Takeaway
                        </h3>
                        <span className="text-[8px] font-black opacity-40">{dailyProgress.reflected}/1</span>
                      </div>
                      <div className="flex gap-2 p-1.5 bg-indigo-500/[0.03] rounded-xl border border-indigo-500/5 transition-all focus-within:border-indigo-500/20">
                        <Input 
                          placeholder="Key daily achievement..." 
                          value={dailyForm.takeaway} 
                          onChange={e => setDailyEntry({...dailyForm, takeaway: e.target.value})}
                          className="h-8 md:h-9 bg-transparent border-none text-[11px] font-medium placeholder:opacity-50"
                        />
                        <Select 
                          value={dailyForm.takeawaySkill} 
                          onValueChange={v => setDailyEntry({...dailyForm, takeawaySkill: v})}
                        >
                          <SelectTrigger className="w-[100px] md:w-[130px] h-8 md:h-9 border-none bg-background/50 rounded-lg text-[9px] font-black uppercase shadow-none focus:ring-0">
                            <SelectValue placeholder="SKILL" />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="none" className="text-[9px] font-black uppercase">General</SelectItem>
                             {decryptedGoals.map(g => <SelectItem key={g.id} value={g.id} className="text-[9px] font-black uppercase">{g.skill}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col md:flex-row gap-4 items-center justify-between">
                   <div className="flex items-center gap-2 text-primary/60">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-[8px] font-black uppercase tracking-widest">AES-GCM Secure Channel Active</span>
                   </div>
                   <Button onClick={saveDailyLearning} disabled={loading} className="w-full md:w-auto h-12 px-10 rounded-2xl font-black shadow-xl gap-2 uppercase tracking-widest text-[10px]">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Vault Daily Entry
                   </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
          {/* Goal Entry - More Compact */}
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-5">
                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
                  <Plus className="h-4 w-4 text-primary" />
                  Initialize Node
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4 px-5">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mastery Target</Label>
                  <Input 
                    placeholder="e.g. Python, SQL..." 
                    value={newGoal.skill} 
                    onChange={e => setNewGoal({...newGoal, skill: e.target.value})} 
                    className="h-10 rounded-xl uppercase font-black text-xs border-primary/10 bg-muted/5" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Difficulty</Label>
                    <Select value={newGoal.difficulty} onValueChange={v => setNewGoal({...newGoal, difficulty: v})}>
                      <SelectTrigger className="h-10 rounded-xl font-black uppercase text-[9px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy" className="font-black text-[9px] uppercase">EASY</SelectItem>
                        <SelectItem value="Medium" className="font-black text-[9px] uppercase">MEDIUM</SelectItem>
                        <SelectItem value="Hard" className="font-black text-[9px] uppercase">HARD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Daily Reps</Label>
                    <Input 
                      type="number" 
                      value={newGoal.target} 
                      onChange={e => setNewGoal({...newGoal, target: e.target.value})} 
                      className="h-10 rounded-xl font-black text-center text-base bg-muted/5" 
                    />
                  </div>
                </div>

                <Button 
                  onClick={addGoal} 
                  disabled={loading || !newGoal.skill} 
                  className="w-full h-12 rounded-2xl font-black shadow-md bg-primary hover:bg-primary/90 text-white gap-2 text-xs"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  SECURE NODE
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md rounded-[2rem] border-none ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
               <CardHeader className="pb-1 px-5">
                 <CardTitle className="text-[9px] font-black uppercase flex items-center gap-2 tracking-widest text-primary">
                    <TrendingUp className="h-3 w-3" />
                    Overall Load
                 </CardTitle>
               </CardHeader>
               <CardContent className="px-5 pb-5">
                  <div className="flex items-end justify-between">
                     <div className="space-y-0.5">
                        <p className="text-3xl font-black tracking-tighter text-foreground leading-none">
                           {decryptedGoals?.reduce((s, g) => s + (g.completedCount || 0), 0)}
                        </p>
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total repetitions</p>
                     </div>
                     <GraduationCap className="h-10 w-10 text-primary/10" />
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Ledger - High Density */}
          <div className="lg:col-span-8 space-y-4">
             <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-3 md:py-4 px-5 md:px-8">
                   <CardTitle className="text-sm md:text-base font-black flex items-center gap-2 uppercase tracking-tight">
                     <Zap className="h-4 w-4 text-primary" />
                     Active Ledger
                   </CardTitle>
                   <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 bg-background h-6">{decryptedGoals.length} Units</Badge>
                </CardHeader>
                <CardContent className="p-0">
                   {decryptedGoals?.length === 0 ? (
                     <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale space-y-3">
                       <Target className="h-12 w-12" />
                       <p className="text-[10px] font-black uppercase tracking-[0.2em]">Forge ledger empty</p>
                     </div>
                   ) : (
                     <div className="divide-y divide-dashed">
                       {decryptedGoals.map((goal) => {
                         const p = Math.min(100, Math.round(((goal.completedCount || 0) / (goal.target || 1)) * 100));
                         const isComplete = p === 100;
                         return (
                           <div key={goal.id} className={cn(
                             "p-4 md:px-8 flex flex-col sm:flex-row items-center justify-between group transition-all relative overflow-hidden",
                             isComplete ? "bg-green-500/[0.03]" : "hover:bg-primary/[0.02]"
                           )}>
                             <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className={cn(
                                  "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105",
                                  goal.difficulty === 'Easy' ? "bg-green-500" : 
                                  goal.difficulty === 'Medium' ? "bg-orange-400" : "bg-red-500"
                                )}>
                                   {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <h4 className={cn("font-black text-sm md:text-base tracking-tight truncate uppercase", isComplete && "line-through opacity-50")}>{goal.skill}</h4>
                                   <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest mt-0.5 opacity-60">
                                      <span className={cn(
                                        "px-1 py-0.5 rounded-md border",
                                        goal.difficulty === 'Easy' ? "text-green-700 bg-green-50 border-green-100" :
                                        goal.difficulty === 'Medium' ? "text-orange-700 bg-orange-50 border-orange-100" :
                                        "text-red-700 bg-red-50 border-red-100"
                                      )}>{goal.difficulty}</span>
                                      <Separator orientation="vertical" className="h-2" />
                                      <span>{goal.target} Reps</span>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-3 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-dashed shadow-inner">
                                   <Button 
                                     variant="outline" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-md bg-background border-none shadow-sm" 
                                     onClick={() => updateProgress(goal.id, -1)} 
                                     disabled={goal.completedCount === 0}
                                   >-</Button>
                                   <div className="flex flex-col items-center w-12">
                                      <span className="font-black text-xs tabular-nums leading-none">{goal.completedCount}</span>
                                      <span className="text-[6px] font-black opacity-30 uppercase">Reps</span>
                                   </div>
                                   <Button 
                                     variant="outline" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-md bg-background border-none shadow-sm" 
                                     onClick={() => updateProgress(goal.id, 1)} 
                                     disabled={goal.completedCount >= goal.target}
                                   >+</Button>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deleteGoal(goal.id)}
                                  className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                   <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </CardContent>
             </Card>

             <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b py-3 px-6">
                   <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Mastery Distribution
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-8 space-y-4">
                   {decryptedGoals?.length === 0 ? (
                     <div className="py-8 flex flex-col items-center justify-center opacity-20 italic text-[9px] font-black uppercase tracking-widest">Awaiting strategic node data</div>
                   ) : (
                     <div className="grid gap-5">
                        {decryptedGoals.map(g => {
                           const p = Math.min(100, Math.round(((g.completedCount || 0) / (g.target || 1)) * 100));
                           return (
                             <div key={g.id} className="space-y-1.5 group">
                                <div className="flex justify-between items-end px-1">
                                   <span className="text-[9px] font-black uppercase tracking-tight text-foreground/80">{g.skill}</span>
                                   <span className={cn("text-[9px] font-black tracking-tighter", p === 100 ? "text-green-600" : "text-primary")}>{p}%</span>
                                </div>
                                <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
                                   <div 
                                     className={cn("h-full transition-all duration-1000 ease-out relative overflow-hidden", p === 100 ? "bg-green-500" : "bg-primary")}
                                     style={{ width: `${p}%` }}
                                   >
                                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                   </div>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                   )}
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
