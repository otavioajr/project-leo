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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Mail, Phone, Users, LoaderCircle, CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp, doc, updateDoc } from "firebase/firestore";
import type { Registration, PaymentStatus } from "@/lib/types";
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

type FirestoreRegistration = Omit<Registration, 'registrationDate'> & {
  registrationDate: Timestamp;
};

export default function RegistrationsPage() {
  const firestore = useFirestore();
  const registrationsQuery = useMemoFirebase(() => collection(firestore, 'registrations'), [firestore]);
  const { data: registrations, isLoading } = useCollection<FirestoreRegistration>(registrationsQuery);
  const { toast } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirmPayment = async (registrationId: string) => {
    setConfirmingId(registrationId);
    try {
      const regRef = doc(firestore, "registrations", registrationId);
      await updateDoc(regRef, {
        paymentStatus: "confirmed",
      });
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
    }
    setConfirmingId(null);
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
              <TableHead>Pagamento</TableHead>
              <TableHead>Data da Inscricao</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations && registrations.length > 0 ? (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.adventureTitle}</TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Grupo de {reg.groupSize}
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
                    {reg.paymentStatus ? (
                      <div className="space-y-1">
                        {(() => {
                          const config = paymentStatusConfig[reg.paymentStatus];
                          const Icon = config.icon;
                          return (
                            <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          );
                        })()}
                        {reg.totalAmount !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(reg.totalAmount)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(reg.registrationDate.toDate(), "PPP p", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {reg.paymentStatus === "awaiting_confirmation" && (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmPayment(reg.id)}
                        disabled={confirmingId === reg.id}
                      >
                        {confirmingId === reg.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirmar
                          </>
                        )}
                      </Button>
                    )}
                    {reg.paymentStatus === "confirmed" && (
                      <span className="text-green-600 text-sm flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Pago
                      </span>
                    )}
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
    </Card>
  );
}
