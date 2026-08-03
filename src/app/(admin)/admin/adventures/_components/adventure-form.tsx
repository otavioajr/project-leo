"use client";

import React from "react";
import { z } from "zod";
import { useForm, useFieldArray, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type {
  Adventure,
  BateriaAvailability,
  CustomFieldAudience,
  LoteAvailability,
} from "@/lib/types";
import { resolveCustomFieldAudience } from "@/lib/registration-fields";
import { useSupabase } from "@/supabase/hooks";
import { normalizePixConfig } from "@/lib/pix-config";
import { PixConfigDialog } from "./pix-config-dialog";
import { LotePixField } from "./lote-pix-field";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Trash, PlusCircle, AlertTriangle, GripVertical } from "lucide-react";
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

const customFieldTypes = [
  "text", "email", "tel", "number", "select", "multiselect", "tshirt_size",
] as const;
const customFieldAudiences = ["primary", "additional", "all"] as const;
type CustomFieldType = (typeof customFieldTypes)[number];

function isOptionsFieldType(type: CustomFieldType) {
  return type === "select" || type === "multiselect" || type === "tshirt_size";
}

function isTshirtSizeFieldType(type: CustomFieldType) {
  return type === "tshirt_size";
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

function slugifyFieldName(label: string) {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const customFieldSchema = z
  .object({
    name: z.string().min(1, "O nome do campo é obrigatório.").regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e sublinhados (sem espaços)."),
    label: z.string().min(1, "O rótulo é obrigatório."),
    type: z.enum(customFieldTypes),
    required: z.boolean(),
    audience: z.enum(customFieldAudiences).optional(),
    options: z.array(z.string()).optional(),
    helpImageUrl: z.union([z.literal(""), z.string().url("URL da imagem inválida.")]).optional(),
  })
  .superRefine((field, context) => {
    if (!isOptionsFieldType(field.type)) {
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

type CustomFieldFormValue = z.infer<typeof customFieldSchema>;

function createEmptyCustomField(): CustomFieldFormValue {
  return { name: "", label: "", type: "text", required: false };
}

const bateriaSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().min(1, "Nome da bateria é obrigatório."),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use formato HH:MM."),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use formato HH:MM."),
    capacity: z.coerce.number().int("Use um número inteiro.").min(1, "Capacidade mínima é 1."),
  })
  .refine((b) => b.end_time > b.start_time, {
    message: "Horário final deve ser maior que o inicial.",
    path: ["end_time"],
  });

const loteSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, "Nome do lote é obrigatório."),
  sort_order: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int("Use um número inteiro.").min(1, "Capacidade mínima é 1."),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
  pixCopiaECola: z.string().default(""),
});

