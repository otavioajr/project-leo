"use client";

import { useParams, notFound } from "next/navigation";
import { ContentPageForm } from "../_components/content-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";
import { LoaderCircle } from "lucide-react";


export default function EditContentPage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();

  // Busca todos os documentos e filtra no cliente (evita problemas com índice/where)
  const pagesQuery = useMemoFirebase(
    () => collection(firestore, 'pages'),
    [firestore]
  );
  const { data: allPages, isLoading } = useCollection<ContentPage>(pagesQuery);
  
  // Filtra pelo slug no cliente
  const page = allPages?.find(p => p.slug === slug);

  // Mostrar loading enquanto carrega OU enquanto allPages ainda é null
  if (isLoading || allPages === null) {
    return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
    )
  }

  // Só mostrar 404 depois de confirmar que allPages é um array e não encontrou a página
  if (Array.isArray(allPages) && !page) {
    return notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Página: {page?.title}</CardTitle>
        <CardDescription>
          Atualize o título e o conteúdo da página.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentPageForm page={page} />
      </CardContent>
    </Card>
  );
}

