'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/date-picker';
import { toast } from '@/hooks/use-toast';
import { PAYMENT_METHODS } from '@/lib/constants';
import { CustomerPayment } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface TransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customerId: string;
  customerName: string;
  payment?: CustomerPayment | null;
  onPaymentSuccess: (payment: CustomerPayment, previousBalance: number) => void;
  currentBalance: number;
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  paymentMethod: z.string().min(1, "El método de pago es requerido."),
  paymentDate: z.date({ required_error: "La fecha de pago es requerida."}),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export function TransactionDialog({ isOpen, setIsOpen, customerId, customerName, payment, onPaymentSuccess, currentBalance }: TransactionDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: PAYMENT_METHODS[0].value,
      paymentDate: new Date(),
      notes: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        form.reset({
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: new Date(payment.paymentDate),
          notes: payment.notes || '',
        });
      } else {
        form.reset({
          amount: 0,
          paymentMethod: PAYMENT_METHODS[0].value,
          paymentDate: new Date(),
          notes: ''
        });
      }
    }
  }, [payment, isOpen, form]);

  const handleSubmit = async (data: PaymentFormData) => {
    if (!user) return;

    try {
      if (payment) { // Editing existing payment
        const docRef = doc(firestore, 'users', user.uid, 'customer_payments', payment.id!);
        const updatedData = {
          ...data,
          paymentDate: data.paymentDate.toISOString(),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(docRef, updatedData);
        toast({ title: 'Pago actualizado con éxito.' });
        
        const finalPayment: CustomerPayment = { ...payment, ...updatedData };
        const previousBalance = currentBalance + payment.amount - finalPayment.amount;
        onPaymentSuccess(finalPayment, previousBalance);

      } else { // Creating new payment
        const paymentsCollection = collection(firestore, 'users', user.uid, 'customer_payments');
        const newPaymentData = {
          customerId,
          ...data,
          paymentDate: data.paymentDate.toISOString(),
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(paymentsCollection, newPaymentData);
        toast({ title: 'Pago registrado con éxito.' });

        const finalPayment: CustomerPayment = { id: docRef.id, ...newPaymentData } as CustomerPayment;
        onPaymentSuccess(finalPayment, currentBalance);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({ variant: 'destructive', title: 'Error al guardar el pago.' });
    }
  };

  const title = payment ? `Editar Pago de ${customerName}` : `Registrar Pago de ${customerName}`;
  const description = payment ? "Modifica los detalles de este pago." : "Añade un nuevo pago o abono recibido de este cliente.";
  const buttonText = payment ? 'Guardar Cambios' : 'Guardar Pago';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Recibido</FormLabel>
                    <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecciona un método" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Ej: Abono a cuenta" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{buttonText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
