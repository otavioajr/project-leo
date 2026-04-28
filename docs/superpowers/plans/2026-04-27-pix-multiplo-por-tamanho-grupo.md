# Múltiplas Chaves PIX por Tamanho de Grupo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin cadastre até 4 chaves PIX (uma por tamanho de grupo, x1 a x4) e que a página de pagamento selecione automaticamente a chave correspondente ao `group_size` da inscrição.

**Architecture:** O `PixConfig` armazenado em `content` id='pix' (JSONB no Supabase) muda de `pixCopiaECola: string` para `pixCopiaECola: { 1, 2, 3, 4 }`. Um shim de leitura converte o formato antigo em memória, sem migration SQL. O form admin replica 4 cards de copia-e-cola; o form de inscrição limita `groupSize` em 4; a página de pagamento seleciona o slot e mostra erro se vazio.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React Hook Form + Zod, Supabase JS client, qrcode.

**Spec:** `docs/superpowers/specs/2026-04-27-pix-multiplo-por-tamanho-grupo-design.md`

**Sem framework de testes:** o projeto não tem testes automatizados (`npm run typecheck` e `npm run lint` substituem). Cada task valida via tsc/eslint e verificação manual no final.

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/types.ts` | Modificar | Atualizar `PixConfig` para o novo formato |
| `src/lib/pix-config.ts` | Criar | `normalizePixConfig()` shim de leitura |
| `src/app/(admin)/admin/configuracao-pix/_components/pix-config-form.tsx` | Modificar | 4 cards de copia-e-cola com previews |
| `src/app/(admin)/admin/configuracao-pix/page.tsx` | Modificar (se aplicável) | Aplicar shim ao carregar config existente |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Modificar | `.max(4)` no `groupSizeSchema` |
| `src/app/(main)/adventures/[slug]/pagamento/page.tsx` | Modificar | Selecionar slot por `group_size`, tela de erro de slot vazio |

---

## Task 1: Atualizar tipo `PixConfig`

**Files:**
- Modify: `src/lib/types.ts:77-81`

- [ ] **Step 1: Substituir o tipo**

Trocar o bloco:

```ts
export type PixConfig = {
  pixCopiaECola: string;
  pixEnabled: boolean;
  instructions?: string;
};
```

por:

```ts
export type PixGroupSize = 1 | 2 | 3 | 4;

export type PixCopiaEColaByGroupSize = {
  1: string;
  2: string;
  3: string;
  4: string;
};

export type PixConfig = {
  pixCopiaECola: PixCopiaEColaByGroupSize;
  pixEnabled: boolean;
  instructions?: string;
};
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: erros nos 2 arquivos que ainda usam `pixConfig.pixCopiaECola` como string (`pix-config-form.tsx` e `pagamento/page.tsx`). Esses serão corrigidos nas próximas tasks. **Não comitar ainda** — manter o branch só com tipo + shim no próximo commit.

---

## Task 2: Criar shim `normalizePixConfig`

**Files:**
- Create: `src/lib/pix-config.ts`

- [ ] **Step 1: Escrever o módulo**

```ts
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
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: ainda falha nos consumidores antigos (será resolvido nas próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/pix-config.ts
git commit -m "feat(pix): tipo multi-slot e shim de normalizacao"
```

---

## Task 3: Atualizar form admin para 4 slots

**Files:**
- Modify: `src/app/(admin)/admin/configuracao-pix/_components/pix-config-form.tsx`

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Reescrever o componente inteiro com este conteúdo:

