# SPC-030 — Fondo predeterminado y selección de fondo

Estado: aprobada · Issue: SEL-269

Depende de: [SPC-005](./SPC-005-fondos.md) (fondos), [SPC-004](./SPC-004-shell.md) (shell/navegación), [SPC-031](./SPC-031-mcp-fund-id-y-tests-en-ci.md) (deja los tests del MCP sin depender del fondo implícito)

## Problema

**1. No existe el concepto de "fondo por defecto".** Cuando no hay fondo elegido, tanto el backend
web como el MCP caen en `listarFondos(userId)[0]`, que ordena **por nombre**
(`server/utils/fondos.ts:75`): el fondo por defecto es el **alfabéticamente primero**, y el
resultado depende de la colación de la base.

- `fondoActivoUsuario` (`server/utils/fondos.ts:146-153`): si la sesión no tiene
  `fondo_activo_id`, devuelve el primer fondo por nombre. Es el punto de entrada de ~15 endpoints.
- `resolverFondo` (`server/utils/mcp.ts:117-126`): si la tool no recibe `fund_id`, usa el mismo
  criterio. En el MCP esto es peor: el asistente **escribe** (deudas, metas, presupuestos,
  recurrentes) en un fondo que el usuario nunca eligió.

**2. En móvil no hay forma de cambiar de fondo.** `FondoActivoMenu` vive solo en el sidebar de
escritorio (`app/components/AppSidebar.vue:29`, oculto bajo `lg:`) y `AppBottomNav` no lo incluye.
El header móvil (`app/layouts/default.vue:12-17`) solo muestra el logo: el indicador de fondo está
`hidden lg:block`. En la práctica, en el teléfono el usuario queda pegado al fondo que resolvió el
fallback.

**3. La página de Fondos no permite seleccionar nada.** `app/pages/fondos/index.vue` lleva cada
card al detalle (`/fondos/:id`); no marca cuál está en uso ni ofrece cambiar. El mockup aprobado de
esa pantalla sí lo especifica: badge **"Activo"**, acento en la card y botón **"Cambiar a este
fondo"** (390px y 1280px), y el selector de fondo en el header móvil.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Dónde se guarda el "por defecto" | Clave `fondo_default_id` en la tabla `settings` que ya existe, sin migración (precedente: `moneda_base`) |
| Seleccionar desde Fondos | Botón **"Usar este fondo"** en cada card **y** selector de fondo en el header móvil |
| Qué hace marcar por defecto | Solo cambia el default; **no** activa el fondo |
| Relación con el activo | Dos conceptos separados: **activo** = dónde estoy trabajando ahora (sesión, `fondo_activo_id`); **por defecto** = el que se usa al entrar y cuando no se especifica fondo (persistente, viaja entre dispositivos) |

## Requerimientos

- El fondo por defecto **MUST** persistir por usuario en `settings` (`fondo_default_id`), y
  **MUST** validarse contra los fondos del propio usuario: nunca se acepta un id ajeno (aislamiento).
- `fondoActivoUsuario` **MUST** resolver en este orden: fondo de la sesión (si sigue activo) → fondo
  por defecto (si sigue activo) → primer fondo activo por **id** (creación), determinista e
  independiente de la colación.
- `resolverFondo` del MCP **MUST** usar el mismo criterio que `fondoActivoUsuario`. **MUST NOT**
  quedar dos políticas de fondo por defecto.
- Marcar un fondo como por defecto **MUST** reemplazar al anterior: **MUST NOT** poder haber dos.
- Desmarcar (o marcar y volver a tocar) **MUST** dejar al usuario sin default, y el sistema
  **MUST** volver al primer fondo activo por id.
- Un fondo por defecto oculto (`activo = false`) **MUST NOT** usarse como default.
- La página de Fondos **MUST** indicar cuál es el fondo activo (badge "Activo" + acento) y **MUST**
  permitir usarlo con un botón en la card, sin pasar por el detalle.
- El header móvil **MUST** permitir ver y cambiar el fondo activo en pantallas chicas (~360px),
  donde hoy no hay ningún control.
- Cambiar el fondo activo desde Fondos **MUST** ser suficiente para que el alta de movimientos caiga
  en ese fondo (el alta preselecciona la primera cuenta del fondo activo,
  `app/components/FormMovimiento.vue:50`).
- Toda mutación **MUST** filtrar por el usuario de la sesión; el valor del cliente nunca se usa como
  `user_id`.
- La UI **MUST** usar componentes y tokens de Nuxt UI / `DESIGN.md` (no inventar paletas), y
  **MUST** verse bien en móvil y escritorio.

## Criterios de aceptación

- Marcar "Fondo B" como por defecto: `GET /api/fondos/activo` sin fondo de sesión devuelve B, y las
  tools del MCP sin `fund_id` operan sobre B (deja de ser el alfabéticamente primero).
- Marcar B y luego C: solo C queda marcado.
- Ocultar el fondo por defecto: el sistema cae al primer fondo activo por id; el switch aparece
  apagado.
- En móvil (390px): desde el header y desde Fondos se puede cambiar el fondo activo; al abrir el
  alta de un movimiento, la cuenta preseleccionada pertenece a ese fondo.
- Un usuario **MUST NOT** poder marcar como default un fondo de otro usuario (test de aislamiento).
- `pnpm test` verde con los tests nuevos de `fondoActivoUsuario` (con default, sin default, default
  oculto) y `pnpm lint` / `pnpm build` verdes.
- Capturas en 390px y 1280px verificadas (`pnpm screenshots`), en claro y oscuro.

## Fuera de alcance

- Persistir el **fondo activo** entre dispositivos: sigue en la cookie de sesión (`SPC-005`).
- Rediseñar el selector de fondo de escritorio o el shell de navegación más allá de sumar el
  selector al header móvil.
- Tools nuevas del MCP o cambios en la lógica de las existentes.
- Mover "Fondo por defecto" a Ajustes como muestra el mockup `11.ajustes_…`: se hace desde Fondos
  (pedido explícito del usuario). Si después se quiere la fila en Ajustes, es un cambio aparte.
- Validar los `arguments` de `tools/call` contra `inputSchema` (pendiente de otro spec).

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `server/utils/settings.ts` | Accesores `getFondoDefault` / `setFondoDefault` sobre la clave `fondo_default_id` |
| `server/utils/fondos.ts` | `fondoActivoUsuario`: default y orden por id en el fallback |
| `server/utils/mcp.ts` | `resolverFondo` con el mismo criterio |
| `server/api/fondos/predeterminado.post.ts` (nuevo) | Marca/desmarca el default; valida que el fondo sea del usuario |
| `server/api/fondos/index.get.ts` | Incluir `predeterminado` en cada fondo del listado |
| `app/pages/fondos/index.vue` | Badge "Activo", botón "Usar este fondo" y control de "por defecto" por card |
| `app/composables/useFondoActivo.ts` | Exponer `marcarPredeterminado()` y `predeterminado` |
| `app/layouts/default.vue` | Selector de fondo en el header móvil (reusa `FondoActivoMenu`) |
| `app/components/FondoActivoMenu.vue` | Adaptarse al header móvil (posición del dropdown) |
| `tests/fondos.test.ts` | Tests de `fondoActivoUsuario` y de aislamiento del default |
| `docs/specs/README.md` | Fila de este spec |
