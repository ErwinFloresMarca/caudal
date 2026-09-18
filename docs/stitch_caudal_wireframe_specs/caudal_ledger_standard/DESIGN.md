---
name: Caudal Ledger Standard
colors:
  surface: '#f9f9ff'
  surface-dim: '#cbdbfb'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#0b1c34'
  on-surface-variant: '#424655'
  inverse-surface: '#21314a'
  inverse-on-surface: '#ecf0ff'
  outline: '#727787'
  outline-variant: '#c2c6d8'
  surface-tint: '#0057ce'
  primary: '#0055c9'
  on-primary: '#ffffff'
  primary-container: '#006bfb'
  on-primary-container: '#fefcff'
  inverse-primary: '#b1c5ff'
  secondary: '#006c52'
  on-secondary: '#ffffff'
  secondary-container: '#7bf6cb'
  on-secondary-container: '#007056'
  tertiary: '#b1212d'
  on-tertiary: '#ffffff'
  tertiary-container: '#d43c42'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419e'
  secondary-fixed: '#7ef8ce'
  secondary-fixed-dim: '#60dcb3'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513d'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#92011a'
  background: '#f9f9ff'
  on-background: '#0b1c34'
  surface-variant: '#d6e3ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  monetary-hero:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  monetary-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  monetary-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

The design system establishes a high-precision, utilitarian visual language tailored for dual personal and micro-business capital stewardship. Operating across dual currencies (BOB and USD) and multi-seat environments, the product demands an interface centered on calm authority, zero-latency parsing, and uncompromised structural clarity.

The visual direction operates within an ultra-disciplined modern corporate style:
- **Zero Decorative Noise:** Visual elements exist strictly to structure, clarify, or contextualize monetary balances, transactional flows, and accounting ledgers.
- **Data Legibility & Precision:** Numerical layouts dominate the hierarchy. Every figure is balanced, aligned, and structured for scanning high-density information without visual fatigue.
- **Bifurcated Color Semantics:** Financial direction is instantly legible through high-contrast, unambiguous chromatic cues (inflow versus outflow), supported by deliberate typographic weight and tabular alignment.
- **Tactile Pill Affordances:** Primary operational triggers employ full pill radiuses to create explicit separation between stable data cards and interactive financial actions.

## Colors

The palette is strictly locked to a clean, high-clarity light mode to preserve maximum contrast and regulatory accounting legibility. Dark mode is intentionally prohibited.

### Architectural Canvas & Surfaces
- **Canvas / App Background (`#F6F8FC`):** "Frost." A soft, cool neutral foundation that eliminates raw glare while cleanly separating white surface containers.
- **Surface Elevation 0 (`#FFFFFF`):** Pure white used for primary ledger cards, balance boards, and active data rows.
- **Surface Muted (`#EDF1F8`):** Recessed functional backing for data-table headers, segmented controls, pill toggles, and metadata badges.
- **Surface Highlight / Tint (`#EBF3FF`):** Brand-tinted base for focused inputs, active pill navigation items, and row selections.

### Typography & Structure
- **Text Primary / Ink (`#0B1C34`):** Deep naval ink offering authoritative optical contrast against white and frost layers.
- **Text Secondary / Ink Muted (`#5B6B85`):** Mid-tone slate providing clean hierarchy for timestamps, exchange rates, secondary currencies, and field prompts.
- **Structural Stroke (`rgba(11, 28, 52, 0.08)`):** Crisp 1px division token for hairpins, ledger rows, and panel borders.
- **Input Stroke (`rgba(11, 28, 52, 0.12)`):** Elevated boundary token for interactive form fields and dropdown selectors.

### Financial Action & Semantic Tones
- **Brand Primary (`#0E6FFF`):** Core action blue, driving interactive affordances and key ledger highlights.
  - Hover state: `#0057D9`
  - Active / focus state: `#EBF3FF`
