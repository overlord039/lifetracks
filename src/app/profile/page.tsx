
"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { useUser, useFirestore, updateDocumentNonBlocking, useAuth } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Fingerprint, Mail, KeyRound, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setNewName(user.displayName);
    } else if (user?.email) {
      setNewName(user.email.split('@')[0]);
    }
  }, [user]);

  const handleSave = async () => {
    if (!auth.currentUser || !newName.trim()) return;
    setIsSaving(true);
    try {
      // Update Firebase Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: newName.trim()
      });

      // Update Firestore User Document
      if (db) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        updateDocumentNonBlocking(userRef, {
          displayName: newName.trim(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({ title: "Identity Updated", description: "Your public alias has been synchronized." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden border-none ring-1 ring-border shadow-2xl rounded-3xl">
          <div className="h-32 bg-primary relative">
            <div className="absolute -bottom-12 left-8 p-2 bg-background rounded-3xl shadow-xl border-4 border-background">
              <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-12 w-12" />
              </div>
            </div>
          </div>
          <CardContent className="pt-16 pb-8 px-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tighter">Identity Vault</h2>
                <div className="flex items-center gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 w-48 font-black text-lg bg-muted/20 border-primary/20 focus:ring-primary/20"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-8 w-8 text-green-600 hover:bg-green-50">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(user?.displayName || user?.email?.split('@')[0] || ''); }} className="h-8 w-8 text-destructive hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-black text-primary tracking-tight">
                        {user?.displayName || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-sm font-medium">Your account is anchored by a unique primary key.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="p-5 rounded-2xl bg-muted/30 border border-dashed flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unique Account ID (Primary Key)</p>
                    <p className="text-sm font-black font-mono tracking-tight break-all">{user?.uid}</p>
                  </div>
                </div>
                <Badge className="font-black uppercase text-[10px] tracking-widest h-6 px-3 shrink-0">Track ID</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileItem icon={Mail} label="Verified Email" value={user?.email || 'N/A'} />
                <ProfileItem icon={Shield} label="Security Engine" value="AES-GCM 256-bit" color="text-green-600" />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-tight">Security Protocol</h3>
              </div>
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your <strong>Account ID</strong> serves as the primary cryptographic anchor for your session. 
                  All financial splits, diary entries, and budget targets are automatically encrypted on your device using keys derived from this identifier.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-background">End-to-End Encrypted</Badge>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-background">Zero-Knowledge Storage</Badge>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-background">Immutable ID</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ProfileItem({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-1 group hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={cn("text-sm font-black truncate", color)}>{value}</p>
    </div>
  );
}
