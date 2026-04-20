'use client';

import React from 'react';
import { Sale, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Logo } from './logo';
import { useSettings } from '@/firebase/settings-provider';

interface ReceiptTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    sale: Sale;
    customer: Customer | null | undefined;
    customerBalance?: number;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptTemplateProps>(
    ({ sale, customer, customerBalance, ...props }, ref) => {
    
    const { settings } = useSettings();

    const unitsLabelMap: { [key: string]: string } = {
        'unit': 'unid.',
        'kg': 'kg',
        'g': 'g',
        'l': 'L',
        'ml': 'ml',
    };

    return (
        <div ref={ref} className="bg-white text-black p-2 font-mono printable-content space-y-2 text-xs w-[302px]" {...props}>
            {/* Header */}
            <div className="flex justify-between items-start pb-2 border-b">
                <div className="flex items-center gap-2">
                    <Logo logoUrl={settings?.logoUrl} className="h-16 w-16 text-primary flex-shrink-0" />
                    <div>
                        <h2 className="font-bold text-lg">{settings?.businessName || 'Tu Negocio'}</h2>
                        {settings?.businessAddress && <p className="text-xs text-gray-500">{settings.businessAddress}</p>}
                    </div>
                </div>
                <div className="text-right">
                    
                    <p className="text-base font-bold text-gray-800">Comprobante de Venta</p>
                </div>
            </div>


            {/* Customer Info Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                <p className="font-bold">Fecha:</p>
                <p>{format(new Date(sale.saleDate), "dd/MM/yy HH:mm", { locale: es })}</p>
                
                <p className="font-bold">Vendedor:</p>
                <p>Reynaldo Quispe</p>

                <p className="font-bold">Cliente:</p>
                <p>{customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente Ocasional'}</p>

                {customer?.address && (
                    <>
                        <p className="font-bold">Dirección:</p>
                        <p>{customer.address}</p>
                    </>
                )}
                {customer?.identificationNumber && (
                    <>
                        <p className="font-bold">DNI/RUC:</p>
                        <p>{customer.identificationNumber}</p>
                    </>
                )}
            </div>


            {/* Items Table Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dashed border-gray-300">
                            <th className="font-semibold text-left pb-1">DESCRIPCIÓN</th>
                            <th className="font-semibold text-center pb-1">CANT.</th>
                            <th className="font-semibold text-right pb-1">P. UNIT.</th>
                            <th className="font-semibold text-right pb-1">IMPORTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-0.5">{item.productName}</td>
                                <td className="text-center py-0.5">{item.quantity} {unitsLabelMap[item.unitOfMeasure] || ''}</td>
                                <td className="text-right py-0.5">{formatCurrency(item.unitPrice, sale.currencyCode)}</td>
                                <td className="text-right py-0.5">{formatCurrency(item.subtotal, sale.currencyCode)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2 space-y-1">
                <div className="flex justify-between font-bold text-sm mb-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(sale.totalAmount, sale.currencyCode)}</span>
                </div>
                {sale.paymentMethod === 'Crédito' && customerBalance !== undefined && (
                    <div className="flex justify-between font-semibold text-xs">
                        <span>Saldo Total Cliente:</span>
                        <span>{formatCurrency(customerBalance, sale.currencyCode)}</span>
                    </div>
                )}
                 <div className="mt-1">
                    <p className="text-xs"><strong>Método de Pago:</strong> {sale.paymentMethod}</p>
                </div>
            </div>
            
            {/* Company Footer Box */}
            <div className="text-center pt-2 space-y-1">
                <p className="text-xs italic">"Tu aliado en la avicultura."</p>
                <p className="text-xs mt-1 font-semibold">¡Gracias por su compra!</p>
            </div>
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
