'use client';

import { useState, useMemo } from 'react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, Product, Customer, Supplier } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ChevronRight, CreditCard, Gift, Truck } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { StatDetailModal, type StatMetricType } from './stat-detail-modal';
import { DateRangeFilterModal } from './date-range-filter-modal';
import { PaymentMethodDetailModal } from './payment-method-detail-modal';
import { TopProductsDetailModal } from './top-products-detail-modal';
import { SalesBySupplierModal } from './sales-by-supplier-modal';


// Date Navigator Component
function DateNavigator({
  range,
  onClick,
}: {
  range: { from?: Date; to?: Date };
  onClick: () => void;
}) {
  const formatRange = () => {
    const { from, to } = range;
    if (!from) return 'Seleccionar período';

    const toDate = to || from;

    if (isSameDay(from, toDate)) {
      if (isSameDay(from, new Date())) return 'Hoy';
      if (isSameDay(from, subDays(new Date(), 1))) return 'Ayer';
      return format(from, "dd 'de' MMMM 'de' yyyy", { locale: es });
    }
    if (to) {
      return `${format(from, 'dd MMM', { locale: es })} - ${format(
        to,
        'dd MMM, yyyy',
        { locale: es }
      )}`;
    }
    return `Desde ${format(from, 'dd MMM, yyyy', { locale: es })}`;
  };

  return (
    <Button variant="outline" className="w-full justify-center text-base" size="lg" onClick={onClick}>
      <span className="font-semibold">{formatRange()}</span>
    </Button>
  );
}


// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  chartData: { value: number }[];
  isLoading: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, chartData, isLoading, onClick }: StatCardProps) {
  return (
    <Card
      className="p-4 flex justify-between items-center hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'string' ? value : formatCurrency(value)}
            </p>
          </div>
          <div className="w-24 h-10">
            <ChartContainer config={{ value: { label: title, color: 'hsl(var(--chart-1))' } }}>
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill={`url(#fill-${title.replace(/\s/g, '')})`}
                />
              </AreaChart>
            </ChartContainer>
          </div>
          <ChevronRight className="text-muted-foreground" />
        </>
      )}
    </Card>
  );
}

// Summary Card Component for Modals
interface SummaryCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  isLoading: boolean;
  onClick?: () => void;
}

function SummaryCard({ title, description, icon: Icon, isLoading, onClick }: SummaryCardProps) {
  return (
    <Card
      className="p-4 flex justify-between items-center hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground" />
        </>
      )}
    </Card>
  );
}


