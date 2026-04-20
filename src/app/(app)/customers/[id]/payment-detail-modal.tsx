'use client';

import React, { useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CustomerTransaction, Customer, CustomerPayment } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, User, MessageSquare, Banknote, ArrowUp } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { shareAsImage } from '@/lib/share-as-image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';

// This is a new component for the shareable image content, simplified for sharing.
const PaymentDetailTemplate = React.forwardRef<HTMLDivElement, {
  payment: CustomerPayment;
  customer: Customer | null;
  previousBalance: number;
  newBalance: number;
}>(({ payment, customer, previousBalance, newBalance }, ref) => {
    return (
        <div ref={ref} className="bg-background p-6 rounded-lg w-[380px] text-foreground">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-muted rounded-full p-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-bold">{customer?.firstName} {customer?.lastName}</h3>
            </div>
            <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Pago con {payment.paymentMethod}</p>
                <p className="font-bold text-4xl text-green-600 tracking-tight">{formatCurrency(payment.amount)}</p>
            </div>
            <div className="space-y-2 text-base bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Saldo Anterior</p>
                    <p className={cn("font-medium", previousBalance > 0 ? "text-red-500" : "text-green-600")}>
                        {previousBalance > 0 ? `-${formatCurrency(previousBalance)}` : formatCurrency(previousBalance)}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <p className="flex items-center gap-2 text-green-600"><ArrowUp className="h-4 w-4" /> Pago</p>
                    <p className="font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold">
                    <p>Nuevo Saldo</p>
                     <p className={cn(newBalance > 0 ? "text-red-500" : "text-green-600")}>
                        {newBalance > 0 ? `-${formatCurrency(newBalance)}` : formatCurrency(newBalance)}
                    </p>
                </div>
            </div>
        </div>
    );
});
PaymentDetailTemplate.displayName = 'PaymentDetailTemplate';


interface PaymentDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction: CustomerTransaction | null;
  balance: number | null;
  customer: Customer | null;
  onEdit: (payment: CustomerPayment) => void;
  onDelete: (paymentId: string) => void;
}

export function PaymentDetailModal({ isOpen, onOpenChange, transaction, balance, customer, onEdit, onDelete }: PaymentDetailModalProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  
  if (!transaction || transaction.type !== 'Pago' || balance === null) return null;

  const payment = transaction.original as CustomerPayment;
  const newBalance = balance;
  const previousBalance = newBalance + payment.amount;

  const handleEdit = () => {
    onEdit(payment);
  };

  const handleDelete = () => {
    onDelete(payment.id!);
  };

  const handleShare = async () => {
    if (customer) {
        const message = `Hola ${customer.firstName}, te envío el comprobante de tu último pago.`;
        await shareAsImage(shareRef.current, `pago-${customer.firstName}.png`, 'Comprobante de Pago', message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-full sm:h-auto flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 flex-row items-center justify-between border-b">
          <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <DialogTitle className="font-bold text-lg">{customer?.firstName} {customer?.lastName}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleShare}>
                <MessageSquare className="h-5 w-5 text-green-500" />
                Enviar comprobante de pago
            </Button>

            <Card className="bg-muted/50 shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Banknote className="h-7 w-7 text-muted-foreground" />
                        <span className="font-medium">{payment.paymentMethod}</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-green-600">
                        {formatCurrency(payment.amount)}
                    </span>
                </CardContent>
            </Card>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">DETALLES</TabsTrigger>
                    <TabsTrigger value="customer">CLIENTE</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                     <div className="space-y-3 text-base">
                        <div className="flex justify-between items-center">
                            <p>Saldo anterior</p>
                            <p className={cn("font-medium", previousBalance > 0 ? "text-red-500" : "text-green-600")}>
                                {previousBalance > 0 ? `-${formatCurrency(previousBalance)}` : formatCurrency(previousBalance)}
                            </p>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="flex items-center gap-2 text-green-600"><ArrowUp className="h-4 w-4"/> Pago de débito</p>
                            <p className="font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
                        </div>
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center font-bold text-lg">
                        <p>Nuevo Saldo</p>
                         <p className={cn(newBalance > 0 ? "text-red-500" : "text-green-600")}>
                            {newBalance > 0 ? `-${formatCurrency(newBalance)}` : formatCurrency(newBalance)}
                        </p>
                    </div>

                    {payment.notes && (
                        <div className="mt-4 border bg-card p-3 rounded-md">
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm text-muted-foreground">{payment.notes}</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="customer">
                    <p className="p-4 text-center text-muted-foreground">Información del cliente (en desarrollo).</p>
                </TabsContent>
            </Tabs>
        </div>

        <DialogFooter className="flex flex-col gap-2 p-4 border-t mt-auto">
            <p className="text-xs text-muted-foreground text-center">
                {format(new Date(payment.paymentDate), "dd MMMM yyyy -- hh:mm a", { locale: es })}
            </p>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="w-full">Eliminar o modificar pago</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[--radix-dropdown-menu-trigger-width]]">
                     <DropdownMenuItem onClick={handleEdit}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar Pago
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                             <Trash2 className="mr-2 h-4 w-4"/> Eliminar Pago
                           </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Seguro que quieres eliminar este pago?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer y afectará el saldo del cliente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </DialogFooter>

        {/* Hidden component for sharing */}
        <div className="absolute -left-[9999px] top-auto">
            <PaymentDetailTemplate 
              ref={shareRef}
              payment={payment}
              customer={customer}
              previousBalance={previousBalance}
              newBalance={newBalance}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
