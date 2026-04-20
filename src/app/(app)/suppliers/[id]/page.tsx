'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { Supplier, Purchase, SupplierPayment, SupplierTransaction } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Printer, Share2, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { TransactionDialog } from './transaction-dialog';
import { format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCollection } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { SupplierForm } from '../supplier-form';
import { PurchaseDetailModal } from '../../purchases/purchase-detail-modal';
import Link from 'next/link';

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-2/3" /> : <div className="text-2xl font-bold">{typeof value === 'number' ? formatCurrency(value) : value}</div>}
      </CardContent>
    </Card>
  );
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: supplierId } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isPurchaseDetailModalOpen, setIsPurchaseDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

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
      where('supplierId', '==', supplierId)
    );
    
  }, [firestore, user, supplierId]);

  const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierDocRef);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<SupplierPayment>(paymentsQuery);
  const productsQuery = useMemo(() => {
    if (!user) return null;
  
    const q = collection(firestore, 'users', user.uid, 'products');
    (q as any).__memo = true;
  
    return q;
  }, [user, firestore]);
  
  const { data: products } = useCollection(productsQuery);
  
  const isLoading = isLoadingSupplier || isLoadingPurchases || isLoadingPayments;

  // --- Data Processing ---
  const { totalPurchases, totalPaid, balance } = useMemo(() => {
    const totalPurchasesValue = purchases?.reduce((sum, p) => sum + p.totalAmount, 0) ?? 0;
    const totalPaidValue = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const balanceValue = totalPurchasesValue - totalPaidValue;
    return { totalPurchases: totalPurchasesValue, totalPaid: totalPaidValue, balance: balanceValue };
}, [purchases, payments]);
  
  const groupedPurchases = useMemo(() => {
    if (!purchases) return [];
    // Grouping and sorting logic remains the same as customer detail page
    // ...
    return [];
  }, [purchases]);

  // --- Handlers ---
  const handleUpdateSupplier = async (data: any) => {
    if (!supplierDocRef) return;
    try {
      await updateDocumentNonBlocking(supplierDocRef, { ...data, updatedAt: serverTimestamp() });
      toast({ title: "Proveedor Actualizado", description: "Los cambios han sido guardados." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Hubo un problema al actualizar." });
    }
  };
  
  const handleViewPurchaseDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsPurchaseDetailModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!supplier) {
    return <PageHeader title="Proveedor no encontrado" />;
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader title={supplier.name} description={`Viendo detalles para ${supplier.name}`}>
          <div className="flex gap-2">
            <Button asChild><Link href="/purchases/new"><Plus/>Nueva Compra</Link></Button>
            <Button onClick={() => setIsTransactionDialogOpen(true)}><Plus/>Agregar Pago</Button>
          </div>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total en Compras" value={totalPurchases} icon={ShoppingCart} isLoading={isLoading} />
          <StatCard title="Total Pagado" value={totalPaid} icon={DollarSign} isLoading={isLoading} />
          <StatCard title="Saldo Actual" value={balance} icon={TrendingUp} isLoading={isLoading} />
        </div>
        
        <Tabs defaultValue="account">
            <TabsList>
                <TabsTrigger value="account">Cuenta</TabsTrigger>
                <TabsTrigger value="details">Datos del Proveedor</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
                 <Card>
                    <CardContent className="pt-6 text-center flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">SALDO ACTUAL</p>
                        <p className={cn("text-6xl font-bold tracking-tighter", balance > 0 ? 'text-red-500' : 'text-green-500')}>
                            {formatCurrency(balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Última actualización: {format(new Date(), 'dd/MM/yy p', { locale: es })}
                        </p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-1 gap-2">
                        <Button asChild variant="outline">
                           <Link href={`/suppliers/${supplierId}/statement`}>Extracto de cuenta</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>
             <TabsContent value="details" className="mt-4">
                <SupplierForm supplier={supplier} onSubmit={handleUpdateSupplier} />
            </TabsContent>
        </Tabs>
      </div>

      <TransactionDialog 
        isOpen={isTransactionDialogOpen} 
        setIsOpen={setIsTransactionDialogOpen}
        supplierId={supplierId as string}
        supplierName={supplier.name}
      />
      <PurchaseDetailModal
        isOpen={isPurchaseDetailModalOpen}
        onOpenChange={setIsPurchaseDetailModalOpen}
        purchase={selectedPurchase}
        supplier={supplier}
        products={products}
      />
    </>
  );
}
