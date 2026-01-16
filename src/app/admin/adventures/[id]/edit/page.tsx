import { getAdventureById } from "@/lib/data";
import { notFound } from "next/navigation";
import { AdventureForm } from "../../_components/adventure-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function EditAdventurePage({
  params,
}: {
  params: { id: string };
}) {
  const adventure = await getAdventureById(params.id);

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
