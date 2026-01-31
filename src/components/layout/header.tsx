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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { BrandLogo } from "./brand-logo";


const staticLinks = [
  { href: "/", label: "Início" },
  { href: "/#adventures", label: "Aventuras" },
];

export function Header() {
  const pathname = usePathname();
  const firestore = useFirestore();

  const pagesQuery = useMemoFirebase(() => collection(firestore, 'pages'), [firestore]);
  const { data: allPages, isLoading } = useCollection<ContentPage>(pagesQuery);
  
  // Filtra e ordena no cliente para evitar problemas de índice composto
  const dynamicPages = allPages
    ?.filter(p => p.showInHeader === true)
    ?.sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0));

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
          "transition-colors hover:text-primary",
          isActive ? "text-primary font-semibold" : "text-muted-foreground"
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-6">
        <div className="flex-1">
            <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <BrandLogo />
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
            <Button variant="ghost" size="icon" asChild>
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
