"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AdventureForm } from "../../_components/adventure-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Adventure } from "@/lib/types";
import { LoaderCircle, AlertCircle } from "lucide-react";

export default function EditAdventurePage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  
  const adventureRef = useMemoFirebase(() => doc(firestore, 'adventures', id), [firestore, id]);
  const { data: adventure, isLoading } = useDoc<Adventure>(adventureRef);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (!adventure) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Aventura não encontrada</CardTitle>
          </div>
          <CardDescription>
            A aventura que você está tentando editar não existe ou foi removida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/adventures">Voltar para Aventuras</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Aventura</CardTitle>
        <CardDescription>
          Atualize os detalhes para "{adventure.title}".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdventureForm adventure={adventure} />
      </CardContent>
    </Card>
  );
}
