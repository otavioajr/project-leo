"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContentPage } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contentPageSchema = z.object({
    slug: z.string(),
    title: z.string().min(1, "O título é obrigatório."),
    content: z.string().min(1, "O conteúdo não pode estar vazio."),
});


type ContentPageFormValues = z.infer<typeof contentPageSchema>;

type ContentPageFormProps = {
  page: ContentPage;
};

export function ContentPageForm({ page }: ContentPageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore } = useFirebase();

  const form = useForm<ContentPageFormValues>({
    resolver: zodResolver(contentPageSchema),
    defaultValues: page,
  });

  async function onSubmit(values: ContentPageFormValues) {
    setIsSubmitting(true);
    
    try {
      const pageRef = doc(firestore, 'pages', values.slug);
      await setDoc(pageRef, values, { merge: true });
      toast({
        title: "Página Atualizada",
        description: `A página "${values.title}" foi salva com sucesso.`,
      });
      router.refresh();
    } catch (error) {
       console.error("Failed to save content page:", error);
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
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Página</FormLabel>
              <FormControl>
                <Input placeholder="Título que aparece na página" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo da Página</FormLabel>
              <FormControl>
                <Textarea placeholder="Conteúdo da página. Você pode usar tags HTML básicas para formatação." rows={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
