'use client';
import { useMemo } from 'react';
import { Pie, PieChart, Cell, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';


const categoryColors: { [key: string]: string } = {
  'Huevos': 'hsl(80, 60%, 50%)', // lime green
  'Pollo Entero': 'hsl(35, 90%, 55%)', // orange
  'Cortes': 'hsl(var(--chart-5))', // red
  'Alimento': 'hsl(var(--chart-3))', // green
  'Otros': 'hsl(var(--chart-1))', // blue
};
const defaultChartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-3))',
];

export function SalesDistributionChart({ className }: { className?: string }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const salesQuery = useMemo(() => {
        if (!user) return null;
        const q = collection(firestore, 'users', user.uid, 'sales');
        (q as any).__memo = true;
        return q;
    }, [firestore, user]);

    const productsQuery = useMemo(() => {
      if (!user) return null;
      const q = collection(firestore, 'users', user.uid, 'products');
      (q as any).__memo = true;
      return q;
    }, [firestore, user]);

    const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    const isLoading = isLoadingSales || isLoadingProducts;

    const chartData = useMemo(() => {
        if (!sales || !products) return [];

        const productCategoryMap = new Map<string, string>();
        products.forEach(p => {
          if (p.id) {
            productCategoryMap.set(p.id, p.categoryId || 'Otros');
          }
        });
        
        const categorySales: Record<string, number> = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const category = productCategoryMap.get(item.productId) || 'Otros';
                categorySales[category] = (categorySales[category] || 0) + item.subtotal;
            });
        });

        return Object.entries(categorySales).map(([name, value]) => ({
            name,
            value,
        })).sort((a,b) => b.value - a.value);
    }, [sales, products]);

    const chartConfig = useMemo(() => {
      if (!chartData) return {};
      const config: ChartConfig = {};
      let colorIndex = 0;
      chartData.forEach(item => {
        const color = categoryColors[item.name] || defaultChartColors[colorIndex % defaultChartColors.length];
        config[item.name] = {
          label: item.name,
          color: color,
        };
        if (!categoryColors[item.name]) {
          colorIndex++;
        }
      });
      return config;
    }, [chartData]);


    return (
        <Card className={className}>
        <CardHeader>
            <CardTitle>Distribución de Ventas</CardTitle>
            <CardDescription>Ventas totales por categoría de producto.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
            {isLoading ? <Skeleton className="h-[300px] w-[300px] rounded-full" /> : (
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[300px]"
            >
                {chartData.length > 0 ? (
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} hideLabel />}
                    />
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={80}
                        strokeWidth={5}
                        >
                        {chartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={chartConfig[entry.name]?.color} />
                        ))}
                    </Pie>
                    <Legend content={({ payload }) => (
                        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-4 text-sm">
                            {payload?.map((entry: any, index: number) => (
                                <div key={`item-${index}`} className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    <span>{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    )} />
                </PieChart>
                ) : (
                    <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
                        No hay datos de ventas.
                    </div>
                )}
            </ChartContainer>
            )}
        </CardContent>
        </Card>
    );
}
