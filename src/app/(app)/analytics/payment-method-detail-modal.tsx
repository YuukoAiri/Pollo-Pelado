'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';


interface PaymentMethodDetailModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sales: Sale[];
  isLoading: boolean;
}

export function PaymentMethodDetailModal({ isOpen, setIsOpen, sales, isLoading }: PaymentMethodDetailModalProps) {
  const { paymentMethodsData, creditSalesData } = useMemo(() => {
    if (!sales || sales.length === 0) {
      return { paymentMethodsData: { methods: [], totalCount: 0, totalValue: 0 }, creditSalesData: { count: 0, value: 0 } };
    }

    const nonCreditSales = sales.filter(s => s.paymentMethod !== 'Crédito');
    const creditSales = sales.filter(s => s.paymentMethod === 'Crédito');
    
    const methodCounts = nonCreditSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || { count: 0, value: 0 });
      acc[sale.paymentMethod].count += 1;
      acc[sale.paymentMethod].value += sale.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);
    
    const totalValue = nonCreditSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const methods = Object.entries(methodCounts).map(([name, data]) => ({
      name,
      ...data,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    })).sort((a,b) => b.value - a.value);

    return {
      paymentMethodsData: { methods, totalCount: nonCreditSales.length, totalValue },
      creditSalesData: {
        count: creditSales.length,
        value: creditSales.reduce((sum, s) => sum + s.totalAmount, 0)
      }
    };
  }, [sales]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de Medios de Pago</DialogTitle>
          <DialogDescription>
            Número de pagos: {paymentMethodsData.totalCount} / {formatCurrency(paymentMethodsData.totalValue)}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="w-24 h-24 mx-auto my-4">
                <ChartContainer config={{}} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={[{ value: 100 }]}
                      dataKey="value"
                      innerRadius="70%"
                      outerRadius="100%"
                      stroke="none"
                      startAngle={90}
                      endAngle={450}
                    >
                      <Cell fill="hsl(var(--chart-1))" />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>TIPO</TableHead>
                          <TableHead className="text-center">CTD</TableHead>
                          <TableHead className="text-right">VALOR</TableHead>
                          <TableHead className="text-right">%</TableHead>
                      </TableRow>
                  </TableHeader>
                <TableBody>
                  {paymentMethodsData.methods.map(method => (
                      <TableRow key={method.name}>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-center">{method.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(method.value)}</TableCell>
                          <TableCell className="text-right">{method.percentage.toFixed(0)}%</TableCell>
                      </TableRow>
                  ))}
                   <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-center">{paymentMethodsData.totalCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(paymentMethodsData.totalValue)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 bg-muted/80 rounded-md">
                  <div className="flex justify-between p-3 border-b">
                      <span>Ventas a crédito (Fiado)</span>
                      <span className="font-semibold">{creditSalesData.count} / {formatCurrency(creditSalesData.value)}</span>
                  </div>
                  <div className="flex justify-between p-3">
                      <span>Ventas abonadas con saldo</span>
                      <span className="font-semibold">0 / {formatCurrency(0)}</span>
                  </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
