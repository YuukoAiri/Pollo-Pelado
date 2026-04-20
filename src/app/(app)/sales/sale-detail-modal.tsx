'use client';

import { useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sale, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { shareAsImage } from '@/lib/share-as-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Share2, Printer, User, ArrowRight, Pencil } from 'lucide-react';
import { ReceiptTemplate } from '@/components/receipt-template';

interface SaleDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  customer: Customer | null;
}

export function SaleDetailModal({ isOpen, onOpenChange, sale, customer }: SaleDetailModalProps) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!sale) return;
    await shareAsImage(receiptRef.current, `comprobante-${sale.saleNumber}.jpg`, `Comprobante de Venta`, `Total: ${sale.totalAmount}`);
  };

  const handlePrint = () => {
    if (sale) {
        router.push(`/sales/${sale.id}`);
    }
  };
  
  const handleEdit = () => {
    if (sale) {
        onOpenChange(false);
        router.push(`/sales/${sale.id}/edit`);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de Venta: {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            {format(parseISO(sale.saleDate), "dd 'de' MMMM 'de' yyyy, p", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="customer">Cliente</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Resumen de Venta</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Ver/Imprimir</Button>
                  <Button variant="outline" size="sm" onClick={handleEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Venta</div>
                  <div className="text-xl font-bold">{formatCurrency(sale.totalAmount)}</div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">P. Venta</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unitOfMeasure}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                {customer ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                       <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                            {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                          </AvatarFallback>
                       </Avatar>
                       <div>
                         <p className="font-bold text-xl">{customer.firstName} {customer.lastName}</p>
                         <p className="text-muted-foreground">{customer.email || 'Sin email'}</p>
                       </div>
                    </div>
                    <Button onClick={() => {
                        if (customer?.id) {
                            onOpenChange(false);
                            router.push(`/customers/${customer.id}`);
                        }
                    }}>
                        Ver Estado de Cuenta Completo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Venta realizada a un cliente ocasional.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="absolute -left-[9999px] top-auto print:static">
           <div className="print:block">
             <ReceiptTemplate
                ref={receiptRef}
                sale={sale}
                customer={customer}
              />
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
