import { AdventureForm } from "../_components/adventure-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function NewAdventurePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Aventura</CardTitle>
        <CardDescription>
          Preencha o formulário abaixo para adicionar uma nova aventura ao seu site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdventureForm />
      </CardContent>
    </Card>
  );
}
