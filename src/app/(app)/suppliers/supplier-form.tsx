'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const supplierSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  contactPerson: z.string().optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  phone: z.string().optional(),
  identificationNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  isSubmitting?: boolean;
}

export function SupplierForm({ supplier, onSubmit, isSubmitting }: SupplierFormProps) {
  const router = useRouter();
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || '',
      contactPerson: supplier?.contactPerson || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      identificationNumber: supplier?.identificationNumber || '',
      address: supplier?.address || '',
      notes: supplier?.notes || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader><CardTitle>Información del Proveedor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre o Razón Social</FormLabel>
                  <FormControl><Input placeholder="Proveedor S.R.L." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Ana García" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="contacto@proveedor.com" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl><Input placeholder="+51 987 654 321" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="identificationNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nº de Identificación (RUC)</FormLabel>
                    <FormControl><Input placeholder="20123456789" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl><Input placeholder="Jr. Producción 456" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Textarea placeholder="Notas adicionales sobre el proveedor..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : (supplier ? 'Guardar Cambios' : 'Crear Proveedor')}</Button>
        </div>
      </form>
    </Form>
  );
}
