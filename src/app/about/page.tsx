"use client";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";
import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Metadata is now static or can be fetched in a parent Server Component if needed
// export async function generateMetadata(): Promise<Metadata> {
//   // This needs to be adapted if metadata depends on fetched content
//   return {
//     title: `Sobre | Chaves Adventure`,
//   };
// }

export default function AboutPage() {
  const firestore = useFirestore();
  const pageRef = useMemoFirebase(() => doc(firestore, 'pages', 'about'), [firestore]);
  const { data: page, isLoading } = useDoc<ContentPage>(pageRef);

  if (isLoading) {
    return (
        <div className="container mx-auto px-6 py-12">
            <div className="max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-8 w-1/4 mt-4" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
  }

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
