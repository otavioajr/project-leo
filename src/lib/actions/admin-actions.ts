"use server";

import { z } from "zod";
import { saveAdventure as dbSaveAdventure, deleteAdventure as dbDeleteAdventure, saveHomePageContent as dbSaveHomePageContent, saveContentPage as dbSaveContentPage } from "../data";
import { revalidatePath } from "next/cache";
import type { ContentPage } from "../types";

const customFieldSchema = z.object({
  name: z.string().min(1, "O nome do campo é obrigatório.").regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e sublinhados (sem espaços)."),
  label: z.string().min(1, "O rótulo é obrigatório."),
  type: z.enum(['text', 'email', 'tel', 'number']),
  required: z.boolean(),
});

const adventureSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  longDescription: z.string().min(20),
  price: z.coerce.number().min(0),
  duration: z.string().min(1),
  location: z.string().min(1),
  difficulty: z.enum(["Fácil", "Moderado", "Desafiador"]),
  imageUrl: z.string().url("URL da imagem inválida."),
  imageDescription: z.string().min(1, "A descrição da imagem é obrigatória."),
  registrationsEnabled: z.boolean(),
  customFields: z.array(customFieldSchema).optional(),
});

export async function saveAdventure(data: unknown) {
  const parsed = adventureSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Dados de aventura inválidos fornecidos.", errors: parsed.error.issues };
  }

  try {
    const savedAdventure = await dbSaveAdventure(parsed.data);
    revalidatePath("/admin/adventures");
    revalidatePath("/");
    revalidatePath(`/adventures/${savedAdventure.slug}`);
    return { success: true, adventure: savedAdventure };
  } catch (error) {
    console.error("Failed to save adventure:", error);
    return { success: false, message: "Não foi possível salvar a aventura." };
  }
}

export async function deleteAdventure(id: string) {
  if (!id) {
    return { success: false, message: "O ID da aventura é obrigatório." };
  }

  try {
    await dbDeleteAdventure(id);
    revalidatePath("/admin/adventures");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete adventure:", error);
    return { success: false, message: "Não foi possível excluir a aventura." };
  }
}

const homePageContentSchema = z.object({
    heroTitle: z.string().min(1, "O título do herói é obrigatório."),
    heroDescription: z.string().min(1, "A descrição do herói é obrigatória."),
    heroImageUrl: z.string().url("A URL da imagem do herói é inválida."),
    heroImageDescription: z.string().min(1, "A descrição da imagem do herói é obrigatória."),
    adventuresTitle: z.string().min(1, "O título das aventuras é obrigatório."),
    adventuresDescription: z.string().min(1, "A descrição das aventuras é obrigatória."),
});

export async function saveHomePageContent(data: unknown) {
  const parsed = homePageContentSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Dados da página principal inválidos.", errors: parsed.error.issues };
  }

  try {
    await dbSaveHomePageContent(parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/pagina-principal");
    return { success: true };
  } catch (error) {
    console.error("Failed to save home page content:", error);
    return { success: false, message: "Não foi possível salvar o conteúdo da página principal." };
  }
}

const contentPageSchema = z.object({
    slug: z.string(),
    title: z.string().min(1, "O título é obrigatório."),
    content: z.string().min(1, "O conteúdo não pode estar vazio."),
});

export async function saveContentPage(data: unknown) {
  const parsed = contentPageSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: "Dados da página inválidos.", errors: parsed.error.issues };
  }

  try {
    const savedPage = await dbSaveContentPage(parsed.data as ContentPage);
    revalidatePath(`/admin/paginas/${savedPage.slug}`);
    revalidatePath(`/${savedPage.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to save content page:", error);
    return { success: false, message: "Não foi possível salvar a página de conteúdo." };
  }
}
