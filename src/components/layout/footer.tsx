"use client";

import Link from "next/link";
import { Mountain, Facebook, Instagram, Twitter } from "lucide-react";
import { useCollection } from "@/supabase/use-collection";
import { useDoc } from "@/supabase/use-doc";
import type { ContentPage, HomePageContent } from "@/lib/types";
import { BrandLogo } from "./brand-logo";

export function Footer() {
  const { data: allPages } = useCollection<ContentPage>('pages');

  const dynamicPages = allPages
    ?.filter(p => p.show_in_header === true)
    ?.sort((a, b) => (a.nav_order ?? 0) - (b.nav_order ?? 0));

  const { data: homeContentDoc } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homeContent = homeContentDoc?.data ?? null;

  return (
    <footer className="relative bg-footer-bg text-white">
      {/* Gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-primary" />

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <Mountain className="h-6 w-6 text-white" />
              <BrandLogo variant="light" />
            </Link>
            <p className="text-white/50 text-sm max-w-xs">
              Sua próxima aventura começa aqui. Descubra e reserve atividades ao ar livre.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-headline font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">
              Navegação
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/#adventures" className="text-white/60 hover:text-white transition-colors duration-200">
                Aventuras
              </Link>
              {dynamicPages?.map(page => (
                <Link
                  key={page.id}
                  href={`/pages/${page.slug}`}
                  className="text-white/60 hover:text-white transition-colors duration-200"
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-headline font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">
              Redes Sociais
            </h3>
            <div className="flex items-center gap-4">
              {homeContent?.facebookEnabled && homeContent?.facebookUrl && (
                <a href={homeContent.facebookUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {homeContent?.instagramEnabled && homeContent?.instagramUrl && (
                <a href={homeContent.instagramUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {homeContent?.twitterEnabled && homeContent?.twitterUrl && (
                <a href={homeContent.twitterUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} Chaves Adventure. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
