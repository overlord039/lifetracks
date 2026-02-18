"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { BookText, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DiaryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState({
    whatIDidToday: '',
    whatILearned: '',
    challengesBlockers: '',
    tomorrowsPlan: '',
    mood: '😊'
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    const fetchTodayEntry = async () => {
      const docRef = doc(db, 'daily_diary', `${user.uid}_${todayStr}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setEntry(snap.data() as any);
      }
    };
    fetchTodayEntry();
  }, [user, todayStr]);

  const saveEntry = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'daily_diary', `${user.uid}_${todayStr}`), {
        ...entry,
        userId: user.uid,
        date: todayStr,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Diary saved!", description: "Your reflection for today has been recorded." });
    } catch (err) {
      toast({ variant: 'destructive', title: "Failed to save diary" });
    } finally {
      setLoading(false);
    }
  };

  const moods = ['😊', '🤩', '🤔', '😴', '😤', '😔', '🤯'];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <BookText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-headline">Daily Reflection</h2>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
            </div>
          </div>
          <Button onClick={saveEntry} disabled={loading}>
            <Save className="mr-2 h-4 w-4" /> Save Entry
          </Button>
        </div>

        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">How are you feeling today?</Label>
              <div className="flex gap-4 justify-between bg-muted/30 p-4 rounded-xl">
                {moods.map(m => (
                  <button
                    key={m}
                    onClick={() => setEntry({...entry, mood: m})}
                    className={`text-3xl transition-transform hover:scale-125 ${entry.mood === m ? 'scale-125 drop-shadow-md' : 'grayscale opacity-50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>What I did today</Label>
                <Textarea 
                  placeholder="Key accomplishments and activities..." 
                  className="min-h-[120px]" 
                  value={entry.whatIDidToday}
                  onChange={e => setEntry({...entry, whatIDidToday: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>What I learned</Label>
                <Textarea 
                  placeholder="New skills or insights gained..." 
                  className="min-h-[120px]" 
                  value={entry.whatILearned}
                  onChange={e => setEntry({...entry, whatILearned: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Challenges / Blockers</Label>
                <Textarea 
                  placeholder="What stopped your progress?" 
                  className="min-h-[120px]" 
                  value={entry.challengesBlockers}
                  onChange={e => setEntry({...entry, challengesBlockers: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Tomorrow&apos;s Plan</Label>
                <Textarea 
                  placeholder="Goals for the next day..." 
                  className="min-h-[120px]" 
                  value={entry.tomorrowsPlan}
                  onChange={e => setEntry({...entry, tomorrowsPlan: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-primary/5 text-primary text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Keep it up! Consistent reflection leads to better productivity.
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
