"use server";

import { z } from "zod";
import { addRegistration } from "./data";
import { revalidatePath } from "next/cache";

const registrationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  adventureId: z.string(),
  adventureTitle: z.string(),
});

export async function registerForAdventure(data: unknown) {
  const parsed = registrationSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Dados inválidos fornecidos." };
  }

  try {
    await addRegistration(parsed.data);
    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (error) {
    console.error("Registration failed:", error);
    return { success: false, message: "Não foi possível concluir a inscrição." };
  }
}
