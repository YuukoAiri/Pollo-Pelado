'use client';

import { useRef } from 'react';
import { ReceiptTemplate } from '@/components/receipt-template';
import { Sale, Customer } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { useSettings } from '@/firebase/settings-provider';

// Mock Sale data
const mockSale: Sale = {
  id: 'sale_preview',
  saleNumber: 'V-20240101-PREVIEW',
  saleDate: new Date().toISOString(),
  customerId: 'cust_preview',
  totalAmount: 125.50,
  paymentMethod: 'Efectivo',
  status: 'Completed',
  currencyCode: 'PEN',
  items: [
    {
      productId: 'prod_1',
      productName: 'Producto de Ejemplo A',
      quantity: 2,
      unitPrice: 50,
      unitCost: 30,
      subtotal: 100,
      unitOfMeasure: 'unit',
    },
    {
      productId: 'prod_2',
      productName: 'Producto de Ejemplo B (kg)',
      quantity: 1.5,
      unitPrice: 17,
      unitCost: 10,
      subtotal: 25.50,
      unitOfMeasure: 'kg',
    },
  ],
};

// Mock Customer data
const mockCustomer: Customer = {
  id: 'cust_preview',
  firstName: 'Juan',
  lastName: 'Pérez',
  identificationNumber: '12345678',
  address: 'Av. Siempre Viva 123',
};

export function ReceiptPreview() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Previa del Comprobante</CardTitle>
        <CardDescription>
          Así se verán tus comprobantes con la configuración actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="w-full max-w-sm scale-90">
             <ReceiptTemplate
                ref={receiptRef}
                sale={mockSale}
                customer={mockCustomer}
                customerBalance={50.00}
              />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="mt-4">
              <Eye className="mr-2 h-4 w-4" />
              Ver en Tamaño Real
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Vista Previa del Comprobante</DialogTitle>
            </DialogHeader>
            <ReceiptTemplate
              ref={receiptRef}
              sale={mockSale}
              customer={mockCustomer}
              customerBalance={50.00}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
