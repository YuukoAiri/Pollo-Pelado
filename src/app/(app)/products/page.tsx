'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Boxes, LayoutGrid, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [showArchiveAlert, setShowArchiveAlert] = useState(false);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  const productsQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'products');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);

  const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const isLoading = isLoadingProducts;

  const activeProducts = useMemo(() => {
    return allProducts?.filter(p => !p.isDeleted) ?? [];
  }, [allProducts]);

  const handleArchiveRequest = (product: Product) => {
    setProductToArchive(product);
    setShowArchiveAlert(true);
  };

  const handleArchive = () => {
    if (!productToArchive || !productToArchive.id || !user) return;
    const docRef = doc(firestore, 'users', user.uid, 'products', productToArchive.id);
    
    updateDocumentNonBlocking(docRef, { isDeleted: true });

    toast({
      title: "Producto Archivado",
      description: `El producto "${productToArchive.name}" ha sido archivado y no aparecerá en nuevas ventas.`,
    });
    setShowArchiveAlert(false);
    setProductToArchive(null);
  };

  const getStockStatus = (product: Product) => {
    if (!product.trackStock) {
      return <Badge variant="outline">No rastreado</Badge>;
    }
    
    const stock = product.stock ?? 0;
    const unit = product.unitOfMeasure || 'unidades';
    
    if (stock <= 0) {
      return <div className="flex flex-col items-start">
        <Badge variant="destructive">Agotado</Badge>
        <span className="text-xs text-muted-foreground mt-1">0 {unit}</span>
      </div>;
    }
    
    if (product.minStock && stock < product.minStock) {
      return <div className="flex flex-col items-start">
        <Badge variant="destructive" className="bg-orange-500">Bajo</Badge>
        <span className="text-xs text-muted-foreground mt-1">{stock} {unit}</span>
      </div>;
    }

    return <div className="flex flex-col items-start">
        <Badge className="bg-green-500">En Stock</Badge>
        <span className="text-xs text-muted-foreground mt-1">{stock} {unit}</span>
      </div>;
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {isLoading &&
        [...Array(10)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-3"><Skeleton className="h-32 w-full" /></CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </CardContent>
          </Card>
        ))}
      {!isLoading && activeProducts.length === 0 && (
        <p className="col-span-full h-24 text-center flex items-center justify-center text-muted-foreground">
          No se encontraron productos.
        </p>
      )}
      {activeProducts.map((product) => (
        <Card key={product.id} className="flex flex-col relative transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:z-10 cursor-pointer" onClick={() => router.push(`/products/${product.id}`)}>
          <CardHeader className="p-3">
            <Avatar className="h-32 w-full rounded-md">
              <AvatarImage src={product.imageUrl} alt={product.name} className="object-cover" />
              <AvatarFallback className="rounded-md bg-muted">
                <Boxes className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-medium leading-tight line-clamp-2">{product.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem asChild><Link href={`/products/${product.id}`}><Pencil className="mr-2 h-4 w-4"/>Editar</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleArchiveRequest(product)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4"/>Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {getStockStatus(product)}
              </div>
            </div>
            <div className="mt-2">
              <p className="font-semibold text-base mt-1">{formatCurrency(product.price)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Estado de Stock</TableHead>
              <TableHead>Precio de Venta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            {!isLoading && activeProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            )}
            {activeProducts.map((product) => (
              <TableRow key={product.id} onClick={() => router.push(`/products/${product.id}`)} className="cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-md">
                      <AvatarImage src={product.imageUrl} alt={product.name} className="object-cover" />
                      <AvatarFallback className="rounded-md bg-muted">
                        <Boxes className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{product.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStockStatus(product)}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem asChild><Link href={`/products/${product.id}`}><Pencil className="mr-2 h-4 w-4"/>Editar</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleArchiveRequest(product)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader title="Inventario" description="Gestiona tus productos y su stock.">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
              <span className="sr-only">Vista de Lista</span>
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Vista de Cuadrícula</span>
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <PlusCircle />
                Nuevo Producto
              </Link>
            </Button>
          </div>
        </PageHeader>
        
        {viewMode === 'list' ? renderListView() : renderGridView()}
      </div>
      
      <AlertDialog open={showArchiveAlert} onOpenChange={setShowArchiveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres archivar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no eliminará el producto, pero lo ocultará de la lista de inventario y no podrá ser seleccionado en nuevas ventas. Los registros de ventas existentes no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive hover:bg-destructive/90">
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
