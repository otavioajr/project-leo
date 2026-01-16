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

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/#adventures", label: "Aventuras" },
  { href: "/about", label: "Sobre" },
  { href: "/contact", label: "Contato" },
];

export function Header() {
  const pathname = usePathname();

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
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Mountain className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg font-headline">Alpina Aventuras</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-4">
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
                  <span className="font-bold">Alpina Aventuras</span>
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
    </header>
  );
}
