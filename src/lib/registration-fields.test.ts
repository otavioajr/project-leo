import assert from "node:assert/strict";
import test from "node:test";
import type { CustomField } from "./types";
import {
  buildCustomFieldPayload,
  createCustomFieldDefaults,
  filterCustomFieldsForTarget,
  isRequiredCustomValueFilled,
  resolveCustomFieldAudience,
} from "./registration-fields";

function field(overrides: Partial<CustomField>): CustomField {
  return {
    name: "campo",
    label: "Campo",
    type: "text",
    required: false,
    ...overrides,
  };
}

test("resolve o público legado sem alterar o comportamento atual", () => {
  assert.equal(resolveCustomFieldAudience(field({ type: "text" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "email" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "tel" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "number" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "tshirt_size" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "select" })), "primary");
  assert.equal(resolveCustomFieldAudience(field({ type: "multiselect" })), "primary");
});

test("público explícito prevalece sobre o fallback do tipo", () => {
  assert.equal(
    resolveCustomFieldAudience(field({ type: "select", audience: "additional" })),
    "additional"
  );
  assert.equal(
    resolveCustomFieldAudience(field({ type: "text", audience: "primary" })),
    "primary"
  );
});

test("filtra campos para contato principal e participantes adicionais", () => {
  const fields = [
    field({ name: "principal", audience: "primary" }),
    field({ name: "adicionais", audience: "additional" }),
    field({ name: "todos", audience: "all" }),
    field({ name: "selecao_legada", type: "select" }),
    field({ name: "texto_legado", type: "text" }),
  ];

  assert.deepEqual(
    filterCustomFieldsForTarget(fields, "primary").map((item) => item.name),
    ["principal", "todos", "selecao_legada", "texto_legado"]
  );
  assert.deepEqual(
    filterCustomFieldsForTarget(fields, "additional").map((item) => item.name),
    ["adicionais", "todos", "texto_legado"]
  );
});

test("cria defaults compatíveis com campos simples e multiselect", () => {
  assert.deepEqual(
    createCustomFieldDefaults([
      field({ name: "nome", type: "text" }),
      field({ name: "preferencias", type: "multiselect" }),
    ]),
    { nome: "", preferencias: [] }
  );
});

test("valida obrigatoriedade de string e seleção múltipla", () => {
  assert.equal(isRequiredCustomValueFilled(field({ required: false }), undefined), true);
  assert.equal(isRequiredCustomValueFilled(field({ required: true }), "  "), false);
  assert.equal(isRequiredCustomValueFilled(field({ required: true }), "ok"), true);
  assert.equal(
    isRequiredCustomValueFilled(field({ type: "multiselect", required: true }), []),
    false
  );
  assert.equal(
    isRequiredCustomValueFilled(
      field({ type: "multiselect", required: true }),
      ["", "Trilha"]
    ),
    true
  );
});

test("monta payload apenas com os campos recebidos e preserva arrays", () => {
  const fields = [
    field({ name: "nome", type: "text" }),
    field({ name: "preferencias", type: "multiselect" }),
  ];

  assert.deepEqual(
    buildCustomFieldPayload(fields, {
      nome: "Ana",
      preferencias: ["Manhã", "Tarde"],
      campo_de_outro_publico: "não copiar",
    }),
    { nome: "Ana", preferencias: ["Manhã", "Tarde"] }
  );
});
