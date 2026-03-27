
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Users, Plus, Trash2, IndianRupee, Loader2, UserCircle, History, Calculator, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SplitPayPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [peopleString, setPeopleString] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedSplits, setDecryptedSplits] = useState<any[]>([]);

  const splitsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'splitExpenses');
  }, [db, user]);

  const { data: rawSplits, isLoading: isRawLoading } = useCollection(splitsRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!rawSplits || !user) {
        setDecryptedSplits(rawSplits || []);
        return;
      }
      setIsDecrypting(true);
      const decrypted = await Promise.all(rawSplits.map(async (split) => {
        const desc = split.isEncrypted ? await decryptData(split.description, user.uid) : split.description;
        const amt = split.isEncrypted ? await decryptNumber(split.totalAmount, user.uid) : parseFloat(split.totalAmount || '0');
        const pList = split.isEncrypted ? await decryptData(split.participants, user.uid) : split.participants;
        
        const participants = pList.split(',').map((p: string) => p.trim()).filter(Boolean);
        const sharePerPerson = participants.length > 0 ? amt / participants.length : 0;

        return {
          ...split,
          description: desc,
          totalAmount: amt,
          participants,
          sharePerPerson
        };
      }));
      setDecryptedSplits(decrypted);
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawSplits, user]);

  const handleAddSplit = async () => {
    if (!description || !totalAmount || !peopleString || !user || !splitsRef) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill all fields.' });
      return;
    }

    setIsSubmitting(true);
    const participants = peopleString.split(',').map(p => p.trim()).filter(Boolean).join(',');

    try {
      await addDocumentNonBlocking(splitsRef, {
        userId: user.uid,
        description: await encryptData(description, user.uid),
        totalAmount: await encryptData(totalAmount, user.uid),
        participants: await encryptData(participants, user.uid),
        isEncrypted: true,
        createdAt: new Date().toISOString()
      });

      setDescription('');
      setTotalAmount('');
      setPeopleString('');
      toast({ title: 'Split Recorded', description: 'Encrypted and stored in your vault.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save split.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = useMemo(() => {
    const totalSplitted = decryptedSplits.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const personShares: Record<string, number> = {};

    decryptedSplits.forEach(split => {
      split.participants.forEach((p: string) => {
        personShares[p] = (personShares[p] || 0) + (split.sharePerPerson || 0);
      });
    });

    return { totalSplitted, personShares };
  }, [decryptedSplits]);

  if (isRawLoading || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Shared Vault...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-12 max-w-7xl mx-auto">
        {/* Left Column: Form and Summary */}
        <div className="lg:col-span-5 space-y-4 md:space-y-6">
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 px-5 md:px-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">New Shared Bill</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold">Automated equal splitting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 px-5 md:px-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Bill Description</Label>
                <Input 
                  placeholder="e.g. Dinner at Bistro" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Bill (₹)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="rounded-xl h-11 pl-9 font-black"
                  />
                  <IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Participants (Comma separated)</Label>
                <Input 
                  placeholder="Alice, Bob, Charlie" 
                  value={peopleString}
                  onChange={(e) => setPeopleString(e.target.value)}
                  className="rounded-xl h-11"
                />
                <p className="text-[9px] text-muted-foreground italic">You will be automatically included in the calculation.</p>
              </div>
              <Button 
                onClick={handleAddSplit} 
                disabled={isSubmitting} 
                className="w-full h-12 rounded-xl font-black shadow-lg gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Secure & Split Record
              </Button>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-3 px-5 text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> E2EE Automated Split
            </CardFooter>
          </Card>

          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border bg-card">
            <CardHeader className="pb-2 px-5 md:px-6">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Share of Every Person
              </CardTitle>
              <CardDescription className="text-[9px] uppercase font-bold">Aggregated receivables</CardDescription>
            </CardHeader>
            <CardContent className="px-5 md:px-6 pb-6">
              <div className="bg-primary/5 rounded-2xl p-4 mb-4 border border-primary/10">
                <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Total Splitted so far</span>
                <span className="text-2xl font-black tracking-tighter">₹{totals.totalSplitted.toLocaleString()}</span>
              </div>
              <div className="space-y-3">
                {Object.keys(totals.personShares).length > 0 ? (
                  Object.entries(totals.personShares).sort((a, b) => b[1] - a[1]).map(([name, share]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-xl border bg-muted/5 group hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black truncate max-w-[120px]">{name}</span>
                      </div>
                      <span className="text-sm font-black text-primary tracking-tight">₹{Math.round(share).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-muted-foreground italic text-xs">No shares recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-7">
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border h-full flex flex-col overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Split History
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight">Recent shared expenses</CardDescription>
              </div>
              <Badge variant="outline" className="font-black text-[9px] uppercase px-3 py-1 rounded-full">{decryptedSplits.length} Records</Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[400px] lg:h-[600px]">
                <div className="divide-y">
                  {decryptedSplits.length > 0 ? (
                    [...decryptedSplits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((split) => (
                      <div key={split.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h4 className="font-black text-sm md:text-base tracking-tight">{split.description}</h4>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(split.createdAt).toLocaleDateString()} • ₹{split.totalAmount.toLocaleString()} Total</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteDocumentNonBlocking(doc(splitsRef!, split.id))}
                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {split.participants.map((p: string) => (
                            <div key={p} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                              <span className="text-[9px] font-black uppercase text-primary">{p}</span>
                              <Separator orientation="vertical" className="h-2.5 bg-primary/30" />
                              <span className="text-[10px] font-bold">₹{Math.round(split.sharePerPerson).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale">
                      <Users className="h-12 w-12 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No shared history</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
