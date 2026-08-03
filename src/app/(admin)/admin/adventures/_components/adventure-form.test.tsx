import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/supabase/hooks", () => ({
  useSupabase: () => ({ rpc: vi.fn(), from: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/image-upload", () => ({
  ImageUpload: () => <div />,
}));

vi.mock("@/app/(admin)/admin/adventures/_components/pix-config-dialog", () => ({
  PixConfigDialog: () => <div />,
}));

vi.mock("@/app/(admin)/admin/adventures/_components/lote-pix-field", () => ({
  LotePixField: () => <div />,
}));

import { AdventureForm } from "@/app/(admin)/admin/adventures/_components/adventure-form";

const adventureWithFields = (labels: string[]) => ({
  id: "",
  slug: "climb-adventure",
  title: "Climb Adventure",
  description: "Uma aventura de escalada ao ar livre.",
  long_description: "Uma descrição longa o suficiente para o formulário.",
  max_participants: 10,
  price: 100,
  duration: "Dia inteiro",
  location: "Serra",
  difficulty: "",
  image_url: "",
  image_description: "",
  registrations_enabled: true,
  is_enabled: true,
  has_baterias: false,
  has_lotes: false,
  image_rights_enabled: false,
  custom_fields: labels.map((label) => ({
    name: label.toLowerCase(),
    label,
    type: "text" as const,
    required: false,
  })),
  pix_config: null,
  created_at: "2026-01-01T00:00:00.000Z",
});

function getFieldLabels() {
  return screen
    .getAllByLabelText("Rótulo do Campo")
    .map((input) => (input as HTMLInputElement).value);
}

describe("AdventureForm custom fields", () => {
  it("inserts a blank field before a target and moves fields by drag handle", () => {
    render(<AdventureForm adventure={adventureWithFields(["Responsável", "Atleta"])} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar campo antes de Atleta" }));
    expect(getFieldLabels()).toEqual(["Responsável", "", "Atleta"]);

    const atletaHandle = screen.getByRole("button", { name: "Arrastar campo Atleta" });
    const responsavelHandle = screen.getByRole("button", { name: "Arrastar campo Responsável" });
    fireEvent.dragStart(atletaHandle);
    fireEvent.dragOver(responsavelHandle);
    fireEvent.drop(responsavelHandle);

    expect(getFieldLabels()).toEqual(["Atleta", "Responsável", ""]);
  });
});
