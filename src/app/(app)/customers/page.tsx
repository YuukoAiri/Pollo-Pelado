'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Customer, Sale, CustomerPayment } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight, MessageSquare } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type CustomerWithBalance = Customer & {
  balance: number;
  lastPurchase: { date: string; amount: number } | null;
  hasMadePurchases: boolean;
};

type ActiveFilter = 'all' | 'recent' | 'negative_balance' | 'positive_balance';

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // --- Data Fetching ---
  const customersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'customers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  
  const salesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'sales');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const paymentsQuery = useMemo(() => {
    if (!user) return null;
    const q = query(collection(firestore, 'users', user.uid, 'customer_payments'), where('customerId', '!=', '0'));
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<CustomerPayment>(paymentsQuery);
  
  const isLoading = isLoadingCustomers || isLoadingSales || isLoadingPayments;
  
  // --- Data Processing ---
  const enrichedCustomers = useMemo((): CustomerWithBalance[] => {
    if (!customers || !sales || !payments) return [];

    const customerData = new Map<string, { totalSales: number; totalPayments: number; lastPurchase: Sale | null }>();

    // Initialize with all customers to include those with no transactions
    customers.forEach(c => {
      if (c.id) {
        customerData.set(c.id, { totalSales: 0, totalPayments: 0, lastPurchase: null });
      }
    });

    sales.forEach(sale => {
      if (sale.customerId === '0') return;
      const data = customerData.get(sale.customerId) || { totalSales: 0, totalPayments: 0, lastPurchase: null };
      data.totalSales += sale.totalAmount;
      if (!data.lastPurchase || new Date(sale.saleDate) > new Date(data.lastPurchase.saleDate)) {
        data.lastPurchase = sale;
      }
      customerData.set(sale.customerId, data);
    });

    payments.forEach(payment => {
      const data = customerData.get(payment.customerId) || { totalSales: 0, totalPayments: 0, lastPurchase: null };
      data.totalPayments += payment.amount;
      customerData.set(payment.customerId, data);
    });
    
    return customers.map(customer => {
      const data = customerData.get(customer.id!);
      const balance = (data?.totalSales ?? 0) - (data?.totalPayments ?? 0);
      return {
        ...customer,
        balance,
        hasMadePurchases: !!data?.lastPurchase,
        lastPurchase: data?.lastPurchase
          ? {
              date: data.lastPurchase.saleDate,
              amount: data.lastPurchase.totalAmount,
            }
          : null,
      };
    }).sort((a, b) => a.firstName.localeCompare(b.firstName)); // Sort alphabetically
  }, [customers, sales, payments]);
  
  const filteredCustomers = useMemo(() => {
    let result = enrichedCustomers;

    // Apply search
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.firstName.toLowerCase().includes(lowercasedFilter) ||
        c.lastName.toLowerCase().includes(lowercasedFilter) ||
        c.email?.toLowerCase().includes(lowercasedFilter) ||
        c.phone?.includes(lowercasedFilter)
      );
    }
    
    // Apply filter chips
    switch (activeFilter) {
      case 'recent':
        result = result.filter(c => c.hasMadePurchases).sort((a,b) => new Date(b.lastPurchase!.date).getTime() - new Date(a.lastPurchase!.date).getTime());
        break;
      case 'negative_balance':
        result = result.filter(c => c.balance > 0);
        break;
      case 'positive_balance':
        result = result.filter(c => c.balance < 0);
        break;
      default:
        // 'all' case, no extra filtering needed
        break;
    }

    return result;
  }, [enrichedCustomers, searchTerm, activeFilter]);

  const { saldoPorCobrar, saldoDeCreditos } = useMemo(() => {
    return enrichedCustomers.reduce((acc, customer) => {
        if (customer.balance > 0) {
            acc.saldoPorCobrar += customer.balance;
        } else if (customer.balance < 0) {
            acc.saldoDeCreditos += Math.abs(customer.balance);
        }
        return acc;
    }, { saldoPorCobrar: 0, saldoDeCreditos: 0 });
  }, [enrichedCustomers]);

  const handleWhatsAppClick = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (phone) {
        // Remove non-digit characters for a clean number
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
        toast({
            variant: "destructive",
            title: "Teléfono no disponible",
            description: "Este cliente no tiene un número de teléfono registrado.",
        });
    }
  };
  
  const toggleFilter = (filter: ActiveFilter) => {
    setActiveFilter(prev => prev === filter ? 'all' : filter);
  };


  return (
    <div className="flex flex-col h-full">
        <PageHeader title={`Clientes (${filteredCustomers.length})`}>
          <Button asChild className="rounded-full w-12 h-12">
            <Link href="/customers/new">
              <Plus />
            </Link>
          </Button>
        </PageHeader>
        
        <div className="p-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Busque por nombre, email o teléfono"
                className="pl-10 h-12 text-base rounded-full bg-muted border-transparent focus-visible:border-primary"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button variant={activeFilter === 'recent' ? 'default' : 'outline'} onClick={() => toggleFilter('recent')} className="rounded-full">Ventas Recientes</Button>
                <Button variant={activeFilter === 'negative_balance' ? 'default' : 'outline'} onClick={() => toggleFilter('negative_balance')} className="rounded-full">Saldo Negativo</Button>
                <Button variant={activeFilter === 'positive_balance' ? 'default' : 'outline'} onClick={() => toggleFilter('positive_balance')} className="rounded-full">Saldo Positivo</Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-24">
            {isLoading && [...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center p-4 bg-card rounded-lg shadow-sm">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                </div>
            ))}
            {!isLoading && filteredCustomers.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No se encontraron clientes.</p>
                </div>
            )}
            {!isLoading && filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => router.push(`/customers/${customer.id}`)} className="bg-card p-3 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <p className="font-bold">{customer.firstName} {customer.lastName}</p>
                            {customer.lastPurchase ? (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        Última compra: {format(parseISO(customer.lastPurchase.date), 'dd/MM/yyyy', { locale: es })} - {formatCurrency(customer.lastPurchase.amount)}
                                    </p>
                                    {customer.balance > 0 && (
                                        <p className="text-sm font-semibold text-red-500">
                                            Saldo actual: {formatCurrency(customer.balance)}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Nunca compró</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 text-green-500 hover:text-green-500 hover:bg-green-100" onClick={(e) => handleWhatsAppClick(e, customer.phone)}>
                                <MessageSquare />
                             </Button>
                             <ChevronRight className="text-muted-foreground" />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 text-white grid grid-cols-2 gap-4" style={{backgroundColor: '#353a3f'}}>
            <div className="text-center">
                <p className="text-sm uppercase text-gray-300">Saldo por Cobrar</p>
                <p className="font-bold text-lg">{formatCurrency(saldoPorCobrar)}</p>
            </div>
            <div className="text-center">
                <p className="text-sm uppercase text-gray-300">Saldo de Créditos</p>
                <p className="font-bold text-lg">{formatCurrency(saldoDeCreditos)}</p>
            </div>
        </div>
    </div>
  );
}
