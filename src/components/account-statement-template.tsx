'use client';

import React, { useMemo } from 'react';
import { Customer, Sale, Supplier, SupplierTransaction, Purchase, SaleItem, PurchaseItem, CustomerTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useSettings } from '@/firebase/settings-provider';

interface AccountStatementTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    entity: Customer | Supplier | null | undefined;
    entityType: 'Cliente' | 'Proveedor';
    transactions: (CustomerTransaction | SupplierTransaction)[];
    summary: {
        charged: number;
        paid: number;
        balance: number;
    };
}

export const AccountStatementTemplate = React.forwardRef<HTMLDivElement, AccountStatementTemplateProps>(
    ({ entity, entityType, transactions, summary, ...props }, ref) => {
    
    const { settings } = useSettings();
    
    const transactionsWithBalance = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Oldest first

        const allDebitsInList = sortedTransactions.reduce((acc, t) => acc + t.debit, 0);
        const allCreditsInList = sortedTransactions.reduce((acc, t) => acc + t.credit, 0);
        
        const startingBalance = summary.balance - (allDebitsInList - allCreditsInList);

        let runningBalance = startingBalance;
        const processed = sortedTransactions.map(t => {
            runningBalance = runningBalance + t.debit - t.credit;
            return { ...t, balance: runningBalance };
        });

        return processed.reverse(); // Newest first for display
    }, [transactions, summary.balance]);

    const getProductInfo = (transaction: CustomerTransaction | SupplierTransaction) => {
        if (transaction.type === 'Pago') {
            return {
                productName: '—',
                kg: '—',
                priceKg: '—'
            };
        }

        const items = (transaction.original as Sale | Purchase).items;
        if (!items || items.length === 0) {
            return {
                productName: 'Varios Productos',
                kg: '—',
                priceKg: '—'
            };
        }

        const firstItem = items[0];
        const unit = 'unitPrice' in firstItem ? firstItem.unitPrice : firstItem.unitCost;

        return {
            productName: firstItem.productName,
            kg: firstItem.unitOfMeasure === 'kg' ? `${firstItem.quantity.toFixed(1)} kg` : (items.length > 1 ? '—' : `${firstItem.quantity} unid.`),
            priceKg: firstItem.unitOfMeasure === 'kg' ? formatCurrency(unit) : (items.length > 1 ? '—' : formatCurrency(unit)),
        };
    };

    return (
        <div ref={ref} className="bg-white text-gray-800 text-sm p-8 font-sans printable-content w-[800px]" {...props}>
            
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Logo logoUrl={settings?.logoUrl} className="h-16 w-16 text-primary flex-shrink-0" />
                    <div>
                        <h2 className="font-bold text-lg">{settings?.businessName || 'Tu Negocio'}</h2>
                        {settings?.businessAddress && <p className="text-xs text-gray-500">{settings.businessAddress}</p>}
                        {/* You can add phone here if it's in settings */}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-2xl font-bold">Estado de Cuenta</h1>
                    <p className="text-gray-500">
                        {entityType}: {entity ? ((entity as Customer)?.firstName ? `${(entity as Customer).firstName} ${(entity as Customer).lastName}` : (entity as Supplier)?.name) : ''}
                    </p>
                     {entity?.address && <p className="text-xs text-gray-500">{entity.address}</p>}
                </div>
            </header>

            <main>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="font-semibold text-left p-3">FECHA</th>
                                <th className="font-semibold text-left p-3">TIPO</th>
                                <th className="font-semibold text-left p-3">PRODUCTO</th>
                                <th className="font-semibold text-center p-3">CANT</th>
                                <th className="font-semibold text-right p-3">PRECIO/KG</th>
                                <th className="font-semibold text-right p-3">DEBE (S/)</th>
                                <th className="font-semibold text-right p-3">HABER (S/)</th>
                                <th className="font-semibold text-right p-3">SALDO (S/)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionsWithBalance.map((t, index) => {
                                const productInfo = getProductInfo(t);
                                return (
                                <tr key={t.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="p-3">{format(new Date(t.date), "dd/MM/yyyy", { locale: es })}</td>
                                    <td className="p-3">
                                        <Badge variant={t.type === 'Pago' ? 'default' : 'destructive'} className={cn(
                                            t.type === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                                            'font-semibold'
                                        )}>
                                            {t.type}
                                        </Badge>
                                    </td>
                                    <td className="p-3 font-medium">{productInfo.productName}</td>
                                    <td className="p-3 text-center">{productInfo.kg}</td>
                                    <td className="p-3 text-right">{productInfo.priceKg}</td>
                                    <td className="p-3 text-right font-medium text-red-500">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</td>
                                    <td className="p-3 text-right font-medium text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</td>
                                    <td className="p-3 text-right font-bold text-gray-700">{formatCurrency(t.balance)}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </main>

            <footer className="mt-8">
                 <div className="flex justify-end mt-4">
                    <div className="w-1/2 md:w-1/3">
                        <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                            <span>SALDO ACTUAL:</span>
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
            </footer>
        </div>
    );
});

AccountStatementTemplate.displayName = 'AccountStatementTemplate';
