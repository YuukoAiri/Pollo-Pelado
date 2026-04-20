'use client';

import { useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Purchase, Supplier } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { PurchaseReceiptTemplate } from '@/components/purchase-receipt-template';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Share2, Printer } from 'lucide-react';
import { shareAsImage } from '@/lib/share-as-image';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/firebase/settings-provider';

export default function PurchaseDetailPage() {
  const params = useParams();
  const { id: purchaseId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const router = useRouter();

  const purchaseDocRef = useMemo(() => {
    if (!user || !purchaseId) return null;
    return doc(firestore, 'users', user.uid, 'purchases', purchaseId as string);
  }, [firestore, user, purchaseId]);
  const { data: purchase, isLoading: isLoadingPurchase } = useDoc<Purchase>(purchaseDocRef);

  const supplierDocRef = useMemo(() => {
    if (!user || !purchase?.supplierId) return null;
    return doc(firestore, 'users', user.uid, 'suppliers', purchase.supplierId);
  }, [firestore, user, purchase?.supplierId]);
  const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierDocRef);
  
  const isLoading = isLoadingPurchase || isLoadingSupplier;

  const handleShare = async () => {
    if (!purchase) return;
    const defaultMessage = 'Comprobante de compra a [Nombre del proveedor]. Número: [Número de compra], Total: [Monto total].';
    const messageTemplate = settings?.purchaseReceiptMessage || defaultMessage;
    const supplierName = supplier ? supplier.name : 'Proveedor';

    const message = messageTemplate
      .replace(/\[Nombre del proveedor\]/g, supplierName)
      .replace(/\[Número de compra\]/g, purchase.purchaseNumber)
      .replace(/\[Monto total\]/g, formatCurrency(purchase.totalAmount));

    await shareAsImage(receiptRef.current, `comprobante-compra-${purchase.purchaseNumber}.png`, 'Comprobante de Compra', message);
  };
  
  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-8">
      <div className="no-print">
        <PageHeader title={purchase ? `Comprobante ${purchase.purchaseNumber}` : 'Cargando...'} description="Detalles de la compra realizada.">
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
        {!isLoading && purchase && (
          <PurchaseReceiptTemplate 
            ref={receiptRef} 
            purchase={purchase}
            supplier={supplier}
          />
        )}
      </div>
    </div>
  );
}
