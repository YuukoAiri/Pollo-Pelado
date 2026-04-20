'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CustomerTransaction, Sale, CustomerPayment, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


interface TransactionDetailDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transaction: CustomerTransaction | null;
  onEdit: (transaction: CustomerTransaction) => void;
  products: Product[];
}

export function TransactionDetailDialog({ isOpen, setIsOpen, transaction, onEdit, products }: TransactionDetailDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  if (!transaction) return null;

  const isSale = transaction.type === 'Venta';
  const sale = isSale ? (transaction.original as Sale) : null;
  const payment = !isSale ? (transaction.original as CustomerPayment) : null;

  const handleEdit = () => {
    if (isSale && sale) {
        router.push(`/sales/${sale.id}/edit`);
    } else {
        onEdit(transaction);
    }
  };

  const handleDelete = async () => {
    if (!user || !firestore) return;

    if (isSale && sale) {
        const batch = writeBatch(firestore);

        // Restore stock
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && product.trackStock) {
                const productRef = doc(firestore, 'users', user.uid, 'products', item.productId);
                batch.update(productRef, { stock: increment(item.quantity) });
            }
        });

        // Delete sale
        const saleRef = doc(firestore, 'users', user.uid, 'sales', sale.id!);
        batch.delete(saleRef);

        try {
            await batch.commit();
            toast({ title: "Venta eliminada", description: "La venta ha sido eliminada y el stock ha sido restaurado." });
            setIsOpen(false);
        } catch (error) {
            console.error("Error deleting sale:", error);
            toast({ variant: "destructive", title: "Error al eliminar la venta." });
        }
    } else if (payment) {
        const paymentRef = doc(firestore, 'users', user.uid, 'customer_payments', payment.id!);
        try {
            await deleteDoc(paymentRef);
            toast({ title: "Pago eliminado" });
            setIsOpen(false);
        } catch (error) {
            console.error("Error deleting payment:", error);
            toast({ variant: "destructive", title: "Error al eliminar el pago." });
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Transacción</DialogTitle>
          <DialogDescription>
            {transaction.description} - {format(new Date(transaction.date), 'dd MMM yyyy, p', { locale: es })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isSale && sale ? (
            <div>
              <h3 className="font-semibold mb-2">Artículos de la Venta</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-right">
                <p className="font-bold text-lg">Total Venta: {formatCurrency(sale.totalAmount)}</p>
              </div>
            </div>
          ) : (
            payment && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span> 
                    <span className="font-semibold text-green-500 text-lg">{formatCurrency(payment.amount)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Método de Pago:</span> 
                    <span className="font-semibold">{payment.paymentMethod}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha y Hora:</span> 
                    <span className="font-semibold">{format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm', {locale: es})}</span>
                </div>
                {payment.notes && 
                <div className="pt-2 border-t">
                    <p className="text-muted-foreground">Notas:</p>
                    <p className="font-semibold">{payment.notes}</p>
                </div>
                }
              </div>
            )
          )}
        </div>
         <DialogFooter className="mt-4 flex justify-end gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Seguro que quieres eliminar esta transacción?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta acción no se puede deshacer. Se eliminará la transacción.
                           {isSale && <b className="text-destructive"> El stock de los productos será restaurado automáticamente.</b>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4"/>
                Editar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
