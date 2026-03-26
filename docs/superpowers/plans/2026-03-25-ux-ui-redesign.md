# UX/UI Redesign "Summit" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign completo do front-end público do CHAVES Adventure com estética moderna/aventureira, mantendo a estrutura de componentes existente.

**Architecture:** Evolução visual pura — atualizar CSS variables, tipografia, e classes Tailwind em arquivos existentes. Um novo arquivo (`header-context.tsx`) para controlar o modo transparente do header. Sem mudanças de lógica/dados. Header ganha scroll behavior via useState + useEffect.

**Tech Stack:** Next.js 15, Tailwind CSS 3.4, shadcn/ui, Lucide React, Google Fonts (Sora)

**Spec:** `docs/superpowers/specs/2026-03-25-ux-ui-redesign-design.md`

**Note:** Este é um redesign visual (CSS/layout). Não há testes unitários aplicáveis — verificação é visual via `npm run dev`.

---

### Task 1: Foundation — Cores, Tipografia & CSS Variables

**Files:**
- Modify: `src/app/globals.css` (lines 14-48 for `:root`, lines 49-82 for `.dark`, lines 94-110 for `.content-page`)
- Modify: `src/app/layout.tsx` (Google Fonts link + remove Header/Footer imports and rendering)
- Modify: `tailwind.config.ts` (font-headline + footer-bg color)

- [ ] **Step 1: Update `:root` CSS variables in globals.css**

Replace the `:root` block color values:
```css
--primary: 145 45% 22%;
--primary-foreground: 0 0% 98%;
--secondary: 24 100% 55%;
--secondary-foreground: 0 0% 98%;
--background: 40 20% 98%;
--foreground: 30 10% 15%;
--card: 40 20% 98%;
--card-foreground: 30 10% 15%;
--popover: 40 20% 98%;
--popover-foreground: 30 10% 15%;
--muted: 40 15% 94%;
--muted-foreground: 30 5% 40%;
--accent: 217 76% 60%;
--accent-foreground: 0 0% 98%;
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 0 0% 98%;
--border: 40 10% 88%;
--input: 40 10% 88%;
--ring: 145 45% 22%;
--radius: 0.75rem;
--footer-bg: 145 40% 10%;
```

- [ ] **Step 2: Update `.dark` CSS variables**

Replace dark mode values:
```css
--primary: 145 40% 50%;
--primary-foreground: 150 8% 8%;
--secondary: 24 90% 50%;
--secondary-foreground: 0 0% 9%;
--background: 150 8% 8%;
--foreground: 40 10% 95%;
--card: 150 8% 8%;
--card-foreground: 40 10% 95%;
--popover: 150 8% 8%;
--popover-foreground: 40 10% 95%;
--muted: 150 5% 14%;
--muted-foreground: 40 5% 60%;
--border: 150 5% 14%;
--input: 150 5% 14%;
--ring: 145 40% 50%;
--footer-bg: 150 10% 5%;
```

- [ ] **Step 3: Update `.content-page` styles in globals.css**

Replace the `.content-page` styles:
```css
@layer components {
    .content-page h2 {
        @apply font-headline text-2xl font-bold text-primary mt-10 mb-5 border-l-4 border-secondary pl-4;
    }
    .content-page p {
        @apply text-lg leading-relaxed text-muted-foreground mb-4;
    }
    .content-page ul {
        @apply list-disc list-inside space-y-2 text-lg text-muted-foreground;
    }
    .content-page a {
        @apply text-secondary hover:underline;
    }
    .content-page strong {
        @apply font-semibold text-foreground;
    }
    .content-page img {
        @apply max-w-full w-full rounded-xl;
    }
}
```

- [ ] **Step 4: Update Google Fonts in root layout**

In `src/app/layout.tsx`, replace the Google Fonts `<link>` (line 22):
```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Open+Sans:wght@400;700&family=ZCOOL+KuaiLe&display=swap" rel="stylesheet" />
```

- [ ] **Step 5: Update font-headline in tailwind config**

