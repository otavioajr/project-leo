"use client";

import Link from "next/link";
import { Mountain } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";

export function Footer() {
  const firestore = useFirestore();

  const pagesQuery = useMemoFirebase(() => {
    return query(
        collection(firestore, 'pages'), 
        where('showInHeader', '==', true),
        orderBy('navOrder', 'asc')
    );
  }, [firestore]);

  const { data: dynamicPages } = useCollection<ContentPage>(pagesQuery);

  const socialLinks = [
    { name: "Facebook", href: "#" },
    { name: "Instagram", href: "#" },
    { name: "Twitter", href: "#" },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">Chaves Adventure</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/#adventures" className="hover:text-primary">Aventuras</Link>
            {dynamicPages?.map(page => (
              <Link key={page.id} href={`/pages/${page.slug}`} className="hover:text-primary">{page.title}</Link>
            ))}
          </nav>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Chaves Adventure. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-muted-foreground hover:text-primary">
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
