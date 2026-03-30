"use client";

import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Mail, Phone, Users, LoaderCircle, CheckCircle2, Clock, AlertCircle, DollarSign, MoreHorizontal, Trash2 } from "lucide-react";
import { useCollection } from "@/supabase/use-collection";
import { useSupabase } from "@/supabase/hooks";
import type { Adventure, Registration, PaymentStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

function formatFieldName(name: string) {
    const words = name.replace(/_/g, ' ').split(' ');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pendente", variant: "outline", icon: AlertCircle },
  awaiting_confirmation: { label: "Aguardando Confirmacao", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmado", variant: "default", icon: CheckCircle2 },
};

const defaultStatusConfig = {
  label: "Desconhecido",
  variant: "outline" as const,
  icon: AlertCircle,
};

export default function RegistrationsPage() {
  const { data: registrations, isLoading } = useCollection<Registration>('registrations');
  const supabase = useSupabase();
  const { toast } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);

  const handleConfirmPayment = async (registration: Registration) => {
    setConfirmingId(registration.id);
    try {
      if (registration.adventure_id) {
        const { data: adventure, error: adventureError } = await supabase
          .from('adventures')
          .select('max_participants')
          .eq('id', registration.adventure_id)
          .single();

        if (adventureError) throw adventureError;

        const typedAdventure = adventure as Pick<Adventure, "max_participants">;

        if (typedAdventure.max_participants !== null) {
          const { data: confirmedRegistrations, error: confirmedError } = await supabase
            .from('registrations')
            .select('group_size')
            .eq('adventure_id', registration.adventure_id)
            .eq('payment_status', 'confirmed')
            .neq('id', registration.id);

          if (confirmedError) throw confirmedError;

          const confirmedParticipants = (confirmedRegistrations ?? []).reduce(
            (sum, item) => sum + item.group_size,
            0
          );

          if (confirmedParticipants + registration.group_size > typedAdventure.max_participants) {
            toast({
              title: "Limite de vagas excedido",
              description: "Nao ha vagas suficientes para confirmar esta inscricao.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      const { error } = await supabase
        .from('registrations')
        .update({ payment_status: 'confirmed' })
        .eq('id', registration.id);
      if (error) throw error;
      toast({
        title: "Pagamento Confirmado",
        description: "O status do pagamento foi atualizado para confirmado.",
      });
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel confirmar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeleteRegistration = async () => {
    if (!registrationToDelete) return;

    try {
      const { error } = await supabase.from('registrations').delete().eq('id', registrationToDelete);
      if (error) throw error;
      toast({
        title: "Inscricao Excluida",
        description: "A inscricao foi removida com sucesso.",
      });
    } catch (error) {
      console.error("Failed to delete registration:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel excluir a inscricao.",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setRegistrationToDelete(null);
  };

  const openDeleteDialog = (registrationId: string) => {
    setRegistrationToDelete(registrationId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todas as Inscricoes</CardTitle>
        <CardDescription>
          Veja todas as inscricoes de usuarios para suas aventuras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aventura</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Data da Inscricao</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations && registrations.length > 0 ? (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.adventure_title}</TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Grupo de {reg.group_size}
                    </div>
                    <ul className="pl-6 mt-1 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2 font-semibold text-foreground"><User className="h-4 w-4" />{reg.name} <span className="text-xs text-muted-foreground">(Contato)</span></li>
                        {reg.participants?.map((p, i) => (
                           <li key={i} className="border-l pl-3 ml-2 py-1">
                                <div className="flex items-center gap-2 font-semibold text-foreground"><User className="h-4 w-4 opacity-70" />{p.name}</div>
                                <div className="pl-6 mt-1 space-y-1">
                                    {Object.entries(p).map(([key, value]) => {
                                        if (key === 'name' || !value) return null;
                                        return (
                                            <div key={key} className="text-xs">
                                                <span className="font-medium">{formatFieldName(key)}:</span> {value}
                                            </div>
                                        )
                                    })}
                                </div>
                            </li>
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
                    {reg.payment_status ? (
                      <div className="space-y-1">
                        {(() => {
                          const config = paymentStatusConfig[reg.payment_status] || defaultStatusConfig;
                          const Icon = config.icon;
                          return (
                            <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          );
                        })()}
                        {reg.total_amount !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(reg.total_amount)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(reg.registration_date), "PPP p", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {reg.payment_status !== "confirmed" && (
                          <DropdownMenuItem
                            onClick={() => handleConfirmPayment(reg)}
                            disabled={confirmingId === reg.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Confirmar Pagamento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(reg.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Inscricao
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhuma inscricao encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Inscricao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta inscricao? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRegistration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
