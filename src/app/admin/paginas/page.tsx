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
import { Edit } from "lucide-react";

const staticPages = [
    { slug: 'about', title: 'Sobre Nós' },
    { slug: 'contact', title: 'Contato' },
    { slug: 'privacy', title: 'Política de Privacidade' },
];

export default function PaginasPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Páginas de Conteúdo</CardTitle>
        <CardDescription>
          Edite o conteúdo das páginas estáticas do seu site, como 'Sobre' e 'Contato'.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            {staticPages.map((page) => (
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
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
