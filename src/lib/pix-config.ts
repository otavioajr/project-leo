import type { PixConfig, PixCopiaEColaByGroupSize } from "@/lib/types";

const EMPTY_BY_GROUP_SIZE: PixCopiaEColaByGroupSize = {
  1: "",
  2: "",
  3: "",
  4: "",
};

export function normalizePixConfig(raw: unknown): PixConfig {
  const data = (raw ?? {}) as Record<string, unknown>;
  const pix = data.pixCopiaECola;

  let pixCopiaECola: PixCopiaEColaByGroupSize;

  if (typeof pix === "string") {
    pixCopiaECola = { ...EMPTY_BY_GROUP_SIZE, 1: pix };
  } else if (pix && typeof pix === "object") {
    const obj = pix as Record<string, unknown>;
    pixCopiaECola = {
      1: typeof obj["1"] === "string" ? (obj["1"] as string) : "",
      2: typeof obj["2"] === "string" ? (obj["2"] as string) : "",
      3: typeof obj["3"] === "string" ? (obj["3"] as string) : "",
      4: typeof obj["4"] === "string" ? (obj["4"] as string) : "",
    };
  } else {
    pixCopiaECola = { ...EMPTY_BY_GROUP_SIZE };
  }

  return {
    pixCopiaECola,
    pixEnabled: Boolean(data.pixEnabled),
    instructions: typeof data.instructions === "string" ? (data.instructions as string) : undefined,
  };
}
