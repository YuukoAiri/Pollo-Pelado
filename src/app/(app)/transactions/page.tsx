
import { PageHeader } from '@/components/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Transacciones" description="Revisa todas tus transacciones." />
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <Scale className="h-16 w-16 text-muted-foreground mb-4" />
        <CardTitle>Función en Desarrollo</CardTitle>
        <CardDescription className="mt-2">
          La gestión de transacciones estará disponible próximamente.
        </CardDescription>
      </Card>
    </div>
  );
}
