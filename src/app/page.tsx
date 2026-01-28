import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdventureCard } from '@/components/adventure-card';
import { getAdventures, getHomePageContent } from '@/lib/data';
import { ArrowRight } from 'lucide-react';

export default async function Home() {
  const adventures = await getAdventures();
  const homePageContent = await getHomePageContent();

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adventures.map((adventure) => (
              <AdventureCard key={adventure.id} adventure={adventure} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
