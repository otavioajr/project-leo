import { getAdventures, getRegistrations } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Compass, ListChecks, User, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function AdminDashboard() {
  const adventures = await getAdventures();
  const registrations = await getRegistrations();

  const recentRegistrations = registrations.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Aventuras
            </CardTitle>
            <Compass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adventures.length}</div>
            <p className="text-xs text-muted-foreground">
              aventuras ativas e rascunhos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Inscrições
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations.length}</div>
            <p className="text-xs text-muted-foreground">
              em todas as aventuras
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscrições Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aventura</TableHead>
                <TableHead>Inscrito</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRegistrations.length > 0 ? (
                recentRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.adventureTitle}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2"><User className="h-3 w-3" />{reg.name}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" />{reg.email}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" />{reg.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reg.registrationDate), "PPP p", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Nenhuma inscrição ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
