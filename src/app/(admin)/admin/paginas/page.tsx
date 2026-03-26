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
import { useCollection } from "@/supabase/use-collection";
import type { ContentPage } from "@/lib/types";

export default function PaginasPage() {
  const { data: pages, isLoading } = useCollection<ContentPage>('pages');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Paginas de Conteudo</CardTitle>
            <CardDescription>
              Crie e edite as paginas do seu site.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/admin/paginas/new">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Criar Pagina
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
              <TableHead>Titulo da Pagina</TableHead>
              <TableHead>Visivel no Menu</TableHead>
              <TableHead>
                <span className="sr-only">Acoes</span>
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
                        {page.show_in_header ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        <span>{page.show_in_header ? 'Sim' : 'Nao'}</span>
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
                    Nenhuma pagina encontrada. Comece criando uma!
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
