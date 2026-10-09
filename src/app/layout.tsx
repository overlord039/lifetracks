'use client';

import { useEffect } from 'react';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LifeTrack - Personal Life Tracking System</title>
        <meta name="description" content="Manage your budget, learning progress, and daily reflections in one place." />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Mobile Viewport & PWA Optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#64B5F6" />
        
        {/* Favicon & App Icons */}
        <link rel="icon" href="/src/images/Neon Growth Leaf App Icon.png" />
        <link rel="apple-touch-icon" href="/src/images/Neon Growth Leaf App Icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LifeTrack" />
        
        {/* Android / Chrome Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={['light', 'dark', 'midnight', 'forest', 'sunset']}
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
