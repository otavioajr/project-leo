"use client";

import { notFound, useParams } from "next/navigation";
import { AdventureForm } from "../../_components/adventure-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Adventure } from "@/lib/types";
import { LoaderCircle } from "lucide-react";

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
    return notFound();
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