- **Money In / Inflow (`#0FA47F`):** Dedicated accounting green for income, positive balances, customer deposits, and credit adjustments. Always formatted with an explicit `+` prefix.
- **Money Out / Outflow (`#E5484D`):** Dedicated accounting coral for business/personal expenses, payable accounts, debits, and deficits. Always formatted with an explicit `−` prefix.
- **Alert / Pending (`#E8A13A`):** Cautionary amber for liquidity alerts, impending tax liabilities, overdue invoices, and distant savings thresholds.

## Typography

Typography prioritizes tabular legibility and strict visual weight over decorative flourish.

### Tabular Formatting Rule
Every monetary figure, percentage change, exchange counter, and timestamp **must** enforce `font-variant-numeric: tabular-nums` (or CSS `tabular-nums`). Decimal separators and currency markers must stack evenly down data tables and card columns to allow instant verification of sums.

### Two-Tone Title Pattern
Major views and dashboard headers use the signature two-tone title formula:
- Base text rendered in `#0B1C34`, weight `font-extrabold` (800), tracking tightly at `-0.03em`.
- The terminal 1 or 2 focal words switch to Brand Blue (`#0E6FFF`), creating a crisp identity lockup across accounting panels (e.g., "Consolidated **Liquidity**", "Accounts **Payable**").

### Currency Formatting Syntax
- **Bolivian Boliviano (BOB):** Prefix `Bs ` followed by thousands dot and decimal comma (e.g., `Bs 12.345,67`).
- **US Dollar (USD):** Prefix `US$ ` followed by thousands space/comma and decimal point/comma standard (e.g., `US$ 45,00` or `US$ 1,240.50` based on organization locale).
- Sub-labels for secondary currency equivalents always render in `body-sm` using `#5B6B85`.

## Layout & Spacing

The layout is constructed on an intentional 8pt spatial grid with 4pt micro-adjustments for tight financial rows. 

### Breakpoints & Canvas Bounds
- **Mobile (`< 640px`):** Single-column vertical stream. Canvas margin is `1rem` (16px). Cards span the full safe area width.
- **Tablet (`640px - 1024px`):** 6-column fluid grid. Canvas margin expands to `1.5rem` (24px) with `1rem` (16px) gutters. Financial overview cards tile into 2 columns.
- **Desktop (`> 1024px`):** 12-column grid capped at a maximum width of `1280px`. Left rail reserved for navigation (fixed `260px`), central workboard spanning `margin-desktop` (40px) padding, with 24px column gutters.

### Component Spacing Discipline
- **Data Table Density:** Financial rows utilize `0.75rem` (12px) vertical cell padding to balance scan density with touch accessibility.
- **Balance Hero Blocks:** Metric cards leverage `1.5rem` (24px) internal padding to preserve whitespace around prominent figures.
- **Form Groups:** Field vertical cadence uses `space-md` (16px), with `space-xs` (8px) between labels and control boundaries.

## Elevation & Depth

Visual hierarchy is maintained via surface tonal contrast and hairline containment rather than dramatic drop shadows. The design system rejects blurred, tinted, or multi-tiered shadows in favor of a crisp architectural posture.

### Surface Hierarchy
1. **Base Layer (L0):** Frost `#F6F8FC`. Provides background contrast for the entire application viewport.
2. **Container Layer (L1):** Pure White `#FFFFFF`. Elevated cleanly using a razor-sharp hairline boundary (`1px solid rgba(11, 28, 52, 0.08)`) and `shadow-sm` (`0 1px 2px 0 rgba(11, 28, 52, 0.04)`). No deep ambient shadows are permitted.
3. **Muted Sub-Containers (L0 Recessed):** Surface-muted `#EDF1F8`. Nested inside L1 cards to frame operational totals, status headers, and auxiliary filter trays.
4. **Interactive Floating Elements (L2):** Modals, transaction drawers, and flyout selectors rely on `#FFFFFF` with an expanded micro-boundary (`1px solid rgba(11, 28, 52, 0.12)`) and a restrained structural shadow (`0 8px 24px -4px rgba(11, 28, 52, 0.08)`).

