'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/app/(app)/sidebar-nav';
import { SettingsProvider } from '@/firebase/settings-provider';
import { Logo } from '@/components/logo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
          <p className="text-muted-foreground animate-pulse">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <SidebarProvider>
        <SidebarNav className="print:hidden" />
        <SidebarInset className="print:!p-0 print:!m-0">
          <div className="min-h-screen p-4 md:p-8 print:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SettingsProvider>
  );
}
