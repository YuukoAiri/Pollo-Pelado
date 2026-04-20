'use client';
import { useMemo, useRef } from 'react';
import { Sale, Customer, CustomerPayment } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReceiptTemplate } from '@/components/receipt-template';
import { shareAsImage } from '@/lib/share-as-image';
import { useCollection, useDoc, useUser, useFirestore } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Share2, Printer, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/firebase/settings-provider';
import { formatCurrency } from '@/lib/utils';

interface ReceiptDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sale: Sale | null;
}

export function ReceiptDialog({ isOpen, setIsOpen, sale }: ReceiptDialogProps) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { settings } = useSettings();

  // --- Customer Data ---
  const customerDocRef = useMemo(() => {
    if (!user || !sale?.customerId || sale.customerId === '0') return null;
    const q = doc(firestore, 'users', user.uid, 'customers', sale.customerId);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, sale?.customerId]);
  const { data: customer } = useDoc<Customer>(customerDocRef);

  // --- Customer's Full Transaction History (for balance calculation) ---
    const customerSalesQuery = useMemo(() => {
        if (!user || !sale?.customerId || sale.customerId === '0') return null;
        const q = query(collection(firestore, 'users', user.uid, 'sales'), where('customerId', '==', sale.customerId));
        (q as any).__memo = true;
        return q;
    }, [firestore, user, sale?.customerId]);

    const customerPaymentsQuery = useMemo(() => {
        if (!user || !sale?.customerId || sale.customerId === '0') return null;
        const q = query(collection(firestore, 'users', user.uid, 'customer_payments'), where('customerId', '==', sale.customerId));
        (q as any).__memo = true;
        return q;
    }, [firestore, user, sale?.customerId]);

    const { data: allSales } = useCollection<Sale>(customerSalesQuery);
    const { data: allPayments } = useCollection<CustomerPayment>(customerPaymentsQuery);


  const customerBalance = useMemo(() => {
    if (!customer) return 0;
    const totalCharged = allSales?.reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;
    const totalPaid = allPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    return totalCharged - totalPaid;
  }, [customer, allSales, allPayments]);


  if (!sale) return null;

  const handleShare = async () => {
    const defaultMessage = `¡Hola [Nombre del cliente]! 👋 Aquí tienes tu comprobante de venta. Número: [Número de venta], Total: [Monto total]. ¡Gracias por tu compra!`;
    const messageTemplate = settings?.saleReceiptMessage || defaultMessage;
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente';
    
    const message = messageTemplate
      .replace(/\[Nombre del cliente\]/g, customerName)
      .replace(/\[Número de venta\]/g, sale.saleNumber)
      .replace(/\[Monto total\]/g, formatCurrency(sale.totalAmount));

    await shareAsImage(receiptRef.current, `comprobante-${sale.saleNumber}.png`, 'Comprobante de Venta', message);
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleNewSale = () => {
    setIsOpen(false);
    // The page state is reset automatically on successful sale.
    // This just closes the dialog.
  };

  const handleGoToSales = () => {
    router.push('/sales');
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md print:p-0 print:border-0">
        <DialogHeader className="no-print">
          <div className="flex flex-col items-center text-center gap-2">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <DialogTitle className="text-2xl">Venta Registrada</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="my-4 p-1">
            <ReceiptTemplate 
                ref={receiptRef}
                sale={sale}
                customer={customer}
                customerBalance={customerBalance}
            />
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 no-print">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2" /> Compartir
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2" /> Imprimir
          </Button>
           <Button onClick={handleGoToSales} variant="secondary" className="col-span-2">
            Ver Lista de Ventas
          </Button>
          <Button onClick={handleNewSale} className="col-span-2" size="lg">
            Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
