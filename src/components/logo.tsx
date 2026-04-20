'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt="Logo del negocio"
        className={cn('rounded-sm object-contain', className)}
        width={64}
        height={64}
        unoptimized // Necessary for external URLs if hostname is not configured in next.config.js
      />
    );
  }

  // Fallback SVG
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(className)}
      aria-hidden="true"
    >
        <path
            d="M 80 20 L 30 20 L 30 80 L 80 80 M 30 50 L 65 50"
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M 70 20 L 70 35"
            stroke="hsl(var(--accent))"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
  );
}
