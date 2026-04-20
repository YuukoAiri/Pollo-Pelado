'use client';

import { useMemo, useState, useRef, Fragment } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCollection, useDoc, useUser, useFirestore } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { Customer, Sale, CustomerPayment, CustomerTransaction, Product } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { shareAsImage } from '@/lib/share-as-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Printer, Share2, Search, ShoppingCart, Banknote } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TransactionDialog } from '../transaction-dialog';
import { StatementTemplate } from './statement-template';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRangeFilterModal } from '../../../analytics/date-range-filter-modal';
import { startOfDay, endOfDay } from 'date-fns';
import { TransactionDetailDialog } from '../transaction-detail-dialog';

type StatementFilter = 'all' | 'sales' | 'payments';

export default function CustomerStatementPage() {
  const params = useParams();
  const { id: customerId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const statementRef = useRef<HTMLDivElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatementFilter>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CustomerTransaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<CustomerTransaction | null>(null);

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

  const productsQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'products');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef);
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<CustomerPayment>(paymentsQuery);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  
  const isLoading = isLoadingCustomer || isLoadingSales || isLoadingPayments || isLoadingProducts;

  // --- Data Processing ---
  const { allTransactions, balanceMap, finalBalance } = useMemo(() => {
    if (!sales || !payments) {
      return { allTransactions: [], balanceMap: new Map(), finalBalance: 0 };
    }

    const combined: CustomerTransaction[] = [];
    sales.forEach(s => combined.push({ id: s.id as string, date: s.saleDate, type: 'Venta', description: `Venta #${s.saleNumber}`, debit: s.totalAmount, credit: 0, original: s }));
    payments.forEach(p => combined.push({ id: p.id as string, date: p.paymentDate, type: 'Pago', description: `Pago con ${p.paymentMethod}`, debit: 0, credit: p.amount, original: p }));
    
    const sorted = [...combined].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let runningBalance = 0;
    const reversedForBalanceCalc = [...sorted].reverse();
    const newBalanceMap = new Map<string, number>();
    reversedForBalanceCalc.forEach(t => {
      runningBalance += t.debit - t.credit;
      newBalanceMap.set(t.id, runningBalance);
    });
    
    return { allTransactions: sorted, balanceMap: newBalanceMap, finalBalance: runningBalance };
  }, [sales, payments]);

  const transactionsWithBalance = useMemo(() => {
    let filtered = allTransactions;

    if (activeFilter === 'sales') {
      filtered = filtered.filter(t => t.type === 'Venta');
    }
    if (activeFilter === 'payments') {
      filtered = filtered.filter(t => t.type === 'Pago');
    }
    
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(t => {
            return (
                t.description.toLowerCase().includes(lowerSearch) ||
                (t.type === 'Venta' && (t.original as Sale).items.some(i => i.productName.toLowerCase().includes(lowerSearch))) ||
                t.debit.toString().includes(lowerSearch) ||
                t.credit.toString().includes(lowerSearch)
            );
        });
    }
    
    if (dateRange.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
        filtered = filtered.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= from && tDate <= to;
        });
    }

    return filtered.map(t => ({
      ...t,
      balance: balanceMap.get(t.id) ?? 0,
    }));
  }, [allTransactions, balanceMap, activeFilter, searchTerm, dateRange]);


  // --- Handlers ---
  const handleShare = async () => {
    if (!customer) return;
    await shareAsImage(statementRef.current, `estado-cuenta-${customer.firstName}.png`, `Estado de Cuenta de ${customer.firstName}`, `El saldo actual es ${formatCurrency(finalBalance)}.`);
  };
  const handlePrint = () => window.print();

  const getProductInfo = (transaction: CustomerTransaction) => {
    if (transaction.type === 'Pago') return { productName: '—', kg: '—', unitPrice: '—' };
    const sale = transaction.original as Sale;
    if (!sale.items || sale.items.length === 0) return { productName: 'Venta sin productos', kg: '—', unitPrice: '—' };
    const firstItem = sale.items[0];
    const unit = firstItem.unitOfMeasure;
    return {
        productName: firstItem.productName,
        kg: unit === 'kg' ? `${firstItem.quantity.toFixed(1)} kg` : `${firstItem.quantity} ${unit}`,
        unitPrice: unit === 'kg' || unit === 'unit' ? formatCurrency(firstItem.unitPrice) : '—',
    };
  };
  
  const handleRowClick = (transaction: CustomerTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };
  
  const handleOpenNewPaymentDialog = () => {
    setTransactionToEdit(null);
    setIsTransactionDialogOpen(true);
  };
  
  const handleEditTransaction = (transaction: CustomerTransaction) => {
    setIsDetailModalOpen(false);
    setTransactionToEdit(transaction);
    if(transaction.type === 'Pago') {
        setIsTransactionDialogOpen(true);
    }
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[60vh] w-full" /></div>;
  }

  return (
    <>
      <div className="flex flex-col gap-4 no-print">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Estado de Cuenta: {customer?.firstName} {customer?.lastName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Compartir</Button>
                <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="mr-2 h-4 w-4"/>Nuevo Movimiento</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                           <Link href={`/sales/new?customerId=${customerId}`}><ShoppingCart className="mr-2 h-4 w-4" />Registrar Venta</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleOpenNewPaymentDialog}>
                           <Banknote className="mr-2 h-4 w-4" />Registrar Pago
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>

        <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
                <Button variant={activeFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('all')}>Todos</Button>
                <Button variant={activeFilter === 'sales' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('sales')}>Ventas</Button>
                <Button variant={activeFilter === 'payments' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('payments')}>Pagos</Button>
            </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">N.</TableHead>
                  <TableHead>FECHA</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>PRODUCTO</TableHead>
                  <TableHead className="text-center">CANT.</TableHead>
                  <TableHead className="text-right">P.UNIT</TableHead>
                  <TableHead className="text-right">DEBE (S/)</TableHead>
                  <TableHead className="text-right">HABER (S/)</TableHead>
                  <TableHead className="text-right">SALDO (S/)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)}
                {!isLoading && transactionsWithBalance.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center">No hay transacciones para los filtros seleccionados.</TableCell></TableRow>
                )}
                {!isLoading && transactionsWithBalance.map((t, index) => {
                    const isMultiItemSale = t.type === 'Venta' && (t.original as Sale).items.length > 1;

                    if (isMultiItemSale) {
                        const sale = t.original as Sale;
                        return (
                            <Fragment key={t.id}>
                                <TableRow className="group cursor-pointer bg-muted/30 hover:bg-muted/50" onClick={() => handleRowClick(t)}>
                                    <TableCell className="text-muted-foreground font-medium">{(index + 1).toString().padStart(3, '0')}</TableCell>
                                    <TableCell className="font-medium">{format(parseISO(t.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                    <TableCell><Badge variant='destructive'>{sale.paymentMethod}</Badge></TableCell>
                                    <TableCell colSpan={3} className="font-semibold italic">Varios productos ({sale.items.length})</TableCell>
                                    <TableCell className="text-right text-red-500 font-bold">{formatCurrency(t.debit)}</TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">—</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(t.balance)}</TableCell>
                                </TableRow>
                                {sale.items.map((item, itemIndex) => (
                                    <TableRow key={`${t.id}-${itemIndex}`} className="group cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => handleRowClick(t)}>
                                        <TableCell colSpan={3}></TableCell>
                                        <TableCell className="pl-8 text-sm text-muted-foreground">{item.productName}</TableCell>
                                        <TableCell className="text-center text-sm text-muted-foreground">{`${item.quantity} ${item.unitOfMeasure}`}</TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right text-sm text-red-500">{formatCurrency(item.subtotal)}</TableCell>
                                        <TableCell colSpan={2}></TableCell>
                                    </TableRow>
                                ))}
                            </Fragment>
                        );
                    }

                    // Single item sale or payment
                    const productInfo = getProductInfo(t);
                    return (
                    <TableRow key={t.id} className="group cursor-pointer" onClick={() => handleRowClick(t)}>
                      <TableCell className="text-muted-foreground">{(index + 1).toString().padStart(3, '0')}</TableCell>
                      <TableCell>{format(parseISO(t.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'Venta' ? 'destructive' : 'default'} className={cn(t.type === 'Pago' && 'bg-green-600')}>
                            {(t.original as any).paymentMethod || t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{productInfo.productName}</TableCell>
                      <TableCell className="text-center">{productInfo.kg}</TableCell>
                      <TableCell className="text-right">{productInfo.unitPrice}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(t.balance)}</TableCell>
                    </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
         <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">{transactionsWithBalance.length} movimientos</p>
            <div className="text-right font-semibold text-lg">
                <span>Saldo Final: </span>
                <span className={cn(
                    "font-bold",
                    finalBalance > 0 ? 'text-red-500' : 'text-green-600'
                )}>
                    {formatCurrency(finalBalance)}
                </span>
            </div>
        </div>
      </div>
      
      <TransactionDialog 
        isOpen={isTransactionDialogOpen} 
        setIsOpen={setIsTransactionDialogOpen}
        customerId={customerId as string}
        customerName={`${customer?.firstName} ${customer?.lastName}`}
        payment={transactionToEdit?.type === 'Pago' ? transactionToEdit.original as CustomerPayment : null}
        onPaymentSuccess={() => {}}
        currentBalance={finalBalance}
      />
      <DateRangeFilterModal isOpen={isDateFilterOpen} setIsOpen={setIsDateFilterOpen} onApply={setDateRange} currentRange={dateRange} />
      
      <TransactionDetailDialog
        isOpen={isDetailModalOpen}
        setIsOpen={setIsDetailModalOpen}
        transaction={selectedTransaction}
        onEdit={handleEditTransaction}
        products={products || []}
      />

      <div className="absolute -left-[9999px] top-auto print:static">
        <StatementTemplate
          ref={statementRef} 
          customer={customer}
          transactions={transactionsWithBalance}
          summary={{charged: 0, paid: 0, balance: finalBalance}}
        />
      </div>
    </>
  );
}
