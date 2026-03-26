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

Dark mode: ajustar proporcionalmente mantendo a mesma direção.

### Tipografia

- **Headlines:** Trocar Montserrat por **Sora** — geométrica, moderna, mais personalidade
- **Body:** Manter Open Sans
- **Brand:** Manter ZCOOL KuaiLe
- **Adventure:** Manter Ketimun

Atualizar Google Fonts link no root layout e `font-headline` no tailwind config.

---

## 2. Header

### Comportamento
- **Sobre o hero (home):** transparente, texto branco, logo branco
- **Scroll / outras páginas:** fundo sólido `bg-background/95 backdrop-blur`
- Transição via scroll event listener com threshold (~50px)

### Visual
- Links com underline animado no hover (barra inferior que cresce do centro via pseudo-element `::after` com `scale-x` transition)
- Botão admin: apenas ícone, mais discreto
- Mobile: manter Sheet, sem mudanças estruturais

### Componentes afetados
- `src/components/layout/header.tsx`
- `src/components/layout/brand-logo.tsx` (variante clara para header transparente)

---

## 3. Footer

### Visual
- Fundo escuro: `hsl(145, 40%, 10%)` com texto claro
- Borda superior com gradiente sutil (primary → secondary)
- Layout 3 colunas: marca + descrição | links de nav | redes sociais com ícones SVG

### Redes sociais
- Substituir texto ("Facebook", "Instagram") por ícones SVG inline (lucide ou SVG custom)

### Componentes afetados
- `src/components/layout/footer.tsx`

---

## 4. Home Page

### Hero
- Altura: `min-h-[85vh]` (up de `60vh/80vh`)
- Overlay: gradiente diagonal `bg-gradient-to-tr from-black/70 via-black/30 to-transparent` (substitui `bg-black/50`)
- Título: `text-5xl md:text-7xl font-headline font-extrabold`
- Subtítulo: `max-w-xl` com opacidade maior
- CTA: pill shape (`rounded-full`), fundo secondary, seta com `hover:translate-x-1`
- Divisor decorativo abaixo do hero: `div` com gradiente horizontal que desvanece nas pontas

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
- Badge de dificuldade no canto superior direito, com `backdrop-blur-sm bg-white/20`

### Hover
- Imagem: `hover:scale-105` com `transition-transform duration-500`, container com `overflow-hidden`
- Card: elevação sutil na sombra
- Botão "Saiba Mais": transição de outline para preenchido

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
- Participantes com borda lateral colorida (accent bar esquerda) em vez de borda completa

### Formulário
- Inputs `rounded-xl` com bordas sutis, consistente com login
- Botão submit: secondary, pill shape
- Seções de participantes: borda lateral accent

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
- Estados de confirmação: ícones maiores, melhor hierarquia

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

- Estilos `.content-page` refinados: melhor espaçamento, headings com accent bar
- `max-w-3xl` (down de `max-w-4xl`) para melhor leitura

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

## Fora de escopo

- Admin dashboard (não é público, prioridade menor)
- Funcionalidades novas (foco exclusivo em visual/UX)
- Dark mode (ajustar proporcionalmente, sem redesign dedicado)
- Responsividade (manter breakpoints atuais, apenas refinar)