```tsx
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useSupabase } from "@/supabase/hooks";
import type { PixConfig, PixGroupSize } from "@/lib/types";
import QRCode from "qrcode";
import Image from "next/image";

const GROUP_SIZES: PixGroupSize[] = [1, 2, 3, 4];

const pixConfigSchema = z
  .object({
    pixCopiaECola: z.object({
      1: z.string().default(""),
      2: z.string().default(""),
      3: z.string().default(""),
      4: z.string().default(""),
    }),
    pixEnabled: z.boolean(),
    instructions: z.string().optional(),
  })
  .refine(
    (v) =>
      !v.pixEnabled ||
      Object.values(v.pixCopiaECola).some((s) => s.trim().length > 0),
    {
      message: "Cadastre ao menos uma chave PIX para ativar o pagamento.",
      path: ["pixEnabled"],
    }
  );

type PixConfigFormValues = z.infer<typeof pixConfigSchema>;

type PixConfigFormProps = {
  config: PixConfig;
};

function groupSizeLabel(size: PixGroupSize) {
  return size === 1 ? "PIX para 1 pessoa" : `PIX para ${size} pessoas`;
}

function PixSlotCard({
  size,
  value,
  onChange,
}: {
  size: PixGroupSize;
  value: string;
  onChange: (next: string) => void;
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value && value.trim()) {
      QRCode.toDataURL(value, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url) => setQrPreview(url))
        .catch(() => setQrPreview(null));
    } else {
      setQrPreview(null);
    }
  }, [value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{groupSizeLabel(size)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Textarea
          placeholder={`Cole aqui o codigo PIX copia e cola para ${size} ${
            size === 1 ? "pessoa" : "pessoas"
          }...`}
          className="min-h-[120px] font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center justify-center">
          {qrPreview ? (
            <Image
              src={qrPreview}
              alt={`QR Code PIX ${size}`}
              width={160}
              height={160}
              className="rounded-lg border"
            />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Sem chave cadastrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PixConfigForm({ config }: PixConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = useSupabase();

  const form = useForm<PixConfigFormValues>({
    resolver: zodResolver(pixConfigSchema),
    defaultValues: {
      pixCopiaECola: {
        1: config.pixCopiaECola?.[1] ?? "",
        2: config.pixCopiaECola?.[2] ?? "",
        3: config.pixCopiaECola?.[3] ?? "",
        4: config.pixCopiaECola?.[4] ?? "",
      },
      pixEnabled: config.pixEnabled || false,
      instructions: config.instructions || "",
    },
  });

  async function onSubmit(values: PixConfigFormValues) {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("content")
        .upsert({ id: "pix", data: values });
      if (error) throw error;

      toast({
        title: "Configuracao Salva",
        description:
          "As configuracoes do PIX foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Failed to save PIX config:", error);
      toast({
        title: "Erro ao Salvar",
        description:
          "Nao foi possivel salvar as configuracoes. Tente novamente.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="pixEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Ativar Pagamento PIX
                </FormLabel>
                <FormDescription>
                  Quando ativado, os clientes serao direcionados para a pagina
                  de pagamento apos a inscricao.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {GROUP_SIZES.map((size) => (
            <FormField
              key={size}
              control={form.control}
              name={`pixCopiaECola.${size}` as const}
              render={({ field }) => (
                <FormItem>
                  <PixSlotCard
                    size={size}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instrucoes Adicionais (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Apos realizar o pagamento, aguarde a confirmacao por e-mail..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Texto adicional que sera exibido na pagina de pagamento para
                orientar o cliente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Configuracoes"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Verificar import de Card**

Run: `ls src/components/ui/card.tsx`
Expected: arquivo existe (já é usado em outros lugares do projeto). Se não existir, ajustar import.

- [ ] **Step 3: Verificar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros neste arquivo. Pode haver erros remanescentes em `pagamento/page.tsx` (próxima task).

---

## Task 4: Aplicar shim na page do admin

**Files:**
- Modify: `src/app/(admin)/admin/configuracao-pix/page.tsx`

- [ ] **Step 1: Inspecionar a page**

Run: `cat src/app/\(admin\)/admin/configuracao-pix/page.tsx`
Expected: a page lê o `content` id='pix' e passa um `config` para o `PixConfigForm`. Identificar exatamente onde o objeto bruto é convertido.

- [ ] **Step 2: Importar e aplicar `normalizePixConfig`**

No ponto onde a config é entregue ao `PixConfigForm`, envolver com `normalizePixConfig(...)`. Importar com:

```ts
import { normalizePixConfig } from "@/lib/pix-config";
```

E substituir o passo `config={data?.data as PixConfig}` (ou equivalente) por:

```ts
config={normalizePixConfig(data?.data)}
```

Se a page já trata "config inexistente" com um objeto default, remover esse default (o shim já cobre `null`/`undefined`).

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: arquivo da page sem erros relativos a `PixConfig`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(admin\)/admin/configuracao-pix/
git commit -m "feat(pix): admin com 4 slots por tamanho de grupo"
```

