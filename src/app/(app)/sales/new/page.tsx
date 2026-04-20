'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Product, Customer, Sale, SaleItem } from '@/lib/types';
import { formatCurrency, generateSaleNumber } from '@/lib/utils';
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
import { Boxes, X, Plus, Search } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/constants';
import { ReceiptDialog } from './receipt-dialog';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/date-picker';

interface CartItem extends Omit<SaleItem, 'quantity' | 'unitPrice' | 'id' | 'unitOfMeasure'> {
  cartId: string;
  quantity: number | string;
  unitPrice: number | string;
  product: Product;
}

const SALE_CART_STORAGE_KEY = 'saleCart';

export default function NewSalePage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Data Fetching ---
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
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date()); // Add sale date state

  // --- Receipt Dialog State ---
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Load cart from sessionStorage on initial render
  useEffect(() => {
    const savedCartJson = sessionStorage.getItem(SALE_CART_STORAGE_KEY);
    if (savedCartJson) {
        try {
            const savedItems = JSON.parse(savedCartJson) as CartItem[];
            if (Array.isArray(savedItems)) {
                setCart(savedItems);
            }
        } catch (error) {
            console.error("Error parsing sale cart from sessionStorage:", error);
            sessionStorage.removeItem(SALE_CART_STORAGE_KEY);
        }
    }
  }, []);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
        sessionStorage.setItem(SALE_CART_STORAGE_KEY, JSON.stringify(cart));
    } else {
        sessionStorage.removeItem(SALE_CART_STORAGE_KEY);
    }
  }, [cart]);

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

  // Reset payment method if customer is deselected
  useEffect(() => {
    if (!selectedCustomer) {
      setPaymentMethod('Efectivo');
    } else {
      setPaymentMethod('Crédito');
    }
  }, [selectedCustomer]);
  
  // --- Handlers ---
  const addToCart = (product: Product) => {
    const newCartItem: CartItem = {
      cartId: crypto.randomUUID(),
      productId: product.id!,
      product: product, // Keep full product info
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
          
          if (quantity !== '' && unitPrice !== '') {
            updatedItem.subtotal = Number(quantity) * Number(unitPrice);
          } else {
            updatedItem.subtotal = 0;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  const removeFromCart = (cartId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };
  
  const handleFinalizeSale = async () => {
    if (!user || !firestore) return;
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'El carrito está vacío.' });
      return;
    }
    if (paymentMethod === 'Crédito' && !selectedCustomer) {
      toast({ variant: 'destructive', title: 'Seleccione un cliente para ventas a crédito.' });
      return;
    }
    if (!saleDate) {
        toast({ variant: 'destructive', title: 'Seleccione una fecha de venta.' });
        return;
    }


    // Validate cart items
    for (const item of cart) {
        if (item.quantity === '' || Number(item.quantity) <= 0) {
            toast({ variant: 'destructive', title: 'Cantidad inválida', description: `El producto "${item.productName}" tiene una cantidad inválida.` });
            return;
        }
        if (item.unitPrice === '' || Number(item.unitPrice) < 0) {
            toast({ variant: 'destructive', title: 'Precio inválido', description: `El producto "${item.productName}" tiene un precio inválido.` });
            return;
        }
    }


    try {
      const batch = writeBatch(firestore);

      // 1. Create Sale Document
      const saleRef = doc(collection(firestore, 'users', user.uid, 'sales'));
      const saleData: Sale = {
        id: saleRef.id,
        saleNumber: generateSaleNumber(),
        saleDate: saleDate.toISOString(), // Use selected date
        customerId: selectedCustomer || '0', // '0' for anonymous/cash customer
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        status: paymentMethod === 'Crédito' ? 'Pending' : 'Completed',
        currencyCode: 'PEN',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        items: cart.map(({ product, cartId, ...item }) => ({
          ...item,
          productId: product.id!,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: item.subtotal,
          unitOfMeasure: product.unitOfMeasure,
          unitCost: product.cost || 0,
        })),
      };
      batch.set(saleRef, saleData);

      // 2. Update Product Stock
      cart.forEach(item => {
        if (item.product.trackStock) {
          const productRef = doc(firestore, 'users', user.uid, 'products', item.productId);
          const newStock = (item.product.stock ?? 0) - (Number(item.quantity) || 0);
          batch.update(productRef, { stock: newStock });
        }
      });
      
      await batch.commit();

      toast({ title: 'Venta registrada con éxito.' });
      setCompletedSale(saleData);
      setIsReceiptOpen(true);
      
      // Reset state
      setCart([]);
      setSelectedCustomer(null);
      setSaleDate(new Date());

    } catch (error) {
      console.error("Error finalizing sale:", error);
      toast({ variant: 'destructive', title: 'Error al registrar la venta.' });
    }
  };


  return (
    <>
      <div className="hidden h-full flex-col md:flex">
        <PageHeader title="Nueva Venta / POS" description="Selecciona productos y registra una nueva venta." />
        <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-[1fr_550px] mt-4">
          
          {/* Left Column: Product Selection */}
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
                {isLoadingProducts && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                  </div>
                )}
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
                          <AvatarFallback
                            className="rounded-md"
                            style={product.color ? { backgroundColor: product.color } : {}}
                          >
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
                 {!isLoadingProducts && filteredProducts.length === 0 && (
                  <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                    <p>No se encontraron productos.</p>
                    <Button asChild variant="outline">
                      <Link href="/products/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Nuevo Producto
                      </Link>
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column: Cart */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Pedido Actual</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {cart.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>El carrito está vacío</p>
                 </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[120px] text-center">Cant.</TableHead>
                      <TableHead className="w-[130px] text-center">Precio</TableHead>
                      <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.cartId}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="w-[120px]">
                          <Input
                            type="text"
                            inputMode={item.product.unitOfMeasure === 'unit' ? 'numeric' : 'decimal'}
                            value={item.quantity === '' ? '' : String(item.quantity)}
                            onChange={e => {
                                const value = e.target.value;
                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    updateCartItem(item.cartId, { quantity: value });
                                }
                            }}
                             onBlur={e => {
                                if (e.target.value === '') {
                                    updateCartItem(item.cartId, { quantity: 0 });
                                }
                            }}
                            className="w-full h-9 text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[130px]">
                           <Input
                            type="text"
                            inputMode="decimal"
                            value={item.unitPrice === '' ? '' : String(item.unitPrice)}
                             onChange={e => {
                                const value = e.target.value;
                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    updateCartItem(item.cartId, { unitPrice: value });
                                }
                            }}
                             onBlur={e => {
                                if (e.target.value === '') {
                                    updateCartItem(item.cartId, { unitPrice: 0 });
                                }
                            }}
                            className="w-full h-9 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                         <TableCell>
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.cartId)}>
                             <X className="h-4 w-4" />
                           </Button>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex-col !p-4 border-t">
               <div className="w-full space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de Venta</label>
                    <DatePicker date={saleDate} setDate={setSaleDate} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Select value={selectedCustomer || 'none'} onValueChange={(value) => setSelectedCustomer(value === 'none' ? null : value)}>
                        <SelectTrigger disabled={isLoadingCustomers}>
                            <SelectValue placeholder="Seleccionar Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Cliente Ocasional (Contado)</SelectItem>
                            {customers?.map(c => <SelectItem key={c.id} value={c.id!}>{c.firstName} {c.lastName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button asChild variant="outline" size="icon" className="shrink-0">
                        <Link href="/customers/new">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Crear Nuevo Cliente</span>
                        </Link>
                    </Button>
                  </div>
                   <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!selectedCustomer}>
                      <SelectTrigger>
                          <SelectValue placeholder="Método de Pago" />
                      </SelectTrigger>
                      <SelectContent>
                          {PAYMENT_METHODS.filter(m => selectedCustomer ? true : m.value !== 'Crédito').map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
                 </div>
                 <div className="flex justify-between items-center text-lg font-bold">
                   <span>TOTAL:</span>
                   <span>{formatCurrency(totalAmount)}</span>
                 </div>
                 <Button className="w-full" size="lg" onClick={handleFinalizeSale}>Finalizar Venta</Button>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>
       <div className="p-4 md:hidden text-center">
        <p>La interfaz de Punto de Venta solo está disponible en dispositivos de escritorio.</p>
      </div>

      {completedSale && (
        <ReceiptDialog
          isOpen={isReceiptOpen}
          setIsOpen={setIsReceiptOpen}
          sale={completedSale}
        />
      )}
    </>
  );
}
