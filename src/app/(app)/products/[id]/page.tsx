'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ProductForm } from '../product-form';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';


export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user } = useUser();
  const firestore = useFirestore();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const productDocRef = useMemo(() => {
    if (!user || !id) return null;
    const q = doc(firestore, 'users', user.uid, 'products', id as string);
    (q as any).__memo = true;
    return q;
  }, [firestore, user, id]);

  const { data: product, isLoading } = useDoc<Product>(productDocRef);

  const handleUpdateProduct = async (data: Omit<Product, 'id'>) => {
    if (!user || !id) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'products', id as string);
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      await updateDocumentNonBlocking(docRef, updatedData);
      
      toast({
        title: "Producto Actualizado",
        description: "Los cambios han sido guardados.",
      });
      // The useDoc hook will automatically update the data on snapshot change.
    } catch (error) {
      console.error("Error updating product:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al actualizar el producto.",
      });
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productDocRef) return;
    try {
        await deleteDocumentNonBlocking(productDocRef);
        toast({
            title: "Producto Eliminado",
            description: "El producto ha sido eliminado de tus registros."
        });
        router.push('/products');
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Hubo un problema al eliminar el producto.",
        });
    }
    setShowDeleteAlert(false);
  };

  if (isLoading) {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Editar Producto" description="Cargando datos del producto..." />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!product) {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Error" description="Producto no encontrado." />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={product.name} description={`Actualizando información del producto.`}>
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Producto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de eliminar este producto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a {product.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </PageHeader>
      
      <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Detalles del Producto</TabsTrigger>
            <TabsTrigger value="history" disabled>Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4">
             <ProductForm product={product} onSubmit={handleUpdateProduct} />
          </TabsContent>
           <TabsContent value="history">
             <p className="p-4 text-center text-muted-foreground">Historial de movimientos (en desarrollo).</p>
          </TabsContent>
        </Tabs>
    </div>
  );
}
