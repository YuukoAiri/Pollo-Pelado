'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product, Supplier } from '@/lib/types';
import { UNITS_OF_MEASURE } from '@/lib/constants';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';

const productSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  description: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser un número positivo."),
  cost: z.coerce.number().nonnegative("El costo debe ser un número positivo o cero.").optional(),
  trackStock: z.boolean().default(true),
  stock: z.coerce.number().int("El stock debe ser un número entero.").optional(),
  minStock: z.coerce.number().int("El stock mínimo debe ser un número entero.").optional(),
  unitOfMeasure: z.string().min(1, "La unidad es requerida."),
  categoryId: z.string().min(1, "La categoría es requerida."),
  supplierId: z.string().optional(),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  imageUrl: z.string().url("URL de imagen inválida.").optional().or(z.literal('')),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido. Use formato #RRGGBB").optional().or(z.literal('')),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Omit<Product, 'id'>) => void;
}

export function ProductForm({ product, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const suppliersQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'suppliers');
    (q as any).__memo = true;
    return q;
  }, [firestore, user]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      cost: product?.cost || 0,
      trackStock: product?.trackStock ?? true,
      stock: product?.stock || 0,
      minStock: product?.minStock || 0,
      unitOfMeasure: product?.unitOfMeasure || '',
      categoryId: product?.categoryId || '',
      supplierId: product?.supplierId || '',
      isActive: product?.isActive ?? true,
      isDeleted: product?.isDeleted || false,
      imageUrl: product?.imageUrl || '',
      color: product?.color || '',
    },
  });
  
  const trackStock = form.watch('trackStock');

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data as Omit<Product, 'id'>);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Detalles del Producto</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Producto</FormLabel>
                      <FormControl><Input placeholder="Ej: Huevos de Gallina" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl><Textarea placeholder="Describe el producto" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Precios y Stock</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de Venta</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo de Compra</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="trackStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Controlar Stock</FormLabel>
                        <FormDescription>
                          Desactiva si el producto tiene stock ilimitado o no requiere seguimiento.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Actual</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} disabled={!trackStock} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Mínimo</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} disabled={!trackStock} /></FormControl>
                         <FormDescription>Alerta cuando el stock baje de este nivel.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Organización</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>URL de Imagen de Referencia</FormLabel>
                      <FormControl><Input placeholder="https://ejemplo.com/imagen.png" {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitOfMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de Medida</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS_OF_MEASURE.map(unit => (
                            <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl><Input placeholder="Ej: Huevos" {...field} /></FormControl>
                       <FormDescription>Agrupa tus productos por categoría.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={product?.supplierId}>
                        <FormControl>
                          <SelectTrigger disabled={isLoadingSuppliers}>
                            <SelectValue placeholder="Selecciona un proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Ninguno</SelectItem>
                          {suppliers?.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id!}>{supplier.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       <FormDescription>Asocia este producto a un proveedor.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Color Representativo</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} value={field.value || '#ffffff'} />
                          <Input type="text" placeholder="#C8E64E" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>Asigna un color al producto.</FormDescription>
                      <FormMessage />
                  </FormItem>
                  )}
                />
              </CardContent>
            </Card>
             <Card>
              <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Producto Activo</FormLabel>
                        <FormDescription>
                          Si está inactivo, no aparecerá en las ventas.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit">{product ? 'Guardar Cambios' : 'Crear Producto'}</Button>
        </div>
      </form>
    </Form>
  );
}

    