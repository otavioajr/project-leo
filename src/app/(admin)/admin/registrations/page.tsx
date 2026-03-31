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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Mail, Phone, Users, LoaderCircle, CheckCircle2, Clock, AlertCircle, DollarSign, MoreHorizontal, Trash2 } from "lucide-react";
import { useCollection } from "@/supabase/use-collection";
import { useSupabase } from "@/supabase/hooks";
import type { Adventure, Registration, PaymentStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { exportRegistrationsToXlsx } from "./_lib/export-registrations";

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

const confirmableStatuses = new Set<PaymentStatus>(["pending", "awaiting_confirmation"]);

export default function RegistrationsPage() {
  const { data: registrations, isLoading } = useCollection<Registration>('registrations');
  const { data: adventures, isLoading: isLoadingAdventures } = useCollection<Adventure>("adventures");
  const supabase = useSupabase();
  const { toast } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>("");

  const sortedAdventures = adventures?.slice().sort((firstAdventure, secondAdventure) =>
    firstAdventure.title.localeCompare(secondAdventure.title, "pt-BR")
  );

  const filteredRegistrations = selectedAdventureId === ""
    ? registrations
    : registrations?.filter((registration) => registration.adventure_id === selectedAdventureId);

  const hasActiveFilter = selectedAdventureId !== "";
  const selectedAdventure = sortedAdventures?.find((adventure) => adventure.id === selectedAdventureId);
  const hasFilteredRegistrations = (filteredRegistrations?.length ?? 0) > 0;
  const hasAnyRegistrations = (registrations?.length ?? 0) > 0;

  const handleConfirmPayment = async (registration: Registration) => {
    if (!registration.payment_status || !confirmableStatuses.has(registration.payment_status)) {
      toast({
        title: "Status inválido",
        description: "Somente inscrições pendentes podem ter o pagamento confirmado.",
        variant: "destructive",
      });
      return;
    }

    setConfirmingId(registration.id);
    try {
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

  const handleExportXlsx = async () => {
    if (!selectedAdventureId) {
      toast({
        title: "Selecione uma aventura",
        description: "Escolha uma aventura para exportar as inscricoes em XLSX.",
        variant: "destructive",
      });
      return;
    }

    if (!hasFilteredRegistrations || !filteredRegistrations) {
      toast({
        title: "Nada para exportar",
        description: "Nao ha inscricoes no filtro atual para exportacao.",
        variant: "destructive",
      });
      return;
    }

    const adventureTitle = selectedAdventure?.title?.trim();

    if (!adventureTitle) {
      toast({
        title: "Aventura nao encontrada",
        description: "Nao foi possivel identificar o titulo da aventura selecionada.",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportRegistrationsToXlsx({
        adventureTitle,
        registrations: filteredRegistrations,
      });

      toast({
        title: "Exportacao concluida",
        description: `Arquivo XLSX gerado para ${adventureTitle}.`,
      });
    } catch (error) {
      console.error("Failed to export registrations:", error);
      toast({
        title: "Erro ao exportar",
        description: "Nao foi possivel gerar o arquivo XLSX das inscricoes.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || isLoadingAdventures) {
      return (
        <div className="flex items-center justify-center p-8">
            <LoaderCircle className="animate-spin" />
        </div>
      )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Todas as Inscricoes</CardTitle>
            <CardDescription>
              Veja todas as inscricoes de usuarios para suas aventuras.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Select
              value={selectedAdventureId || undefined}
              onValueChange={setSelectedAdventureId}
            >
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="Filtrar por aventura" />
              </SelectTrigger>
              <SelectContent>
                {sortedAdventures?.map((adventure) => (
                  <SelectItem key={adventure.id} value={adventure.id}>
                    {adventure.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleExportXlsx}
              disabled={!hasActiveFilter || !hasFilteredRegistrations}
            >
              Exportar XLSX
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAdventureId("")}
              disabled={!hasActiveFilter}
            >
              Limpar
            </Button>
          </div>
        </div>
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
            {filteredRegistrations && filteredRegistrations.length > 0 ? (
              filteredRegistrations.map((reg) => (
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
                        {reg.payment_status && confirmableStatuses.has(reg.payment_status) && (
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
                  {!hasAnyRegistrations
                    ? "Nenhuma inscricao foi recebida ainda."
                    : !hasActiveFilter
                      ? "Selecione uma aventura para visualizar e exportar as inscricoes em XLSX."
                      : "Nenhuma inscricao encontrada para a aventura selecionada. Ajuste o filtro ou escolha outra aventura para exportar."}
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
