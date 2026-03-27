
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
  Info,
  Users
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

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Salary Planner', url: '/salary-planner', icon: Calculator },
  { title: 'Learning', url: '/learning', icon: GraduationCap },
  { title: 'Budget', url: '/budget', icon: Wallet },
  { title: 'Split Pay', url: '/split-pay', icon: Users },
  { title: 'Debts', url: '/debts', icon: HandCoins },
  { title: 'Diary', url: '/diary', icon: BookText },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'About', url: '/about', icon: Info },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <Sidebar className="border-r hidden md:flex">
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
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate">{user?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground truncate font-medium">{user?.email}</span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-10 font-bold"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex flex-col w-full">
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-3 md:px-6">
            <SidebarTrigger className="flex h-9 w-9 items-center justify-center rounded-md border bg-card shadow-sm md:hidden" />
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <h1 className="text-sm md:text-lg font-black truncate tracking-tight">
                {navItems.find(item => item.url === pathname)?.title || 'Dashboard'}
              </h1>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-[8px] md:text-[9px] uppercase font-black tracking-tighter px-1.5 py-0">
                <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Automated E2EE
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Avatar className="h-8 w-8 md:hidden border">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-black">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
