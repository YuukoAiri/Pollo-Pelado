'use client';

import { Timestamp } from 'firebase/firestore';

export type AppSettings = {
  id?: string;
  businessName?: string;
  businessAddress?: string;
  businessTaxId?: string;
  logoUrl?: string;
  defaultCurrencyCode?: string;
  currencySymbol?: string;
  debtReminderMessage?: string;
  saleReceiptMessage?: string;
  purchaseReceiptMessage?: string;
  updatedAt?: Timestamp;
};

export type Product = {
  id?: string;
  name: string;
  description?: string;
  price: number;
  cost?: number; // Cost of the product from a supplier
  stock?: number;
  minStock?: number;
  trackStock?: boolean;
  unitOfMeasure: string;
  imageUrl?: string;
  color?: string;
  barcode?: string;
  isActive: boolean;
  isDeleted?: boolean; // Soft delete flag
  categoryId: string;
  supplierId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ProductCategory = {
  id?: string;
  name: string;
  description?: string;
};

export type Customer = {
  id?: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  identificationNumber?: string;
  notes?: string;
  allowCredit?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Sale = {
  id?: string;
  saleNumber: string;
  saleDate: string; // Should be ISO string
  customerId: string;
  totalAmount: number;
  paymentMethod: string;
  discountAmount?: number;
  taxAmount?: number;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Partially Paid';
  currencyCode: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  items: SaleItem[];
};

export type SaleItem = {
  id?: string;
  productId: string;
  productName: string; // Denormalized
  quantity: number;
  unitPrice: number;
  unitCost: number; // Denormalized product cost at time of sale
  subtotal: number;
  unitOfMeasure: string;
};

export type Payment = {
  id?: string;
  saleId: string;
  paymentDate: string; // Should be ISO string
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CustomerPayment = {
  id?: string;
  customerId: string;
  paymentDate: string; // ISO string
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CustomerTransaction = {
  id: string;
  date: string; // ISO string
  type: 'Venta' | 'Pago';
  description: string;
  debit: number;
  credit: number;
  original: Sale | CustomerPayment; // The original document
};

export type Supplier = {
  id?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  identificationNumber?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Purchase = {
  id?: string;
  purchaseNumber: string;
  purchaseDate: string; // ISO string
  supplierId: string;
  totalAmount: number;
  currencyCode: string;
  status: 'Received' | 'Pending' | 'Cancelled';
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  items: PurchaseItem[];
};

export type PurchaseItem = {
  id?: string;
  productId: string;
  productName: string; // Denormalized
  quantity: number;
  unitCost: number;
  subtotal: number;
  unitOfMeasure: string;
};

export type SupplierPayment = {
  id?: string;
  supplierId: string;
  paymentDate: string; // ISO string
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type SupplierTransaction = {
  id: string;
  date: string; // ISO string
  type: 'Compra' | 'Pago';
  description: string;
  debit: number; // Purchase amount
  credit: number; // Payment amount
  original: Purchase | SupplierPayment;
};


export type UserKey = {
  id?: string;
  key: string;
  email: string;
  createdAt?: Timestamp;
};

    