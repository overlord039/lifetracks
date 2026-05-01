"use client";

import React from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
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
  MoreVertical
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Holistic Life Tracking</h2>
          <p className="text-muted-foreground text-sm md:text-lg font-medium">A unified system for your finances, learning, and self-reflection.</p>
        </div>

        <Card className="shadow-2xl border-none ring-2 ring-primary/20 overflow-hidden rounded-3xl bg-primary/5">
          <CardHeader className="bg-primary/10 border-b py-6 text-center">
            <div className="mx-auto bg-primary text-white p-3 rounded-2xl w-fit shadow-lg mb-4">
              <Smartphone className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Install LifeTrack</CardTitle>
            <CardDescription className="text-xs uppercase font-black tracking-widest text-primary">Transform this site into a native app</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500 h-6 w-6 rounded-full flex items-center justify-center p-0">1</Badge>
                  <h4 className="font-black text-sm uppercase">iOS / iPhone</h4>
                </div>
                <ul className="space-y-3 pl-9">
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <Share className="h-4 w-4 shrink-0 text-primary" />
                    Open Safari and tap the Share button at the bottom.
                  </li>
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <PlusSquare className="h-4 w-4 shrink-0 text-primary" />
                    Scroll down and select "Add to Home Screen".
                  </li>
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <Smartphone className="h-4 w-4 shrink-0 text-primary" />
                    Launch LifeTrack from your home screen icons.
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500 h-6 w-6 rounded-full flex items-center justify-center p-0">2</Badge>
                  <h4 className="font-black text-sm uppercase">Android / Chrome</h4>
                </div>
                <ul className="space-y-3 pl-9">
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <MoreVertical className="h-4 w-4 shrink-0 text-primary" />
                    Open Chrome and tap the three dots in the top right.
                  </li>
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <Download className="h-4 w-4 shrink-0 text-primary" />
                    Tap "Install app" or "Add to Home Screen".
                  </li>
                  <li className="flex items-start gap-3 text-xs font-medium text-muted-foreground">
                    <Smartphone className="h-4 w-4 shrink-0 text-primary" />
                    Access your secure vault instantly from your apps.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                The Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              LifeTrack was built with one goal: to provide a singular, private dashboard that helps you manage the most important aspects of your daily life. 
              By combining financial planning with habit tracking and journaling, we enable you to see the "big picture" of your personal growth.
            </CardContent>
          </Card>

          <Card className="shadow-md border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-secondary-foreground" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              We believe your data belongs to you. Unlike traditional apps, LifeTrack uses end-to-end encryption. 
              This means your sensitive information is scrambled on your device before it ever touches our servers. 
              Even as developers, we cannot read your entries.
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2 px-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            What You Get
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={Calculator} 
              title="Salary Planner" 
              desc="Intelligent income splits and age-based investment matrix."
              color="text-blue-500"
            />
            <FeatureCard 
              icon={Wallet} 
              title="Budget Vault" 
              desc="Smart rolling allowance that adjusts based on yesterday's spend."
              color="text-green-500"
            />
            <FeatureCard 
              icon={GraduationCap} 
              title="Learning Tracker" 
              desc="Track daily progress and streaks for your target skills."
              color="text-orange-500"
            />
            <FeatureCard 
              icon={BookText} 
              title="Private Diary" 
              desc="Daily reflection and mood tracking with total encryption."
              color="text-purple-500"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Data Protection Architecture</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Technically Private</p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card className="bg-muted/30 border-dashed border-2">
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <TechSection 
                    icon={EyeOff} 
                    title="Zero-Knowledge" 
                    text="We use a Zero-Knowledge architecture. Your Master Key stays on your device and is never transmitted to our servers."
                  />
                  <TechSection 
                    icon={KeyRound} 
                    title="AES-GCM 256" 
                    text="All sensitive fields are encrypted using the Web Crypto API with AES-GCM, the industry gold standard."
                  />
                  <TechSection 
                    icon={ServerCrash} 
                    title="Cloud Resilience" 
                    text="If our database were ever compromised, attackers would only find useless, encrypted strings of characters."
                  />
                </div>
                
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-[10px] font-black uppercase text-primary mb-1">Important Security Note</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Because your data is encrypted with your Master Key, <strong>it is impossible to recover your data if you lose your key.</strong> 
                    We recommend using a memorable passphrase or storing it in a trusted password manager.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="pt-8 text-center">
          <p className="text-xs text-muted-foreground">LifeTrack v1.0 • End-to-End Encrypted Personal Workspace</p>
        </footer>
      </div>
    </AppShell>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: any) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 group">
      <CardContent className="pt-6 space-y-2">
        <Icon className={`h-6 w-6 ${color} group-hover:scale-110 transition-transform`} />
        <h4 className="font-black text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground leading-snug font-medium">{desc}</p>
      </CardContent>
    </Card>
  );
}

function TechSection({ icon: Icon, title, text }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-foreground font-black text-xs uppercase tracking-tight">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
        {text}
      </p>
    </div>
  );
}
