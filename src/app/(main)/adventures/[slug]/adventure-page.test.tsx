import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

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
      slug: "climb-adventure",
      title: "Climb Adventure",
      description: "Uma aventura de escalada ao ar livre.",
      long_description: "Confira https://climb.example/apresentacao.\n<b>texto</b>\njavascript:alert(1)",
      max_participants: 10,
      price: 100,
      duration: "Dia inteiro",
      location: "Serra",
      difficulty: "",
      image_url: "",
      image_description: "",
      registrations_enabled: false,
      has_baterias: false,
      has_lotes: false,
      image_rights_enabled: false,
      custom_fields: [],
      created_at: "2026-01-01T00:00:00.000Z",
    },
    error: null,
  });

  return {
    supabase: {
      from: vi.fn().mockReturnValue(adventureQuery),
      rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
    },
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "climb-adventure" }),
}));

vi.mock("@/supabase/hooks", () => ({
  useSupabase: () => testState.supabase,
}));

vi.mock("@/components/layout/header-context", () => ({
  useHeaderTransparent: () => ({ setTransparent: vi.fn() }),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
}));

import AdventurePage from "@/app/(main)/adventures/[slug]/page";

describe("AdventurePage long description", () => {
  it("renders only HTTP(S) URLs as safe external links", async () => {
    render(<AdventurePage />);

    const link = await screen.findByRole("link", { name: "https://climb.example/apresentacao" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
    expect(screen.queryByRole("link", { name: /javascript:/i })).not.toBeInTheDocument();
    expect(screen.getByText("<b>texto</b>")).toBeInTheDocument();
  });
});
