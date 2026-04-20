import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateSaleNumber() {
  const date = format(new Date(), 'yyyyMMdd');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `V-${date}-${randomPart}`;
}

export function generatePurchaseNumber() {
  const date = format(new Date(), 'yyyyMMdd');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `C-${date}-${randomPart}`;
}
