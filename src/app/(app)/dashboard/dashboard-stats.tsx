'use client';

import { useMemo } from 'react';
import { Area, AreaChart } from 'recharts';
import { Sale, Product, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { subDays, format, startOfDay } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ShoppingCart, Users, Boxes } from 'lucide-react';

function StatCard({
  title,
  value,
  chartData,
  chartKey,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  chartData: any[];
  chartKey: string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="h-16 w-full pt-2">
              <ChartContainer config={{ [chartKey]: { label: title, color: "hsl(var(--primary))" } }} className="h-full w-full">
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`fill-${chartKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey={chartKey}
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill={`url(#fill-${chartKey})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
    sales: Sale[] | null;
    customers: Customer[] | null;
    products: Product[] | null;
    isLoading: boolean;
}

export function DashboardStats({ sales, customers, products, isLoading }: DashboardStatsProps) {
  const {
    revenueChartData,
    salesChartData,
    customersChartData,
    productsChartData,
  } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'));

    const dailyRevenue: Record<string, number> = {};
    const dailySales: Record<string, number> = {};
    const dailyNewCustomers: Record<string, number> = {};
    const dailyNewProducts: Record<string, number> = {};

    dayStrings.forEach(day => {
      dailyRevenue[day] = 0;
      dailySales[day] = 0;
      dailyNewCustomers[day] = 0;
      dailyNewProducts[day] = 0;
    });

    sales?.forEach(sale => {
      const day = format(startOfDay(new Date(sale.saleDate)), 'yyyy-MM-dd');
      if (dailyRevenue[day] !== undefined) {
        dailyRevenue[day] += sale.totalAmount;
        dailySales[day] += 1;
      }
    });

    customers?.forEach(customer => {
      if (customer.createdAt) {
        const day = format(startOfDay(customer.createdAt.toDate()), 'yyyy-MM-dd');
        if (dailyNewCustomers[day] !== undefined) {
          dailyNewCustomers[day] += 1;
        }
      }
    });

    products?.forEach(product => {
        if (product.createdAt) {
            const day = format(startOfDay(product.createdAt.toDate()), 'yyyy-MM-dd');
            if (dailyNewProducts[day] !== undefined) {
                dailyNewProducts[day] += 1;
            }
        }
    });

    const revenueChartData = days.map(day => ({
        date: format(day, 'dd'),
        revenue: dailyRevenue[format(day, 'yyyy-MM-dd')] || 0,
    }));
    const salesChartData = days.map(day => ({
        date: format(day, 'dd'),
        sales: dailySales[format(day, 'yyyy-MM-dd')] || 0,
    }));
    const customersChartData = days.map(day => ({
        date: format(day, 'dd'),
        customers: dailyNewCustomers[format(day, 'yyyy-MM-dd')] || 0,
    }));
    const productsChartData = days.map(day => ({
        date: format(day, 'dd'),
        products: dailyNewProducts[format(day, 'yyyy-MM-dd')] || 0,
    }));

    return {
      revenueChartData,
      salesChartData,
      customersChartData,
      productsChartData
    };
  }, [sales, customers, products]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Ingresos (últimos 7 días)"
        value={formatCurrency(revenueChartData.reduce((acc, cur) => acc + cur.revenue, 0))}
        chartData={revenueChartData}
        chartKey="revenue"
        icon={DollarSign}
        isLoading={isLoading}
      />
      <StatCard
        title="Ventas (últimos 7 días)"
        value={`+${salesChartData.reduce((acc, cur) => acc + cur.sales, 0)}`}
        chartData={salesChartData}
        chartKey="sales"
        icon={ShoppingCart}
        isLoading={isLoading}
      />
      <StatCard
        title="Nuevos Clientes (7 días)"
        value={`+${customersChartData.reduce((acc, cur) => acc + cur.customers, 0)}`}
        chartData={customersChartData}
        chartKey="customers"
        icon={Users}
        isLoading={isLoading}
      />
      <StatCard
        title="Nuevos Productos (7 días)"
        value={`+${productsChartData.reduce((acc, cur) => acc + cur.products, 0)}`}
        chartData={productsChartData}
        chartKey="products"
        icon={Boxes}
        isLoading={isLoading}
      />
    </div>
  );
}
