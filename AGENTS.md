# AGENTS.md - AI Coding Agent Guidelines

This document provides guidelines for AI agents working on the **leochaves-adventure** project.

## Project Overview

A Next.js 15 adventure booking platform with Firebase backend and AI capabilities.

**Tech Stack:**
- Next.js 15 (App Router, Turbopack)
- TypeScript 5 (strict mode)
- Tailwind CSS 3.4 + shadcn/ui (Radix-based components)
- Firebase (Firestore, Authentication)
- Genkit AI with Google GenAI (Gemini 2.5 Flash)
- React Hook Form + Zod for form validation
- Recharts for data visualization

---

## Build, Lint, and Development Commands

```bash
# Development server (port 9002)
npm run dev

# Production build
npm run build

# Linting (ESLint via Next.js)
npm run lint

# TypeScript type checking
npm run typecheck

# Genkit AI development server
npm run genkit:dev

# Genkit with file watching
npm run genkit:watch
```

**Note:** This project has no test framework configured. There are no test files.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard (protected)
│   ├── adventures/[slug]/  # Adventure detail pages
│   ├── login/              # Authentication page
│   ├── pages/[slug]/       # Dynamic content pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles & CSS variables
├── components/
│   ├── ui/                 # shadcn/ui components (DO NOT MODIFY)
│   └── layout/             # Header, Footer
├── firebase/               # Firebase config, hooks, providers
├── hooks/                  # Custom React hooks
├── lib/
│   ├── types.ts            # Centralized TypeScript types
│   └── utils.ts            # Utility functions (cn helper)
└── ai/                     # Genkit AI configuration
```

---

## Code Style Guidelines

### TypeScript & Types

- **Strict mode is enabled** - all code must be type-safe
- Define shared types in `src/lib/types.ts`
- Use `type` keyword for type aliases (not `interface` for data shapes)
- Prefer explicit return types for exported functions

```typescript
// Types use PascalCase
export type Adventure = {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Fácil' | 'Moderado' | 'Desafiador';
};

// Props types follow ComponentNameProps pattern
type AdventureCardProps = {
  adventure: Adventure;
};
```

### Import Conventions

- Use path alias `@/*` which maps to `./src/*`
- Order imports: React/Next → external libs → internal modules → types
- Use `type` imports for type-only imports

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useFirebase, useCollection } from "@/firebase";
import type { Adventure } from "@/lib/types";
```

### Component Patterns

- Use function components with named exports
- Add `"use client"` directive at top for client components
- Place component-specific subcomponents in `_components/` folders

```typescript
"use client";

export function AdventureCard({ adventure }: AdventureCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {/* ... */}
    </Card>
  );
}
```

### Styling with Tailwind CSS

- Use the `cn()` utility from `@/lib/utils` for conditional classes
- Follow shadcn/ui patterns for component styling
- Use CSS variables defined in `globals.css` for theming
- Available font families: `font-body`, `font-headline`, `font-brand`, `font-adventure`

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "transition-colors hover:text-primary",
  isActive ? "text-primary font-semibold" : "text-muted-foreground"
)} />
```

### Form Handling

- Use React Hook Form with Zod schemas
- Define schemas inline in form components
- Use zodResolver for validation

```typescript
const adventureSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  price: z.coerce.number().min(0, "O preço deve ser positivo."),
});

type FormValues = z.infer<typeof adventureSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(adventureSchema),
  defaultValues: { title: "", price: 0 },
});
```

### Firebase & State Management

- **CRITICAL:** Always memoize Firestore queries with `useMemoFirebase`
- Use `useCollection<T>` for collection subscriptions
- Use `useDoc<T>` for document subscriptions
- Access Firebase via `useFirebase()` or `useFirestore()` hooks

```typescript
const firestore = useFirestore();

// REQUIRED: Memoize queries to prevent infinite re-renders
const adventuresQuery = useMemoFirebase(
  () => collection(firestore, 'adventures'),
  [firestore]
);

const { data: adventures, isLoading } = useCollection<Adventure>(adventuresQuery);
```

### Error Handling

- Use try/catch for async operations
- Log errors with `console.error`
- Show user feedback via toast notifications
- Use `FirestorePermissionError` for Firebase permission errors

```typescript
try {
  await setDoc(docRef, data);
  toast({ title: "Sucesso", description: "Dados salvos." });
} catch (error) {
  console.error("Failed to save:", error);
  toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
}
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | kebab-case | `adventure-card.tsx` |
| Files (pages) | kebab-case in folders | `app/admin/adventures/page.tsx` |
| Components | PascalCase | `AdventureCard` |
| Hooks | camelCase with `use` prefix | `useIsAdmin` |
| Types | PascalCase | `Adventure`, `HomePageContent` |
| Constants | SCREAMING_SNAKE_CASE | `TOAST_LIMIT` |
| Functions | camelCase | `createSlug`, `handleDelete` |
| CSS classes | Tailwind utilities | `text-primary`, `font-headline` |

---

## UI Components (shadcn/ui)

Components in `src/components/ui/` are from shadcn/ui. **Do not modify these directly.**

Common components:
- `Button`, `Input`, `Textarea`, `Select`
- `Card`, `Dialog`, `Sheet`, `AlertDialog`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `Skeleton` for loading states
- `Toast` / `useToast` for notifications

---

## Localization

**All user-facing text is in Brazilian Portuguese (pt-BR).**

Examples:
- "Salvar" (Save), "Excluir" (Delete), "Cancelar" (Cancel)
- "Aventura" (Adventure), "Inscrição" (Registration)
- Difficulty levels: "Fácil", "Moderado", "Desafiador"

---

## Important Notes

1. **No tests exist** - be extra careful with changes
2. **Firebase config** is in `src/firebase/config.ts` - do not commit sensitive keys
3. **Admin routes** (`/admin/*`) require authentication
4. **Genkit AI** config is in `src/ai/genkit.ts`
5. **Next.js Image** component requires explicit `sizes` prop for responsive images
6. **Slugs** are auto-generated from titles using `createSlug()` function
