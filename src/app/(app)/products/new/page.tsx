'use client';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ProductForm } from '../product-form';
import { toast } from '@/hooks/use-toast';

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCreateProduct = async (data: Omit<Product, 'id'>) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un producto." });
      return;
    }

    try {
      const productCollection = collection(firestore, 'users', user.uid, 'products');
      const newProduct: Omit<Product, 'id'> = {
        ...data,
        isDeleted: false,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      await addDocumentNonBlocking(productCollection, newProduct);
      
      toast({
        title: "Producto Creado",
        description: "El nuevo producto ha sido añadido a tu inventario.",
      });
      router.push('/products');
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al crear el producto.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Nuevo Producto" description="Añade un nuevo artículo a tu inventario." />
      <ProductForm onSubmit={handleCreateProduct} />
    </div>
  );
}
