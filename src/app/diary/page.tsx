
"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { BookText, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DiaryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const diaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [db, user, todayStr]);

  const { data: entry } = useDoc(diaryRef);

  const [localEntry, setLocalEntry] = useState({
    whatIDidToday: '',
    whatILearned: '',
    challengesBlockers: '',
    tomorrowsPlan: '',
    mood: '😊'
  });

  // Update local state when Firestore data loads
  React.useEffect(() => {
    if (entry) {
      setLocalEntry({
        whatIDidToday: entry.whatIDidToday || '',
        whatILearned: entry.whatILearned || '',
        challengesBlockers: entry.challengesBlockers || '',
        tomorrowsPlan: entry.tomorrowsPlan || '',
        mood: entry.mood || '😊'
      });
    }
  }, [entry]);

  const saveEntry = () => {
    if (!user || !diaryRef) return;
    setLoading(true);
    setDocumentNonBlocking(diaryRef, {
      ...localEntry,
      userId: user.uid,
      date: todayStr,
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    toast({ title: "Diary saved!", description: "Your reflection for today has been recorded." });
    setLoading(false);
  };

  const moods = ['😊', '🤩', '🤔', '😴', '😤', '😔', '🤯'];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              < BookText className="w-6 h-6" />
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
                    onClick={() => setLocalEntry({...localEntry, mood: m})}
                    className={`text-3xl transition-transform hover:scale-125 ${localEntry.mood === m ? 'scale-125 drop-shadow-md' : 'grayscale opacity-50'}`}
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
                  value={localEntry.whatIDidToday}
                  onChange={e => setLocalEntry({...localEntry, whatIDidToday: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>What I learned</Label>
                <Textarea 
                  placeholder="New skills or insights gained..." 
                  className="min-h-[120px]" 
                  value={localEntry.whatILearned}
                  onChange={e => setLocalEntry({...localEntry, whatILearned: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Challenges / Blockers</Label>
                <Textarea 
                  placeholder="What stopped your progress?" 
                  className="min-h-[120px]" 
                  value={localEntry.challengesBlockers}
                  onChange={e => setLocalEntry({...localEntry, challengesBlockers: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Tomorrow&apos;s Plan</Label>
                <Textarea 
                  placeholder="Goals for the next day..." 
                  className="min-h-[120px]" 
                  value={localEntry.tomorrowsPlan}
                  onChange={e => setLocalEntry({...localEntry, tomorrowsPlan: e.target.value})}
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
