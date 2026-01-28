"use client";

import { notFound, useParams } from "next/navigation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
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
  const firestore = useFirestore();

  // Busca todos os documentos e filtra no cliente (evita problemas com query where)
  const pagesQuery = useMemoFirebase(
    () => collection(firestore, 'pages'),
    [firestore]
  );
  const { data: allPages, isLoading } = useCollection<ContentPage>(pagesQuery);
  
  // Filtra pelo slug no cliente
  const page = allPages?.find(p => p.slug === slug);

  // Mostrar loading enquanto carrega OU enquanto allPages ainda é null
  if (isLoading || allPages === null) {
    return <PageLoading />;
  }

  // Só mostrar 404 depois de confirmar que allPages é um array e não encontrou a página
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

