import { ContentPageForm } from "../_components/content-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function NewContentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Página</CardTitle>
        <CardDescription>
          Preencha o formulário para adicionar uma nova página ao seu site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentPageForm />
      </CardContent>
    </Card>
  );
}
