"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { HomePageContent } from "@/lib/types";
import { useSupabase } from "@/supabase/hooks";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/image-upload";


const homePageContentSchema = z.object({
    heroTitle: z.string().min(1, "O titulo do heroi e obrigatorio."),
    heroDescription: z.string().min(1, "A descricao do heroi e obrigatoria."),
    heroImageUrl: z.string().min(1, "A imagem do heroi e obrigatoria.").url("A URL da imagem do heroi e invalida."),
    heroImageDescription: z.string().min(1, "A descricao da imagem do heroi e obrigatoria."),
    adventuresTitle: z.string().min(1, "O titulo das aventuras e obrigatorio."),
    adventuresDescription: z.string().min(1, "A descricao das aventuras e obrigatoria."),
    // Redes Sociais
    facebookUrl: z.string().optional(),
    facebookEnabled: z.boolean().optional(),
    instagramUrl: z.string().optional(),
    instagramEnabled: z.boolean().optional(),
    twitterUrl: z.string().optional(),
    twitterEnabled: z.boolean().optional(),
}).refine((data) => !data.facebookEnabled || (data.facebookUrl && data.facebookUrl.length > 0), {
    message: "URL do Facebook e obrigatorio quando habilitado.",
    path: ["facebookUrl"],
}).refine((data) => !data.instagramEnabled || (data.instagramUrl && data.instagramUrl.length > 0), {
    message: "URL do Instagram e obrigatorio quando habilitado.",
    path: ["instagramUrl"],
}).refine((data) => !data.twitterEnabled || (data.twitterUrl && data.twitterUrl.length > 0), {
    message: "URL do Twitter e obrigatorio quando habilitado.",
    path: ["twitterUrl"],
});

type HomePageFormValues = z.infer<typeof homePageContentSchema>;

type HomePageFormProps = {
  content: HomePageContent;
};

export function HomePageForm({ content }: HomePageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useSupabase();

  const form = useForm<HomePageFormValues>({
    resolver: zodResolver(homePageContentSchema),
    defaultValues: {
      ...content,
      facebookUrl: content.facebookUrl ?? "",
      facebookEnabled: content.facebookEnabled ?? false,
      instagramUrl: content.instagramUrl ?? "",
      instagramEnabled: content.instagramEnabled ?? false,
      twitterUrl: content.twitterUrl ?? "",
      twitterEnabled: content.twitterEnabled ?? false,
    },
  });

  async function onSubmit(values: HomePageFormValues) {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('content').upsert({ id: 'homepage', data: values });
      if (error) throw error;
      toast({
        title: "Pagina Principal Atualizada",
        description: `O conteudo foi salvo com sucesso.`,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Falha ao Salvar",
        description: "Algo deu errado.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h3 className="text-xl font-headline font-semibold">Secao Principal (Hero)</h3>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="heroTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titulo Principal</FormLabel>
                <FormControl>
                  <Input placeholder="Titulo que aparece sobre a imagem principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heroDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto do Heroi</FormLabel>
                <FormControl>
                  <Textarea placeholder="Texto de apoio que aparece abaixo do titulo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heroImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagem Principal</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    folder="homepage"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Imagem grande no topo da pagina. Faca upload ou cole uma URL. Tamanho maximo: 5MB.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heroImageDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descricao da Imagem Principal (Texto Alternativo)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descricao concisa da imagem para acessibilidade." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <h3 className="text-xl font-headline font-semibold">Secao de Aventuras</h3>
        <div className="space-y-4">
             <FormField
                control={form.control}
                name="adventuresTitle"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Titulo da Secao de Aventuras</FormLabel>
                    <FormControl>
                    <Input placeholder="Titulo que aparece acima dos cartoes de aventura" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="adventuresDescription"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Texto da Secao de Aventuras</FormLabel>
                    <FormControl>
                    <Textarea placeholder="Texto de apoio para a secao de aventuras" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Separator />

        <h3 className="text-xl font-headline font-semibold">Redes Sociais</h3>
        <p className="text-sm text-muted-foreground">Configure os links das redes sociais que aparecem no rodape do site.</p>

        <div className="space-y-6">
          {/* Facebook */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="facebookEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-base font-medium">Facebook</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="facebookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Facebook</FormLabel>
                  <FormControl>
                    <Input placeholder="https://facebook.com/suapagina" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Instagram */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="instagramEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-base font-medium">Instagram</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagramUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/seuperfil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Twitter */}
          <div className="space-y-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="twitterEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-base font-medium">Twitter</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="twitterUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Twitter</FormLabel>
                  <FormControl>
                    <Input placeholder="https://twitter.com/seuperfil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
