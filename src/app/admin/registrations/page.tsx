import { getRegistrations } from "@/lib/data";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Mail, Phone, Users } from "lucide-react";

export default async function RegistrationsPage() {
  const registrations = await getRegistrations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todas as Inscrições</CardTitle>
        <CardDescription>
          Veja todas as inscrições de usuários para suas aventuras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aventura</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Data da Inscrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length > 0 ? (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.adventureTitle}</TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Grupo de {reg.groupSize}
                    </div>
                    <ul className="pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2 font-semibold text-foreground"><User className="h-4 w-4" />{reg.name} <span className="text-xs text-muted-foreground">(Contato)</span></li>
                        {reg.participants?.map((p, i) => (
                            <li key={i} className="flex items-center gap-2"><User className="h-4 w-4 opacity-70" />{p.name}</li>
                        ))}
                    </ul>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <a href={`mailto:${reg.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                        <Mail className="h-4 w-4" />{reg.email}
                      </a>
                      <a href={`tel:${reg.phone}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                        <Phone className="h-4 w-4" />{reg.phone}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(reg.registrationDate), "PPP p", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma inscrição encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
