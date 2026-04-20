'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // The AppLayout will handle redirecting to /login if not authenticated.
    // We just need to push the user into the app.
    router.replace('/dashboard');
  }, [router]);

  // Show a loading message while redirecting.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
          <p className="text-muted-foreground animate-pulse">Cargando aplicación...</p>
      </div>
    </div>
  );
}
