
"use client";

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { CheckCircle2, GraduationCap, Plus, Flame, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, parseISO } from 'date-fns';

export default function LearningPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const goalsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'learningGoals');
  }, [db, user]);

  const diariesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'dailyDiaries');
  }, [db, user]);

  const { data: goals } = useCollection(goalsRef);
  const { data: diaries } = useCollection(diariesRef);
  
  const [newGoal, setNewGoal] = useState({ skill: '', difficulty: 'Easy', target: '2' });

  const streak = useMemo(() => {
    if (!diaries || diaries.length === 0) return 0;

    // Extract unique dates and sort descending
    const dates = Array.from(new Set(diaries.map(d => d.date))).sort().reverse();
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // If latest entry isn't today or yesterday, streak is broken
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

  const addGoal = () => {
    if (!newGoal.skill || !newGoal.target || !goalsRef) return;
    setLoading(true);
    addDocumentNonBlocking(goalsRef, {
      userId: user?.uid,
      skill: newGoal.skill,
      difficulty: newGoal.difficulty,
      target: parseInt(newGoal.target),
      completedCount: 0,
      createdAt: new Date().toISOString()
    }).then(() => {
      setNewGoal({ skill: '', difficulty: 'Easy', target: '2' });
      setLoading(false);
      toast({ title: "Goal added!" });
    });
  };

  const updateProgress = (id: string, delta: number) => {
    if (!goalsRef) return;
    const goal = goals?.find(g => g.id === id);
    if (!goal) return;
    const newCount = Math.max(0, (goal.completedCount || 0) + delta);
    updateDocumentNonBlocking(doc(goalsRef, id), { completedCount: newCount, updatedAt: new Date().toISOString() });
  };

  const deleteGoal = (id: string) => {
    if (!goalsRef) return;
    deleteDocumentNonBlocking(doc(goalsRef, id));
    toast({ title: "Goal removed" });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Setup Your Learning Goals</CardTitle>
            <CardDescription>Define what you want to master and how many questions daily.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Skill</Label>
                <Input placeholder="Python, SQL, etc." value={newGoal.skill} onChange={e => setNewGoal({...newGoal, skill: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={newGoal.difficulty} onValueChange={v => setNewGoal({...newGoal, difficulty: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily Target</Label>
                <Input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} />
              </div>
              <div className="flex items-end">
                <Button onClick={addGoal} disabled={loading} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Goal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-secondary-foreground" />
                Daily Checklist
              </CardTitle>
              <CardDescription>Mark your completed tasks for today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals?.length === 0 && <p className="text-muted-foreground text-center py-8">No goals set yet.</p>}
              {goals?.map((goal) => (
                <div key={goal.id} className="group flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
                  <div>
                    <h4 className="font-bold text-lg">{goal.skill}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      goal.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      goal.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {goal.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => updateProgress(goal.id, -1)} disabled={goal.completedCount === 0}>-</Button>
                      <span className="font-mono text-xl w-12 text-center">{goal.completedCount} / {goal.target}</span>
                      <Button variant="outline" size="sm" onClick={() => updateProgress(goal.id, 1)} disabled={goal.completedCount >= goal.target}>+</Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteGoal(goal.id)}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Progress Insights
              </CardTitle>
              <CardDescription>Summary of your learning journey.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center flex flex-col items-center justify-center relative overflow-hidden">
                  <Flame className={`h-4 w-4 absolute top-2 right-2 ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-muted-foreground'}`} />
                  <div className="text-3xl font-black">{streak}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Day Streak</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-black">{goals?.reduce((s, g) => s + (g.completedCount || 0), 0)}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Tasks Done</div>
                </div>
              </div>
              <div className="space-y-3">
                <h5 className="text-sm font-semibold">Skill Mastery</h5>
                {goals?.map(g => (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{g.skill}</span>
                      <span className="text-muted-foreground">{Math.round(((g.completedCount || 0) / (g.target || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((g.completedCount || 0) / (g.target || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
