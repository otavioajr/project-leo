# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Adventure booking platform ("Leo Chaves Adventure") built with Next.js 15 (App Router) and Supabase. All user-facing text is in **Brazilian Portuguese (pt-BR)**.

**Note:** AGENTS.md is outdated — it references Firebase, but the project has been fully migrated to Supabase. Ignore Firebase references in that file.

## Commands

```bash
npm run dev          # Dev server on port 9002 (Turbopack)
npm run build        # Production build (NODE_ENV=production)
npm run lint         # ESLint via Next.js
npm run typecheck    # TypeScript strict checking (tsc --noEmit)
npm run genkit:dev   # Genkit AI dev server
```

No test framework is configured. There are no tests.

## Architecture

### Tech Stack

- **Next.js 15** with App Router, TypeScript strict mode, Turbopack
- **Supabase** (PostgreSQL + Auth + Storage + Realtime) — migrated from Firebase
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix-based) for UI components
- **React Hook Form + Zod** for forms and validation
- **Genkit** with Google GenAI (Gemini) for AI features

### Route Groups

- `src/app/(auth)/` — Login and password change pages (minimal layout)
- `src/app/(main)/` — Public-facing pages with Header + Footer via `HeaderProvider`
- `src/app/admin/` — Admin dashboard with sidebar nav, protected by `useIsAdmin()` check

### Supabase Layer (`src/supabase/`)

This is the data layer — **not** `src/firebase/` (which no longer exists):

- `provider.tsx` — `SupabaseProvider` context wrapping root layout
- `config.ts` — Singleton Supabase client creation
- `hooks.ts` — `useSupabase()`, `useUser()`, `useIsAdmin()` (checks `app_metadata.is_admin`)
- `use-collection.ts` — Realtime collection subscriptions: `useCollection<T>(table, options)`
- `use-doc.ts` — Realtime single-document subscriptions: `useDoc<T>(table, id)`

### Database Schema (PostgreSQL via Supabase)

Key tables: `adventures`, `registrations`, `content` (JSONB for homepage/PIX config), `pages` (CMS). Admin access determined by `is_admin()` SQL function checking `auth.jwt() -> 'app_metadata' -> 'is_admin'`. RLS is enabled on all tables.

### Types

All shared types live in `src/lib/types.ts` (`Adventure`, `Registration`, `HomePageContent`, `Page`, etc.).

### Theming & Fonts

CSS variables defined in `src/app/globals.css` for light/dark modes. Font families:
- `font-body` (Open Sans), `font-headline` (Sora), `font-brand` (ZCOOL KuaiLe), `font-adventure` (Ketimun)

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Key Conventions

- **shadcn/ui components** in `src/components/ui/` — do not modify directly
- Components use `"use client"` directive when needed; prefer named exports
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Use `type` keyword (not `interface`) for data shapes
- Component sub-pieces go in `_components/` folders within route directories
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.local.example`)
- Supabase migrations in `supabase/migrations/` — numbered sequentially

## Cursor Cloud specific instructions

### Serviços

| Serviço | Obrigatório | Como iniciar |
|---|---|---|
| Next.js dev server | Sim | `npm run dev` → http://localhost:9002 |
| Supabase (hosted) | Sim | Projeto remoto `project-leo` (`iyvtoeoeytueoeromdwi`, região `sa-east-1`); sem docker-compose nem stack local no repositório |
| Genkit AI | Não | `npm run genkit:dev` (não usado pela UI atual) |

### Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha com a URL e a chave anon do projeto Supabase. O app falha na inicialização se `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` estiverem ausentes. Use o MCP Supabase (`get_project_url`, `get_publishable_keys`) ou o dashboard do Supabase para obter os valores.

### Verificação local

- Lint: `npm run lint` (apenas warnings conhecidos em `adventure-form.tsx` e `layout.tsx`)
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Não há framework de testes configurado

### Fluxo público para validar o ambiente

1. `npm run dev`
2. Abrir http://localhost:9002 — homepage com listagem de aventuras (dados do Supabase)
3. Clicar em uma aventura (ex.: `/adventures/escalada-em-familia`) — página de detalhe com preço, local e status de vagas

### Admin

Login em `/login` exige usuário Supabase Auth com `app_metadata.is_admin = true`. Sem credenciais de admin, valide apenas o fluxo público acima.
