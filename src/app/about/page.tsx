import { getContentPageBySlug } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPageBySlug('about');
  if (!page) {
    return {};
  }
  return {
    title: `${page.title} | Chaves Adventure`,
  };
}

export default async function AboutPage() {
  const page = await getContentPageBySlug('about');

  if (!page) {
    notFound();
  }

  return (
    <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-8">{page.title}</h1>
            <div className="content-page" dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
    </div>
  );
}
