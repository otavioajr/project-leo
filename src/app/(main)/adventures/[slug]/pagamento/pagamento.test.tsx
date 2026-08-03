import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const testState = vi.hoisted(() => {
  const adventureQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  adventureQuery.select.mockReturnValue(adventureQuery);
  adventureQuery.eq.mockReturnValue(adventureQuery);
  adventureQuery.maybeSingle.mockResolvedValue({
    data: {
      id: "adventure-1",
      pix_config: {
        pixEnabled: true,
        pixCopiaECola: { 1: "pix-copy", 2: "", 3: "", 4: "" },
      },
    },
    error: null,
  });

  const supabase = {
    from: vi.fn().mockReturnValue(adventureQuery),
    rpc: vi.fn().mockResolvedValue({
      data: [{
        id: "registration-1",
        registration_token: "secret-token",
        adventure_title: "Climb Adventure",
        group_size: 1,
        total_amount: 100,
        payment_status: "pending",
      }],
      error: null,
    }),
  };

  return { supabase };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("registrationId=registration-1&token=secret-token"),
  useParams: () => ({ slug: "climb-adventure" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", { ...props, alt: props.alt ?? "" }),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") },
}));

vi.mock("@/supabase/hooks", () => ({
  useSupabase: () => testState.supabase,
}));

vi.mock("@/supabase/use-doc", () => ({
  useDoc: () => ({
    data: { id: "homepage", data: { whatsAppNumber: "5511999998888" } },
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import PagamentoPage from "@/app/(main)/adventures/[slug]/pagamento/page";

describe("PagamentoPage payment method selection", () => {
  it("lets the registrant choose card and opens WhatsApp without confirming payment", async () => {
    render(<PagamentoPage />);

    expect(await screen.findByRole("button", { name: "Pagar por PIX" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Pagar com cartão" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Pagar com cartão" }));

    const whatsappLink = await screen.findByRole("link", { name: /Falar com Leo no WhatsApp/i });
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/5511999998888"));
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(testState.supabase.rpc).not.toHaveBeenCalledWith(
      "confirm_payment_by_token",
      expect.anything(),
    );
  });

  it("returns from card contact to the PIX choice without changing registration state", async () => {
    render(<PagamentoPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Pagar com cartão" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para opções de pagamento" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pagar por PIX" })).toBeVisible();
    });
    expect(testState.supabase.rpc).not.toHaveBeenCalledWith(
      "confirm_payment_by_token",
      expect.anything(),
    );
  });
});
