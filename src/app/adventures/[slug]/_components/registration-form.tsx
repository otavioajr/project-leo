"use client";

import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
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
import { registerForAdventure } from "@/lib/actions";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

const registrationSchema = z.object({
  name: z.string().min(2, "O nome do contato deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um endereço de e-mail válido."),
  phone: z.string().min(10, "Por favor, insira um número de telefone válido."),
  groupSize: z.coerce.number().min(1, "O grupo deve ter pelo menos 1 pessoa."),
  participants: z.array(
    z.object({
      name: z.string().min(2, "O nome do participante deve ter pelo menos 2 caracteres."),
    })
  ),
});


type RegistrationFormValues = z.infer<typeof registrationSchema>;

type RegistrationFormProps = {
  adventureId: string;
  adventureTitle: string;
};

export function RegistrationForm({ adventureId, adventureTitle }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      groupSize: 1,
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const groupSize = form.watch("groupSize");

  useEffect(() => {
    const desiredParticipantCount = Math.max(0, groupSize - 1);
    const currentParticipantCount = fields.length;

    if (desiredParticipantCount > currentParticipantCount) {
      for (let i = 0; i < desiredParticipantCount - currentParticipantCount; i++) {
        append({ name: "" });
      }
    } else if (desiredParticipantCount < currentParticipantCount) {
        remove(Array.from({ length: currentParticipantCount - desiredParticipantCount }, (_, i) => desiredParticipantCount + i));
    }
  }, [groupSize, fields.length, append, remove]);


  async function onSubmit(values: RegistrationFormValues) {
    setIsSubmitting(true);
    const result = await registerForAdventure({
      ...values,
      adventureId,
      adventureTitle,
    });

    if (result.success) {
      toast({
        title: "Inscrição Realizada com Sucesso!",
        description: "Recebemos sua inscrição. Nos vemos na trilha!",
      });
      form.reset();
      // Reset field array manually
      remove();
    } else {
      toast({
        title: "Falha na Inscrição",
        description: result.message || "Algo deu errado. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="groupSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamanho do Grupo</FormLabel>
              <FormControl>
                <Input type="number" min="1" placeholder="1" {...field} />
              </FormControl>
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
                <Input placeholder="João Ninguém" {...field} />
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

        {fields.length > 0 && <Separator />}

        {fields.map((field, index) => (
           <div key={field.id} className="space-y-4">
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
           </div>
         ))}

        <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
        </Button>
      </form>
    </Form>
  );
}
