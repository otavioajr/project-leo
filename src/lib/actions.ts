"use server";

import { z } from "zod";
import { addRegistration } from "./data";
import { revalidatePath } from "next/cache";

const registrationSchema = z.object({
  name: z.string().min(2, "O nome do contato deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um endereço de e-mail válido."),
  phone: z.string().min(10, "Por favor, insira um número de telefone válido."),
  groupSize: z.coerce.number().min(1, "O grupo deve ter pelo menos 1 pessoa."),
  adventureId: z.string(),
  adventureTitle: z.string(),
  participants: z.array(
    z.object({
      name: z.string().min(2, "O nome do participante é obrigatório."),
    })
  ).optional(),
}).refine(data => {
    if (data.groupSize > 1) {
        return data.participants?.length === data.groupSize - 1 && data.participants.every(p => p.name.trim().length >= 2);
    }
    return true;
}, {
    message: "Preencha o nome de todos os participantes.",
    path: ["participants"],
});

export async function registerForAdventure(data: unknown) {
  const parsed = registrationSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Dados inválidos fornecidos. Verifique os campos do formulário." };
  }

  try {
    await addRegistration(parsed.data);
    revalidatePath("/admin/registrations");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Registration failed:", error);
    return { success: false, message: "Não foi possível concluir a inscrição." };
  }
}
