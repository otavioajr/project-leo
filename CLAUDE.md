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
