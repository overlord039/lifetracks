
"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, CheckCircle, Circle, HandCoins, UserPlus, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DebtsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newDebt, setNewDebt] = useState({ debtorName: '', amount: '', description: '' });

  const debtsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'debts');
  }, [db, user]);

  const { data: debts, isLoading } = useCollection(debtsRef);

  const addDebt = () => {
    if (!newDebt.debtorName || !newDebt.amount || !debtsRef) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please enter a name and amount.' });
      return;
    }
    
    addDocumentNonBlocking(debtsRef, {
      userId: user?.uid,
      debtorName: newDebt.debtorName,
      amount: parseFloat(newDebt.amount),
      description: newDebt.description || '',
      isPaid: false,
      createdAt: new Date().toISOString()
    });

    setNewDebt({ debtorName: '', amount: '', description: '' });
    toast({ title: "Debt Added", description: `You're tracking what ${newDebt.debtorName} owes you.` });
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

  const totalOwed = debts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl text-primary">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">Debt Collector</h2>
              <p className="text-sm text-muted-foreground">Track money others owe you.</p>
            </div>
          </div>
          <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20">
            <p className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">Total Receivable</p>
            <p className="text-2xl font-black text-primary">₹{totalOwed.toLocaleString()}</p>
          </div>
        </div>

        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              New Record
            </CardTitle>
            <CardDescription>Enter details of the person who owes you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Debtor Name</Label>
                <Input 
                  placeholder="e.g. Rahul" 
                  value={newDebt.debtorName} 
                  onChange={e => setNewDebt({...newDebt, debtorName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={newDebt.amount} 
                  onChange={e => setNewDebt({...newDebt, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="Reason for debt" 
                  value={newDebt.description} 
                  onChange={e => setNewDebt({...newDebt, description: e.target.value})} 
                />
              </div>
            </div>
            <Button onClick={addDebt} className="w-full mt-6 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Log Debt
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Active Receivables
          </h3>
          
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground italic">Loading your records...</div>
            ) : debts?.length === 0 ? (
              <Card className="p-10 border-dashed text-center text-muted-foreground italic">
                No debts recorded yet. Start by adding one above.
              </Card>
            ) : (
              debts?.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((debt) => (
                <div 
                  key={debt.id} 
                  className={cn(
                    "group flex items-center justify-between p-4 border rounded-xl transition-all duration-300 shadow-sm",
                    debt.isPaid ? "bg-muted/30 border-muted opacity-60" : "bg-card hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePaid(debt.id, debt.isPaid)}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        debt.isPaid ? "text-green-600 bg-green-100" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      )}
                    >
                      {debt.isPaid ? <CheckCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div>
                      <h4 className={cn(
                        "font-black text-lg",
                        debt.isPaid && "line-through text-muted-foreground"
                      )}>
                        {debt.debtorName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {debt.description || "No notes provided"} • {new Date(debt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-black",
                        debt.isPaid ? "text-muted-foreground line-through" : "text-primary"
                      )}>
                        ₹{debt.amount.toLocaleString()}
                      </p>
                      {debt.isPaid && <span className="text-[10px] font-bold uppercase text-green-600">Paid</span>}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteDebt(debt.id)}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
