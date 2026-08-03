import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkifiedText } from "@/components/linkified-text";

describe("LinkifiedText", () => {
  it("renders HTTP links as safe external anchors", () => {
    render(<LinkifiedText text={"Acesse https://climb.example"} />);

    expect(screen.getByRole("link", { name: "https://climb.example" }))
      .toHaveAttribute("href", "https://climb.example");
    expect(screen.getByRole("link", { name: "https://climb.example" }))
      .toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "https://climb.example" }))
      .toHaveAttribute("rel", "noreferrer noopener");
  });

  it("preserves line breaks without interpreting HTML", () => {
    render(<LinkifiedText text={"Linha 1\n<b>texto</b>\njavascript:alert(1)"} />);

    expect(screen.getAllByText("Linha 1")).toHaveLength(1);
    expect(screen.getByText("<b>texto</b>")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /javascript:/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll("br")).toHaveLength(2);
  });
});
