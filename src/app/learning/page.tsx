"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CheckCircle2, Circle, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LearningPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [dailyProgress, setDailyProgress] = useState<any[]>([]);
  
  const [newGoal, setNewGoal] = useState({ skill: '', difficulty: 'Easy', target: '2' });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const q = query(collection(db, 'learning_goals'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, [user]);

  const addGoal = async () => {
    if (!newGoal.skill || !newGoal.target) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'learning_goals'), {
        userId: user?.uid,
        skill: newGoal.skill,
        difficulty: newGoal.difficulty,
        target: parseInt(newGoal.target),
        completedCount: 0
      });
      setGoals([...goals, { id: docRef.id, ...newGoal, target: parseInt(newGoal.target), completedCount: 0 }]);
      setNewGoal({ skill: '', difficulty: 'Easy', target: '2' });
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (id: string, delta: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newCount = Math.max(0, goal.completedCount + delta);
    await updateDoc(doc(db, 'learning_goals', id), { completedCount: newCount });
    setGoals(goals.map(g => g.id === id ? { ...g, completedCount: newCount } : g));
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Setup Goals */}
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

        {/* Daily Tracking */}
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
              {goals.length === 0 && <p className="text-muted-foreground text-center py-8">No goals set yet.</p>}
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
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
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">45</div>
                  <div className="text-xs text-muted-foreground">Tasks Done</div>
                </div>
              </div>
              <div className="space-y-3">
                <h5 className="text-sm font-semibold">Skill Mastery</h5>
                {goals.map(g => (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{g.skill}</span>
                      <span>{Math.round((g.completedCount / g.target) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${(g.completedCount / g.target) * 100}%` }}
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
