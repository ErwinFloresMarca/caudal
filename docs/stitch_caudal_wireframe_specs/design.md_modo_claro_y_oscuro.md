# Design System Specification: Caudal Ledger
**Documento Técnico:** DESIGN.md  
**Versión:** 2.5.0 — Multi-Theme Support (Light & Dark Mode)  
**Sistema Contable:** Caudal Ledger (Partida Doble, Bóvedas Criptográficas & Orquestación MCP)

---

## 1. Filosofía y Principios de Diseño

Caudal es un sistema contable y patrimonial de alta precisión (estricto apego a partida doble, multimoneda BOB/USD indexada en tiempo real y arquitectura de custodia Zero-Knowledge). Su lenguaje visual debe transmitir:
- **Rigor Cripto-Contable:** Máxima legibilidad tipográfica y alineación numérica tabular.
- **Jerarquía de Superficies Suave:** Elevación mediante capas de contenedores (`container-lowest` a `container-highest`) sin sobrecargar sombras agresivas.
- **Dualidad de Contexto Lumínico:** Transición coherente entre un modo diurno nítido de alta claridad ejecutiva y un modo nocturno de baja fatiga visual para terminales de monitoreo continuo y agentes MCP.

---

## 2. Paleta de Colores & Mapeo de Tokens Semánticos

### 2.1. Tokens de Marca y Semántica Funcional (Globales)
- **Primary (Azul Maestro Caudal):** `#0e6fff` (Light) / `#4d8fff` (Dark - ajustado para contraste AA en fondos oscuros)
- **On-Primary:** `#ffffff` (Light) / `#00296b` (Dark)
- **Primary Container:** `#e0ebff` (Light) / `#00439c` (Dark)
- **On-Primary Container:** `#001c4d` (Light) / `#d4e3ff` (Dark)

- **Semantic Success (Activo / Cuadrado / Ingreso):**
  - Light: `#059669` (Surface container: `#ecfdf5`, Text: `#065f46`)
  - Dark: `#10b981` (Surface container: `#064e3b`, Text: `#6ee7b7`)
- **Semantic Danger / Error (Deuda / Bloqueo / Gasto):**
  - Light: `#dc2626` (Surface container: `#fef2f2`, Text: `#991b1b`)
  - Dark: `#ef4444` (Surface container: `#7f1d1d`, Text: `#fca5a5`)
- **Semantic Warning (Auditoría / Pendiente):**
  - Light: `#d97706` (Surface container: `#fffbeb`, Text: `#92400e`)
  - Dark: `#f59e0b` (Surface container: `#78350f`, Text: `#fde68a`)
- **Semantic Info / Neutral (Partida Neutral / MCP Protocol):**
  - Light: `#0891b2` (Surface container: `#ecfeff`, Text: `#155e75`)
  - Dark: `#06b6d4` (Surface container: `#164e63`, Text: `#67e8f9`)

---

### 2.2. Arquitectura de Superficies: Modo Claro vs. Modo Oscuro

| Token Semántico | Modo Claro (Light Mode) | Modo Oscuro (Dark Mode) | Rol de Uso |
| :--- | :--- | :--- | :--- |
| `surface` | `#f9f9ff` | `#0b0f17` | Fondo base de la aplicación / Canvas global |
| `surface-dim` | `#cbdbfb` | `#080b11` | Áreas atenuadas o fondos de baja prioridad |
| `surface-bright` | `#ffffff` | `#161c28` | Tarjetas destacadas / modales flotantes |
| `surface-container-lowest` | `#ffffff` | `#0e131d` | Fondo de cards primarias y áreas de lectura |
| `surface-container-low` | `#f0f3ff` | `#141a26` | Listados anidados, inputs inactivos |
| `surface-container` | `#e7edfc` | `#1a2232` | Contenedores de agrupación y cards secundarias |
| `surface-container-high` | `#dfe7f7` | `#222c40` | Headers de tablas, hover en elementos interactivos |
| `surface-container-highest`| `#d2ddf2` | `#2c374f` | Divisores fuertes, bordes y chips de filtro |
| `on-surface` | `#131b2e` | `#e2e8f0` | Texto primario de alta jerarquía y títulos |
| `on-surface-variant` | `#424754` | `#94a3b8` | Subtítulos, labels secundarios y timestamps |
| `outline` | `#c2cad9` | `#334155` | Bordes estándar de inputs y divisores estructurales |
| `outline-variant` | `#e2e8f0` | `#1e293b` | Bordes sutiles entre filas contables |

---

### 2.3. Superficies Especiales de Seguridad & Terminal MCP
- **Code / Console Background:**
  - Light: `#0f172a` (On-Code: `#38bdf8`)
  - Dark: `#030712` (On-Code: `#38bdf8`)
- **Terminal Border & Glow:**
  - Light: `rgba(14, 111, 255, 0.15)`
  - Dark: `rgba(77, 143, 255, 0.25)`

---

## 3. Tipografía y Estructura Numérica

- **Font Family Principal:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font Family Código & Hash Criptográfico:** `'JetBrains Mono', 'Fira Code', ui-monospace, monospace`
- **Variante Numérica Contable:** `font-feature-settings: 'tnum' on, 'zero' on;` (Números tabulares para cuadratura vertical perfecta de balances).