export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalMetric, setDetailModalMetric] = useState<StatMetricType | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTopProductsModalOpen, setIsTopProductsModalOpen] = useState(false);
  const [isSalesBySupplierModalOpen, setIsSalesBySupplierModalOpen] = useState(false);

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

  const suppliersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'suppliers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: allSales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  const { data: allSuppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingSuppliers;

  const { dailyData, weeklyChartData, summaryData } = useMemo(() => {
    if (!allSales || !allProducts || !allSuppliers)
      return {
        dailyData: { revenue: 0, salesCount: 0, profit: 0, avgTicket: 0, sales: [] },
        weeklyChartData: {},
        summaryData: { paymentDescription: 'Calculando...', topProductDescription: 'Calculando...', topSupplierDescription: 'Calculando...' },
      };

    const from = dateRange.from ? startOfDay(dateRange.from) : null;
    const to = dateRange.to ? endOfDay(dateRange.to) : from ? endOfDay(from) : null;

    const filteredSales = allSales.filter((sale) => {
      const saleDate = new Date(sale.saleDate);
      if (from && to) return saleDate >= from && saleDate <= to;
      if (from) return saleDate >= from;
      if (to) return saleDate <= to;
      return true;
    });

    const revenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesCount = filteredSales.length;
    const totalCost = filteredSales.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce((itemSum, item) => itemSum + (item.unitCost || 0) * item.quantity, 0),
      0
    );
    const profit = revenue - totalCost;
    const avgTicket = salesCount > 0 ? revenue / salesCount : 0;

    const chartEndDate = to || new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(chartEndDate, 6 - i));

    const getDailyDataFor = (date: Date) => {
      const salesForDay = allSales.filter((s) => {
        const saleDate = new Date(s.saleDate);
        return saleDate >= startOfDay(date) && saleDate <= endOfDay(date);
      });
      const revenue = salesForDay.reduce((sum, s) => sum + s.totalAmount, 0);
      const salesCount = salesForDay.length;
      const totalCost = salesForDay.reduce(
        (sum, s) =>
          sum +
          s.items.reduce((itemSum, item) => itemSum + (item.unitCost || 0) * item.quantity, 0),
        0
      );
      const profit = revenue - totalCost;
      const avgTicket = salesCount > 0 ? revenue / salesCount : 0;
      return { revenue, salesCount, profit, avgTicket };
    };

    const weeklyChartData = {
      revenue: last7Days.map((d) => ({ value: getDailyDataFor(d).revenue })),
      sales: last7Days.map((d) => ({ value: getDailyDataFor(d).salesCount })),
      avgTicket: last7Days.map((d) => ({ value: getDailyDataFor(d).avgTicket })),
      profit: last7Days.map((d) => ({ value: getDailyDataFor(d).profit })),
    };

    // Summary data for cards
    const totalPaymentsCount = filteredSales.filter(s => s.paymentMethod !== 'Crédito').length;
    const totalPaymentsValue = filteredSales.filter(s => s.paymentMethod !== 'Crédito').reduce((sum, s) => sum + s.totalAmount, 0);
    const paymentDescription = `Total pagos: ${totalPaymentsCount} / ${formatCurrency(totalPaymentsValue)}`;

    const productSales = new Map<string, { totalRevenue: number }>();
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productSales.get(item.productId) || { totalRevenue: 0 };
        existing.totalRevenue += item.subtotal;
        productSales.set(item.productId, existing);
      });
    });
    
    let topProductDescription = "No hay ventas.";
    if (productSales.size > 0) {
        const topProductId = [...productSales.entries()].sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)[0][0];
        const topProductInfo = allProducts.find(p => p.id === topProductId);
        topProductDescription = `Top: ${topProductInfo?.name || 'Producto Desconocido'}`;
    }

    const productMap = new Map(allProducts.map(p => [p.id, p]));
    const salesBySupplier = new Map<string, number>();
    
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            const product = productMap.get(item.productId);
            const supplierId = product?.supplierId;
            if(supplierId) {
                salesBySupplier.set(supplierId, (salesBySupplier.get(supplierId) || 0) + item.subtotal);
            }
        });
    });

    let topSupplierDescription = "No hay ventas.";
    if (salesBySupplier.size > 0) {
        const topSupplierId = [...salesBySupplier.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const topSupplierInfo = allSuppliers.find(s => s.id === topSupplierId);
        topSupplierDescription = `Top: ${topSupplierInfo?.name || 'Proveedor Desconocido'}`;
    }
    
    return {
      dailyData: { revenue, salesCount, profit, avgTicket, sales: filteredSales },
      weeklyChartData,
      summaryData: { paymentDescription, topProductDescription, topSupplierDescription },
    };
  }, [allSales, allProducts, allSuppliers, dateRange]);

  const handleStatCardClick = (metric: StatMetricType) => {
    setDetailModalMetric(metric);
    setIsDetailModalOpen(true);
  };

  const handleApplyDateFilter = (newRange: { from?: Date; to?: Date }) => {
    setDateRange(newRange);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title="Estadísticas" />

        <DateNavigator range={dateRange} onClick={() => setIsDateFilterOpen(true)} />

        <div className="space-y-4">
          <StatCard
            title="Facturación"
            value={dailyData.revenue}
            chartData={weeklyChartData.revenue || []}
            isLoading={isLoading}
            onClick={() => handleStatCardClick('revenue')}
          />
          <StatCard
            title="Ventas"
            value={dailyData.salesCount.toString()}
            chartData={weeklyChartData.sales || []}
            isLoading={isLoading}
            onClick={() => handleStatCardClick('sales')}
          />
          <StatCard
            title="Ticket Medio"
            value={dailyData.avgTicket}
            chartData={weeklyChartData.avgTicket || []}
            isLoading={isLoading}
            onClick={() => handleStatCardClick('avgTicket')}
          />
          <StatCard
            title="Ganancia"
            value={dailyData.profit}
            chartData={weeklyChartData.profit || []}
            isLoading={isLoading}
            onClick={() => handleStatCardClick('profit')}
          />
          <SummaryCard
            title="Medio de Pago"
            description={summaryData.paymentDescription}
            icon={CreditCard}
            isLoading={isLoading}
            onClick={() => setIsPaymentModalOpen(true)}
          />
          <SummaryCard
            title="Productos más vendidos"
            description={summaryData.topProductDescription}
            icon={Gift}
            isLoading={isLoading}
            onClick={() => setIsTopProductsModalOpen(true)}
          />
          <SummaryCard
            title="Ventas por Proveedor"
            description={summaryData.topSupplierDescription}
            icon={Truck}
            isLoading={isLoading}
            onClick={() => setIsSalesBySupplierModalOpen(true)}
          />
        </div>
      </div>
      <StatDetailModal
        isOpen={isDetailModalOpen}
        setIsOpen={setIsDetailModalOpen}
        metric={detailModalMetric}
        allSales={allSales}
        selectedDate={dateRange.from || new Date()}
        setDate={(date) => setDateRange({ from: date, to: date })}
      />
      <DateRangeFilterModal
        isOpen={isDateFilterOpen}
        setIsOpen={setIsDateFilterOpen}
        onApply={handleApplyDateFilter}
        currentRange={dateRange}
      />
      <PaymentMethodDetailModal 
        isOpen={isPaymentModalOpen}
        setIsOpen={setIsPaymentModalOpen}
        sales={dailyData.sales}
        isLoading={isLoading}
      />
      <TopProductsDetailModal
        isOpen={isTopProductsModalOpen}
        setIsOpen={setIsTopProductsModalOpen}
        sales={dailyData.sales}
        products={allProducts || []}
        isLoading={isLoading}
      />
      <SalesBySupplierModal
        isOpen={isSalesBySupplierModalOpen}
        setIsOpen={setIsSalesBySupplierModalOpen}
        sales={dailyData.sales}
        products={allProducts || []}
        suppliers={allSuppliers || []}
        isLoading={isLoading}
      />
    </>
  );
}
