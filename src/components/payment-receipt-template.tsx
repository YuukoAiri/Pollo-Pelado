'use client';

import React from 'react';
import { Customer, CustomerPayment } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Logo } from './logo';
import { useSettings } from '@/firebase/settings-provider';
import { Separator } from './ui/separator';

interface PaymentReceiptTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
    payment: CustomerPayment;
    customer: Customer | null | undefined;
    previousBalance: number;
}

export const PaymentReceiptTemplate = React.forwardRef<HTMLDivElement, PaymentReceiptTemplateProps>(
    ({ payment, customer, previousBalance, ...props }, ref) => {
    
    const { settings } = useSettings();
    const newBalance = previousBalance - payment.amount;
    
    return (
        <div ref={ref} className="bg-white text-black p-2 font-mono printable-content space-y-2 text-xs w-[302px]" {...props}>
            {/* Header */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed">
                 <Logo logoUrl={settings?.logoUrl} className="h-16 w-16 mx-auto" />
                 <h2 className="font-bold text-base">{settings?.businessName || 'Tu Negocio'}</h2>
                 {settings?.businessAddress && <p className="text-xs text-gray-600">{settings.businessAddress}</p>}
                 <p className="font-bold text-sm pt-1">COMPROBANTE DE PAGO</p>
            </div>

            {/* Customer & Date Info */}
            <div className="space-y-0.5">
                <p><strong>Fecha:</strong> {format(new Date(payment.paymentDate), "dd/MM/yy HH:mm", { locale: es })}</p>
                <p><strong>Cliente:</strong> {customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente Ocasional'}</p>
                {customer?.identificationNumber && <p><strong>DNI/RUC:</strong> {customer.identificationNumber}</p>}
            </div>
            
            <Separator className="my-1 border-dashed" />

            {/* Payment Details */}
            <div className="space-y-1">
                 <p className="font-bold text-lg text-center">{formatCurrency(payment.amount)}</p>
                 <p className="text-center text-muted-foreground text-xs -mt-1">{payment.paymentMethod}</p>
            </div>

            <Separator className="my-1 border-dashed" />

            {/* Balance Details */}
            <div className="space-y-0.5">
                <div className="flex justify-between">
                    <span>Saldo Anterior:</span>
                    <span>{formatCurrency(previousBalance)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                    <span>Tu Pago:</span>
                    <span>-{formatCurrency(payment.amount)}</span>
                </div>
                 <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed">
                    <span>Nuevo Saldo:</span>
                    <span>{formatCurrency(newBalance)}</span>
                </div>
            </div>

            {payment.notes && (
                 <>
                    <Separator className="my-1 border-dashed" />
                    <div className="space-y-0.5">
                        <p className="font-bold">Notas:</p>
                        <p>{payment.notes}</p>
                    </div>
                </>
            )}
            
            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed">
                <p className="font-semibold">¡Gracias por tu pago!</p>
            </div>
        </div>
    );
});

PaymentReceiptTemplate.displayName = 'PaymentReceiptTemplate';
