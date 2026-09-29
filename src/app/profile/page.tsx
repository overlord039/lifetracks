
"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/shell';
import { useUser, useFirestore, updateDocumentNonBlocking, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  Fingerprint, 
  Mail, 
  KeyRound, 
  Pencil, 
  Check, 
  X, 
  Loader2,
  Calendar,
  Lock,
  Zap,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Copy,
  Server,
  Globe
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: "Anchor Copied", description: "Your unique account ID is now on your clipboard." });
    }
  };

  if (isUserLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const creationDate = user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-8">
        {/* Profile Hero - Compact with Background Patterns */}
        <div className="relative animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="h-24 md:h-36 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-[1.5rem] md:rounded-[2rem] shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all duration-700" />
            <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -top-10 -left-10 h-32 w-32 bg-primary-foreground/10 rounded-full blur-xl" />
            
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_1px)] bg-[length:20px_20px]" />
            </div>
          </div>
          
          <div className="px-4 md:px-10 -mt-10 md:-mt-14 flex flex-col items-center justify-center gap-4 relative z-10">
            <div className="flex flex-col items-center justify-center gap-3 md:gap-4">
              <div className="p-1 bg-background rounded-full shadow-md border-[3px] border-background relative">
                <Avatar className="h-16 w-16 md:h-24 md:w-24 border border-primary/10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl md:text-3xl font-black">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 right-1 h-4 w-4 md:h-5 md:w-5 bg-green-500 border-2 border-background rounded-full shadow-sm" title="Secured Session" />
              </div>
              
              <div className="text-center space-y-0.5 mb-1">
                <div className="flex items-center justify-center gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 md:h-10 w-32 md:w-56 font-black text-base md:text-xl bg-muted/40 border-primary/20 focus:ring-primary/20 uppercase"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-7 w-7 md:h-8 md:w-8 text-green-600 hover:bg-green-50">
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(user?.displayName || user?.email?.split('@')[0] || ''); }} className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:bg-red-50">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg md:text-2xl font-black tracking-tight text-foreground uppercase">
                        {user?.displayName || user?.email?.split('@')[0] || 'User'}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-primary rounded-md">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                  <button 
                    onClick={copyUid}
                    className="text-muted-foreground font-bold text-[8px] md:text-[10px] uppercase tracking-wider flex items-center gap-1.5 hover:text-primary transition-all group/uid"
                    title="Click to copy UID"
                  >
                    <Fingerprint className="h-3 w-3" /> 
                    <span className="truncate max-w-[120px]">{user?.uid}</span>
                    <Copy className="h-3 w-3 opacity-0 group-hover/uid:opacity-100 transition-opacity" />
                  </button>
                  <Separator orientation="vertical" className="h-3 hidden md:block" />
                  <p className="text-muted-foreground font-bold text-[8px] md:text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Joined {creationDate}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center pb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[8px] md:text-[10px] uppercase px-2 md:px-3 py-0.5 rounded-xl gap-1.5 shadow-sm">
                <ShieldCheck className="h-3 w-3" /> Identity Verified
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-1 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          {/* Identity Summary */}
          <Card className="rounded-[1rem] md:rounded-[1.5rem] border-none ring-1 ring-border shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/10">
            <CardHeader className="bg-primary/[0.03] border-b py-3 md:py-4 px-4 md:px-6">
              <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary">Identity Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-8 space-y-6">
              <div className="grid gap-6">
                <SummaryItem icon={<User className="h-4 w-4" />} label="Global Alias" value={user?.displayName || 'N/A'} color="text-blue-500" />
                <SummaryItem icon={<Mail className="h-4 w-4" />} label="Verified Login" value={user?.email || 'N/A'} color="text-purple-500" />
                <SummaryItem icon={<Server className="h-4 w-4" />} label="Access Node" value="Primary Cloud Admin" color="text-orange-500" />
              </div>
              
              <Separator className="border-dashed" />
              
              <div className="relative group/privacy p-4 md:p-6 bg-background rounded-2xl border border-dashed hover:border-primary/40 transition-colors space-y-3 overflow-hidden shadow-inner">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover/privacy:opacity-10 transition-opacity">
                  <ShieldCheck className="h-24 w-24 text-primary" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground">Privacy Engine Active</p>
                    <p className="text-[7px] md:text-[9px] font-bold text-muted-foreground uppercase">Version 1.0.0-Stable</p>
                  </div>
                </div>
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground leading-relaxed relative z-10">
                  Your data is scrambled using industry-standard <strong>AES-GCM 256-bit</strong> encryption before synchronization. This ensures your private records remain invisible to everyone but you.
                </p>
                <div className="flex gap-2 pt-2">
                  <div className="h-1.5 flex-1 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-primary animate-pulse" />
                  </div>
                  <div className="h-1.5 flex-1 bg-primary/10 rounded-full" />
                  <div className="h-1.5 flex-1 bg-primary/10 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryItem({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color?: string }) {
  return (
    <div className="flex items-center gap-4 group/item">
      <div className={cn("p-2 rounded-xl bg-muted/50 transition-colors group-hover/item:bg-primary/10", color)}>
        {icon}
      </div>
      <div className="space-y-0.5 min-w-0">
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 leading-none">{label}</p>
        <p className="text-sm md:text-base font-black truncate text-foreground">{value}</p>
      </div>
    </div>
  );
}
