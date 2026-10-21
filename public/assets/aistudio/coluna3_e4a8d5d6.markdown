---
name: Aura Horology & Haute Joaillerie
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#d1c5af'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#303032'
  outline: '#9a907c'
  outline-variant: '#4e4635'
  surface-tint: '#eec14a'
  primary: '#ffd56d'
  on-primary: '#3e2e00'
  primary-container: '#e5b842'
  on-primary-container: '#614900'
  inverse-primary: '#775a00'
  secondary: '#f6be39'
  on-secondary: '#402d00'
  secondary-container: '#c59300'
  on-secondary-container: '#433000'
  tertiary: '#dbd9db'
  on-tertiary: '#303032'
  tertiary-container: '#bfbdbf'
  on-tertiary-container: '#4d4c4e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf97'
  primary-fixed-dim: '#eec14a'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4400'
  secondary-fixed: '#ffdfa0'
  secondary-fixed-dim: '#f6be39'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#e4e2e4'
  tertiary-fixed-dim: '#c8c6c8'
  on-tertiary-fixed: '#1b1b1d'
  on-tertiary-fixed-variant: '#474649'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-mobile: 0.5rem
  margin: 1rem
  margin-mobile: 0.875rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system embodies the quiet luxury, precision craftsmanship, and exclusivity demanded by high-end horology, bespoke jewelry ateliers, and luxury consignment managers. Designed specifically for specialized boutique owners, vault managers, and high-value inventory curators, the interface delivers an editorial, museum-grade aesthetic where catalog management feels akin to handling precious artifacts.

The design movement synthesizes **Sophisticated Dark Minimalist Haute Luxury** with functional ergonomics:
- **Atmosphere:** Deep midnight blacks (`#121214`) and rich graphite surfaces (`#1C1C1E`) replace generic flat dark themes, providing an opulent backdrop that makes polished metals, gemstone facets, and watch dials pop.
- **Accents:** Warm, saturated satin gold acts as both prestige ornament and crisp functional signal, balancing high luxury with clear legibility.
- **Duality:** Refined classical serif display typography for heritage narrative paired with clean, ultra-legible modern grotesk typography for swift operational tasks (stock counts, SKU validation, price entries).
- **Tactility:** Smooth rounded geometry, understated ambient glows, and hairline metallic borders provide subtle tactile feedback without cluttering dense stock screens.

## Colors

The palette establishes an immersive, low-glare luxury vault environment engineered specifically for OLED mobile displays and rapid inventory workflows:

- **Primary Gold (`#E5B842`):** A radiant, vibrant yellow-gold used for primary action buttons, key metrics, price points, and active states. Provides sharp contrast against deep surfaces while maintaining a warm bullion feel.
- **Secondary Burnished Gold (`#D4A017`):** A deeper antique brass tone utilized for fine borders, active form field perimeters, selected pill chips, and secondary micro-highlights.
- **Graphite Layering Surface (`#1C1C1E`):** The structural surface color for bottom sheets, modal cards, nested containers, and segmented controls. It separates foreground tasks from the canvas without harsh demarcations.
- **True Vault Canvas (`#121214`):** Deep charcoal-black background that grounds the entire mobile experience, eliminating distraction and boosting product photography presence.
- **Neutral Accents:** 
  - Pure Crisp White (`#FFFFFF`) for primary titles and active numeric values.
  - Muted Zinc (`#8E8E93` / `#A1A1A6`) for secondary labels, passive placeholders, and SKU metadata.
  - Subtle Gold Hairline (`rgba(229, 184, 66, 0.25)`) for input outlines, dividers, and passive chip borders.

## Typography

Typography establishes an intentional cadence between editorial grandeur and utilitarian precision:

- **Editorial Headlines (`Playfair Display`):** Reserved strictly for screen titles, product collection headers, modal headings (e.g., *Cadastrar Novo Item*, *Operação Rápida de Estoque*), and prominent currency values (`R$ 600,00`). The high-contrast serif structure channels classical horological catalogs and Swiss auction houses.
- **Operational Interface (`Plus Jakarta Sans`):** Applied across all interactive zones: input fields, numeric steppers, SKU badges, button labels, and body descriptions. Its geometric humanist openness ensures instant character differentiation under warehouse lighting or fast mobile cashiering.
- **Uppercase Micro-Labels:** Field titles, section tags, and status counters utilize `label-md` and `label-sm` rendered in uppercase with expanded letter-spacing (`0.08em` to `0.1em`) colored in muted gold (`#D4A017`) or light steel for effortless scanning.

## Layout & Spacing

The layout is built for single-handed mobile efficiency, high tactile accessibility, and dense data density:

