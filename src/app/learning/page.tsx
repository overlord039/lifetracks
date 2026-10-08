"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { CheckCircle2, GraduationCap, Plus, Flame, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subDays, parseISO } from 'date-fns';
import { encryptData, decryptData } from '@/lib/encryption';

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
      const decrypted = await Promise.all(rawGoals.map(async (goal) => ({
        ...goal,
        skill: goal.isEncrypted ? await decryptData(goal.skill, user.uid) : (goal.skill || ''),
      })));
      setDecryptedGoals(decrypted);
      setIsDecrypting(false);
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
    
    const encryptedSkill = await encryptData(newGoal.skill.trim().toUpperCase(), user.uid);
    
    addDocumentNonBlocking(goalsRef, {
      userId: user?.uid,
      skill: encryptedSkill,
      difficulty: newGoal.difficulty,
      target: parseInt(newGoal.target),
      completedCount: 0,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      setNewGoal({ skill: '', difficulty: 'Easy', target: '2' });
      setLoading(false);
      toast({ title: "Goal secured in vault" });
    });
  };

  const updateProgress = (id: string, delta: number) => {
    if (!goalsRef) return;
    const goal = decryptedGoals?.find(g => g.id === id);
    if (!goal) return;
    const newCount = Math.max(0, (goal.completedCount || 0) + delta);
    updateDocumentNonBlocking(doc(goalsRef, id), { completedCount: newCount, updatedAt: new Date().toISOString() });
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
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Decrypting Skills...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Skill Mastery</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E2EE Progress Tracking</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase px-3 py-1">
            <ShieldCheck className="h-3 w-3 mr-1.5" /> Private Data
          </Badge>
        </div>

        <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base font-black">Setup Your Protected Goals</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Define what you want to master in total privacy.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Target Skill</Label>
                <Input placeholder="e.g. Python, SQL, Guitar..." value={newGoal.skill} onChange={e => setNewGoal({...newGoal, skill: e.target.value})} className="h-11 rounded-xl uppercase font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Difficulty</Label>
                <Select value={newGoal.difficulty} onValueChange={v => setNewGoal({...newGoal, difficulty: v})}>
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy" className="font-bold">EASY</SelectItem>
                    <SelectItem value="Medium" className="font-bold">MEDIUM</SelectItem>
                    <SelectItem value="Hard" className="font-bold">HARD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Daily Target Reps</Label>
                <Input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} className="h-11 rounded-xl font-black text-lg" />
              </div>
              <div className="flex items-end">
                <Button onClick={addGoal} disabled={loading || !newGoal.skill} className="w-full h-11 rounded-xl font-black shadow-lg">
                  <Plus className="mr-2 h-4 w-4" /> Secure Goal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border order-2 md:order-1 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Daily Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 px-4 sm:px-6">
              {decryptedGoals?.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale space-y-3">
                  <GraduationCap className="h-12 w-12" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">No goals active in your vault</p>
                </div>
              )}
              {decryptedGoals?.map((goal) => (
                <div key={goal.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm gap-4 relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="font-black text-lg tracking-tight uppercase">{goal.skill}</h4>
                    <span className={cn(
                      "text-[8px] px-2 py-0.5 rounded-md uppercase font-black border",
                      goal.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' :
                      goal.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    )}>
                      {goal.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto relative z-10">
                    <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-dashed">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background" onClick={() => updateProgress(goal.id, -1)} disabled={goal.completedCount === 0}>-</Button>
                      <span className="font-black text-base w-12 text-center tabular-nums">{goal.completedCount} <span className="text-[9px] opacity-30">/</span> {goal.target}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background" onClick={() => updateProgress(goal.id, 1)} disabled={goal.completedCount >= goal.target}>+</Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteGoal(goal.id)}
                      className="text-destructive h-10 w-10 hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {goal.completedCount >= goal.target && (
                    <div className="absolute inset-0 bg-green-500/5 pointer-events-none flex items-center justify-center">
                       <CheckCircle2 className="h-24 w-24 text-green-500/10 -rotate-12" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border order-1 md:order-2 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Strategic Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8 px-4 sm:px-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-center flex flex-col items-center justify-center relative overflow-hidden group hover:bg-orange-500/10 transition-colors">
                  <Flame className={cn("h-4 w-4 absolute top-3 right-3 transition-all", streak > 0 ? 'text-orange-500 animate-pulse scale-125' : 'text-muted-foreground opacity-30')} />
                  <div className="text-4xl font-black tracking-tighter text-orange-600">{streak}</div>
                  <div className="text-[9px] font-black uppercase text-orange-600/70 tracking-widest mt-1">Day Streak</div>
                </div>
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 text-center flex flex-col items-center justify-center relative overflow-hidden group hover:bg-primary/10 transition-colors">
                  <GraduationCap className="h-4 w-4 absolute top-3 right-3 text-primary/40 group-hover:scale-125 transition-transform" />
                  <div className="text-4xl font-black tracking-tighter text-primary">{decryptedGoals?.reduce((s, g) => s + (g.completedCount || 0), 0)}</div>
                  <div className="text-[9px] font-black uppercase text-primary/70 tracking-widest mt-1">Total Reps</div>
                </div>
              </div>
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Mastery Distribution</h5>
                <div className="grid gap-4">
                  {decryptedGoals?.map(g => {
                    const p = Math.min(100, Math.round(((g.completedCount || 0) / (g.target || 1)) * 100));
                    return (
                      <div key={g.id} className="space-y-2 p-3 bg-muted/10 rounded-xl border border-dashed">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                          <span className="truncate max-w-[70%]">{g.skill}</span>
                          <span className={cn(p === 100 ? "text-green-600" : "text-primary")}>{p}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000 ease-out", p === 100 ? "bg-green-500" : "bg-primary")}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
