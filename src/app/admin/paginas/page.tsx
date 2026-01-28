"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, LoaderCircle } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { ContentPage } from "@/lib/types";

export default function PaginasPage() {
  const firestore = useFirestore();
  const pagesQuery = useMemoFirebase(() => collection(firestore, 'pages'), [firestore]);
  const { data: pages, isLoading } = useCollection<ContentPage>(pagesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Páginas de Conteúdo</CardTitle>
        <CardDescription>
          Edite o conteúdo das páginas estáticas do seu site, como 'Sobre' e 'Contato'.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="animate-spin" />
            </div>
        )}
        {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título da Página</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages && pages.length > 0 ? (
              pages.map((page) => (
                <TableRow key={page.slug}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/paginas/${page.slug}`}>
                        <Edit className="h-3.5 w-3.5 mr-2" />
                        Editar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  Nenhuma página encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
