
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
  ShieldCheck,
  Loader2,
  ChevronRight
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
import { cn } from '@/lib/utils';

export default function DiaryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  const [privacyKey, setPrivacyKey] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');

  useEffect(() => {
    setMounted(true);
    const savedKey = localStorage.getItem('lifetrack_privacy_key');
    if (savedKey) setPrivacyKey(savedKey);
  }, []);

  const todayStr = mounted ? format(new Date(), 'yyyy-MM-dd') : '';

  const diaryRef = useMemoFirebase(() => {
    if (!db || !user || !todayStr) return null;
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

  const [decryptedEntries, setDecryptedEntries] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    const processEntry = async () => {
      if (entry && privacyKey && mounted) {
        setLocalEntry({
          whatIDidToday: await decryptData(entry.whatIDidToday || '', privacyKey),
          whatILearned: await decryptData(entry.whatILearned || '', privacyKey),
          challengesBlockers: await decryptData(entry.challengesBlockers || '', privacyKey),
          tomorrowsPlan: await decryptData(entry.tomorrowsPlan || '', privacyKey),
          mood: await decryptData(entry.mood || '', privacyKey) || '😊'
        });
      }
    };
    processEntry();
  }, [entry, privacyKey, mounted]);

  useEffect(() => {
    const decryptHistory = async () => {
      if (!allEntries || !privacyKey || !mounted) {
        setDecryptedEntries(allEntries || []);
        return;
      }
      setIsDecrypting(true);
      const decrypted = await Promise.all(
        allEntries.map(async (item) => ({
          ...item,
          whatIDidToday: await decryptData(item.whatIDidToday || '', privacyKey),
          whatILearned: await decryptData(item.whatILearned || '', privacyKey),
          challengesBlockers: await decryptData(item.challengesBlockers || '', privacyKey),
          tomorrowsPlan: await decryptData(item.tomorrowsPlan || '', privacyKey),
          mood: await decryptData(item.mood || '', privacyKey)
        }))
      );
      setDecryptedEntries(decrypted);
      setIsDecrypting(false);
    };
    decryptHistory();
  }, [allEntries, privacyKey, mounted]);

  const saveEntry = async () => {
    if (!user || !diaryRef || !privacyKey) return;
    setLoading(true);

    const encryptedPayload = {
      whatIDidToday: await encryptData(localEntry.whatIDidToday, privacyKey),
      whatILearned: await encryptData(localEntry.whatILearned, privacyKey),
      challengesBlockers: await encryptData(localEntry.challengesBlockers, privacyKey),
      tomorrowsPlan: await encryptData(localEntry.tomorrowsPlan, privacyKey),
      mood: await encryptData(localEntry.mood, privacyKey),
      isEncrypted: true,
      userId: user.uid,
      date: todayStr,
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(diaryRef, encryptedPayload, { merge: true });
    toast({ title: "Vault Locked & Saved!", description: "Reflection secured with AES-GCM." });
    setLoading(false);
  };

  if (!mounted || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Memoirs...</p>
        </div>
      </AppShell>
    );
  }

  const moods = ['😊', '🤩', '🤔', '😴', '😤', '😔', '🤯'];
  const sortedEntries = [...decryptedEntries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-sm border border-primary/10">
              <BookText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                Daily Memoir
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
            </div>
          </div>
          <Button onClick={saveEntry} disabled={loading} className="shadow-lg h-12 px-6 font-black text-sm rounded-2xl">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Lock Reflection
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/30 border-b py-4 px-6">
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Today's Insights
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight">E2EE Private reflection channel</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 px-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Sentiment</Label>
                  <div className="flex flex-wrap gap-2 justify-between bg-muted/20 p-3 rounded-2xl border border-dashed">
                    {moods.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLocalEntry({...localEntry, mood: m})}
                        className={cn(
                          "text-2xl transition-all duration-300 hover:scale-125 focus:outline-none",
                          localEntry.mood === m ? "scale-125 drop-shadow-md brightness-110" : "grayscale opacity-30 hover:opacity-100"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DiaryInput label="Achievements" icon={<CheckCircle2 className="w-3 h-3"/>} placeholder="Key accomplishments today..." value={localEntry.whatIDidToday} onChange={val => setLocalEntry({...localEntry, whatIDidToday: val})} />
                  <DiaryInput label="New Learnings" icon={<Lightbulb className="w-3 h-3"/>} placeholder="Insights or new skills..." value={localEntry.whatILearned} onChange={val => setLocalEntry({...localEntry, whatILearned: val})} />
                  <DiaryInput label="Blockers" icon={<AlertTriangle className="w-3 h-3"/>} placeholder="Challenges faced today..." value={localEntry.challengesBlockers} onChange={val => setLocalEntry({...localEntry, challengesBlockers: val})} />
                  <DiaryInput label="Next Targets" icon={<Target className="w-3 h-3"/>} placeholder="Strategy for tomorrow..." value={localEntry.tomorrowsPlan} onChange={val => setLocalEntry({...localEntry, tomorrowsPlan: val})} />
                </div>
              </CardContent>
              <CardFooter className="bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-3 py-3 px-6 border-t mt-4">
                <Quote className="w-3 h-3" />
                <span>Memoir is secured locally with AES-GCM 256.</span>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 h-full">
            <Card className="shadow-lg rounded-2xl border-none ring-1 ring-border h-full flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-4 px-6">
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <History className="w-4 h-4 text-primary" />
                  Chronicle
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight">Revisit past reflections</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-[400px]">
                <ScrollArea className="h-full max-h-[600px]">
                  <div className="p-4 space-y-3">
                    {sortedEntries.length > 0 ? sortedEntries.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedHistoryEntry(item)}
                        className={cn(
                          "group cursor-pointer p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md",
                          item.date === todayStr ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-card hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-black">
                              {format(parseISO(item.date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <span className="text-xl">{item.mood || '😊'}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed italic">
                          {item.whatIDidToday || "E2EE Secured Memoir"}
                        </p>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 grayscale space-y-2">
                        <BookText className="w-8 h-8" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No reflections active</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => !open && setSelectedHistoryEntry(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="h-20 bg-primary flex items-end px-8 relative">
            <div className="absolute -bottom-8 left-8 p-1.5 bg-background rounded-2xl shadow-xl border-4 border-background">
               <span className="text-4xl">{selectedHistoryEntry?.mood}</span>
            </div>
          </div>
          
          <div className="p-8 pt-10 space-y-6">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tighter">
                {selectedHistoryEntry && format(parseISO(selectedHistoryEntry.date), 'EEEE, MMM do yyyy')}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                End-to-End Encrypted Memoir
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <DetailSection label="What I Did" value={selectedHistoryEntry?.whatIDidToday} icon={<CheckCircle2 className="h-3 w-3" />} color="bg-green-50/50 border-green-100 text-green-700" />
              <DetailSection label="Key Learnings" value={selectedHistoryEntry?.whatILearned} icon={<Lightbulb className="h-3 w-3" />} color="bg-blue-50/50 border-blue-100 text-blue-700" />
              <DetailSection label="Challenges" value={selectedHistoryEntry?.challengesBlockers} icon={<AlertTriangle className="h-3 w-3" />} color="bg-red-50/50 border-red-100 text-red-700" />
              <DetailSection label="Tomorrow's Targets" value={selectedHistoryEntry?.tomorrowsPlan} icon={<Target className="h-3 w-3" />} color="bg-purple-50/50 border-purple-100 text-purple-700" />
            </div>
          </div>
          
          <div className="p-4 bg-muted/20 border-t flex justify-end">
            <Button onClick={() => setSelectedHistoryEntry(null)} variant="outline" className="font-black h-9 rounded-xl text-[10px] uppercase">Close Memoir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function DiaryInput({ label, icon, placeholder, value, onChange }: any) {
  return (
    <div className="space-y-2 group">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors">
        {icon} {label}
      </Label>
      <Textarea 
        placeholder={placeholder} 
        className="min-h-[100px] text-sm resize-none rounded-2xl border-primary/10 focus:ring-2 focus:ring-primary/20 transition-all bg-muted/10 p-4" 
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function DetailSection({ label, value, icon, color }: any) {
  return (
    <div className={cn("p-4 rounded-2xl border space-y-2", color)}>
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-80">
        {icon} {label}
      </div>
      <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{value || 'No content provided'}</p>
    </div>
  );
}
