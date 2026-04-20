'use client';
import { PageHeader } from '@/components/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function EditPurchasePage() {
  // This page can be expanded later to allow editing purchases.
  // For now, it shows that the feature is under construction or removed.
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Editar Compra" description="Módulo en construcción." />
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <CardTitle>Módulo en Construcción</CardTitle>
        <CardDescription className="mt-2">
          La funcionalidad para editar compras estará disponible próximamente.
        </CardDescription>
      </Card>
    </div>
  );
}
