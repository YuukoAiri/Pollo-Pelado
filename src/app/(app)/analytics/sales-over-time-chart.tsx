'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function SalesOverTimeChart({ className, selectedDate }: { className?: string, selectedDate?: Date }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const salesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'sales');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: sales, isLoading } = useCollection<Sale>(salesQuery);

  const chartData = useMemo(() => {
    const last12Months = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i)).reverse();
    const monthlySales: Record<string, number> = {};

    sales?.forEach(sale => {
      const month = format(new Date(sale.saleDate), 'yyyy-MM');
      monthlySales[month] = (monthlySales[month] || 0) + sale.totalAmount;
    });

    return last12Months.map(date => {
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM', { locale: es });
      return {
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        total: monthlySales[monthKey] || 0,
      };
    });
  }, [sales]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ventas en el Tiempo</CardTitle>
        <CardDescription>Facturación de los últimos 12 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
          <ChartContainer config={{
            total: {
              label: 'Ventas',
              color: 'hsl(var(--primary))',
            },
          }}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
              />
               <YAxis 
                tickFormatter={(value) => formatCurrency(Number(value) / 1000) + 'k'}
               />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
