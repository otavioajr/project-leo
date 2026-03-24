"use client";

import { useParams, notFound } from "next/navigation";
import { ContentPageForm } from "../_components/content-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useCollection } from "@/supabase/use-collection";
import type { ContentPage } from "@/lib/types";
import { LoaderCircle } from "lucide-react";


export default function EditContentPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: allPages, isLoading } = useCollection<ContentPage>('pages');

  // Filtra pelo slug no cliente
  const page = allPages?.find(p => p.slug === slug);

  // Mostrar loading enquanto carrega OU enquanto allPages ainda e null
  if (isLoading || allPages === null) {
    return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
    )
  }

  // So mostrar 404 depois de confirmar que allPages e um array e nao encontrou a pagina
  if (Array.isArray(allPages) && !page) {
    return notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Pagina: {page?.title}</CardTitle>
        <CardDescription>
          Atualize o titulo e o conteudo da pagina.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentPageForm page={page} />
      </CardContent>
    </Card>
  );
}