---

## Task 5: Limitar `groupSize` a 4 no formulário de inscrição

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx:71-79`

- [ ] **Step 1: Adicionar `.max(4)` ao schema**

Localizar o bloco:

```ts
function createRegistrationSchema(remainingSpots: number | null) {
  let groupSizeSchema = z.coerce.number().int("Use um número inteiro.").min(1, "O grupo deve ter pelo menos 1 pessoa.");

  if (remainingSpots !== null) {
    groupSizeSchema = groupSizeSchema.max(
      remainingSpots,
      `Restam apenas ${remainingSpots} ${remainingSpots === 1 ? "vaga" : "vagas"} para esta aventura.`
    );
  }
```

Substituir por:

```ts
const PIX_MAX_GROUP_SIZE = 4;

function createRegistrationSchema(remainingSpots: number | null) {
  let groupSizeSchema = z
    .coerce.number()
    .int("Use um número inteiro.")
    .min(1, "O grupo deve ter pelo menos 1 pessoa.")
    .max(PIX_MAX_GROUP_SIZE, `O grupo pode ter no máximo ${PIX_MAX_GROUP_SIZE} pessoas.`);

  if (remainingSpots !== null) {
    groupSizeSchema = groupSizeSchema.max(
      remainingSpots,
      `Restam apenas ${remainingSpots} ${remainingSpots === 1 ? "vaga" : "vagas"} para esta aventura.`
    );
  }
```

(`PIX_MAX_GROUP_SIZE` fica como `const` no topo do módulo. Se já existir constante similar, usar essa em vez de criar nova.)

- [ ] **Step 2: Verificar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/_components/registration-form.tsx
git commit -m "feat(pix): limita inscricao a 4 pessoas por grupo"
```

---

## Task 6: Selecionar slot na página de pagamento

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

- [ ] **Step 1: Aplicar shim ao carregar `pixConfig`**

Localizar o `useEffect` que faz `setPixConfig(data.data as PixConfig)` (linhas ~52-62) e trocar para usar o shim:

```tsx
import { normalizePixConfig } from "@/lib/pix-config";
// ...
useEffect(() => {
  supabase
    .from('content')
    .select('data')
    .eq('id', 'pix')
    .single()
    .then(({ data }) => {
      setPixConfig(normalizePixConfig(data?.data));
      setIsLoadingPixConfig(false);
    });
}, [supabase]);
```

- [ ] **Step 2: Derivar copia-e-cola do slot correto**

Substituir os usos diretos de `pixConfig.pixCopiaECola` (string) na geração do QR e no copy. No topo do componente, após carregar `registration` e `pixConfig`, calcular:

```tsx
const groupSizeSlot = ((registration?.group_size ?? 0) >= 1 && (registration?.group_size ?? 0) <= 4
  ? (registration!.group_size as 1 | 2 | 3 | 4)
  : null);

const pixCopiaECola =
  pixConfig && groupSizeSlot ? pixConfig.pixCopiaECola[groupSizeSlot] : "";
```

Substituir todas as referências a `pixConfig.pixCopiaECola` (linhas ~66, ~88, ~306) por `pixCopiaECola` (a variável derivada).

- [ ] **Step 3: Atualizar o `useEffect` do QR Code**

Trocar:

```tsx
useEffect(() => {
  if (pixConfig?.pixCopiaECola) {
    QRCode.toDataURL(pixConfig.pixCopiaECola, { ... })
```

por:

```tsx
useEffect(() => {
  if (pixCopiaECola) {
    QRCode.toDataURL(pixCopiaECola, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Failed to generate QR Code:", err));
  } else {
    setQrCodeUrl(null);
  }
}, [pixCopiaECola]);
```

- [ ] **Step 4: Adicionar tela de erro de slot vazio**

Logo após o bloco que trata `!pixConfig?.pixEnabled || !pixConfig?.pixCopiaECola` (atual linhas 203-227), adicionar um novo branch — antes desse bloco, ajustar a condição existente para usar apenas `!pixConfig?.pixEnabled` (a verificação de string foi movida para o slot). Em seguida, adicionar:

```tsx
if (!pixCopiaECola) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">PIX Indisponível</CardTitle>
          <CardDescription>
            Não há chave PIX cadastrada para um grupo de {registration.group_size}{" "}
            {registration.group_size === 1 ? "pessoa" : "pessoas"}. Entre em contato
            com o organizador para concluir o pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-20 w-20 text-destructive" />
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={`/adventures/${slug}`}>Voltar para Aventura</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

A condição da tela "Inscrição Realizada" passa a ser apenas `if (!pixConfig?.pixEnabled)`.

- [ ] **Step 5: Verificar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros em todo o projeto.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/pagamento/page.tsx
git commit -m "feat(pix): seleciona slot por tamanho de grupo na pagina de pagamento"
```

---

## Task 7: Verificação manual end-to-end

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`
Expected: server na porta 9002.

- [ ] **Step 2: Validar admin**

Em `/admin/configuracao-pix`:
1. Abrir a página: deve carregar sem erros (shim converte config antiga, se existir).
2. Cadastrar valores no slot 1 e 2, deixar 3 vazio, cadastrar 4. Confirmar que cada card mostra seu QR preview.
3. Salvar. Toast de sucesso. Recarregar a página. Os 3 valores persistem.
4. Desativar todos os slots e marcar `pixEnabled=true` → submit deve falhar com mensagem "Cadastre ao menos uma chave PIX...".

- [ ] **Step 3: Validar formulário de inscrição**

Em `/adventures/<slug>`:
1. Tentar inscrever-se com `groupSize=5`: schema bloqueia com "O grupo pode ter no máximo 4 pessoas.".
2. Inscrever-se com `groupSize=1`: completa normalmente.

- [ ] **Step 4: Validar página de pagamento — slot preenchido**

Após inscrição com `groupSize=1`, abrir o link de pagamento:
- Mostra QR + copia-e-cola do slot 1.
- Botão "Já paguei" funciona.

- [ ] **Step 5: Validar página de pagamento — slot vazio**

Inscrever-se com `groupSize=3` (slot deixado vazio na Task 7 Step 2):
- Página mostra "PIX Indisponível" com botão "Voltar para Aventura".
- Sem botão "Já paguei".

- [ ] **Step 6: Validar shim com formato antigo**

Abrir o Supabase Studio, editar `content` id='pix' e gravar manualmente o formato antigo `{ "pixCopiaECola": "TESTE_ANTIGO", "pixEnabled": true }`. Recarregar `/admin/configuracao-pix`:
- Slot 1 mostra "TESTE_ANTIGO", slots 2-4 vazios.
- Salvar normalmente regrava no formato novo.

- [ ] **Step 7: Encerrar**

Parar o dev server. Se tudo passou, branch está pronta para PR.

---

## Self-Review

**Spec coverage:**
- Modelo de dados (`PixCopiaEColaByGroupSize`) → Task 1 ✓
- Shim de compatibilidade → Task 2 ✓
- Admin com 4 cards e validação refine → Task 3 ✓
- Aplicação do shim na page do admin → Task 4 ✓
- `groupSizeSchema.max(4)` → Task 5 ✓
- Página de pagamento: 3 caminhos (desabilitado / preenchido / slot vazio) → Task 6 ✓
- Verificação manual conforme spec → Task 7 ✓

**Placeholder scan:** sem TBD/TODO/"handle edge cases". Cada step contém código ou comando concreto.

**Type consistency:** `PixConfig.pixCopiaECola` é `PixCopiaEColaByGroupSize` (objeto com chaves 1-4) em todas as tasks; `normalizePixConfig` retorna `PixConfig`; o slot é tipado como `1 | 2 | 3 | 4` na page de pagamento.
