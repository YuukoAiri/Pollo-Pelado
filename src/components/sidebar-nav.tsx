'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NAV_LINKS } from '@/lib/constants';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, User, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useSettings } from '@/firebase/settings-provider';


export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { settings } = useSettings();

  const handleSignOut = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  return (
    <Sidebar className={className}>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Logo logoUrl={settings?.logoUrl} className="h-10 w-10 text-primary" />
          <div className="flex flex-col">
            <span className="font-headline text-lg font-bold tracking-tight">
              {settings?.businessName ? (
                <span className="text-primary">{settings.businessName.split(' ')[0]}</span>
              ) : (
                <span className="text-primary">EVA</span>
              )}
              {settings?.businessName ? ` ${settings.businessName.split(' ').slice(1).join(' ')}` : ' Poultry'}
            </span>
            <span className="text-xs text-muted-foreground">Sistema v2.5</span>
          </div>
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem className="px-2 py-1 uppercase text-xs text-muted-foreground tracking-wider font-semibold">
            Principal
          </SidebarMenuItem>
          {NAV_LINKS.slice(0, 6).map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))}
                tooltip={link.label}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
           <SidebarMenuItem className="px-2 py-1 uppercase text-xs text-muted-foreground tracking-wider font-semibold mt-2">
            Sistema
          </SidebarMenuItem>
          {NAV_LINKS.slice(6).map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))}
                tooltip={link.label}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Separator className="my-2" />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage src="https://picsum.photos/seed/admin/100/100" alt="Admin" data-ai-hint="person" />
                            <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-bold">RQ</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                            <span className="text-sm font-bold">Reynaldo Quispe</span>
                            <span className="text-xs text-muted-foreground">Administrador</span>
                        </div>
                    </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <User className="mr-2 h-4 w-4"/>
                        Mi Perfil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4"/>
                        Ajustes
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4"/>
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
