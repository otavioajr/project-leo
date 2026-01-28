import { getAdventureBySlug } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Timer, BarChart, MapPin, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationForm } from './_components/registration-form';

type AdventurePageProps = {
  params: {
    slug: string;
  };
};

export default async function AdventurePage({ params }: AdventurePageProps) {
  const adventure = await getAdventureBySlug(params.slug);

  if (!adventure) {
    notFound();
  }

  const difficultyVariant = {
    'Fácil': 'default',
    'Moderado': 'secondary',
    'Desafiador': 'destructive',
  } as const;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3">
          <div className="relative h-[400px] md:h-[500px] w-full mb-8 rounded-lg overflow-hidden shadow-lg">
            {adventure.imageUrl && (
              <Image
                src={adventure.imageUrl}
                alt={adventure.imageDescription}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">{adventure.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{adventure.description}</p>
          <div className="prose max-w-none text-foreground">
            <p>{adventure.longDescription}</p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Info />Detalhes Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">R${adventure.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">por pessoa</span>
                  </div>
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-primary" />
                  <span>{adventure.duration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{adventure.location}</span>
                </div>
                 <div className="flex items-center gap-3">
                  <BarChart className="h-5 w-5 text-primary" />
                  <Badge variant={difficultyVariant[adventure.difficulty]} className="text-sm">
                    {adventure.difficulty}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {adventure.registrationsEnabled ? (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Reserve Seu Lugar</CardTitle>
                </CardHeader>
                <CardContent>
                  <RegistrationForm 
                    adventureId={adventure.id} 
                    adventureTitle={adventure.title} 
                    customFields={adventure.customFields} 
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="font-headline text-muted-foreground">Inscrições Encerradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">As inscrições para esta aventura estão atualmente encerradas. Por favor, volte mais tarde ou explore nossas outras aventuras!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
