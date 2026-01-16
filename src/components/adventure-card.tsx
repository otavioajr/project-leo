import Image from 'next/image';
import Link from 'next/link';
import type { Adventure } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, DollarSign, Timer, BarChart } from 'lucide-react';

type AdventureCardProps = {
  adventure: Adventure;
};

export function AdventureCard({ adventure }: AdventureCardProps) {
  const image = PlaceHolderImages.find((img) => img.id === adventure.imageId);

  const difficultyVariant = {
    'Fácil': 'default',
    'Moderado': 'secondary',
    'Desafiador': 'destructive',
  } as const;

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-xl">
      <CardHeader className="p-0">
        <Link href={`/adventures/${adventure.slug}`} className="block">
          <div className="relative h-48 w-full">
            {image ? (
              <Image
                src={image.imageUrl}
                alt={image.description}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint={image.imageHint}
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-6">
        <CardTitle className="mb-2 font-headline text-xl">
          <Link href={`/adventures/${adventure.slug}`} className="hover:text-primary">
            {adventure.title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">
          {adventure.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span>{adventure.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4 text-primary" />
            <span>{adventure.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart className="h-4 w-4 text-primary" />
            <Badge variant={difficultyVariant[adventure.difficulty]}>
              {adventure.difficulty}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/adventures/${adventure.slug}`}>
            Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
