"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/types";
import { useSupabase } from "@/supabase/hooks";

type SimpleCustomFieldType = "text" | "email" | "tel" | "number";
type SimpleCustomField = CustomField & { type: SimpleCustomFieldType };

const customDataValueSchema = z.union([z.string(), z.array(z.string())]);

function isSimpleCustomField(field: CustomField): field is SimpleCustomField {
  return (
    field.type === "text" ||
    field.type === "email" ||
    field.type === "tel" ||
    field.type === "number"
  );
}

function isRequiredCustomValueFilled(
  field: CustomField,
  value: RegistrationCustomValue | undefined
): boolean {
  if (!field.required) {
    return true;
  }

  if (field.type === "multiselect") {
    return (
      Array.isArray(value) &&
      value.some((selectedValue) => selectedValue.trim() !== "")
    );
  }

  return typeof value === "string" && value.trim() !== "";
}

const participantSchema = z
  .object({
    name: z.string().min(2, "O nome do participante é obrigatório."),
    bateriaId: z.string().optional(),
  })
  .catchall(z.string());

function createRegistrationSchema(remainingSpots: number | null, hasBaterias: boolean) {
  let groupSizeSchema = z
    .coerce.number()
    .int("Use um número inteiro.")
    .min(1, "O grupo deve ter pelo menos 1 pessoa.");

  if (remainingSpots !== null) {
    groupSizeSchema = groupSizeSchema.max(
      remainingSpots,
      `Restam apenas ${remainingSpots} ${remainingSpots === 1 ? "vaga" : "vagas"} para esta aventura.`
    );
  }

  return z
    .object({
      name: z.string().min(2, "O nome do contato deve ter pelo menos 2 caracteres."),
      email: z.string().email("Por favor, insira um endereço de e-mail válido."),
      phone: z.string().min(10, "Por favor, insira um número de telefone válido."),
      groupSize: groupSizeSchema,
      customData: z.record(customDataValueSchema).optional(),
      participants: z.array(participantSchema),
      principalBateriaId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
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
};

type RegistrationRpcErrorId =
  | "CAPACITY_EXCEEDED"
  | "ADVENTURE_NOT_FOUND"
  | "INVALID_GROUP_SIZE"
  | "REGISTRATIONS_DISABLED"
  | "BATERIA_ASSIGNMENTS_MISMATCH"
  | "BATERIA_NOT_FOUND"
  | "BATERIA_CAPACITY_EXCEEDED"
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

  return "UNKNOWN";
}

export function RegistrationForm({
  adventureId,
  adventureSlug,
  customFields,
  remainingSpots,
  baterias,
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

  const allCustomFields = customFields ?? [];
  const participantCustomFields = allCustomFields.filter(isSimpleCustomField);

  const initialCustomData: RegistrationCustomData = {};
  allCustomFields.forEach((field) => {
    initialCustomData[field.name] = field.type === "multiselect" ? [] : "";
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(createRegistrationSchema(remainingSpots, hasBaterias)),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      groupSize: 1,
      customData: initialCustomData,
      participants: [],
      principalBateriaId: hasBaterias ? "" : undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const groupSize = form.watch("groupSize");

  useEffect(() => {
    if (remainingSpots !== null && remainingSpots > 0 && groupSize > remainingSpots) {
      form.setValue("groupSize", remainingSpots);
    }
  }, [form, groupSize, remainingSpots]);

  useEffect(() => {
    const desiredParticipantCount = Math.max(0, groupSize - 1);
    const currentParticipantCount = fields.length;
    const additionalParticipantFields = (customFields ?? []).filter(
      isSimpleCustomField
    );

    if (desiredParticipantCount > currentParticipantCount) {
      const newFields: { name: string; bateriaId: string; [key: string]: string }[] = [];
      for (let i = 0; i < desiredParticipantCount - currentParticipantCount; i++) {
        const newParticipant: { name: string; bateriaId: string; [key: string]: string } = {
          name: "",
          bateriaId: "",
        };
        additionalParticipantFields.forEach((field) => {
          newParticipant[field.name] = "";
        });
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
  }, [groupSize, fields.length, append, remove, customFields]);

  async function onSubmit(values: RegistrationFormValues) {
    setIsSubmitting(true);

    let isValid = true;

    allCustomFields.forEach((field) => {
      const customValue = values.customData?.[field.name];
      if (!isRequiredCustomValueFilled(field, customValue)) {
        form.setError(`customData.${field.name}` as const, {
          type: "manual",
          message: `${field.label} é obrigatório.`,
        });
        isValid = false;
      }
    });

    values.participants.forEach((participant, pIndex) => {
      participantCustomFields.forEach((field) => {
        const participantValue = participant[field.name];
        if (field.required && (!participantValue || participantValue.trim() === "")) {
          form.setError(`participants.${pIndex}.${field.name}` as const, {
            type: "manual",
            message: `${field.label} é obrigatório.`,
          });
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
      const customDataPayload: RegistrationCustomData = {};
      allCustomFields.forEach((field) => {
        const customValue = values.customData?.[field.name];
        if (field.type === "multiselect") {
          customDataPayload[field.name] = Array.isArray(customValue)
            ? customValue
            : [];
          return;
        }

        customDataPayload[field.name] =
          typeof customValue === "string" ? customValue : "";
      });

      const participantsPayload: Record<string, string>[] = values.participants.map(
        (participant) => {
          const participantPayload: Record<string, string> = {
            name: participant.name,
          };

          participantCustomFields.forEach((field) => {
            const participantValue = participant[field.name];
            participantPayload[field.name] =
              typeof participantValue === "string" ? participantValue : "";
          });

          return participantPayload;
        }
      );

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
          p_name: values.name,
          p_email: values.email,
          p_phone: values.phone,
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

        <h3 className="text-lg font-medium">Dados do Contato Principal</h3>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome Completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço de E-mail</FormLabel>
              <FormControl>
                <Input placeholder="voce@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(99) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        {allCustomFields.map((customField) => (
          <FormField
            key={customField.name}
            control={form.control}
            name={`customData.${customField.name}`}
            render={({ field }) => {
              const label = (
                <>
                  {customField.label}
                  {customField.required && <span className="text-destructive">*</span>}
                </>
              );

              if (customField.type === "select") {
                const options = customField.options ?? [];
                const selectValue = typeof field.value === "string" ? field.value : "";

                return (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select onValueChange={field.onChange} value={selectValue}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${customField.label.toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={`${customField.name}-${option}`} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }

              if (customField.type === "multiselect") {
                const options = customField.options ?? [];
                const selectedValues = Array.isArray(field.value) ? field.value : [];

                return (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <div className="space-y-2">
                      {options.map((option) => {
                        const checked = selectedValues.includes(option);
                        return (
                          <div key={`${customField.name}-${option}`} className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                const nextValues =
                                  isChecked === true
                                    ? Array.from(new Set([...selectedValues, option]))
                                    : selectedValues.filter(
                                        (selectedValue) => selectedValue !== option
                                      );
                                field.onChange(nextValues);
                              }}
                            />
                            <span className="text-sm font-normal">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }

              const inputValue = typeof field.value === "string" ? field.value : "";

              return (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={customField.label}
                      type={customField.type}
                      name={field.name}
                      value={inputValue}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        ))}

        {fields.length > 0 && <Separator />}

        {fields.map((participantField, index) => (
          <div
            key={participantField.id}
            className="space-y-4 border-l-4 border-secondary pl-4 py-4"
          >
            <h3 className="text-lg font-medium">Dados do Participante {index + 2}</h3>
            <FormField
              control={form.control}
              name={`participants.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder={`Nome do participante ${index + 2}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {hasBaterias && bateriasState && (
              <FormField
                control={form.control}
                name={`participants.${index}.bateriaId`}
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
                          const available = computeAvailableForBateria(b.id, index);
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
            {participantCustomFields.map((customField) => (
              <FormField
                key={customField.name}
                control={form.control}
                name={`participants.${index}.${customField.name}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {customField.label}
                      {customField.required && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={customField.label}
                        type={customField.type}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        ))}

        <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
        </Button>
      </form>
    </Form>
  );
}
