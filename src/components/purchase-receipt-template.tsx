'use client';

import React from 'react';
import { Purchase, Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Logo } from './logo';
import { useSettings } from '@/firebase/settings-provider';

interface PurchaseReceiptTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    purchase: Purchase;
    supplier: Supplier | null | undefined;
}

export const PurchaseReceiptTemplate = React.forwardRef<HTMLDivElement, PurchaseReceiptTemplateProps>(
    ({ purchase, supplier, ...props }, ref) => {
    
    const { settings } = useSettings();
    
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
                    <p className="font-bold text-base">Nº: {purchase.purchaseNumber}</p>
                    <p className="text-base font-bold text-gray-800">Comprobante de Compra</p>
                </div>
            </div>


            {/* Supplier Info Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2 space-y-1">
                <div>
                    <p className="font-bold">Fecha:</p>
                    <p>{format(new Date(purchase.purchaseDate), "dd/MM/yy HH:mm", { locale: es })}</p>
                </div>
                <div>
                    <p className="font-bold">Proveedor:</p>
                    <p>{supplier ? supplier.name : 'N/A'}</p>
                </div>
                {supplier?.identificationNumber && (
                    <div>
                        <p className="font-bold">RUC:</p>
                        <p>{supplier.identificationNumber}</p>
                    </div>
                )}
                 {supplier?.address && (
                    <div>
                        <p className="font-bold">Dirección:</p>
                        <p>{supplier.address}</p>
                    </div>
                )}
            </div>


            {/* Items Table Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dashed border-gray-300">
                            <th className="font-semibold text-left pb-1">DESCRIPCIÓN</th>
                            <th className="font-semibold text-center pb-1">CANT.</th>
                            <th className="font-semibold text-right pb-1">COSTO UNIT.</th>
                            <th className="font-semibold text-right pb-1">IMPORTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchase.items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-0.5">{item.productName}</td>
                                <td className="text-center py-0.5">{`${item.quantity} ${item.unitOfMeasure || ''}`.trim()}</td>
                                <td className="text-right py-0.5">{formatCurrency(item.unitCost, purchase.currencyCode)}</td>
                                <td className="text-right py-0.5">{formatCurrency(item.subtotal, purchase.currencyCode)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Box */}
            <div className="border border-dashed border-gray-400 rounded-md p-2 space-y-1">
                <div className="flex justify-between font-bold text-sm mb-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(purchase.totalAmount, purchase.currencyCode)}</span>
                </div>
            </div>
            
            <div className="text-center pt-2 space-y-1">
                <p className="text-xs italic">"Tu aliado en la avicultura."</p>
                <p className="text-xs mt-1 font-semibold">¡Compra registrada exitosamente!</p>
            </div>
        </div>
    );
});

PurchaseReceiptTemplate.displayName = 'PurchaseReceiptTemplate';