In `tailwind.config.ts`, change the `headline` entry in `fontFamily`:
```ts
headline: ['"Sora"', 'sans-serif'],
```

- [ ] **Step 6: Add footer-bg to tailwind colors**

In `tailwind.config.ts`, add inside the `colors` object after `sidebar`:
```ts
'footer-bg': 'hsl(var(--footer-bg))',
```

- [ ] **Step 7: Remove Header/Footer from root layout**

The root layout (`src/app/layout.tsx`) currently renders `<Header />` and `<Footer />` directly, but they are also rendered in `src/app/(main)/layout.tsx`. Remove the Header/Footer from root layout to avoid duplication. The root layout should only contain the HTML shell, providers, and `{children}`.

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { SupabaseClientProvider } from '@/supabase/client-provider';

export const metadata: Metadata = {
  title: 'CHAVES adventure',
  description: 'Sua próxima aventura começa aqui. Descubra e reserve atividades ao ar livre.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Open+Sans:wght@400;700&family=ZCOOL+KuaiLe&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <SupabaseClientProvider>
          <div className="relative flex min-h-dvh flex-col bg-background">
            {children}
          </div>
          <Toaster />
        </SupabaseClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify visually**

Run: `npm run dev`
Check: site loads with new green tones, Sora font on headlines, off-white background, no duplicate header/footer

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "feat(ui): update color palette, typography to Sora, and CSS variables"
```

---

### Task 2: Header — Transparent Mode, Scroll Behavior & Context

**Files:**
- Create: `src/components/layout/header-context.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/brand-logo.tsx`
- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Create HeaderContext**

Create `src/components/layout/header-context.tsx`:
```tsx
"use client";

import { createContext, useContext, useState } from "react";

type HeaderContextType = {
  transparent: boolean;
  setTransparent: (v: boolean) => void;
};

const HeaderContext = createContext<HeaderContextType>({
  transparent: false,
  setTransparent: () => {},
});

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [transparent, setTransparent] = useState(false);
  return (
    <HeaderContext.Provider value={{ transparent, setTransparent }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderTransparent() {
  return useContext(HeaderContext);
}
```

- [ ] **Step 2: Wrap main layout with HeaderProvider**

In `src/app/(main)/layout.tsx`:
```tsx
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeaderProvider } from '@/components/layout/header-context';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <HeaderProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </HeaderProvider>
  );
}
```

- [ ] **Step 3: Add `variant` prop to BrandLogo**

In `src/components/layout/brand-logo.tsx`, replace the entire file:
```tsx
export function BrandLogo({ variant = 'default' }: { variant?: 'default' | 'light' }) {
  const colorClass = variant === 'light' ? 'text-white' : 'text-primary';
  return (
    <span className="flex flex-col items-center justify-center">
      <span className={`font-brand ${colorClass} text-[30px] leading-[30px]`}>
        chaves
      </span>
      <span className={`font-adventure ${colorClass}`}>
        adventure
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Update Header with context-driven transparency and scroll behavior**

In `src/components/layout/header.tsx`, add imports:
```tsx
import { useState, useEffect } from "react";
import { useHeaderTransparent } from "./header-context";
```

Inside the `Header` component body (before `navLinks`), add:
```tsx
const { transparent } = useHeaderTransparent();
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  if (!transparent) return;
  const handleScroll = () => setScrolled(window.scrollY > 50);
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, [transparent]);

const isTransparent = transparent && !scrolled;
```

- [ ] **Step 5: Update header element classes**

Replace the `<header>` element's className with:
```tsx
<header className={cn(
  "sticky top-0 z-50 w-full transition-all duration-500 ease-out",
  isTransparent
    ? "bg-transparent border-b border-transparent"
    : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
)}>
```

- [ ] **Step 6: Update logo and nav link colors for transparent mode**

Update the Mountain icon and BrandLogo:
```tsx
<Mountain className={cn("h-6 w-6", isTransparent ? "text-white" : "text-primary")} />
<BrandLogo variant={isTransparent ? "light" : "default"} />
```

Update the `NavLink` component to respect transparent mode:
```tsx
const NavLink = ({ href, label }: { href: string; label: string }) => {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "relative transition-colors duration-200 hover:text-primary",
        "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:bg-current after:transition-transform after:duration-200 after:ease-out",
        isActive ? "after:w-full after:scale-x-100" : "after:w-full after:scale-x-0 hover:after:scale-x-100",
        isActive
          ? isTransparent ? "text-white font-semibold" : "text-primary font-semibold"
          : isTransparent ? "text-white/80" : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
};
```

Update the admin icon button:
```tsx
<Button variant="ghost" size="icon" asChild className={isTransparent ? "text-white hover:text-white/80 hover:bg-white/10" : ""}>
```

- [ ] **Step 7: Verify visually**

Run: `npm run dev`
Check: header transparent on home page, transitions to solid on scroll at ~50px

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/header-context.tsx src/components/layout/header.tsx src/components/layout/brand-logo.tsx src/app/\(main\)/layout.tsx
git commit -m "feat(ui): add transparent header with scroll transition, context, and brand logo variant"
```

---

### Task 3: Footer — Redesign Visual

**Files:**
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Rewrite footer component**

Replace the entire content of `src/components/layout/footer.tsx`:
```tsx
"use client";

import Link from "next/link";
import { Mountain, Facebook, Instagram, Twitter } from "lucide-react";
import { useCollection } from "@/supabase/use-collection";
import { useDoc } from "@/supabase/use-doc";
import type { ContentPage, HomePageContent } from "@/lib/types";
import { BrandLogo } from "./brand-logo";

export function Footer() {
  const { data: allPages } = useCollection<ContentPage>('pages');

  const dynamicPages = allPages
    ?.filter(p => p.show_in_header === true)
    ?.sort((a, b) => (a.nav_order ?? 0) - (b.nav_order ?? 0));

  const { data: homeContentDoc } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homeContent = homeContentDoc?.data ?? null;

  return (
    <footer className="relative bg-footer-bg text-white">
      {/* Gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-primary" />

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <Mountain className="h-6 w-6 text-white" />
              <BrandLogo variant="light" />
            </Link>
            <p className="text-white/50 text-sm max-w-xs">
              Sua próxima aventura começa aqui. Descubra e reserve atividades ao ar livre.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-headline font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">
              Navegação
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/#adventures" className="text-white/60 hover:text-white transition-colors duration-200">
                Aventuras
              </Link>
              {dynamicPages?.map(page => (
                <Link
                  key={page.id}
                  href={`/pages/${page.slug}`}
                  className="text-white/60 hover:text-white transition-colors duration-200"
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-headline font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">
              Redes Sociais
            </h3>
            <div className="flex items-center gap-4">
              {homeContent?.facebookEnabled && homeContent?.facebookUrl && (
                <a href={homeContent.facebookUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {homeContent?.instagramEnabled && homeContent?.instagramUrl && (
                <a href={homeContent.instagramUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {homeContent?.twitterEnabled && homeContent?.twitterUrl && (
                <a href={homeContent.twitterUrl} target="_blank" rel="noopener noreferrer"
                   className="text-white/60 hover:text-white transition-colors duration-200"
                   aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} Chaves Adventure. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: dark green footer with gradient border, 3-column layout, social icons, brand logo in light variant

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/footer.tsx
git commit -m "feat(ui): redesign footer with dark background, icon socials, and 3-column layout"
```

---

### Task 4: Home Page — Hero & Adventures Grid

**Files:**
- Modify: `src/app/(main)/page.tsx`

**Depends on:** Task 2 (HeaderContext must exist)

- [ ] **Step 1: Update home page with hero improvements and transparent header**

Replace the full content of `src/app/(main)/page.tsx`:
```tsx
"use client";

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdventureCard } from '@/components/adventure-card';
import { ArrowRight, Mountain } from 'lucide-react';
import { useCollection } from '@/supabase/use-collection';
import { useDoc } from '@/supabase/use-doc';
import type { Adventure, HomePageContent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeaderTransparent } from '@/components/layout/header-context';

function HeroLoading() {
  return (
    <section className="relative min-h-[85vh] w-full bg-muted">
      <div className="relative z-10 flex h-full min-h-[85vh] flex-col items-center justify-center text-center p-6">
        <Skeleton className="h-16 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-14 w-48 mt-8 rounded-full" />
      </div>
    </section>
  );
}

function AdventuresLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Mountain className="h-20 w-20 text-muted-foreground/30 mb-4" />
      <p className="text-lg text-muted-foreground">Nenhuma aventura disponível no momento</p>
    </div>
  );
}

export default function Home() {
  const { data: adventures, isLoading: isLoadingAdventures } = useCollection<Adventure>('adventures');
  const { data: homePageDoc, isLoading: isLoadingContent } = useDoc<{ data: HomePageContent }>('content', 'homepage');
  const homePageContent = homePageDoc?.data ?? null;
  const { setTransparent } = useHeaderTransparent();

  useEffect(() => {
    setTransparent(true);
    return () => setTransparent(false);
  }, [setTransparent]);

  if (isLoadingContent || !homePageContent) {
    return (
      <div className="flex flex-col">
        <HeroLoading />
        <section id="adventures" className="py-16 md:py-28 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <Skeleton className="h-10 w-1/2 mx-auto" />
              <Skeleton className="h-5 w-3/4 mx-auto mt-2" />
            </div>
            <AdventuresLoading />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[85vh] w-full -mt-16">
        {homePageContent.heroImageUrl && (
          <Image
            src={homePageContent.heroImageUrl}
            alt={homePageContent.heroImageDescription}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full min-h-[85vh] flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight">
            {homePageContent.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg md:text-xl text-white/90">
            {homePageContent.heroDescription}
          </p>
          <Button asChild size="lg" className="group mt-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full px-8">
            <Link href="#adventures">
              Explorar Atividades <ArrowRight className="ml-2 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Decorative divider */}
      <div className="h-px max-w-md mx-auto bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Adventures */}
      <section id="adventures" className="py-16 md:py-28 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-12 h-1 bg-secondary rounded-full mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">
              {homePageContent.adventuresTitle}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {homePageContent.adventuresDescription}
            </p>
          </div>
          {isLoadingAdventures && <AdventuresLoading />}
          {adventures && adventures.length === 0 && <EmptyState />}
          {adventures && adventures.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adventures.map((adventure) => (
                <AdventureCard key={adventure.id} adventure={adventure} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Check: taller hero with diagonal gradient, accent bar above adventures title, empty state, header transparent over hero

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main\)/page.tsx
git commit -m "feat(ui): redesign hero section and adventures grid with empty state"
```

---

### Task 5: Adventure Cards — Overlay & Hover Effects

**Files:**
- Modify: `src/components/adventure-card.tsx`

- [ ] **Step 1: Rewrite adventure card**

Replace the entire content of `src/components/adventure-card.tsx`:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { Adventure } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, Timer, BarChart } from 'lucide-react';

type AdventureCardProps = {
  adventure: Adventure;
};

export function AdventureCard({ adventure }: AdventureCardProps) {
  const adventureSlug = adventure.slug || adventure.id;

  return (
    <Card className="group flex flex-col overflow-hidden rounded-xl shadow-md transition-shadow duration-500 ease-out hover:shadow-xl">
      {/* Image with overlay */}
      <Link href={`/adventures/${adventureSlug}`} className="block relative h-56 overflow-hidden">
        {adventure.image_url ? (
          <Image
            src={adventure.image_url}
            alt={adventure.image_description}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Difficulty badge */}
        <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full">
          {adventure.difficulty}
        </span>

        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-headline text-xl font-bold text-white">
            {adventure.title}
          </h3>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="flex-1 p-5">
        <p className="text-muted-foreground text-sm line-clamp-2">
          {adventure.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-bold text-primary">R${adventure.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4 text-primary" />
            <span>{adventure.duration}</span>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-5 pt-0">
        <Button asChild className="w-full transition-colors duration-200 ease-out group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
          <Link href={`/adventures/${adventureSlug}`}>
            Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: cards with image overlay, title over image, glassmorphism badge, hover zoom + button fill

- [ ] **Step 3: Commit**

```bash
git add src/components/adventure-card.tsx
git commit -m "feat(ui): redesign adventure cards with image overlay, hover effects, and glassmorphism badge"
```

---

### Task 6: Adventure Detail Page — Full-Bleed Image & Refined Layout

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Rewrite adventure detail page**

Replace the entire content of `src/app/(main)/adventures/[slug]/page.tsx`:
```tsx
"use client";

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Timer, BarChart, MapPin, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationForm } from './_components/registration-form';
import { useSupabase } from '@/supabase/hooks';
import type { Adventure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useHeaderTransparent } from '@/components/layout/header-context';

function useFetchAdventure(slug: string) {
  const supabase = useSupabase();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setAdventure(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from('adventures')
      .select()
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) setError(new Error(error.message));
        else setAdventure(data as Adventure);
        setIsLoading(false);
      });
  }, [supabase, slug]);

  return { adventure, isLoading, error };
}

export default function AdventurePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { adventure, isLoading, error } = useFetchAdventure(slug);
  const { setTransparent } = useHeaderTransparent();

  useEffect(() => {
    setTransparent(true);
    return () => setTransparent(false);
  }, [setTransparent]);

  if (isLoading) {
    return (
      <div>
        <div className="relative w-full h-[50vh] bg-muted -mt-16" />
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <Skeleton className="h-10 w-3/4 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar aventura: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!adventure) {
    return notFound();
  }

  const difficultyVariant = {
    'Fácil': 'default',
    'Moderado': 'secondary',
    'Desafiador': 'destructive',
  } as const;

  return (
    <div>
      {/* Full-bleed hero image */}
      <div className="relative w-full h-[50vh] -mt-16">
        {adventure.image_url && (
          <Image
            src={adventure.image_url}
            alt={adventure.image_description}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white">
              {adventure.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <p className="text-lg leading-relaxed text-muted-foreground mb-6">{adventure.description}</p>
            <div className="prose max-w-none text-foreground text-lg leading-relaxed">
              <p>{adventure.long_description}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Info className="h-5 w-5" /> Detalhes Principais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-primary">R${adventure.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground ml-1">por pessoa</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <span>{adventure.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <span>{adventure.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <BarChart className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant={difficultyVariant[adventure.difficulty]}>
                      {adventure.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {adventure.registrations_enabled ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Reserve Seu Lugar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RegistrationForm
                      adventureId={adventure.id}
                      adventureTitle={adventure.title}
                      adventureSlug={adventure.slug}
                      adventurePrice={adventure.price}
                      customFields={adventure.custom_fields}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="font-headline text-muted-foreground">Inscrições Encerradas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">As inscrições para esta aventura estão atualmente encerradas. Por favor, volte mais tarde ou explore nossas outras aventuras!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: full-bleed image with title overlay, icon circles, large price, transparent header

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/page.tsx
git commit -m "feat(ui): redesign adventure detail with full-bleed image and refined layout"
```

---

### Task 7: Registration Form — Refined Inputs & Accent Bars

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Update form styles**

In `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`, make these changes:

Replace the participant section container (line 255):
```tsx
<div key={participantField.id} className="space-y-4 border-l-4 border-secondary pl-4 py-4">
```

Replace the submit Button (line 293):
```tsx
<Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full" disabled={isSubmitting}>
  {isSubmitting ? "Enviando..." : "Inscreva-se Agora"}
</Button>
```

Update all `<Input>` elements to add rounded-xl styling. Add this class override to the Input components:
```tsx
className="rounded-xl"
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: rounded inputs, orange accent bar on participant sections, pill-shaped submit button

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/_components/registration-form.tsx
git commit -m "feat(ui): refine registration form with accent bars and pill button"
```

---

### Task 8: Payment Page — Refined Visual

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

- [ ] **Step 1: Update payment card styles**

In `src/app/(main)/adventures/[slug]/pagamento/page.tsx`, make these changes:

Update the main card (line 264):
```tsx
<Card className="mx-auto max-w-lg shadow-xl">
```

Replace the valor total section (lines 274-282):
```tsx
<div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center text-white">
  <p className="text-sm text-white/70">Valor Total</p>
  <p className="text-3xl font-bold">
    {formatCurrency(registration.total_amount || 0)}
  </p>
  <p className="text-xs text-white/60">
    ({registration.group_size} {registration.group_size === 1 ? "pessoa" : "pessoas"})
  </p>
</div>
```

Update the QR code container (line 288):
```tsx
<div className="rounded-xl border bg-white p-3 shadow-md">
```

Replace the PIX copy section (lines 304-307):
```tsx
<div className="flex-1 overflow-hidden rounded-lg bg-foreground p-3">
  <p className="truncate font-mono text-xs text-background">
    {pixConfig.pixCopiaECola}
  </p>
</div>
```

Update the "Já Paguei" button (lines 333-347):
```tsx
<Button
  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-bold rounded-full"
  size="lg"
  onClick={handleConfirmPayment}
  disabled={isConfirming || (!token || token !== registration?.registration_token)}
>
```

Update the awaiting confirmation icon (line 240):
```tsx
<Clock className="mx-auto mb-4 h-20 w-20 text-amber-500" />
```

Update the success icon (line 214):
```tsx
<CheckCircle2 className="mx-auto mb-4 h-20 w-20 text-green-500" />
```

Update the access denied icon (line 191):
```tsx
<AlertTriangle className="mx-auto mb-4 h-20 w-20 text-destructive" />
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: gradient total section, dark PIX code area, pill button, larger state icons

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/pagamento/page.tsx
git commit -m "feat(ui): refine payment page with gradient total, dark PIX code, and pill buttons"
```

---

### Task 9: Login Page — Typography & Color Update

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Update login page colors and typography**

In `src/app/(auth)/login/page.tsx`, update the left panel background (line 49):
```tsx
<div className="absolute inset-0 bg-[#0f2b1a]" />
```

Update the gradient overlays (lines 53-56) to use cooler greens:
```tsx
style={{
  backgroundImage: `
    radial-gradient(ellipse at 30% 20%, rgba(20, 80, 50, 0.6) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(15, 55, 35, 0.8) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(25, 90, 55, 0.3) 0%, transparent 70%)
  `,
}}
```

Update the gradient text (lines 97-99) to match new palette:
```tsx
<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-green-300">
```

The typography will automatically update to Sora via `font-headline` class already used.

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: login page with cooler green panel, Sora font on headlines

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(ui): update login page colors to match new palette"
```

---

### Task 10: Content Pages — Width & Styles

**Files:**
- Modify: `src/app/(main)/pages/[slug]/page.tsx`

- [ ] **Step 1: Update content page max-width**

In `src/app/(main)/pages/[slug]/page.tsx`, change the container (line 43):
```tsx
<div className="max-w-3xl mx-auto">
```

The `.content-page` styles were already updated in Task 1 (globals.css).

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: content pages narrower with accent-bar headings

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/pages/\[slug\]/page.tsx
git commit -m "feat(ui): narrow content page width for better readability"
```

---

### Task 11: Final Verification & Cleanup

- [ ] **Step 1: Full visual review**

Run: `npm run dev`
Check all pages in order:
1. Home page — hero, grid, cards, empty state
2. Adventure detail — full-bleed image, sidebar cards, registration form
3. Payment — gradient total, QR code, states
4. Login — colors, typography
5. Content pages — width, headings
6. Header — transparent/solid transition on scroll
7. Footer — dark background, social icons, gradient border

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 3: Commit any fixes**

If fixes were needed:
```bash
git add -A
git commit -m "fix(ui): address visual issues found during review"
```
