'use client';

import { useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Sale, Customer, CustomerPayment } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ReceiptTemplate } from '@/components/receipt-template';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Share2, Printer } from 'lucide-react';
import { shareAsImage } from '@/lib/share-as-image';
import { useCollection } from '@/firebase/firestore/use-collection';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/firebase/settings-provider';

export default function SaleDetailPage() {
  const params = useParams();
  const { id: saleId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  // --- Sale Data ---
  const saleDocRef = useMemo(() => {
    if (!user || !saleId) return null;
    const q = doc(firestore, 'users', user.uid, 'sales', saleId as string);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, saleId]);
  const { data: sale, isLoading: isLoadingSale } = useDoc<Sale>(saleDocRef);

  // --- Customer Data (based on sale) ---
  const customerDocRef = useMemo(() => {
    if (!user || !sale?.customerId) return null;
    const q = doc(firestore, 'users', user.uid, 'customers', sale.customerId);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, sale?.customerId]);
  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef);
  
  // --- Customer's Full Transaction History (for balance calculation) ---
    const customerSalesQuery = useMemo(() => {
        if (!user || !sale?.customerId) return null;
        const q = query(collection(firestore, 'users', user.uid, 'sales'), where('customerId', '==', sale.customerId));
        (q as any).__memo = true;
        return q;
    }, [firestore, user, sale?.customerId]);

    const customerPaymentsQuery = useMemo(() => {
        if (!user || !sale?.customerId) return null;
        const q = query(collection(firestore, 'users', user.uid, 'customer_payments'), where('customerId', '==', sale.customerId));
        (q as any).__memo = true;
        return q;
    }, [firestore, user, sale?.customerId]);

    const { data: allSales, isLoading: isLoadingAllSales } = useCollection<Sale>(customerSalesQuery);
    const { data: allPayments, isLoading: isLoadingAllPayments } = useCollection<CustomerPayment>(customerPaymentsQuery);


  const isLoading = isLoadingSale || isLoadingCustomer || isLoadingAllSales || isLoadingAllPayments;
  
  const customerBalance = useMemo(() => {
    const totalCharged = allSales?.reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;
    const totalPaid = allPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    return totalCharged - totalPaid;
  }, [allSales, allPayments]);


  const handleShare = async () => {
    if (!sale) return;
    const defaultMessage = `¡Hola [Nombre del cliente]! 👋 Aquí tienes tu comprobante de venta. Número: [Número de venta], Total: [Monto total]. ¡Gracias por tu compra!`;
    const messageTemplate = settings?.saleReceiptMessage || defaultMessage;
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente';
    
    const message = messageTemplate
      .replace(/\[Nombre del cliente\]/g, customerName)
      .replace(/\[Número de venta\]/g, sale.saleNumber)
      .replace(/\[Monto total\]/g, formatCurrency(sale.totalAmount));

    await shareAsImage(receiptRef.current, `comprobante-${sale?.saleNumber}.png`, `Comprobante de Venta`, message);
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-8">
      <div className="no-print">
        <PageHeader title={sale ? `Comprobante ${sale.saleNumber}` : 'Cargando...'} description="Detalles de la venta realizada.">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare} disabled={isLoading}>
              <Share2 className="mr-2" /> Compartir
            </Button>
            <Button onClick={handlePrint} disabled={isLoading}>
              <Printer className="mr-2" /> Imprimir / PDF
            </Button>
          </div>
        </PageHeader>
      </div>
      
      <div className="max-w-md mx-auto">
        {isLoading && <Skeleton className="h-[800px] w-full" />}
        {!isLoading && sale && (
          <ReceiptTemplate 
            ref={receiptRef} 
            sale={sale}
            customer={customer}
            customerBalance={customerBalance}
          />
        )}
      </div>
    </div>
  );
}
