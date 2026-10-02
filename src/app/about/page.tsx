
"use client";

import React from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Lock, 
  Target, 
  Zap, 
  EyeOff, 
  ServerCrash, 
  KeyRound,
  Calculator,
  GraduationCap,
  Wallet,
  BookText,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  Info,
  HandCoins,
  Flame,
  Mountain,
  Users,
  Coins,
  AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header with Close Icon */}
        <div className="flex justify-between items-center px-1 md:px-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-xl text-primary shadow-sm">
              <Info className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-3xl font-black tracking-tighter text-primary leading-tight uppercase">About LifeTrack</h2>
              <p className="text-[8px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">The Secure OS for your Life</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 md:h-10 md:w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Link href="/dashboard">
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </Button>
        </div>

        <div className="text-center space-y-1 md:space-y-2 py-2 md:py-4">
          <h1 className="text-2xl md:text-5xl font-black tracking-tighter bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">Holistic Life Tracking</h1>
          <p className="text-muted-foreground text-[10px] md:text-lg font-medium">A unified, private system for growth.</p>
        </div>

        {/* Feature Grid Expansion - Optimized for 2-column mobile */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 md:px-2">
            <h3 className="text-base md:text-xl font-black flex items-center gap-2">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Workspace Ecosystem
            </h3>
            <Badge variant="outline" className="font-black text-[7px] md:text-[9px] uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">8 Modules</Badge>
          </div>
          
          <div className="grid gap-2 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={Calculator} 
              title="Salary Planner" 
              desc="Income splits and investment matrix."
              color="text-blue-500"
              bg="bg-blue-50/80 dark:bg-blue-900/10"
            />
            <FeatureCard 
              icon={Target} 
              title="Allocation" 
              desc="Real-time tracking vs income pillars."
              color="text-orange-500"
              bg="bg-orange-50/80 dark:bg-orange-900/10"
            />
            <FeatureCard 
              icon={Wallet} 
              title="Budget Vault" 
              desc="Smart rolling allowance strategy."
              color="text-green-500"
              bg="bg-green-50/80 dark:bg-green-900/10"
            />
            <FeatureCard 
              icon={Users} 
              title="Split Ledger" 
              desc="Collaborative rooms with auto-sync."
              color="text-purple-500"
              bg="bg-purple-50/80 dark:bg-purple-900/10"
            />
            <FeatureCard 
              icon={Flame} 
              title="Willpower" 
              desc="Track calories and money saved."
              color="text-red-500"
              bg="bg-red-50/80 dark:bg-red-900/10"
            />
            <FeatureCard 
              icon={Mountain} 
              title="Future Vision" 
              desc="E2EE bucket list and aspirations."
              color="text-indigo-500"
              bg="bg-indigo-50/80 dark:bg-indigo-900/10"
            />
            <FeatureCard 
              icon={GraduationCap} 
              title="Skill Mastery" 
              desc="Progress, difficulty and streaks."
              color="text-emerald-500"
              bg="bg-emerald-50/80 dark:bg-emerald-900/10"
            />
            <FeatureCard 
              icon={BookText} 
              title="Memoirs" 
              desc="AES-GCM secured reflections."
              color="text-pink-500"
              bg="bg-pink-50/80 dark:bg-pink-900/10"
            />
          </div>
        </div>

        {/* Installation Guide Card */}
        <Card className="shadow-2xl border-none ring-1 ring-primary/20 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-background">
          <CardHeader className="bg-primary/10 border-b py-6 md:py-10 text-center px-4">
            <div className="mx-auto bg-primary text-white p-3 md:p-5 rounded-2xl md:rounded-[2rem] w-fit shadow-xl mb-4 md:mb-6 animate-bounce">
              <Smartphone className="h-8 w-8 md:h-12 md:w-12" />
            </div>
            <CardTitle className="text-2xl md:text-4xl font-black tracking-tight text-primary">Install LifeTrack</CardTitle>
            <CardDescription className="text-[9px] md:text-xs uppercase font-black tracking-[0.2em] text-primary/60 mt-1">Transform this workspace into a native app</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-14">
            <div className="grid gap-8 md:gap-16 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500 h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl flex items-center justify-center p-0 text-xs md:text-base font-black shadow-lg">1</Badge>
                  <h4 className="font-black text-xs md:text-lg uppercase tracking-wider text-primary">iOS / Apple Safari</h4>
                </div>
                <ul className="space-y-4 md:space-y-6 pl-1 md:pl-2">
                  <InstallStep icon={Share} text="Tap the Share button at the bottom of Safari." />
                  <InstallStep icon={PlusSquare} text="Scroll down and select 'Add to Home Screen'." />
                  <InstallStep icon={Smartphone} text="Launch LifeTrack from your home screen icons." />
                </ul>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500 h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl flex items-center justify-center p-0 text-xs md:text-base font-black shadow-lg">2</Badge>
                  <h4 className="font-black text-xs md:text-lg uppercase tracking-wider text-primary">Android / Chrome</h4>
                </div>
                <ul className="space-y-4 md:space-y-6 pl-1 md:pl-2">
                  <InstallStep icon={MoreVertical} text="Tap the three dots (menu) in the top right." />
                  <InstallStep icon={Download} text="Tap 'Install app' or 'Add to Home screen'." />
                  <InstallStep icon={ShieldCheck} text="Access your secure vault instantly." />
                </ul>
              </div>
            </div>
            
            <div className="mt-12 p-4 md:p-6 bg-primary/5 rounded-3xl border border-dashed border-primary/20 text-center">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground leading-relaxed">
                LifeTrack is a Progressive Web App (PWA). It provides a full-screen, native-like experience without the need for an App Store download.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-lg border-t-4 border-t-primary rounded-[2rem] overflow-hidden bg-primary/[0.02]">
            <CardHeader className="bg-primary/5 border-b border-primary/10 py-3 md:py-4 px-4 md:px-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base text-primary uppercase font-black tracking-tight">
                <Coins className="h-4 w-4" />
                The Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] md:text-sm leading-relaxed text-muted-foreground pt-4 md:pt-6">
              LifeTrack was built to provide a singular, private dashboard that helps you manage the most important aspects of your life. 
              We enable you to see the "big picture" of your personal growth without sacrificing privacy.
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-secondary rounded-[2rem] overflow-hidden bg-secondary/[0.02]">
            <CardHeader className="bg-secondary/10 border-b border-secondary/10 py-3 md:py-4 px-4 md:px-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base text-secondary-foreground uppercase font-black tracking-tight">
                <ShieldCheck className="h-4 w-4" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] md:text-sm leading-relaxed text-muted-foreground pt-4 md:pt-6">
              We believe your data belongs to you. LifeTrack uses end-to-end encryption. 
              Your sensitive info is scrambled on your device before it touches our servers. 
              We cannot read your entries or see your budget.
            </CardContent>
          </Card>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-xl text-primary shadow-sm">
              <Lock className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-black text-primary uppercase">Security Stack</h3>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest">Technical Zero-Knowledge</p>
            </div>
          </div>

          <Card className="bg-primary/[0.03] border-dashed border-2 border-primary/20 rounded-[2rem] overflow-hidden">
            <CardContent className="p-4 md:p-10 space-y-6 md:space-y-10">
              <div className="grid gap-6 md:gap-10 md:grid-cols-3">
                <TechSection 
                  icon={EyeOff} 
                  title="Zero-Knowledge" 
                  text="Client-side architecture. Your Master Key stays on your device."
                />
                <TechSection 
                  icon={KeyRound} 
                  title="AES-GCM 256" 
                  text="Sensitive fields encrypted using Web Crypto API gold standard."
                />
                <TechSection 
                  icon={ServerCrash} 
                  title="Cloud Resilience" 
                  text="Attackers would only find useless, encrypted strings of characters."
                />
              </div>
              
              <div className="p-4 md:p-6 bg-primary/10 rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 shadow-inner">
                <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                   <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                   <p className="text-[8px] md:text-[10px] font-black uppercase text-primary tracking-widest">Critical Note</p>
                </div>
                <p className="text-[10px] md:text-sm text-primary/80 leading-relaxed font-medium">
                  We <strong>cannot recover your data</strong> if you lose your credentials. 
                  Store them in a trusted password manager.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="pt-8 md:pt-12 text-center pb-6">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">LifeTrack v1.0 • E2EE Personal Workspace</p>
        </footer>
      </div>
    </AppShell>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <Card className={cn("hover:shadow-lg transition-all duration-300 group border-none ring-1 ring-border rounded-2xl md:rounded-3xl overflow-hidden", bg)}>
      <CardContent className="pt-4 md:pt-8 px-3 md:px-6 pb-3 md:pb-6 space-y-1.5 md:space-y-3">
        <div className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl w-fit transition-transform group-hover:scale-110 shadow-sm bg-white dark:bg-black/20", color)}>
          <Icon className="h-4 w-4 md:h-6 md:w-6" />
        </div>
        <h4 className="font-black text-[9px] md:text-sm tracking-tight uppercase text-foreground truncate">{title}</h4>
        <p className="text-[8px] md:text-[11px] text-muted-foreground leading-snug font-medium opacity-80 line-clamp-2">{desc}</p>
      </CardContent>
    </Card>
  );
}

function InstallStep({ icon: Icon, text }: any) {
  return (
    <li className="flex items-start gap-3 md:gap-5 text-[10px] md:text-base font-bold text-muted-foreground group">
      <div className="p-1.5 md:p-2.5 bg-background rounded-xl md:rounded-2xl shadow-md border border-primary/10 group-hover:scale-110 transition-transform">
        <Icon className="h-4 w-4 md:h-6 md:w-6 shrink-0 text-primary" />
      </div>
      <span className="pt-1.5 md:pt-2.5 leading-tight">{text}</span>
    </li>
  );
}

function TechSection({ icon: Icon, title, text }: any) {
  return (
    <div className="space-y-1.5 md:space-y-3">
      <div className="flex items-center gap-2 md:gap-3 text-foreground font-black text-[9px] md:text-xs uppercase tracking-widest">
        <div className="p-1 md:p-1.5 bg-background rounded-md md:rounded-lg shadow-sm border border-primary/10">
          <Icon className="h-3 w-3 md:h-4 md:w-4 text-primary" />
        </div>
        {title}
      </div>
      <p className="text-[9px] md:text-xs text-muted-foreground leading-relaxed font-medium opacity-80">
        {text}
      </p>
    </div>
  );
}