## Shapes

The geometry pairs structural containers with tactile, pill-shaped action touchpoints to create clear distinctions between static ledger areas and interactive triggers.

### Radii Governance
- **Cards & Primary Surface Enclosures:** Explicitly set to `20px` (`rounded-[20px]`). This radius softens multi-currency metric tiles while maintaining an authoritative presence.
- **Primary & Secondary Action Controls:** Strictly pill-shaped (`rounded-full`, radius `9999px`). The tactile pill silhouette signals immediate interactability across balance transfers, record creations, and filtering bars.
- **Inputs, Form Fields, and Dropdowns:** Standardized at `12px` (`rounded-xl`). Balances the curvature of the outer 20px containers and inner pill buttons.
- **Badges, Tags, & Status Pills:** Fully rounded (`rounded-full`) with reduced vertical padding to signal live state without competing with action buttons.

## Components

### Buttons & Action Controls
- **Primary Action:** Pill style (`rounded-full`), height fixed at `52px` (`h-13`), horizontal padding `24px`. Background `#0E6FFF`, label white weight 600. Hover shifts to `#0057D9`. Focus ring: 3px `#EBF3FF` outline.
- **Secondary Action:** Pill style (`rounded-full`), height `44px` or `52px`. Background `#EDF1F8`, text `#0B1C34`, hover background `#E2E8F0`.
- **Tertiary / Utility Filter Pill:** Pill style (`rounded-full`), height `36px`, padding `14px`. Unselected: transparent surface with `1px solid rgba(11, 28, 52, 0.08)` and text `#5B6B85`. Selected: `#0B1C34` text and surface `#EBF3FF` or `#0E6FFF` with white text.

### Form Inputs & Currency Selectors
- **Input Fields:** Height `48px`, border-radius `12px` (`rounded-xl`), stroke `1px rgba(11, 28, 52, 0.12)`, background `#FFFFFF`. Active focus transitions stroke to `#0E6FFF` with a 2px `#EBF3FF` ring.
- **Dual-Currency Input Group:** Combined numeric field and currency picker. The currency signifier (`BOB` or `USD`) sits within a surface-muted `#EDF1F8` pill embedded directly on the right margin. Input digits must enforce tabular formatting and align right or left based on locale conventions.

### Transaction Lists & Ledger Rows
- **Container:** Wrapped within a 20px card.
- **Row Styling:** Minimum height `64px`, border-bottom `1px solid rgba(11, 28, 52, 0.06)`. Last child removes bottom border.
- **Inflow Presentation:** Figures render in Teal (`#0FA47F`), weight 600, formatted with `+` prefix and tabular font setting (e.g., `+Bs 2.450,00`).
- **Outflow Presentation:** Figures render in Coral (`#E5484D`), weight 600, formatted with `−` prefix (U+2212) and tabular font setting (e.g., `−US$ 120,50`).

### Chips, Badges, & Financial Indicators
- **Inflow Badge:** Light teal base (`rgba(15, 164, 127, 0.10)`), text `#0FA47F`, `rounded-full`, text label 11px uppercase bold.
- **Outflow Badge:** Light coral base (`rgba(229, 72, 77, 0.10)`), text `#E5484D`, `rounded-full`, text label 11px uppercase bold.
- **System Warning Badge:** Light amber base (`rgba(232, 161, 58, 0.12)`), text `#C27A18`, `rounded-full`.

### Account Iconography (Material Symbols Rounded)
Account categories leverage dedicated roundel icons embedded inside a `40px` circular `#EDF1F8` badge:
- **Cash / Petty Vault:** `payments`
- **Bank Checking & Liquidity:** `account_balance`
- **Credit / Corporate Card:** `credit_card`
- **Savings / Emergency Vault:** `savings`
Icons render at 20px optical size using Ink `#0B1C34`.