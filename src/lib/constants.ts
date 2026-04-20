'use client';

import {
  LayoutGrid,
  Receipt,
  Boxes,
  Users,
  Settings,
  BarChart,
  Truck,
  ShoppingCart,
} from 'lucide-react';

export const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sales', label: 'Ventas', icon: Receipt },
  { href: '/products', label: 'Inventario', icon: Boxes },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/suppliers', label: 'Proveedores', icon: Truck },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart },
  { href: '/analytics', label: 'Estadísticas', icon: BarChart },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export const CURRENCIES = [
    { value: 'PEN', label: 'S/ - Sol Peruano' },
    { value: 'USD', label: '$ - Dólar Americano' },
    { value: 'BRL', label: 'R$ - Real Brasileño' },
    { value: 'MXN', label: '$ - Peso Mexicano' },
    { value: 'COP', label: '$ - Peso Colombiano' },
    { value: 'ARS', label: '$ - Peso Argentino' },
    { value: 'CLP', label: '$ - Peso Chileno' },
];

export const UNITS_OF_MEASURE = [
    { value: 'unit', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'g', label: 'Gramo (g)' },
    { value: 'l', label: 'Litro (l)' },
    { value: 'ml', label: 'Mililitro (ml)' },
];

export const PAYMENT_METHODS = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Crédito', label: 'Crédito / Fiado' },
    { value: 'Yape', label: 'Yape' },
    { value: 'Plin', label: 'Plin' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Otro', label: 'Otro' },
];

export const POULTRY_PURCHASE_PRODUCTS = [
  { value: 'Pollo Beneficiado', label: 'Pollo Beneficiado' },
  { value: 'Pollo Especial', label: 'Pollo Especial' },
  { value: 'Menudencia', label: 'Menudencia' },
  { value: 'Huevo', label: 'Huevo' },
];
