"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Mountain, LayoutDashboard, Compass, ListChecks, Home, FileText, LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useAuth, useUser } from "@/firebase";

const navItems = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/adventures", label: "Aventuras", icon: Compass },
  { href: "/admin/registrations", label: "Inscrições", icon: ListChecks },
  { href: "/admin/pagina-principal", label: "Página Principal", icon: Home },
  { href: "/admin/paginas", label: "Páginas", icon: FileText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const auth = useAuth();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };
  
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // A lógica de redirecionamento agora está no useEffect.
    // Retornamos null aqui para evitar renderizar o conteúdo administrativo.
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h1 className="text-2xl font-bold font-headline text-destructive">Acesso Negado</h1>
        <p className="max-w-md text-muted-foreground">Você está autenticado, mas não tem permissão de administrador para ver esta página. Peça para um administrador conceder a você acesso ou tente com outra conta.</p>
        <div className="flex gap-4">
             <Button onClick={() => router.push('/')}>Voltar para a Home</Button>
            <Button variant="outline" onClick={handleSignOut}>Sair e tentar novamente</Button>
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="icon" className="h-10 w-10">
              <Link href="/">
                <Mountain className="h-6 w-6 text-primary" />
              </Link>
            </Button>
            <h2 className="text-lg font-headline font-semibold">Painel de Administração</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (pathname === item.href || pathname.startsWith(item.href + '/'))}
                  tooltip={{ children: item.label, className: "bg-primary text-primary-foreground" }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleSignOut}>
                        <LogOut/>
                        <span>Sair</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold md:text-xl font-headline">
            {navItems.find(item => pathname.startsWith(item.href))?.label || "Painel"}
          </h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
