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
  Copy
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
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-4 pb-8">
        {/* Profile Hero - Compact */}
        <div className="relative">
          <div className="h-20 md:h-32 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-[1rem] md:rounded-[1.5rem] shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all duration-700" />
            <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -top-10 -left-10 h-32 w-32 bg-primary-foreground/10 rounded-full blur-xl" />
          </div>
          
          <div className="px-3 md:px-8 -mt-8 md:-mt-10 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-2 md:gap-4">
              <div className="p-0.5 bg-background rounded-full shadow-md border-[2px] border-background relative">
                <Avatar className="h-14 w-14 md:h-20 md:w-20 border border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-lg md:text-2xl font-black">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0.5 right-0.5 h-3 w-3 md:h-4 md:w-4 bg-green-500 border-2 border-background rounded-full shadow-sm" title="Secured Session" />
              </div>
              
              <div className="text-center md:text-left space-y-0 mb-0.5">
                <div className="flex items-center justify-center md:justify-start gap-1.5 group">
                  {isEditing ? (
                    <div className="flex items-center gap-1 animate-in slide-in-from-left-1">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-6 md:h-7 w-28 md:w-48 font-black text-sm md:text-lg bg-muted/40 border-primary/20 focus:ring-primary/20 uppercase py-0"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-5 w-5 md:h-6 md:w-6 text-green-600 hover:bg-green-50">
                        {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(user?.displayName || user?.email?.split('@')[0] || ''); }} className="h-5 w-5 md:h-6 md:w-6 text-destructive hover:bg-red-50">
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-base md:text-xl font-black tracking-tight text-foreground uppercase">
                        {user?.displayName || user?.email?.split('@')[0] || 'User'}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-primary rounded-md">
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-0.5 md:gap-2">
                  <button 
                    onClick={copyUid}
                    className="text-muted-foreground font-bold text-[7px] md:text-[9px] uppercase tracking-wider flex items-center gap-1 hover:text-primary transition-all group/uid"
                    title="Click to copy UID"
                  >
                    <Fingerprint className="h-2 w-2" /> 
                    <span className="truncate max-w-[100px]">{user?.uid}</span>
                    <Copy className="h-2 w-2 opacity-0 group-hover/uid:opacity-100 transition-opacity" />
                  </button>
                  <Separator orientation="vertical" className="h-2 hidden md:block" />
                  <p className="text-muted-foreground font-bold text-[7px] md:text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-2 w-2" /> {creationDate}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center md:justify-end pb-0.5">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[6px] md:text-[8px] uppercase px-1.5 md:px-2 py-0 rounded-lg gap-1 shadow-sm">
                <ShieldCheck className="h-2 w-2" /> Identity Verified
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:gap-4 md:grid-cols-12 px-1">
          {/* Sidebar Info - Compact */}
          <div className="md:col-span-4 space-y-2 md:space-y-4">
            <Card className="rounded-[0.75rem] md:rounded-[1rem] border-none ring-1 ring-border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b py-2 md:py-3 px-3 md:px-4">
                <CardTitle className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identity Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <SummaryItem label="Global Alias" value={user?.displayName || 'N/A'} />
                  <SummaryItem label="Verified Login" value={user?.email || 'N/A'} />
                  <SummaryItem label="Node" value="Cloud Admin" />
                </div>
                
                <Separator className="border-dashed" />
                
                <div className="p-2 bg-muted/20 rounded-lg border text-center space-y-1">
                  <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-primary/40 mx-auto" />
                  <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground">Privacy Engine v1.0</p>
                  <p className="text-[5px] md:text-[6px] font-bold text-muted-foreground/60 leading-tight">
                    Data scrambled via<br/>AES-GCM-256 standard
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Tightened */}
          <div className="md:col-span-8 space-y-2 md:space-y-4">
            <Card className="rounded-[0.75rem] md:rounded-[1rem] border-none ring-1 ring-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-2 md:py-3 px-3 md:px-5">
                <CardTitle className="text-xs md:text-sm font-black flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Account Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-5 space-y-3 md:space-y-4">
                <div className="grid gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-primary ml-1">Cryptographic Anchor (UID)</Label>
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-muted/20 border border-dashed flex items-center justify-between gap-2 group hover:bg-muted/30 transition-colors cursor-pointer" onClick={copyUid}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Fingerprint className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </div>
                        <code className="text-[8px] md:text-[10px] font-bold tracking-tight text-muted-foreground truncate font-mono">
                          {user?.uid}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Badge variant="secondary" className="font-black uppercase text-[5px] md:text-[6px] tracking-wider h-4 md:h-5 px-1 rounded-md">Primary Key</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <ProfileDetailCard 
                      icon={Lock} 
                      label="Engine" 
                      value="AES-GCM 256" 
                      sub="Standard"
                      color="text-blue-500"
                    />
                    <ProfileDetailCard 
                      icon={Zap} 
                      label="Session" 
                      value="Active" 
                      sub="Persistent"
                      color="text-green-500"
                    />
                    <ProfileDetailCard 
                      icon={Smartphone} 
                      label="Channel" 
                      value="Cloud" 
                      sub="Verified"
                      color="text-purple-500"
                    />
                    <ProfileDetailCard 
                      icon={Shield} 
                      label="Protocol" 
                      value="Zero-K" 
                      sub="Encrypted"
                      color="text-orange-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[0.75rem] md:rounded-[1rem] border-dashed border-2 bg-primary/5 overflow-hidden">
              <CardContent className="p-3 md:p-5 space-y-2 md:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-primary text-primary-foreground rounded-lg shadow-sm">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black tracking-tight leading-none">Security Architecture</h3>
                  </div>
                </div>
                
                <p className="text-[9px] md:text-[11px] text-muted-foreground leading-relaxed font-medium">
                  Your identity is protected by a unique cryptographic anchor. 
                  Every byte of data is encrypted <strong>before</strong> it leaves this browser using <strong>AES-GCM 256-bit</strong>.
                </p>

                <div className="flex flex-wrap gap-1">
                  {['Private Keys', 'Zero Visibility', 'Immutable'].map(tag => (
                    <Badge key={tag} variant="outline" className="bg-background font-black text-[5px] md:text-[7px] uppercase tracking-tighter px-1.5 py-0 rounded-md border-primary/20 text-primary/70">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ProfileDetailCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="p-2 md:p-3 rounded-lg md:rounded-xl border bg-card shadow-sm space-y-0.5 group hover:border-primary/40 transition-all duration-300">
      <div className="flex items-center gap-1 mb-0.5">
        <div className={cn("p-1 rounded-md bg-muted/50 transition-colors group-hover:bg-primary/10", color)}>
          <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
        </div>
        <span className="text-[5px] md:text-[7px] font-black uppercase tracking-tight text-muted-foreground group-hover:text-primary transition-colors truncate">{label}</span>
      </div>
      <p className="text-[9px] md:text-[11px] font-black truncate tracking-tight">{value}</p>
      <p className="text-[5px] md:text-[7px] font-bold text-muted-foreground/60 uppercase truncate">{sub}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-0">
      <p className="text-[5px] md:text-[6px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</p>
      <p className="text-[9px] md:text-[10px] font-black truncate">{value}</p>
    </div>
  );
}
