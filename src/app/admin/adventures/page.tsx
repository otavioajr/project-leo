import Link from "next/link";
import { getAdventures } from "@/lib/data";
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
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function AdventuresPage() {
  const adventures = await getAdventures();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Aventuras</CardTitle>
            <CardDescription>
              Gerencie suas listas de aventuras e veja seus detalhes.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/admin/adventures/new">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Criar Aventura
              </span>
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adventures.length > 0 ? (
              adventures.map((adventure) => (
                <TableRow key={adventure.id}>
                  <TableCell className="font-medium">{adventure.title}</TableCell>
                  <TableCell>
                    <Badge variant={adventure.registrationsEnabled ? "default" : "outline"}>
                      {adventure.registrationsEnabled ? "Abertas" : "Fechadas"}
                    </Badge>
                  </TableCell>
                  <TableCell>R${adventure.price.toFixed(2)}</TableCell>
                  <TableCell>{adventure.location}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                           <Link href={`/admin/adventures/${adventure.id}/edit`}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/adventures/${adventure.slug}`} target="_blank">Ver</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhuma aventura encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
