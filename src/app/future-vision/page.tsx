
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useUser, 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { 
  Mountain, 
  Plus, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Map, 
  Briefcase, 
  Heart, 
  Coins, 
  Sparkles,
  Calendar,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { encryptData, decryptData } from '@/lib/encryption';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'Travel', icon: Map, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'Career', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'Financial', icon: Coins, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'Health', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'Personal', icon: Sparkles, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'Other', icon: Mountain, color: 'text-slate-500', bg: 'bg-slate-50' }
];

export default function FutureVisionPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [targetYear, setTargetYear] = useState('');

  const [decryptedVision, setDecryptedVision] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visionRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'visionBoard');
  }, [db, user]);

  const { data: rawVision } = useCollection(visionRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!rawVision || !user || !mounted) {
        setDecryptedVision(rawVision || []);
        return;
      }
      setIsDecrypting(true);
      const decrypted = await Promise.all(rawVision.map(async v => ({
        ...v,
        title: v.isEncrypted ? await decryptData(v.title, user.uid) : (v.title || ''),
        description: v.isEncrypted ? await decryptData(v.description, user.uid) : (v.description || ''),
        targetYear: v.isEncrypted ? await decryptData(v.targetYear, user.uid) : (v.targetYear || '')
      })));
      setDecryptedVision(decrypted);
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawVision, user, mounted]);

  const addVisionItem = async () => {
    if (!title.trim() || !user || !visionRef) return;
    setLoading(true);

    const newItem = {
      userId: user.uid,
      title: await encryptData(title.trim(), user.uid),
      description: await encryptData(description.trim(), user.uid),
      category,
      targetYear: await encryptData(targetYear.trim(), user.uid),
      isAchieved: false,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(visionRef, newItem);
    
    setTitle('');
    setDescription('');
    setTargetYear('');
    setLoading(false);
    toast({ title: "Vision Seeded", description: "Your aspiration is secured in the vault." });
  };

  const toggleAchieved = (id: string, current: boolean) => {
    if (!visionRef) return;
    updateDocumentNonBlocking(doc(visionRef, id), { 
      isAchieved: !current,
      updatedAt: new Date().toISOString()
    });
    toast({ 
      title: !current ? "Achievement Unlocked!" : "Status Updated", 
      description: !current ? "Congratulations on reaching your goal!" : "Item returned to active vision." 
    });
  };

  const deleteItem = (id: string) => {
    if (!visionRef) return;
    deleteDocumentNonBlocking(doc(visionRef, id));
    toast({ title: "Vision Removed" });
  };

  const activeVision = decryptedVision.filter(v => !v.isAchieved);
  const achievedVision = decryptedVision.filter(v => v.isAchieved);

  return (
    <AppShell>
      {!mounted ? (
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Future Vision...</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/10">
                <Mountain className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Future Vision</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">End-to-end encrypted bucket list & aspirations</p>
              </div>
            </div>
            <div className="bg-primary text-primary-foreground px-6 py-2 rounded-2xl shadow-lg flex items-center gap-2">
              <Trophy className="h-4 w-4 fill-current" />
              <span className="font-black text-sm uppercase tracking-widest">{achievedVision.length} Achieved</span>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-6">
              <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Seed a New Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 px-4 md:px-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What do you want to achieve?</Label>
                    <Input 
                      placeholder="e.g. Visit Kyoto, Own a house, Run a marathon..." 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="h-12 rounded-2xl font-bold text-lg border-primary/10 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details (Private)</Label>
                    <Input 
                      placeholder="Additional context or 'Why'..." 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Year</Label>
                      <Input 
                        placeholder="e.g. 2026" 
                        value={targetYear} 
                        onChange={e => setTargetYear(e.target.value)} 
                        className="h-11 rounded-xl font-black"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={addVisionItem} 
                    disabled={loading || !title.trim()}
                    className="w-full h-14 rounded-2xl font-black shadow-lg gap-2 text-base"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    Lock Into Vision Board
                  </Button>
                </CardContent>
                <CardFooter className="bg-primary/5 py-3 flex items-center justify-center gap-2 border-t">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Private AES-GCM Encryption Active</span>
                </CardFooter>
              </Card>

              <Card className="rounded-3xl border-dashed border-2 bg-muted/5 opacity-60 overflow-hidden">
                <CardContent className="p-8 text-center space-y-4">
                  <Mountain className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-black text-sm uppercase">Long-Term Thinking</h4>
                    <p className="text-[10px] text-muted-foreground font-medium px-4">
                      Visible goals are achieved 42% more often. Your private vision board serves as a mental anchor for your daily decisions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7">
              {isDecrypting ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Decrypting Dreams...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 px-2">
                      <Circle className="h-3 w-3 text-primary" />
                      Active Vision
                    </h3>
                    <div className="grid gap-4">
                      {activeVision.length === 0 ? (
                        <div className="p-12 border-2 border-dashed rounded-3xl text-center space-y-3 opacity-40 grayscale">
                          <Map className="h-10 w-10 mx-auto" />
                          <p className="text-xs font-black uppercase tracking-widest">No active visions seeded</p>
                        </div>
                      ) : (
                        activeVision.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(item => (
                          <VisionCard key={item.id} item={item} onToggle={() => toggleAchieved(item.id, item.isAchieved)} onDelete={() => deleteItem(item.id)} />
                        ))
                      )}
                    </div>
                  </div>

                  {achievedVision.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 px-2 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Achievement Chronicle
                      </h3>
                      <div className="grid gap-4">
                        {achievedVision.sort((a,b) => b.updatedAt?.localeCompare(a.updatedAt)).map(item => (
                          <VisionCard key={item.id} item={item} onToggle={() => toggleAchieved(item.id, item.isAchieved)} onDelete={() => deleteItem(item.id)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function VisionCard({ item, onToggle, onDelete }: { item: any, onToggle: () => void, onDelete: () => void }) {
  const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[5];
  const Icon = cat.icon;

  return (
    <Card className={cn(
      "shadow-md rounded-3xl border-none ring-1 transition-all duration-300 relative overflow-hidden group",
      item.isAchieved ? "ring-green-500/20 bg-green-50/20 opacity-70" : "ring-border bg-card hover:ring-primary/40 hover:shadow-lg"
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", item.isAchieved ? "bg-green-500" : cat.color.replace('text-', 'bg-'))} />
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <button 
            onClick={onToggle}
            className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center transition-all",
              item.isAchieved ? "bg-green-500 text-white shadow-lg" : "bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            {item.isAchieved ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
          </button>
          <div className="min-w-0">
            <h4 className={cn("font-black text-lg tracking-tight truncate", item.isAchieved && "line-through text-muted-foreground opacity-60")}>
              {item.title}
            </h4>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border", item.isAchieved ? "bg-green-100 text-green-700 border-green-200" : `${cat.bg} ${cat.color} border-current/20`)}>
                <Icon className="h-2.5 w-2.5" /> {item.category}
              </span>
              {item.targetYear && (
                <span className="text-[8px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> Target {item.targetYear}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1 italic font-medium leading-relaxed">
                "{item.description}"
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-4 w-4" />
          </Button>
          {!item.isAchieved && (
            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
