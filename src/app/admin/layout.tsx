"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar";
import { Mountain, LayoutDashboard, Compass, ListChecks, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
