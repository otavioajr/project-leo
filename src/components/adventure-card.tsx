import Image from 'next/image';
import Link from 'next/link';
import type { Adventure } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, Timer } from 'lucide-react';

type AdventureCardProps = {
  adventure: Adventure;
};

export function AdventureCard({ adventure }: AdventureCardProps) {
  const adventureSlug = adventure.slug || adventure.id;

  return (
    <Card className="group flex flex-col overflow-hidden rounded-xl shadow-md transition-shadow duration-500 ease-out hover:shadow-xl">
      {/* Image with overlay */}
      <Link href={`/adventures/${adventureSlug}`} className="block relative h-56 overflow-hidden">
        {adventure.image_url ? (
          <Image
            src={adventure.image_url}
            alt={adventure.image_description}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Difficulty badge */}
        <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full">
          {adventure.difficulty}
        </span>

        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-headline text-xl font-bold text-white">
            {adventure.title}
          </h3>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="flex-1 p-5">
        <p className="text-muted-foreground text-sm line-clamp-2">
          {adventure.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-bold text-primary">R${adventure.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4 text-primary" />
            <span>{adventure.duration}</span>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-5 pt-0">
        <Button asChild className="w-full transition-colors duration-200 ease-out group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
          <Link href={`/adventures/${adventureSlug}`}>
            Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
