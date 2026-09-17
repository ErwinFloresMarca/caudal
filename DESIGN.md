# Caudal — Design System (borrador v0.1)

Identidad: **flujo de agua y dinero**. En contraste con el naranja cálido de Ritmo, Caudal es frío, financiero y de números claros: azul profundo, aguas/teal, saldo y gráficas protagonistas.

## Dirección de marca (referencia de estilo)

*"Las aguas quietas de la madrugada cruzando un lago alto, con el saldo brillando sobre hielo joven"* — maqueta alta fidelidad, móvil 390px + escritorio 1280px.

Prioridad visual:
1. **El número manda.** Saldo gigante y legible; ingresos/egresos claros.
2. **Datos ordenados en canales** (filas y columnas), nunca decoración.
3. **Señal de color semántico**: teal = entra dinero, coral = sale dinero. El azul es acción/navegación, no moneda.

## Tokens (solo luz)

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#F6F8FC` (Frost) | Fondo de la app |
| `surface` | `#FFFFFF` | Cards, tablas, formularios |
| `surface-muted` | `#EDF1F8` (Mist) | Fondo de secciones, chips |
| `ink` | `#0B1C34` (Deep Water) | Texto primario, números |
| `ink-muted` | `#5B6B85` | Texto secundario |
| `brand` | `#0E6FFF` (Caudal Blue) | Acciones, enlaces, navegación activa |
| `brand-600` | `#0057D9` | Hover de acciones |
| `positive` | `#0FA47F` (Creek) | Ingresos, saldo positivo, aportes recibidos |
| `negative` | `#E5484D` (Coral) | Egresos, saldo negativo, deudas por pagar |
| `warning` | `#E8A13A` (Amber) | Avisos, metas lejanas |
| `border` | `rgb(11 28 52 / 0.08)` | 1px, separadores |

Radios: cards `rounded-[20px]`, botones píldora `h-13 rounded-full`, inputs `rounded-xl` (12px).
Sombra: ninguna pesada. Elevación = borde `1px solid rgb(11 28 52 / 0.08)` + a lo sumo `shadow-sm`. Zero-shadow por defecto.

## Tipografía

- `font-family: ui-sans-serif, system-ui, sans-serif`. Display/body con Manrope (trait para `display: 'swap'`); fallback system-ui.
- Números tabulares (`font-feature-settings: "tnum"`) en TODO monto y saldo: columnas alineadas.
- Jerarquía: titulares `font-extrabold tracking-tight`; cantidades siempre grandes en el momento clave (dashboard, detalle).

## Componentes e iconos

- **Iconos**: Material Symbols (redondeado, `rounded`). No mezclar otros sets.
- **Botón principal**: píldora `h-13 rounded-full` `font-bold`, fondo `brand`, texto blanco. Secundario: borde + `surface`.
- **Cards**: `card` = `bg-surface border border-border rounded-[20px]`; `card-muted` = `bg-surface-muted`.
- **Saldo**: texto tabular `font-extrabold`, sufijo `Bs` (BOB) o `US$` (USD).
- **Titulares two-tone**: `hs-1` color `ink` con 1-2 palabras en `brand` (patrón de Ritmo, utilitario a definir en SPC-021).
- **Iconos de cuenta por tipo** (efectivo/banco/tarjeta/ahorro), de fondo y de categoría: Material Symbols, color del fondo/categoría.

## Id de utilidades (tailwind)

Al bootstrapear (SPC-001/SPC-004) exactamente estas:

```js
// tailwind.css: @theme { @keyframes … } + .card/.card-muted
card, card-muted, hs-1, hs-2, pill, btn-primary, btn-secondary,
tabular-nums, money-plus (positive), money-minus (negative),
ip-flex (table cell layout), ol-link (link subrayado)
```

Patrón alta fidelidad no se copia de Ritmo; cada pantalla sale del prompt de wireframes (SPC-021). **Solo se aplican clases exigidas por el DESIGN.md o aprobadas en el pase visual.**

## Flujo de branding

1. Borrador de tokens (este documento).
2. `docs/wireframe-prompt.md` (SPC-021) consume esta identidad para generar los mockups.
3. El pase visual aprueba variantes exactas y este documento se congela.

Estado: **borrador**. Se congela al cerrar SPC-021.