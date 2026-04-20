'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sale, Product, Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SupplierSale {
    supplierId: string;
    supplierName: string;
    totalSales: number;
    products: {
        productId: string;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
    }[];
}

interface SalesBySupplierModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sales: Sale[];
  products: Product[];
  suppliers: Supplier[];
  isLoading: boolean;
}

export function SalesBySupplierModal({ isOpen, setIsOpen, sales, products, suppliers, isLoading }: SalesBySupplierModalProps) {
    
    const supplierSalesData = useMemo(() => {
        if (isLoading || !sales || !products || !suppliers) return [];

        const productMap = new Map(products.map(p => [p.id, p]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s]));
        
        const salesBySupplier = new Map<string, { totalSales: number; products: Map<string, { productName: string; totalQuantity: number; totalRevenue: number; }> }>();
        
        salesBySupplier.set('unassigned', { totalSales: 0, products: new Map() });

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = productMap.get(item.productId);
                const supplierId = product?.supplierId || 'unassigned';
                
                const supplierData = salesBySupplier.get(supplierId) || { totalSales: 0, products: new Map() };

                supplierData.totalSales += item.subtotal;

                const productData = supplierData.products.get(item.productId) || { productName: item.productName, totalQuantity: 0, totalRevenue: 0 };
                productData.totalQuantity += item.quantity;
                productData.totalRevenue += item.subtotal;

                supplierData.products.set(item.productId, productData);
                salesBySupplier.set(supplierId, supplierData);
            });
        });

        const result: SupplierSale[] = [];
        salesBySupplier.forEach((data, supplierId) => {
            const supplier = supplierMap.get(supplierId);
            if (data.totalSales > 0) {
                result.push({
                    supplierId,
                    supplierName: supplier ? supplier.name : 'Sin Proveedor',
                    totalSales: data.totalSales,
                    products: Array.from(data.products.entries()).map(([productId, productData]) => ({
                        productId,
                        ...productData
                    })).sort((a, b) => b.totalRevenue - a.totalRevenue),
                });
            }
        });
        
        return result.sort((a,b) => b.totalSales - a.totalSales);

    }, [sales, products, suppliers, isLoading]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ventas por Proveedor</DialogTitle>
          <DialogDescription>
            Total de ventas de productos agrupados por su proveedor para el período seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
                {supplierSalesData.length === 0 ? (
                     <div className="text-center text-muted-foreground py-10">No hay datos de ventas para este período.</div>
                ) : (
                    supplierSalesData.map(supplierData => (
                        <AccordionItem value={supplierData.supplierId} key={supplierData.supplierId}>
                            <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                    <span className="font-semibold">{supplierData.supplierName}</span>
                                    <span className="text-primary font-bold">{formatCurrency(supplierData.totalSales)}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-center">Cant.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {supplierData.products.map(product => (
                                            <TableRow key={product.productId}>
                                                <TableCell>{product.productName}</TableCell>
                                                <TableCell className="text-center">{product.totalQuantity.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                )}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
