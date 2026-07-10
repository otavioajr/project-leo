"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  BateriaAvailability,
  CustomField,
  RegistrationCustomData,
  RegistrationCustomValue,
  RegistrationParticipantData,
} from "@/lib/types";
import {
  buildCustomFieldPayload,
  createCustomFieldDefaults,
  filterCustomFieldsForTarget,
  isRequiredCustomValueFilled,
} from "@/lib/registration-fields";
import { useSupabase } from "@/supabase/hooks";
import {
  deriveLegacyContactFields,
  deriveParticipantDisplayName,
} from "@/lib/registration-contact";
import { DynamicRegistrationField } from "./dynamic-registration-field";

const customDataValueSchema = z.union([z.string(), z.array(z.string())]);

const participantSchema = z
  .object({
    bateriaId: z.string().optional(),
  })
  .catchall(customDataValueSchema);

const PIX_MAX_GROUP_SIZE = 4;

const IMAGE_CONSENT_KEY = "autorizacao_de_uso_de_imagem";
const IMAGE_CONSENT_TEXT =
  "Autorizo, de forma gratuita e por prazo indeterminado, o uso da minha imagem — e declaro ter autorização dos demais participantes inscritos por mim — em fotos e vídeos captados durante a aventura, para divulgação das atividades em redes sociais, site e materiais promocionais.";

function createRegistrationSchema(
  remainingSpots: number | null,
  hasBaterias: boolean,
  hasLotes: boolean,
  requiresImageConsent: boolean
) {
  let groupSizeSchema: z.ZodType<number> = hasLotes
    ? z.literal(1)
    : z
        .coerce.number()
        .int("Use um número inteiro.")
        .min(1, "O grupo deve ter pelo menos 1 pessoa.")
        .max(PIX_MAX_GROUP_SIZE, `O grupo pode ter no máximo ${PIX_MAX_GROUP_SIZE} pessoas.`);

  if (!hasLotes && remainingSpots !== null) {
    groupSizeSchema = (groupSizeSchema as z.ZodNumber).max(
      remainingSpots,
      `Restam apenas ${remainingSpots} ${remainingSpots === 1 ? "vaga" : "vagas"} para esta aventura.`
    );
  }

  return z
    .object({
      groupSize: groupSizeSchema,
      customData: z.record(customDataValueSchema).optional(),
      participants: z.array(participantSchema),
      principalBateriaId: z.string().optional(),
      imageConsent: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (requiresImageConsent && data.imageConsent !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Você precisa autorizar o uso de imagem para concluir a inscrição.",
          path: ["imageConsent"],
        });
      }
      if (!hasBaterias) return;
      if (!data.principalBateriaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione uma bateria.",
          path: ["principalBateriaId"],
        });
      }
      data.participants.forEach((p, index) => {
        if (!p.bateriaId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selecione uma bateria.",
            path: ["participants", index, "bateriaId"],
          });
        }
      });
    });
}

type RegistrationFormValues = z.infer<ReturnType<typeof createRegistrationSchema>>;

type RegistrationFormProps = {
  adventureId: string;
  adventureTitle: string;
  adventureSlug: string;
  adventurePrice: number;
  customFields?: CustomField[];
  remainingSpots: number | null;
  baterias: BateriaAvailability[] | null;
  hasLotes?: boolean;
  requiresImageConsent?: boolean;
};

type RegistrationRpcErrorId =
  | "CAPACITY_EXCEEDED"
  | "ADVENTURE_NOT_FOUND"
  | "INVALID_GROUP_SIZE"
  | "REGISTRATIONS_DISABLED"
  | "BATERIA_ASSIGNMENTS_MISMATCH"
  | "BATERIA_NOT_FOUND"
  | "BATERIA_CAPACITY_EXCEEDED"
  | "NO_ACTIVE_LOTE"
  | "LOTE_CAPACITY_EXCEEDED"
  | "UNKNOWN";

