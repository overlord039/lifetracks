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
  Coins
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header with Close Icon */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-sm">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black tracking-tighter">About LifeTrack</h2>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">The Secure Operating System for your Life</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Link href="/dashboard">
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="text-center space-y-2 py-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">Holistic Life Tracking</h1>
          <p className="text-muted-foreground text-sm md:text-lg font-medium">A unified, private system for your finances, learning, and self-reflection.</p>
        </div>

        {/* Feature Grid Expansion */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              The Workspace Ecosystem
            </h3>
            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-primary/5">8 Strategic Modules</Badge>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={Calculator} 
              title="Salary Planner" 
              desc="Intelligent income splits and age-based investment matrix."
              color="text-blue-500"
              bg="bg-blue-50/50"
            />
            <FeatureCard 
              icon={Target} 
              title="Strategic Allocation" 
              desc="Real-time tracking of your income pillars against actual spend."
              color="text-orange-500"
              bg="bg-orange-50/50"
            />
            <FeatureCard 
              icon={Wallet} 
              title="Budget Vault" 
              desc="Smart rolling allowances that adapt to your daily behavior."
              color="text-green-500"
              bg="bg-green-50/50"
            />
            <FeatureCard 
              icon={Users} 
              title="Split Ledger" 
              desc="Collaborative shared rooms with automated budget syncing."
              color="text-purple-500"
              bg="bg-purple-50/50"
            />
            <FeatureCard 
              icon={Flame} 
              title="Willpower Meter" 
              desc="Track impact from resisted cravings: calories and money saved."
              color="text-red-500"
              bg="bg-red-50/50"
            />
            <FeatureCard 
              icon={Mountain} 
              title="Future Vision" 
              desc="End-to-end encrypted bucket list and long-term aspirations."
              color="text-indigo-500"
              bg="bg-indigo-50/50"
            />
            <FeatureCard 
              icon={GraduationCap} 
              title="Skill Mastery" 
              desc="Daily progress, difficulty levels, and habit-forming streaks."
              color="text-emerald-500"
              bg="bg-emerald-50/50"
            />
            <FeatureCard 
              icon={BookText} 
              title="Private Memoirs" 
              desc="AES-GCM 256 secured daily reflections and mood tracking."
              color="text-pink-500"
              bg="bg-pink-50/50"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg border-t-4 border-t-primary rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/10">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                The Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground pt-4">
              LifeTrack was built with one goal: to provide a singular, private dashboard that helps you manage the most important aspects of your daily life. 
              By combining financial planning with habit tracking and journaling, we enable you to see the "big picture" of your personal growth without sacrificing privacy.
            </CardContent>
          </Card>

          <Card className="shadow-lg border-t-4 border-t-secondary rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/10">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-secondary-foreground" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground pt-4">
              We believe your data belongs to you. Unlike traditional apps, LifeTrack uses end-to-end encryption. 
              This means your sensitive information is scrambled on your device before it ever touches our servers. 
              Even as developers, we cannot read your entries or see your budget data.
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl border-none ring-2 ring-primary/20 overflow-hidden rounded-[2.5rem] bg-primary/5">
          <CardHeader className="bg-primary/10 border-b py-8 text-center">
            <div className="mx-auto bg-primary text-white p-4 rounded-[2rem] w-fit shadow-xl mb-4 transform hover:scale-110 transition-transform">
              <Smartphone className="h-10 w-10" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight">Install LifeTrack</CardTitle>
            <CardDescription className="text-xs uppercase font-black tracking-widest text-primary">Transform this site into a high-performance native app</CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            <div className="grid gap-12 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500 h-8 w-8 rounded-2xl flex items-center justify-center p-0 text-sm font-black shadow-lg">1</Badge>
                  <h4 className="font-black text-sm uppercase tracking-wider">iOS / Apple Safari</h4>
                </div>
                <ul className="space-y-4 pl-11">
                  <InstallStep icon={Share} text="Open Safari and tap the Share button at the bottom." />
                  <InstallStep icon={PlusSquare} text="Scroll down and select 'Add to Home Screen'." />
                  <InstallStep icon={Smartphone} text="Launch LifeTrack from your home screen icons." />
                </ul>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500 h-8 w-8 rounded-2xl flex items-center justify-center p-0 text-sm font-black shadow-lg">2</Badge>
                  <h4 className="font-black text-sm uppercase tracking-wider">Android / Google Chrome</h4>
                </div>
                <ul className="space-y-4 pl-11">
                  <InstallStep icon={MoreVertical} text="Open Chrome and tap the three dots in the top right." />
                  <InstallStep icon={Download} text="Tap 'Install app' or 'Add to Home Screen'." />
                  <InstallStep icon={ShieldCheck} text="Access your secure vault instantly from your apps." />
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Data Protection Architecture</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Technical Zero-Knowledge Stack</p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card className="bg-muted/20 border-dashed border-2 rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-10 space-y-10">
                <div className="grid gap-10 md:grid-cols-3">
                  <TechSection 
                    icon={EyeOff} 
                    title="Zero-Knowledge" 
                    text="We use a client-side architecture. Your Master Key stays on your device and is never transmitted to our servers."
                  />
                  <TechSection 
                    icon={KeyRound} 
                    title="AES-GCM 256" 
                    text="All sensitive fields are encrypted using the Web Crypto API with AES-GCM, the industry gold standard for security."
                  />
                  <TechSection 
                    icon={ServerCrash} 
                    title="Cloud Resilience" 
                    text="If our database were ever compromised, attackers would only find useless, encrypted strings of characters."
                  />
                </div>
                
                <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/20 shadow-inner">
                  <div className="flex items-center gap-2 mb-2">
                     <AlertTriangle className="h-4 w-4 text-orange-600" />
                     <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Critical Security Note</p>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                    Because your data is encrypted with your local Master Key, <strong>it is technically impossible for us to recover your data if you lose access to your account credentials.</strong> 
                    We recommend using a memorable passphrase or storing it in a trusted password manager.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="pt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">LifeTrack v1.0 • End-to-End Encrypted Personal Workspace</p>
        </footer>
      </div>
    </AppShell>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <Card className={cn("hover:shadow-xl transition-all duration-500 group border-none ring-1 ring-border rounded-3xl overflow-hidden", bg)}>
      <CardContent className="pt-8 px-6 pb-6 space-y-3">
        <div className={cn("p-2 rounded-xl w-fit transition-transform group-hover:scale-110 group-hover:rotate-6 shadow-sm bg-white dark:bg-black/20", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <h4 className="font-black text-sm tracking-tight uppercase">{title}</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium opacity-80">{desc}</p>
      </CardContent>
    </Card>
  );
}

function InstallStep({ icon: Icon, text }: any) {
  return (
    <li className="flex items-start gap-4 text-xs font-bold text-muted-foreground">
      <div className="p-1.5 bg-background rounded-lg shadow-sm border border-primary/10">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <span className="pt-1">{text}</span>
    </li>
  );
}

function TechSection({ icon: Icon, title, text }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-foreground font-black text-xs uppercase tracking-widest">
        <div className="p-1.5 bg-background rounded-lg shadow-sm border border-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {title}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed font-medium opacity-80">
        {text}
      </p>
    </div>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
