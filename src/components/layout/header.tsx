"use client";

import Link from "next/link";
import { Mountain, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCollection } from "@/supabase/use-collection";
import type { ContentPage } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { BrandLogo } from "./brand-logo";
import { useState, useEffect } from "react";
import { useHeaderTransparent } from "./header-context";


const staticLinks = [
  { href: "/", label: "Início" },
  { href: "/#adventures", label: "Aventuras" },
];

export function Header() {
  const pathname = usePathname();
  const { data: allPages, isLoading } = useCollection<ContentPage>('pages');

  const { transparent } = useHeaderTransparent();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  const isTransparent = transparent && !scrolled;

  // Filtra e ordena no cliente para evitar problemas de índice composto
  const dynamicPages = allPages
    ?.filter(p => p.show_in_header === true)
    ?.sort((a, b) => (a.nav_order ?? 0) - (b.nav_order ?? 0));

  const navLinks = [
    ...staticLinks,
    ...(dynamicPages?.map(p => ({ href: `/pages/${p.slug}`, label: p.title })) || [])
  ];

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "relative transition-colors duration-200 hover:text-primary",
          "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:bg-current after:transition-transform after:duration-200 after:ease-out",
          isActive ? "after:w-full after:scale-x-100" : "after:w-full after:scale-x-0 hover:after:scale-x-100",
          isActive
            ? isTransparent ? "text-white font-semibold" : "text-primary font-semibold"
            : isTransparent ? "text-white/80" : "text-muted-foreground"
        )}
      >
        {label}
      </Link>
    );
  };

  const MobileNavLink = ({
    href,
    label,
  }: {
    href: string;
    label: string;
  }) => (
    <SheetClose asChild>
      <Link
        href={href}
        className="block px-4 py-2 text-lg text-muted-foreground hover:text-primary hover:bg-accent rounded-md"
      >
        {label}
      </Link>
    </SheetClose>
  );

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-500 ease-out",
      isTransparent
        ? "bg-transparent border-b border-transparent"
        : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    )}>
      <div className="container mx-auto flex h-16 items-center px-6">
        <div className="flex-1">
            <Link href="/" className="flex items-center gap-2">
            <Mountain className={cn("h-6 w-6", isTransparent ? "text-white" : "text-primary")} />
            <BrandLogo variant={isTransparent ? "light" : "default"} />
            </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {isLoading ? (
             <div className="flex items-center gap-6">
                {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-4 w-20" />)}
             </div>
          ) : (
            navLinks.map((link) => (
                <NavLink key={link.href} {...link} />
            ))
          )}
        </nav>

        <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className={isTransparent ? "text-white hover:text-white/80 hover:bg-white/10" : ""}>
                <Link href="/admin">
                <UserCircle className="h-5 w-5" />
                <span className="sr-only">Painel Administrativo</span>
                </Link>
            </Button>
            <Sheet>
                <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Alternar menu de navegação</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="right">
                <div className="flex flex-col gap-4 py-8">
                    <Link href="/" className="mb-4 flex items-center gap-2 px-4">
                    <Mountain className="h-6 w-6 text-primary" />
                    <BrandLogo />
                    </Link>
                    <nav className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                        <MobileNavLink key={link.href} {...link} />
                    ))}
                    </nav>
                </div>
                </SheetContent>
            </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
}
