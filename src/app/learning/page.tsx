"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { CheckCircle2, GraduationCap, Plus, Flame, Trash2, Loader2, ShieldCheck, Target, Zap, TrendingUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subDays, parseISO } from 'date-fns';
import { encryptData, decryptData } from '@/lib/encryption';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function LearningPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const goalsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'learningGoals');
  }, [db, user]);

  const diariesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'dailyDiaries');
  }, [db, user]);

  const { data: rawGoals } = useCollection(goalsRef);
  const { data: diaries } = useCollection(diariesRef);
  
  const [decryptedGoals, setDecryptedGoals] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [newGoal, setNewGoal] = useState({ skill: '', difficulty: 'Easy', target: '2' });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      
      if (dates[i + 1] === expectedPrev) {
        currentStreak++;
      } else {
        break;
      }
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

  const deleteGoal = (id: string) => {
    if (!goalsRef) return;
    deleteDocumentNonBlocking(doc(goalsRef, id));
    toast({ title: "Goal removed" });
  };

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
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Skill Forge</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[8px] uppercase px-2 py-0.5">
                  <ShieldCheck className="h-2.5 w-2.5 mr-1" /> E2EE Mastery
                </Badge>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tactical progress tracking</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/20 flex items-center gap-3 shadow-sm">
                <Flame className={cn("h-5 w-5", streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground opacity-30")} />
                <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase tracking-widest text-orange-600/70">Day Streak</span>
                   <span className="text-lg font-black leading-none text-orange-600">{streak}</span>
                </div>
             </div>
             <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10">
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 rounded-3xl shadow-2xl border-none ring-1 ring-border">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mastery Methodology</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      The Skill Forge utilizes End-to-End Encryption (E2EE) to protect your developmental goals. Track daily repetitions to build streaks and visualize your distribution across multiple expertise domains.
                    </p>
                  </div>
                </PopoverContent>
             </Popover>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Setup Node */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b py-4 md:py-5 px-6">
                <CardTitle className="text-base font-black flex items-center gap-3">
                  <Plus className="h-5 w-5 text-primary" />
                  Initialize Goal
                </CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase tracking-tight">Private strategic node entry</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 px-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Expertise</Label>
                  <Input 
                    placeholder="e.g. Python, SQL, Guitar..." 
                    value={newGoal.skill} 
                    onChange={e => setNewGoal({...newGoal, skill: e.target.value})} 
                    className="h-11 rounded-xl uppercase font-black tracking-tight border-primary/10 bg-muted/10" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Difficulty</Label>
                    <Select value={newGoal.difficulty} onValueChange={v => setNewGoal({...newGoal, difficulty: v})}>
                      <SelectTrigger className="h-11 rounded-xl font-black uppercase text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy" className="font-black text-[10px] uppercase">EASY</SelectItem>
                        <SelectItem value="Medium" className="font-black text-[10px] uppercase">MEDIUM</SelectItem>
                        <SelectItem value="Hard" className="font-black text-[10px] uppercase">HARD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Daily Target</Label>
                    <Input 
                      type="number" 
                      value={newGoal.target} 
                      onChange={e => setNewGoal({...newGoal, target: e.target.value})} 
                      className="h-11 rounded-xl font-black text-center text-lg bg-muted/10" 
                    />
                  </div>
                </div>

                <Button 
                  onClick={addGoal} 
                  disabled={loading || !newGoal.skill} 
                  className="w-full h-14 rounded-2xl font-black shadow-xl bg-primary hover:bg-primary/90 text-white gap-3 text-sm mt-2"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  SECURE GOAL IN FORGE
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-[2rem] border-none ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
               <CardHeader className="pb-2 px-6">
                 <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 tracking-widest text-primary">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Overall Load
                 </CardTitle>
               </CardHeader>
               <CardContent className="px-6 pb-6">
                  <div className="flex items-end justify-between">
                     <div className="space-y-1">
                        <p className="text-4xl font-black tracking-tighter text-foreground">
                           {decryptedGoals?.reduce((s, g) => s + (g.completedCount || 0), 0)}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Repetitions</p>
                     </div>
                     <GraduationCap className="h-12 w-12 text-primary/10 -mr-2" />
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Active Ledger */}
          <div className="lg:col-span-8 space-y-6">
             <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden lg:col-span-2">
                   <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6 md:px-8">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-black flex items-center gap-3 uppercase tracking-tight">
                          <Zap className="h-5 w-5 text-primary" />
                          Active Forge Ledger
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-widest">Verified progress nodes</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase px-3 py-1 bg-background h-7">{decryptedGoals.length} Units</Badge>
                   </CardHeader>
                   <CardContent className="p-0">
                      {decryptedGoals?.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center opacity-30 grayscale space-y-4">
                          <Target className="h-16 w-16" />
                          <p className="text-[11px] font-black uppercase tracking-[0.3em]">Forge ledger empty</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-dashed">
                          {decryptedGoals.map((goal) => {
                            const p = Math.min(100, Math.round(((goal.completedCount || 0) / (goal.target || 1)) * 100));
                            const isComplete = p === 100;
                            return (
                              <div key={goal.id} className={cn(
                                "p-5 md:px-8 flex flex-col sm:flex-row items-center justify-between group transition-all relative overflow-hidden",
                                isComplete ? "bg-green-500/[0.03]" : "hover:bg-primary/[0.02]"
                              )}>
                                <div className="flex items-center gap-5 w-full sm:w-auto">
                                   <div className={cn(
                                     "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-105",
                                     goal.difficulty === 'Easy' ? "bg-green-500" : 
                                     goal.difficulty === 'Medium' ? "bg-orange-400" : "bg-red-500"
                                   )}>
                                      {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                                   </div>
                                   <div className="min-w-0 flex-1">
                                      <h4 className={cn("font-black text-base md:text-lg tracking-tight truncate uppercase", isComplete && "line-through opacity-50")}>{goal.skill}</h4>
                                      <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60">
                                         <span className={cn(
                                           "px-1.5 py-0.5 rounded-md border",
                                           goal.difficulty === 'Easy' ? "text-green-700 bg-green-50 border-green-100" :
                                           goal.difficulty === 'Medium' ? "text-orange-700 bg-orange-50 border-orange-100" :
                                           "text-red-700 bg-red-50 border-red-100"
                                         )}>{goal.difficulty} LOAD</span>
                                         <Separator orientation="vertical" className="h-2.5" />
                                         <span>Target {goal.target} Reps</span>
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                   <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-dashed shadow-inner">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg bg-background border-none shadow-sm" 
                                        onClick={() => updateProgress(goal.id, -1)} 
                                        disabled={goal.completedCount === 0}
                                      >-</Button>
                                      <div className="flex flex-col items-center w-14">
                                         <span className="font-black text-sm tabular-nums leading-none">{goal.completedCount}</span>
                                         <span className="text-[7px] font-black opacity-30 uppercase">Reps</span>
                                      </div>
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg bg-background border-none shadow-sm" 
                                        onClick={() => updateProgress(goal.id, 1)} 
                                        disabled={goal.completedCount >= goal.target}
                                      >+</Button>
                                   </div>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => deleteGoal(goal.id)}
                                     className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </Button>
                                </div>

                                {isComplete && (
                                   <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.03]">
                                      <CheckCircle2 className="h-20 w-20 -rotate-12 translate-x-4 translate-y-4" />
                                   </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                   </CardContent>
                </Card>

                <Card className="shadow-xl rounded-[2rem] border-none ring-1 ring-border overflow-hidden lg:col-span-2">
                   <CardHeader className="bg-muted/30 border-b py-3 px-6">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                         <TrendingUp className="h-4 w-4 text-primary" />
                         Mastery Distribution
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-6 md:p-8 space-y-5">
                      {decryptedGoals?.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">Awaiting strategic node data</div>
                      ) : (
                        <div className="grid gap-6">
                           {decryptedGoals.map(g => {
                              const p = Math.min(100, Math.round(((g.completedCount || 0) / (g.target || 1)) * 100));
                              return (
                                <div key={g.id} className="space-y-2 group">
                                   <div className="flex justify-between items-end px-1">
                                      <div className="flex flex-col">
                                         <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80">{g.skill}</span>
                                         <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expertise domain</span>
                                      </div>
                                      <span className={cn("text-xs font-black tracking-tighter", p === 100 ? "text-green-600" : "text-primary")}>{p}% Mastery</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
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
                   <CardFooter className="bg-primary/5 py-3 flex items-center justify-center gap-2 border-t">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-70">Progress verified by cryptographic audit</span>
                   </CardFooter>
                </Card>
             </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}