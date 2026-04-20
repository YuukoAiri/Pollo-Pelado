'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sale, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package } from 'lucide-react';

interface TopProductsDetailModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sales: Sale[];
  products: Product[];
  isLoading: boolean;
}

export function TopProductsDetailModal({ isOpen, setIsOpen, sales, products, isLoading }: TopProductsDetailModalProps) {
  const topProducts = useMemo(() => {
    if (!sales || !products || sales.length === 0) return [];

    const productSales = new Map<string, { totalQuantity: number, totalRevenue: number }>();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productSales.get(item.productId) || { totalQuantity: 0, totalRevenue: 0 };
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.subtotal;
        productSales.set(item.productId, existing);
      });
    });

    const productsWithInfo = Array.from(productSales.entries()).map(([productId, data]) => {
      const productInfo = products.find((p) => p.id === productId);
      return {
        productId,
        name: productInfo?.name || 'Producto Desconocido',
        imageUrl: productInfo?.imageUrl,
        ...data,
      };
    });

    return productsWithInfo.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [sales, products]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Productos más vendidos</DialogTitle>
          <DialogDescription>Top 5 productos por ingresos generados.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant. Vendida</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-md">
                          <AvatarImage src={product.imageUrl} alt={product.name} />
                          <AvatarFallback className="rounded-md bg-muted"><Package /></AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{product.totalQuantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(product.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No hay datos de ventas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
