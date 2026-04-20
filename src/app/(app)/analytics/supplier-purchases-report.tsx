'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Purchase } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { startOfDay, endOfDay } from 'date-fns';

export function SupplierPurchasesReport({ selectedDate }: { selectedDate?: Date }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const purchasesQuery = useMemo(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'purchases');
    }, [firestore, user]);

    const { data: allPurchases, isLoading } = useCollection<Purchase>(purchasesQuery);

    const dailyPurchases = useMemo(() => {
        if (!allPurchases) return [];
        
        const filtered = selectedDate 
            ? allPurchases.filter(p => {
                const pDate = new Date(p.purchaseDate);
                return pDate >= startOfDay(selectedDate) && pDate <= endOfDay(selectedDate);
            }) 
            : allPurchases;

        const total = filtered.reduce((sum, p) => sum + p.totalAmount, 0);
        return { purchases: filtered, total };

    }, [allPurchases, selectedDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Compras a Proveedor por Día
        </CardTitle>
        <CardDescription>
          Total de compras realizadas en la fecha seleccionada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nº Compra</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dailyPurchases.purchases.length === 0 ? (
                        <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay compras para esta fecha.</TableCell></TableRow>
                    ) : (
                        <>
                            {dailyPurchases.purchases.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.purchaseNumber}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.totalAmount)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{formatCurrency(dailyPurchases.total)}</TableCell>
                            </TableRow>
                        </>
                    )}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}
