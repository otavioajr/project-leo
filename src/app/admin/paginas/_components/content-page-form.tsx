"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContentPage } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { doc, setDoc, addDoc, deleteDoc, collection } from "firebase/firestore";

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
    slug: z.string().min(1, "O slug é obrigatório.").regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens."),
    title: z.string().min(1, "O título é obrigatório."),
    content: z.string().min(1, "O conteúdo não pode estar vazio."),
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
  const { firestore } = useFirebase();
  const isEditing = !!page;

  const form = useForm<ContentPageFormValues>({
    resolver: zodResolver(contentPageSchema),
    defaultValues: page || {
        slug: "",
        title: "",
        content: "",
        showInHeader: false,
        navOrder: 0,
    },
  });
  
  const title = form.watch('title');
  React.useEffect(() => {
    if (!isEditing && title) {
        form.setValue('slug', createSlug(title), { shouldValidate: true });
    }
  }, [title, isEditing, form]);


  async function onSubmit(values: ContentPageFormValues) {
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        const pageRef = doc(firestore, 'pages', page.id);
        await setDoc(pageRef, values, { merge: true });
        toast({
          title: "Página Atualizada",
          description: `A página "${values.title}" foi salva com sucesso.`,
        });
      } else {
        const newPageRef = doc(firestore, 'pages', values.slug);
        await setDoc(newPageRef, values);
        toast({
          title: "Página Criada",
          description: `A página "${values.title}" foi criada com sucesso.`,
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
      await deleteDoc(doc(firestore, "pages", page.id));
      toast({
        title: "Página Excluída",
        description: `"${page.title}" foi removida.`,
      });
      router.push("/admin/paginas");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast({
        title: "Falha na Exclusão",
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
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug da URL</FormLabel>
              <FormControl>
                <Input placeholder="sera-gerado-automaticamente" {...field} disabled={isEditing} />
              </FormControl>
              <FormDescription>Parte da URL da página. É gerado automaticamente a partir do título ao criar uma nova página.</FormDescription>
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
        <FormField
            control={form.control}
            name="showInHeader"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Mostrar no Cabeçalho</FormLabel>
                    <FormDescription>
                    Se ativado, um link para esta página aparecerá no menu principal.
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
              <FormLabel>Ordem de Navegação</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>Define a ordem dos links no menu (números menores aparecem primeiro).</FormDescription>
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
                            {isDeleting ? "Excluindo..." : "Excluir Página"}
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a página.
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
                {isSubmitting ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Página")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
