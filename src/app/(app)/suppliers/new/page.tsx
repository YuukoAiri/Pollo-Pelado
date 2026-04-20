'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Supplier } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { SupplierForm } from '../supplier-form';
import { toast } from '@/hooks/use-toast';

export default function NewSupplierPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSupplier = async (data: Omit<Supplier, 'id'>) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un proveedor."});
        return;
    }
    setIsSubmitting(true);

    try {
      const supplierCollection = collection(firestore, 'users', user.uid, 'suppliers');
      const newSupplier = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDocumentNonBlocking(supplierCollection, newSupplier);
      
      toast({
        title: "Proveedor Creado",
        description: "El nuevo proveedor ha sido añadido a tu lista.",
      });
      router.push('/suppliers');
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al crear el proveedor.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Nuevo Proveedor" description="Añade un nuevo proveedor a tu lista." />
      <SupplierForm onSubmit={handleCreateSupplier} isSubmitting={isSubmitting} />
    </div>
  );
}
