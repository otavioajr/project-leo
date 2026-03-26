"use client";

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdventureCard } from '@/components/adventure-card';
import { ArrowRight, Mountain } from 'lucide-react';
import { useCollection } from '@/supabase/use-collection';
import { useDoc } from '@/supabase/use-doc';
import type { Adventure, HomePageContent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeaderTransparent } from '@/components/layout/header-context';

function HeroLoading() {
  return (
    <section className="relative min-h-[85vh] w-full bg-muted">
      <div className="relative z-10 flex h-full min-h-[85vh] flex-col items-center justify-center text-center p-6">
        <Skeleton className="h-16 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-14 w-48 mt-8 rounded-full" />
      </div>
    </section>
  );
}

function AdventuresLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Mountain className="h-20 w-20 text-muted-foreground/30 mb-4" />
      <p className="text-lg text-muted-foreground">Nenhuma aventura disponível no momento</p>
    </div>
  );
}

export default function Home() {
  const { data: adventures, isLoading: isLoadingAdventures } = useCollection<Adventure>('adventures');
  const { data: homePageDoc, isLoading: isLoadingContent } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homePageContent = homePageDoc?.data ?? null;
  const { setTransparent } = useHeaderTransparent();

  useEffect(() => {
    setTransparent(true);
    return () => setTransparent(false);
  }, [setTransparent]);

  if (isLoadingContent || !homePageContent) {
    return (
      <div className="flex flex-col">
        <HeroLoading />
        <section id="adventures" className="py-16 md:py-28 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <Skeleton className="h-10 w-1/2 mx-auto" />
              <Skeleton className="h-5 w-3/4 mx-auto mt-2" />
            </div>
            <AdventuresLoading />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[85vh] w-full -mt-16">
        {homePageContent.heroImageUrl && (
          <Image
            src={homePageContent.heroImageUrl}
            alt={homePageContent.heroImageDescription}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
        {/* Top gradient for header readability */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent z-[1]" />
        <div className="relative z-10 flex h-full min-h-[85vh] flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight">
            {homePageContent.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg md:text-xl text-white/90">
            {homePageContent.heroDescription}
          </p>
          <Button asChild size="lg" className="group mt-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full px-8">
            <Link href="#adventures">
              Explorar Atividades <ArrowRight className="ml-2 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Decorative divider */}
      <div className="h-px max-w-md mx-auto bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Adventures */}
      <section id="adventures" className="py-16 md:py-28 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-12 h-1 bg-secondary rounded-full mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">
              {homePageContent.adventuresTitle}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {homePageContent.adventuresDescription}
            </p>
          </div>
          {isLoadingAdventures && <AdventuresLoading />}
          {adventures && adventures.length === 0 && <EmptyState />}
          {adventures && adventures.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adventures.map((adventure) => (
                <AdventureCard key={adventure.id} adventure={adventure} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
