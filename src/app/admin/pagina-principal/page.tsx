"use client";

import { HomePageForm } from "./_components/home-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { HomePageContent } from "@/lib/types";
import { LoaderCircle } from "lucide-react";

export default function PaginaPrincipalPage() {
  const firestore = useFirestore();
  const contentRef = useMemoFirebase(() => doc(firestore, 'content', 'homepage'), [firestore]);
  const { data: content, isLoading } = useDoc<HomePageContent>(contentRef);

  const defaultContent: HomePageContent = {
    heroTitle: '',
    heroDescription: '',
    heroImageUrl: '',
    heroImageDescription: '',
    adventuresTitle: '',
    adventuresDescription: '',
  };
  
  const currentContent = content || defaultContent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Página Principal</CardTitle>
        <CardDescription>
          Atualize os textos e a imagem principal do seu site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="animate-spin" />
            </div>
        ) : (
            <HomePageForm content={currentContent} />
        )}
      </CardContent>
    </Card>
  );
}
