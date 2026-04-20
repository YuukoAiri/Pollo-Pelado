'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Supplier, Purchase, SupplierPayment } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

type SupplierWithBalance = Supplier & {
  balance: number;
};

export default function SuppliersPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');

  const suppliersQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'suppliers');
  }, [firestore, user]);

  const purchasesQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'purchases');
  }, [firestore, user]);

  const paymentsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'supplier_payments');
  }, [firestore, user]);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<SupplierPayment>(paymentsQuery);
  
  const isLoading = isLoadingSuppliers || isLoadingPurchases || isLoadingPayments;
  
  const enrichedSuppliers = useMemo((): SupplierWithBalance[] => {
    if (!suppliers || !purchases || !payments) return [];

    const supplierData = new Map<string, { totalPurchases: number; totalPayments: number }>();

    suppliers.forEach(s => {
      if (s.id) {
        supplierData.set(s.id, { totalPurchases: 0, totalPayments: 0 });
      }
    });

    purchases.forEach(purchase => {
      const data = supplierData.get(purchase.supplierId) || { totalPurchases: 0, totalPayments: 0 };
      data.totalPurchases += purchase.totalAmount;
      supplierData.set(purchase.supplierId, data);
    });

    payments.forEach(payment => {
      const data = supplierData.get(payment.supplierId) || { totalPurchases: 0, totalPayments: 0 };
      data.totalPayments += payment.amount;
      supplierData.set(payment.supplierId, data);
    });
    
    return suppliers.map(supplier => {
      const data = supplierData.get(supplier.id!);
      const balance = (data?.totalPurchases ?? 0) - (data?.totalPayments ?? 0);
      return {
        ...supplier,
        balance,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, purchases, payments]);
  
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return enrichedSuppliers;
    const lowercasedFilter = searchTerm.toLowerCase();
    return enrichedSuppliers.filter(s => 
      s.name.toLowerCase().includes(lowercasedFilter) ||
      s.contactPerson?.toLowerCase().includes(lowercasedFilter)
    );
  }, [enrichedSuppliers, searchTerm]);

  return (
    <div className="flex flex-col h-full">
        <PageHeader title={`Proveedores (${filteredSuppliers.length})`}>
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus /> Nuevo Proveedor
            </Link>
          </Button>
        </PageHeader>
        
        <div className="p-1 space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..."
                className="pl-10 h-12 text-base rounded-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-4 mt-4">
            {isLoading && [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-4 bg-card rounded-lg shadow-sm">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                </div>
            ))}
            {!isLoading && filteredSuppliers.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No se encontraron proveedores.</p>
                </div>
            )}
            {!isLoading && filteredSuppliers.map(supplier => (
                <div key={supplier.id} onClick={() => router.push(`/suppliers/${supplier.id}`)} className="bg-card p-3 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <p className="font-bold">{supplier.name}</p>
                            <p className={cn(
                                "text-sm font-semibold",
                                supplier.balance > 0 ? "text-red-500" : "text-green-500"
                            )}>
                                Saldo: {formatCurrency(supplier.balance)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                             <ChevronRight className="text-muted-foreground" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
