
"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { 
  BookText, 
  Save, 
  Sparkles, 
  History, 
  Calendar, 
  Quote, 
  CheckCircle2, 
  Lightbulb, 
  AlertTriangle, 
  Target 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function DiaryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const diaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [db, user, todayStr]);

  const allDiariesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'dailyDiaries');
  }, [db, user]);

  const { data: entry } = useDoc(diaryRef);
  const { data: allEntries } = useCollection(allDiariesRef);

  const [localEntry, setLocalEntry] = useState({
    whatIDidToday: '',
    whatILearned: '',
    challengesBlockers: '',
    tomorrowsPlan: '',
    mood: '😊'
  });

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
  const sortedEntries = allEntries ? [...allEntries].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-4 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl text-primary shadow-sm">
              <BookText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black font-headline tracking-tight text-foreground">My Diary</h2>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
            </div>
          </div>
          <Button onClick={saveEntry} disabled={loading} className="w-full md:w-auto shadow-md h-9">
            <Save className="mr-2 h-4 w-4" /> Save Reflection
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Today's Reflection
                </CardTitle>
                <CardDescription className="text-xs">Capture your thoughts and progress for today.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Mood</Label>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-between bg-muted/20 p-3 rounded-xl border">
                    {moods.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLocalEntry({...localEntry, mood: m})}
                        className={`text-2xl transition-all duration-200 hover:scale-125 focus:outline-none ${localEntry.mood === m ? 'scale-125 drop-shadow-md brightness-110' : 'grayscale opacity-40 hover:opacity-80'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">What I did today</Label>
                    <Textarea 
                      placeholder="Key accomplishments..." 
                      className="min-h-[90px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatIDidToday}
                      onChange={e => setLocalEntry({...localEntry, whatIDidToday: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">What I learned</Label>
                    <Textarea 
                      placeholder="New skills or insights..." 
                      className="min-h-[90px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatILearned}
                      onChange={e => setLocalEntry({...localEntry, whatILearned: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Challenges</Label>
                    <Textarea 
                      placeholder="What stopped your progress?" 
                      className="min-h-[90px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.challengesBlockers}
                      onChange={e => setLocalEntry({...localEntry, challengesBlockers: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tomorrow's Plan</Label>
                    <Textarea 
                      placeholder="Goals for the next day..." 
                      className="min-h-[90px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.tomorrowsPlan}
                      onChange={e => setLocalEntry({...localEntry, tomorrowsPlan: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-primary/5 text-primary text-[10px] font-medium flex items-center gap-2 py-3 px-6 border-t">
                <Quote className="w-3 h-3" />
                <span>"Consistency is what transforms average into excellence."</span>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 h-full">
            <Card className="shadow-lg h-full flex flex-col lg:max-h-[600px]">
              <CardHeader className="bg-muted/30 border-b py-3 px-6 shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  History
                </CardTitle>
                <CardDescription className="text-xs">Revisit your past reflections.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full max-h-[400px] lg:max-h-[500px]">
                  <div className="p-4 space-y-3">
                    {sortedEntries.length > 0 ? (
                      sortedEntries.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedHistoryEntry(item)}
                          className={`group cursor-pointer p-3 rounded-xl border bg-card hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md ${item.date === todayStr ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-black text-foreground">
                                {format(parseISO(item.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <span className="text-xl">{item.mood || '😊'}</span>
                          </div>
                          
                          {item.whatIDidToday && (
                            <p className="text-[11px] text-foreground/70 line-clamp-1 italic leading-relaxed">
                              "{item.whatIDidToday}"
                            </p>
                          )}
                          
                          {item.date === todayStr && (
                            <div className="mt-2 text-[9px] font-bold text-primary uppercase text-center bg-primary/10 py-0.5 rounded-full animate-pulse">
                              Active Today
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                        <div className="p-3 bg-muted rounded-full">
                          <BookText className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-xs text-muted-foreground italic">No entries yet.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="shrink-0 py-2.5 border-t bg-muted/10">
                <p className="text-[9px] text-muted-foreground font-bold w-full text-center uppercase tracking-widest">
                  {sortedEntries.length} Reflections
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => !open && setSelectedHistoryEntry(null)}>
        <DialogContent className="max-w-md p-0 border-none shadow-2xl">
          <div className="bg-primary h-16 w-full relative">
            <div className="absolute -bottom-6 left-6 p-1 bg-background rounded-2xl shadow-lg border-4 border-background">
               <span className="text-4xl">{selectedHistoryEntry?.mood}</span>
            </div>
          </div>
          
          <div className="p-6 pt-8 space-y-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-black tracking-tight">
                {selectedHistoryEntry && format(parseISO(selectedHistoryEntry.date), 'EEEE, MMM do yyyy')}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                Reflections and progress from this day.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 grid-cols-2">
              <div className="p-3 bg-secondary/10 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.whatIDidToday || 'None'}</p>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                  <Lightbulb className="h-3 w-3" /> Learned
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.whatILearned || 'None'}</p>
              </div>

              <div className="p-3 bg-destructive/5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-destructive text-[10px] font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" /> Blocks
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.challengesBlockers || 'None'}</p>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <Target className="h-3 w-3" /> Plan
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.tomorrowsPlan || 'None'}</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-muted/20 border-t flex justify-end">
            <Button onClick={() => setSelectedHistoryEntry(null)} variant="outline" size="sm" className="font-bold h-8 text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
