"use client";

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Timer, BarChart, MapPin, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationForm } from './_components/registration-form';
import { useSupabase } from '@/supabase/hooks';
import type { Adventure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useHeaderTransparent } from '@/components/layout/header-context';

function useFetchAdventure(slug: string) {
  const supabase = useSupabase();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setAdventure(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from('adventures')
      .select()
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) setError(new Error(error.message));
        else setAdventure(data as Adventure);
        setIsLoading(false);
      });
  }, [supabase, slug]);

  return { adventure, isLoading, error };
}

export default function AdventurePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { adventure, isLoading, error } = useFetchAdventure(slug);
  const { setTransparent } = useHeaderTransparent();

  useEffect(() => {
    setTransparent(true);
    return () => setTransparent(false);
  }, [setTransparent]);

  if (isLoading) {
    return (
      <div>
        <div className="relative w-full h-[50vh] bg-muted -mt-16" />
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <Skeleton className="h-10 w-3/4 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar aventura: {error.message}</p>
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
    <div>
      {/* Full-bleed hero image */}
      <div className="relative w-full h-[50vh] -mt-16">
        {adventure.image_url && (
          <Image
            src={adventure.image_url}
            alt={adventure.image_description}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white">
              {adventure.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <p className="text-lg leading-relaxed text-muted-foreground mb-6">{adventure.description}</p>
            <div className="prose max-w-none text-foreground text-lg leading-relaxed">
              <p>{adventure.long_description}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Info className="h-5 w-5" /> Detalhes Principais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-primary">R${adventure.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground ml-1">por pessoa</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <span>{adventure.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <span>{adventure.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <BarChart className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant={difficultyVariant[adventure.difficulty]}>
                      {adventure.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {adventure.registrations_enabled ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Reserve Seu Lugar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RegistrationForm
                      adventureId={adventure.id}
                      adventureTitle={adventure.title}
                      adventureSlug={adventure.slug}
                      adventurePrice={adventure.price}
                      customFields={adventure.custom_fields}
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
    </div>
  );
}
