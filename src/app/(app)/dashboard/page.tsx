'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { Sale, Product, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardStats } from './dashboard-stats';
import { SalesDistributionChart } from './sales-distribution-chart';

function RecentSales({
  sales,
  customers,
  isLoading,
}: {
  sales: (Sale & { id: string })[] | null;
  customers: (Customer & { id: string })[] | null;
  isLoading: boolean;
}) {
  const recentSales =
    sales
      ?.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 5) ?? [];

  const getCustomer = (customerId: string) => {
    return customers?.find((c) => c.id === customerId);
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Ventas Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="ml-4 space-y-1">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <Skeleton className="ml-auto h-4 w-[50px]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {recentSales.map((sale) => {
              const customer = getCustomer(sale.customerId);
              const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente Ocasional';
              const customerFallback = (customer?.firstName?.[0] ?? '') + (customer?.lastName?.[0] ?? '');
              return (
                <div key={sale.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{customerFallback || 'C'}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer?.email || 'Sin email'}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">{formatCurrency(sale.totalAmount)}</div>
                </div>
              );
            })}
            {recentSales.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay ventas recientes.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockProducts({
  products,
  isLoading,
}: {
  products: (Product & { id: string })[] | null;
  isLoading: boolean;
}) {
  const lowStockProducts = products?.filter((p) => p.trackStock && p.minStock && p.stock && p.stock <= p.minStock).slice(0, 5) ?? [];

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Productos con Stock Bajo</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quedan {product.stock} {product.unitOfMeasure}.
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">Bajo</Badge>
              </li>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay productos con stock bajo.</p>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const salesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'sales');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);

  const productsQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'products');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const customersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'customers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingCustomers;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" description="Una vista rápida y general de tu negocio.">
        <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/products/new">
                    <PlusCircle />
                    Agregar Producto
                </Link>
            </Button>
            <Button asChild>
                <Link href="/sales/new">
                    <PlusCircle />
                    Nueva Venta
                </Link>
            </Button>
        </div>
      </PageHeader>
      
      <DashboardStats 
        sales={sales}
        products={products}
        customers={customers}
        isLoading={isLoading}
      />
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentSales sales={sales} customers={customers} isLoading={isLoading} />
        <SalesDistributionChart className="lg:col-span-1" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <LowStockProducts products={products} isLoading={isLoading} />
      </div>
    </div>
  );
}
