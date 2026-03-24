"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContentPage } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
import { Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const contentPageSchema = z.object({
    slug: z.string().min(1, "O slug e obrigatorio.").regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifens."),
    title: z.string().min(1, "O titulo e obrigatorio."),
    content: z.string().min(1, "O conteudo nao pode estar vazio."),
    showInHeader: z.boolean(),
    navOrder: z.coerce.number().optional(),
});


type ContentPageFormValues = z.infer<typeof contentPageSchema>;

type ContentPageFormProps = {
  page?: ContentPage;
};

function createSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}


export function ContentPageForm({ page }: ContentPageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = useSupabase();
  const isEditing = !!page;

  const form = useForm<ContentPageFormValues>({
    resolver: zodResolver(contentPageSchema),
    defaultValues: page ? {
      slug: page.slug,
      title: page.title,
      content: page.content,
      showInHeader: page.show_in_header,
      navOrder: page.nav_order ?? 0,
    } : {
        slug: "",
        title: "",
        content: "",
        showInHeader: false,
        navOrder: 0,
    },
  });

  const title = form.watch('title');
  useEffect(() => {
    if (!isEditing && title) {
        form.setValue('slug', createSlug(title), { shouldValidate: true });
    }
  }, [title, isEditing, form]);


  async function onSubmit(values: ContentPageFormValues) {
    setIsSubmitting(true);

    try {
      const pageData = {
        slug: values.slug,
        title: values.title,
        content: values.content,
        show_in_header: values.showInHeader,
        nav_order: values.navOrder ?? 0,
      };

      if (isEditing) {
        const { error } = await supabase.from('pages').update(pageData).eq('id', page.id);
        if (error) throw error;
        toast({
          title: "Pagina Atualizada",
          description: `A pagina "${values.title}" foi salva com sucesso.`,
        });
      } else {
        const { error } = await supabase.from('pages').insert(pageData);
        if (error) throw error;
        toast({
          title: "Pagina Criada",
          description: `A pagina "${values.title}" foi criada com sucesso.`,
        });
        router.push('/admin/paginas');
      }
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

  async function handleDelete() {
    if (!page) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('pages').delete().eq('id', page.id);
      if (error) throw error;
      toast({
        title: "Pagina Excluida",
        description: `"${page.title}" foi removida.`,
      });
      router.push("/admin/paginas");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast({
        title: "Falha na Exclusao",
        description: "Algo deu errado.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titulo da Pagina</FormLabel>
              <FormControl>
                <Input placeholder="Titulo que aparece na pagina" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug da URL</FormLabel>
              <FormControl>
                <Input placeholder="sera-gerado-automaticamente" {...field} disabled={isEditing} />
              </FormControl>
              <FormDescription>Parte da URL da pagina. E gerado automaticamente a partir do titulo ao criar uma nova pagina.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteudo da Pagina</FormLabel>
              <FormControl>
                <Textarea placeholder="Conteudo da pagina. Voce pode usar tags HTML basicas para formatacao." rows={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="showInHeader"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Mostrar no Cabecalho</FormLabel>
                    <FormDescription>
                    Se ativado, um link para esta pagina aparecera no menu principal.
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
          name="navOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de Navegacao</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>Define a ordem dos links no menu (numeros menores aparecem primeiro).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between items-center mt-8">
            <div>
                {isEditing && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isDeleting}>
                            <Trash className="mr-2 h-4 w-4" />
                            {isDeleting ? "Excluindo..." : "Excluir Pagina"}
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta acao nao pode ser desfeita. Isso excluira permanentemente a pagina.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Continuar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : (isEditing ? "Salvar Alteracoes" : "Criar Pagina")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
