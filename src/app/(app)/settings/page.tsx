'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useSettings } from '@/firebase/settings-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ReceiptPreview } from './receipt-preview';
import { Textarea } from '@/components/ui/textarea';

const settingsSchema = z.object({
  businessName: z.string().min(2, "El nombre del negocio es requerido.").optional().or(z.literal('')),
  logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  businessAddress: z.string().optional(),
  businessTaxId: z.string().optional(),
  debtReminderMessage: z.string().optional(),
  saleReceiptMessage: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { settings, isLoading } = useSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: { // Use `values` to react to settings changes
      businessName: settings?.businessName || '',
      logoUrl: settings?.logoUrl || '',
      businessAddress: settings?.businessAddress || '',
      businessTaxId: settings?.businessTaxId || '',
      debtReminderMessage: settings?.debtReminderMessage || '¡Hola [Nombre del cliente]! 👋 Esperamos que estés bien. Te recordamos que tu cuenta hasta la fecha [ingresar fecha] es por el [ingresar monto + símbolo de la moneda]. Puedes realizar tu pago mediante : [ YAPE - PLIN ]. ¡Muchas gracias!',
      saleReceiptMessage: settings?.saleReceiptMessage || '¡Hola [Nombre del cliente]! 👋 Aquí tienes tu comprobante de venta. Número: [Número de venta], Total: [Monto total]. ¡Gracias por tu compra!',
    },
  });

  const handleSaveSettings = async (data: SettingsFormData) => {
    if (!user) return;
    try {
      const docRef = doc(firestore, 'users', user.uid, 'settings', 'business_profile');
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await setDocumentNonBlocking(docRef, updatedData, { merge: true });
      
      toast({
        title: "Configuración Guardada",
        description: "Tus cambios han sido guardados con éxito.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al guardar la configuración.",
      });
    }
  };
  
  const settingsDocRef = useMemo(() => {
    if (!user) return null;
    const q = doc(firestore, 'users', user.uid, 'settings', 'business_profile');
    (q as any).__memo = true;
    return q;
  }, [user, firestore]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSaveSettings)} className="flex flex-col gap-8">
        <PageHeader title="Configuración" description="Ajusta las preferencias de tu negocio. Estos datos aparecerán en los comprobantes." />
        {isLoading ? (
            <Skeleton className="w-full h-96" />
        ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información del Negocio</CardTitle>
                    <CardDescription>
                        Datos principales de tu empresa o granja.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre del Negocio</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Granja El Porvenir" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL del Logo</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                                </FormControl>
                                <FormDescription>Pega aquí un enlace a tu logo.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="businessAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dirección</FormLabel>
                                <FormControl>
                                    <Input placeholder="Av. Principal 123, Lima, Perú" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="businessTaxId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>RUC / DNI</FormLabel>
                                <FormControl>
                                    <Input placeholder="20123456789" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plantillas de Mensajes</CardTitle>
                <CardDescription>Personaliza los mensajes que envías a tus clientes.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="debtReminderMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje de Recordatorio de Deuda</FormLabel>
                      <FormControl>
                        <Textarea rows={6} {...field} />
                      </FormControl>
                      <FormDescription>
                        Placeholders disponibles: [Nombre del cliente], [ingresar fecha], [ingresar monto + símbolo de la moneda]
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="saleReceiptMessage"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>Mensaje para Compartir Comprobante</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormDescription>
                        Placeholders: [Nombre del cliente], [Número de venta], [Monto total]
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </div>
            <ReceiptPreview />
        </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
