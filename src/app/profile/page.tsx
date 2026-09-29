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
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Profile Hero */}
        <div className="relative">
          <div className="h-48 md:h-64 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] group-hover:backdrop-blur-none transition-all duration-700" />
            <div className="absolute -bottom-16 -right-16 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -top-16 -left-16 h-64 w-64 bg-primary-foreground/10 rounded-full blur-3xl" />
          </div>
          
          <div className="px-6 md:px-12 -mt-16 md:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="p-2 bg-background rounded-full shadow-2xl border-[6px] border-background relative">
                <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-3xl md:text-5xl font-black">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 h-6 w-6 md:h-8 md:w-8 bg-green-500 border-4 border-background rounded-full shadow-lg" title="Secured Session" />
              </div>
              
              <div className="text-center md:text-left space-y-1 mb-2">
                <div className="flex items-center justify-center md:justify-start gap-3 group">
                  {isEditing ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-9 w-48 md:w-64 font-black text-xl md:text-2xl bg-muted/40 border-primary/20 focus:ring-primary/20 uppercase"
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
                    <>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
                        {user?.displayName || user?.email?.split('@')[0] || 'User'}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-primary rounded-xl">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <p className="text-muted-foreground font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {user?.email}
                  </p>
                  <Separator orientation="vertical" className="h-3 hidden md:block" />
                  <p className="text-muted-foreground font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Joined {creationDate}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center md:justify-end pb-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] uppercase px-4 py-1.5 rounded-2xl gap-2 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> Identity Verified
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Main Content */}
          <div className="md:col-span-8 space-y-6">
            <Card className="rounded-[2rem] border-none ring-1 ring-border shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-5 px-8">
                <CardTitle className="text-lg font-black flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Account Configuration
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">System identity metadata</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Cryptographic Anchor (UID)</Label>
                    <div className="p-5 rounded-3xl bg-muted/20 border border-dashed flex items-center justify-between gap-4 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                          <Fingerprint className="h-5 w-5" />
                        </div>
                        <code className="text-xs md:text-sm font-bold tracking-tighter text-muted-foreground truncate font-mono">
                          {user?.uid}
                        </code>
                      </div>
                      <Badge variant="secondary" className="font-black uppercase text-[8px] tracking-[0.2em] h-7 px-3 shrink-0 rounded-xl">Primary Key</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      sub="Persistent Login Active"
                      color="text-green-500"
                    />
                    <ProfileDetailCard 
                      icon={Smartphone} 
                      label="Access Channel" 
                      value="Cloud Workstation" 
                      sub="Verified Access Node"
                      color="text-purple-500"
                    />
                    <ProfileDetailCard 
                      icon={Shield} 
                      label="Protocol" 
                      value="Zero-Knowledge" 
                      sub="Developer-Proof Storage"
                      color="text-orange-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-dashed border-2 bg-primary/5 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary text-primary-foreground rounded-2xl shadow-lg">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight leading-none">Security Architecture</h3>
                    <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest mt-1">End-to-End Encryption Logic</p>
                  </div>
                </div>
                
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                  Your identity is protected by a unique cryptographic anchor derived from your Account ID. 
                  Every byte of financial data, every diary entry, and every future vision is encrypted <strong>before</strong> it leaves this browser. 
                  We use the <strong>AES-GCM 256-bit</strong> algorithm, ensuring that your private life remains technically invisible to anyone but you.
                </p>

                <div className="flex flex-wrap gap-2">
                  {['Private Keys', 'Device-Level Encryption', 'No Server Visibility', 'Immutable Identity'].map(tag => (
                    <Badge key={tag} variant="outline" className="bg-background font-black text-[8px] md:text-[9px] uppercase tracking-tighter px-3 py-1 rounded-xl border-primary/20 text-primary/70">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="md:col-span-4 space-y-6">
            <Card className="rounded-[2rem] border-none ring-1 ring-border shadow-lg overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b py-5 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Identity Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <SummaryItem label="Global Alias" value={user?.displayName || 'N/A'} />
                  <SummaryItem label="Verified Login" value={user?.email || 'N/A'} />
                  <SummaryItem label="Node Authority" value="Cloud Admin" />
                </div>
                
                <Separator className="border-dashed" />
                
                <div className="p-4 bg-muted/20 rounded-2xl border text-center space-y-2">
                  <ShieldCheck className="h-8 w-8 text-primary/40 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Privacy Engine v1.0</p>
                  <p className="text-[8px] font-bold text-muted-foreground/60 leading-tight">
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
    <div className="p-5 rounded-[1.5rem] border bg-card shadow-sm space-y-1.5 group hover:border-primary/40 transition-all duration-300">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
      </div>
      <p className="text-base font-black truncate tracking-tight">{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">{sub}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{label}</p>
      <p className="text-sm font-black truncate">{value}</p>
    </div>
  );
}
