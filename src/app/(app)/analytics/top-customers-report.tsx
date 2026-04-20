'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale, Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { startOfDay, endOfDay } from 'date-fns';


interface TopCustomer {
    customerId: string;
    name: string;
    email?: string;
    totalSpent: number;
    totalSales: number;
}

export function TopCustomersReport({ selectedDate }: { selectedDate?: Date }) {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const salesQuery = useMemo(() => {
        if (!user) return null;
        const q = collection(firestore, 'users', user.uid, 'sales');
        (q as any).__memo = true;
        return q;
    }, [firestore, user]);

    const customersQuery = useMemo(() => {
        if (!user) return null;
        const q = collection(firestore, 'users', user.uid, 'customers');
        (q as any).__memo = true;
        return q;
    }, [firestore, user]);
    
    const { data: allSales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const isLoading = isLoadingSales || isLoadingCustomers;

    const topCustomers = useMemo(() => {
        if (!allSales || !customers) return [];
        
        const filteredSales = selectedDate 
            ? allSales.filter(sale => {
                const saleDate = new Date(sale.saleDate);
                return saleDate >= startOfDay(selectedDate) && saleDate <= endOfDay(selectedDate);
            }) 
            : allSales;
            
        const customerSales = new Map<string, { totalSpent: number; totalSales: number }>();

        filteredSales.forEach(sale => {
            // Exclude anonymous customer
            if (sale.customerId === '0') return;

            const existing = customerSales.get(sale.customerId) || { totalSpent: 0, totalSales: 0 };
            existing.totalSpent += sale.totalAmount;
            existing.totalSales += 1;
            customerSales.set(sale.customerId, existing);
        });
        
        const allCustomersResult: TopCustomer[] = Array.from(customerSales.entries()).map(([customerId, data]) => {
            const customerInfo = customers.find(c => c.id === customerId);
            return {
                customerId,
                name: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Cliente Desconocido',
                email: customerInfo?.email,
                ...data,
            };
        });

        return allCustomersResult.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    }, [allSales, customers, selectedDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mejores Clientes</CardTitle>
                <CardDescription>Top 5 clientes por total gastado.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Nº Ventas</TableHead>
                            <TableHead className="text-right">Total Gastado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && topCustomers.map(customer => (
                            <TableRow key={customer.customerId} onClick={() => router.push(`/customers/${customer.customerId}`)} className="cursor-pointer">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                         <Avatar className="h-9 w-9">
                                            <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{customer.totalSales}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(customer.totalSpent)}</TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && topCustomers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No hay datos de clientes.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
