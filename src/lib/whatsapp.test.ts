import { describe, expect, it } from "vitest";
import {
  buildCardPaymentWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

describe("WhatsApp helpers", () => {
  it("normalizes a formatted Brazilian number", () => {
    expect(normalizeWhatsAppNumber("(11) 99999-8888")).toBe("11999998888");
  });

  it("rejects values that do not contain a valid digit count", () => {
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
    expect(normalizeWhatsAppNumber("123456789")).toBeNull();
    expect(normalizeWhatsAppNumber("1234567890123456")).toBeNull();
  });

  it("builds an encoded card-payment WhatsApp URL", () => {
    expect(buildCardPaymentWhatsAppUrl("5511999998888", "Climb Adventure"))
      .toContain("https://wa.me/5511999998888?text=");
    expect(buildCardPaymentWhatsAppUrl("5511999998888", "Climb Adventure"))
      .toContain(encodeURIComponent("Olá, quero pagar minha inscrição para Climb Adventure por cartão."));
  });

  it("does not build a contact URL for an invalid number", () => {
    expect(buildCardPaymentWhatsAppUrl("abc", "Climb Adventure")).toBeNull();
  });
});
