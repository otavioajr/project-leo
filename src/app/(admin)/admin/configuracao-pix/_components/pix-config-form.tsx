"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useSupabase } from "@/supabase/hooks";
import type { PixConfig, PixGroupSize } from "@/lib/types";
import QRCode from "qrcode";
import Image from "next/image";

const pixConfigSchema = z
  .object({
    pixCopiaECola: z.object({
      1: z.string().default(""),
      2: z.string().default(""),
      3: z.string().default(""),
      4: z.string().default(""),
    }),
    pixEnabled: z.boolean(),
    instructions: z.string().optional(),
  })
  .refine(
    (v) =>
      !v.pixEnabled ||
      Object.values(v.pixCopiaECola).some((s) => s.trim().length > 0),
    {
      message: "Cadastre ao menos uma chave PIX para ativar o pagamento.",
      path: ["pixEnabled"],
    }
  );

type PixConfigFormValues = z.infer<typeof pixConfigSchema>;

type PixConfigFormProps = {
  config: PixConfig;
};

function groupSizeLabel(size: PixGroupSize) {
  return size === 1 ? "PIX para 1 pessoa" : `PIX para ${size} pessoas`;
}

function PixSlotCard({
  size,
  value,
  onChange,
}: {
  size: PixGroupSize;
  value: string;
  onChange: (next: string) => void;
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value && value.trim()) {
      QRCode.toDataURL(value, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url) => setQrPreview(url))
        .catch(() => setQrPreview(null));
    } else {
      setQrPreview(null);
    }
  }, [value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{groupSizeLabel(size)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Textarea
          placeholder={`Cole aqui o codigo PIX copia e cola para ${size} ${
            size === 1 ? "pessoa" : "pessoas"
          }...`}
          className="min-h-[120px] font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center justify-center">
          {qrPreview ? (
            <Image
              src={qrPreview}
              alt={`QR Code PIX ${size}`}
              width={160}
              height={160}
              className="rounded-lg border"
            />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Sem chave cadastrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PixConfigForm({ config }: PixConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = useSupabase();

  const form = useForm<PixConfigFormValues>({
    resolver: zodResolver(pixConfigSchema),
    defaultValues: {
      pixCopiaECola: {
        1: config.pixCopiaECola?.[1] ?? "",
        2: config.pixCopiaECola?.[2] ?? "",
        3: config.pixCopiaECola?.[3] ?? "",
        4: config.pixCopiaECola?.[4] ?? "",
      },
      pixEnabled: config.pixEnabled || false,
      instructions: config.instructions || "",
    },
  });

  async function onSubmit(values: PixConfigFormValues) {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("content")
        .upsert({ id: "pix", data: values });
      if (error) throw error;

      toast({
        title: "Configuracao Salva",
        description:
          "As configuracoes do PIX foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Failed to save PIX config:", error);
      toast({
        title: "Erro ao Salvar",
        description:
          "Nao foi possivel salvar as configuracoes. Tente novamente.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="pixEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Ativar Pagamento PIX
                </FormLabel>
                <FormDescription>
                  Quando ativado, os clientes serao direcionados para a pagina
                  de pagamento apos a inscricao.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {([1, 2, 3, 4] as const).map((size) => (
            <Controller
              key={size}
              control={form.control}
              name={`pixCopiaECola.${size}` as keyof PixConfigFormValues & string}
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

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instrucoes Adicionais (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Apos realizar o pagamento, aguarde a confirmacao por e-mail..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Texto adicional que sera exibido na pagina de pagamento para
                orientar o cliente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Configuracoes"}
        </Button>
      </form>
    </Form>
  );
}
