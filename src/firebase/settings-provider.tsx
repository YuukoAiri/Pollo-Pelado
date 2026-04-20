'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppSettings } from '@/lib/types';

interface SettingsContextValue {
  settings: AppSettings | null;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const settingsDocRef = useMemo(() => {
    if (!user) return null;
    // Each user has their own settings document.
    const q = doc(firestore, 'users', user.uid, 'settings', 'business_profile');
    (q as any).__memo = true;
    return q;
  }, [user, firestore]);

  const { data: settings, isLoading } = useDoc<AppSettings>(settingsDocRef);

  const value = useMemo(() => ({ settings: settings ?? null, isLoading }), [settings, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
