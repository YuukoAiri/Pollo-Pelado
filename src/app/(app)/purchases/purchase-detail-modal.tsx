'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Purchase, Supplier, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { shareAsImage } from '@/lib/share-as-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Share2, Printer, Pencil, Trash2 } from 'lucide-react';
import { PurchaseReceiptTemplate } from '@/components/purchase-receipt-template';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
  supplier: Supplier | null;
  products: Product[] | null;
}

export function PurchaseDetailModal({ isOpen, onOpenChange, purchase, supplier, products }: PurchaseDetailModalProps) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const handleShare = async () => {
    if (!purchase) return;
    await shareAsImage(receiptRef.current, `compra-${purchase.purchaseNumber}.jpg`, `Comprobante de Compra`, `Total: ${formatCurrency(purchase.totalAmount)}`);
  };

  const handlePrint = () => {
    if (purchase) {
      router.push(`/purchases/${purchase.id}`);
    }
  };
  
  const handleEdit = () => {
    if (purchase) {
        onOpenChange(false);
        router.push(`/purchases/${purchase.id}/edit`);
    }
  };
  
  const handleDelete = async () => {
    if (!user || !firestore || !purchase || !products) return;

    const batch = writeBatch(firestore);

    // Adjust stock: deleting a purchase means the items were not acquired, so stock must decrease.
    purchase.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.trackStock) {
            const productRef = doc(firestore, 'users', user.uid, 'products', item.productId);
            batch.update(productRef, { stock: increment(-item.quantity) });
        }
    });

    // Delete purchase document
    const purchaseRef = doc(firestore, 'users', user.uid, 'purchases', purchase.id!);
    batch.delete(purchaseRef);

    try {
        await batch.commit();
        toast({ title: "Compra eliminada", description: "La compra ha sido eliminada y el stock ha sido ajustado." });
        onOpenChange(false);
    } catch (error) {
        console.error("Error deleting purchase:", error);
        toast({ variant: "destructive", title: "Error al eliminar la compra.", description: "No se pudo completar la operación." });
    }
  };

  if (!purchase) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Compra: {purchase.purchaseNumber}</DialogTitle>
          <DialogDescription>
            {format(parseISO(purchase.purchaseDate), "dd 'de' MMMM 'de' yyyy, p", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
            <h3 className="font-semibold mb-2">Artículos de la Compra</h3>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchase.items.map((item, index) => (
                <TableRow key={index}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">{`${item.quantity} ${item.unitOfMeasure || ''}`.trim()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
            <div className="mt-4 text-right">
            <p className="font-bold text-lg">Total Compra: {formatCurrency(purchase.totalAmount)}</p>
            </div>
        </div>

        <DialogFooter className="mt-4 flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
            <Button variant="outline" size="sm" onClick={handleEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Seguro que quieres eliminar esta compra?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta acción no se puede deshacer. El stock de los productos involucrados será ajustado automáticamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DialogFooter>

        <div className="absolute -left-[9999px] top-auto">
            <PurchaseReceiptTemplate 
              ref={receiptRef} 
              purchase={purchase}
              supplier={supplier}
            />
        </div>

      </DialogContent>
    </Dialog>
  );
}
