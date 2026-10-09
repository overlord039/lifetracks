
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
  X,
  Flame,
  Mountain,
  Sun,
  Moon,
  Droplets,
  TreePine,
  Sunrise,
  Palette,
  ShieldAlert,
  BellRing,
  BellOff,
  Utensils
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { requestNotificationPermission, notifyModuleStatus } from '@/lib/notifications';
import Image from 'next/image';

const navItems = [
  { id: 'dashboard', title: 'Home', url: '/dashboard', icon: LayoutDashboard },
  { id: 'budget', title: 'Budget', url: '/budget', icon: Wallet },
  { id: 'craving-meter', title: 'Calories', url: '/craving-meter', icon: Utensils },
  { id: 'future-vision', title: 'To-do', url: '/future-vision', icon: Mountain },
  { id: 'split-pay', title: 'Split', url: '/split-pay', icon: Users },
  { id: 'diary', title: 'Diary', url: '/diary', icon: BookText },
  { id: 'learning', title: 'Learning', url: '/learning', icon: GraduationCap },
  { id: 'reports', title: 'Reports', url: '/reports', icon: BarChart3 },
  { id: 'salary-planner', title: 'Planner', url: '/salary-planner', icon: Calculator },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedNav = localStorage.getItem('lifetrack_nav_visibility');
    if (savedNav) {
      setVisibleSections(JSON.parse(savedNav));
    } else {
      const defaults = navItems.reduce((acc, item) => ({ ...acc, [item.id]: true }), {});
      setVisibleSections(defaults);
    }

    const savedReminders = localStorage.getItem('lifetrack_daily_reminders') === 'true';
    setRemindersEnabled(savedReminders);
    
    setMounted(true);
  }, []);

  const toggleSection = async (id: string) => {
    const newState = !visibleSections[id];
    const next = { ...visibleSections, [id]: newState };
    setVisibleSections(next);
    localStorage.setItem('lifetrack_nav_visibility', JSON.stringify(next));

    // Request permissions if enabling a section and not already granted
    if (newState && Notification.permission !== 'granted') {
      await requestNotificationPermission();
    }

    // Trigger specialized notification
    notifyModuleStatus(id, newState);
  };

  const handleToggleReminders = async (checked: boolean) => {
    // UI Responsiveness: set state immediately
    setRemindersEnabled(checked);
    
    if (checked) {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        localStorage.setItem('lifetrack_daily_reminders', 'true');
      } else {
        // Revert if permission denied or dismissed
        setRemindersEnabled(false);
        localStorage.setItem('lifetrack_daily_reminders', 'false');
      }
    } else {
      localStorage.setItem('lifetrack_daily_reminders', 'false');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => !mounted || visibleSections[item.id] !== false);

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, color: 'text-orange-500' },
    { id: 'dark', label: 'Dark', icon: Moon, color: 'text-blue-400' },
    { id: 'midnight', label: 'Midnight', icon: Droplets, color: 'text-blue-600' },
    { id: 'forest', label: 'Forest', icon: TreePine, color: 'text-green-600' },
    { id: 'sunset', label: 'Sunset', icon: Sunrise, color: 'text-orange-600' },
    { id: 'system', label: 'System', icon: Palette, color: 'text-slate-500' },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        {/* Desktop Sidebar */}
        <Sidebar className="border-r hidden md:flex">
          <SidebarHeader className="p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg overflow-hidden relative">
                <Image src="/icon.png" alt="LifeTrack Logo" fill className="object-cover" />
              </div>
              <span className="font-headline font-black text-xl tracking-tighter">LifeTrack</span>
            </div>
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
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-3 md:px-6 pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))]">
            <div className="flex-1 flex items-center gap-3 overflow-hidden">
              <Link href="/profile" className="flex items-center gap-2 group/header-user shrink-0 md:hidden">
                <Avatar className="h-8 w-8 border-2 border-primary/10 group-hover:header-user:border-primary/30 transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-black">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <Separator orientation="vertical" className="h-6 opacity-30 md:hidden" />

              <div className="flex items-center gap-2 overflow-hidden">
                <h1 className="text-sm md:text-lg font-black truncate tracking-tighter">
                  {navItems.find(item => item.url === pathname)?.title || (pathname === '/about' ? 'About' : 'Dashboard')}
                </h1>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-[8px] md:text-[9px] uppercase font-black tracking-tighter px-1.5 py-0">
                  <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Automated E2EE
                </Badge>
              </div>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[340px] p-0 rounded-3xl shadow-2xl border-none ring-1 ring-border overflow-hidden">
                <Tabs defaultValue="appearance">
                  <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted/30 rounded-none border-b">
                    <TabsTrigger value="appearance" className="rounded-none font-black text-[10px] uppercase">Appearance</TabsTrigger>
                    <TabsTrigger value="layout" className="rounded-none font-black text-[10px] uppercase">Navigation</TabsTrigger>
                    <TabsTrigger value="session" className="rounded-none font-black text-[10px] uppercase text-destructive">Session</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="appearance" className="p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Interface Themes</p>
                      <div className="grid grid-cols-3 gap-2">
                        {themes.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 hover:bg-muted/50 group",
                              theme === t.id ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" : "bg-card shadow-sm"
                            )}
                          >
                            <t.icon className={cn("h-4 w-4 mb-2 transition-transform group-hover:scale-110", t.color)} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span>
                            {theme === t.id && <Check className="h-2 w-2 text-primary mt-1" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <Separator className="border-dashed" />

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Daily Pulse Reminders</p>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-dashed transition-all">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-1.5 rounded-lg", remindersEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                            {remindersEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-foreground">Expenditure Alert</p>
                            <p className="text-[7px] font-bold text-muted-foreground uppercase leading-none mt-0.5">Prompt if ledger is empty</p>
                          </div>
                        </div>
                        <Switch checked={remindersEnabled} onCheckedChange={handleToggleReminders} className="scale-75" />
                      </div>
                    </div>
                    
                    <Separator className="border-dashed" />
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Application Info</p>
                      <Button variant="outline" asChild className="w-full h-11 rounded-2xl font-black text-[10px] uppercase gap-2 border-dashed hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                        <Link href="/about">
                          <Info className="h-3.5 w-3.5" />
                          Learn About LifeTrack
                        </Link>
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="layout" className="p-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="p-1 space-y-1">
                      <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-1">Customize Workspace Visibility</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {navItems.map((item) => (
                          <div 
                            key={item.id} 
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 hover:bg-muted/30 group",
                              visibleSections[item.id] === false ? "bg-muted/10 opacity-60" : "bg-card shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-2 min-0">
                              <item.icon className={cn("h-3.5 w-3.5 shrink-0", visibleSections[item.id] !== false ? "text-primary" : "text-muted-foreground")} />
                              <span className="font-black text-[8px] uppercase tracking-tighter truncate">{item.title}</span>
                            </div>
                            <Switch 
                              id={`nav-${item.id}`} 
                              className="scale-[0.6] origin-right" 
                              checked={visibleSections[item.id] !== false} 
                              onCheckedChange={() => toggleSection(item.id)} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="session" className="p-6 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                        <ShieldAlert className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">End Session</p>
                        <p className="text-[10px] text-muted-foreground font-medium px-4 leading-relaxed">
                          This will clear your local cryptographic keys and terminate your active session.
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={handleLogout}
                        className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-destructive/20 active:scale-95 transition-transform"
                      >
                        Terminate Session
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>
          </header>

          <main className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 lg:p-8 w-full",
            "pb-24 md:pb-6"
          )}>
            {children}
          </main>

          {/* Mobile Bottom Navigation - PWA Styled */}
          <div className="fixed bottom-0 left-0 right-0 z-50 h-[calc(4rem+env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-xl border-t md:hidden flex items-start pt-2 px-1">
            <ScrollArea className="w-full">
              <div className="flex items-center justify-start h-full px-4 gap-4 min-w-max pb-4">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.url;
                  return (
                    <Link 
                      key={item.id} 
                      href={item.url} 
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 min-w-[64px] transition-all duration-300 active:scale-90",
                        isActive ? "text-primary" : "text-muted-foreground opacity-60"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-2xl transition-all duration-300",
                        isActive ? "bg-primary/10 shadow-sm ring-1 ring-primary/20 scale-110" : "bg-transparent"
                      )}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[64px]">
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
