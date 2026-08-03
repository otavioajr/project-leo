export function normalizeWhatsAppNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function buildCardPaymentWhatsAppUrl(
  phone: string,
  adventureTitle: string,
): string | null {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;

  const text = `Olá, quero pagar minha inscrição para ${adventureTitle} por cartão.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
