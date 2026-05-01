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
  LayoutGrid,
  X,
  Pencil,
  HandCoins,
  Circle,
  CheckCircle,
  Info
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
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';
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
  const [isManualRoomModalOpen, setIsManualRoomModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState('');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editedMemberName, setEditedMemberName] = useState('');

  const [manualRoomName, setManualRoomName] = useState('');
  const [manualMemberCount, setManualMemberCount] = useState('2');
  const [manualMembers, setManualMembers] = useState<{ id: string, name: string, share: string }[]>([
    { id: '1', name: 'Me', share: '' },
    { id: '2', name: 'Member 2', share: '' }
  ]);

  const [newMemberName, setNewMemberName] = useState('');

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

  const [decryptedPersonalCategories, setDecryptedPersonalCategories] = useState<any[]>([]);

  const [newDebt, setNewDebt] = useState({ debtorName: '', amount: '', description: '' });
  const [decryptedDebts, setDecryptedDebts] = useState<any[]>([]);
  const [isDecryptingDebts, setIsDecryptingDebts] = useState(false);

  const debtsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'debts');
  }, [db, user]);

  const { data: rawDebts, isLoading: isRawDebtsLoading } = useCollection(debtsRef);

  useEffect(() => {
    const decryptAllDebts = async () => {
      if (!rawDebts || !user) {
        setDecryptedDebts(rawDebts || []);
        return;
      }
      setIsDecryptingDebts(true);
      const decrypted = await Promise.all(rawDebts.map(async (debt) => ({
        ...debt,
        debtorName: debt.isEncrypted ? await decryptData(debt.debtorName, user.uid) : debt.debtorName,
        amount: debt.isEncrypted ? await decryptNumber(debt.amount, user.uid) : debt.amount,
        description: debt.isEncrypted ? await decryptData(debt.description, user.uid) : debt.description,
      })));
      setDecryptedDebts(decrypted);
      setIsDecryptingDebts(false);
    };
    decryptAllDebts();
  }, [rawDebts, user]);

  const addDebt = async () => {
    if (!newDebt.debtorName || !newDebt.amount || !debtsRef || !user) return;
    const encryptedPayload = {
      userId: user?.uid,
      debtorName: await encryptData(newDebt.debtorName.trim().toUpperCase(), user.uid),
      amount: await encryptData(newDebt.amount, user.uid),
      description: await encryptData(newDebt.description, user.uid),
      isPaid: false,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };
    addDocumentNonBlocking(debtsRef, encryptedPayload);
    setNewDebt({ debtorName: '', amount: '', description: '' });
    toast({ title: "Debt Record Secured" });
  };

  const togglePaid = (id: string, currentStatus: boolean) => {
    if (!debtsRef) return;
    updateDocumentNonBlocking(doc(debtsRef, id), { 
      isPaid: !currentStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteDebt = (id: string) => {
    if (!debtsRef) return;
    deleteDocumentNonBlocking(doc(debtsRef, id));
    toast({ title: "Debt record removed" });
  };

  const totalOwed = decryptedDebts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0;

  useEffect(() => {
    const count = parseInt(manualMemberCount) || 0;
    if (count < 1 || !isManualRoomModalOpen) return;
    
    setManualMembers(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const added = Array.from({ length: count - prev.length }, (_, i) => ({
          id: Math.random().toString(),
          name: `MEMBER ${prev.length + i + 1}`,
          share: ''
        }));
        return [...prev, ...added];
      } else {
        return prev.slice(0, count);
      }
    });
  }, [manualMemberCount, isManualRoomModalOpen]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);
  const userName = userProfile?.displayName || user?.email?.split('@')[0] || 'ANONYMOUS';

  const myGroupsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'sharedGroups'), where('memberUids', 'array-contains', user.uid));
  }, [db, user]);
  const { data: myGroups, isLoading: isGroupsLoading } = useCollection(myGroupsQuery);

  const personalCategoriesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenseCategories');
  }, [db, user]);
  const { data: personalCategories } = useCollection(personalCategoriesRef);

  useEffect(() => {
    const decryptCats = async () => {
      if (!personalCategories || !user) return;
      const cats = await Promise.all(personalCategories.map(async c => ({
        ...c,
        name: c.isEncrypted ? await decryptData(c.name, user.uid) : (c.name || '')
      })));
      setDecryptedPersonalCategories(cats);
    };
    decryptCats();
  }, [personalCategories, user]);

  useEffect(() => {
    const decryptGroupNames = async () => {
      if (!myGroups || !user) {
        setDecryptedGroups(myGroups || []);
        return;
      }
      setIsDecryptingGroups(true);
      const decrypted = await Promise.all(myGroups.map(async (group) => ({
        ...group,
        name: group.isEncrypted ? await decryptData(group.name, user.uid) : (group.name || '')
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
  const { data: expenses } = useCollection(expensesRef);

  const settlementsRef = useMemoFirebase(() => {
    if (!db || !selectedGroupId || !activeGroup) return null;
    if (!activeGroup.memberUids?.includes(user?.uid)) return null;
    return collection(db, 'sharedGroups', selectedGroupId, 'settlements');
  }, [db, selectedGroupId, activeGroup, user?.uid]);
  const { data: settlements } = useCollection(settlementsRef);

  const roomCategoriesRef = useMemoFirebase(() => {
    if (!db || !selectedGroupId || !activeGroup) return null;
    if (!activeGroup.memberUids?.includes(user?.uid)) return null;
    return collection(db, 'sharedGroups', selectedGroupId, 'categories');
  }, [db, selectedGroupId, activeGroup, user?.uid]);
  const { data: roomCategories } = useCollection(roomCategoriesRef);

  const filteredRoomCategories = useMemo(() => {
    const seen = new Set<string>();
    const normalize = (s: string) => (s || '').trim().toUpperCase();
    return (roomCategories || []).filter(c => {
      const norm = normalize(c.name);
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [roomCategories]);

  useEffect(() => {
    const syncLabelsToRoom = async () => {
      if (!user || !activeGroup || decryptedPersonalCategories.length === 0 || !roomCategories || !roomCategoriesRef) return;
      
      const publicLabels = decryptedPersonalCategories.filter(c => c.type === 'daily' && !c.isPrivate);
      const existingNames = new Set(roomCategories.map(c => (c.name || '').trim().toUpperCase()));

      for (const label of publicLabels) {
        const normalizedName = (label.name || '').trim().toUpperCase();
        if (normalizedName && !existingNames.has(normalizedName)) {
          addDocumentNonBlocking(roomCategoriesRef, {
            name: normalizedName,
            createdAt: new Date().toISOString()
          });
          existingNames.add(normalizedName);
        }
      }
    };
    syncLabelsToRoom();
  }, [activeGroup, decryptedPersonalCategories, roomCategories, user, roomCategoriesRef]);

  useEffect(() => {
    if (activeGroup) {
      setSelectedParticipants(activeGroup.memberUids || []);
      if (!paidBy) setPaidBy(user?.uid || '');
      setEditedRoomName(activeGroup.name);
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

  const handleAICategorize = async () => {
    if (!expenseDesc || !roomCategoriesRef || !roomCategories) return;
    setIsAIThinking(true);
    try {
      const result = await categorizeExpense({
        expenseDescription: expenseDesc,
        existingCategories: roomCategories.map(c => c.name)
      });
      
      const normalize = (s: string) => (s || '').trim().toUpperCase();
      const suggestedNorm = normalize(result.suggestedCategoryName);
      
      if (result.isNewCategorySuggested) {
        const alreadyExists = roomCategories.find(c => normalize(c.name) === suggestedNorm);
        
        if (alreadyExists) {
          setExpenseCategoryId(alreadyExists.id);
        } else {
          const docRef = await addDocumentNonBlocking(roomCategoriesRef, {
            name: suggestedNorm,
            createdAt: new Date().toISOString()
          });
          if (docRef) setExpenseCategoryId(docRef.id);
        }
      } else {
        const existing = roomCategories.find(c => normalize(c.name) === suggestedNorm);
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
    
    members.forEach((m: any) => {
      paidMap[m.userId] = 0;
      shareMap[m.userId] = 0;
      settlementMap[m.userId] = 0;
    });

    const categoryTotals: Record<string, number> = {};

    expenses.forEach(exp => {
      paidMap[exp.paidBy] = (paidMap[exp.paidBy] || 0) + exp.amount;
      Object.entries(exp.splits || {}).forEach(([uid, share]) => {
        shareMap[uid] = (shareMap[uid] || 0) + (share as number);
      });

      const catName = roomCategories?.find(c => c.id === exp.expenseCategoryId)?.name || 'UNLABELED';
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
      name: await encryptData(roomName.trim().toUpperCase(), user.uid),
      createdBy: user.uid,
      creatorName: userName,
      memberUids: [user.uid],
      members: [{ userId: user.uid, userName }],
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(groupRef, newRoom, { merge: true });
    setRoomName('');
    setIsCreateModalOpen(false);
    setSelectedGroupId(roomId);
    setIsProcessing(false);
    toast({ title: "Room Initialized" });
  };

  const handleCreateManualRoom = async () => {
    if (!manualRoomName.trim() || manualMembers.length < 1 || !user || !db) return;
    setIsProcessing(true);
    
    const roomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const groupRef = doc(db, 'sharedGroups', roomId);
    
    const roomMembers = manualMembers.map((m, idx) => ({
      userId: idx === 0 && m.name.toLowerCase() === 'me' ? user.uid : `virtual_${Math.random().toString(36).substring(2, 7)}`,
      userName: m.name.toUpperCase()
    }));

    const newRoom = {
      id: roomId,
      name: await encryptData(manualRoomName.trim().toUpperCase(), user.uid),
      createdBy: user.uid,
      creatorName: userName,
      memberUids: [user.uid],
      members: roomMembers,
      isEncrypted: true,
      isManual: true,
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(groupRef, newRoom, { merge: true });
    
    setManualRoomName('');
    setManualMemberCount('2');
    setIsManualRoomModalOpen(false);
    setSelectedGroupId(roomId);
    setIsProcessing(false);
    toast({ title: "Manual Ledger Launched" });
  };

  const handleUpdateRoomName = async () => {
    if (!activeGroup || !editedRoomName.trim() || !db || !user) return;
    if (activeGroup.createdBy !== user.uid) return;
    
    updateDocumentNonBlocking(doc(db, 'sharedGroups', activeGroup.id), {
      name: await encryptData(editedRoomName.trim().toUpperCase(), user.uid),
      updatedAt: new Date().toISOString()
    });
    
    setIsEditingRoomName(false);
    toast({ title: "Room Renamed" });
  };

  const handleUpdateMemberName = async (targetUserId: string) => {
    if (!activeGroup || !editedMemberName.trim() || !db || !user) return;
    if (activeGroup.createdBy !== user.uid) return;

    const updatedMembers = activeGroup.members.map((m: any) => 
      m.userId === targetUserId ? { ...m, userName: editedMemberName.trim().toUpperCase() } : m
    );

    updateDocumentNonBlocking(doc(db, 'sharedGroups', activeGroup.id), {
      members: updatedMembers,
      updatedAt: new Date().toISOString()
    });

    setEditingMemberId(null);
    setEditedMemberName('');
    toast({ title: "Member Updated" });
  };

  const handleAddMemberManually = async () => {
    if (!activeGroup || !newMemberName.trim() || !db || !user) return;
    if (targetRoomAdminCheck()) return;

    const newMember = {
      userId: `virtual_${Math.random().toString(36).substring(2, 7)}`,
      userName: newMemberName.trim().toUpperCase()
    };

    updateDocumentNonBlocking(doc(db, 'sharedGroups', activeGroup.id), {
      members: arrayUnion(newMember)
    });

    setNewMemberName('');
    setIsAddMemberModalOpen(false);
    toast({ title: "Member Added" });
  };

  const targetRoomAdminCheck = () => {
     if (activeGroup && user?.uid !== activeGroup.createdBy) {
       toast({ variant: "destructive", title: "Access Denied", description: "Only the Room Admin can modify members." });
       return true;
     }
     return false;
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
    toast({ title: "Syncing Membership" });
  };

  const addRoomCategory = async () => {
    const normalizedName = newRoomCategoryName.trim().toUpperCase();
    if (!normalizedName || !roomCategoriesRef) return;
    
    const alreadyExists = roomCategories?.some(c => (c.name || '').trim().toUpperCase() === normalizedName);
    
    if (alreadyExists) {
      toast({ variant: "destructive", title: "Label Exists" });
      return;
    }

    addDocumentNonBlocking(roomCategoriesRef, {
      name: normalizedName,
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
    const paidByName = members.find((m: any) => m.userId === paidBy)?.userName || 'UNKNOWN';

    addDocumentNonBlocking(expensesRef, {
      roomId: activeGroup.id,
      amount: amt,
      description: expenseDesc.toUpperCase() || 'EXPENSE',
      paidBy,
      paidByName,
      expenseCategoryId,
      participants: selectedParticipants,
      splitType,
      splits: previewSplits,
      createdAt: new Date().toISOString()
    });

    const myShare = previewSplits[user.uid] || 0;
    if (myShare > 0) {
      const syncToPersonalBudget = async () => {
        const monthId = format(new Date(), 'yyyyMM');
        const personalExpensesRef = collection(db, 'users', user.uid, 'monthlyBudgets', monthId, 'expenses');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const roomCatName = (roomCategories?.find(c => c.id === expenseCategoryId)?.name || 'ROOM BILL').trim().toUpperCase();
        const personalDesc = `ROOM: ${activeGroup.name} - ${expenseDesc.toUpperCase() || roomCatName}`;
        
        let targetPersonalCatId = '';
        const match = decryptedPersonalCategories?.find(pc => 
          pc.type === 'daily' && 
          !pc.isPrivate && 
          (pc.name || '').trim().toUpperCase() === roomCatName
        );
        
        if (match) {
          targetPersonalCatId = match.id;
        } else {
          const newCatRef = doc(personalCategoriesRef!);
          targetPersonalCatId = newCatRef.id;
          setDocumentNonBlocking(newCatRef, {
            userId: user.uid,
            name: await encryptData(roomCatName, user.uid),
            type: 'daily',
            isPrivate: false, 
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
    toast({ title: "Ledger Updated" });
  };

  const handleSettle = (fromId: string, fromName: string, toId: string, amount: number) => {
    if (!settlementsRef || !activeGroup) return;
    addDocumentNonBlocking(settlementsRef, {
      roomId: activeGroup.id,
      paidBy: fromId,
      paidByName: fromName,
      paidTo: toId,
      paidToName: activeGroup.members.find((m: any) => m.userId === toId)?.userName || 'UNKNOWN',
      amount,
      createdAt: new Date().toISOString()
    });
    toast({ title: "Settlement Logged" });
  };

  const handleManualAddMember = () => {
    setManualMembers([...manualMembers, { id: Math.random().toString(), name: `MEMBER ${manualMembers.length + 1}`, share: '' }]);
    setManualMemberCount((manualMembers.length + 1).toString());
  };

  const handleManualRemoveMember = (id: string) => {
    if (manualMembers.length <= 2) return;
    const updated = manualMembers.filter(m => m.id !== id);
    setManualMembers(updated);
    setManualMemberCount(updated.length.toString());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Code Copied" });
  };

  if (isGroupsLoading || isDecryptingGroups || isRawDebtsLoading || isDecryptingDebts) {
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
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Split & Debt Ledger</h2>
                <p className="text-muted-foreground font-medium">Manage shared expenses and personal receivables in one place.</p>
              </div>
            </div>
          </header>

          <Tabs defaultValue="shared" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted rounded-2xl mb-8">
              <TabsTrigger value="shared" className="rounded-xl font-black text-xs gap-2"><Users className="h-4 w-4" /> Shared Ledgers</TabsTrigger>
              <TabsTrigger value="personal" className="rounded-xl font-black text-xs gap-2"><HandCoins className="h-4 w-4" /> Personal Debt Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="shared" className="animate-in fade-in slide-in-from-left-2">
              <div className="grid gap-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                  <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 h-14 rounded-2xl font-black gap-2 shadow-lg text-base">
                    <Plus className="h-5 w-5" /> Initialize Shared Room
                  </Button>
                  <Button onClick={() => setIsManualRoomModalOpen(true)} variant="secondary" className="flex-1 h-14 rounded-2xl font-black gap-2 text-base">
                    <Calculator className="h-5 w-5" /> Launch Manual Ledger
                  </Button>
                  <Button onClick={() => setIsJoiningModalOpen(true)} variant="outline" className="flex-1 h-14 rounded-2xl font-black gap-2 text-base">
                    <Share2 className="h-5 w-5" /> Join Existing Room
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 px-1">
                  {decryptedGroups?.map(group => {
                    const members = Array.isArray(group.members) ? group.members : [];
                    return (
                      <Card 
                        key={group.id} 
                        className={cn(
                          "group cursor-pointer hover:ring-2 transition-all rounded-3xl border-none ring-1 overflow-hidden relative",
                          group.isManual ? "ring-secondary/30 bg-secondary/[0.03] hover:ring-secondary/60" : "ring-border bg-card hover:ring-primary/50"
                        )}
                        onClick={() => setSelectedGroupId(group.id)}
                      >
                        <CardHeader className={cn("pb-4", group.isManual ? "bg-secondary/20" : "bg-muted/30")}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-8">
                              <div className="flex items-center gap-2 mb-1">
                                {group.isManual ? <Calculator className="h-3.5 w-3.5 text-secondary-foreground" /> : <Users className="h-3.5 w-3.5 text-primary" />}
                                <CardTitle className="text-xl font-black tracking-tight truncate">{group.name}</CardTitle>
                              </div>
                              <CardDescription className={cn("text-[10px] uppercase font-black tracking-widest", group.isManual ? "text-secondary-foreground font-bold" : "text-primary")}>
                                {group.isManual ? "Standalone Mode" : `Join Code: ${group.id}`}
                              </CardDescription>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                          </div>
                          {group.createdBy === user?.uid && (
                            <Button variant="ghost" size="icon" className="absolute right-12 top-6 h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setRoomToDelete(group.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="pt-4 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {members.slice(0, 4).map((m: any) => (
                              <div key={m.userId} title={m.userName} className={cn("h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-black text-white", group.isManual ? "bg-secondary" : "bg-primary")}>{(m.userName || 'U')[0].toUpperCase()}</div>
                            ))}
                            {members.length > 4 && <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-black">+{members.length - 4}</div>}
                          </div>
                          <Badge variant={group.isManual ? "secondary" : "default"} className={cn("font-black text-[10px] uppercase", group.isManual && "bg-secondary/20 text-secondary-foreground")}>{members.length} Members</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="animate-in fade-in slide-in-from-right-2">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                  <div className="bg-primary/10 px-6 py-4 rounded-3xl border border-primary/20 flex flex-col items-center md:items-start w-full md:w-auto shadow-sm">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Total Receivable</p>
                    <p className="text-3xl font-black text-primary tracking-tighter">₹{totalOwed.toLocaleString()}</p>
                  </div>
                </div>

                <Card className="shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-base font-black flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Secure New Debt Record</CardTitle></CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Debtor Name</Label>
                        <Input placeholder="Private Identity..." value={newDebt.debtorName} onChange={e => setNewDebt({...newDebt, debtorName: e.target.value})} className="h-11 rounded-xl uppercase font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Amount (₹)</Label>
                        <Input type="number" placeholder="0.00" value={newDebt.amount} onChange={e => setNewDebt({...newDebt, amount: e.target.value})} className="h-11 rounded-xl font-black text-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Confidential Notes</Label>
                        <Input placeholder="e.g. For dinner last Friday" value={newDebt.description} onChange={e => setNewDebt({...newDebt, description: e.target.value})} className="h-11 rounded-xl" />
                      </div>
                    </div>
                    <Button onClick={addDebt} className="w-full mt-8 h-12 rounded-2xl font-black shadow-lg text-base"><Plus className="mr-2 h-5 w-5" /> Secure Record in Debt Ledger</Button>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-lg font-black flex items-center gap-2 pl-2"><HandCoins className="h-4 w-4 text-primary" /> Personal Debt Records</h3>
                  <div className="grid gap-3">
                    {decryptedDebts?.length === 0 ? (
                      <Card className="p-20 border-dashed border-2 flex flex-col items-center justify-center opacity-40 grayscale space-y-4 rounded-3xl"><HandCoins className="h-12 w-12" /><p className="text-sm font-black uppercase tracking-widest">Ledger is empty</p></Card>
                    ) : (
                      decryptedDebts?.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((debt) => (
                        <div key={debt.id} className={cn("group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-3xl border transition-all duration-300 shadow-sm gap-4 relative overflow-hidden", debt.isPaid ? "bg-muted/30 border-muted opacity-60" : "bg-card border-border hover:border-primary/50 hover:shadow-md ring-1 ring-transparent hover:ring-primary/10")}>
                          <div className="flex items-center gap-4 relative z-10">
                            <button onClick={() => togglePaid(debt.id, debt.isPaid)} className={cn("p-2 rounded-xl transition-all duration-300 flex-shrink-0", debt.isPaid ? "text-green-600 bg-green-100 shadow-inner" : "text-muted-foreground hover:text-primary hover:bg-primary/10 bg-muted/20")}>
                              {debt.isPaid ? <CheckCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                            </button>
                            <div className="min-w-0">
                              <h4 className={cn("font-black text-xl truncate tracking-tight", debt.isPaid && "line-through text-muted-foreground opacity-70")}>{debt.debtorName}</h4>
                              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                                {debt.description || "Secured Note"} <Separator orientation="vertical" className="h-2" /> {new Date(debt.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto relative z-10">
                            <div className="text-right">
                              <p className={cn("text-2xl font-black tracking-tighter", debt.isPaid ? "text-muted-foreground line-through opacity-50" : "text-primary")}>₹{debt.amount.toLocaleString()}</p>
                              {debt.isPaid && <span className="text-[8px] font-black uppercase text-green-600 tracking-widest">Reconciled</span>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteDebt(debt.id)} className="text-destructive h-10 w-10 rounded-xl hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></Button>
                          </div>
                          {!debt.isPaid && <HandCoins className="absolute -right-4 -bottom-4 h-24 w-24 text-primary/[0.03] -rotate-12 pointer-events-none" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedGroupId(null)} className="h-10 w-10 rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 group">
                  {isEditingRoomName ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                      <Input value={editedRoomName} onChange={(e) => setEditedRoomName(e.target.value)} className="h-8 w-48 font-black text-xl bg-muted/20 border-primary/20 focus:ring-primary/20 uppercase" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateRoomName()} />
                      <Button size="icon" variant="ghost" onClick={handleUpdateRoomName} className="h-8 w-8 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditingRoomName(false); setEditedRoomName(activeGroup?.name || ''); }} className="h-8 w-8 text-destructive hover:bg-red-50"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">{activeGroup ? activeGroup.name : "Verifying..."}</h2>
                      {activeGroup?.createdBy === user?.uid && <Button variant="ghost" size="icon" onClick={() => setIsEditingRoomName(true)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3.5 w-3.5" /></Button>}
                    </div>
                  )}
                  <Badge className={cn("hover:opacity-100 border-none font-black text-[8px] uppercase tracking-widest hidden sm:inline-flex", activeGroup?.isManual ? "bg-secondary/20 text-secondary-foreground" : "bg-green-100 text-green-700")}>{activeGroup?.isManual ? "Manual Ledger" : "Live Ledger"}</Badge>
                </div>
                <div className="flex items-center gap-2 group">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{activeGroup?.isManual ? "Standalone Ledger Mode" : `Room ID: ${selectedGroupId}`}</p>
                  {!activeGroup?.isManual && <button onClick={() => copyToClipboard(selectedGroupId || '')} className="opacity-50 hover:opacity-100 transition-opacity"><Copy className="h-3 w-3 text-muted-foreground hover:text-primary" /></button>}
                </div>
              </div>
            </div>
            
            <button onClick={() => setIsStatsModalOpen(true)} className="bg-primary/5 px-4 sm:px-6 py-3 rounded-2xl border border-primary/10 flex flex-row items-center gap-4 md:gap-8 hover:bg-primary/10 transition-all group cursor-pointer w-full md:w-auto">
              <div className="text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest group-hover:text-primary transition-colors">Shared Pool</p><p className="text-xl sm:text-2xl font-black text-primary">₹{stats?.totalSpent.toLocaleString() || '0'}</p></div>
              <Separator orientation="vertical" className="hidden sm:block h-8" />
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" /><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{(Array.isArray(activeGroup?.members) ? activeGroup.members.length : 0)} Active</span></div>
              <BarChart3 className="h-4 w-4 text-primary opacity-50 group-hover:opacity-100 transition-all sm:translate-x-2 sm:group-hover:translate-x-0" />
            </button>
          </header>

          {!activeGroup ? (
            <Card className="p-20 flex flex-col items-center justify-center border-dashed border-2 animate-pulse space-y-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="font-black uppercase text-xs tracking-widest text-muted-foreground">Authenticating...</p></Card>
          ) : (
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="add" className="rounded-xl font-black text-[10px] sm:text-xs gap-1 sm:gap-2"><Calculator className="h-3 w-3 sm:h-4 sm:h-4" /> Add Bill</TabsTrigger>
                <TabsTrigger value="balance" className="rounded-xl font-black text-[10px] sm:text-xs gap-1 sm:gap-2"><Scale className="h-3 w-3 sm:h-4 sm:h-4" /> Balances</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl font-black text-[10px] sm:text-xs gap-1 sm:gap-2"><History className="h-3 w-3 sm:h-4 sm:h-4" /> Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="animate-in fade-in slide-in-from-bottom-2 px-1">
                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="lg:col-span-7 shadow-xl rounded-3xl border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-4"><CardTitle className="text-base font-black flex items-center gap-2">Sync New Expense</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-6 px-4 sm:px-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                            <div className="flex gap-2">
                              <Input placeholder="What was this for?" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="h-11 rounded-xl uppercase font-bold" />
                              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={handleAICategorize} disabled={isAIThinking || !expenseDesc}>{isAIThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 text-primary" />}</Button>
                            </div>
                          </div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Label</Label><Select value={expenseCategoryId} onValueChange={setExpenseCategoryId}><SelectTrigger className="h-11 rounded-xl font-black"><SelectValue placeholder="Select Label" /></SelectTrigger><SelectContent>{filteredRoomCategories?.map(c => (<SelectItem key={c.id} value={c.id} className="font-black">{c.name}</SelectItem>))}</SelectContent></Select></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount (₹)</Label><div className="relative"><Input type="number" placeholder="0.00" value={expenseAmt} onChange={e => setExpenseAmt(e.target.value)} className="h-11 pl-9 rounded-xl font-black text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /><IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /></div></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paid By</Label><Select value={paidBy} onValueChange={setPaidBy}><SelectTrigger className="h-11 rounded-xl font-black"><SelectValue placeholder="Select Payer" /></SelectTrigger><SelectContent>{(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (<SelectItem key={m.userId} value={m.userId} className="font-black">{m.userName}</SelectItem>))}</SelectContent></Select></div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark Participants</Label><div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-2xl border border-dashed">{(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (<button key={m.userId} type="button" onClick={() => { setSelectedParticipants(prev => prev.includes(m.userId) ? prev.filter(uid => uid !== m.userId) : [...prev, m.userId]); }} className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border", selectedParticipants.includes(m.userId) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-border opacity-60")}>{selectedParticipants.includes(m.userId) && <Check className="h-3 w-3" />}{m.userName}</button>))}</div></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Split Calculation</Label><Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="w-full"><TabsList className="grid w-full grid-cols-3 h-9 p-1 rounded-xl"><TabsTrigger value="equal" className="text-[9px] font-black uppercase">Equal</TabsTrigger><TabsTrigger value="custom" className="text-[9px] font-black uppercase">₹ Manual</TabsTrigger><TabsTrigger value="percentage" className="text-[9px] font-black uppercase">% Manual</TabsTrigger></TabsList></Tabs></div>
                        </div>
                      </div>
                      {selectedParticipants.length > 0 && parseFloat(expenseAmt) > 0 && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                          <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Allocation Ledger</p><Badge variant={splitValidation.isValid ? "secondary" : "destructive"} className="text-[8px] font-black uppercase">{splitValidation.message}</Badge></div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedParticipants.map((uid) => {
                              const members = Array.isArray(activeGroup?.members) ? activeGroup.members : [];
                              const name = members.find((m: any) => m.userId === uid)?.userName || 'User';
                              return (
                                <div key={uid} className="flex flex-col gap-1.5 bg-background/50 p-3 rounded-xl border shadow-sm">
                                  <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase truncate max-w-[100px] opacity-70">{name}</span></div>
                                  <div className="relative"><Input type="number" placeholder="0.00" value={customSplits[uid] || ''} onChange={(e) => { if (splitType === 'equal') setSplitType('custom'); setCustomSplits({...customSplits, [uid]: e.target.value}); }} className="h-8 pl-7 text-xs font-bold rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />{splitType === 'percentage' ? (<><Percent className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><span className="absolute right-2 top-2 text-[10px] font-black text-muted-foreground">≈ ₹{previewSplits[uid]?.toFixed(2)}</span></>) : (<IndianRupee className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-muted/10 border-t py-4"><Button onClick={handleAddExpense} disabled={!splitValidation.isValid} className="w-full h-12 rounded-2xl font-black shadow-lg gap-2 text-base"><CheckCircle2 className="h-5 w-5" /> Sync to Shared Ledger</Button></CardFooter>
                  </Card>
                  <div className="lg:col-span-5 space-y-6">
                    <Card className="shadow-lg rounded-3xl border-none ring-1 ring-border overflow-hidden">
                      <CardHeader className="bg-muted/30 pb-3 px-4 sm:px-6"><CardTitle className="text-sm font-black flex items-center gap-2"><Users className="h-4 w-4" /> Room Members</CardTitle></CardHeader>
                      <CardContent className="pt-4 space-y-3 px-4 sm:px-6">
                        {(Array.isArray(activeGroup?.members) ? activeGroup.members : []).map((m: any) => (
                          <div key={m.userId} className="flex items-center justify-between p-3 rounded-2xl bg-muted/10 border border-dashed group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0", activeGroup?.isManual ? "bg-secondary" : "bg-primary/10 !text-primary")}>{(m.userName || 'U')[0].toUpperCase()}</div>
                              <div className="flex flex-col min-w-0 flex-1">
                                {editingMemberId === m.userId ? (
                                  <div className="flex items-center gap-2 animate-in slide-in-from-left-1 w-full"><Input value={editedMemberName} onChange={e => setEditedMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateMemberName(m.userId)} className="h-7 text-xs font-black uppercase py-0 px-2 bg-background border-primary/30" autoFocus /><button onClick={() => handleUpdateMemberName(m.userId)} className="text-green-600"><Check className="h-3.5 w-3.5" /></button><button onClick={() => setEditingMemberId(null)} className="text-destructive"><X className="h-3.5 w-3.5" /></button></div>
                                ) : (
                                  <div className="flex items-center gap-2 group/name"><span className="text-sm font-black uppercase tracking-tight truncate">{m.userName}</span>{user?.uid === activeGroup?.createdBy && (<button onClick={() => { setEditingMemberId(m.userId); setEditedMemberName(m.userName); }} className="opacity-0 group-hover/name:opacity-100 text-muted-foreground hover:text-primary transition-opacity"><Pencil className="h-3 w-3" /></button>)}</div>
                                )}{m.userId === activeGroup?.createdBy && <span className="text-[8px] font-black uppercase text-orange-600">Room Admin</span>}
                              </div>
                            </div>
                            {user?.uid === activeGroup?.createdBy && m.userId !== user?.uid && !editingMemberId && (<Button variant="ghost" size="icon" onClick={() => handleKickMember(m.userId)} className="h-8 w-8 text-destructive opacity-50 group-hover:opacity-100 transition-opacity"><UserMinus className="h-4 w-4" /></Button>)}
                          </div>
                        ))}
                        {user?.uid === activeGroup?.createdBy && (
                          <div className="pt-4 mt-2 border-t border-dashed space-y-2"><Button variant="outline" className="w-full h-10 rounded-xl font-black gap-2 text-[10px] uppercase" onClick={() => setIsAddMemberModalOpen(true)}><Plus className="h-4 w-4" /> Add Member</Button>{!activeGroup?.isManual && (<Button variant="ghost" className="w-full h-10 rounded-xl font-black gap-2 text-[10px] uppercase text-muted-foreground" onClick={() => copyToClipboard(activeGroup?.id || '')}><UserPlus className="h-4 w-4" /> Invite via Code</Button>)}</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="balance" className="animate-in fade-in slide-in-from-right-2 px-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stats?.balances.map(b => (
                    <Card key={b.userId} className={cn("rounded-3xl border-none ring-1 shadow-md transition-all", b.net > 0 ? "ring-green-500/30 bg-green-50/10" : b.net < 0 ? "ring-red-500/30 bg-red-50/10" : "ring-border")}>
                      <CardHeader className="pb-2"><CardTitle className="text-base font-black flex items-center gap-3"><div className={cn("h-8 w-8 rounded-xl border flex items-center justify-center font-black", activeGroup?.isManual ? "bg-secondary text-secondary-foreground" : "bg-background text-primary")}>{(b.userName || 'U')[0].toUpperCase()}</div>{b.userName}</CardTitle></CardHeader>
                      <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase opacity-60"><div className="p-2 bg-background rounded-xl border">Paid: ₹{b.paid.toLocaleString()}</div><div className="p-2 bg-background rounded-xl border">Share: ₹{b.share.toLocaleString()}</div></div><div className="pt-3 border-t"><p className="text-[9px] font-black uppercase tracking-widest opacity-60">Net Ledger Balance</p><div className="flex items-center justify-between"><p className={cn("text-2xl font-black tracking-tighter", b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-600" : "text-muted-foreground")}>{b.net > 0 ? `+₹${b.net.toFixed(0)}` : b.net < 0 ? `-₹${Math.abs(b.net).toFixed(0)}` : 'Settled'}</p>{b.net > 0 ? <TrendingUp className="h-6 w-6 text-green-600 opacity-20" /> : <TrendingDown className="h-6 w-6 text-red-600 opacity-20" />}</div></div></CardContent>
                      {b.net < 0 && b.userId === user?.uid && (<CardFooter className="pt-0"><Select onValueChange={(toUid) => handleSettle(b.userId, b.userName, toUid, Math.abs(b.net))}><SelectTrigger className="h-10 text-[10px] font-black uppercase rounded-xl"><SelectValue placeholder="Settle Bill To..." /></SelectTrigger><SelectContent>{(Array.isArray(activeGroup?.members) ? activeGroup.members : []).filter((m: any) => m.userId !== b.userId).map((m: any) => (<SelectItem key={m.userId} value={m.userId} className="text-[10px] font-black">{m.userName}</SelectItem>))}</SelectContent></Select></CardFooter>)}
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="animate-in fade-in slide-in-from-left-2 px-1">
                <Card className="rounded-3xl border-none ring-1 ring-border overflow-hidden">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {expenses?.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(exp => (
                        <div key={exp.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start mb-4"><div className="space-y-1"><h4 className="font-black text-base sm:text-lg tracking-tight">{exp.description}{roomCategories?.find(c => c.id === exp.expenseCategoryId)?.name && <Badge variant="secondary" className="ml-2 text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">{roomCategories?.find(c => c.id === exp.expenseCategoryId)?.name}</Badge>}</h4><p className="text-[10px] text-muted-foreground font-black uppercase"><span className="text-primary">{exp.paidByName}</span> paid ₹{exp.amount}</p></div><Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{exp.splitType} split</Badge></div>
                          <div className="flex flex-wrap gap-2">{Object.entries(exp.splits || {}).map(([uid, share]: any) => share > 0 ? (<div key={uid} className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-muted/20 rounded-full border border-dashed"><span className="text-[8px] sm:text-[9px] font-black uppercase opacity-60">{activeGroup?.members.find((m: any) => m.userId === uid)?.userName || 'User'}</span><span className="text-[9px] sm:text-[10px] font-black">₹{share.toFixed(0)}</span></div>) : null)}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="rounded-3xl max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tighter">Initialize Room</DialogTitle><DialogDescription className="text-sm font-medium">Setup a private collaborative workspace.</DialogDescription></DialogHeader>
          <div className="py-6 space-y-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">Room Name</Label><Input placeholder="e.g. TRIP TO LADAKH" value={roomName} onChange={e => setRoomName(e.target.value)} className="h-12 rounded-2xl uppercase font-bold" /></div></div>
          <DialogFooter><Button onClick={handleCreateRoom} disabled={isProcessing} className="w-full h-12 rounded-2xl font-black">{isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Launch Room"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
