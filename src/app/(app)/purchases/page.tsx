'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Purchase, Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PurchaseDetailModal } from './purchase-detail-modal';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Users, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ✅ Tipo para agrupar compras
type PurchaseGroup = {
  date: Date;
  purchases: Purchase[];
  totalAmount: number;
};

export default function PurchasesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // 🔹 Queries
  const purchasesQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'purchases');
  }, [firestore, user]);

  const suppliersQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'suppliers');
  }, [firestore, user]);

  const productsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user]);

  // 🔹 Datos
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesQuery);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  const { data: products } = useCollection(productsQuery);

  const isLoading = isLoadingPurchases || isLoadingSuppliers;

  // 🔹 Obtener proveedor
  const getSupplier = (supplierId?: string) => {
    if (!supplierId || !suppliers) return null;
    return suppliers.find(s => s.id === supplierId) || null;
  };

  // 🔥 Agrupar compras (YA TIPADO)
  const groupedPurchases = useMemo<PurchaseGroup[]>(() => {
    if (!purchases) return [];

    const filtered = purchases.filter((purchase: Purchase) => {
      const supplier = getSupplier(purchase.supplierId);
      const supplierName = supplier ? supplier.name : 'proveedor desconocido';
      const searchText = searchTerm.toLowerCase();

      if (!searchText) return true;

      return (
        purchase.purchaseNumber.toLowerCase().includes(searchText) ||
        supplierName.toLowerCase().includes(searchText) ||
        purchase.totalAmount.toString().includes(searchText) ||
        purchase.items.some((item: any) =>
          item.productName.toLowerCase().includes(searchText)
        )
      );
    });

    const groups = filtered.reduce((acc, purchase) => {
      const purchaseDate = parseISO(purchase.purchaseDate);
      const dayKey = format(purchaseDate, "eeee, dd 'de' MMMM", { locale: es });

      if (!acc[dayKey]) {
        acc[dayKey] = {
          date: startOfDay(purchaseDate),
          purchases: [],
          totalAmount: 0,
        };
      }

      acc[dayKey].purchases.push(purchase);
      acc[dayKey].totalAmount += purchase.totalAmount;

      return acc;
    }, {} as Record<string, PurchaseGroup>);

    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [purchases, suppliers, searchTerm]);

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title="Compras">
          <Button asChild>
            <Link href="/purchases/new">
              <PlusCircle />
              Nueva Compra
            </Link>
          </Button>
        </PageHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item, proveedor, o código"
            className="pl-10 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading && (
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

        {!isLoading && groupedPurchases.length === 0 && (
          <div className="text-center text-muted-foreground py-24">
            <p>No se encontraron compras.</p>
          </div>
        )}

        <div className="space-y-6">
          {groupedPurchases.map((group) => (
            <div key={group.date.toISOString()}>
              <div className="mb-3">
                <h2 className="font-bold capitalize text-lg">
                  {group.date.toISOString() === startOfDay(new Date()).toISOString()
                    ? 'Hoy'
                    : format(group.date, "eeee, dd 'de' MMMM", { locale: es })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {group.purchases.length} Compra
                  {group.purchases.length === 1 ? '' : 's'}, {formatCurrency(group.totalAmount)}
                </p>
              </div>

              <div className="space-y-2">
                {group.purchases.map((purchase: Purchase) => {
                  const supplier = getSupplier(purchase.supplierId);
                  const supplierName = supplier ? supplier.name : 'Proveedor Desconocido';
                  const purchaseTime = format(parseISO(purchase.purchaseDate), 'p', { locale: es });

                  return (
                    <div
                      key={purchase.id}
                      onClick={() => handleViewDetails(purchase)}
                      className="bg-card p-3.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-bold text-lg">
                              {formatCurrency(purchase.totalAmount)}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Users className="h-3.5 w-3.5" />
                              <span>{supplierName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground pt-1">
                          {purchaseTime}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PurchaseDetailModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        purchase={selectedPurchase}
        supplier={getSupplier(selectedPurchase?.supplierId)}
        products={products}
      />
    </>
  );
}
