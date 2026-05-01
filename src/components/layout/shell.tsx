"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Wallet, 
  BookText, 
  BarChart3, 
  LogOut,
  Calculator,
  ShieldCheck,
  Info,
  Users,
  Settings2,
  Check,
  X
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { id: 'dashboard', title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { id: 'salary-planner', title: 'Salary Planner', url: '/salary-planner', icon: Calculator },
  { id: 'budget', title: 'Budget', url: '/budget', icon: Wallet },
  { id: 'split-pay', title: 'Split & Debt', url: '/split-pay', icon: Users },
  { id: 'learning', title: 'Learning', url: '/learning', icon: GraduationCap },
  { id: 'diary', title: 'Diary', url: '/diary', icon: BookText },
  { id: 'reports', title: 'Reports', url: '/reports', icon: BarChart3 },
  { id: 'about', title: 'About', url: '/about', icon: Info },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lifetrack_nav_visibility');
    if (saved) {
      setVisibleSections(JSON.parse(saved));
    } else {
      const defaults = navItems.reduce((acc, item) => ({ ...acc, [item.id]: true }), {});
      setVisibleSections(defaults);
    }
    setMounted(true);
  }, []);

  const toggleSection = (id: string) => {
    const next = { ...visibleSections, [id]: !visibleSections[id] };
    setVisibleSections(next);
    localStorage.setItem('lifetrack_nav_visibility', JSON.stringify(next));
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => !mounted || visibleSections[item.id] !== false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-xl">L</span>
              </div>
              <span className="font-headline font-black text-xl tracking-tighter">LifeTrack</span>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-64 p-0 rounded-2xl shadow-2xl border-none ring-1 ring-border overflow-hidden">
                <div className="p-4 bg-muted/30 border-b">
                  <h3 className="text-sm font-black uppercase tracking-tight">Workspace Layout</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Toggle Visible Sections</p>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2 space-y-0.5">
                    {navItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-background rounded-lg border shadow-sm group-hover:border-primary/30 transition-colors">
                            <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <Label htmlFor={`nav-${item.id}`} className="font-bold text-[11px] uppercase tracking-tighter cursor-pointer">{item.title}</Label>
                        </div>
                        <Switch 
                          id={`nav-${item.id}`} 
                          className="scale-75 origin-right" 
                          checked={visibleSections[item.id] !== false} 
                          onCheckedChange={() => toggleSection(item.id)} 
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-3 bg-primary/5 border-t">
                   <p className="text-[9px] font-black text-primary uppercase text-center tracking-widest">Layout Saved Locally</p>
                </div>
              </PopoverContent>
            </Popover>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 pt-2">
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} className="font-bold text-[13px] h-10 px-3 rounded-xl transition-all">
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("h-5 w-5", pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 space-y-3">
            <Link href="/profile" className={cn("flex flex-col gap-2 p-3 rounded-2xl border transition-all duration-300 group/profile", pathname === '/profile' ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-inner" : "bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent hover:border-primary/20")}>
              <div className="flex items-center gap-3">
                <Avatar className={cn("h-9 w-9 border-2 transition-all duration-300", pathname === '/profile' ? "border-primary scale-105" : "border-primary/10 group-hover/profile:border-primary/30")}>
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black">{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black truncate tracking-tight">{user?.displayName || user?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-[9px] text-muted-foreground truncate font-black uppercase tracking-widest opacity-60">Account Vault</span>
                </div>
              </div>
            </Link>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-10 font-black text-xs uppercase tracking-widest px-3 rounded-xl" onClick={handleLogout}>
              <LogOut className="mr-3 h-4 w-4" /> Logout Session
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col w-full min-w-0">
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-3 md:px-6">
            <SidebarTrigger className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm md:hidden" />
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <h1 className="text-sm md:text-lg font-black truncate tracking-tighter">
                {navItems.find(item => item.url === pathname)?.title || 'Dashboard'}
              </h1>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-[8px] md:text-[9px] uppercase font-black tracking-tighter px-1.5 py-0">
                <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Automated E2EE
              </Badge>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 lg:p-8 w-full">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
