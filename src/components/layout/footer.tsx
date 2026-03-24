"use client";

import Link from "next/link";
import { Mountain } from "lucide-react";
import { useCollection } from "@/supabase/use-collection";
import { useDoc } from "@/supabase/use-doc";
import type { ContentPage, HomePageContent } from "@/lib/types";

export function Footer() {
  const { data: allPages } = useCollection<ContentPage>('pages');

  // Filtra e ordena no cliente para evitar problemas de índice composto
  const dynamicPages = allPages
    ?.filter(p => p.show_in_header === true)
    ?.sort((a, b) => (a.nav_order ?? 0) - (b.nav_order ?? 0));

  // Buscar configurações de redes sociais
  const { data: homeContentDoc } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homeContent = homeContentDoc?.data ?? null;

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="flex flex-col items-center justify-center"><span className="font-brand text-primary" style={{ height: '15px' }}>chaves</span><span className="font-adventure text-primary"> adventure</span></span>
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
            {homeContent?.facebookEnabled && homeContent?.facebookUrl && (
              <a href={homeContent.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                Facebook
              </a>
            )}
            {homeContent?.instagramEnabled && homeContent?.instagramUrl && (
              <a href={homeContent.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                Instagram
              </a>
            )}
            {homeContent?.twitterEnabled && homeContent?.twitterUrl && (
              <a href={homeContent.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                Twitter
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
