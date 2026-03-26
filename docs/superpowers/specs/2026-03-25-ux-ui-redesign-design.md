# CHAVES Adventure — UX/UI Redesign "Summit"

## Overview

Redesign completo de ponta a ponta do site CHAVES Adventure, elevando cada componente com tipografia mais impactante, melhor hierarquia visual e refinamento nos cards, hero, detalhes e pagamento. Direção estética: moderna e aventureira, com animações sutis.

**Público:** Misto (jovens, famílias, premium).
**Abordagem:** Evolução controlada — mantém a estrutura e componentes existentes, refina a execução visual.

---

## 1. Paleta de Cores & Tipografia

### Cores (CSS variables em globals.css)

| Token | Atual | Novo | Justificativa |
|-------|-------|------|---------------|
| `--primary` | `121 39% 27%` | `145 45% 22%` | Verde mais frio e sofisticado |
| `--secondary` | `16 100% 60%` | `24 100% 55%` | Laranja mais quente e saturado |
| `--background` | `0 0% 100%` | `40 20% 98%` | Off-white quente, reduz cansaço visual |
| `--foreground` | `0 0% 20%` | `30 10% 15%` | Quase-preto com tom quente |
| `--muted` | `0 0% 96.1%` | `40 15% 94%` | Tom quente acompanhando o background |
| `--muted-foreground` | `0 0% 45.1%` | `30 5% 40%` | Melhor contraste |
| `--radius` | `0.5rem` | `0.75rem` | Bordas mais suaves, feeling moderno |
| `--footer-bg` | (novo) | `145 40% 10%` | Fundo escuro do footer |

### Dark mode (CSS variables)

| Token | Novo |
|-------|------|
| `--primary` | `145 40% 50%` |
| `--secondary` | `24 90% 50%` |
| `--background` | `150 8% 8%` |
| `--foreground` | `40 10% 95%` |
| `--muted` | `150 5% 14%` |
| `--muted-foreground` | `40 5% 60%` |

### Motion system

- **Micro-interactions** (hovers, focus): `duration-200 ease-out`
- **Layout transitions** (header scroll, card hover scale): `duration-500 ease-out`
- **Easing padrão:** `ease-out` para todas as animações

### Tipografia

- **Headlines:** Trocar Montserrat por **Sora** — geométrica, moderna, mais personalidade
- **Body:** Manter Open Sans
- **Brand:** Manter ZCOOL KuaiLe
- **Adventure:** Manter Ketimun

Atualizar Google Fonts link no root layout e `font-headline` no tailwind config.

---

## 2. Header

### Comportamento
- **Sobre o hero (home e adventure detail):** transparente, texto branco, logo branco — aplica-se a qualquer página com imagem full-bleed no topo
- **Scroll / outras páginas:** fundo sólido `bg-background/95 backdrop-blur`
- Transição via scroll event listener com threshold de 50px
- Implementação: prop `transparent?: boolean` no Header, controlada pelo layout pai ou pela página

### Visual
- Links com underline animado no hover (barra inferior que cresce do centro via pseudo-element `::after` com `scale-x` transition)
- Botão admin: apenas ícone, mais discreto
- Mobile: manter Sheet, sem mudanças estruturais

### Componentes afetados
- `src/components/layout/header.tsx`
- `src/components/layout/brand-logo.tsx` (prop `variant?: 'default' | 'light'` — light usa `text-white` nas fontes brand/adventure e `text-white` no ícone Mountain)

---

## 3. Footer

### Visual
- Fundo escuro via CSS variable `--footer-bg: 145 40% 10%` (adicionado aos tokens)
- Borda superior: pseudo-element `::before` com `h-[2px]` e `bg-gradient-to-r from-primary via-secondary to-primary`
- Layout 3 colunas: marca + descrição | links de nav | redes sociais com ícones SVG

