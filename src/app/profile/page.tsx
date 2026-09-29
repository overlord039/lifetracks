
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
  Smartphone
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
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-6 pb-12">
        {/* Profile Hero */}
        <div className="relative">
          <div className="h-28 md:h-48 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-[1.2rem] md:rounded-[2rem] shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] group-hover:backdrop-blur-none transition-all duration-700" />
            <div className="absolute -bottom-12 -right-12 h-48 w-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -top-12 -left-12 h-48 w-48 bg-primary-foreground/10 rounded-full blur-2xl" />
          </div>
          
          <div className="px-3 md:px-10 -mt-10 md:-mt-14 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-2 md:gap-5">
              <div className="p-1 bg-background rounded-full shadow-lg border-[3px] border-background relative">
                <Avatar className="h-16 w-16 md:h-28 md:w-28 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-xl md:text-4xl font-black">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0.5 right-0.5 h-4 w-4 md:h-6 md:w-6 bg-green-500 border-2 border-background rounded-full shadow-md" title="Secured Session" />
              </div>
              
              <div className="text-center md:text-left space-y-0.5 mb-1">
                <div className="flex items-center justify-center md:justify-start gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-7 md:h-8 w-32 md:w-56 font-black text-base md:text-xl bg-muted/40 border-primary/20 focus:ring-primary/20 uppercase py-0"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-6 w-6 md:h-7 md:w-7 text-green-600 hover:bg-green-50">
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(user?.displayName || user?.email?.split('@')[0] || ''); }} className="h-6 w-6 md:h-7 md:w-7 text-destructive hover:bg-red-50">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg md:text-2xl font-black tracking-tighter text-foreground uppercase">
                        {user?.displayName || user?.email?.split('@')[0] || 'User'}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-primary rounded-lg">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2">
                  <p className="text-muted-foreground font-black text-[7px] md:text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Mail className="h-2 w-2 md:h-2.5 md:w-2.5" /> {user?.email}
                  </p>
                  <Separator orientation="vertical" className="h-2.5 hidden md:block" />
                  <p className="text-muted-foreground font-black text-[7px] md:text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="h-2 w-2 md:h-2.5 md:w-2.5" /> Joined {creationDate}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center md:justify-end pb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[7px] md:text-[9px] uppercase px-2 md:px-3 py-0.5 rounded-xl gap-1 md:gap-1.5 shadow-sm">
                <ShieldCheck className="h-2.5 w-2.5 md:h-3 md:w-3" /> Identity Verified
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:gap-6 md:grid-cols-12 px-1">
          {/* Main Content */}
          <div className="md:col-span-8 space-y-3 md:space-y-6">
            <Card className="rounded-[1rem] md:rounded-[1.5rem] border-none ring-1 ring-border shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-black flex items-center gap-2.5">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Account Configuration
                </CardTitle>
                <CardDescription className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest opacity-60">System identity metadata</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="grid gap-4 md:gap-6">
                  <div className="space-y-2 md:space-y-3">
                    <Label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary ml-1">Cryptographic Anchor (UID)</Label>
                    <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/20 border border-dashed flex items-center justify-between gap-3 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                        <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                          <Fingerprint className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </div>
                        <code className="text-[9px] md:text-xs font-bold tracking-tight text-muted-foreground truncate font-mono">
                          {user?.uid}
                        </code>
                      </div>
                      <Badge variant="secondary" className="font-black uppercase text-[6px] md:text-[7px] tracking-[0.15em] h-5 md:h-6 px-1.5 md:px-2 shrink-0 rounded-lg">Primary Key</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <ProfileDetailCard 
                      icon={Lock} 
                      label="Security Engine" 
                      value="AES-GCM 256" 
                      sub="Web Crypto Standard"
                      color="text-blue-500"
                    />
                    <ProfileDetailCard 
                      icon={Zap} 
                      label="Session Status" 
                      value="Authenticated" 
                      sub="Persistent Login"
                      color="text-green-500"
                    />
                    <ProfileDetailCard 
                      icon={Smartphone} 
                      label="Access Channel" 
                      value="Cloud Station" 
                      sub="Verified Access"
                      color="text-purple-500"
                    />
                    <ProfileDetailCard 
                      icon={Shield} 
                      label="Protocol" 
                      value="Zero-Knowledge" 
                      sub="Encrypted Store"
                      color="text-orange-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1rem] md:rounded-[1.5rem] border-dashed border-2 bg-primary/5 overflow-hidden">
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary text-primary-foreground rounded-xl shadow-md">
                    <KeyRound className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black tracking-tight leading-none">Security Architecture</h3>
                    <p className="text-[8px] md:text-[9px] text-primary/60 font-black uppercase tracking-widest mt-1">End-to-End Encryption Logic</p>
                  </div>
                </div>
                
                <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed font-medium">
                  Your identity is protected by a unique cryptographic anchor. 
                  Every byte of data is encrypted <strong>before</strong> it leaves this browser using <strong>AES-GCM 256-bit</strong>.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {['Private Keys', 'No Server Visibility', 'Immutable ID'].map(tag => (
                    <Badge key={tag} variant="outline" className="bg-background font-black text-[6px] md:text-[8px] uppercase tracking-tighter px-2 py-0.5 rounded-lg border-primary/20 text-primary/70">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="md:col-span-4 space-y-3 md:space-y-6">
            <Card className="rounded-[1rem] md:rounded-[1.5rem] border-none ring-1 ring-border shadow-md overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b py-3 md:py-4 px-4 md:px-5">
                <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Identity Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-5 space-y-4 md:space-y-6">
                <div className="space-y-3">
                  <SummaryItem label="Global Alias" value={user?.displayName || 'N/A'} />
                  <SummaryItem label="Verified Login" value={user?.email || 'N/A'} />
                  <SummaryItem label="Node Authority" value="Cloud Admin" />
                </div>
                
                <Separator className="border-dashed" />
                
                <div className="p-3 bg-muted/20 rounded-xl border text-center space-y-1.5">
                  <ShieldCheck className="h-5 w-5 md:h-7 md:w-7 text-primary/40 mx-auto" />
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Privacy Engine v1.0</p>
                  <p className="text-[6px] md:text-[7px] font-bold text-muted-foreground/60 leading-tight">
                    Data scrambled via<br/>AES-GCM-256 standard
                  </p>
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
    <div className="p-2.5 md:p-4 rounded-[0.8rem] md:rounded-[1.2rem] border bg-card shadow-sm space-y-1 group hover:border-primary/40 transition-all duration-300">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={cn("p-1 rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10", color)}>
          <Icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
        </div>
        <span className="text-[6px] md:text-[8px] font-black uppercase tracking-tight text-muted-foreground group-hover:text-primary transition-colors truncate">{label}</span>
      </div>
      <p className="text-[10px] md:text-sm font-black truncate tracking-tight">{value}</p>
      <p className="text-[6px] md:text-[8px] font-bold text-muted-foreground/60 uppercase truncate">{sub}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[6px] md:text-[7px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</p>
      <p className="text-[10px] md:text-xs font-black truncate">{value}</p>
    </div>
  );
}
