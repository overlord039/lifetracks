
"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Wallet, 
  BookText, 
  BarChart3, 
  LogOut,
  HandCoins,
  Calculator,
  ShieldCheck,
  Unlock,
  Lock
} from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Salary Planner', url: '/salary-planner', icon: Calculator },
  { title: 'Learning', url: '/learning', icon: GraduationCap },
  { title: 'Budget', url: '/budget', icon: Wallet },
  { title: 'Debts', url: '/debts', icon: HandCoins },
  { title: 'Diary', url: '/diary', icon: BookText },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [privacyKey, setPrivacyKey] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('lifetrack_privacy_key');
    if (savedKey) {
      setPrivacyKey(savedKey);
    } else if (pathname !== '/login') {
      setIsKeyModalOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const savePrivacyKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem('lifetrack_privacy_key', tempKey);
    setPrivacyKey(tempKey);
    setIsKeyModalOpen(false);
    toast({ title: "Privacy Key Set", description: "Your dashboard is now end-to-end encrypted." });
    window.location.reload(); // Refresh to re-decrypt all state
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 flex flex-row items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="font-headline font-bold text-xl tracking-tight">LifeTrack</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 space-y-4">
            <div className="flex flex-col gap-2 p-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsKeyModalOpen(true)} 
                className="mt-2 h-7 text-[10px] uppercase font-bold tracking-tighter"
              >
                {privacyKey ? <Lock className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                Privacy Key
              </Button>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                {navItems.find(item => item.url === pathname)?.title || 'Dashboard'}
                {privacyKey && <ShieldCheck className="h-4 w-4 text-green-500" title="End-to-End Encrypted" />}
              </h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>

      <Dialog open={isKeyModalOpen} onOpenChange={(o) => pathname !== '/login' && setIsKeyModalOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Set Master Privacy Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              This key encrypts your entire life track. It is stored <strong>only on this device</strong>.
              If lost, your cloud data remains scrambled and unreadable forever.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Master Key</Label>
              <Input 
                type="password" 
                placeholder="Enter secret passphrase..." 
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePrivacyKey()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePrivacyKey} className="w-full font-bold">
              <Unlock className="mr-2 h-4 w-4" /> Unlock Vault
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
