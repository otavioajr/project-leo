"use client";

import { useParams, notFound } from "next/navigation";
import { ContentPageForm } from "../_components/content-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";
import { LoaderCircle } from "lucide-react";


export default function EditContentPage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();

  const pageRef = useMemoFirebase(() => doc(firestore, 'pages', slug), [firestore, slug]);
  const { data: page, isLoading } = useDoc<ContentPage>(pageRef);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
    )
  }

  if (!page) {
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
