"use client";

import { Controller, type Control } from "react-hook-form";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PixSlotCard } from "./pix-slot-card";
import type { AdventureFormValues } from "./adventure-form";

type PixConfigDialogProps = {
  control: Control<AdventureFormValues>;
  pixEnabled: boolean;
  registeredKeysCount: number;
  hasLotes?: boolean;
  totalLotesCount?: number;
};

export function PixConfigDialog({
  control,
  pixEnabled,
  registeredKeysCount,
  hasLotes = false,
  totalLotesCount = 0,
}: PixConfigDialogProps) {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="text-base font-headline font-semibold">Pagamento PIX</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {hasLotes ? (
            <>
              <Badge variant={pixEnabled ? "default" : "outline"}>
                {pixEnabled ? "Ativo" : "Inativo"}
              </Badge>
              <span>PIX por lote ({registeredKeysCount} de {totalLotesCount} cadastrados)</span>
            </>
          ) : pixEnabled ? (
            <>
              <Badge variant="default">Ativo</Badge>
              <span>{registeredKeysCount} de 4 chaves cadastradas</span>
            </>
          ) : (
            <>
              <Badge variant="outline">Inativo</Badge>
              <span>
                {registeredKeysCount > 0
                  ? `${registeredKeysCount} de 4 chaves cadastradas`
                  : "Nenhuma chave cadastrada"}
              </span>
            </>
          )}
        </div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Configurar PIX">
            <QrCode className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Pagamento PIX</DialogTitle>
            <DialogDescription>
              {hasLotes
                ? "Ative o PIX e defina instruções globais. Os códigos copia-e-cola ficam em cada lote na tabela acima."
                : "Configure os códigos PIX copia-e-cola desta aventura, um para cada tamanho de grupo. O valor cobrado vem do próprio código copia-e-cola."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <FormField
              control={control}
              name="pixEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativar Pagamento PIX</FormLabel>
                    <FormDescription>
                      Quando ativado, os clientes serão direcionados para a página de pagamento
                      após a inscrição.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!hasLotes ? (
              <div className="space-y-4">
                {([1, 2, 3, 4] as const).map((size) => (
                  <Controller
                    key={size}
                    control={control}
                    name={`pixCopiaECola.${size}` as unknown as keyof AdventureFormValues}
                    render={({ field }) => (
                      <PixSlotCard
                        size={size}
                        value={(field.value as string) ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ))}
              </div>
            ) : null}

            <FormField
              control={control}
              name="pixInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções Adicionais (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Após realizar o pagamento, aguarde a confirmação por e-mail..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Texto exibido na página de pagamento para orientar o cliente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
