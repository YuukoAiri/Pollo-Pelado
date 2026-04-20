'use client';

import React, { Fragment } from 'react';
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
        if (transaction.type === 'Pago') return { productName: '—', kg: '—', unitPrice: '—' };
        const sale = transaction.original as Sale;
        if (!sale.items || sale.items.length === 0) return { productName: 'Venta sin productos', kg: '—', unitPrice: '—' };
        const item = sale.items[0];
        return {
            productName: item.productName,
            kg: item.unitOfMeasure === 'kg' ? `${item.quantity.toFixed(1)} kg` : `${item.quantity} ${item.unitOfMeasure}`,
            unitPrice: item.unitOfMeasure === 'kg' || item.unitOfMeasure === 'unit' ? formatCurrency(item.unitPrice) : '—'
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
                                    <th className="font-semibold text-right p-2">P.UNIT</th>
                                    <th className="font-semibold text-right p-2">DEBE (S/)</th>
                                    <th className="font-semibold text-right p-2">HABER (S/)</th>
                                    <th className="font-semibold text-right p-2">SALDO (S/)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => {
                                    const isMultiItemSale = t.type === 'Venta' && (t.original as Sale).items.length > 1;

                                    if (isMultiItemSale) {
                                        const sale = t.original as Sale;
                                        return (
                                            <Fragment key={t.id}>
                                                <tr className="border-b border-gray-100 last:border-b-0 bg-gray-50 font-bold">
                                                    <td className="p-2 text-center">{(index + 1).toString().padStart(3, '0')}</td>
                                                    <td className="p-2">{format(new Date(t.date), "dd/MM/yyyy", { locale: es })}</td>
                                                    <td className="p-2">
                                                        <Badge variant='destructive' className={'bg-red-100 text-red-800 font-semibold'}>
                                                            {sale.paymentMethod}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-2 italic" colSpan={3}>Varios productos ({sale.items.length})</td>
                                                    <td className="p-2 text-right text-red-500">{formatCurrency(t.debit)}</td>
                                                    <td className="p-2 text-right font-medium text-green-600">—</td>
                                                    <td className="p-2 text-right text-gray-700">{formatCurrency(t.balance)}</td>
                                                </tr>
                                                {sale.items.map((item, itemIndex) => (
                                                    <tr key={`${t.id}-${itemIndex}`} className="border-b border-gray-100 last:border-b-0">
                                                        <td colSpan={3}></td>
                                                        <td className="p-1 text-xs text-gray-600 pl-8">{item.productName}</td>
                                                        <td className="p-1 text-center text-xs text-gray-600">{`${item.quantity} ${item.unitOfMeasure}`}</td>
                                                        <td className="p-1 text-right text-xs text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                                        <td className="p-1 text-right text-xs text-red-500">{formatCurrency(item.subtotal)}</td>
                                                        <td colSpan={2}></td>
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        );
                                    }

                                    const productInfo = getProductInfo(t);
                                    return (
                                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0">
                                        <td className="p-2 text-center">{(index + 1).toString().padStart(3, '0')}</td>
                                        <td className="p-2">{format(new Date(t.date), "dd/MM/yyyy", { locale: es })}</td>
                                        <td className="p-2">
                                            <Badge variant={t.type === 'Pago' ? 'default' : 'destructive'} className={cn(t.type === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'font-semibold')}>
                                                {(t.original as any).paymentMethod || t.type}
                                            </Badge>
                                        </td>
                                        <td className="p-2 font-medium">{productInfo.productName}</td>
                                        <td className="p-2 text-center">{productInfo.kg}</td>
                                        <td className="p-2 text-right">{productInfo.unitPrice}</td>
                                        <td className="p-2 text-right font-medium text-red-500">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</td>
                                        <td className="p-2 text-right font-medium text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</td>
                                        <td className="p-2 text-right font-bold text-gray-700">{formatCurrency(t.balance)}</td>
                                    </tr>
                                )})}
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
                <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
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
