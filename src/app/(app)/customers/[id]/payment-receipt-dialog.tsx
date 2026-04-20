'use client';
import { useRef } from 'react';
import { Customer, CustomerPayment } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentReceiptTemplate } from '@/components/payment-receipt-template';
import { shareAsImage } from '@/lib/share-as-image';
import { Share2 } from 'lucide-react';
import { useSettings } from '@/firebase/settings-provider';
import { formatCurrency } from '@/lib/utils';


interface PaymentReceiptDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payment: CustomerPayment | null;
  customer: Customer | null;
  previousBalance: number;
}

export function PaymentReceiptDialog({ isOpen, onOpenChange, payment, customer, previousBalance }: PaymentReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  if (!payment || !customer) return null;

  const handleShare = async () => {
    const defaultMessage = `¡Hola ${customer.firstName}! 👋 Te enviamos tu comprobante de pago por ${formatCurrency(payment.amount)}. ¡Gracias!`;
    const message = settings?.saleReceiptMessage || defaultMessage;

    await shareAsImage(receiptRef.current, `pago-${customer.firstName}.png`, 'Comprobante de Pago', message);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0">
        <DialogHeader className="p-4 pb-0 no-print">
          <DialogTitle className="text-center">Pago Registrado</DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
            <PaymentReceiptTemplate 
                ref={receiptRef}
                payment={payment}
                customer={customer}
                previousBalance={previousBalance}
            />
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 p-4 pt-0 no-print">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2" /> Compartir
          </Button>
           <DialogClose asChild>
            <Button>Cerrar</Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
