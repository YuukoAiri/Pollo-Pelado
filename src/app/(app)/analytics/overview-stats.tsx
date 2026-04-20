'use client';

import { useMemo } from 'react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ShoppingCart, TrendingUp, Receipt } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-2/3" /> : <div className="text-2xl font-bold">{typeof value === 'string' ? value : formatCurrency(value)}</div>}
      </CardContent>
    </Card>
  );
}

export function OverviewStats({ selectedDate }: { selectedDate?: Date }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const salesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'sales');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: allSales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);

  const { revenue, salesCount, profit, avgTicket } = useMemo(() => {
    if (!allSales) {
      return { revenue: 0, salesCount: 0, profit: 0, avgTicket: 0 };
    }

    const filteredSales = selectedDate 
        ? allSales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startOfDay(selectedDate) && saleDate <= endOfDay(selectedDate);
        }) 
        : allSales;

    const revenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesCount = filteredSales.length;

    const totalCost = filteredSales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => itemSum + ((item.unitCost || 0) * item.quantity), 0);
      return sum + saleCost;
    }, 0);

    const profit = revenue - totalCost;
    const avgTicket = salesCount > 0 ? revenue / salesCount : 0;

    return { revenue, salesCount, profit, avgTicket };
  }, [allSales, selectedDate]);
  
  const isLoading = isLoadingSales;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Facturación" value={revenue} icon={DollarSign} isLoading={isLoading} />
      <StatCard title="Ventas" value={salesCount.toString()} icon={ShoppingCart} isLoading={isLoading} />
      <StatCard title="Ganancia" value={profit} icon={TrendingUp} isLoading={isLoading} />
      <StatCard title="Ticket Medio" value={avgTicket} icon={Receipt} isLoading={isLoading} />
    </div>
  );
}
