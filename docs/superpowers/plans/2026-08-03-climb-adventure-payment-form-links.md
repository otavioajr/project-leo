# Climb Adventure Payment, Form Fields, and Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a registrant choose PIX or manual card payment through Leo's WhatsApp, let administrators insert and reorder custom registration fields, and display web addresses in an adventure description as safe clickable links.

**Architecture:** Store the global WhatsApp destination in the existing `content/homepage` JSON document and expose it through the existing homepage admin form. Keep payment-method choice local to the already token-protected public payment page; PIX behavior remains unchanged and card builds a WhatsApp URL from the saved number. Use small pure helpers for WhatsApp URL construction and URL-token parsing so the public UI stays safe and directly testable; use React Hook Form's existing field-array API plus native drag events for field reordering.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, React Hook Form, Zod, Supabase JSONB content, Tailwind/shadcn UI, Vitest, React Testing Library.

## Global Constraints

- Preserve the existing PIX QR-code, copy-and-confirm flow for every valid PIX configuration, including lots.
- Card payment is manual: it opens WhatsApp; it creates no gateway charge, database payment method, or payment-status mutation.
- The WhatsApp number is global and editable by an administrator in the homepage configuration; accept 10–15 digits after punctuation is removed.
- Keep custom-field payloads as the existing ordered JSON array; do not migrate historical registrations or change field validation rules.
- Only HTTP and HTTPS URLs become links. Never render administrator-authored HTML.
- External links open in a new tab with `rel="noreferrer noopener"`.

---

## File Structure

- `package.json` — add the project’s test scripts and test-only dependencies.
- `vitest.config.ts` and `src/test/setup.ts` — define the browser-like unit-test environment and matcher setup.
- `src/lib/whatsapp.ts` — normalize a configured phone number and construct a safe `wa.me` URL.
- `src/lib/linkify.ts` — split plain description text into text and validated HTTP(S) URL tokens.
- `src/components/linkified-text.tsx` — render the tokens as escaped text and safe anchors while preserving line breaks.
- `src/lib/types.ts` — add the optional global WhatsApp setting to `HomePageContent`.
- `src/app/(admin)/admin/pagina-principal/_components/home-page-form.tsx` — validate, edit, and save the global WhatsApp number.
- `src/app/(main)/adventures/[slug]/pagamento/page.tsx` — load the global number, present the payment-method selection, retain PIX, and show the card contact route.
- `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` — insert blank custom fields at a chosen list position and reorder them through drag-and-drop.
- `src/app/(main)/adventures/[slug]/page.tsx` — replace raw long-description rendering with `LinkifiedText`.
- `src/lib/*.test.ts` and `src/components/*.test.tsx` — focused automated regression coverage for pure helpers and link rendering.

## Task 1: Establish focused automated tests and safe text helpers

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/whatsapp.ts`
- Create: `src/lib/whatsapp.test.ts`
- Create: `src/lib/linkify.ts`
- Create: `src/lib/linkify.test.ts`
- Create: `src/components/linkified-text.tsx`
- Create: `src/components/linkified-text.test.tsx`

**Interfaces:**
- Produces: `normalizeWhatsAppNumber(value: string): string | null`.
- Produces: `buildCardPaymentWhatsAppUrl(phone: string, adventureTitle: string): string | null`.
- Produces: `tokenizeHttpLinks(text: string): DescriptionToken[]`, where `DescriptionToken = { kind: "text"; value: string } | { kind: "link"; href: string; label: string }`.
- Produces: `LinkifiedText({ text }: { text: string }): JSX.Element`.

- [ ] **Step 1: Add the failing helper and component tests**

```ts
// src/lib/whatsapp.test.ts
expect(normalizeWhatsAppNumber("(11) 99999-8888")).toBe("11999998888");
expect(normalizeWhatsAppNumber("abc")).toBeNull();
expect(buildCardPaymentWhatsAppUrl("5511999998888", "Climb Adventure"))
  .toContain("https://wa.me/5511999998888?text=");

// src/lib/linkify.test.ts
expect(tokenizeHttpLinks("Veja https://climb.example/regulamento.")).toEqual([
  { kind: "text", value: "Veja " },
  { kind: "link", href: "https://climb.example/regulamento", label: "https://climb.example/regulamento" },
  { kind: "text", value: "." },
]);