### Redes sociais
- Substituir texto ("Facebook", "Instagram") por ícones SVG inline do Lucide (`Facebook`, `Instagram`, `Twitter`)
- Hover: `text-white/60 hover:text-white transition-colors duration-200`
- Cada ícone-link com `aria-label` descritivo (ex: `aria-label="Facebook"`)

### Componentes afetados
- `src/components/layout/footer.tsx`

---

## 4. Home Page

### Hero
- Altura: `min-h-[85vh]` (up de `60vh/80vh`)
- Overlay: gradiente diagonal `bg-gradient-to-tr from-black/70 via-black/30 to-transparent` (substitui `bg-black/50`)
- Título: `text-5xl md:text-7xl font-headline font-extrabold`
- Subtítulo: `max-w-xl` com opacidade maior
- CTA: pill shape (`rounded-full`), fundo secondary, `text-lg font-bold`, ícone `ArrowRight` (Lucide) com `hover:translate-x-1`
- Divisor decorativo abaixo do hero: `div` com `h-px max-w-md mx-auto bg-gradient-to-r from-transparent via-border to-transparent`

### Seção de Aventuras
- Padding: `py-16 md:py-28`
- Título com accent bar: linha curta laranja (`w-12 h-1 bg-secondary rounded-full mx-auto mb-4`) acima do título
- Grid: `gap-8` (up de `gap-6`)

### Componentes afetados
- `src/app/(main)/page.tsx`

---

## 5. Adventure Cards

### Layout
- Imagem: `h-56` (up de `h-48`)
- Overlay gradiente na parte inferior da imagem (`from-transparent via-transparent to-black/70`)
- Título posicionado **sobre** a imagem, na parte inferior, texto branco
- Badge de dificuldade no canto superior direito, com `backdrop-blur-sm bg-white/20 text-white`

### Hover
- Imagem: `hover:scale-105` com `transition-transform duration-500`, container com `overflow-hidden`
- Card: elevação sutil na sombra
- Botão "Saiba Mais": transição de outline para preenchido com `bg-primary text-primary-foreground` (`duration-200 ease-out`)

### Informações
- Preço: `font-bold text-primary`
- Descrição: `line-clamp-2`
- Ícones compactos em linha horizontal

### Componentes afetados
- `src/components/adventure-card.tsx`

---

## 6. Página de Detalhe da Aventura

### Imagem
- Full-bleed: fora do container, `w-full h-[50vh]`
- Overlay gradiente na base para transição suave
- Título da aventura sobreposto na parte inferior, texto branco, `text-4xl md:text-5xl`

### Conteúdo
- Container mais estreito com mais respiro
- `text-lg leading-relaxed` para descrição
- Long description com prose refinado

### Card lateral
- Ícones em círculos com fundo `bg-primary/10 rounded-full p-2`
- Preço em destaque: `text-3xl font-bold`
- No mobile: card empilha abaixo do conteúdo (manter comportamento atual `lg:col-span-2`), sem sticky no mobile
- Participantes com accent bar esquerda: `border-l-4 border-secondary pl-4` (sem borda completa)

### Formulário
- Inputs `rounded-xl` com bordas sutis, consistente com login
- Botão submit: secondary, pill shape (`rounded-full`)
- Seções de participantes: `border-l-4 border-secondary pl-4` (accent bar pattern reutilizado)

### Componentes afetados
- `src/app/(main)/adventures/[slug]/page.tsx`
- `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

---

## 7. Página de Pagamento

### Card
- Sombra mais pronunciada, padding maior
- Valor total: fundo gradiente `from-primary to-primary/80`, texto branco, `rounded-xl p-6`
- QR Code: moldura arredondada com sombra
- Código PIX: fundo escuro `bg-foreground text-background font-mono rounded-lg` — visual de terminal
- Botão "Já Paguei": secondary, pill shape
- Estados de pagamento:
  - **pending:** card padrão com QR + botão "Já Paguei"
  - **awaiting_confirmation:** ícone `Clock` em `h-20 w-20 text-amber-500`, título "Aguardando Confirmação", mensagem abaixo
  - **confirmed:** ícone `CheckCircle2` em `h-20 w-20 text-green-500`, título "Pagamento Confirmado"
  - **Erro/não encontrado:** ícone `AlertTriangle` em `h-20 w-20 text-destructive`, título em `text-destructive`

### Componentes afetados
- `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