const adventureSchema = z
  .object({
    title: z.string().trim().min(1, "O título é obrigatório."),
    description: z
      .string()
      .max(150, "A descricao curta deve ter menos de 150 caracteres."),
    longDescription: z.string(),
    maxParticipants: z.preprocess(
      (value) => (value === "" ? null : value),
      z.union([
        z.coerce.number().int("Use um numero inteiro.").min(1, "O limite deve ser pelo menos 1."),
        z.null(),
      ])
    ),
    price: z.preprocess(
      (value) => (value === "" ? 0 : value),
      z.coerce.number().min(0, "O preco deve ser um numero positivo.")
    ),
    duration: z.string(),
    location: z.string(),
    difficulty: z
      .string()
      .max(500, "A dificuldade deve ter no máximo 500 caracteres."),
    imageUrl: z.union([z.literal(""), z.string().url("URL da imagem invalida.")]),
    imageDescription: z.string(),
    isEnabled: z.boolean(),
    registrationsEnabled: z.boolean(),
    imageRightsEnabled: z.boolean(),
    hasBaterias: z.boolean(),
    baterias: z.array(bateriaSchema).optional(),
    hasLotes: z.boolean(),
    lotes: z.array(loteSchema).optional(),
    customFields: z
      .array(customFieldSchema)
      .superRefine((customFields, context) => {
        const seenNames = new Set<string>();

        customFields.forEach((customField, index) => {
          if (!customField.name) {
            return;
          }

          if (seenNames.has(customField.name)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Este ID já está em uso em outro campo.",
              path: [index, "name"],
            });
            return;
          }

          seenNames.add(customField.name);
        });
      })
      .optional(),
    pixEnabled: z.boolean(),
    pixCopiaECola: z.object({
      1: z.string(),
      2: z.string(),
      3: z.string(),
      4: z.string(),
    }),
    pixInstructions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasBaterias && (!data.baterias || data.baterias.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adicione pelo menos uma bateria.",
        path: ["baterias"],
      });
    }
    if (data.hasLotes && (!data.lotes || data.lotes.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adicione pelo menos um lote.",
        path: ["lotes"],
      });
    }
    if (data.hasLotes && data.hasBaterias) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lotes e baterias não podem estar ativos ao mesmo tempo.",
        path: ["hasLotes"],
      });
    }
    if (
      data.pixEnabled &&
      data.hasLotes &&
      data.lotes?.some((l) => !l.pixCopiaECola.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cadastre o PIX de todos os lotes para ativar o pagamento.",
        path: ["pixEnabled"],
      });
    }
    if (
      data.pixEnabled &&
      !data.hasLotes &&
      !Object.values(data.pixCopiaECola).some((s) => s.trim().length > 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cadastre ao menos uma chave PIX para ativar o pagamento.",
        path: ["pixEnabled"],
      });
    }
  });

export type AdventureFormValues = z.infer<typeof adventureSchema>;

type AdventureFormProps = {
  adventure?: Adventure;
};

function getSaveBateriasErrorMessage(error: unknown): string {
  const message = typeof (error as { message?: unknown })?.message === "string"
    ? (error as { message: string }).message
    : "";
  if (message.includes("CANNOT_DISABLE_BATERIAS_WITH_REGISTRATIONS")) {
    return "Não é possível desativar baterias com inscrições ativas. Cancele as inscrições primeiro.";
  }
  if (message.includes("CANNOT_ENABLE_BATERIAS_WITH_REGISTRATIONS")) {
    return "Não é possível ativar baterias com inscrições já existentes. Cancele as inscrições primeiro.";
  }
  if (message.includes("BATERIA_HAS_REGISTRATIONS")) {
    return "Uma das baterias removidas tem inscrições. Cancele as inscrições primeiro.";
  }
  if (message.includes("NOT_AUTHORIZED")) {
    return "Sem permissão para esta ação.";
  }
  if (message.includes("INVALID_BATERIA_PAYLOAD")) {
    return "Dados inválidos das baterias.";
  }
  return "Falha ao salvar baterias.";
}

