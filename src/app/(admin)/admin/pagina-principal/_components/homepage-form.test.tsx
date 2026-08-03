import { describe, expect, it } from "vitest";
import { homePageContentSchema } from "@/app/(admin)/admin/pagina-principal/_components/home-page-form";

const validHomepageContent = {
  heroTitle: "Aventuras Leo",
  heroDescription: "Descubra sua próxima aventura.",
  heroImageUrl: "https://example.com/hero.jpg",
  heroImageDescription: "Pessoa em uma aventura",
  adventuresTitle: "Aventuras",
  adventuresDescription: "Escolha sua próxima experiência.",
  facebookUrl: "",
  facebookEnabled: false,
  instagramUrl: "",
  instagramEnabled: false,
  twitterUrl: "",
  twitterEnabled: false,
};

describe("homepage WhatsApp configuration", () => {
  it("rejects an invalid nonempty WhatsApp number", () => {
    expect(homePageContentSchema.safeParse({
      ...validHomepageContent,
      whatsAppNumber: "abc",
    }).success).toBe(false);
  });

  it("accepts a valid number and an empty optional setting", () => {
    expect(homePageContentSchema.safeParse({
      ...validHomepageContent,
      whatsAppNumber: "5511999998888",
    }).success).toBe(true);
    expect(homePageContentSchema.safeParse({
      ...validHomepageContent,
      whatsAppNumber: "",
    }).success).toBe(true);
  });

  it("accepts punctuation around a valid number", () => {
    expect(homePageContentSchema.safeParse({
      ...validHomepageContent,
      whatsAppNumber: "(55) 11 99999-8888",
    }).success).toBe(true);
  });
});
