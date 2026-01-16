"use server";

import { z } from "zod";
import { saveAdventure as dbSaveAdventure, deleteAdventure as dbDeleteAdventure } from "../data";
import { revalidatePath } from "next/cache";

const adventureSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  longDescription: z.string().min(20),
  price: z.coerce.number().min(0),
  duration: z.string().min(1),
  location: z.string().min(1),
  difficulty: z.enum(["Easy", "Moderate", "Challenging"]),
  imageId: z.string().min(1),
  registrationsEnabled: z.boolean(),
});

export async function saveAdventure(data: unknown) {
  const parsed = adventureSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Invalid adventure data provided.", errors: parsed.error.issues };
  }

  try {
    const savedAdventure = await dbSaveAdventure(parsed.data);
    revalidatePath("/admin/adventures");
    revalidatePath("/");
    revalidatePath(`/adventures/${savedAdventure.slug}`);
    return { success: true, adventure: savedAdventure };
  } catch (error) {
    console.error("Failed to save adventure:", error);
    return { success: false, message: "Could not save the adventure." };
  }
}

export async function deleteAdventure(id: string) {
  if (!id) {
    return { success: false, message: "Adventure ID is required." };
  }

  try {
    await dbDeleteAdventure(id);
    revalidatePath("/admin/adventures");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete adventure:", error);
    return { success: false, message: "Could not delete the adventure." };
  }
}