function getSaveLotesErrorMessage(error: unknown): string {
  const message = typeof (error as { message?: unknown })?.message === "string"
    ? (error as { message: string }).message
    : "";
  if (message.includes("CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS")) {
    return "Não é possível desativar lotes com inscrições ativas. Cancele as inscrições primeiro.";
  }
  if (message.includes("CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS")) {
    return "Não é possível ativar lotes com inscrições já existentes. Cancele as inscrições primeiro.";
  }
  if (message.includes("CANNOT_ENABLE_LOTES_WITH_BATERIAS")) {
    return "Não é possível ativar lotes com baterias ativas. Desative as baterias primeiro.";
  }
  if (message.includes("LOTE_HAS_REGISTRATIONS")) {
    return "Um dos lotes removidos tem inscrições. Cancele as inscrições primeiro.";
  }
  if (message.includes("LOTE_CAPACITY_BELOW_RESERVED")) {
    return "Não é possível reduzir vagas abaixo do número de inscrições ativas.";
  }
  if (message.includes("NOT_AUTHORIZED")) {
    return "Sem permissão para esta ação.";
  }
  if (message.includes("INVALID_LOTE_PAYLOAD")) {
    return "Dados inválidos dos lotes.";
  }
  return "Falha ao salvar lotes.";
}

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
  const [capacityWarning, setCapacityWarning] = useState<{
    open: boolean;
    bateriaLabel: string;
    newCapacity: number;
    reserved: number;
    resolve?: (proceed: boolean) => void;
  }>({ open: false, bateriaLabel: "", newCapacity: 0, reserved: 0 });

  function confirmCapacityReduction(args: {
    bateriaLabel: string;
    newCapacity: number;
    reserved: number;
  }) {
    return new Promise<boolean>((resolve) => {
      setCapacityWarning({ ...args, open: true, resolve });
    });
  }
  const supabase = useSupabase();
  const pix = normalizePixConfig(adventure?.pix_config);

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
      difficulty: adventure?.difficulty ?? "",
      imageUrl: adventure?.image_url || "",
      imageDescription: adventure?.image_description || "",
      isEnabled: adventure?.is_enabled ?? true,
      registrationsEnabled: adventure?.registrations_enabled ?? true,
      imageRightsEnabled: adventure?.image_rights_enabled ?? false,
      hasBaterias: adventure?.has_baterias ?? false,
      baterias: [],
      hasLotes: adventure?.has_lotes ?? false,
      lotes: [],
      customFields: (adventure?.custom_fields ?? []).map((customField) => {
        if (isOptionsFieldType(customField.type)) {
          const base = {
            ...customField,
            options: normalizeSelectionOptions(customField.options),
          };
          if (isTshirtSizeFieldType(customField.type)) {
            return { ...base, helpImageUrl: customField.helpImageUrl ?? "" };
          }
          return base;
        }

        const { options: _options, helpImageUrl: _help, ...simpleField } = customField;
        return simpleField;
      }),
      pixEnabled: pix.pixEnabled,
      pixCopiaECola: pix.pixCopiaECola,
      pixInstructions: pix.instructions ?? "",
    },
  });

  const [bateriasAvailability, setBateriasAvailability] = useState<BateriaAvailability[]>([]);
  const [lotesAvailability, setLotesAvailability] = useState<LoteAvailability[]>([]);

  const pixEnabled = form.watch("pixEnabled");
  const hasLotes = form.watch("hasLotes");
  const pixCopiaECola = form.watch("pixCopiaECola");
  const lotesValues = form.watch("lotes") ?? [];
  const registeredPixKeysCount = hasLotes
    ? lotesValues.filter((l) => l.pixCopiaECola.trim().length > 0).length
    : Object.values(pixCopiaECola).filter((value) => value.trim().length > 0).length;

  const bateriasFieldArray = useFieldArray({
    control: form.control,
    name: "baterias",
  });

  const lotesFieldArray = useFieldArray({
    control: form.control,
    name: "lotes",
  });

  useEffect(() => {
    if (!adventure?.id) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .rpc("get_adventure_baterias_with_availability", { p_adventure_id: adventure!.id });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load baterias:", error);
        return;
      }
      const list = (data ?? []) as BateriaAvailability[];
      setBateriasAvailability(list);
      if (list.length > 0) {
        form.setValue(
          "baterias",
          list.map((b) => ({
            id: b.id,
            label: b.label,
            start_time: b.start_time.slice(0, 5),
            end_time: b.end_time.slice(0, 5),
            capacity: b.capacity,
          })),
          { shouldDirty: false }
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [adventure?.id, supabase, form]);

  useEffect(() => {
    if (!adventure?.id) return;
    let cancelled = false;
    async function loadLotes() {
      const { data, error } = await supabase
        .rpc("get_adventure_lotes_with_availability", { p_adventure_id: adventure!.id });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load lotes:", error);
        return;
      }
      const list = (data ?? []) as LoteAvailability[];
      setLotesAvailability(list);
      if (list.length > 0) {
        form.setValue(
          "lotes",
          list.map((l) => ({
            id: l.id,
            label: l.label,
            sort_order: l.sort_order,
            capacity: l.capacity,
            price: Number(l.price),
            pixCopiaECola: "",
          })),
          { shouldDirty: false }
        );
        const { data: pixRows } = await supabase
          .from("adventure_lotes")
          .select("id, pix_copia_cola")
          .eq("adventure_id", adventure!.id);
        if (!cancelled && pixRows) {
          const pixById = Object.fromEntries(
            pixRows.map((row) => [row.id as string, (row.pix_copia_cola as string) ?? ""])
          );
          form.setValue(
            "lotes",
            list.map((l) => ({
              id: l.id,
              label: l.label,
              sort_order: l.sort_order,
              capacity: l.capacity,
              price: Number(l.price),
              pixCopiaECola: pixById[l.id] ?? "",
            })),
            { shouldDirty: false }
          );
        }
      }
    }
    void loadLotes();
    return () => {
      cancelled = true;
    };
  }, [adventure?.id, supabase, form]);

  const { fields, append, insert, move, remove } = useFieldArray({
    control: form.control,
    name: "customFields",
  });
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);

  function handleCustomFieldDrop(targetIndex: number) {
    if (draggedFieldIndex !== null && draggedFieldIndex !== targetIndex) {
      move(draggedFieldIndex, targetIndex);
    }
    setDraggedFieldIndex(null);
  }

  // IDs de campos que não devem mais ser sincronizados com o rótulo: campos
  // já salvos (mudar o ID desvincularia respostas de inscrições existentes)
  // e campos cujo ID foi editado manualmente pelo admin.
  const lockedFieldIdsRef = useRef<Set<string> | null>(null);
  if (lockedFieldIdsRef.current === null) {
    lockedFieldIdsRef.current = new Set(fields.map((field) => field.id));
  }

  function isCustomFieldNameSynced(fieldId: string) {
    return !lockedFieldIdsRef.current?.has(fieldId);
  }

  function lockCustomFieldName(fieldId: string) {
    lockedFieldIdsRef.current?.add(fieldId);
  }

  function handleCustomFieldLabelChange(fieldIndex: number, fieldId: string, label: string) {
    if (!isCustomFieldNameSynced(fieldId)) {
      return;
    }

    const namePath = `customFields.${fieldIndex}.name` as const;
    const baseSlug = slugifyFieldName(label);

    if (!baseSlug) {
      form.setValue(namePath, "", { shouldDirty: true });
      return;
    }

    const otherNames = new Set(
      (form.getValues("customFields") ?? [])
        .filter((_, index) => index !== fieldIndex)
        .map((customField) => customField.name)
    );

    let slug = baseSlug;
    let suffix = 2;
    while (otherNames.has(slug)) {
      slug = `${baseSlug}_${suffix}`;
      suffix += 1;
    }

    form.setValue(namePath, slug, { shouldDirty: true, shouldValidate: true });
  }

  function handleCustomFieldTypeChange(fieldIndex: number, type: CustomFieldType) {
    const optionsPath = `customFields.${fieldIndex}.options` as const;
    const helpImagePath = `customFields.${fieldIndex}.helpImageUrl` as const;
    const labelPath = `customFields.${fieldIndex}.label` as const;

    if (isOptionsFieldType(type)) {
      const currentOptions = form.getValues(optionsPath);
      if (!currentOptions || currentOptions.length === 0) {
        form.setValue(optionsPath, [""], { shouldDirty: true });
      }
      if (isTshirtSizeFieldType(type)) {
        const currentLabel = form.getValues(labelPath);
        if (!currentLabel?.trim()) {
          const defaultLabel = "Tamanho de camiseta";
          form.setValue(labelPath, defaultLabel, { shouldDirty: true });
          const fieldId = fields[fieldIndex]?.id;
          if (fieldId) {
            handleCustomFieldLabelChange(fieldIndex, fieldId, defaultLabel);
          }
        }
        if (form.getValues(helpImagePath) === undefined) {
          form.setValue(helpImagePath, "", { shouldDirty: true });
        }
      }
      return;
    }

    form.setValue(optionsPath, undefined, { shouldDirty: true, shouldValidate: true });
    form.setValue(helpImagePath, undefined, { shouldDirty: true, shouldValidate: true });
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

    if (values.hasLotes && values.lotes) {
      for (const lote of values.lotes) {
        if (!lote.id) continue;
        const existing = lotesAvailability.find((l) => l.id === lote.id);
        if (!existing) continue;
        if (lote.capacity < existing.reserved) {
          toast({
            title: "Capacidade inválida",
            description: `${existing.label} tem ${existing.reserved} inscrições. Cancele inscrições antes de reduzir as vagas.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
    }

    // 1) Validação pre-submit de redução de capacidade abaixo do reservado
    if (values.hasBaterias && values.baterias) {
      for (const bateria of values.baterias) {
        if (!bateria.id) continue;
        const existing = bateriasAvailability.find((b) => b.id === bateria.id);
        if (!existing) continue;
        if (bateria.capacity < existing.reserved) {
          const proceed = await confirmCapacityReduction({
            bateriaLabel: existing.label,
            newCapacity: bateria.capacity,
            reserved: existing.reserved,
          });
          if (!proceed) {
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    const normalizedCustomFields =
      values.customFields?.map((customField) => {
        if (isOptionsFieldType(customField.type)) {
          const normalized = {
            ...customField,
            options: normalizeSelectionOptions(customField.options),
          };
          if (isTshirtSizeFieldType(customField.type)) {
            const trimmedHelp = customField.helpImageUrl?.trim() ?? "";
            return {
              ...normalized,
              helpImageUrl: trimmedHelp === "" ? undefined : trimmedHelp,
            };
          }
          const { helpImageUrl: _help, ...withoutHelp } = normalized;
          return withoutHelp;
        }
        const { options: _options, helpImageUrl: _help, ...simpleField } = customField;
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
      difficulty:
        values.difficulty.trim() === "" ? null : values.difficulty.trim(),
      image_url: values.imageUrl,
      image_description: values.imageDescription,
      is_enabled: values.isEnabled,
      registrations_enabled: values.registrationsEnabled,
      image_rights_enabled: values.imageRightsEnabled,
      custom_fields: normalizedCustomFields,
      pix_config: {
        pixEnabled: values.pixEnabled,
        pixCopiaECola: values.hasLotes
          ? { 1: "", 2: "", 3: "", 4: "" }
          : values.pixCopiaECola,
        instructions: values.pixInstructions,
      },
      // NOTE: has_baterias e has_lotes são atualizados via RPCs dedicados.
    };

    try {
      let adventureId = adventure?.id;
      if (adventureId) {
        const { error } = await supabase
          .from("adventures")
          .update(adventureData)
          .eq("id", adventureId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("adventures")
          .insert({ ...adventureData, has_baterias: false, has_lotes: false })
          .select("id")
          .single();
        if (error) throw error;
        adventureId = data.id as string;
      }

      const bateriasPayload = (values.baterias ?? []).map((b, index) => ({
        id: b.id,
        label: b.label,
        start_time: b.start_time,
        end_time: b.end_time,
        capacity: b.capacity,
        sort_order: index,
      }));

      const { error: bateriaError } = await supabase.rpc("save_adventure_baterias", {
        p_adventure_id: adventureId,
        p_has_baterias: values.hasBaterias,
        p_baterias: bateriasPayload,
      });

      if (bateriaError) {
        toast({
          title: "Falha ao salvar baterias",
          description: getSaveBateriasErrorMessage(bateriaError),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const lotesPayload = (values.lotes ?? []).map((l, index) => ({
        id: l.id,
        label: l.label,
        sort_order: index,
        capacity: l.capacity,
        price: l.price,
        pix_copia_cola: l.pixCopiaECola,
      }));

      const { error: loteError } = await supabase.rpc("save_adventure_lotes", {
        p_adventure_id: adventureId,
        p_has_lotes: values.hasLotes,
        p_lotes: lotesPayload,
      });

      if (loteError) {
        toast({
          title: "Falha ao salvar lotes",
          description: getSaveLotesErrorMessage(loteError),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: adventure ? "Aventura Atualizada" : "Aventura Criada",
        description: `"${values.title}" foi salva.`,
      });
      router.push("/admin/adventures");
      router.refresh();
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

  function findFirstErrorMessage(errors: unknown): string | null {
    if (!errors || typeof errors !== "object") return null;
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const obj = value as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message.length > 0) {
        return obj.message;
      }
      const nested = findFirstErrorMessage(obj);
      if (nested) return nested;
    }
    return null;
  }

  function handleInvalid(errors: FieldErrors<AdventureFormValues>) {
    const firstMessage =
      findFirstErrorMessage(errors) ??
      "Preencha os campos obrigatórios antes de salvar.";
    toast({
      title: "Não foi possível salvar",
      description: firstMessage,
      variant: "destructive",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleInvalid)} className="space-y-8">
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
              render={({ field }) => {
                const hasBaterias = form.watch("hasBaterias");
                const hasLotesEnabled = form.watch("hasLotes");
                return (
                  <FormItem>
                    <FormLabel>Limite Máximo de Pessoas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Deixe em branco para ilimitado"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                        disabled={hasBaterias || hasLotesEnabled}
                      />
                    </FormControl>
                    <FormDescription>
                      {hasLotesEnabled
                        ? "Não usado quando lotes estão ativos — a capacidade é a soma das vagas dos lotes."
                        : hasBaterias
                          ? "Não usado quando baterias estão ativas — a capacidade é definida por bateria."
                          : "Define quantas pessoas, no total, podem participar desta aventura."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => {
                const hasLotesEnabled = form.watch("hasLotes");
                return (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={hasLotesEnabled} />
                    </FormControl>
                    {hasLotesEnabled ? (
                      <FormDescription>Definido por lote na tabela abaixo.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
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
                  <FormControl>
                    <Input
                      placeholder="ex: Aberto para todos, Difícil com possibilidade para iniciantes"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcional. Deixe em branco para não exibir no site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Aventura habilitada</FormLabel>
                    <FormDescription>
                      Quando desabilitada, a aventura não aparece no site e fica indisponível para visitantes.
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
            <FormField
              control={form.control}
              name="imageRightsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Direito de Imagem</FormLabel>
                    <FormDescription>
                      Exige que o inscrito autorize o uso de sua imagem para concluir a inscrição.
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
              name="hasBaterias"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Habilitar Baterias</FormLabel>
                    <FormDescription>
                      Oferecer múltiplos horários para esta aventura, cada um com capacidade própria.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.watch("hasLotes")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hasLotes"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Vender por lote</FormLabel>
                    <FormDescription>
                      Precificação escalonada com vagas e PIX por lote. Uma pessoa por inscrição.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.watch("hasBaterias")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {form.watch("hasLotes") && (
          <div className="space-y-3 rounded-md border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Lotes</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = lotesFieldArray.fields.length + 1;
                  lotesFieldArray.append({
                    label: `Lote ${next}`,
                    sort_order: next - 1,
                    capacity: 10,
                    price: 0,
                    pixCopiaECola: "",
                  });
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Lote
              </Button>
            </div>
            {lotesFieldArray.fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum lote configurado. Adicione pelo menos um.
              </p>
            ) : (
              <div className="space-y-4">
                {lotesFieldArray.fields.map((field, index) => (
                  <div key={field.id} className="rounded-md border p-4 space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const lotes = form.getValues("lotes") ?? [];
                          const current = lotes[index];
                          if (current?.id) {
                            const existing = lotesAvailability.find((l) => l.id === current.id);
                            if (existing && existing.reserved > 0) {
                              toast({
                                title: "Não é possível remover",
                                description: "Este lote tem inscrições ativas.",
                                variant: "destructive",
                              });
                              return;
                            }
                          }
                          lotesFieldArray.remove(index);
                        }}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`lotes.${index}.label`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...f} placeholder="ex: Lote 1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lotes.${index}.capacity`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Vagas</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lotes.${index}.price`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Preço (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`lotes.${index}.pixCopiaECola`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>PIX copia-e-cola</FormLabel>
                          <FormControl>
                            <LotePixField
                              label={form.watch(`lotes.${index}.label`) || `Lote ${index + 1}`}
                              value={f.value ?? ""}
                              onChange={f.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
            <FormField
              control={form.control}
              name="lotes"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {form.watch("hasBaterias") && (
          <div className="space-y-3 rounded-md border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Baterias</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = bateriasFieldArray.fields.length + 1;
                  bateriasFieldArray.append({
                    label: `Bateria ${next}`,
                    start_time: "08:00",
                    end_time: "10:00",
                    capacity: 10,
                  });
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Bateria
              </Button>
            </div>
            {bateriasFieldArray.fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma bateria configurada. Adicione pelo menos uma.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-24">Início</TableHead>
                    <TableHead className="w-24">Fim</TableHead>
                    <TableHead className="w-20">Cap.</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bateriasFieldArray.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`baterias.${index}.label`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...f} placeholder="ex: Turma Manhã" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`baterias.${index}.start_time`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...f} placeholder="08:00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`baterias.${index}.end_time`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...f} placeholder="10:00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`baterias.${index}.capacity`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" min="1" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const baterias = form.getValues("baterias") ?? [];
                            const current = baterias[index];
                            if (current?.id) {
                              const { error } = await supabase.rpc("delete_adventure_bateria", {
                                p_bateria_id: current.id,
                              });
                              if (error) {
                                const message = String(error.message || "");
                                if (message.includes("BATERIA_HAS_REGISTRATIONS")) {
                                  toast({
                                    title: "Bateria com inscrições",
                                    description:
                                      "Não é possível remover uma bateria com inscrições. Cancele as inscrições primeiro.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                toast({
                                  title: "Falha ao remover",
                                  description: "Algo deu errado. Tente novamente.",
                                  variant: "destructive",
                                });
                                return;
                              }
                            }
                            bateriasFieldArray.remove(index);
                            setBateriasAvailability((prev) =>
                              prev.filter((b) => b.id !== current?.id)
                            );
                          }}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <FormField
              control={form.control}
              name="baterias"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <Separator />

        <PixConfigDialog
          control={form.control}
          pixEnabled={pixEnabled}
          registeredKeysCount={registeredPixKeysCount}
          hasLotes={hasLotes}
          totalLotesCount={lotesValues.length}
        />
        <FormField
          control={form.control}
          name="pixEnabled"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div>
            <h3 className="text-xl font-headline font-semibold mb-4">
              Construtor de Formulário de Inscrição
            </h3>
            <FormDescription className="mb-4">
              Crie apenas os campos necessários e escolha para quem cada um aparece. É permitido salvar a aventura sem campos personalizados.
            </FormDescription>

            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Campos Personalizados
            </h4>
            <div className="space-y-6">
                {fields.map((field, index) => {
                  const fieldArrayId = field.id;
                  const customFieldType = form.watch(`customFields.${index}.type` as const) as CustomFieldType;
                  const customFieldAudience = form.watch(
                    `customFields.${index}.audience` as const
                  ) as CustomFieldAudience | undefined;
                  const effectiveAudience = resolveCustomFieldAudience({
                    type: customFieldType,
                    audience: customFieldAudience,
                  });
                  const customFieldOptions = form.watch(`customFields.${index}.options` as const) ?? [];
                  const shouldShowOptionsEditor = isOptionsFieldType(customFieldType);
                  const shouldShowTshirtHelpImage = isTshirtSizeFieldType(customFieldType);

                  return (
                    <div key={field.id} className="space-y-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insert(index, createEmptyCustomField())}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar campo antes de {field.label.trim() || "campo sem rótulo"}
                      </Button>
                      <div className="space-y-4 p-4 border rounded-md">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            draggable
                            aria-label={`Arrastar campo ${field.label.trim() || `sem rótulo ${index + 1}`}`}
                            title="Arraste para reordenar"
                            onDragStart={() => setDraggedFieldIndex(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleCustomFieldDrop(index)}
                            onDragEnd={() => setDraggedFieldIndex(null)}
                          >
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Reordenar campos</span>
                          </Button>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <FormField
                          control={form.control}
                          name={`customFields.${index}.label` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rótulo do Campo</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: CPF"
                                  {...field}
                                  onChange={(event) => {
                                    field.onChange(event);
                                    handleCustomFieldLabelChange(
                                      index,
                                      fieldArrayId,
                                      event.target.value
                                    );
                                  }}
                                />
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
                                <Input
                                  placeholder="Ex: cpf"
                                  {...field}
                                  onChange={(event) => {
                                    lockCustomFieldName(fieldArrayId);
                                    field.onChange(event);
                                  }}
                                />
                              </FormControl>
                              {isCustomFieldNameSynced(fieldArrayId) && (
                                <FormDescription>
                                  Preenchido automaticamente a partir do rótulo.
                                </FormDescription>
                              )}
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
                                  <SelectItem value="tshirt_size">Tamanho de camiseta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`customFields.${index}.audience` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Exibir para</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? effectiveAudience}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o público" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="primary">Contato principal</SelectItem>
                                  <SelectItem value="additional">Participantes adicionais</SelectItem>
                                  <SelectItem value="all">Todos os participantes</SelectItem>
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
                                Essas opções aparecem para o público selecionado no formulário.
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

                      {shouldShowTshirtHelpImage && (
                        <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                          <div>
                            <h5 className="text-sm font-medium">Imagem de ajuda</h5>
                            <p className="text-xs text-muted-foreground">
                              Tabela de medidas exibida ao cliente ao clicar no botão de orientação.
                            </p>
                          </div>
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.helpImageUrl` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <ImageUpload
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    folder="adventures/tshirt-guides"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!(form.watch(`customFields.${index}.helpImageUrl` as const) ?? "").trim() && (
                            <p className="text-xs text-muted-foreground flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              Sem imagem de ajuda, o botão de orientação não aparecerá para o cliente no formulário de inscrição.
                            </p>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append(createEmptyCustomField())}
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
        <AlertDialog
          open={capacityWarning.open}
          onOpenChange={(open) => {
            if (!open) {
              capacityWarning.resolve?.(false);
              setCapacityWarning((prev) => ({ ...prev, open: false }));
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reduzir capacidade?</AlertDialogTitle>
              <AlertDialogDescription>
                A Bateria &quot;{capacityWarning.bateriaLabel}&quot; tem {capacityWarning.reserved}{" "}
                inscrições e você está reduzindo a capacidade para {capacityWarning.newCapacity}. As
                inscrições atuais serão mantidas, mas a bateria ficará com excedente. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  capacityWarning.resolve?.(false);
                  setCapacityWarning((prev) => ({ ...prev, open: false }));
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  capacityWarning.resolve?.(true);
                  setCapacityWarning((prev) => ({ ...prev, open: false }));
                }}
              >
                Salvar mesmo assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  );
}
