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
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import type { CustomField } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const participantSchema = z.object({
  name: z.string().min(2, "O nome do participante é obrigatório."),
}).catchall(z.string());

const registrationSchema = z.object({
  name: z.string().min(2, "O nome do contato deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um endereço de e-mail válido."),
  phone: z.string().min(10, "Por favor, insira um número de telefone válido."),
  groupSize: z.coerce.number().min(1, "O grupo deve ter pelo menos 1 pessoa."),
  customData: z.record(z.string()).optional(),
  participants: z.array(participantSchema),
});


type RegistrationFormValues = z.infer<typeof registrationSchema>;

type RegistrationFormProps = {
  adventureId: string;
  adventureTitle: string;
  adventureSlug: string;
  adventurePrice: number;
  customFields?: CustomField[];
};

export function RegistrationForm({ adventureId, adventureTitle, adventureSlug, adventurePrice, customFields }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const router = useRouter();

  const initialCustomData: Record<string, string> = {};
  customFields?.forEach(field => {
    initialCustomData[field.name] = "";
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      groupSize: 1,
      customData: initialCustomData,
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
      const newFields: { name: string; [key: string]: string }[] = [];
      for (let i = 0; i < desiredParticipantCount - currentParticipantCount; i++) {
        const newParticipant: { name: string; [key: string]: string } = { name: "" };
        customFields?.forEach(field => {
            newParticipant[field.name] = "";
        });
        newFields.push(newParticipant);
      }
      append(newFields);
    } else if (desiredParticipantCount < currentParticipantCount) {
        remove(Array.from({ length: currentParticipantCount - desiredParticipantCount }, (_, i) => desiredParticipantCount + i));
    }
  }, [groupSize, fields.length, append, remove, customFields]);


  async function onSubmit(values: RegistrationFormValues) {
    setIsSubmitting(true);
    
    // Manual validation for required custom fields
    let isValid = true;
    
    // Validar campos customizados do contato principal
    customFields?.forEach(cf => {
      if (cf.required && !values.customData?.[cf.name]) {
        form.setError(`customData.${cf.name}`, {
          type: 'manual',
          message: `${cf.label} é obrigatório.`
        });
        isValid = false;
      }
    });
    
    // Validar campos customizados dos participantes adicionais
    values.participants.forEach((participant, pIndex) => {
        customFields?.forEach(cf => {
            if (cf.required && !participant[cf.name]) {
                form.setError(`participants.${pIndex}.${cf.name}`, {
                    type: 'manual',
                    message: `${cf.label} é obrigatório.`
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

    try {
      const totalAmount = adventurePrice * values.groupSize;
      
      const docRef = await addDoc(collection(firestore, "registrations"), {
        ...values,
        adventureId,
        adventureTitle,
        registrationDate: serverTimestamp(),
        paymentStatus: "pending",
        totalAmount,
        registrationToken: crypto.randomUUID(),
      });

      // Redirecionar para página de pagamento
      const registrationDoc = await getDoc(docRef);
      const token = registrationDoc.data()?.registrationToken;
      router.push(`/adventures/${adventureSlug}/pagamento?registrationId=${docRef.id}&token=${token}`);
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Falha na Inscrição",
        description: "Algo deu errado. Por favor, tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
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
        {customFields?.map((customField) => (
          <FormField
            key={customField.name}
            control={form.control}
            name={`customData.${customField.name}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{customField.label}{customField.required && <span className="text-destructive">*</span>}</FormLabel>
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

        {fields.length > 0 && <Separator />}

        {fields.map((participantField, index) => (
           <div key={participantField.id} className="space-y-4 border p-4 rounded-lg bg-muted/50">
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
            {customFields?.map((customField) => (
                <FormField
                    key={customField.name}
                    control={form.control}
                    name={`participants.${index}.${customField.name}`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{customField.label}{customField.required && <span className="text-destructive">*</span>}</FormLabel>
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

        <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
        </Button>
      </form>
    </Form>
  );
}
