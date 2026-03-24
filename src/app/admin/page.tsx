"use client";

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
import { Compass, ListChecks, User, Mail, Phone, Users, LoaderCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollection } from "@/supabase/use-collection";
import type { Adventure, Registration } from "@/lib/types";

function formatFieldName(name: string) {
    const words = name.replace(/_/g, ' ').split(' ');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function AdminDashboard() {
  const { data: adventures, isLoading: isLoadingAdventures } = useCollection<Adventure>('adventures');
  const { data: registrations, isLoading: isLoadingRegistrations } = useCollection<Registration>('registrations');

  const totalParticipants = registrations?.reduce((acc, reg) => acc + reg.group_size, 0) || 0;
  const recentRegistrations = registrations?.slice(0, 5) || [];

  if (isLoadingAdventures || isLoadingRegistrations) {
    return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
    )
  }

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
            <div className="text-2xl font-bold">{adventures?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              aventuras ativas e rascunhos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Participantes
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              em {registrations?.length || 0} inscricoes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscricoes Recentes</CardTitle>
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
                    <TableCell className="font-medium">{reg.adventure_title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium flex items-center gap-2"><User className="h-3 w-3" />{reg.name}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-3 w-3" />{reg.group_size} {reg.group_size > 1 ? 'pessoas' : 'pessoa'}</span>
                        {reg.participants && reg.participants.length > 0 && (
                            <div className="pl-5 py-1 text-sm text-muted-foreground border-l border-dashed ml-1.5 space-y-2">
                                {reg.participants.map((p, i) => (
                                     <div key={i} className="space-y-1">
                                        <div className="flex items-center gap-2 text-foreground"><User className="h-3 w-3 opacity-70" />{p.name}</div>
                                         <div className="pl-5 text-xs">
                                            {Object.entries(p).map(([key, value]) => {
                                                if (key === 'name' || !value) return null;
                                                return <div key={key}><span className="font-medium">{formatFieldName(key)}:</span> {value}</div>
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" />{reg.email}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" />{reg.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reg.registration_date), "PPP p", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Nenhuma inscricao ainda.
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
