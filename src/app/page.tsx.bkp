"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdventureCard } from '@/components/adventure-card';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useCollection } from '@/supabase/use-collection';
import { useDoc } from '@/supabase/use-doc';
import type { Adventure, HomePageContent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function HeroLoading() {
  return (
    <section className="relative h-[60vh] md:h-[80vh] w-full bg-muted">
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-6">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-12 w-48 mt-8" />
      </div>
    </section>
  );
}

function AdventuresLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}


export default function Home() {
  const { data: adventures, isLoading: isLoadingAdventures } = useCollection<Adventure>('adventures');
  const { data: homePageDoc, isLoading: isLoadingContent } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homePageContent = homePageDoc?.data ?? null;

  if (isLoadingContent || !homePageContent) {
    return (
      <div className="flex flex-col">
        <HeroLoading />
         <section id="adventures" className="py-12 md:py-24 bg-background">
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
      <section className="relative h-[60vh] md:h-[80vh] w-full">
        {homePageContent.heroImageUrl && (
          <Image
            src={homePageContent.heroImageUrl}
            alt={homePageContent.heroImageDescription}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight">
            {homePageContent.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/80">
            {homePageContent.heroDescription}
          </p>
          <Button asChild size="lg" className="mt-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold">
            <Link href="#adventures">
              Explorar Atividades <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <section id="adventures" className="py-12 md:py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">
              {homePageContent.adventuresTitle}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {homePageContent.adventuresDescription}
            </p>
          </div>
           {isLoadingAdventures && <AdventuresLoading />}
           {adventures && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
