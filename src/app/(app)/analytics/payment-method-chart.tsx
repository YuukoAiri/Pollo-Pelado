'use client';
import { useMemo } from 'react';
import { LabelList, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfDay, endOfDay } from 'date-fns';

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];


export function PaymentMethodChart({ className, selectedDate }: { className?: string, selectedDate?: Date }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const salesQuery = useMemo(() => {
        if (!user) return null;
        const q = collection(firestore, 'users', user.uid, 'sales');
        (q as any).__memo = true;
        return q;
    }, [firestore, user]);

    const { data: allSales, isLoading } = useCollection<Sale>(salesQuery);

    const chartData = useMemo(() => {
        if (!allSales) return [];
        
        const filteredSales = selectedDate 
            ? allSales.filter(sale => {
                const saleDate = new Date(sale.saleDate);
                return saleDate >= startOfDay(selectedDate) && saleDate <= endOfDay(selectedDate);
            }) 
            : allSales;
            
        const methodCounts = filteredSales.reduce((acc, sale) => {
            acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(methodCounts).map(([name, value]) => ({
            name,
            value,
        })).sort((a,b) => b.value - a.value);
    }, [allSales, selectedDate]);

    const chartConfig = useMemo(() => {
        let colorIndex = 0;
        // The first 4 colors are non-red, --chart-5 is destructive red
        const otherColors = chartColors.slice(0, 4);

        return chartData.reduce((acc, item) => {
            let itemColor: string;
            if (item.name === 'Crédito') {
                itemColor = 'hsl(var(--destructive))';
            } else {
                itemColor = otherColors[colorIndex % otherColors.length];
                colorIndex++;
            }
            
            acc[item.name] = {
                label: item.name,
                color: itemColor,
            };
            return acc;
        }, {} as any);
    }, [chartData]);


    return (
        <Card className={className}>
        <CardHeader>
            <CardTitle>Distribución de Medios de Pago</CardTitle>
            <CardDescription>Total de ventas por cada medio de pago.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[250px]"
            >
                {chartData.length > 0 ? (
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                        >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartConfig[entry.name].color} />
                        ))}
                         <LabelList
                            dataKey="name"
                            className="fill-background"
                            stroke="none"
                            fontSize={12}
                            formatter={(value: string) => chartConfig[value]?.label}
                         />
                    </Pie>
                </PieChart>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
                        No hay datos para esta fecha.
                    </div>
                )}
            </ChartContainer>
            )}
        </CardContent>
        </Card>
    );
}
