"use client";

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Timer, BarChart, MapPin, Info, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationForm } from './_components/registration-form';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Adventure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

// Custom hook para buscar a aventura
function useFetchAdventure(slug: string, firestore: any) {
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAdventure() {
      if (!slug) {
        setAdventure(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const q = query(collection(firestore, 'adventures'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setAdventure({ ...(doc.data() as Adventure), id: doc.id });
        } else {
          setAdventure(null);
        }
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    }

    fetchAdventure();
  }, [firestore, slug]);

  return { adventure, isLoading, error };
}

export default function AdventurePage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();

  const { adventure, isLoading, error } = useFetchAdventure(slug, firestore);

  if (isLoading) {
    return (
        <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                    <Skeleton className="h-[400px] md:h-[500px] w-full mb-8 rounded-lg" />
                    <Skeleton className="h-10 w-3/4 mb-4" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-96 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-red-500">Erro ao carregar aventura: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!adventure) {
    return notFound();
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
                  <Badge variant={difficultyVariant[adventure.difficulty]}>
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
