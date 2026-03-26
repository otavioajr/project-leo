"use client";

import { notFound, useParams } from "next/navigation";
import { useCollection } from "@/supabase/use-collection";
import type { ContentPage } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function PageLoading() {
    return (
        <div className="container mx-auto px-6 py-12">
            <div className="max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-8 w-1/4 mt-4" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
}

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: allPages, isLoading } = useCollection<ContentPage>('pages');

  // Filtra pelo slug no cliente
  const page = allPages?.find(p => p.slug === slug);

  // Mostrar loading enquanto carrega OU enquanto allPages ainda e null
  if (isLoading || allPages === null) {
    return <PageLoading />;
  }

  // So mostrar 404 depois de confirmar que allPages e um array e nao encontrou a pagina
  if (Array.isArray(allPages) && !page) {
    notFound();
  }

  return (
    <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-8">{page?.title}</h1>
            <div className="content-page" dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
        </div>
    </div>
  );
}
