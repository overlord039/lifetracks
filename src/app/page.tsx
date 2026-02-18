"use client";

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Unwrap searchParams to satisfy Next.js 15 requirements
  use(props.searchParams);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
