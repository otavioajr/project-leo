import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdventureCard } from '@/components/adventure-card';
import { getAdventures } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight } from 'lucide-react';

export default async function Home() {
  const adventures = await getAdventures();
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-1');

  return (
    <div className="flex flex-col">
      <section className="relative h-[60vh] md:h-[80vh] w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight">
            Your Next Adventure Awaits
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/80">
            Explore breathtaking landscapes and challenge yourself with our curated outdoor experiences.
          </p>
          <Button asChild size="lg" className="mt-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold">
            <Link href="#adventures">
              Explore Activities <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <section id="adventures" className="py-12 md:py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">
              Discover Our Adventures
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              From serene hikes to thrilling climbs, find the perfect experience for you.
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
