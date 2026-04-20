'use client';

import { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/date-picker';
import { toast } from '@/hooks/use-toast';
import { PAYMENT_METHODS } from '@/lib/constants';

interface TransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  supplierId: string;
  supplierName: string;
}

export function TransactionDialog({ isOpen, setIsOpen, supplierId, supplierName }: TransactionDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!user || !paymentDate || !amount) {
      toast({ variant: 'destructive', title: 'Por favor, completa los campos requeridos.' });
      return;
    }
    
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
        toast({ variant: 'destructive', title: 'El monto debe ser un número positivo.' });
        return;
    }

    try {
      const paymentData = {
          supplierId,
          amount: finalAmount,
          paymentMethod,
          paymentDate: paymentDate.toISOString(),
          notes,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
      };

      const paymentsCollection = collection(firestore, 'users', user.uid, 'supplier_payments');
      await addDocumentNonBlocking(paymentsCollection, paymentData);
      toast({ title: 'Pago registrado con éxito.' });
      
      setIsOpen(false);
      // Reset form on close
      setAmount('');
      setNotes('');
      setPaymentMethod(PAYMENT_METHODS[0].value);
      setPaymentDate(new Date());

    } catch (error) {
      console.error('Error adding payment:', error);
      toast({ variant: 'destructive', title: 'Error al registrar el pago.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Registrar Pago a {supplierName}</DialogTitle>
                <DialogDescription>
                    Añade un nuevo pago realizado a este proveedor.
                </DialogDescription>
            </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="amount">Monto Pagado</Label>
                <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paymentDate">Fecha de Pago</Label>
                <DatePicker 
                  date={paymentDate} 
                  setDate={setPaymentDate}
                />
             </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pago parcial de factura #123"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}