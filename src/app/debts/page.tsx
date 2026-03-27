"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Plus, Trash2, CheckCircle, Circle, HandCoins, UserPlus, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { encryptData, decryptData, decryptNumber } from '@/lib/encryption';

export default function DebtsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newDebt, setNewDebt] = useState({ debtorName: '', amount: '', description: '' });
  const [decryptedDebts, setDecryptedDebts] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const debtsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'debts');
  }, [db, user]);

  const { data: rawDebts, isLoading: isRawLoading } = useCollection(debtsRef);

  useEffect(() => {
    const decryptAll = async () => {
      if (!rawDebts || !user) {
        setDecryptedDebts(rawDebts || []);
        return;
      }
      setIsDecrypting(true);
      const decrypted = await Promise.all(rawDebts.map(async (debt) => ({
        ...debt,
        debtorName: debt.isEncrypted ? await decryptData(debt.debtorName, user.uid) : debt.debtorName,
        amount: debt.isEncrypted ? await decryptNumber(debt.amount, user.uid) : debt.amount,
        description: debt.isEncrypted ? await decryptData(debt.description, user.uid) : debt.description,
      })));
      setDecryptedDebts(decrypted);
      setIsDecrypting(false);
    };
    decryptAll();
  }, [rawDebts, user]);

  const addDebt = async () => {
    if (!newDebt.debtorName || !newDebt.amount || !debtsRef || !user) {
      return;
    }
    
    const encryptedPayload = {
      userId: user?.uid,
      debtorName: await encryptData(newDebt.debtorName, user.uid),
      amount: await encryptData(newDebt.amount, user.uid),
      description: await encryptData(newDebt.description, user.uid),
      isPaid: false,
      isEncrypted: true,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(debtsRef, encryptedPayload);

    setNewDebt({ debtorName: '', amount: '', description: '' });
    toast({ title: "Record Secured" });
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
    toast({ title: "Record removed" });
  };

  const totalOwed = decryptedDebts?.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0) || 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl text-primary shadow-sm">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Debt Vault</h2>
              <p className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-widest">End-to-End Encrypted Receivables</p>
            </div>
          </div>
          <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20 flex flex-col items-center md:items-start">
            <p className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">Total Receivable</p>
            <p className="text-2xl font-black text-primary">₹{totalOwed.toLocaleString()}</p>
          </div>
        </div>

        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Protected Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Debtor Name</Label>
                <Input 
                  placeholder="Private Name..." 
                  value={newDebt.debtorName} 
                  onChange={e => setNewDebt({...newDebt, debtorName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Amount (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={newDebt.amount} 
                  onChange={e => setNewDebt({...newDebt, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Notes</Label>
                <Input 
                  placeholder="Private notes..." 
                  value={newDebt.description} 
                  onChange={e => setNewDebt({...newDebt, description: e.target.value})} 
                />
              </div>
            </div>
            <Button onClick={addDebt} className="w-full mt-6 shadow-md font-bold">
              <Plus className="mr-2 h-4 w-4" /> Secure Record
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Active Vault Records
          </h3>
          
          <div className="grid gap-3">
            {(isRawLoading || isDecrypting) ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-sm font-bold uppercase tracking-widest">Unlocking Data...</span>
              </div>
            ) : decryptedDebts?.length === 0 ? (
              <Card className="p-10 border-dashed text-center text-muted-foreground italic">
                No secure records found.
              </Card>
            ) : (
              decryptedDebts?.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((debt) => (
                <div 
                  key={debt.id} 
                  className={cn(
                    "group flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl transition-all duration-300 shadow-sm gap-4",
                    debt.isPaid ? "bg-muted/30 border-muted opacity-60" : "bg-card hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePaid(debt.id, debt.isPaid)}
                      className={cn(
                        "p-2 rounded-full transition-colors flex-shrink-0",
                        debt.isPaid ? "text-green-600 bg-green-100" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      )}
                    >
                      {debt.isPaid ? <CheckCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div className="min-w-0">
                      <h4 className={cn(
                        "font-black text-lg truncate",
                        debt.isPaid && "line-through text-muted-foreground"
                      )}>
                        {debt.debtorName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {debt.description || "No private notes"} • {new Date(debt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-black",
                        debt.isPaid ? "text-muted-foreground line-through" : "text-primary"
                      )}>
                        ₹{debt.amount.toLocaleString()}
                      </p>
                      {debt.isPaid && <span className="text-[10px] font-bold uppercase text-green-600">Reconciled</span>}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteDebt(debt.id)}
                      className="text-destructive h-8 w-8"
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
