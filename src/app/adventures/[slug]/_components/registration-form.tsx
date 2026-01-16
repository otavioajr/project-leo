"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { useState } from "react";

const registrationSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um endereço de e-mail válido."),
  phone: z.string().min(10, "Por favor, insira um número de telefone válido."),
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
    },
  });

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
              <FormLabel>Número de Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(99) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
        </Button>
      </form>
    </Form>
  );
}
