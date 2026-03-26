"use client";

import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Adventure } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash, PlusCircle } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";

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
} from "@/components/ui/alert-dialog"

const customFieldSchema = z.object({
  name: z.string().min(1, "O nome do campo é obrigatório.").regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e sublinhados (sem espaços)."),
  label: z.string().min(1, "O rótulo é obrigatório."),
  type: z.enum(['text', 'email', 'tel', 'number']),
  required: z.boolean(),
});

const adventureSchema = z.object({
  title: z.string().min(3, "O titulo deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descricao curta deve ter pelo menos 10 caracteres.").max(150, "A descricao curta deve ter menos de 150 caracteres."),
  longDescription: z.string().min(20, "A descricao longa deve ter pelo menos 20 caracteres."),
  price: z.coerce.number().min(0, "O preco deve ser um numero positivo."),
  duration: z.string().min(1, "A duracao e obrigatoria."),
  location: z.string().min(1, "A localizacao e obrigatoria."),
  difficulty: z.enum(["Fácil", "Moderado", "Desafiador"]),
  imageUrl: z.string().min(1, "A imagem e obrigatoria.").url("URL da imagem invalida."),
  imageDescription: z.string().min(1, "A descricao da imagem e obrigatoria."),
  registrationsEnabled: z.boolean(),
  customFields: z.array(customFieldSchema).optional(),
});

type AdventureFormValues = z.infer<typeof adventureSchema>;

type AdventureFormProps = {
  adventure?: Adventure;
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

export function AdventureForm({ adventure }: AdventureFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = useSupabase();

  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureSchema),
    defaultValues: {
      title: adventure?.title || "",
      description: adventure?.description || "",
      longDescription: adventure?.long_description || "",
      price: adventure?.price || 0,
      duration: adventure?.duration || "",
      location: adventure?.location || "",
      difficulty: adventure?.difficulty || "Moderado",
      imageUrl: adventure?.image_url || "",
      imageDescription: adventure?.image_description || "",
      registrationsEnabled: adventure?.registrations_enabled ?? true,
      customFields: adventure?.custom_fields || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customFields",
  });

  async function onSubmit(values: AdventureFormValues) {
    setIsSubmitting(true);

    const adventureData = {
      slug: createSlug(values.title),
      title: values.title,
      description: values.description,
      long_description: values.longDescription,
      price: values.price,
      duration: values.duration,
      location: values.location,
      difficulty: values.difficulty,
      image_url: values.imageUrl,
      image_description: values.imageDescription,
      registrations_enabled: values.registrationsEnabled,
      custom_fields: values.customFields || [],
    };

    try {
      if (adventure?.id) {
        const { error } = await supabase.from('adventures').update(adventureData).eq('id', adventure.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('adventures').insert(adventureData);
        if (error) throw error;
      }

      toast({
        title: adventure ? "Aventura Atualizada" : "Aventura Criada",
        description: `"${values.title}" foi salva.`,
      });
      router.push("/admin/adventures");
      router.refresh(); // revalidate cache
    } catch (error) {
      console.error("Failed to save adventure:", error);
      toast({
        title: "Falha ao Salvar",
        description: "Algo deu errado.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!adventure) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('adventures').delete().eq('id', adventure.id);
      if (error) throw error;
      toast({
            title: "Aventura Excluída",
            description: `"${adventure.title}" foi removida.`,
      });
      router.push("/admin/adventures");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete adventure:", error);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Caminhada na Crista da Montanha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Curta</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Uma descrição breve e cativante para o cartão da aventura." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="longDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Completa</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Uma descrição detalhada para a página da aventura." rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem Principal</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      folder="adventures"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Faca upload de uma imagem ou cole uma URL externa. Tamanho maximo: 5MB.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="imageDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Imagem (Texto Alternativo)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Uma descrição concisa da imagem para acessibilidade." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-8">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Dia Inteiro, 3 Horas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Crista Alpina" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dificuldade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a dificuldade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Fácil">Fácil</SelectItem>
                      <SelectItem value="Moderado">Moderado</SelectItem>
                      <SelectItem value="Desafiador">Desafiador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="registrationsEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Habilitar Inscrições</FormLabel>
                        <FormDescription>
                        Permitir que os usuários se inscrevam nesta aventura.
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
          </div>
        </div>

        <Separator />

        <div>
            <h3 className="text-xl font-headline font-semibold mb-4">Construtor de Formulário de Inscrição</h3>
            <FormDescription className="mb-4">Configure os campos adicionais para coletar informações dos participantes.</FormDescription>

            {/* Campos fixos do sistema */}
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium mb-3">Campos do Sistema (incluídos automaticamente)</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Contato Principal:</p>
                  <p className="text-muted-foreground ml-2">Nome Completo, E-mail, Telefone (obrigatórios) + campos personalizados</p>
                </div>
                <div>
                  <p className="font-medium">Participantes Adicionais:</p>
                  <p className="text-muted-foreground ml-2">Nome Completo (obrigatório) + campos personalizados</p>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-medium text-muted-foreground mb-3">Campos Personalizados (aparecem para todos os participantes)</h4>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md relative">
                         <FormField
                            control={form.control}
                            name={`customFields.${index}.label`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rótulo do Campo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: CPF" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`customFields.${index}.name`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Campo (ID)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: cpf" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`customFields.${index}.type`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="text">Texto</SelectItem>
                                            <SelectItem value="email">E-mail</SelectItem>
                                            <SelectItem value="tel">Telefone</SelectItem>
                                            <SelectItem value="number">Número</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <div className="flex items-end gap-4">
                            <FormField
                                control={form.control}
                                name={`customFields.${index}.required`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5 mr-4">
                                            <FormLabel>Obrigatório</FormLabel>
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
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remover Campo</span>
                            </Button>
                        </div>
                    </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ name: "", label: "", type: "text", required: false })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Campo Personalizado
                </Button>
            </div>
        </div>

        <div className="flex justify-between items-center mt-8">
            <div>
            {adventure && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isDeleting}>
                        <Trash className="mr-2 h-4 w-4" />
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a
                        aventura e todas as inscrições associadas.
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
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
