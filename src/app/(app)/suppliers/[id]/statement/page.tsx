'use client';
import { useMemo, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDoc, useUser, useFirestore } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { Supplier, Purchase, SupplierPayment, SupplierTransaction } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { shareAsImage } from '@/lib/share-as-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Printer, Share2, Search, ShoppingCart, Banknote } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatementTemplate } from './statement-template';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SupplierStatementPage() {
  const params = useParams();
  const { id: supplierId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const statementRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Data Fetching ---
  const supplierDocRef = useMemo(() => {
    if (!user || !supplierId) return null;
    return doc(firestore, 'users', user.uid, 'suppliers', supplierId as string);
  }, [firestore, user, supplierId]);
  
  const purchasesQuery = useMemo(() => {
    if (!user || !supplierId) return null;
    return query(
        collection(firestore, 'users', user.uid, 'purchases'), 
        where('supplierId', '==', supplierId),
        orderBy('purchaseDate', 'desc')
    );
  }, [firestore, user, supplierId]);
  
  const paymentsQuery = useMemo(() => {
    if (!user || !supplierId) return null;
    return query(
        collection(firestore, 'users', user.uid, 'supplier_payments'), 
        where('supplierId', '==', supplierId),
        orderBy('paymentDate', 'desc')
    );
  }, [firestore, user, supplierId]);

  const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierDocRef);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<SupplierPayment>(paymentsQuery);
  
  const isLoading = isLoadingSupplier || isLoadingPurchases || isLoadingPayments;

  // --- Data Processing ---
  const { allTransactions, finalBalance } = useMemo(() => {
    if (!purchases || !payments) {
      return { allTransactions: [], finalBalance: 0 };
    }

    const combined: SupplierTransaction[] = [];
    purchases.forEach(p => combined.push({ id: p.id as string, date: p.purchaseDate, type: 'Compra', description: `Compra #${p.purchaseNumber}`, debit: p.totalAmount, credit: 0, original: p }));
    payments.forEach(p => combined.push({ id: p.id as string, date: p.paymentDate, type: 'Pago', description: `Pago con ${p.paymentMethod}`, debit: 0, credit: p.amount, original: p }));
    
    const sorted = [...combined].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const balance = (purchases?.reduce((sum, p) => sum + p.totalAmount, 0) ?? 0) - (payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0);
    
    return { allTransactions: sorted, finalBalance: balance };
  }, [purchases, payments]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return allTransactions;
    const lowerSearch = searchTerm.toLowerCase();
    return allTransactions.filter(t => t.description.toLowerCase().includes(lowerSearch));
  }, [allTransactions, searchTerm]);

  // --- Handlers ---
  const handleShare = async () => {
    if (!supplier) return;
    await shareAsImage(statementRef.current, `estado-cuenta-${supplier.name}.png`, `Estado de Cuenta de ${supplier.name}`, `El saldo actual es ${formatCurrency(finalBalance)}.`);
  };
  const handlePrint = () => window.print();

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[60vh] w-full" /></div>;
  }

  return (
    <>
      <div className="flex flex-col gap-4 no-print">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Estado de Cuenta: {supplier?.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Compartir</Button>
                <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            </div>
        </header>

        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FECHA</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>DESCRIPCIÓN</TableHead>
                  <TableHead className="text-right">DEBE</TableHead>
                  <TableHead className="text-right">HABER</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(parseISO(t.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'Compra' ? 'destructive' : 'default'} className={cn(t.type === 'Pago' && 'bg-green-600')}>
                            {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex justify-end items-center mt-4">
            <div className="text-right font-semibold text-lg">
                <span>Saldo Final: </span>
                <span className={cn("font-bold", finalBalance > 0 ? 'text-red-500' : 'text-green-600')}>
                    {formatCurrency(finalBalance)}
                </span>
            </div>
        </div>
      </div>
      
      <div className="absolute -left-[9999px] top-auto print:static">
        <StatementTemplate
          ref={statementRef} 
          supplier={supplier}
          transactions={allTransactions}
          summary={{balance: finalBalance}}
        />
      </div>
    </>
  );
}