// src/components/linkified-text.test.tsx
render(<LinkifiedText text={"Acesse https://climb.example"} />);
expect(screen.getByRole("link", { name: "https://climb.example" }))
  .toHaveAttribute("rel", "noreferrer noopener");
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- whatsapp linkify`

Expected: FAIL because the test command and helper modules do not exist yet.

- [ ] **Step 3: Add the smallest test setup and helpers**

Add `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` as development dependencies. Define the scripts `"test": "vitest run"` and `"test:watch": "vitest"`; configure the `@` alias and `jsdom` environment. Implement the helpers with these boundaries:

```ts
export function normalizeWhatsAppNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function buildCardPaymentWhatsAppUrl(phone: string, adventureTitle: string): string | null {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  const text = `Olá, quero pagar minha inscrição para ${adventureTitle} por cartão.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
```

`tokenizeHttpLinks` must use `new URL()` to accept only `http:` and `https:` values, remove sentence-ending punctuation from a candidate URL before validation, and retain it as ordinary text when invalid. `LinkifiedText` maps only `link` tokens to anchors and maps `\n` in text tokens to `<br />` elements.

- [ ] **Step 4: Run focused tests and static checks**

Run: `npm test -- whatsapp linkify && npm run typecheck && npm run lint`

Expected: PASS; valid numbers and HTTP(S) URLs work, invalid values remain unavailable/plain text, and the link renderer does not inject HTML.

- [ ] **Step 5: Commit the foundation**

```bash
git add package.json package-lock.json vitest.config.ts src/test src/lib/whatsapp.ts src/lib/whatsapp.test.ts src/lib/linkify.ts src/lib/linkify.test.ts src/components/linkified-text.tsx src/components/linkified-text.test.tsx
git commit -m "test: add payment and description helpers"
```

## Task 2: Configure Leo’s global WhatsApp number

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/(admin)/admin/pagina-principal/_components/home-page-form.tsx`
- Modify: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: `normalizeWhatsAppNumber(value: string): string | null` from `src/lib/whatsapp.ts`.
- Produces: `HomePageContent.whatsAppNumber?: string`, persisted in the existing `content` row with `id = "homepage"`.

- [ ] **Step 1: Extend the failing validation coverage**

```ts
// add to the homepage-form test or schema-focused test
expect(homePageContentSchema.safeParse({
  ...validHomepageContent,
  whatsAppNumber: "abc",
}).success).toBe(false);

expect(homePageContentSchema.safeParse({
  ...validHomepageContent,
  whatsAppNumber: "5511999998888",
}).success).toBe(true);
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- homepage-form`

Expected: FAIL because `whatsAppNumber` is not yet part of the form schema and exported test surface.

- [ ] **Step 3: Add the global configuration to the existing homepage form**

Add `whatsAppNumber?: string` to `HomePageContent`. In `homePageContentSchema`, accept an empty value or a 10–15-digit value after formatting characters are ignored; make an invalid nonempty value show `"Informe um WhatsApp válido com DDD e país, se aplicável."`. Add a clearly labelled `WhatsApp para pagamento com cartão` input under a small `Pagamento` section, initialize it from `content.whatsAppNumber ?? ""`, and save it through the existing homepage `content` upsert. Store the normalized digits on save so the public page never needs to guess the configured value.

- [ ] **Step 4: Run coverage and verify the admin flow manually**

Run: `npm test -- homepage-form whatsapp && npm run typecheck && npm run lint`

Expected: PASS. In the local app, save a formatted number in Página Principal, reload the page, and verify the stored number is retained; submit alphabetic-only content and verify the form blocks the save.

- [ ] **Step 5: Commit the configuration**

```bash
git add src/lib/types.ts src/app/'(admin)'/admin/pagina-principal/_components/home-page-form.tsx src/lib/whatsapp.test.ts
git commit -m "feat: configure WhatsApp for card payments"
```

## Task 3: Add PIX-or-card selection to the public payment page

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`
- Modify: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: `HomePageContent.whatsAppNumber` from the public `content/homepage` row.
- Consumes: `buildCardPaymentWhatsAppUrl(phone: string, adventureTitle: string): string | null`.
- Produces: local `paymentMethod: "choice" | "pix" | "card"` state; no schema or RPC change.

- [ ] **Step 1: Add failing payment-state tests**

```tsx
render(<PagamentoPage />);
expect(await screen.findByRole("button", { name: "Pagar por PIX" })).toBeVisible();
expect(screen.getByRole("button", { name: "Pagar com cartão" })).toBeVisible();

await user.click(screen.getByRole("button", { name: "Pagar com cartão" }));
expect(screen.getByRole("link", { name: /Falar com Leo no WhatsApp/i }))
  .toHaveAttribute("href", expect.stringContaining("wa.me/"));
```

- [ ] **Step 2: Run the payment test to verify it fails**

Run: `npm test -- pagamento`

Expected: FAIL because the page has no payment-method selector or WhatsApp route.

- [ ] **Step 3: Implement choice, card contact, and configuration fallback**

Load the public `content` row named `homepage` alongside the existing registration and PIX configuration. After the token check, show a choice card when both PIX and a valid WhatsApp number are available. Selecting PIX reveals the current content unchanged. Selecting card displays the registration title, a short explanation that Leo will send the card link, and an anchor/button using `buildCardPaymentWhatsAppUrl`.

Keep the existing PIX-only screen when no valid WhatsApp number exists. If PIX is unavailable but a valid WhatsApp number exists, expose only card contact; if neither is available, preserve the existing non-payment completion guidance. Do not call `confirm_payment_by_token` for card selection.

- [ ] **Step 4: Run tests, checks, and browser scenarios**

Run: `npm test -- pagamento whatsapp && npm run typecheck && npm run lint && npm run build`

Expected: PASS. Manually verify PIX with and without a lot, card with a valid number, a missing number, an invalid token, and an already-confirmed PIX registration.

- [ ] **Step 5: Commit the public payment flow**

```bash
git add src/app/'(main)'/adventures/'[slug]'/pagamento/page.tsx src/lib/whatsapp.test.ts
git commit -m "feat: offer card payment through WhatsApp"
```

## Task 4: Insert and reorder custom registration fields

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

**Interfaces:**
- Consumes: the existing `useFieldArray({ control: form.control, name: "customFields" })` collection.
- Produces: use of `insert(index, blankCustomField)` and `move(fromIndex, toIndex)`; saved `customFields` order remains the public form order.

- [ ] **Step 1: Add failing interaction coverage**

```tsx
render(<AdventureForm adventure={adventureWithFields(["responsavel", "atleta"])} />);
await user.click(screen.getByRole("button", { name: "Adicionar campo antes de atleta" }));
expect(screen.getAllByLabelText("Rótulo do Campo")).toHaveLength(3);
expect(getFieldLabels()).toEqual(["Responsável", "", "Atleta"]);

await dragField("atleta", "responsavel");
expect(getFieldLabels()).toEqual(["Atleta", "Responsável", ""]);
```

- [ ] **Step 2: Run the field-builder test to verify it fails**

Run: `npm test -- adventure-form`

Expected: FAIL because only append and remove are available and no drag handle exists.

- [ ] **Step 3: Add insertion actions and native drag-and-drop**

Destructure `insert` and `move` from the current custom-field `useFieldArray`. Define a single `createEmptyCustomField()` factory returning `{ name: "", label: "", type: "text", required: false }` so append and insert cannot diverge. Before every rendered field card, add a keyboard-accessible outline button labelled `Adicionar campo antes de <rótulo>` that calls `insert(index, createEmptyCustomField())`; retain the final append action using the same factory.

Add a visible `GripVertical` drag handle with `draggable`, a stable label, and `onDragStart`, `onDragOver`, `onDrop`, and `onDragEnd` handlers. Store only the dragged index in component state; on a valid drop over another card call `move(draggedIndex, targetIndex)`, then clear state. Do not drag nested inputs or change the custom field object keys.

- [ ] **Step 4: Run interaction coverage and verify the persisted public order**

Run: `npm test -- adventure-form && npm run typecheck && npm run lint`

Expected: PASS. In the local app, create three mixed field types, insert one between the first two, reorder with the handle, save, reload the admin editor, then open the adventure page and confirm the contact and participant forms reflect the saved applicable order.

- [ ] **Step 5: Commit the editor improvements**

```bash
git add src/app/'(admin)'/admin/adventures/_components/adventure-form.tsx
git commit -m "feat: reorder and insert registration fields"
```

## Task 5: Render long-description URLs as safe links

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`
- Modify: `src/components/linkified-text.test.tsx`

**Interfaces:**
- Consumes: `LinkifiedText({ text }: { text: string }): JSX.Element`.
- Produces: public rendering of `adventure.long_description` with only validated HTTP(S) URLs as anchors.

- [ ] **Step 1: Add the page integration assertion**

```tsx
render(<AdventurePage />);
expect(await screen.findByRole("link", { name: "https://climb.example/apresentacao" }))
  .toHaveAttribute("target", "_blank");
expect(screen.queryByRole("link", { name: /javascript:/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npm test -- adventure-page`

Expected: FAIL because the page currently renders `long_description` as one text node.

- [ ] **Step 3: Replace only the long-description text node**

Import `LinkifiedText` in the public adventure page and replace the current raw `adventure.long_description` expression with `<LinkifiedText text={adventure.long_description} />`. Keep the existing layout wrapper and typography classes. Do not change short descriptions, database values, or the admin textarea.

- [ ] **Step 4: Run complete validation and public smoke checks**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

Expected: PASS. Manually test a bare URL, URL followed by punctuation, two URLs on separate lines, an invalid scheme, and ordinary multiline copy.

- [ ] **Step 5: Commit the link rendering**

```bash
git add src/app/'(main)'/adventures/'[slug]'/page.tsx src/components/linkified-text.test.tsx
git commit -m "feat: render adventure description links"
```

## Final verification

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` from a clean checkout.
- [ ] Confirm the PIX path did not change for normal adventures and lots.
- [ ] Confirm a card selection opens only the configured WhatsApp URL and never changes payment status.
- [ ] Confirm fields can be inserted and reordered, retain all existing validation, and display in the saved order.
- [ ] Confirm URL rendering is limited to HTTP(S), preserves line breaks, and does not interpret HTML.
