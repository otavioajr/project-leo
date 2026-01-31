"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { PixConfig } from "@/lib/types";
import QRCode from "qrcode";
import Image from "next/image";

const pixConfigSchema = z.object({
  pixCopiaECola: z.string().min(1, "O texto PIX copia e cola é obrigatório."),
  pixEnabled: z.boolean(),
  instructions: z.string().optional(),
});

type PixConfigFormValues = z.infer<typeof pixConfigSchema>;

type PixConfigFormProps = {
  config: PixConfig;
};

export function PixConfigForm({ config }: PixConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<PixConfigFormValues>({
    resolver: zodResolver(pixConfigSchema),
    defaultValues: {
      pixCopiaECola: config.pixCopiaECola || "",
      pixEnabled: config.pixEnabled || false,
      instructions: config.instructions || "",
    },
  });

  const pixCopiaECola = form.watch("pixCopiaECola");

  useEffect(() => {
    if (pixCopiaECola && pixCopiaECola.trim()) {
      QRCode.toDataURL(pixCopiaECola, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodePreview(url))
        .catch(() => setQrCodePreview(null));
    } else {
      setQrCodePreview(null);
    }
  }, [pixCopiaECola]);

  async function onSubmit(values: PixConfigFormValues) {
    setIsSubmitting(true);

    try {
      const configRef = doc(firestore, "content", "pix");
      await setDoc(configRef, values, { merge: true });

      toast({
        title: "Configuração Salva",
        description: "As configurações do PIX foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Failed to save PIX config:", error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
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
                <FormLabel className="text-base">Ativar Pagamento PIX</FormLabel>
                <FormDescription>
                  Quando ativado, os clientes serão direcionados para a página de pagamento após a inscrição.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pixCopiaECola"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIX Copia e Cola</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cole aqui o código PIX copia e cola..."
                  className="min-h-[120px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Cole o texto do PIX copia e cola que você gerou no seu banco. Este texto será convertido em um QR Code para seus clientes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {qrCodePreview && (
          <div className="rounded-lg border p-4">
            <p className="mb-4 text-sm font-medium">Preview do QR Code:</p>
            <div className="flex justify-center">
              <Image
                src={qrCodePreview}
                alt="QR Code PIX Preview"
                width={256}
                height={256}
                className="rounded-lg"
              />
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="instructions"
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
                Texto adicional que será exibido na página de pagamento para orientar o cliente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </form>
    </Form>
  );
}
