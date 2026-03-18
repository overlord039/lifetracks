
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

  // Today's entry ref
  const diaryRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'dailyDiaries', todayStr);
  }, [db, user, todayStr]);

  // All entries collection ref
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

  // Update local state when Firestore data loads for today
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

  // Sort entries by date descending
  const sortedEntries = allEntries ? [...allEntries].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl text-primary shadow-sm">
              <BookText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-foreground">My Diary</h2>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
            </div>
          </div>
          <Button onClick={saveEntry} disabled={loading} className="w-full md:w-auto shadow-md">
            <Save className="mr-2 h-4 w-4" /> Save Today's Reflection
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Entry Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Today's Reflection
                </CardTitle>
                <CardDescription>Capture your thoughts and progress for today.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Mood Selector */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Mood</Label>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-between bg-muted/30 p-4 rounded-xl border">
                    {moods.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLocalEntry({...localEntry, mood: m})}
                        className={`text-3xl transition-all duration-200 hover:scale-125 focus:outline-none ${localEntry.mood === m ? 'scale-125 drop-shadow-md brightness-110' : 'grayscale opacity-40 hover:opacity-80'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">What I did today</Label>
                    <Textarea 
                      placeholder="Key accomplishments and activities..." 
                      className="min-h-[120px] resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatIDidToday}
                      onChange={e => setLocalEntry({...localEntry, whatIDidToday: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">What I learned</Label>
                    <Textarea 
                      placeholder="New skills or insights gained..." 
                      className="min-h-[120px] resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatILearned}
                      onChange={e => setLocalEntry({...localEntry, whatILearned: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Challenges / Blockers</Label>
                    <Textarea 
                      placeholder="What stopped your progress?" 
                      className="min-h-[120px] resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.challengesBlockers}
                      onChange={e => setLocalEntry({...localEntry, challengesBlockers: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tomorrow's Plan</Label>
                    <Textarea 
                      placeholder="Goals for the next day..." 
                      className="min-h-[120px] resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.tomorrowsPlan}
                      onChange={e => setLocalEntry({...localEntry, tomorrowsPlan: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-primary/5 text-primary text-xs flex items-center gap-2 py-4 px-6 border-t">
                <Quote className="w-3 h-3" />
                <span>"Consistency is what transforms average into excellence."</span>
              </CardFooter>
            </Card>
          </div>

          {/* History Section */}
          <div className="space-y-6">
            <Card className="shadow-lg h-full lg:max-h-[800px] flex flex-col">
              <CardHeader className="bg-muted/30 border-b pb-4 shrink-0">
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Entry History
                </CardTitle>
                <CardDescription>Revisit your past reflections.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px] lg:h-[600px]">
                  <div className="p-4 space-y-4">
                    {sortedEntries.length > 0 ? (
                      sortedEntries.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedHistoryEntry(item)}
                          className={`group cursor-pointer p-4 rounded-xl border bg-card hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md ${item.date === todayStr ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-black text-foreground">
                                {format(parseISO(item.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <span className="text-2xl drop-shadow-sm">{item.mood || '😊'}</span>
                          </div>
                          
                          <div className="space-y-3">
                            {item.whatIDidToday && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Highlights</p>
                                <p className="text-xs text-foreground/80 line-clamp-2 italic leading-relaxed">
                                  "{item.whatIDidToday}"
                                </p>
                              </div>
                            )}
                          </div>

                          {item.date === todayStr && (
                            <div className="mt-3 text-[10px] font-bold text-primary uppercase text-center bg-primary/10 py-1 rounded-full animate-pulse">
                              Active Entry
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <div className="p-4 bg-muted rounded-full">
                          <BookText className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground italic font-medium">Your diary is waiting for its first entry.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="shrink-0 p-4 border-t bg-muted/10">
                <p className="text-[10px] text-muted-foreground font-medium w-full text-center uppercase tracking-tighter">
                  Showing {sortedEntries.length} total reflections
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* History Detail Dialog */}
      <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => !open && setSelectedHistoryEntry(null)}>
        <DialogContent className="max-w-lg p-0 border-none shadow-2xl">
          <div className="bg-primary h-20 w-full relative">
            <div className="absolute -bottom-8 left-8 p-1 bg-background rounded-2xl shadow-lg border-4 border-background">
               <span className="text-5xl">{selectedHistoryEntry?.mood}</span>
            </div>
          </div>
          
          <div className="p-6 pt-10 space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                {selectedHistoryEntry && format(parseISO(selectedHistoryEntry.date), 'EEEE, MMM do yyyy')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Captured reflections and progress from this day.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-none shadow-none bg-secondary/10 overflow-hidden">
                <CardHeader className="pb-1.5 space-y-1">
                  <div className="flex items-center gap-2 text-secondary-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider">What I Did</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {selectedHistoryEntry?.whatIDidToday || 'No accomplishments recorded.'}
                </CardContent>
              </Card>

              <Card className="border-none shadow-none bg-blue-50/50 overflow-hidden">
                <CardHeader className="pb-1.5 space-y-1">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Lightbulb className="h-4 w-4" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider">What I Learned</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {selectedHistoryEntry?.whatILearned || 'No insights recorded.'}
                </CardContent>
              </Card>

              <Card className="border-none shadow-none bg-destructive/5 overflow-hidden">
                <CardHeader className="pb-1.5 space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider">Challenges</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {selectedHistoryEntry?.challengesBlockers || 'No blockers encountered.'}
                </CardContent>
              </Card>

              <Card className="border-none shadow-none bg-primary/5 overflow-hidden">
                <CardHeader className="pb-1.5 space-y-1">
                  <div className="flex items-center gap-2 text-primary">
                    <Target className="h-4 w-4" />
                    <CardTitle className="text-xs font-bold uppercase tracking-wider">The Plan</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-xs leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {selectedHistoryEntry?.tomorrowsPlan || 'No goals set for the next day.'}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="p-4 bg-muted/20 border-t flex justify-end">
            <Button onClick={() => setSelectedHistoryEntry(null)} variant="outline" size="sm" className="font-bold">
              Close Reflection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
