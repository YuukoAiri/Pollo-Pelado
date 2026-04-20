'use client';
import { useMemo, useRef } from 'react';
import { Purchase, Supplier } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseReceiptTemplate } from '@/components/purchase-receipt-template';
import { shareAsImage } from '@/lib/share-as-image';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Share2, Printer, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/firebase/settings-provider';
import { formatCurrency } from '@/lib/utils';

interface PurchaseReceiptDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  purchase: Purchase | null;
}

export function PurchaseReceiptDialog({ isOpen, setIsOpen, purchase }: PurchaseReceiptDialogProps) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { settings } = useSettings();

  const supplierDocRef = useMemo(() => {
    if (!user || !purchase?.supplierId) return null;
    return doc(firestore, 'users', user.uid, 'suppliers', purchase.supplierId);
  }, [firestore, user, purchase?.supplierId]);
  const { data: supplier } = useDoc<Supplier>(supplierDocRef);

  if (!purchase) return null;

  const handleShare = async () => {
    const defaultMessage = 'Comprobante de compra a [Nombre del proveedor]. Número: [Número de compra], Total: [Monto total].';
    const messageTemplate = settings?.purchaseReceiptMessage || defaultMessage;
    const supplierName = supplier ? supplier.name : 'Proveedor';

    const message = messageTemplate
      .replace(/\[Nombre del proveedor\]/g, supplierName)
      .replace(/\[Número de compra\]/g, purchase.purchaseNumber)
      .replace(/\[Monto total\]/g, formatCurrency(purchase.totalAmount));

    await shareAsImage(receiptRef.current, `comprobante-${purchase.purchaseNumber}.png`, 'Comprobante de Compra', message);
  };
  
  const handlePrint = () => window.print();
  
  const handleNewPurchase = () => setIsOpen(false);

  const handleGoToPurchases = () => router.push('/purchases');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md print:p-0 print:border-0">
        <DialogHeader className="no-print">
          <div className="flex flex-col items-center text-center gap-2">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <DialogTitle className="text-2xl">Compra Registrada</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="my-4 p-1">
            <PurchaseReceiptTemplate 
                ref={receiptRef}
                purchase={purchase}
                supplier={supplier}
            />
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 no-print">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2" /> Compartir
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2" /> Imprimir
          </Button>
           <Button onClick={handleGoToPurchases} variant="secondary" className="col-span-2">
            Ver Lista de Compras
          </Button>
          <Button onClick={handleNewPurchase} className="col-span-2" size="lg">
            Nueva Compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
