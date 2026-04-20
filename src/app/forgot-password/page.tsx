'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Correo requerido',
        description: 'Por favor, ingresa tu dirección de correo electrónico.',
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Correo de recuperación enviado',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      });
      router.push('/login');
    } catch (error) {
      console.error(error);
      let description = 'Ocurrió un error inesperado.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/user-not-found') {
          description = 'No se encontró ninguna cuenta con este correo electrónico.';
        }
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <Logo className="h-16 w-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>Ingresa tu correo para recibir un enlace de recuperación.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="underline">
              Iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
