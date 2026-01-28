import { getHomePageContent } from "@/lib/data";
import { HomePageForm } from "./_components/home-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function PaginaPrincipalPage() {
  const content = await getHomePageContent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Página Principal</CardTitle>
        <CardDescription>
          Atualize os textos e a imagem principal do seu site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HomePageForm content={content} />
      </CardContent>
    </Card>
  );
}
