---
name: Kiosku
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dada'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#3f4943'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#6f7973'
  outline-variant: '#bfc9c1'
  surface-tint: '#216a4f'
  primary: '#004a33'
  on-primary: '#ffffff'
  primary-container: '#176348'
  on-primary-container: '#95dcba'
  inverse-primary: '#8ed5b3'
  secondary: '#54615c'
  on-secondary: '#ffffff'
  secondary-container: '#d7e6df'
  on-secondary-container: '#596762'
  tertiary: '#6a2d2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#874342'
  on-tertiary-container: '#ffbdba'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a9f2cf'
  primary-fixed-dim: '#8ed5b3'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#005139'
  secondary-fixed: '#d7e6df'
  secondary-fixed-dim: '#bbcac3'
  on-secondary-fixed: '#111e1a'
  on-secondary-fixed-variant: '#3c4a45'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#3b080b'
  on-tertiary-fixed-variant: '#733333'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1280px
---

## Brand & Style
The design system is engineered for the Indonesian UMKM (Micro, Small, and Medium Enterprises) sector, balancing a professional enterprise aesthetic with an approachable, clean interface. The brand personality is grounded, trustworthy, and efficient, aimed at business owners who value clarity over complexity.

The visual style follows a **Modern Corporate** direction with high-end editorial touches. It utilizes generous whitespace, a structured layout, and a focus on content legibility to instill confidence in digital commerce operations. It avoids excessive decoration in favor of utility and a "premium tool" feel.

## Colors
The palette is rooted in a deep **Forest Green**, symbolizing growth and stability within the Indonesian landscape. 

- **Primary Forest Green (#176348):** Used for primary actions, branding elements, and key status indicators.
- **Surface/Background (#f6f8f7):** A cool, neutral off-white that reduces eye strain compared to pure white.
- **Highlight Mint (#e1f0e9):** Used for secondary buttons, success states, and subtle backgrounds for highlighted content.
- **Border Neutral (#e5e7eb):** A light, crisp grey for structural divisions, ensuring the UI feels organized but not heavy.

## Typography
This design system uses **Plus Jakarta Sans** exclusively to maintain a localized, modern, and friendly tone. 

The type hierarchy prioritizes readability for administrative tasks (SaaS) while providing bold display options for storefront views. Headlines use a tighter letter spacing and heavier weights to command attention, while body text maintains a generous line height for long-form reading on inventory lists or policy pages.

## Layout & Spacing
The system utilizes a **12-column fluid grid** for desktop environments, transitioning to a single-column stack for mobile devices. 

- **Desktop:** 32px side margins with a 16px gutter. Content is centered with a max-width of 1280px to prevent excessive line lengths.
- **Tablet:** 24px side margins. Grid columns may collapse to 6 or 8 depending on the complexity of the data.
- **Mobile:** 16px side margins. Elements should utilize full-width patterns with vertical stacking.

Spacing follows a 4px base unit, with 16px (md) being the standard padding for containers and 24px (lg) for section vertical separation.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and extremely **Subtle Shadows**. 

- **Level 0 (Base):** The Background White (#f6f8f7) used for the canvas.
- **Level 1 (Cards):** Pure White (#ffffff) surfaces with a 1px border (#e5e7eb).
- **Level 2 (Hover/Active):** A soft, diffused shadow: `0px 4px 12px rgba(23, 99, 72, 0.04)`. Note the slight green tint in the shadow to maintain color harmony.
- **Level 3 (Modals/Popovers):** A more pronounced shadow: `0px 12px 32px rgba(0, 0, 0, 0.08)`.

Avoid heavy black shadows; the goal is to make elements appear as if they are floating slightly above the neutral base.

## Shapes
The design system employs a consistent **12px (0.75rem)** corner radius for all primary containers and cards. This "Rounded" approach softens the professional aesthetic, making the SaaS environment feel modern and accessible.

- **Small Components (Buttons, Inputs):** 8px (0.5rem) radius.
- **Standard Containers (Cards, Modals):** 12px (0.75rem) radius.
- **Chips/Badges:** Fully pill-shaped (999px) to distinguish them from actionable buttons.

## Components
- **Buttons:** 
  - *Primary:* Forest Green background, White text. No gradient.
  - *Secondary:* Highlight Mint background, Forest Green text.
  - *Tertiary:* Ghost style, Forest Green text, no border.
- **Input Fields:** 1px border (#e5e7eb) with 8px radius. On focus, the border changes to Forest Green with a 2px outer glow in Highlight Mint.
- **Cards:** White background, 1px border (#e5e7eb), 12px radius. Title in Headline-MD.
- **Chips:** Used for order status (e.g., "Selesai", "Proses"). Use Highlight Mint with Forest Green text for positive states.
- **Lists:** Data rows should have 16px vertical padding with a 1px bottom border to separate entries.
- **Data Tables:** High-density typography (Body-SM) with a sticky header. Header background should be Neutral (#f6f8f7).
- **Navigation:** A clean left-hand sidebar for desktop SaaS view, using Forest Green for the active state indicator.