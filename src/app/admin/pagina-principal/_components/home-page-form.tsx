"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { HomePageContent } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

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


const homePageContentSchema = z.object({
    heroTitle: z.string().min(1, "O título do herói é obrigatório."),
    heroDescription: z.string().min(1, "A descrição do herói é obrigatória."),
    heroImageUrl: z.string().url("A URL da imagem do herói é inválida."),
    heroImageDescription: z.string().min(1, "A descrição da imagem do herói é obrigatória."),
    adventuresTitle: z.string().min(1, "O título das aventuras é obrigatório."),
    adventuresDescription: z.string().min(1, "A descrição das aventuras é obrigatória."),
    // Redes Sociais
    facebookUrl: z.string().optional(),
    facebookEnabled: z.boolean().optional(),
    instagramUrl: z.string().optional(),
    instagramEnabled: z.boolean().optional(),
    twitterUrl: z.string().optional(),
    twitterEnabled: z.boolean().optional(),
}).refine((data) => !data.facebookEnabled || (data.facebookUrl && data.facebookUrl.length > 0), {
    message: "URL do Facebook é obrigatório quando habilitado.",
    path: ["facebookUrl"],
}).refine((data) => !data.instagramEnabled || (data.instagramUrl && data.instagramUrl.length > 0), {
    message: "URL do Instagram é obrigatório quando habilitado.",
    path: ["instagramUrl"],
}).refine((data) => !data.twitterEnabled || (data.twitterUrl && data.twitterUrl.length > 0), {
    message: "URL do Twitter é obrigatório quando habilitado.",
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
  const { firestore } = useFirebase();

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
      const contentRef = doc(firestore, 'content', 'homepage');
      await setDoc(contentRef, values, { merge: true });
      toast({
        title: "Página Principal Atualizada",
        description: `O conteúdo foi salvo com sucesso.`,
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
        <h3 className="text-xl font-headline font-semibold">Seção Principal (Hero)</h3>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="heroTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título Principal</FormLabel>
                <FormControl>
                  <Input placeholder="Título que aparece sobre a imagem principal" {...field} />
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
                <FormLabel>Texto do Herói</FormLabel>
                <FormControl>
                  <Textarea placeholder="Texto de apoio que aparece abaixo do título" {...field} />
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
                <FormLabel>URL da Imagem Principal</FormLabel>
                <FormControl>
                  <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                </FormControl>
                <FormDescription>Link para a imagem grande no topo da página.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heroImageDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição da Imagem Principal (Texto Alternativo)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descrição concisa da imagem para acessibilidade." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        
        <h3 className="text-xl font-headline font-semibold">Seção de Aventuras</h3>
        <div className="space-y-4">
             <FormField
                control={form.control}
                name="adventuresTitle"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Título da Seção de Aventuras</FormLabel>
                    <FormControl>
                    <Input placeholder="Título que aparece acima dos cartões de aventura" {...field} />
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
                    <FormLabel>Texto da Seção de Aventuras</FormLabel>
                    <FormControl>
                    <Textarea placeholder="Texto de apoio para a seção de aventuras" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Separator />

        <h3 className="text-xl font-headline font-semibold">Redes Sociais</h3>
        <p className="text-sm text-muted-foreground">Configure os links das redes sociais que aparecem no rodapé do site.</p>

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
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