### Escala Tipográfica
- **Display 1 (Saldos Principales):** `font-size: 32px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em;`
- **Heading 1 (Títulos de Página):** `font-size: 24px; font-weight: 700; line-height: 1.25; letter-spacing: -0.015em;`
- **Heading 2 (Secciones & Cards):** `font-size: 18px; font-weight: 600; line-height: 1.35;`
- **Body Regular (Lectura general):** `font-size: 14px; font-weight: 400; line-height: 1.5;`
- **Body Medium / Action (Botones y enlaces):** `font-size: 14px; font-weight: 500; line-height: 1.4;`
- **Caption / Metadata (Badges, timestamps):** `font-size: 12px; font-weight: 500; line-height: 1.3;`
- **Micro (Hashes y tokens truncados):** `font-size: 11px; font-family: monospace; font-weight: 400;`

---

## 4. Radios de Borde (Border Radius) & Elevación

- **Preset Global:** `ROUND_FULL` con bordes balanceados en contenedores internos.
- `radius-sm`: `6px` (Badges de estado, chips técnicos `SPC-xxx`, checkboxes).
- `radius-md`: `10px` (Inputs, botones secundarios, items de lista).
- `radius-lg`: `16px` (Tarjetas de métricas, bloques de formulario, tarjetas móviles).
- `radius-xl`: `24px` (Contenedores principales, modales, hojas táctiles inferiores).
- `radius-full`: `9999px` (Pills, botones CTA principales, avatares, tabs de segmented control).

### Sombras y Elevación (Box Shadows)
- **Light Mode:**
  - `elevation-1 (Cards):` `0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)`
  - `elevation-2 (Modales/Floating):` `0 8px 24px -4px rgba(14, 111, 255, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)`
- **Dark Mode:**
  - `elevation-1 (Cards):` `0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0, 0, 0, 0.4)`
  - `elevation-2 (Modales/Floating):` `0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 32px rgba(0, 0, 0, 0.6)`

---

## 5. Componentes Esenciales y Estados

### 5.1. Botón Principal (Primary CTA)
- **Light:** `bg-[#0e6fff]` text `#ffffff`, hover `bg-[#0b5cd4]`, shadow `0 4px 12px rgba(14, 111, 255, 0.25)`.
- **Dark:** `bg-[#4d8fff]` text `#001c4d`, hover `bg-[#6aa1ff]`, shadow `0 4px 14px rgba(77, 143, 255, 0.3)`.

### 5.2. Segmented Control / Switch de Contexto
- **Container:** `bg-surface-container-low` con border `outline-variant`.
- **Active Tab:** `bg-surface-container-lowest` con sombra sutil y texto `on-surface` en semi-bold.

### 5.3. Tabla de Asientos Contables / Movimientos
- **Fila Alternada (Zebra):** Fondos transparentes vs. `surface-container-lowest` al hover.
- **Lado Débito / Crédito:**
  - Débito (+): `text-emerald-600 dark:text-emerald-400`
  - Crédito (-): `text-rose-600 dark:text-rose-400`

### 5.4. Credencial y Daemon MCP
- **Badge Daemon Online:** Dot pulsante `bg-emerald-500` con ping sutil.
- **Card de Agente (Claude/Cursor/Ollama):** Borde sutil `outline-variant`, fondo `surface-container-lowest`, con bloque de scopes en chips semánticos.

---

## 6. Variables CSS / Tokens de Implementación

```css
:root {
  /* ================= LIGHT THEME (Default) ================= */
  --color-primary: #0e6fff;
  --color-primary-hover: #0b5cd4;
  --color-on-primary: #ffffff;
  --color-primary-container: #e0ebff;
  --color-on-primary-container: #001c4d;

  --color-surface: #f9f9ff;
  --color-surface-dim: #cbdbfb;
  --color-surface-bright: #ffffff;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #f0f3ff;
  --color-surface-container: #e7edfc;
  --color-surface-container-high: #dfe7f7;
  --color-surface-container-highest: #d2ddf2;

  --color-on-surface: #131b2e;
  --color-on-surface-variant: #424754;
  --color-outline: #c2cad9;
  --color-outline-variant: #e2e8f0;

  --color-success: #059669;
  --color-success-container: #ecfdf5;
  --color-on-success: #ffffff;

  --color-danger: #dc2626;
  --color-danger-container: #fef2f2;
  --color-on-danger: #ffffff;

  --color-warning: #d97706;
  --color-warning-container: #fffbeb;

  --color-code-bg: #0f172a;
  --color-code-text: #38bdf8;
  --color-code-border: #1e293b;
}

[data-theme="dark"], .dark {
  /* ================= DARK THEME ================= */
  --color-primary: #4d8fff;
  --color-primary-hover: #6aa1ff;
  --color-on-primary: #001c4d;
  --color-primary-container: #00439c;
  --color-on-primary-container: #d4e3ff;

  --color-surface: #0b0f17;
  --color-surface-dim: #080b11;
  --color-surface-bright: #161c28;
  --color-surface-container-lowest: #0e131d;
  --color-surface-container-low: #141a26;
  --color-surface-container: #1a2232;
  --color-surface-container-high: #222c40;
  --color-surface-container-highest: #2c374f;

  --color-on-surface: #f1f5f9;
  --color-on-surface-variant: #94a3b8;
  --color-outline: #334155;
  --color-outline-variant: #1e293b;

  --color-success: #10b981;
  --color-success-container: #064e3b;
  --color-on-success: #ffffff;

  --color-danger: #ef4444;
  --color-danger-container: #7f1d1d;
  --color-on-danger: #ffffff;

  --color-warning: #f59e0b;
  --color-warning-container: #78350f;

  --color-code-bg: #030712;
  --color-code-text: #38bdf8;
  --color-code-border: #1f2937;
}
```
