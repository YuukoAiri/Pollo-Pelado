'use client';

import { useMemo } from 'react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { startOfDay, endOfDay } from 'date-fns';


interface TopProduct {
    productId: string;
    name: string;
    imageUrl?: string;
    totalQuantity: number;
    totalRevenue: number;
}

export function TopProductsReport({ selectedDate }: { selectedDate?: Date }) {
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


    const { data: allSales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    const isLoading = isLoadingSales || isLoadingProducts;

    const topProducts = useMemo(() => {
        if (!allSales || !products) return [];

        const filteredSales = selectedDate 
            ? allSales.filter(sale => {
                const saleDate = new Date(sale.saleDate);
                return saleDate >= startOfDay(selectedDate) && saleDate <= endOfDay(selectedDate);
            }) 
            : allSales;

        const productSales = new Map<string, { totalQuantity: number, totalRevenue: number }>();

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = productSales.get(item.productId) || { totalQuantity: 0, totalRevenue: 0 };
                existing.totalQuantity += item.quantity;
                existing.totalRevenue += item.subtotal;
                productSales.set(item.productId, existing);
            });
        });
        
        const allProductsResult: TopProduct[] = Array.from(productSales.entries()).map(([productId, data]) => {
            const productInfo = products.find(p => p.id === productId);
            return {
                productId,
                name: productInfo?.name || 'Producto Desconocido',
                imageUrl: productInfo?.imageUrl,
                ...data,
            };
        });

        return allProductsResult.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    }, [allSales, products, selectedDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>Top 5 productos por ingresos generados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cantidad Vendida</TableHead>
                            <TableHead className="text-right">Ingresos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && topProducts.map(product => (
                            <TableRow key={product.productId}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 rounded-md">
                                            <AvatarImage src={product.imageUrl} alt={product.name} />
                                            <AvatarFallback className="rounded-md"><Package /></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{product.name}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{product.totalQuantity.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(product.totalRevenue)}</TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && topProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No hay datos de ventas.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
