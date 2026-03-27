
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Users, Plus, Trash2, IndianRupee, Loader2, UserCircle, History, Calculator, ShieldCheck, DoorOpen, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function SplitPayPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // State for split expense
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [peopleString, setPeopleString] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('adhoc');
  
  // State for room creation
  const [roomName, setRoomName] = useState('');
  const [roomMembers, setRoomMembers] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  
  const [decryptedSplits, setDecryptedSplits] = useState<any[]>([]);
  const [decryptedRooms, setDecryptedRooms] = useState<any[]>([]);

  const splitsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'splitExpenses');
  }, [db, user]);

  const roomsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'splitRooms');
  }, [db, user]);

  const { data: rawSplits, isLoading: isRawLoading } = useCollection(splitsRef);
  const { data: rawRooms, isLoading: isRoomsLoading } = useCollection(roomsRef);

  // Decrypt Rooms
  useEffect(() => {
    const decryptAllRooms = async () => {
      if (!rawRooms || !user) {
        setDecryptedRooms(rawRooms || []);
        return;
      }
      setIsDecrypting(true);
      const decrypted = await Promise.all(rawRooms.map(async (room) => ({
        ...room,
        name: room.isEncrypted ? await decryptData(room.name, user.uid) : room.name,
        participants: room.isEncrypted ? await decryptData(room.participants, user.uid) : room.participants,
      })));
      setDecryptedRooms(decrypted);
      setIsDecrypting(false);
    };
    decryptAllRooms();
  }, [rawRooms, user]);

  // Decrypt Splits
  useEffect(() => {
    const decryptAllSplits = async () => {
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
        
        // Exact Split Logic
        const count = participants.length;
        const individualShares: number[] = [];
        if (count > 0) {
          const baseShare = Math.floor((amt / count) * 100) / 100;
          let remainder = Math.round((amt - (baseShare * count)) * 100) / 100;
          
          for (let i = 0; i < count; i++) {
            let s = baseShare;
            if (remainder > 0) {
              s = Math.round((s + 0.01) * 100) / 100;
              remainder = Math.round((remainder - 0.01) * 100) / 100;
            }
            individualShares.push(s);
          }
        }

        return {
          ...split,
          description: desc,
          totalAmount: amt,
          participants,
          individualShares
        };
      }));
      setDecryptedSplits(decrypted);
      setIsDecrypting(false);
    };
    decryptAllSplits();
  }, [rawSplits, user]);

  const handleAddRoom = async () => {
    if (!roomName || !roomMembers || !user || !roomsRef) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill all fields for the room.' });
      return;
    }
    const members = roomMembers.split(',').map(m => m.trim()).filter(Boolean).join(',');
    addDocumentNonBlocking(roomsRef, {
      userId: user.uid,
      name: await encryptData(roomName, user.uid),
      participants: await encryptData(members, user.uid),
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    setRoomName('');
    setRoomMembers('');
    toast({ title: 'Room Created', description: 'Your secure group is ready.' });
  };

  const handleAddSplit = async () => {
    if (!description || !totalAmount || !user || !splitsRef) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill bill details.' });
      return;
    }

    let finalParticipants = '';
    if (selectedRoomId === 'adhoc') {
      if (!peopleString) {
        toast({ variant: 'destructive', title: 'Missing Members', description: 'Please enter names for ad-hoc split.' });
        return;
      }
      finalParticipants = peopleString.split(',').map(p => p.trim()).filter(Boolean).join(',');
    } else {
      const room = decryptedRooms.find(r => r.id === selectedRoomId);
      if (!room) return;
      finalParticipants = room.participants;
    }

    setIsSubmitting(true);
    try {
      addDocumentNonBlocking(splitsRef, {
        userId: user.uid,
        roomId: selectedRoomId === 'adhoc' ? null : selectedRoomId,
        description: await encryptData(description, user.uid),
        totalAmount: await encryptData(totalAmount, user.uid),
        participants: await encryptData(finalParticipants, user.uid),
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
      split.participants.forEach((name: string, index: number) => {
        const share = split.individualShares[index] || 0;
        personShares[name] = (personShares[name] || 0) + share;
      });
    });

    return { totalSplitted, personShares };
  }, [decryptedSplits]);

  if (isRawLoading || isRoomsLoading || isDecrypting) {
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
        <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">
          {/* Room Creation Card */}
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 px-5 md:px-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-xl text-secondary-foreground">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black tracking-tight">Room Vault</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold">Manage persistent groups</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 px-5 md:px-6">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Room Name</Label>
                <Input placeholder="e.g. Goa Trip" value={roomName} onChange={e => setRoomName(e.target.value)} className="h-9 text-xs rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Members (Comma separated)</Label>
                <Input placeholder="Alice, Bob..." value={roomMembers} onChange={e => setRoomMembers(e.target.value)} className="h-9 text-xs rounded-lg" />
              </div>
              <Button onClick={handleAddRoom} className="w-full h-9 rounded-lg font-black text-[10px] uppercase tracking-wider" variant="secondary">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Secure Room
              </Button>
              
              <Separator className="my-2" />
              
              <ScrollArea className="h-[120px] pr-2">
                <div className="space-y-2">
                  {decryptedRooms.map(room => (
                    <div key={room.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border group">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black truncate">{room.name}</p>
                        <p className="text-[8px] text-muted-foreground truncate">{room.participants}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(roomsRef!, room.id))} className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {decryptedRooms.length === 0 && <p className="text-[9px] text-center italic text-muted-foreground py-4">No rooms defined.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Aggregated Shares Card */}
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border bg-card">
            <CardHeader className="pb-2 px-5 md:px-6">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Global Ledger
              </CardTitle>
              <CardDescription className="text-[9px] uppercase font-bold">Total receivables</CardDescription>
            </CardHeader>
            <CardContent className="px-5 md:px-6 pb-6 space-y-4">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Total Splitted</span>
                <span className="text-2xl font-black tracking-tighter">₹{totals.totalSplitted.toLocaleString()}</span>
              </div>
              <ScrollArea className="h-[200px] pr-2">
                <div className="space-y-2">
                  {Object.entries(totals.personShares).length > 0 ? (
                    Object.entries(totals.personShares).sort((a, b) => b[1] - a[1]).map(([name, share]) => (
                      <div key={name} className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/5">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] font-black truncate max-w-[100px]">{name}</span>
                        </div>
                        <span className="text-xs font-black text-primary">₹{share.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-muted-foreground italic text-[10px]">No shares recorded yet.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4 md:gap-6">
          {/* New Split Form */}
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black tracking-tight">Post New Bill</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold">Automated exact splitting</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Mode</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="w-[140px] h-8 text-[10px] rounded-full font-black uppercase tracking-tighter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adhoc">Ad-hoc Names</SelectItem>
                    {decryptedRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid gap-4 md:grid-cols-2 px-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Bill Description</Label>
                  <Input placeholder="e.g. Dinner at Bistro" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Bill (₹)</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0.00" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="rounded-xl h-10 pl-9 font-black" />
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    {selectedRoomId === 'adhoc' ? 'Participants (Comma separated)' : 'Room Participants'}
                  </Label>
                  {selectedRoomId === 'adhoc' ? (
                    <Input placeholder="Alice, Bob, Charlie" value={peopleString} onChange={e => setPeopleString(e.target.value)} className="rounded-xl h-10 text-sm" />
                  ) : (
                    <div className="p-3 bg-muted/20 rounded-xl border border-dashed flex items-center gap-2 flex-wrap min-h-[40px]">
                      {decryptedRooms.find(r => r.id === selectedRoomId)?.participants.split(',').map((p: string) => (
                        <Badge key={p} variant="outline" className="text-[9px] font-black px-2 py-0.5 rounded-full">{p.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleAddSplit} disabled={isSubmitting} className="w-full h-10 rounded-xl font-black shadow-lg gap-2 mt-auto">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm & Encrypt Split
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-2.5 px-6 text-[9px] font-black uppercase text-primary tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="h-3 w-3" /> E2EE Mathematical Precision Guaranteed
            </CardFooter>
          </Card>

          {/* Split History Card */}
          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border h-full flex flex-col overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Chronicle
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Recent shared expenses</CardDescription>
              </div>
              <Badge variant="outline" className="font-black text-[9px] uppercase px-3 py-1 rounded-full">{decryptedSplits.length} Records</Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[300px] lg:h-[400px]">
                <div className="divide-y">
                  {decryptedSplits.length > 0 ? (
                    [...decryptedSplits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((split) => (
                      <div key={split.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h4 className="font-black text-sm md:text-base tracking-tight">{split.description}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(split.createdAt).toLocaleDateString()} • ₹{split.totalAmount.toLocaleString()} Total</p>
                              {split.roomId && (
                                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase">
                                  {decryptedRooms.find(r => r.id === split.roomId)?.name || 'Room'}
                                </Badge>
                              )}
                            </div>
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
                          {split.participants.map((p: string, idx: number) => (
                            <div key={p} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                              <span className="text-[9px] font-black uppercase text-primary">{p}</span>
                              <Separator orientation="vertical" className="h-2.5 bg-primary/30" />
                              <span className="text-[10px] font-bold">₹{split.individualShares[idx]?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 opacity-40 grayscale">
                      <Users className="h-10 w-10 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No history recorded</p>
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
