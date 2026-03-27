
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Trash2, 
  IndianRupee, 
  Loader2, 
  UserCircle, 
  History, 
  Calculator, 
  DoorOpen, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft,
  Check,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

type SplitType = 'equal' | 'custom' | 'percentage';

export default function SplitPayPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Decrypted State
  const [decryptedGroups, setDecryptedGroups] = useState<any[]>([]);
  const [decryptedExpenses, setDecryptedExpenses] = useState<any[]>([]);
  const [decryptedSettlements, setDecryptedSettlements] = useState<any[]>([]);

  // Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const groupsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'splitGroups');
  }, [db, user]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'splitExpenses');
  }, [db, user]);

  const settlementsRef = useMemoFirebase(() => {
    if (!db || !user || !selectedGroupId) return null;
    return collection(db, 'users', user.uid, 'splitGroups', selectedGroupId, 'settlements');
  }, [db, user, selectedGroupId]);

  const { data: rawGroups, isLoading: isGroupsLoading } = useCollection(groupsRef);
  const { data: rawExpenses, isLoading: isExpensesLoading } = useCollection(expensesRef);
  const { data: rawSettlements } = useCollection(settlementsRef);

  const activeGroup = useMemo(() => 
    decryptedGroups.find(g => g.id === selectedGroupId), 
  [decryptedGroups, selectedGroupId]);

  // Sync participants when group changes
  useEffect(() => {
    if (activeGroup) {
      setSelectedParticipants(activeGroup.members);
    }
  }, [activeGroup]);

  // Decrypt Data
  useEffect(() => {
    const decryptAll = async () => {
      if (!user) return;
      setIsDecrypting(true);

      try {
        if (rawGroups) {
          const decoded = await Promise.all(rawGroups.map(async g => ({
            ...g,
            name: g.isEncrypted ? await decryptData(g.name, user.uid) : g.name,
            members: (g.isEncrypted ? await decryptData(g.members, user.uid) : g.members).split(',').map((m: string) => m.trim()).filter(Boolean)
          })));
          setDecryptedGroups(decoded);
        }

        if (rawExpenses) {
          const decoded = await Promise.all(rawExpenses.map(async e => {
            const splitsStr = e.isEncrypted ? await decryptData(e.splitsJson, user.uid) : (e.splitsJson || '{}');
            let parsedSplits = {};
            try {
              parsedSplits = JSON.parse(splitsStr || '{}');
            } catch (err) {
              parsedSplits = {};
            }
            return {
              ...e,
              description: e.isEncrypted ? await decryptData(e.description, user.uid) : e.description,
              amount: e.isEncrypted ? await decryptNumber(e.amount, user.uid) : parseFloat(e.amount),
              paidBy: e.isEncrypted ? await decryptData(e.paidBy, user.uid) : e.paidBy,
              splits: parsedSplits
            };
          }));
          setDecryptedExpenses(decoded);
        }

        if (rawSettlements) {
          const decoded = await Promise.all(rawSettlements.map(async s => ({
            ...s,
            from: s.isEncrypted ? await decryptData(s.from, user.uid) : s.from,
            to: s.isEncrypted ? await decryptData(s.to, user.uid) : s.to,
            amount: s.isEncrypted ? await decryptNumber(s.amount, user.uid) : parseFloat(s.amount),
          })));
          setDecryptedSettlements(decoded);
        }
      } catch (err) {
        console.error("Decryption error:", err);
      } finally {
        setIsDecrypting(false);
      }
    };
    decryptAll();
  }, [rawGroups, rawExpenses, rawSettlements, user]);

  // Group Calculations
  const groupStats = useMemo(() => {
    if (!activeGroup) return null;
    
    const relevantExpenses = decryptedExpenses.filter(e => e.groupId === activeGroup.id);
    const relevantSettlements = decryptedSettlements.filter(s => s.groupId === activeGroup.id);
    
    const totalSpent = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
    const paidMap: Record<string, number> = {};
    const shareMap: Record<string, number> = {};
    const settlementMap: Record<string, number> = {};
    
    // Initialize for all team members
    activeGroup.members.forEach((m: string) => {
      paidMap[m] = 0;
      shareMap[m] = 0;
      settlementMap[m] = 0;
    });

    relevantExpenses.forEach(exp => {
      paidMap[exp.paidBy] = (paidMap[exp.paidBy] || 0) + exp.amount;
      Object.entries(exp.splits).forEach(([name, share]) => {
        shareMap[name] = (shareMap[name] || 0) + (share as number);
      });
    });

    relevantSettlements.forEach(s => {
      settlementMap[s.from] = (settlementMap[s.from] || 0) + s.amount;
      settlementMap[s.to] = (settlementMap[s.to] || 0) - s.amount;
    });

    const balances = activeGroup.members.map((name: string) => {
      const net = (paidMap[name] + settlementMap[name]) - shareMap[name];
      return { name, paid: paidMap[name], share: shareMap[name], net };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return { totalSpent, balances };
  }, [activeGroup, decryptedExpenses, decryptedSettlements]);

  // Live Split Breakdown
  const previewSplits = useMemo(() => {
    if (!expenseAmt || !activeGroup || selectedParticipants.length === 0) return {};
    const amt = parseFloat(expenseAmt) || 0;
    let splits: Record<string, number> = {};

    if (splitType === 'equal') {
      const count = selectedParticipants.length;
      const base = Math.floor((amt / count) * 100) / 100;
      let remainder = Math.round((amt - (base * count)) * 100) / 100;
      selectedParticipants.forEach((name: string) => {
        let s = base;
        if (remainder > 0) {
          s = Math.round((s + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        splits[name] = s;
      });
    } else if (splitType === 'custom') {
      selectedParticipants.forEach(m => splits[m] = parseFloat(customSplits[m]) || 0);
    } else if (splitType === 'percentage') {
      selectedParticipants.forEach(m => splits[m] = (amt * (parseFloat(customSplits[m]) || 0)) / 100);
    }
    return splits;
  }, [expenseAmt, splitType, selectedParticipants, customSplits, activeGroup]);

  // Form Handlers
  const handleCreateGroup = async () => {
    if (!newGroupName || !newGroupMembers || !user || !groupsRef) return;
    setIsSubmitting(true);
    addDocumentNonBlocking(groupsRef, {
      userId: user.uid,
      name: await encryptData(newGroupName, user.uid),
      members: await encryptData(newGroupMembers, user.uid),
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    setNewGroupName('');
    setNewGroupMembers('');
    setIsSubmitting(false);
    toast({ title: "Group Created", description: "Your encrypted circle is ready." });
  };

  const toggleParticipant = (member: string) => {
    setSelectedParticipants(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member) 
        : [...prev, member]
    );
  };

  const handleAddExpense = async () => {
    if (!expenseAmt || !expenseDesc || !paidBy || !activeGroup || !user || !expensesRef) return;
    if (selectedParticipants.length === 0) {
      toast({ variant: 'destructive', title: "No participants", description: "Select at least one member to split with." });
      return;
    }
    
    const amt = parseFloat(expenseAmt);
    const finalSplits: Record<string, number> = {};
    
    // Ensure all group members exist in the splits map (even if 0)
    activeGroup.members.forEach((m: string) => finalSplits[m] = previewSplits[m] || 0);

    if (splitType === 'custom') {
      const totalCustom = Object.values(previewSplits).reduce((s, v) => s + v, 0);
      if (Math.abs(totalCustom - amt) > 0.01) {
        toast({ variant: 'destructive', title: "Math Error", description: `Custom splits must total ₹${amt}. Current: ₹${totalCustom.toFixed(2)}` });
        return;
      }
    } else if (splitType === 'percentage') {
      const totalP = Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(totalP - 100) > 0.1) {
        toast({ variant: 'destructive', title: "Math Error", description: "Percentages must total 100%." });
        return;
      }
    }

    setIsSubmitting(true);
    addDocumentNonBlocking(expensesRef, {
      userId: user.uid,
      groupId: activeGroup.id,
      description: await encryptData(expenseDesc, user.uid),
      amount: await encryptData(expenseAmt, user.uid),
      paidBy: await encryptData(paidBy, user.uid),
      splitType,
      splitsJson: await encryptData(JSON.stringify(finalSplits), user.uid),
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    
    setExpenseAmt('');
    setExpenseDesc('');
    setPaidBy('');
    setCustomSplits({});
    setSelectedParticipants(activeGroup.members);
    setIsSubmitting(false);
    toast({ title: "Expense Added", description: "Successfully split and encrypted." });
  };

  const handleSettle = async (from: string, to: string, amount: number) => {
    if (!user || !settlementsRef || !selectedGroupId) return;
    setIsSubmitting(true);
    addDocumentNonBlocking(settlementsRef, {
      userId: user.uid,
      groupId: selectedGroupId,
      from: await encryptData(from, user.uid),
      to: await encryptData(to, user.uid),
      amount: await encryptData(amount.toString(), user.uid),
      isEncrypted: true,
      createdAt: new Date().toISOString()
    });
    setIsSubmitting(false);
    toast({ title: "Settlement Logged", description: `Recalculated balances.` });
  };

  if (isGroupsLoading || isExpensesLoading || isDecrypting) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unlocking Vaults...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!selectedGroupId ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-sm border border-primary/10">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter">Split Pay</h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Group Expense Manager (E2EE)</p>
            </div>
          </div>

          <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 px-6">
              <CardTitle className="text-base font-black flex items-center gap-2"><DoorOpen className="h-4 w-4" /> Create Group</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Group Name</Label>
                  <Input placeholder="e.g. Roommates" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Members (Comma separated)</Label>
                  <Input placeholder="Alice, Bob, Charlie" value={newGroupMembers} onChange={e => setNewGroupMembers(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreateGroup} disabled={isSubmitting} className="w-full h-11 font-black rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Initialize Group
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decryptedGroups.map(group => (
              <Card 
                key={group.id} 
                className="group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all rounded-2xl border-none ring-1 ring-border"
                onClick={() => setSelectedGroupId(group.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black tracking-tight flex items-center justify-between">
                    {group.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold">{group.members.length} Members</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1">
                    {group.members.map((m: string) => (
                      <Badge key={m} variant="secondary" className="text-[8px] font-black px-1.5 h-4">{m}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setSelectedGroupId(null)} className="h-8 px-2 text-[10px] font-black uppercase tracking-widest gap-2">
            <ArrowLeft className="h-3 w-3" /> Back to Groups
          </Button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/20 rounded-2xl text-secondary-foreground">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter">{activeGroup?.name}</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Shared Ledger</p>
              </div>
            </div>
            <div 
              onClick={() => setShowBreakdown(true)}
              className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 text-center md:text-left cursor-pointer hover:bg-primary/10 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="h-3 w-3 text-primary/40" />
              </div>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Total Spent</p>
              <p className="text-2xl font-black text-primary">₹{groupStats?.totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted rounded-2xl mb-4">
              <TabsTrigger value="add" className="rounded-xl font-black text-xs">Add Bill</TabsTrigger>
              <TabsTrigger value="balance" className="rounded-xl font-black text-xs">Balances</TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl font-black text-xs">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupStats?.balances.map(b => (
                  <Card key={b.name} className={cn(
                    "rounded-2xl border-none ring-1 shadow-sm",
                    b.net > 0 ? "ring-green-500/30 bg-green-50/10" : b.net < 0 ? "ring-red-500/30 bg-red-50/10" : "ring-border"
                  )}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black flex items-center gap-2">
                        <UserCircle className="h-4 w-4 opacity-70" /> {b.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                        <span>Paid: ₹{b.paid.toLocaleString()}</span>
                        <span>Share: ₹{b.share.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status</p>
                        <p className={cn("text-xl font-black tracking-tighter", b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-600" : "text-muted-foreground")}>
                          {b.net > 0 ? `Owed ₹${b.net.toFixed(2)}` : b.net < 0 ? `Owes ₹${Math.abs(b.net).toFixed(2)}` : 'Settle'}
                        </p>
                      </div>
                    </CardContent>
                    {b.net < 0 && (
                      <CardFooter className="pt-0">
                        <Select onValueChange={(to) => handleSettle(b.name, to, Math.abs(b.net))}>
                          <SelectTrigger className="h-8 text-[10px] font-black uppercase rounded-lg">
                            <SelectValue placeholder="Settle with..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeGroup.members.filter((m: string) => m !== b.name).map((m: string) => (
                              <SelectItem key={m} value={m} className="text-[10px] font-black">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history" className="animate-in fade-in slide-in-from-right-2">
              <Card className="rounded-2xl border-none ring-1 ring-border overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {decryptedExpenses.filter(e => e.groupId === selectedGroupId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(exp => (
                      <div key={exp.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h4 className="font-black text-sm md:text-base tracking-tight">{exp.description}</h4>
                            <p className="text-[10px] text-muted-foreground font-black uppercase">{exp.paidBy} paid ₹{exp.amount}</p>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-black uppercase">{exp.splitType}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(exp.splits).map(([name, share]: any) => share > 0 ? (
                            <div key={name} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                              <span className="text-[9px] font-black uppercase text-primary">{name}</span>
                              <Separator orientation="vertical" className="h-2.5 bg-primary/30" />
                              <span className="text-[10px] font-bold">₹{share.toFixed(2)}</span>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ))}
                    {decryptedExpenses.filter(e => e.groupId === selectedGroupId).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale">
                        <History className="h-10 w-10 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No activity found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="animate-in fade-in slide-in-from-left-2">
              <Card className="shadow-xl rounded-2xl border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b pb-4 px-6">
                  <CardTitle className="text-base font-black flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Post Expense</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 px-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Bill Description</Label>
                        <Input placeholder="Dinner, Movie, Uber..." value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Amount (₹)</Label>
                        <div className="relative">
                          <Input type="number" placeholder="0.00" value={expenseAmt} onChange={e => setExpenseAmt(e.target.value)} className="h-10 pl-9 rounded-xl font-black" />
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Paid By</Label>
                        <Select value={paidBy} onValueChange={setPaidBy}>
                          <SelectTrigger className="h-10 rounded-xl font-black">
                            <SelectValue placeholder="Select Payer" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeGroup?.members.map((m: string) => (
                              <SelectItem key={m} value={m} className="font-black">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Split Among</Label>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-2xl border border-dashed">
                          {activeGroup?.members.map((m: string) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => toggleParticipant(m)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border",
                                selectedParticipants.includes(m) 
                                  ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                  : "bg-background text-muted-foreground border-border opacity-60"
                              )}
                            >
                              {selectedParticipants.includes(m) && <Check className="h-3 w-3" />}
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Split Type</Label>
                        <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="w-full">
                          <TabsList className="grid w-full grid-cols-3 h-9 p-1 rounded-xl">
                            <TabsTrigger value="equal" className="text-[9px] font-black uppercase">Equal</TabsTrigger>
                            <TabsTrigger value="custom" className="text-[9px] font-black uppercase">Custom</TabsTrigger>
                            <TabsTrigger value="percentage" className="text-[9px] font-black uppercase">%</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {splitType !== 'equal' && (
                        <div className="space-y-3 p-4 bg-muted/20 rounded-2xl border border-dashed">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center mb-2">Adjust Portion</p>
                          {selectedParticipants.map((m: string) => (
                            <div key={m} className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black uppercase truncate">{m}</span>
                              <div className="relative w-24">
                                <Input 
                                  type="number" 
                                  placeholder={splitType === 'percentage' ? '%' : '₹'} 
                                  className="h-8 text-right pr-6 font-bold rounded-lg text-xs"
                                  value={customSplits[m] || ''}
                                  onChange={(e) => setCustomSplits({...customSplits, [m]: e.target.value})}
                                />
                                <span className="absolute right-2 top-2 text-[10px] opacity-50">{splitType === 'percentage' ? '%' : '₹'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Live Breakdown Display */}
                      {selectedParticipants.length > 0 && parseFloat(expenseAmt) > 0 && (
                        <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in zoom-in-95">
                          <p className="text-[9px] font-black uppercase text-primary tracking-widest text-center mb-1">Live Split Preview</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(previewSplits).map(([name, val]) => (
                              <div key={name} className="flex justify-between items-center bg-background/50 p-2 rounded-lg border border-primary/5 shadow-sm">
                                <span className="text-[9px] font-bold uppercase truncate max-w-[60px] opacity-70">{name}</span>
                                <span className="text-[10px] font-black">₹{val.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 mt-auto">
                        <Button onClick={handleAddExpense} disabled={isSubmitting} className="w-full h-12 rounded-2xl font-black shadow-lg gap-2">
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Confirm Split
                        </Button>
                        <p className="text-[8px] font-black text-center mt-2 uppercase text-muted-foreground opacity-60">
                          Splitting ₹{expenseAmt || '0'} among {selectedParticipants.length} people
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Contribution Ledger
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest">
                {activeGroup?.name} • Overall Group Health
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {groupStats?.balances.map(b => (
                  <div key={b.name} className={cn(
                    "flex flex-col p-4 rounded-2xl border transition-all",
                    b.net > 0 ? "bg-green-50/50 border-green-100" : b.net < 0 ? "bg-red-50/50 border-red-100" : "bg-muted/30 border-border/50"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-background rounded-lg shadow-sm border">
                          <UserCircle className={cn("h-4 w-4", b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-600" : "text-primary")} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black uppercase tracking-tight">{b.name}</span>
                          <span className="text-[8px] font-bold uppercase text-muted-foreground opacity-60 tracking-widest">Team Participant</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-xs font-black flex items-center gap-1",
                          b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {b.net > 0 ? <ArrowUpRight className="h-3 w-3" /> : b.net < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          ₹{Math.abs(b.net).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold uppercase opacity-60">
                          {b.net > 0 ? "Owed to them" : b.net < 0 ? "They owe" : "Settled"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed">
                      <div>
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Paid Total</p>
                        <p className="text-xs font-bold">₹{b.paid.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Share Total</p>
                        <p className="text-xs font-bold">₹{b.share.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={() => setShowBreakdown(false)} className="w-full h-11 rounded-xl font-black uppercase text-xs tracking-widest shadow-md">Close Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
