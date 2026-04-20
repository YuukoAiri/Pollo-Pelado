'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { SaleDetailModal } from './sale-detail-modal';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Users, Banknote, ArrowDownLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const salesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'sales');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  
  const customersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'customers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  
  const isLoading = isLoadingSales || isLoadingCustomers;

  const getCustomer = (customerId?: string) => {
    if (!customerId || customerId === '0' || !customers) return null;
    return customers.find(c => c.id === customerId) || null;
  };

  const groupedSales = useMemo(() => {
    if (!sales) return [];

    const filtered = sales.filter(sale => {
      const customer = getCustomer(sale.customerId);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'cliente ocasional';
      const searchText = searchTerm.toLowerCase();
      if (!searchText) return true;

      return (
        sale.saleNumber.toLowerCase().includes(searchText) ||
        customerName.toLowerCase().includes(searchText) ||
        sale.totalAmount.toString().includes(searchText) ||
        sale.items.some(item => item.productName.toLowerCase().includes(searchText))
      );
    });

    const groups = filtered.reduce((acc, sale) => {
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
  }, [sales, customers, searchTerm]);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title="Ventas">
          <Button asChild>
            <Link href="/sales/new">
              <PlusCircle />
              Nueva Venta
            </Link>
          </Button>
        </PageHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Item, cliente, precio o código"
            className="pl-10 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground">
            <Users className="mr-2" /> Vendedores
          </Button>
        </div>

        {isLoading && (
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
        
        {!isLoading && groupedSales.length === 0 && (
          <div className="text-center text-muted-foreground py-24">
            <p>No se encontraron ventas para tu búsqueda.</p>
          </div>
        )}

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
                  const customer = getCustomer(sale.customerId);
                  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente Ocasional';
                  
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
                    <div key={sale.id} onClick={() => handleViewDetails(sale)} className="bg-card p-3.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {sale.status === 'Pending' ? <ArrowDownLeft className="h-5 w-5 text-red-500" /> : <Banknote className="h-5 w-5 text-green-500" />}
                          <div>
                            <p className="font-bold text-lg">{formatCurrency(sale.totalAmount)}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{itemSummary}</p>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Users className="h-3.5 w-3.5" />
                              <span>{customerName}</span>
                            </div>
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
        </div>
      </div>

      <SaleDetailModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        sale={selectedSale}
        customer={getCustomer(selectedSale?.customerId)}
      />
    </>
  );
}
