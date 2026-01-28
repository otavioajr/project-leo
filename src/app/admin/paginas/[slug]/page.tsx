import { getContentPageBySlug } from "@/lib/data";
import { notFound } from "next/navigation";
import { ContentPageForm } from "../_components/content-page-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function EditContentPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getContentPageBySlug(params.slug);

  if (!page) {
    return notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Página: {page.title}</CardTitle>
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
