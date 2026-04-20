'use client';

import React from 'react';
import { Supplier, SupplierTransaction, Purchase } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { useSettings } from '@/firebase/settings-provider';

interface StatementTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    supplier: Supplier | null | undefined;
    transactions: (SupplierTransaction & { balance?: number })[];
    summary: {
        balance: number;
    };
}

export const StatementTemplate = React.forwardRef<HTMLDivElement, StatementTemplateProps>(
    ({ supplier, transactions, summary, ...props }, ref) => {
    
    const { settings } = useSettings();

    // Note: Balance calculation is assumed to be handled by the parent component for the printable template
    // This component focuses on rendering the provided data.

    return (
        <div ref={ref} className="bg-white text-gray-800 text-sm p-8 font-sans printable-content w-[800px] flex flex-col" style={{ minHeight: '1123px' }} {...props}>
            <div className="flex-grow">
                <header className="flex justify-between items-start mb-8 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Logo logoUrl={settings?.logoUrl} className="h-16 w-16 text-primary flex-shrink-0" />
                        <div>
                            <h2 className="font-bold text-lg">{settings?.businessName || 'Tu Negocio'}</h2>
                            {settings?.businessAddress && <p className="text-xs text-gray-500">{settings.businessAddress}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold">Estado de Cuenta de Proveedor</h1>
                        <p className="text-gray-500">
                            Proveedor: {supplier ? supplier.name : ''}
                        </p>
                        {supplier?.address && <p className="text-xs text-gray-500">{supplier.address}</p>}
                    </div>
                </header>

                <main>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr className="border-b">
                                    <th className="font-semibold text-left p-2">FECHA</th>
                                    <th className="font-semibold text-left p-2">TIPO</th>
                                    <th className="font-semibold text-left p-2">DESCRIPCIÓN</th>
                                    <th className="font-semibold text-right p-2">DEBE (S/)</th>
                                    <th className="font-semibold text-right p-2">HABER (S/)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => (
                                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0">
                                        <td className="p-2">{format(new Date(t.date), "dd/MM/yyyy", { locale: es })}</td>
                                        <td className="p-2">
                                            <Badge variant={t.type === 'Pago' ? 'default' : 'destructive'} className={cn(t.type === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'font-semibold')}>
                                                {t.type}
                                            </Badge>
                                        </td>
                                        <td className="p-2 font-medium">{t.description}</td>
                                        <td className="p-2 text-right font-medium text-red-500">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</td>
                                        <td className="p-2 text-right font-medium text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <div className="w-1/2 md:w-1/3">
                            <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                                <span>SALDO FINAL:</span>
                                <span className={cn('text-red-500', summary.balance <= 0 && 'text-green-600')}>
                                    {formatCurrency(summary.balance)}
                                </span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <footer className="mt-auto pt-8">
                <div className="flex justify-between items-center mt-8 text-xs text-gray-500 border-t pt-2">
                    <p>{transactions.length} movimientos</p>
                    <div className="text-right">
                        <p>Estado de cuenta generado el {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-400 pt-4 mt-4 border-t">
                  © 2026  EVA Poultry System —  | Sistema ERP Avícola Inteligente y Amigable
                </div>
            </footer>
        </div>
    );
});

StatementTemplate.displayName = 'StatementTemplate';