function getErrorString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeRegistrationRpcError(error: unknown): RegistrationRpcErrorId {
  if (typeof error !== "object" || error === null) {
    return "UNKNOWN";
  }

  const message = getErrorString("message" in error ? error.message : undefined);
  const details = getErrorString("details" in error ? error.details : undefined);
  const hint = getErrorString("hint" in error ? error.hint : undefined);
  const code = getErrorString("code" in error ? error.code : undefined);

  const normalizedParts = [message, details, hint, code]
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);

  const matchesIdentifier = (identifier: RegistrationRpcErrorId) =>
    normalizedParts.some(
      (part) =>
        part === identifier ||
        part.includes(identifier) ||
        part.includes(`MESSAGE = '${identifier}'`) ||
        part.includes(`MESSAGE = "${identifier}"`)
    );

  if (matchesIdentifier("CAPACITY_EXCEEDED")) {
    return "CAPACITY_EXCEEDED";
  }

  if (matchesIdentifier("ADVENTURE_NOT_FOUND")) {
    return "ADVENTURE_NOT_FOUND";
  }

  if (matchesIdentifier("INVALID_GROUP_SIZE")) {
    return "INVALID_GROUP_SIZE";
  }

  if (matchesIdentifier("REGISTRATIONS_DISABLED")) {
    return "REGISTRATIONS_DISABLED";
  }

  if (matchesIdentifier("BATERIA_CAPACITY_EXCEEDED")) {
    return "BATERIA_CAPACITY_EXCEEDED";
  }

  if (matchesIdentifier("BATERIA_ASSIGNMENTS_MISMATCH")) {
    return "BATERIA_ASSIGNMENTS_MISMATCH";
  }

  if (matchesIdentifier("BATERIA_NOT_FOUND")) {
    return "BATERIA_NOT_FOUND";
  }

  if (matchesIdentifier("NO_ACTIVE_LOTE")) {
    return "NO_ACTIVE_LOTE";
  }

  if (matchesIdentifier("LOTE_CAPACITY_EXCEEDED")) {
    return "LOTE_CAPACITY_EXCEEDED";
  }

  return "UNKNOWN";
}

