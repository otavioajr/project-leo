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
import { Edit, PlusCircle, LoaderCircle, Eye, EyeOff } from "lucide-react";
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Páginas de Conteúdo</CardTitle>
            <CardDescription>
              Crie e edite as páginas do seu site.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/admin/paginas/new">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Criar Página
              </span>
            </Link>
          </Button>
        </div>
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
              <TableHead>Visível no Menu</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages && pages.length > 0 ? (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                        {page.showInHeader ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        <span>{page.showInHeader ? 'Sim' : 'Não'}</span>
                    </div>
                  </TableCell>
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
                    <TableCell colSpan={3} className="text-center">
                    Nenhuma página encontrada. Comece criando uma!
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
