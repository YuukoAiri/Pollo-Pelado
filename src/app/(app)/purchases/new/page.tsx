'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { Product, Supplier, Purchase, PurchaseItem } from '@/lib/types';
import { formatCurrency, generatePurchaseNumber } from '@/lib/utils';
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
import { DatePicker } from '@/components/date-picker';
import { PurchaseReceiptDialog } from './purchase-receipt-dialog';

interface CartItem extends Omit<PurchaseItem, 'id' | 'unitOfMeasure' | 'productName'> {
  cartId: string;
  quantity: number | string;
  unitCost: number | string;
  product: Product;
}

const PURCHASE_CART_STORAGE_KEY = 'purchaseCart';

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const productsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const suppliersQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'suppliers');
  }, [firestore, user]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(searchParams.get('supplierId'));
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
  
  const [completedPurchase, setCompletedPurchase] = useState<Purchase | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    const savedCartJson = sessionStorage.getItem(PURCHASE_CART_STORAGE_KEY);
    if (savedCartJson) {
        try {
            const savedItems = JSON.parse(savedCartJson) as CartItem[];
            if (Array.isArray(savedItems)) {
                setCart(savedItems);
            }
        } catch (error) {
            console.error("Error parsing purchase cart from sessionStorage:", error);
            sessionStorage.removeItem(PURCHASE_CART_STORAGE_KEY);
        }
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
        sessionStorage.setItem(PURCHASE_CART_STORAGE_KEY, JSON.stringify(cart));
    } else {
        sessionStorage.removeItem(PURCHASE_CART_STORAGE_KEY);
    }
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products?.filter(p => p.isActive && !p.isDeleted && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];
  }, [products, searchTerm]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const quantity = isNaN(Number(item.quantity)) ? 0 : Number(item.quantity);
      const cost = isNaN(Number(item.unitCost)) ? 0 : Number(item.unitCost);
      return sum + (quantity * cost);
    }, 0);
  }, [cart]);
  
  const addToCart = (product: Product) => {
    const newCartItem: CartItem = {
      cartId: crypto.randomUUID(),
      productId: product.id!,
      product: product,
      quantity: 1,
      unitCost: product.cost || 0,
      subtotal: product.cost || 0,
    };
    setCart(prevCart => [...prevCart, newCartItem]);
  };

  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.cartId === cartId) {
          const updatedItem = { ...item, ...updates };
          const quantity = updatedItem.quantity === '' ? '' : (Number(updatedItem.quantity) || 0);
          const unitCost = updatedItem.unitCost === '' ? '' : (Number(updatedItem.unitCost) || 0);
          updatedItem.subtotal = (quantity !== '' && unitCost !== '') ? Number(quantity) * Number(unitCost) : 0;
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  const removeFromCart = (cartId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };
  
  const handleFinalizePurchase = async () => {
    if (!user || !firestore || cart.length === 0 || !selectedSupplier || !purchaseDate) {
      toast({ variant: 'destructive', title: 'Por favor, completa los campos requeridos.' });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      const purchaseRef = doc(collection(firestore, 'users', user.uid, 'purchases'));
      const purchaseData: Purchase = {
        id: purchaseRef.id,
        purchaseNumber: generatePurchaseNumber(),
        purchaseDate: purchaseDate.toISOString(),
        supplierId: selectedSupplier,
        totalAmount: totalAmount,
        currencyCode: 'PEN',
        status: 'Received',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        items: cart.map(({ product, cartId, ...item }) => ({
          ...item,
          productId: product.id!,
          productName: product.name,
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost) || 0,
          subtotal: item.subtotal,
          unitOfMeasure: product.unitOfMeasure,
        })),
      };
      batch.set(purchaseRef, purchaseData);

      cart.forEach(item => {
        if (item.product.trackStock) {
          const productRef = doc(firestore, 'users', user.uid, 'products', item.productId);
          batch.update(productRef, { stock: increment(Number(item.quantity) || 0) });
        }
      });
      
      await batch.commit();

      toast({ title: 'Compra registrada con éxito.' });
      setCompletedPurchase(purchaseData);
      setIsReceiptOpen(true);
      
      setCart([]);
      setPurchaseDate(new Date());

    } catch (error) {
      console.error("Error finalizing purchase:", error);
      toast({ variant: 'destructive', title: 'Error al registrar la compra.' });
    }
  };


  return (
    <>
      <div className="hidden h-full flex-col md:flex">
        <PageHeader title="Nueva Compra" description="Registra una nueva compra de productos a un proveedor." />
        <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-[1fr_550px] mt-4">
          
          <Card>
            <CardHeader>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Buscar productos..."
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
                          <AvatarFallback className="rounded-md bg-muted"><Boxes className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                      </CardHeader>
                      <CardContent className="p-2 flex-1 flex flex-col justify-between">
                         <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                         <p className="text-sm font-semibold text-primary">{formatCurrency(product.cost || 0)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader><CardTitle>Detalle de Compra</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {cart.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground"><p>El carrito está vacío</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[100px] text-center">Cant.</TableHead>
                      <TableHead className="w-[110px] text-center">Costo</TableHead>
                      <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.cartId}>
                        <TableCell className="font-medium text-sm">{item.product.name}</TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={e => updateCartItem(item.cartId, { quantity: e.target.value })} className="w-full h-9 text-center" /></TableCell>
                        <TableCell><Input type="number" value={item.unitCost} onChange={e => updateCartItem(item.cartId, { unitCost: e.target.value })} className="w-full h-9 text-center" /></TableCell>
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
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de Compra</label>
                    <DatePicker date={purchaseDate} setDate={setPurchaseDate} />
                 </div>
                 <div className="flex items-center gap-2">
                    <Select value={selectedSupplier || ''} onValueChange={(value) => setSelectedSupplier(value)}>
                        <SelectTrigger disabled={isLoadingSuppliers}><SelectValue placeholder="Seleccionar Proveedor" /></SelectTrigger>
                        <SelectContent>
                            {suppliers?.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button asChild variant="outline" size="icon" className="shrink-0"><Link href="/suppliers/new"><Plus className="h-4 w-4" /></Link></Button>
                  </div>
                 <div className="flex justify-between items-center text-lg font-bold">
                   <span>TOTAL:</span>
                   <span>{formatCurrency(totalAmount)}</span>
                 </div>
                 <Button className="w-full" size="lg" onClick={handleFinalizePurchase}>Finalizar Compra</Button>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      <div className="p-4 md:hidden text-center"><p>Esta interfaz solo está disponible en dispositivos de escritorio.</p></div>

      <PurchaseReceiptDialog
        isOpen={isReceiptOpen}
        setIsOpen={setIsReceiptOpen}
        purchase={completedPurchase}
      />
    </>
  );
}
