'use client';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Customer } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { CustomerForm } from '../customer-form';
import { toast } from '@/hooks/use-toast';

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCreateCustomer = async (data: Omit<Customer, 'id'>) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un cliente."});
        return;
    }

    try {
      const customerCollection = collection(firestore, 'users', user.uid, 'customers');
      const newCustomer = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDocumentNonBlocking(customerCollection, newCustomer);
      
      toast({
        title: "Cliente Creado",
        description: "El nuevo cliente ha sido añadido a tu lista.",
      });
      router.push('/customers');
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al crear el cliente.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Nuevo Cliente" description="Añade un nuevo cliente a tu lista." />
      <CustomerForm onSubmit={handleCreateCustomer} />
    </div>
  );
}