- **Mobile Rhythm:** An 8pt base grid with a 4pt micro-adjustment scale governs field heights, chip paddings, and list gutters. Outer screen margins hold at `0.875rem` (14px) on compact smartphones and expand to `1rem` (16px) on larger handheld devices.
- **Touch Ergonomics:** Interactive targets (buttons, variant chips, dropdown triggers) maintain a minimum hit area of 44px to 48px to prevent accidental taps during stock intake.
- **Form Columns:** Double-column grid for paired parameters (e.g., *Valor Gasto* and *Preço Venda*, or *Qtd Inicial* and *Estoque Mín*), collapsing into full-width stacked rows only for complex textual descriptions and image drop zones.
- **Sticky Action Anchors:** Primary workflow buttons (`Confirmar Cadastro`, `Concluído`, `Salvar`) reside pinned to the bottom sheet viewport, shielded by a subtle linear dark gradient overlay to ensure legibility above scrollable content.

## Elevation & Depth

Visual hierarchy uses a refined physical layering model inspired by matte watch display cases:

- **Layer 0 (Base Canvas):** Solid `#121214`.
- **Layer 1 (Card & Bottom Sheet):** `#1C1C1E` elevated with a soft, diffused ambient drop shadow (`0 8px 32px rgba(0, 0, 0, 0.6)`).
- **Layer 2 (Recessed Inputs):** Dark inset tone (`#141416`) with hairline borders (`1px solid rgba(229, 184, 66, 0.2)`), visually carving input fields into the card surface.
- **Active Focus & Glow:** When a field is focused or a variant chip is selected, the border intensifies to solid `#E5B842` accompanied by a refined outer aureole (`box-shadow: 0 0 12px rgba(229, 184, 66, 0.2)`).
- **Dismissal Controls & Dividers:** Fine, 1px horizontal dividers rendered in `rgba(255, 255, 255, 0.08)` keep modules neatly partitioned without visual heaviness.

## Shapes

The interface embraces a balanced curvature model (`roundedness: 2`):
- **Buttons & Variant Chips:** 10px to 14px (`rounded-lg`) corner radii for smooth, pebble-like ergonomics that feel tactile without leaning into informal pill shapes.
- **Input Fields & Selectors:** 10px radius matching buttons for visual symmetry across form rows.
- **Modal Containers & Bottom Sheets:** 24px (`rounded-xl`) top radius, mirroring native luxury iOS/Android sheet presentations.
- **Product Thumbnails & Image Placeholders:** 12px radius framed with a fine 1px dark-gold border.

## Components

### Buttons
- **Primary Action (e.g., *Confirmar Cadastro*, *Salvar*):** Solid `#E5B842` gold fill, bold black text (`#121214`), 48px height, 12px border radius. Accompanied by crisp icons (checkmarks, arrows).
- **Secondary Action (e.g., *Cancelar*):** Surface fill `#1C1C1E` or transparent, light gray text (`#C7C7CC`), hairline border `1px solid rgba(255, 255, 255, 0.12)`.
- **Toggle Buttons (e.g., *Entrada* vs *Saída*):** Paired segmented controls. Active option features a dark gold outline (`1.5px solid #E5B842`) and faint warm tint background (`rgba(229, 184, 66, 0.08)`); inactive states remain neutral graphite.

### Inputs & Form Fields
- **Container:** Recessed background (`#141416`), 1px subtle gold or zinc border (`rgba(229, 184, 66, 0.25)`), 44px min-height.
- **Typography:** Placeholder text in `#636366`, active input text in `#FFFFFF` (14px regular).
- **Labels:** Uppercase, tracking `0.08em`, `#D4A017` gold, accompanied by an asterisk for mandatory items.
- **Dashed Upload Box:** 1px dashed gold outline (`#D4A017`), flexbox row with folder icon and gold text, offering immediate gallery or camera triggers.

### Variant Chips & Selection Badges
- **Unselected:** Graphite background (`#242426`), subtle 1px border (`rgba(255, 255, 255, 0.08)`), white title with muted quantity counter `(5 un)` in `#8E8E93`.
- **Selected:** Prominent gold perimeter (`1.5px solid #E5B842`), faint golden fill tint, bold white text, and golden stock counter.
- **Image Integration:** Tiny 24x24px rounded circular or square preview thumbnail embedded within the chip head.

### Cards & Dialogs
- **Product Card:** Visual split featuring a high-resolution hero photo (with subtle floating price/stock pills overlaid in high-contrast gold/black) and right/bottom modular spec details.
- **Modal Headers:** Left-aligned serif headline with a close icon button (`X` in `#8E8E93`) anchored top-right.
- **Subtotal & Summary Strip:** Borderless or faint boxed row with dark gold label and standout enlarged serif currency display (`R$ 600,00`).