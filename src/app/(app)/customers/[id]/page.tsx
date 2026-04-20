'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDoc, useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { Customer, Sale, CustomerPayment, CustomerTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { shareAsImage } from '@/lib/share-as-image';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Printer, Share2, DollarSign, ShoppingCart, TrendingUp, MessageSquare, Phone, MapPin, Banknote, ArrowDownLeft, ArrowUp } from 'lucide-react';
import { TransactionDialog } from './transaction-dialog';
import { format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { SaleDetailModal } from '../../sales/sale-detail-modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSettings } from '@/firebase/settings-provider';
import { DebtSummaryTemplate } from './debt-summary-template';
import { useCollection } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { PaymentReceiptDialog } from './payment-receipt-dialog';
import { PaymentDetailModal } from './payment-detail-modal';

const customerEditSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  phone: z.string().optional(),
  address: z.string().optional(),
  allowCredit: z.boolean().default(false),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  identificationNumber: z.string().optional(),
  notes: z.string().optional(),
  companyName: z.string().optional(),
});

type CustomerEditFormData = z.infer<typeof customerEditSchema>;


export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: customerId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const debtSummaryRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSaleDetailModalOpen, setIsSaleDetailModalOpen] = useState(false);
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<Sale | null>(null);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{ payment: CustomerPayment; previousBalance: number; } | null>(null);

  const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{ tx: CustomerTransaction; balance: number } | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<CustomerPayment | null>(null);
  
  // --- Data Fetching ---
  const customerDocRef = useMemo(() => {
    if (!user || !customerId) return null;
    const q = doc(firestore, 'users', user.uid, 'customers', customerId as string);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, customerId]);
  
  const salesQuery = useMemo(() => {
    if (!user || !customerId) return null;
    const q = query(
        collection(firestore, 'users', user.uid, 'sales'), 
        where('customerId', '==', customerId),
        orderBy('saleDate', 'desc')
    );
    (q as any).__memo = true;
    return q;
  }, [firestore, user, customerId]);
  
  const paymentsQuery = useMemo(() => {
    if (!user || !customerId) return null;
    const q = query(
        collection(firestore, 'users', user.uid, 'customer_payments'), 
        where('customerId', '==', customerId),
        orderBy('paymentDate', 'desc')
    );
    (q as any).__memo = true;
    return q;
  }, [firestore, user, customerId]);

  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef);
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<CustomerPayment>(paymentsQuery);
  
  const isLoading = isLoadingCustomer || isLoadingSales || isLoadingPayments;

  const form = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
        firstName: '', lastName: '', phone: '', address: '',
        allowCredit: false, email: '', identificationNumber: '', notes: '', companyName: ''
    }
  });
  
  const { isDirty, isSubmitting } = form.formState;

  useEffect(() => {
    if (customer && !form.formState.isDirty) {
      form.reset({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phone: customer.phone || '',
        address: customer.address || '',
        allowCredit: customer.allowCredit || false,
        email: customer.email || '',
        identificationNumber: customer.identificationNumber || '',
        notes: customer.notes || '',
        companyName: customer.companyName || '',
      });
    }
  }, [customer, form]);


  // --- Data Processing ---
  const { allTransactions, balanceMap, totalSales, totalPaid, balance } = useMemo(() => {
    const totalSalesValue = sales?.reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;
    const totalPaidValue = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const balanceValue = totalSalesValue - totalPaidValue;

    const combined: CustomerTransaction[] = [];
    (sales || []).forEach(s => combined.push({ id: s.id as string, date: s.saleDate, type: 'Venta', description: `Venta #${s.saleNumber}`, debit: s.totalAmount, credit: 0, original: s }));
    (payments || []).forEach(p => combined.push({ id: p.id as string, date: p.paymentDate, type: 'Pago', description: `Pago con ${p.paymentMethod}`, debit: 0, credit: p.amount, original: p }));
    
    const sorted = [...combined].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let runningBalance = 0;
    const reversedForBalanceCalc = [...sorted].reverse(); // Oldest first
    const newBalanceMap = new Map<string, number>();
    reversedForBalanceCalc.forEach(t => {
      runningBalance += t.debit - t.credit;
      newBalanceMap.set(t.id, runningBalance);
    });

    return { allTransactions: sorted, balanceMap: newBalanceMap, totalSales: totalSalesValue, totalPaid: totalPaidValue, balance: balanceValue };
}, [sales, payments]);
  
  const groupedSales = useMemo(() => {
    if (!sales) return [];

    const groups = sales.reduce((acc, sale) => {
      const saleDate = parseISO(sale.saleDate);
      let dayKey: string;

      if (isToday(saleDate)) {
        dayKey = 'Hoy';
      } else if (isYesterday(saleDate)) {
        dayKey = 'Ayer';
      } else {
        dayKey = format(saleDate, "eeee, dd 'de' MMMM", { locale: es });
      }

      if (!acc[dayKey]) {
        acc[dayKey] = {
          date: startOfDay(saleDate),
          sales: [],
          totalAmount: 0,
        };
      }

      acc[dayKey].sales.push(sale);
      acc[dayKey].totalAmount += sale.totalAmount;
      return acc;
    }, {} as Record<string, { date: Date, sales: Sale[], totalAmount: number }>);
    
    const sortedGroups = Object.entries(groups)
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    sortedGroups.forEach(group => {
      group.sales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    });

    return sortedGroups;
  }, [sales]);

  const groupedPayments = useMemo(() => {
    if (!allTransactions) return [];
    
    const paymentTransactions = allTransactions.filter(t => t.type === 'Pago');

    const groups = paymentTransactions.reduce((acc, payment) => {
        const paymentDate = parseISO(payment.date);
        let dayKey: string;

        if (isToday(paymentDate)) dayKey = 'Hoy';
        else if (isYesterday(paymentDate)) dayKey = 'Ayer';
        else dayKey = format(paymentDate, "eeee, dd 'de' MMMM", { locale: es });

        if (!acc[dayKey]) {
            acc[dayKey] = { title: dayKey, date: startOfDay(paymentDate), payments: [], totalAmount: 0 };
        }

        acc[dayKey].payments.push(payment);
        acc[dayKey].totalAmount += payment.credit;
        return acc;
    }, {} as Record<string, { title: string; date: Date, payments: CustomerTransaction[], totalAmount: number }>);
    
    const sortedGroups = Object.values(groups)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    sortedGroups.forEach(group => {
      group.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return sortedGroups;
  }, [allTransactions]);


  // --- Handlers ---
  const handlePaymentSuccess = (payment: CustomerPayment, previousBalance: number) => {
    setReceiptData({ payment, previousBalance });
    setIsReceiptOpen(true);
  };
  
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (customer && customer.phone) {
        const cleanPhone = customer.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (customer && customer.phone) {
        window.location.href = `tel:${customer.phone.replace(/\D/g, '')}`;
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (customer?.address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`, '_blank');
    }
  };

  const handleUpdateCustomer = async (data: CustomerEditFormData) => {
    if (!customerDocRef) return;
    try {
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      await updateDocumentNonBlocking(customerDocRef, updatedData);
      
      toast({
        title: "Cliente Actualizado",
        description: "Los cambios han sido guardados.",
      });
    } catch (error) {
      console.error("Error updating customer:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al actualizar el cliente.",
      });
    }
  };
  
  const handleShareAccount = async () => {
    if (!customer) return;

    let shareTitle: string;
    let message: string;
    let fileName: string;

    const defaultDebtMessage = `¡Hola [Nombre del cliente]! 👋 Esperamos que estés bien. Te recordamos que tu cuenta hasta la fecha [ingresar fecha] es por el [ingresar monto + símbolo de la moneda]. Puedes realizar tu pago mediante : [ YAPE - PLIN ]. ¡Muchas gracias!`;
    
    if (balance > 0) {
        shareTitle = `Recordatorio de Deuda`;
        fileName = `recordatorio-deuda-${customer.firstName}.png`;
        const messageTemplate = settings?.debtReminderMessage || defaultDebtMessage;
        message = messageTemplate
            .replace(/\[Nombre del cliente\]/g, customer.firstName)
            .replace(/\[ingresar fecha\]/g, new Date().toLocaleDateString('es-ES'))
            .replace(/\[ingresar monto \+ símbolo de la moneda\]/g, formatCurrency(balance));
    } else {
        shareTitle = `Estado de Cuenta`;
        fileName = `estado-cuenta-${customer.firstName}.png`;
        if (balance < 0) {
            message = `¡Hola ${customer.firstName}! 👋 Tu estado de cuenta muestra un saldo a tu favor de ${formatCurrency(Math.abs(balance))}. ¡Gracias por tu confianza!`;
        } else { // balance === 0
            message = `¡Hola ${customer.firstName}! 👋 Tu cuenta está al día. No tienes saldos pendientes. ¡Gracias por tu preferencia!`;
        }
    }
    
    await shareAsImage(debtSummaryRef.current, fileName, shareTitle, message);
  };

  const handleViewSaleDetails = (sale: Sale) => {
    setSelectedSaleForModal(sale);
    setIsSaleDetailModalOpen(true);
  };
  
  const handleViewPaymentDetails = (transaction: CustomerTransaction) => {
    const balance = balanceMap.get(transaction.id);
    if (balance === undefined) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el saldo para esta transacción.' });
      return;
    }
    setSelectedTransaction({ tx: transaction, balance });
    setIsPaymentDetailModalOpen(true);
  };

  const handleEditPayment = (payment: CustomerPayment) => {
      setPaymentToEdit(payment);
      setIsPaymentDetailModalOpen(false); // Close detail
      setIsTransactionDialogOpen(true); // Open edit dialog
  };

  const handleDeletePayment = (paymentId: string) => {
      if (!user) return;
      const docRef = doc(firestore, 'users', user.uid, 'customer_payments', paymentId);
      deleteDocumentNonBlocking(docRef);
      toast({ title: "Pago eliminado", description: "El registro ha sido eliminado." });
      setIsPaymentDetailModalOpen(false);
  };


  if (isLoadingCustomer) {
    return <div className="p-8"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!customer) {
    return <PageHeader title="Cliente no encontrado" />;
  }
  
  const customerName = `${customer.firstName} ${customer.lastName}`;

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader title={customerName} description={`Viendo detalles para ${customerName}`}>
          <div className="flex gap-2">
            <Button onClick={() => setIsTransactionDialogOpen(true)}><Plus className="mr-2"/>Agregar Pago</Button>
          </div>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total en Ventas" value={totalSales} icon={ShoppingCart} isLoading={isLoading} />
          <StatCard title="Total Pagado" value={totalPaid} icon={DollarSign} isLoading={isLoading} />
          <StatCard title="Saldo Actual" value={balance} icon={TrendingUp} isLoading={isLoading} />
        </div>
        
        <Tabs defaultValue="account">
            <TabsList>
                <TabsTrigger value="account">Cuenta</TabsTrigger>
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="payments">Pagos</TabsTrigger>
                <TabsTrigger value="details">Datos del Cliente</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
                 <Card>
                    <CardContent className="pt-6 text-center flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">SALDO ACTUAL</p>
                        <p className={cn("text-6xl font-bold tracking-tighter", balance > 0 ? 'text-red-500' : 'text-green-500')}>
                            {formatCurrency(balance)}
                        </p>
                        <Button 
                            onClick={() => setIsTransactionDialogOpen(true)} 
                            className="bg-red-500 hover:bg-red-600 text-white"
                            disabled={balance <= 0}
                        >
                            Pagar débito
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Última actualización: {format(new Date(), 'dd/MM/yy p', { locale: es })}
                        </p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2">
                        <Button asChild variant="outline">
                           <Link href={`/customers/${customerId}/statement`}>Extracto de cuenta</Link>
                        </Button>
                        <Button variant="outline" onClick={handleShareAccount} disabled={!customer}>Compartir cuenta</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="sales" className="mt-4">
                <div className="space-y-6">
                    {groupedSales.map((group) => (
                    <div key={group.title}>
                        <div className="mb-3">
                        <h2 className="font-bold capitalize text-lg">{group.title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {group.sales.length} Venta{group.sales.length === 1 ? '' : 's'}, {formatCurrency(group.totalAmount)}
                        </p>
                        </div>
                        <div className="space-y-2">
                        {group.sales.map(sale => {
                            let itemSummary = 'Venta sin items';
                            if (sale.items.length > 0) {
                                const item = sale.items[0];
                                let unitLabel = item.unitOfMeasure;
                                if (unitLabel === 'unit') {
                                    unitLabel = 'unid.';
                                } else if (unitLabel) {
                                    unitLabel = unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1) + '.';
                                } else {
                                    unitLabel = 'x';
                                }
                                itemSummary = `${item.quantity} ${unitLabel} ${item.productName}${sale.items.length > 1 ? ` +${sale.items.length - 1}` : ''}`;
                            }

                            const saleTime = format(parseISO(sale.saleDate), 'p', { locale: es });

                            return (
                            <div key={sale.id} onClick={() => handleViewSaleDetails(sale)} className="bg-card p-3.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform">
                                <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    {sale.status === 'Pending' ? <ArrowDownLeft className="h-5 w-5 text-red-500" /> : <Banknote className="h-5 w-5 text-green-500" />}
                                    <div>
                                    <p className="font-bold text-lg">{formatCurrency(sale.totalAmount)}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{itemSummary}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground pt-1">{saleTime}</span>
                                </div>
                            </div>
                            )
                        })}
                        </div>
                    </div>
                    ))}
                    {isLoadingSales && (
                    <div className="space-y-6 mt-4">
                        {[...Array(2)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                        ))}
                    </div>
                    )}
                    {!isLoadingSales && groupedSales.length === 0 && (
                    <div className="text-center text-muted-foreground py-24">
                        <p>No se encontraron ventas para este cliente.</p>
                    </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
                <div className="space-y-6">
                    {groupedPayments.map((group) => (
                    <div key={group.title}>
                        <div className="mb-3">
                        <h2 className="font-bold capitalize text-lg">{group.title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {group.payments.length} Pago{group.payments.length === 1 ? '' : 's'}, {formatCurrency(group.totalAmount)}
                        </p>
                        </div>
                        <div className="space-y-2">
                        {group.payments.map(paymentTx => {
                            const paymentTime = format(parseISO(paymentTx.date), 'p', { locale: es });
                            return (
                            <div key={paymentTx.id} onClick={() => handleViewPaymentDetails(paymentTx)} className="bg-card p-3.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform">
                                <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <ArrowUp className="h-5 w-5 text-green-500" />
                                    <div>
                                    <p className="font-bold text-lg">{formatCurrency(paymentTx.credit)}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        Pago con {(paymentTx.original as CustomerPayment).paymentMethod}
                                    </p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground pt-1">{paymentTime}</span>
                                </div>
                            </div>
                            )
                        })}
                        </div>
                    </div>
                    ))}
                    {isLoadingPayments && (
                    <div className="space-y-6 mt-4">
                        {[...Array(2)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                        ))}
                    </div>
                    )}
                    {!isLoadingPayments && groupedPayments.length === 0 && (
                    <div className="text-center text-muted-foreground py-24">
                        <p>No se encontraron pagos para este cliente.</p>
                    </div>
                    )}
                </div>
            </TabsContent>
             <TabsContent value="details" className="mt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleUpdateCustomer)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <Avatar className="h-24 w-24">
                                  <AvatarFallback className="text-3xl bg-muted"><MapPin className="h-10 w-10 text-muted-foreground"/></AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-8">
                                  <Button type="button" variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-muted" onClick={handleWhatsAppClick}>
                                    <MessageSquare />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-muted" onClick={handlePhoneClick}>
                                    <Phone />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-muted" onClick={handleMapClick}>
                                    <MapPin />
                                  </Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                               <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl><Input placeholder="Nombre(s) del cliente" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Apellido</FormLabel>
                                    <FormControl><Input placeholder="Apellido(s) del cliente" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Móvil/WhatsApp</FormLabel>
                                    <FormControl><Input type="tel" placeholder="987654321" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <Accordion type="single" collapsible>
                              <AccordionItem value="item-1">
                                <AccordionTrigger>Opcionales</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                  <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Dirección</FormLabel>
                                        <FormControl><Input placeholder="Av. Principal 123" {...field} /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input type="email" placeholder="cliente@email.com" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                  <FormField
                                    control={form.control}
                                    name="companyName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Nombre de la Empresa</FormLabel>
                                        <FormControl><Input placeholder="Compañía S.A.C." {...field} /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="identificationNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Nº de Identificación (DNI/RUC)</FormLabel>
                                        <FormControl><Input placeholder="12345678" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                            
                            <FormField
                              control={form.control}
                              name="allowCredit"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>Permitir ventas a crédito</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                        </CardContent>
                        <CardFooter>
                           <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                              {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
                           </Button>
                        </CardFooter>
                    </Card>
                </form>
                </Form>
            </TabsContent>
        </Tabs>
      </div>

      <TransactionDialog 
        isOpen={isTransactionDialogOpen} 
        setIsOpen={(isOpen) => {
            setIsTransactionDialogOpen(isOpen);
            if (!isOpen) setPaymentToEdit(null); // Reset on close
        }}
        customerId={customerId as string}
        customerName={customerName}
        payment={paymentToEdit}
        onPaymentSuccess={handlePaymentSuccess}
        currentBalance={balance}
      />
      
      <PaymentReceiptDialog
        isOpen={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        payment={receiptData?.payment ?? null}
        customer={customer}
        previousBalance={receiptData?.previousBalance ?? 0}
      />

      <PaymentDetailModal
        isOpen={isPaymentDetailModalOpen}
        onOpenChange={setIsPaymentDetailModalOpen}
        transaction={selectedTransaction?.tx ?? null}
        balance={selectedTransaction?.balance ?? null}
        customer={customer}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
      />

      <div className="absolute -left-[9999px] top-auto print:static">
        {customer && <DebtSummaryTemplate ref={debtSummaryRef} customer={customer} balance={balance} />}
      </div>
      <SaleDetailModal
        isOpen={isSaleDetailModalOpen}
        onOpenChange={setIsSaleDetailModalOpen}
        sale={selectedSaleForModal}
        customer={customer}
      />
    </>
  );
}
