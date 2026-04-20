'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useCollection, useDoc, useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { Product, Customer, Sale, SaleItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Boxes, X, Plus, Search, Info } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/constants';
import { DatePicker } from '@/components/date-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CartItem extends Omit<SaleItem, 'quantity' | 'unitPrice' | 'id' | 'unitOfMeasure'> {
  cartId: string;
  quantity: number | string;
  unitPrice: number | string;
  product: Product;
}

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const { id: saleId } = params;
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Data Fetching ---
  const saleDocRef = useMemo(() => {
    if (!user || !saleId) return null;
    const q = doc(firestore, 'users', user.uid, 'sales', saleId as string);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, saleId]);
  const { data: originalSale, isLoading: isLoadingSale } = useDoc<Sale>(saleDocRef);

  const productsQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'products');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const customersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'customers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  
  // --- Sale State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Crédito');
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  
  const isLoading = isLoadingSale || isLoadingProducts || isLoadingCustomers;
  
  // --- Effects ---
  useEffect(() => {
    if (originalSale && products) {
        const saleItemsAsCartItems = originalSale.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            // Product might be undefined if it was hard-deleted, but our new logic archives it.
            // So, `product` should exist. If not, we filter it out.
            return {
                ...item,
                cartId: crypto.randomUUID(),
                product: product!,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            };
        }).filter(item => item.product); // Filter out items where product not found
      
      setCart(saleItemsAsCartItems);
      setSelectedCustomer(originalSale.customerId === '0' ? null : originalSale.customerId);
      setPaymentMethod(originalSale.paymentMethod);
      setSaleDate(new Date(originalSale.saleDate));
    }
  }, [originalSale, products]);
  
  useEffect(() => {
    if (!selectedCustomer) {
      setPaymentMethod('Efectivo');
    }
  }, [selectedCustomer]);
  
  // --- Memos ---
  const filteredProducts = useMemo(() => {
    return products?.filter(p => p.isActive && !p.isDeleted && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];
  }, [products, searchTerm]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const quantity = isNaN(Number(item.quantity)) ? 0 : Number(item.quantity);
      const price = isNaN(Number(item.unitPrice)) ? 0 : Number(item.unitPrice);
      return sum + (quantity * price);
    }, 0);
  }, [cart]);

  const saleContainsArchivedProduct = useMemo(() => {
    return cart.some(item => item.product?.isDeleted);
  }, [cart]);

  // --- Handlers ---
  const addToCart = (product: Product) => {
    const newCartItem: CartItem = {
      cartId: crypto.randomUUID(),
      productId: product.id!,
      product,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      subtotal: product.price,
      unitCost: product.cost || 0,
    };
    setCart(prevCart => [...prevCart, newCartItem]);
  };

  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.cartId === cartId) {
          const updatedItem = { ...item, ...updates };
          const quantity = updatedItem.quantity === '' ? '' : (Number(updatedItem.quantity) || 0);
          const unitPrice = updatedItem.unitPrice === '' ? '' : (Number(updatedItem.unitPrice) || 0);
          updatedItem.subtotal = (quantity !== '' && unitPrice !== '') ? Number(quantity) * Number(unitPrice) : 0;
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  const removeFromCart = (cartId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };
  
  const handleUpdateSale = async () => {
    if (!user || !firestore || !originalSale || !saleDate) return;
    // Validations
    if (cart.length === 0 || paymentMethod === 'Crédito' && !selectedCustomer) {
      toast({ variant: 'destructive', title: 'Por favor, completa los campos requeridos.' });
      return;
    }
    if (saleContainsArchivedProduct) {
        toast({ variant: 'destructive', title: 'No se puede editar esta venta.', description: 'Contiene un producto que ha sido archivado.' });
        return;
    }

    try {
      const batch = writeBatch(firestore);
      
      // --- Stock Adjustment Logic ---
      const stockAdjustments = new Map<string, number>();
      
      // 1. Add back stock from original sale items
      originalSale.items.forEach(item => {
          const originalProduct = products?.find(p => p.id === item.productId);
          if (originalProduct?.trackStock) {
              stockAdjustments.set(item.productId, (stockAdjustments.get(item.productId) || 0) + item.quantity);
          }
      });
      
      // 2. Deduct stock for new/updated cart items
      cart.forEach(item => {
          if (item.product.trackStock) {
              stockAdjustments.set(item.productId, (stockAdjustments.get(item.productId) || 0) - Number(item.quantity));
          }
      });

      // 3. Apply stock adjustments to the batch
      stockAdjustments.forEach((adjustment, productId) => {
          if (adjustment !== 0) {
              const productRef = doc(firestore, 'users', user.uid, 'products', productId);
              batch.update(productRef, { stock: increment(adjustment) });
          }
      });

      // 4. Update the sale document
      const saleRef = doc(firestore, 'users', user.uid, 'sales', saleId as string);
      const updatedSaleData = {
        saleDate: saleDate.toISOString(),
        customerId: selectedCustomer || '0',
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        status: paymentMethod === 'Crédito' ? 'Pending' : 'Completed',
        updatedAt: serverTimestamp(),
        items: cart.map(({ product, cartId, ...item }) => ({
          ...item,
          productId: product.id!,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: item.subtotal,
          unitOfMeasure: product.unitOfMeasure,
          unitCost: product.cost || 0
        })),
      };
      batch.update(saleRef, updatedSaleData);
      
      await batch.commit();

      toast({ title: 'Venta actualizada con éxito.' });
      router.push(`/sales/${saleRef.id}`);

    } catch (error) {
      console.error("Error updating sale:", error);
      toast({ variant: 'destructive', title: 'Error al actualizar la venta.' });
    }
  };


  return (
    <>
      <div className="hidden h-full flex-col md:flex">
        <PageHeader title={`Editar Venta ${originalSale?.saleNumber || ''}`} description="Modifica los detalles de la venta." />
        {isLoading ? (
          <div className="flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_550px] mt-4">
            <Skeleton className="h-full w-full" />
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
        <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-[1fr_550px] mt-4">
          <Card>
            <CardHeader>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Buscar productos por nombre..."
                   className="pl-10"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="cursor-pointer hover:border-primary transition-colors flex flex-col"
                    >
                      <CardHeader className="p-2 pb-0 aspect-square">
                        <Avatar className="h-full w-full rounded-md">
                          <AvatarImage src={product.imageUrl} alt={product.name} className="object-cover" />
                          <AvatarFallback className="rounded-md" style={product.color ? { backgroundColor: product.color } : {}}>
                            {!product.imageUrl && !product.color && <Boxes className="h-8 w-8 text-muted-foreground" />}
                          </AvatarFallback>
                        </Avatar>
                      </CardHeader>
                      <CardContent className="p-2 flex-1 flex flex-col justify-between">
                         <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                         <p className="text-sm font-semibold text-primary">{formatCurrency(product.price)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader><CardTitle>Pedido a Editar</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {cart.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground"><p>El carrito está vacío</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[100px] text-center">Cant.</TableHead>
                      <TableHead className="w-[110px] text-center">Precio</TableHead>
                      <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.cartId} className={item.product?.isDeleted ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium text-sm">
                          {item.productName}
                          {item.product?.isDeleted && <p className="text-xs text-destructive">(Archivado)</p>}
                        </TableCell>
                        <TableCell><Input type="text" inputMode={item.product.unitOfMeasure === 'unit' ? 'numeric' : 'decimal'} value={item.quantity} onChange={e => updateCartItem(item.cartId, { quantity: e.target.value })} onBlur={e => e.target.value === '' && updateCartItem(item.cartId, { quantity: 0 })} className="w-full h-9 text-center" /></TableCell>
                        <TableCell><Input type="text" inputMode="decimal" value={item.unitPrice} onChange={e => updateCartItem(item.cartId, { unitPrice: e.target.value })} onBlur={e => e.target.value === '' && updateCartItem(item.cartId, { unitPrice: 0 })} className="w-full h-9 text-center" /></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.cartId)}><X className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex-col !p-4 border-t">
               <div className="w-full space-y-4">
                {saleContainsArchivedProduct && (
                    <Alert variant="destructive">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No se puede editar esta venta</AlertTitle>
                      <AlertDescription>
                        Esta venta contiene productos que han sido archivados. Para modificarla, debes eliminar la venta y crear una nueva.
                      </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de Venta</label>
                    <DatePicker date={saleDate} setDate={setSaleDate} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Select value={selectedCustomer || 'none'} onValueChange={(value) => setSelectedCustomer(value === 'none' ? null : value)}>
                        <SelectTrigger disabled={isLoadingCustomers}><SelectValue placeholder="Seleccionar Cliente" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Cliente Ocasional (Contado)</SelectItem>
                            {customers?.map(c => <SelectItem key={c.id} value={c.id!}>{c.firstName} {c.lastName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button asChild variant="outline" size="icon" className="shrink-0"><Link href="/customers/new"><Plus className="h-4 w-4" /><span className="sr-only">Crear</span></Link></Button>
                  </div>
                   <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!selectedCustomer}>
                      <SelectTrigger><SelectValue placeholder="Método de Pago" /></SelectTrigger>
                      <SelectContent>
                          {PAYMENT_METHODS.filter(m => selectedCustomer ? true : m.value !== 'Crédito').map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
                 </div>
                 <div className="flex justify-between items-center text-lg font-bold">
                   <span>TOTAL:</span>
                   <span>{formatCurrency(totalAmount)}</span>
                 </div>
                 <Button className="w-full" size="lg" onClick={handleUpdateSale} disabled={saleContainsArchivedProduct}>Guardar Cambios</Button>
               </div>
            </CardFooter>
          </Card>
        </div>
        )}
      </div>
      <div className="p-4 md:hidden text-center"><p>La edición de ventas solo está disponible en dispositivos de escritorio.</p></div>
    </>
  );
}
