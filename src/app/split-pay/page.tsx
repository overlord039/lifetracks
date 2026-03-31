"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, arrayUnion } from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  IndianRupee, 
  Loader2, 
  History, 
  Calculator, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft,
  Check,
  Share2,
  Copy,
  TrendingUp,
  TrendingDown,
  Scale,
  UserMinus,
  AlertTriangle,
  UserPlus,
  Percent,
  Coins,
  PieChart as PieChartIcon,
  BarChart3,
  Trash2,
  BrainCircuit,
  LayoutGrid
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { encryptData, decryptData } from '@/lib/encryption';
import { categorizeExpense } from '@/ai/flows/categorize-expense-flow';
import { format } from 'date-fns';

type SplitType = 'equal' | 'custom' | 'percentage';

const CHART_COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65'];

export default function SplitPayPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isJoiningModalOpen, setIsJoiningModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [newRoomCategoryName, setNewRoomCategoryName] = useState('');

  const [decryptedGroups, setDecryptedGroups] = useState<any[]>([]);
  const [isDecryptingGroups, setIsDecryptingGroups] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);
  const userName = userProfile?.displayName || user?.email?.split('@')[0] || 'Anonymous';

  const myGroupsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'sharedGroups'), where('memberUids', 'array-contains', user.uid));
  }, [db, user]);
  const { data: myGroups, isLoading: isGroupsLoading } = useCollection(myGroupsQuery);

  // Sync personal categories for auto-labeling when syncing to budget vault
  const personalCategoriesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenseCategories');
  }, [db, user]);
  const { data: personalCategories } = useCollection(personalCategoriesRef);

  useEffect(() => {
    const decryptGroupNames = async () => {
      if (!myGroups || !user) {
        setDecryptedGroups(myGroups || []);
        return;
      }
      setIsDecryptingGroups(true);
      const decrypted = await Promise.all(myGroups.map(async (group) => ({
        ...group,
        name: group.isEncrypted ? await decryptData(group.name, user.uid) : group.name
      })));
      setDecryptedGroups(decrypted);
      setIsDecryptingGroups(false);
    };
    decryptGroupNames();
  }, [myGroups, user]);

  const activeGroup = useMemo(() => 
    decryptedGroups?.find(g => g.id === selectedGroupId), 
  [decryptedGroups, selectedGroupId]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !selectedGroupId || !activeGroup) return null;
    if (!activeGroup.memberUids?.includes(user?.uid)) return null;
    return collection(db, 'sharedGroups', selectedGroupId, 'expenses');
  }, [db, selectedGroupId, activeGroup, user?.uid]);
  const { data: expenses, error: expensesError } = useCollection(expensesRef);

  const settlementsRef = useMemoFirebase(() => {
    if (!db || !selectedGroupId || !activeGroup) return null;
    if (!activeGroup.memberUids?.includes(user?.uid)) return null;
    return collection(db, 'sharedGroups', selectedGroupId, 'settlements');
  }, [db, selectedGroupId, activeGroup, user?.uid]);
  const { data: settlements, error: settlementsError } = useCollection(settlementsRef);

  const roomCategoriesRef = useMemoFirebase(() => {
    if (!db || !selectedGroupId || !activeGroup) return null;
    if (!activeGroup.memberUids?.includes(user?.uid)) return null;
    return collection(db, 'sharedGroups', selectedGroupId, 'categories');
  }, [db, selectedGroupId, activeGroup, user?.uid]);
  const { data: roomCategories } = useCollection(roomCategoriesRef);

  useEffect(() => {
    if (activeGroup) {
      setSelectedParticipants(activeGroup.memberUids || []);
      if (!paidBy) setPaidBy(user?.uid || '');
    }
  }, [activeGroup, user?.uid, paidBy]);

  useEffect(() => {
    if (splitType === 'equal' && expenseAmt && selectedParticipants.length > 0) {
      const amt = parseFloat(expenseAmt) || 0;
      const count = selectedParticipants.length;
      const base = Math.floor((amt / count) * 100) / 100;
      let remainder = Math.round((amt - (base * count)) * 100) / 100;
      
      const newSplits: Record<string, string> = {};
      selectedParticipants.forEach((uid) => {
        let s = base;
        if (remainder > 0) {
          s = Math.round((s + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        newSplits[uid] = s.toFixed(2);
      });
      setCustomSplits(newSplits);
    }
  }, [expenseAmt, selectedParticipants, splitType]);

  useEffect(() => {
    if (expensesError || settlementsError) {
      toast({ 
        variant: "destructive", 
        title: "Access Restricted", 
        description: "Membership not confirmed. Returning to lobby." 
      });
      setSelectedGroupId(null);
    }
  }, [expensesError, settlementsError, toast]);

  const handleSplitAdjustment = (uid: string, newValue: string) => {
    const total = parseFloat(expenseAmt) || 0;
    if (total <= 0) {
      setCustomSplits({ ...customSplits, [uid]: newValue });
      return;
    }

    const val = parseFloat(newValue) || 0;
    const others = selectedParticipants.filter(id => id !== uid);
    
    if (others.length === 0) {
      setCustomSplits({ [uid]: newValue });
      return;
    }

    const remaining = total - val;
    const count = others.length;
    const base = Math.floor((remaining / count) * 100) / 100;
    let remainder = Math.round((remaining - (base * count)) * 100) / 100;

    const newSplits = { ...customSplits };
    newSplits[uid] = newValue;
    
    others.forEach(otherId => {
      let s = base;
      if (remainder > 0) {
        s = Math.round((s + 0.01) * 100) / 100;
        remainder = Math.round((remainder - 0.01) * 100) / 100;
      } else if (remainder < 0) {
        s = Math.round((s - 0.01) * 100) / 100;
        remainder = Math.round((remainder + 0.01) * 100) / 100;
      }
      newSplits[otherId] = s.toFixed(2);
    });

    setCustomSplits(newSplits);
    if (splitType === 'equal') setSplitType('custom');
  };

  const handleAICategorize = async () => {
    if (!expenseDesc || !roomCategoriesRef || !roomCategories) return;
    setIsAIThinking(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: expenseDesc,
        existingCategories: roomCategories.map(c => c.name)
      });
      
      if (result.isNewCategorySuggested) {
        const docRef = await addDocumentNonBlocking(roomCategoriesRef, {
          name: result.suggestedCategoryName,
          createdAt: new Date().toISOString()
        });
        if (docRef) setExpenseCategoryId(docRef.id);
      } else {
        const existing = roomCategories.find(c => c.name === result.suggestedCategoryName);
        if (existing) setExpenseCategoryId(existing.id);
      }
      toast({ title: "Classified", description: result.reasoning });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Classification failed" });
    } finally {
      setIsAIThinking(false);
    }
  };

  const stats = useMemo(() => {
    if (!activeGroup || !expenses) return null;
    
    const members = Array.isArray(activeGroup.members) ? activeGroup.members : [];
    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidMap: Record<string, number> = {};
    const shareMap: Record<string, number> = {};
    const settlementMap: Record<string, number> = {};
    
    activeGroup.memberUids?.forEach((uid: string) => {
      paidMap[uid] = 0;
      shareMap[uid] = 0;
      settlementMap[uid] = 0;
    });

    const categoryTotals: Record<string, number> = {};

    expenses.forEach(exp => {
      paidMap[exp.paidBy] = (paidMap[exp.paidBy] || 0) + exp.amount;
      Object.entries(exp.splits || {}).forEach(([uid, share]) => {
        shareMap[uid] = (shareMap[uid] || 0) + (share as number);
      });

      const catName = roomCategories?.find(c => c.id === exp.expenseCategoryId)?.name || 'Unlabeled';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + exp.amount;
    });

    settlements?.forEach(s => {
      settlementMap[s.paidBy] = (settlementMap[s.paidBy] || 0) + s.amount;
      settlementMap[s.paidTo] = (settlementMap[s.paidTo] || 0) - s.amount;
    });

    const balances = members.map((m: any) => {
      const net = (paidMap[m.userId] || 0) + (settlementMap[m.userId] || 0) - (shareMap[m.userId] || 0);
      return { 
        ...m, 
        paid: paidMap[m.userId] || 0, 
        share: shareMap[m.userId] || 0, 
        net 
      };
    }).sort((a: any, b: any) => (a.userName || '').localeCompare(b.userName || ''));

    const contributionData = balances.map((b, idx) => ({
      name: b.userName,
      value: b.paid,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    })).filter(d => d.value > 0);

    const consumptionData = balances.map((b, idx) => ({
      name: b.userName,
      value: b.share,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    })).filter(d => d.value > 0);

    const categorySpendData = Object.entries(categoryTotals).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return { totalSpent, balances, contributionData, consumptionData, categorySpendData };
  }, [activeGroup, expenses, settlements, roomCategories]);

  const previewSplits = useMemo(() => {
    if (!expenseAmt || !activeGroup || selectedParticipants.length === 0) return {};
    const amt = parseFloat(expenseAmt) || 0;
    let splits: Record<string, number> = {};

    if (splitType === 'equal') {
      const count = selectedParticipants.length;
      const base = Math.floor((amt / count) * 100) / 100;
      let remainder = Math.round((amt - (base * count)) * 100) / 100;
      selectedParticipants.forEach((uid) => {
        let s = base;
        if (remainder > 0) {
          s = Math.round((s + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        splits[uid] = s;
      });
    } else if (splitType === 'custom') {
      selectedParticipants.forEach(uid => splits[uid] = parseFloat(customSplits[uid]) || 0);
    } else if (splitType === 'percentage') {
      selectedParticipants.forEach(uid => splits[uid] = (amt * (parseFloat(customSplits[uid]) || 0)) / 100);
    }
    return splits;
  }, [expenseAmt, splitType, selectedParticipants, customSplits, activeGroup]);

  const splitValidation = useMemo(() => {
    if (!expenseAmt || parseFloat(expenseAmt) <= 0) return { isValid: false, message: 'Enter total amount' };
    const amt = parseFloat(expenseAmt);
    const sum = Object.values(previewSplits).reduce((a, b) => a + b, 0);
    const diff = Math.abs(amt - sum);

    if (splitType === 'equal') return { isValid: selectedParticipants.length > 0, message: selectedParticipants.length === 0 ? 'Select participants' : 'Equal redistribution active' };
    
    if (diff > 0.05) {
      return { isValid: false, message: `Difference: ₹${(amt - sum).toFixed(2)}` };
    }
    return { isValid: true, message: 'All funds allocated correctly' };
  }, [expenseAmt, previewSplits, splitType, selectedParticipants]);

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !user || !db) return;
    setIsProcessing(true);
    const roomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const groupRef = doc(db, 'sharedGroups', roomId);
    
    const newRoom = {
      id: roomId,
      name: roomName.trim(),
      createdBy: user.uid,
      creatorName: userName,
      memberUids: [user.uid],
      members: [{ userId: user.uid, userName }],
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(groupRef, newRoom, { merge: true });
    setRoomName('');
    setIsCreateModalOpen(false);
    setSelectedGroupId(roomId);
    setIsProcessing(false);
    toast({ title: "Room Initialized", description: `Join Code: ${roomId}` });
  };

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !user || !db) return;
    setIsProcessing(true);
    
    const roomRef = doc(db, 'sharedGroups', code);
    updateDocumentNonBlocking(roomRef, {
      memberUids: arrayUnion(user.uid),
      members: arrayUnion({ userId: user.uid, userName })
    });
    
    setJoinCode('');
    setIsJoiningModalOpen(false);
    setSelectedGroupId(code);
    setIsProcessing(false);
    toast({ title: "Syncing Membership", description: "Verifying credentials with ledger..." });
  };

  const addRoomCategory = async () => {
    if (!newRoomCategoryName.trim() || !roomCategoriesRef) return;
    addDocumentNonBlocking(roomCategoriesRef, {
      name: newRoomCategoryName.trim(),
      createdAt: new Date().toISOString()
    });
    setNewRoomCategoryName('');
  };

  const handleDeleteRoom = () => {
    if (!roomToDelete || !db) return;
    deleteDocumentNonBlocking(doc(db, 'sharedGroups', roomToDelete));
    setRoomToDelete(null);
    toast({ title: "Room Decommissioned" });
  };

  const handleKickMember = (targetUserId: string) => {
    if (!activeGroup || !db || user?.uid !== activeGroup.createdBy) return;
    const updatedMemberUids = activeGroup.memberUids.filter((id: string) => id !== targetUserId);
    const updatedMembers = activeGroup.members.filter((m: any) => m.userId !== targetUserId);
    updateDocumentNonBlocking(doc(db, 'sharedGroups', activeGroup.id), {
      memberUids: updatedMemberUids,
      members: updatedMembers
    });
    toast({ title: "Member Removed" });
  };

  const handleAddExpense = async () => {
    if (!expenseAmt || !paidBy || !activeGroup || !user || !expensesRef || !splitValidation.isValid) return;
    const amt = parseFloat(expenseAmt);
    const members = Array.isArray(activeGroup.members) ? activeGroup.members : [];
    const paidByName = members.find((m: any) => m.userId === paidBy)?.userName || 'Unknown';

    // 1. Sync to room ledger
    addDocumentNonBlocking(expensesRef, {
      roomId: activeGroup.id,
      amount: amt,
      description: expenseDesc || 'Expense',
      paidBy,
      paidByName,
      expenseCategoryId,
      participants: selectedParticipants,
      splitType,
      splits: previewSplits,
      createdAt: new Date().toISOString()
    });

    // 2. Automatically sync the user's split to their personal budget vault
    const myShare = previewSplits[user.uid] || 0;
    if (myShare > 0) {
      const syncToPersonalBudget = async () => {
        const monthId = format(new Date(), 'yyyyMM');
        const personalExpensesRef = collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
        const personalCategoriesRef = collection(db, 'users', user.uid, 'expenseCategories');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const roomCatName = roomCategories?.find(c => c.id === expenseCategoryId)?.name || 'Room Bill';
        const personalDesc = `Room: ${activeGroup.name} - ${expenseDesc || roomCatName}`;
        
        // Ensure personal category exists (Sync Vault Label)
        let targetPersonalCatId = '';
        const match = personalCategories?.find(pc => pc.name.toLowerCase() === roomCatName.toLowerCase());
        
        if (match) {
          targetPersonalCatId = match.id;
        } else {
          const newCatRef = doc(personalCategoriesRef);
          targetPersonalCatId = newCatRef.id;
          setDocumentNonBlocking(newCatRef, {
            userId: user.uid,
            name: await encryptData(roomCatName, user.uid),
            type: 'daily',
            isEncrypted: true,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const expRef = doc(personalExpensesRef);
        setDocumentNonBlocking(expRef, {
          userId: user.uid,
          monthlyBudgetId: monthId,
          description: await encryptData(personalDesc, user.uid),
          amount: await encryptData(myShare.toFixed(2), user.uid),
          expenseCategoryId: targetPersonalCatId,
          date: todayStr,
          isEncrypted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      };
      syncToPersonalBudget();
    }

    setExpenseAmt('');
    setExpenseDesc('');
    setExpenseCategoryId('');
    setCustomSplits({});
    toast({ 
      title: "Ledger Updated", 
      description: myShare > 0 ? "Private split synced to budget vault." : "Shared ledger updated." 
    });
  };

  const handleSettle = (fromId: string, fromName: string, toId: string, amount: number) => {
    if (!settlementsRef || !activeGroup) return;
    const members = Array.isArray(activeGroup.members) ? activeGroup.members : [];
    const toName = members.find((m: any) => m.userId === toId)?.userName || 'Unknown';
    
    addDocumentNonBlocking(settlementsRef, {
      roomId: activeGroup.id,
      paidBy: fromId,
      paidByName: fromName,
      paidTo: toId,
      paidToName: toName,
      amount,
      createdAt: new Date().toISOString()
    });
    toast({ title: "Settlement Logged" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Code Copied" });
  };

  if (isGroupsLoading || isDecryptingGroups) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Ledgers...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!selectedGroupId ? (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-3xl text-primary shadow-inner">
              <Users className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter">Collaborative Split</h2>
              <p className="text-muted-foreground font-medium">Create or join rooms for shared expenses with real-time updates.</p>
            </div>
            <div className="flex gap-3 w-full max-w-sm pt-4">
              <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 h-12 rounded-2xl font-black gap-2 shadow-lg">
                <Plus className="h-5 w-5" /> Create Room
              </Button>
              <Button onClick={() => setIsJoiningModalOpen(true)} variant="outline" className="flex-1 h-12 rounded-2xl font-black gap-2">
                <Share2 className="h-5 w-5" /> Join Room
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {decryptedGroups?.map(group => {
              const members = Array.isArray(group.members) ? group.members : [];
              return (
                <Card 
                  key={group.id} 
                  className="group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all rounded-3xl border-none ring-1 ring-border overflow-hidden relative"
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-8">
                        <CardTitle className="text-xl font-black tracking-tight truncate">{group.name}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary">ID: {group.id}</CardDescription>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                    </div>
                    {group.createdBy === user?.uid && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-12 top-6 h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(group.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map((m: any) => (
                        <div key={m.userId} title={m.userName} className="h-8 w-8 rounded-full bg-primary border-2 border-background flex items-center justify-center text-[10px] font-black text-white">
                          {(m.userName || 'U')[0].toUpperCase()}
                        </div>
                      ))}
                      {members.length > 4 && (
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-black">
                          +{members.length - 4}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-black text-[10px] uppercase">{members.length} Members</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedGroupId(null)} className="h-10 w-10 rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                  {activeGroup ? activeGroup.name : "Verifying Access..."}
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-black text-[8px] uppercase tracking-widest">Live Ledger</Badge>
                </h2>
                <div className="flex items-center gap-2 group">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Room ID: {selectedGroupId}</p>
                  <button onClick={() => copyToClipboard(selectedGroupId || '')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsStatsModalOpen(true)}
              className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 flex flex-col md:flex-row items-center gap-4 md:gap-8 hover:bg-primary/10 transition-all group cursor-pointer"
            >
              <div className="text-center md:text-left">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest group-hover:text-primary transition-colors">Shared Pool</p>
                <p className="text-2xl font-black text-primary">₹{stats?.totalSpent.toLocaleString() || '0'}</p>
              </div>
              <Separator orientation="vertical" className="hidden md:block h-8" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{(Array.isArray(activeGroup?.members) ? activeGroup.members.length : 0)} Active</span>
              </div>
              <BarChart3 className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
            </button>
          </header>

          {!activeGroup ? (
            <Card className="p-20 flex flex-col items-center justify-center border-dashed border-2 animate-pulse space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-black uppercase text-xs tracking-widest text-muted-foreground">Authenticating Membership...</p>
            </Card>
          ) : (
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="add" className="rounded-xl font-black text-xs gap-2"><Calculator className="h-4 w-4" /> Add Bill</TabsTrigger>
                <TabsTrigger value="balance" className="rounded-xl font-black text-xs gap-2"><Scale className="h-4 w-4" /> Balances</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl font-black text-xs gap-2"><History className="h-4 w-4" /> Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="animate-in fade-in slide-in-from-bottom-2">
                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="lg:col-span-7 shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-4">
                      <CardTitle className="text-base font-black flex items-center gap-2">Sync New Expense</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                            <div className="flex gap-2">
                              <Input placeholder="What was this for?" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="h-11 rounded-xl" />
                              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={handleAICategorize} disabled={isAIThinking || !expenseDesc}>
                                {isAIThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 text-primary" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Label</Label>
                            <Select value={expenseCategoryId} onValueChange={setExpenseCategoryId}>
                              <SelectTrigger className="h-11 rounded-xl font-black">
                                <SelectValue placeholder="Select Label" />
                              </SelectTrigger>
                              <SelectContent>
                                {roomCategories?.map(c => (
                                  <SelectItem key={c.id} value={c.id} className="font-black">{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount (₹)</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={expenseAmt} 
                                onChange={e => setExpenseAmt(e.target.value)} 
                                className="h-11 pl-9 rounded-xl font-black text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              />
                              <IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paid By</Label>
                            <Select value={paidBy} onValueChange={setPaidBy}>
                              <SelectTrigger className="h-11 rounded-xl font-black">
                                <SelectValue placeholder="Select Payer" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (
                                  <SelectItem key={m.userId} value={m.userId} className="font-black">{m.userName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark Participants</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-2xl border border-dashed">
                              {(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (
                                <button
                                  key={m.userId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedParticipants(prev => 
                                      prev.includes(m.userId) ? prev.filter(uid => uid !== m.userId) : [...prev, m.userId]
                                    );
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border",
                                    selectedParticipants.includes(m.userId) 
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                      : "bg-background text-muted-foreground border-border opacity-60"
                                  )}
                                >
                                  {selectedParticipants.includes(m.userId) && <Check className="h-3 w-3" />}
                                  {m.userName}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Split Calculation</Label>
                            <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="w-full">
                              <TabsList className="grid w-full grid-cols-3 h-9 p-1 rounded-xl">
                                <TabsTrigger value="equal" className="text-[9px] font-black uppercase">Equal</TabsTrigger>
                                <TabsTrigger value="custom" className="text-[9px] font-black uppercase">₹</TabsTrigger>
                                <TabsTrigger value="percentage" className="text-[9px] font-black uppercase">%</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                        </div>
                      </div>

                      {selectedParticipants.length > 0 && parseFloat(expenseAmt) > 0 && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Allocation Ledger</p>
                            <Badge variant={splitValidation.isValid ? "secondary" : "destructive"} className="text-[8px] font-black uppercase">
                              {splitValidation.message}
                            </Badge>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedParticipants.map((uid) => {
                              const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
                              const name = members.find((m: any) => m.userId === uid)?.userName || 'User';
                              return (
                                <div key={uid} className="flex flex-col gap-1.5 bg-background/50 p-3 rounded-xl border shadow-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase truncate max-w-[100px] opacity-70">{name}</span>
                                  </div>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      placeholder="0.00" 
                                      value={customSplits[uid] || ''} 
                                      onChange={(e) => {
                                        if (splitType === 'percentage') {
                                          setCustomSplits({...customSplits, [uid]: e.target.value});
                                        } else {
                                          handleSplitAdjustment(uid, e.target.value);
                                        }
                                      }}
                                      className="h-8 pl-7 text-xs font-bold rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {splitType === 'percentage' ? (
                                      <><Percent className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><span className="absolute right-2 top-2 text-[10px] font-black text-muted-foreground">≈ ₹{previewSplits[uid]?.toFixed(2)}</span></>
                                    ) : (
                                      <IndianRupee className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-muted/10 border-t py-4">
                      <Button onClick={handleAddExpense} disabled={!splitValidation.isValid} className="w-full h-12 rounded-2xl font-black shadow-lg gap-2 text-base">
                        <CheckCircle2 className="h-5 w-5" /> Sync to Shared Ledger
                      </Button>
                    </CardFooter>
                  </Card>

                  <div className="lg:col-span-5 space-y-6">
                    <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
                      <CardHeader className="bg-muted/30 pb-3">
                        <CardTitle className="text-sm font-black flex items-center gap-2"><Users className="h-4 w-4" /> Room Members</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (
                          <div key={m.userId} className="flex items-center justify-between p-3 rounded-2xl bg-muted/10 border border-dashed group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{(m.userName || 'U')[0].toUpperCase()}</div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-tight">{m.userName}</span>
                                {m.userId === activeGroup?.createdBy && <span className="text-[8px] font-black uppercase text-orange-600">Room Admin</span>}
                              </div>
                            </div>
                            {user?.uid === activeGroup?.createdBy && m.userId !== user?.uid && (
                              <Button variant="ghost" size="icon" onClick={() => handleKickMember(m.userId)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <div className="pt-4 mt-2 border-t border-dashed">
                          <Button variant="outline" className="w-full h-10 rounded-xl font-black gap-2 text-[10px] uppercase" onClick={() => copyToClipboard(activeGroup?.id || '')}>
                            <UserPlus className="h-4 w-4" /> Invite via Code
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
                      <CardHeader className="bg-muted/30 border-b py-2.5 px-4"><CardTitle className="text-sm md:text-base flex items-center gap-2 font-black"><LayoutGrid className="h-4 w-4 text-primary" /> Room Labels</CardTitle></CardHeader>
                      <CardContent className="pt-4 px-4 space-y-4">
                        <div className="flex gap-2">
                          <Input placeholder="New label..." value={newRoomCategoryName} onChange={(e) => setNewRoomCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRoomCategory()} className="h-9 text-[11px]" />
                          <Button size="icon" onClick={addRoomCategory} className="h-9 w-9 shrink-0 rounded-xl"><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {roomCategories?.length ? roomCategories.map(c => (
                            <div key={c.id} className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase border border-primary/20">
                              {c.name}
                              <button onClick={() => deleteDocumentNonBlocking(doc(roomCategoriesRef!, c.id))} className="ml-1 text-destructive p-0.5 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          )) : <p className="text-[10px] text-muted-foreground italic w-full text-center py-4">No room labels defined.</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="balance" className="animate-in fade-in slide-in-from-right-2">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stats?.balances.map(b => (
                    <Card key={b.userId} className={cn(
                      "rounded-3xl border-none ring-1 shadow-md transition-all",
                      b.net > 0 ? "ring-green-500/30 bg-green-50/10" : b.net < 0 ? "ring-red-500/30 bg-red-50/10" : "ring-border"
                    )}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-black flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-background border flex items-center justify-center text-primary font-black">{(b.userName || 'U')[0].toUpperCase()}</div>
                          {b.userName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase opacity-60">
                          <div className="p-2 bg-background rounded-xl border">Paid: ₹{b.paid.toLocaleString()}</div>
                          <div className="p-2 bg-background rounded-xl border">Share: ₹{b.share.toLocaleString()}</div>
                        </div>
                        <div className="pt-3 border-t">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Net Ledger Balance</p>
                          <div className="flex items-center justify-between">
                            <p className={cn("text-2xl font-black tracking-tighter", b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-600" : "text-muted-foreground")}>
                              {b.net > 0 ? `+₹${b.net.toFixed(0)}` : b.net < 0 ? `-₹${Math.abs(b.net).toFixed(0)}` : 'Settled'}
                            </p>
                            {b.net > 0 ? <TrendingUp className="h-6 w-6 text-green-600 opacity-20" /> : <TrendingDown className="h-6 w-6 text-red-600 opacity-20" />}
                          </div>
                        </div>
                      </CardContent>
                      {b.net < 0 && b.userId === user?.uid && (
                        <CardFooter className="pt-0">
                          <Select onValueChange={(toUid) => handleSettle(b.userId, b.userName, toUid, Math.abs(b.net))}>
                            <SelectTrigger className="h-10 text-[10px] font-black uppercase rounded-xl">
                              <SelectValue placeholder="Settle Bill To..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(Array.isArray(activeGroup?.members) ? activeGroup.members : []).filter((m: any) => m.userId !== b.userId).map((m: any) => (
                                <SelectItem key={m.userId} value={m.userId} className="text-[10px] font-black">{m.userName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="animate-in fade-in slide-in-from-left-2">
                <Card className="rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {expenses?.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(exp => {
                        const catName = roomCategories?.find(c => c.id === exp.expenseCategoryId)?.name;
                        return (
                          <div key={exp.id} className="p-6 hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                              <div className="space-y-1">
                                <h4 className="font-black text-lg tracking-tight">
                                  {exp.description}
                                  {catName && <Badge variant="secondary" className="ml-2 text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">{catName}</Badge>}
                                </h4>
                                <p className="text-[10px] text-muted-foreground font-black uppercase">
                                  <span className="text-primary">{exp.paidByName}</span> paid ₹{exp.amount}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{exp.splitType} split</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(exp.splits || {}).map(([uid, share]: any) => {
                                const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
                                const name = members.find((m: any) => m.userId === uid)?.userName || 'User';
                                return share > 0 ? (
                                  <div key={uid} className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 rounded-full border border-dashed">
                                    <span className="text-[9px] font-black uppercase opacity-60">{name}</span>
                                    <span className="text-[10px] font-black">₹{share.toFixed(0)}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {settlements?.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(s => (
                        <div key={s.id} className="p-6 bg-green-50/20 border-l-4 border-l-green-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg text-green-600"><Check className="h-4 w-4" /></div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight">
                                  <span className="text-green-700">{s.paidByName}</span> settled <span className="text-green-700">₹{s.amount}</span> to {s.paidToName}
                                </p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(s.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!expenses || expenses.length === 0) && (!settlements || settlements.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-32 opacity-30 grayscale space-y-4">
                          <History className="h-16 w-16" />
                          <p className="text-xs font-black uppercase tracking-widest text-center">Room ledger is currently empty.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Initialize Room</DialogTitle>
            <DialogDescription className="text-sm font-medium">Setup a private collaborative workspace.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Room Name</Label>
              <Input placeholder="e.g. Trip to Ladakh" value={roomName} onChange={e => setRoomName(e.target.value)} className="h-12 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateRoom} disabled={isProcessing} className="w-full h-12 rounded-2xl font-black">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Launch Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isJoiningModalOpen} onOpenChange={setIsJoiningModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Join Existing Room</DialogTitle>
            <DialogDescription className="text-sm font-medium">Enter the Room Code shared with you.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Room Code</Label>
              <Input placeholder="ABC123XY" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="h-14 rounded-2xl text-2xl font-black text-center tracking-widest" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleJoinRoom} disabled={isProcessing} className="w-full h-12 rounded-2xl font-black">
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-primary-foreground">
            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><BarChart3 className="h-6 w-6" /></div>
              Room Analytics
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-80">Detailed breakdown for {activeGroup?.name}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-8 bg-background">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Badge className="bg-blue-100 text-blue-700 font-black text-[8px] uppercase">Member Contributions</Badge>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">Total funds paid out of pocket by each member to cover group bills.</p>
                  </div>
                  <div className="h-[200px] w-full">
                    {stats?.contributionData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.contributionData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {stats.contributionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '10px', fontWeight: '900' }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full opacity-30 grayscale"><PieChartIcon className="h-10 w-10" /></div>}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Badge className="bg-orange-100 text-orange-700 font-black text-[8px] uppercase">Member Consumption</Badge>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">The cumulative value of shares consumed by each member (what they owe the room).</p>
                  </div>
                  <div className="h-[200px] w-full">
                    {stats?.consumptionData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.consumptionData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {stats.consumptionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '10px', fontWeight: '900' }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full opacity-30 grayscale"><PieChartIcon className="h-10 w-10" /></div>}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1">
                  <Badge className="bg-purple-100 text-purple-700 font-black text-[8px] uppercase">Spending by Label</Badge>
                  <p className="text-[10px] text-muted-foreground font-medium">A categorical breakdown of group spending to identify top expenditure areas like food or stay.</p>
                </div>
                <div className="grid gap-8 md:grid-cols-2 items-center">
                  <div className="h-[200px] w-full">
                    {stats?.categorySpendData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.categorySpendData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {stats.categorySpendData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '10px', fontWeight: '900' }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full opacity-30 grayscale"><LayoutGrid className="h-10 w-10" /></div>}
                  </div>
                  <div className="space-y-2">
                    {stats?.categorySpendData.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-dashed hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{cat.name}</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase">Room Expense Label</span>
                          </div>
                        </div>
                        <span className="text-xs font-black">₹{cat.value.toLocaleString()}</span>
                      </div>
                    ))}
                    {!stats?.categorySpendData.length && <p className="text-[10px] text-muted-foreground italic text-center py-10">No categorized bills found.</p>}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="p-4 bg-muted/20 border-t flex justify-end"><Button onClick={() => setIsStatsModalOpen(false)} variant="outline" className="rounded-xl font-black h-9 text-[10px] uppercase px-6">Close Analytics</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Decommission Room?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">This action is permanent. All expenses, settlements, and ledger history for this room will be wiped.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-black h-11 text-[10px] uppercase">Retain Ledger</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black h-11 text-[10px] uppercase">Wipe Everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
