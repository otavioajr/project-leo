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
} from "@/components/ui/alert-dialog";

const customFieldTypes = ["text", "email", "tel", "number", "select", "multiselect"] as const;
type CustomFieldType = (typeof customFieldTypes)[number];

function isSelectionFieldType(type: CustomFieldType) {
  return type === "select" || type === "multiselect";
}

function normalizeSelectionOptions(options?: string[]) {
  const normalizedOptions: string[] = [];
  const seenOptions = new Set<string>();

  for (const option of options ?? []) {
    const trimmedOption = option.trim();

    if (!trimmedOption || seenOptions.has(trimmedOption)) {
      continue;
    }

    seenOptions.add(trimmedOption);
    normalizedOptions.push(trimmedOption);
  }

  return normalizedOptions;
}

const customFieldSchema = z
  .object({
    name: z.string().min(1, "O nome do campo é obrigatório.").regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e sublinhados (sem espaços)."),
    label: z.string().min(1, "O rótulo é obrigatório."),
    type: z.enum(customFieldTypes),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })
  .superRefine((field, context) => {
    if (!isSelectionFieldType(field.type)) {
      return;
    }

    const options = field.options ?? [];

    if (options.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adicione pelo menos uma opção.",
        path: ["options"],
      });
      return;
    }

    const seenOptions = new Set<string>();

    options.forEach((option, index) => {
      const trimmedOption = option.trim();

      if (!trimmedOption) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A opção não pode ficar vazia.",
          path: ["options", index],
        });
        return;
      }

      if (seenOptions.has(trimmedOption)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "As opções devem ser únicas.",
          path: ["options", index],
        });
        return;
      }

      seenOptions.add(trimmedOption);
    });
  });

const adventureSchema = z.object({
  title: z.string().min(3, "O titulo deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descricao curta deve ter pelo menos 10 caracteres.").max(150, "A descricao curta deve ter menos de 150 caracteres."),
  longDescription: z.string().min(20, "A descricao longa deve ter pelo menos 20 caracteres."),
  maxParticipants: z.preprocess(
    (value) => value === "" ? null : value,
    z.union([z.coerce.number().int("Use um numero inteiro.").min(1, "O limite deve ser pelo menos 1."), z.null()])
  ),
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
      maxParticipants: adventure?.max_participants ?? null,
      price: adventure?.price || 0,
      duration: adventure?.duration || "",
      location: adventure?.location || "",
      difficulty: adventure?.difficulty || "Moderado",
      imageUrl: adventure?.image_url || "",
      imageDescription: adventure?.image_description || "",
      registrationsEnabled: adventure?.registrations_enabled ?? true,
      customFields: (adventure?.custom_fields ?? []).map((customField) => {
        if (isSelectionFieldType(customField.type)) {
          return {
            ...customField,
            options: normalizeSelectionOptions(customField.options),
          };
        }

        const { options: _options, ...simpleField } = customField;
        return simpleField;
      }),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customFields",
  });

  function handleCustomFieldTypeChange(fieldIndex: number, type: CustomFieldType) {
    const optionsPath = `customFields.${fieldIndex}.options` as const;

    if (isSelectionFieldType(type)) {
      const currentOptions = form.getValues(optionsPath);
      if (!currentOptions || currentOptions.length === 0) {
        form.setValue(optionsPath, [""], { shouldDirty: true });
      }
      return;
    }

    form.setValue(optionsPath, undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleAddOption(fieldIndex: number) {
    const optionsPath = `customFields.${fieldIndex}.options` as const;
    const currentOptions = form.getValues(optionsPath) ?? [];
    form.setValue(optionsPath, [...currentOptions, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleRemoveOption(fieldIndex: number, optionIndex: number) {
    const optionsPath = `customFields.${fieldIndex}.options` as const;
    const currentOptions = form.getValues(optionsPath) ?? [];
    const nextOptions = currentOptions.filter((_, index) => index !== optionIndex);

    form.setValue(optionsPath, nextOptions, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(values: AdventureFormValues) {
    setIsSubmitting(true);

    const normalizedCustomFields =
      values.customFields?.map((customField) => {
        if (isSelectionFieldType(customField.type)) {
          return {
            ...customField,
            options: normalizeSelectionOptions(customField.options),
          };
        }

        const { options: _options, ...simpleField } = customField;
        return simpleField;
      }) || [];

    const adventureData = {
      slug: createSlug(values.title),
      title: values.title,
      description: values.description,
      long_description: values.longDescription,
      max_participants: values.maxParticipants,
      price: values.price,
      duration: values.duration,
      location: values.location,
      difficulty: values.difficulty,
      image_url: values.imageUrl,
      image_description: values.imageDescription,
      registrations_enabled: values.registrationsEnabled,
      custom_fields: normalizedCustomFields,
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
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Máximo de Pessoas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Deixe em branco para ilimitado"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Define quantas pessoas, no total, podem participar desta aventura.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormDescription className="mb-4">
              Configure os campos adicionais. Campos simples aparecem para todos os participantes, enquanto seleção única e seleção múltipla aparecem apenas para o contato principal.
            </FormDescription>

            {/* Campos fixos do sistema */}
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium mb-3">Campos do Sistema (incluídos automaticamente)</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Contato Principal:</p>
                  <p className="text-muted-foreground ml-2">Nome Completo, E-mail, Telefone (obrigatórios) + todos os campos personalizados</p>
                </div>
                <div>
                  <p className="font-medium">Participantes Adicionais:</p>
                  <p className="text-muted-foreground ml-2">Nome Completo (obrigatório) + apenas campos simples (texto, e-mail, telefone e número)</p>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-medium text-muted-foreground mb-3">Campos Personalizados</h4>
            <div className="space-y-6">
                {fields.map((field, index) => {
                  const customFieldType = form.watch(`customFields.${index}.type` as const) as CustomFieldType;
                  const customFieldOptions = form.watch(`customFields.${index}.options` as const) ?? [];
                  const shouldShowOptionsEditor = isSelectionFieldType(customFieldType);

                  return (
                    <div key={field.id} className="space-y-4 p-4 border rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`customFields.${index}.label` as const}
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
                          name={`customFields.${index}.name` as const}
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
                          name={`customFields.${index}.type` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  const nextType = value as CustomFieldType;
                                  field.onChange(nextType);
                                  handleCustomFieldTypeChange(index, nextType);
                                }}
                                value={field.value}
                              >
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
                                  <SelectItem value="select">Seleção única</SelectItem>
                                  <SelectItem value="multiselect">Seleção múltipla</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-end gap-4">
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.required` as const}
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

                      {shouldShowOptionsEditor && (
                        <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h5 className="text-sm font-medium">Opções de Seleção</h5>
                              <p className="text-xs text-muted-foreground">
                                Essas opções aparecem para o contato principal no formulário público.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddOption(index)}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Adicionar Opção
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {customFieldOptions.map((_, optionIndex) => (
                              <FormField
                                key={`${field.id}-option-${optionIndex}`}
                                control={form.control}
                                name={`customFields.${index}.options.${optionIndex}` as const}
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="flex items-start gap-2">
                                      <FormControl>
                                        <Input
                                          placeholder={`Opção ${optionIndex + 1}`}
                                          {...field}
                                          value={field.value ?? ""}
                                        />
                                      </FormControl>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveOption(index, optionIndex)}
                                      >
                                        <Trash className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Remover Opção</span>
                                      </Button>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>

                          <FormField
                            control={form.control}
                            name={`customFields.${index}.options` as const}
                            render={() => (
                              <FormItem>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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
