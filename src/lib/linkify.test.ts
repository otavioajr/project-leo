import { describe, expect, it } from "vitest";
import { tokenizeHttpLinks } from "@/lib/linkify";

describe("tokenizeHttpLinks", () => {
  it("tokenizes an HTTP URL and leaves sentence punctuation as text", () => {
    expect(tokenizeHttpLinks("Veja https://climb.example/regulamento.")).toEqual([
      { kind: "text", value: "Veja " },
      {
        kind: "link",
        href: "https://climb.example/regulamento",
        label: "https://climb.example/regulamento",
      },
      { kind: "text", value: "." },
    ]);
  });

  it("accepts HTTPS and preserves multiline plain text", () => {
    expect(tokenizeHttpLinks("Linha 1\nhttps://climb.example/a\nLinha 3")).toEqual([
      { kind: "text", value: "Linha 1\n" },
      { kind: "link", href: "https://climb.example/a", label: "https://climb.example/a" },
      { kind: "text", value: "\nLinha 3" },
    ]);
  });

  it("does not turn unsupported schemes into links", () => {
    expect(tokenizeHttpLinks("javascript:alert(1) ftp://climb.example")).toEqual([
      { kind: "text", value: "javascript:alert(1) ftp://climb.example" },
    ]);
  });
});