export function RegistrationForm({
  adventureId,
  adventureSlug,
  customFields,
  remainingSpots,
  baterias,
  hasLotes = false,
  requiresImageConsent = false,
}: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = useSupabase();
  const router = useRouter();

  const [bateriasState, setBateriasState] = useState<BateriaAvailability[] | null>(baterias);

  useEffect(() => {
    setBateriasState(baterias);
  }, [baterias]);

  const hasBaterias = (bateriasState?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasBaterias) return;
    const channel = supabase
      .channel(`baterias-${adventureId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "adventure_baterias", filter: `adventure_id=eq.${adventureId}` },
        async () => {
          const { data, error } = await supabase
            .rpc("get_adventure_baterias_with_availability", { p_adventure_id: adventureId });
          if (error) {
            console.error("Failed to refresh baterias:", error);
            return;
          }
          setBateriasState((data ?? []) as BateriaAvailability[]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations", filter: `adventure_id=eq.${adventureId}` },
        async () => {
          const { data, error } = await supabase
            .rpc("get_adventure_baterias_with_availability", { p_adventure_id: adventureId });
          if (error) {
            console.error("Failed to refresh baterias:", error);
            return;
          }
          setBateriasState((data ?? []) as BateriaAvailability[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adventureId, hasBaterias, supabase]);

  const allCustomFields = useMemo(() => customFields ?? [], [customFields]);
  const primaryFields = useMemo(
    () => filterCustomFieldsForTarget(allCustomFields, "primary"),
    [allCustomFields]
  );
  const additionalFields = useMemo(
    () => filterCustomFieldsForTarget(allCustomFields, "additional"),
    [allCustomFields]
  );
  const initialCustomData = useMemo(
    () => createCustomFieldDefaults(primaryFields),
    [primaryFields]
  );

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(
      createRegistrationSchema(remainingSpots, hasBaterias, hasLotes, requiresImageConsent)
    ),
    defaultValues: {
      groupSize: 1,
      customData: initialCustomData,
      participants: [],
      principalBateriaId: hasBaterias ? "" : undefined,
      imageConsent: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const groupSize = form.watch("groupSize");

  useEffect(() => {
    if (hasLotes) return;
    if (remainingSpots !== null && remainingSpots > 0 && groupSize > remainingSpots) {
      form.setValue("groupSize", remainingSpots);
    }
  }, [form, groupSize, remainingSpots, hasLotes]);

  useEffect(() => {
    if (hasLotes) return;
    const desiredParticipantCount = Math.max(0, groupSize - 1);
    const currentParticipantCount = fields.length;

    if (desiredParticipantCount > currentParticipantCount) {
      const newFields: Array<RegistrationCustomData & { bateriaId: string }> = [];

      for (let i = 0; i < desiredParticipantCount - currentParticipantCount; i++) {
        const newParticipant: RegistrationCustomData & { bateriaId: string } = {
          bateriaId: "",
          ...createCustomFieldDefaults(additionalFields),
        };
        newFields.push(newParticipant);
      }
      append(newFields);
    } else if (desiredParticipantCount < currentParticipantCount) {
      remove(
        Array.from(
          { length: currentParticipantCount - desiredParticipantCount },
          (_, i) => desiredParticipantCount + i
        )
      );
    }
  }, [
    additionalFields,
    append,
    fields.length,
    groupSize,
    hasLotes,
    remove,
  ]);

  async function onSubmit(values: RegistrationFormValues) {
    setIsSubmitting(true);

    let isValid = true;

    primaryFields.forEach((field) => {
      const customValue = values.customData?.[field.name];
      if (!isRequiredCustomValueFilled(field, customValue)) {
        form.setError(`customData.${field.name}` as const, {
          type: "manual",
          message: `${field.label} é obrigatório.`,
        });
        isValid = false;
      }
    });

    values.participants.forEach((participant, participantIndex) => {
      additionalFields.forEach((field) => {
        const participantValue = participant[field.name];
        if (!isRequiredCustomValueFilled(field, participantValue)) {
          form.setError(
            `participants.${participantIndex}.${field.name}` as const,
            {
              type: "manual",
              message: `${field.label} é obrigatório.`,
            }
          );
          isValid = false;
        }
      });
    });

    if (!isValid) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    let shouldResetSubmitting = true;

    try {
      const customDataPayload = buildCustomFieldPayload(
        primaryFields,
        values.customData
      );

      if (requiresImageConsent) {
        customDataPayload[IMAGE_CONSENT_KEY] = "Sim";
      }

      const contactFields = deriveLegacyContactFields(
        primaryFields,
        customDataPayload
      );

      const participantsPayload: RegistrationParticipantData[] =
        values.participants.map((participant) => {
          const participantPayload = buildCustomFieldPayload(
            additionalFields,
            participant
          ) as RegistrationParticipantData;

          participantPayload.name = deriveParticipantDisplayName(
            additionalFields,
            participantPayload
          );

          return participantPayload;
        });

      const bateriaAssignments = hasBaterias
        ? {
            principal: values.principalBateriaId,
            participants: values.participants.map((p) => p.bateriaId ?? ""),
          }
        : null;

      const { data, error } = await supabase.rpc(
        "create_registration_with_capacity",
        {
          p_adventure_id: adventureId,
          p_name: contactFields.name,
          p_email: contactFields.email,
          p_phone: contactFields.phone,
          p_group_size: values.groupSize,
          p_participants: participantsPayload,
          p_custom_data: customDataPayload,
          p_bateria_assignments: bateriaAssignments,
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.id || !data.registration_token) {
        throw new Error("INVALID_RPC_RESPONSE");
      }

      shouldResetSubmitting = false;
      router.push(
        `/adventures/${adventureSlug}/pagamento?registrationId=${data.id}&token=${data.registration_token}`
      );
    } catch (error) {
      console.error("Registration failed:", error);

      const rpcErrorId = normalizeRegistrationRpcError(error);

      if (rpcErrorId === "CAPACITY_EXCEEDED") {
        toast({
          title: "Vagas esgotadas",
          description: "As vagas se esgotaram enquanto enviávamos sua inscrição.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "ADVENTURE_NOT_FOUND") {
        toast({
          title: "Aventura indisponível",
          description: "Esta aventura não está disponível no momento. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "INVALID_GROUP_SIZE") {
        toast({
          title: "Tamanho de grupo inválido",
          description: "Revise a quantidade de participantes e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "REGISTRATIONS_DISABLED") {
        toast({
          title: "Inscrições encerradas",
          description: "As inscrições para esta aventura estão fechadas no momento.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "BATERIA_ASSIGNMENTS_MISMATCH") {
        toast({
          title: "Bateria não selecionada",
          description: "Selecione uma bateria para cada participante.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "BATERIA_NOT_FOUND") {
        toast({
          title: "Bateria indisponível",
          description: "Bateria não encontrada. Recarregue a página e tente de novo.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "BATERIA_CAPACITY_EXCEEDED") {
        toast({
          title: "Vagas esgotadas",
          description: "As vagas dessa bateria se esgotaram. Recarregue e escolha outra.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "NO_ACTIVE_LOTE") {
        toast({
          title: "Lotes esgotados",
          description: "Todos os lotes estão esgotados no momento.",
          variant: "destructive",
        });
        return;
      }

      if (rpcErrorId === "LOTE_CAPACITY_EXCEEDED") {
        toast({
          title: "Vagas esgotadas",
          description: "As vagas deste lote acabaram de ser preenchidas. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Falha na Inscrição",
        description: "Algo deu errado. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      if (shouldResetSubmitting) {
        setIsSubmitting(false);
      }
    }
  }

  const principalBateriaId = form.watch("principalBateriaId");
  const watchedParticipants = form.watch("participants");

  function computeAvailableForBateria(bateriaId: string, excludeIndex: number | "principal"): number {
    if (!bateriasState) return 0;
    const bateria = bateriasState.find((b) => b.id === bateriaId);
    if (!bateria) return 0;
    let allocated = 0;
    if (excludeIndex !== "principal" && principalBateriaId === bateriaId) {
      allocated += 1;
    }
    watchedParticipants.forEach((p, idx) => {
      if (idx === excludeIndex) return;
      if (p.bateriaId === bateriaId) {
        allocated += 1;
      }
    });
    return bateria.capacity - bateria.reserved - allocated;
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

  function handleInvalid(errors: FieldErrors<RegistrationFormValues>) {
    const firstMessage =
      findFirstErrorMessage(errors) ??
      "Preencha os campos obrigatórios antes de enviar a inscrição.";
    toast({
      title: "Não foi possível enviar",
      description: firstMessage,
      variant: "destructive",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleInvalid)} className="space-y-6">
        {hasBaterias && bateriasState && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold mb-2">Vagas por Bateria</p>
            <ul className="space-y-1 text-sm">
              {bateriasState.map((b) => {
                const remaining = Math.max(b.capacity - b.reserved, 0);
                return (
                  <li key={b.id} className="flex justify-between">
                    <span>
                      {b.label} ({b.start_time.slice(0, 5)}-{b.end_time.slice(0, 5)})
                    </span>
                    <span className={remaining > 0 ? "text-green-700 font-semibold" : "text-destructive font-semibold"}>
                      {remaining > 0 ? `${remaining} ${remaining === 1 ? "vaga" : "vagas"}` : "sem vagas"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!hasLotes ? (
          <>
            <FormField
              control={form.control}
              name="groupSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamanho do Grupo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={remainingSpots ?? undefined}
                      placeholder="1"
                      {...field}
                    />
                  </FormControl>
                  {remainingSpots !== null && (
                    <p className="text-sm text-muted-foreground">
                      Restam {remainingSpots} {remainingSpots === 1 ? "vaga" : "vagas"} reservadas no momento.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
          </>
        ) : null}

        {primaryFields.length > 0 ? (
          <h3 className="text-lg font-medium">Informações da inscrição</h3>
        ) : allCustomFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum campo adicional configurado para esta aventura.
          </p>
        ) : null}
        {hasBaterias && bateriasState && (
          <FormField
            control={form.control}
            name="principalBateriaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bateria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma bateria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bateriasState.map((b) => {
                      const available = computeAvailableForBateria(b.id, "principal");
                      const disabled = available < 1 && field.value !== b.id;
                      return (
                        <SelectItem key={b.id} value={b.id} disabled={disabled}>
                          {b.label} — {b.start_time.slice(0, 5)}-{b.end_time.slice(0, 5)}{" "}
                          {disabled ? "(sem vagas)" : `(${Math.max(available, 0)} ${available === 1 ? "vaga" : "vagas"})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {primaryFields.map((customField) => (
          <FormField
            key={customField.name}
            control={form.control}
            name={`customData.${customField.name}` as const}
            render={({ field }) => (
              <DynamicRegistrationField
                customField={customField}
                value={field.value as RegistrationCustomValue | undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
              />
            )}
          />
        ))}

        {!hasLotes &&
          fields.length > 0 &&
          (hasBaterias || additionalFields.length > 0) && <Separator />}

        {!hasLotes &&
          (hasBaterias || additionalFields.length > 0) &&
          fields.map((participantField, index) => (
            <div
              key={participantField.id}
              className="space-y-4 border-l-4 border-secondary pl-4 py-4"
            >
              <h3 className="text-lg font-medium">
                Dados do Participante {index + 2}
              </h3>

              {hasBaterias && bateriasState && (
                <FormField
                  control={form.control}
                  name={`participants.${index}.bateriaId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bateria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={typeof field.value === "string" ? field.value : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma bateria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bateriasState.map((b) => {
                            const available = computeAvailableForBateria(b.id, index);
                            const disabled = available < 1 && field.value !== b.id;
                            return (
                              <SelectItem
                                key={b.id}
                                value={b.id}
                                disabled={disabled}
                              >
                                {b.label} — {b.start_time.slice(0, 5)}-
                                {b.end_time.slice(0, 5)}{" "}
                                {disabled
                                  ? "(sem vagas)"
                                  : `(${Math.max(available, 0)} ${
                                      available === 1 ? "vaga" : "vagas"
                                    })`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {additionalFields.map((customField) => (
                <FormField
                  key={customField.name}
                  control={form.control}
                  name={`participants.${index}.${customField.name}` as const}
                  render={({ field }) => (
                    <DynamicRegistrationField
                      customField={customField}
                      value={field.value as RegistrationCustomValue | undefined}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                    />
                  )}
                />
              ))}
            </div>
          ))}

        {requiresImageConsent && (
          <FormField
            control={form.control}
            name="imageConsent"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <div className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal leading-snug">
                    {IMAGE_CONSENT_TEXT} <span className="text-destructive">*</span>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
        </Button>
      </form>
    </Form>
  );
}
