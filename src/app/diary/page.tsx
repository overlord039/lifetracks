"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  Target,
  Lock,
  Unlock,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as UIDialogFooter
} from "@/components/ui/dialog";
import { encryptData, decryptData } from '@/lib/encryption';

export default function DiaryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null);
  
  // Encryption state
  const [privacyKey, setPrivacyKey] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Firestore References
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

  // Decrypted History Entries
  const [decryptedEntries, setDecryptedEntries] = useState<any[]>([]);

  // Load key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('diary_privacy_key');
    if (savedKey) {
      setPrivacyKey(savedKey);
    } else {
      setIsKeyModalOpen(true);
    }
  }, []);

  // Handle Current Entry Loading & Decryption
  useEffect(() => {
    const processEntry = async () => {
      if (entry && privacyKey) {
        setLocalEntry({
          whatIDidToday: await decryptData(entry.whatIDidToday || '', privacyKey),
          whatILearned: await decryptData(entry.whatILearned || '', privacyKey),
          challengesBlockers: await decryptData(entry.challengesBlockers || '', privacyKey),
          tomorrowsPlan: await decryptData(entry.tomorrowsPlan || '', privacyKey),
          mood: entry.mood || '😊'
        });
      }
    };
    processEntry();
  }, [entry, privacyKey]);

  // Handle History Decryption
  useEffect(() => {
    const decryptHistory = async () => {
      if (!allEntries || !privacyKey) {
        setDecryptedEntries(allEntries || []);
        return;
      }
      
      const decrypted = await Promise.all(
        allEntries.map(async (item) => ({
          ...item,
          whatIDidToday: await decryptData(item.whatIDidToday || '', privacyKey),
          whatILearned: await decryptData(item.whatILearned || '', privacyKey),
          challengesBlockers: await decryptData(item.challengesBlockers || '', privacyKey),
          tomorrowsPlan: await decryptData(item.tomorrowsPlan || '', privacyKey),
        }))
      );
      setDecryptedEntries(decrypted);
    };
    decryptHistory();
  }, [allEntries, privacyKey]);

  const savePrivacyKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem('diary_privacy_key', tempKey);
    setPrivacyKey(tempKey);
    setIsKeyModalOpen(false);
    toast({ title: "Privacy Key Set", description: "Your entries will now be encrypted locally." });
  };

  const saveEntry = async () => {
    if (!user || !diaryRef || !privacyKey) {
      if (!privacyKey) setIsKeyModalOpen(true);
      return;
    }
    setLoading(true);

    // Encrypt fields before saving
    const encryptedPayload = {
      whatIDidToday: await encryptData(localEntry.whatIDidToday, privacyKey),
      whatILearned: await encryptData(localEntry.whatILearned, privacyKey),
      challengesBlockers: await encryptData(localEntry.challengesBlockers, privacyKey),
      tomorrowsPlan: await encryptData(localEntry.tomorrowsPlan, privacyKey),
      mood: localEntry.mood, // Mood can remain unencrypted for history grouping if desired
      isEncrypted: true,
      userId: user.uid,
      date: todayStr,
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(diaryRef, encryptedPayload, { merge: true });
    
    toast({ 
      title: "Encrypted & Saved!", 
      description: "Only you can read this reflection." 
    });
    setLoading(false);
  };

  const moods = ['😊', '🤩', '🤔', '😴', '😤', '😔', '🤯'];
  const sortedEntries = [...decryptedEntries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-4 pb-6 h-full flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl text-primary shadow-sm">
              <BookText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black font-headline tracking-tight text-foreground flex items-center gap-2">
                My Diary
                <ShieldCheck className="h-4 w-4 text-green-500" title="End-to-End Encrypted" />
              </h2>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsKeyModalOpen(true)} className="h-9">
              <Lock className="mr-2 h-4 w-4" /> Change Privacy Key
            </Button>
            <Button onClick={saveEntry} disabled={loading} className="shadow-md h-9">
              <Save className="mr-2 h-4 w-4" /> Save Today's Reflection
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col">
            <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-muted/30 border-b py-2 px-6 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Today's Reflection
                </CardTitle>
                <CardDescription className="text-[10px]">Capture your thoughts and progress for today.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-6 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Mood</Label>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-between bg-muted/20 p-2 rounded-xl border">
                    {moods.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLocalEntry({...localEntry, mood: m})}
                        className={`text-xl transition-all duration-200 hover:scale-125 focus:outline-none ${localEntry.mood === m ? 'scale-125 drop-shadow-md brightness-110' : 'grayscale opacity-40 hover:opacity-80'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">What I did today</Label>
                    <Textarea 
                      placeholder="Key accomplishments..." 
                      className="min-h-[70px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatIDidToday}
                      onChange={e => setLocalEntry({...localEntry, whatIDidToday: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">What I learned</Label>
                    <Textarea 
                      placeholder="New skills or insights..." 
                      className="min-h-[70px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.whatILearned}
                      onChange={e => setLocalEntry({...localEntry, whatILearned: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Challenges / Blockers</Label>
                    <Textarea 
                      placeholder="What stopped your progress?" 
                      className="min-h-[70px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.challengesBlockers}
                      onChange={e => setLocalEntry({...localEntry, challengesBlockers: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tomorrow's Plan</Label>
                    <Textarea 
                      placeholder="Goals for the next day..." 
                      className="min-h-[70px] text-sm resize-none border-primary/20 focus:border-primary transition-colors" 
                      value={localEntry.tomorrowsPlan}
                      onChange={e => setLocalEntry({...localEntry, tomorrowsPlan: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-primary/5 text-primary text-[10px] font-medium flex items-center gap-2 py-2 px-6 border-t shrink-0">
                <Quote className="w-3 h-3" />
                <span>"Consistency is what transforms average into excellence."</span>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 flex flex-col h-full">
            <Card className="shadow-lg flex flex-col h-full overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-2 px-6 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Entry History
                </CardTitle>
                <CardDescription className="text-[10px]">Revisit your past reflections.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {sortedEntries.length > 0 ? (
                      sortedEntries.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedHistoryEntry(item)}
                          className={`group cursor-pointer p-3 rounded-xl border bg-card hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md ${item.date === todayStr ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-black text-foreground">
                                {format(parseISO(item.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <span className="text-lg">{item.mood || '😊'}</span>
                          </div>
                          
                          <p className="text-[10px] text-foreground/70 line-clamp-1 italic leading-relaxed">
                            {item.whatIDidToday ? `"${item.whatIDidToday}"` : "Encrypted Reflection"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                        <BookText className="w-5 h-5 text-muted-foreground/30" />
                        <p className="text-[10px] text-muted-foreground italic">No entries yet.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="shrink-0 py-1.5 border-t bg-muted/10">
                <p className="text-[9px] text-muted-foreground font-bold w-full text-center uppercase tracking-widest">
                  Showing {sortedEntries.length} total reflections
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Privacy Key Modal */}
      <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Set Diary Privacy Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              This key is stored only on your device. It encrypts your diary so even the developers cannot read your entries. 
              <strong> If you lose this key, you lose access to your past diary entries.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="privacy-key" className="text-[10px] font-bold uppercase mb-2 block">Privacy Passphrase</Label>
            <Input 
              id="privacy-key"
              type="password" 
              placeholder="Your secret key..." 
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>
          <UIDialogFooter>
            <Button onClick={savePrivacyKey} className="w-full">
              <Unlock className="mr-2 h-4 w-4" /> Initialize Encryption
            </Button>
          </UIDialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => !open && setSelectedHistoryEntry(null)}>
        <DialogContent className="max-w-md p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-primary h-12 w-full relative">
            <div className="absolute -bottom-5 left-6 p-1 bg-background rounded-2xl shadow-lg border-4 border-background">
               <span className="text-3xl">{selectedHistoryEntry?.mood}</span>
            </div>
          </div>
          
          <div className="p-6 pt-6 space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-black tracking-tight">
                {selectedHistoryEntry && format(parseISO(selectedHistoryEntry.date), 'EEEE, MMM do yyyy')}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-medium">
                Captured reflections and progress from this day.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 grid-cols-2">
              <div className="p-3 bg-secondary/10 rounded-xl space-y-1 border border-secondary/20">
                <div className="flex items-center gap-1.5 text-secondary-foreground text-[9px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> What I Did
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.whatIDidToday || 'None'}</p>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl space-y-1 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-1.5 text-blue-600 text-[9px] font-bold uppercase tracking-wider">
                  <Lightbulb className="h-3 w-3" /> What I Learned
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.whatILearned || 'None'}</p>
              </div>

              <div className="p-3 bg-destructive/5 rounded-xl space-y-1 border border-destructive/10">
                <div className="flex items-center gap-1.5 text-destructive text-[9px] font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" /> Challenges
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.challengesBlockers || 'None'}</p>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl space-y-1 border border-primary/10">
                <div className="flex items-center gap-1.5 text-primary text-[9px] font-bold uppercase tracking-wider">
                  <Target className="h-3 w-3" /> The Plan
                </div>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{selectedHistoryEntry?.tomorrowsPlan || 'None'}</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-muted/20 border-t flex justify-end">
            <Button onClick={() => setSelectedHistoryEntry(null)} variant="outline" size="sm" className="font-bold h-8 text-[10px]">
              Close Reflection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