---

## 8. Login

- Manter essência do design atual (já está bem elaborado)
- Atualizar tipografia dos headlines para Sora
- Ajustar cores do painel esquerdo para nova paleta (verde mais frio/profundo)
- Inputs já usam `rounded-xl` — servem de referência

### Componentes afetados
- `src/app/(auth)/login/page.tsx`

---

## 9. Páginas de Conteúdo Dinâmico

- Estilos `.content-page` refinados: melhor espaçamento entre seções (`mt-10 mb-5`), headings com accent bar (`border-l-4 border-secondary pl-4` — mesma pattern dos participantes)
- `max-w-3xl` (down de `max-w-4xl`) para melhor leitura. Imagens dentro de `.content-page img` recebem `max-w-full w-full rounded-xl` — escalam dentro do container, sem break-out

### Componentes afetados
- `src/app/(main)/pages/[slug]/page.tsx`
- `src/app/globals.css` (estilos `.content-page`)

---

## 10. Arquivos Modificados (Resumo)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/app/globals.css` | Cores, radius, animações, estilos content-page |
| `src/app/layout.tsx` | Google Fonts (adicionar Sora) |
| `tailwind.config.ts` | font-headline → Sora |
| `src/components/layout/header.tsx` | Header transparente + scroll behavior |
| `src/components/layout/brand-logo.tsx` | Variante clara |
| `src/components/layout/footer.tsx` | Redesign visual completo |
| `src/components/adventure-card.tsx` | Novo layout com overlay |
| `src/app/(main)/page.tsx` | Hero + grid refinados |
| `src/app/(main)/adventures/[slug]/page.tsx` | Imagem full-bleed, layout refinado |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Inputs + botão refinados |
| `src/app/(main)/adventures/[slug]/pagamento/page.tsx` | Visual do card de pagamento |
| `src/app/(auth)/login/page.tsx` | Ajustes de cor e tipografia |
| `src/app/(main)/pages/[slug]/page.tsx` | Max-width e estilos |

## 11. Loading & Empty States

- **Skeletons:** mantêm a estrutura atual. O novo `--radius: 0.75rem` será aplicado automaticamente via o componente `Skeleton` do shadcn que usa `rounded-md`. Não requer mudanças manuais em cada skeleton
- **Spinners:** manter `LoaderCircle` do Lucide com `text-primary`
- **Empty state (grid sem aventuras):** mensagem centralizada com ícone `Mountain` grande em `text-muted-foreground/30` e texto "Nenhuma aventura disponível no momento"

## 12. Acessibilidade

- Paleta validada para WCAG AA:
  - `--primary` (verde escuro) sobre `--background` (off-white): ratio ~9:1 (passa)
  - `--secondary` (laranja) como fundo de botão com texto branco: ratio ~3.5:1 — usar `font-bold` e `text-lg` mínimo em botões secondary para compensar (large text passa AA a 3:1)
  - `--foreground` sobre `--background`: ratio ~14:1 (passa)

## Fora de escopo

- Admin dashboard (não é público, prioridade menor)
- Funcionalidades novas (foco exclusivo em visual/UX)
- Dark mode (tokens definidos na seção 1 como aspiracionais — aplicar aos CSS variables `.dark`, sem ajustes por componente. Cores hardcoded como `text-white` no hero já funcionam em ambos os modos. Validação visual do dark mode fica para iteração futura)
- Page transitions (sem animações de rota/navegação — fora de escopo)
- Responsividade (manter breakpoints atuais, apenas refinar)
