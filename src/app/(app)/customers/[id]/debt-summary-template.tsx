'use client';

import React from 'react';
import { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSettings } from '@/firebase/settings-provider';
import { Logo } from '@/components/logo';

interface DebtSummaryTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    customer: Customer;
    balance: number;
}

export const DebtSummaryTemplate = React.forwardRef<HTMLDivElement, DebtSummaryTemplateProps>(
    ({ customer, balance, ...props }, ref) => {
    
    const { settings } = useSettings();
    
    const getMessage = () => {
        if (balance > 0) {
            return `Hola ${customer.firstName}, este es un recordatorio de tu saldo pendiente.`;
        }
        if (balance < 0) {
            return `Hola ${customer.firstName}, tienes un saldo a favor de ${formatCurrency(Math.abs(balance))}.`;
        }
        return `Hola ${customer.firstName}, tu cuenta se encuentra al día.`;
    };

    return (
        <div ref={ref} className="bg-white text-gray-800 p-8 font-sans printable-content w-[400px] text-center" {...props}>
            
            <header className="flex flex-col items-center mb-6">
                <Logo logoUrl={settings?.logoUrl} className="h-16 w-16 text-primary flex-shrink-0" />
                <h2 className="font-bold text-xl mt-2">{settings?.businessName || 'Tu Negocio'}</h2>
            </header>

            <main className="space-y-4">
                <p className="font-semibold text-gray-500">SALDO ACTUAL</p>
                <p className={cn(
                    "font-bold text-5xl tracking-tighter",
                    balance > 0 ? 'text-red-500' : 'text-green-500'
                )}>
                    {formatCurrency(balance)}
                </p>
                <p className="text-gray-600">
                    {getMessage()}
                </p>
            </main>

            <footer className="mt-8 text-xs text-gray-400">
                <p>Generado el {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </footer>
        </div>
    );
});

DebtSummaryTemplate.displayName = 'DebtSummaryTemplate';
