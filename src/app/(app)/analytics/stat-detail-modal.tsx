'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sale } from '@/lib/types';
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

// Types and Metric configuration
export type StatMetricType = 'revenue' | 'sales' | 'avgTicket' | 'profit';

const METRIC_CONFIG: Record<StatMetricType, { title: string; format: (value: number) => string | number }> = {
  revenue: { title: 'Facturación', format: (value) => formatCurrency(value) },
  sales: { title: 'Ventas', format: (value) => value.toString() },
  avgTicket: { title: 'Ticket Medio', format: (value) => formatCurrency(value) },
  profit: { title: 'Ganancia', format: (value) => formatCurrency(value) },
};

// Date Navigator
function DateNavigator({ date, setDate }: { date: Date, setDate: (date: Date) => void }) {
  const handlePrevDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));

  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-2">
      <Button variant="ghost" size="icon" onClick={handlePrevDay}>
        <ChevronLeft />
      </Button>
      <span className="font-semibold">{format(date, "dd 'de' MMMM", { locale: es })}</span>
      <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={endOfDay(date) >= endOfDay(new Date())}>
        <ChevronRight />
      </Button>
    </div>
  );
}

// Main Modal Component
interface StatDetailModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  metric: StatMetricType | null;
  allSales: Sale[] | null;
  selectedDate: Date;
  setDate: (date: Date) => void;
}

export function StatDetailModal({ isOpen, setIsOpen, metric, allSales, selectedDate, setDate }: StatDetailModalProps) {
  const hourlyData = useMemo(() => {
    if (!allSales || !metric) return { data: [], total: 0, bestHour: -1, worstHour: -1 };

    const salesForDay = allSales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= startOfDay(selectedDate) && saleDate <= endOfDay(selectedDate);
    });

    const groupedByHour: Record<number, { revenue: number, sales: number, profit: number }> = {};

    for (let i = 0; i < 24; i++) {
        groupedByHour[i] = { revenue: 0, sales: 0, profit: 0 };
    }

    salesForDay.forEach(sale => {
      const hour = new Date(sale.saleDate).getHours();
      groupedByHour[hour].revenue += sale.totalAmount;
      groupedByHour[hour].sales += 1;
      const saleCost = sale.items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0);
      groupedByHour[hour].profit += (sale.totalAmount - saleCost);
    });

    let bestHour = -1, worstHour = -1;
    let maxVal = -Infinity, minVal = Infinity;

    const data = Object.entries(groupedByHour)
      .map(([hour, values]) => {
        const hourNum = parseInt(hour);
        const avgTicket = values.sales > 0 ? values.revenue / values.sales : 0;
        const metricValue = metric === 'avgTicket' ? avgTicket : values[metric];

         if (values.sales > 0) {
            if (metricValue > maxVal) {
                maxVal = metricValue;
                bestHour = hourNum;
            }
            if (metricValue < minVal) {
                minVal = metricValue;
                worstHour = hourNum;
            }
        }
        
        return {
          hour: `${hourNum}h`,
          hourNum: hourNum,
          revenue: values.revenue,
          sales: values.sales,
          avgTicket,
          profit: values.profit,
          value: metricValue
        };
      })
      .filter(d => d.revenue > 0 || d.sales > 0 || d.profit > 0);
      
    const total = data.reduce((sum, item) => sum + item[metric === 'avgTicket' ? 'revenue' : metric], 0);

    return { data: data.sort((a,b) => a.hourNum - b.hourNum), total, bestHour, worstHour };
  }, [allSales, selectedDate, metric]);

  const totalValue = useMemo(() => {
    if (!metric) return 0;
    if (metric === 'avgTicket') {
        const totalRevenue = hourlyData.data.reduce((sum, d) => sum + d.revenue, 0);
        const totalSales = hourlyData.data.reduce((sum, d) => sum + d.sales, 0);
        return totalSales > 0 ? totalRevenue / totalSales : 0;
    }
    return hourlyData.data.reduce((sum, d) => sum + d[metric], 0);
  }, [hourlyData, metric]);

  if (!metric) {
    return null;
  }
  
  const config = METRIC_CONFIG[metric];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b text-center">
            <DialogTitle className="font-bold text-lg">{config.title}</DialogTitle>
        </DialogHeader>

        <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
          <DateNavigator date={selectedDate} setDate={setDate} />
          
          <p className="font-bold text-lg">Total: {config.format(totalValue)}</p>

          <div className="h-48 w-full">
            <ResponsiveContainer>
              <LineChart data={hourlyData.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} fontSize={12} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value, 'PEN').replace('S/', 'S/. ')} width={80} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-md p-2 shadow-lg">
                        <p className="font-bold">{`${payload[0].payload.hour}`}</p>
                        <p>{`${config.title}: ${config.format(payload[0].value as number)}`}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>HORA</TableHead>
                            <TableHead>FACTURACIÓN</TableHead>
                            <TableHead>VENTAS</TableHead>
                            <TableHead className="text-right">T.M.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {hourlyData.data.map(item => (
                            <TableRow key={item.hour}>
                                <TableCell className={cn("font-medium", {
                                    "text-green-500": item.hourNum === hourlyData.bestHour,
                                    "text-red-500": item.hourNum === hourlyData.worstHour,
                                })}>
                                    {item.hour}
                                </TableCell>
                                <TableCell>{formatCurrency(item.revenue)}</TableCell>
                                <TableCell className={cn({
                                    "text-green-500 font-bold": item.hourNum === hourlyData.bestHour && metric === 'sales',
                                    "text-red-500 font-bold": item.hourNum === hourlyData.worstHour && metric === 'sales',
                                })}>{item.sales}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.avgTicket)}</TableCell>
                            </TableRow>
                        ))}
                         {hourlyData.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No hay datos para este día.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>

          <div className="flex items-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Mejor hora</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Peor hora</span>
              </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
