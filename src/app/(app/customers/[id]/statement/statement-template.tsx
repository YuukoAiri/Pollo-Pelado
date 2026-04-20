'use client';

import React from 'react';
import { Customer, CustomerTransaction, Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { useSettings } from '@/firebase/settings-provider';

interface StatementTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    customer: Customer | null | undefined;
    transactions: (CustomerTransaction & { balance: number })[];
    summary: {
        balance: number;
    };
}

export const StatementTemplate = React.forwardRef<HTMLDivElement, StatementTemplateProps>(
    ({ customer, transactions, summary, ...props }, ref) => {
    
    const { settings } = useSettings();

    const getProductInfo = (transaction: CustomerTransaction) => {
        if (transaction.type === 'Pago') return { productName: '—', kg: '—', priceKg: '—' };
        const sale = transaction.original as Sale;
        if (!sale.items || sale.items.length === 0) return { productName: 'Varios Productos', kg: '—', priceKg: '—' };
        if (sale.items.length > 1) return { productName: 'Varios Productos', kg: '—', priceKg: '—' };
        const item = sale.items[0];
        return {
            productName: item.productName,
            kg: item.unitOfMeasure === 'kg' ? `${item.quantity.toFixed(1)} kg` : `${item.quantity} ${item.unitOfMeasure}`,
            priceKg: item.unitOfMeasure === 'kg' ? formatCurrency(item.unitPrice) : '—'
        };
    };

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
                        <h1 className="text-2xl font-bold">Estado de Cuenta</h1>
                        <p className="text-gray-500">
                            Cliente: {customer ? `${customer.firstName} ${customer.lastName}` : ''}
                        </p>
                        {customer?.address && <p className="text-xs text-gray-500">{customer.address}</p>}
                    </div>
                </header>

                <main>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr className="border-b">
                                    <th className="font-semibold text-left p-2">N.</th>
                                    <th className="font-semibold text-left p-2">FECHA</th>
                                    <th className="font-semibold text-left p-2">TIPO</th>
                                    <th className="font-semibold text-left p-2">PRODUCTO</th>
                                    <th className="font-semibold text-center p-2">CANT.</th>
                                    <th className="font-semibold text-right p-2">PRECIO/KG</th>
                                    <th className="font-semibold text-right p-2">DEBE (S/)</th>
                                    <th className="font-semibold text-right p-2">HABER (S/)</th>
                                    <th className="font-semibold text-right p-2">SALDO (S/)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => {
                                    const productInfo = getProductInfo(t);
                                    return (
                                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0">
                                        <td className="p-2 text-center">{(index + 1).toString().padStart(3, '0')}</td>
                                        <td className="p-2">{format(new Date(t.date), "dd/MM/yyyy", { locale: es })}</td>
                                        <td className="p-2">
                                            <Badge variant={t.type === 'Pago' ? 'default' : 'destructive'} className={cn(t.type === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'font-semibold')}>
                                                {t.type}
                                            </Badge>
                                        </td>
                                        <td className="p-2 font-medium">{productInfo.productName}</td>
                                        <td className="p-2 text-center">{productInfo.kg}</td>
                                        <td className="p-2 text-right">{productInfo.priceKg}</td>
                                        <td className="p-2 text-right font-medium text-red-500">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</td>
                                        <td className="p-2 text-right font-medium text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</td>
                                        <td className="p-2 text-right font-bold text-gray-700">{formatCurrency(t.balance)}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            <footer className="mt-auto pt-8">
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
