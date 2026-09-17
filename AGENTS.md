# Caudal — Guía para agentes

Control de dinero personal y de emprendimientos: **fondos** (personal, impresión 3D, chocolates, velas…) con sus **cuentas** (efectivo, banco, tarjeta, ahorro), multimoneda **BOB/USD**, gastos/ingresos, transferencias, recurrentes, deudas/MSI, metas de ahorro y reportes. App **multiusuario** (cada cuenta ve solo sus datos). Se construye orientado a **Spec-Driven Development** (SDD): el spec es la fuente de verdad, no el código.

## Stack (acordado)

| Capa | Elección | Notas |
|---|---|---|
| Framework | Nuxt 4 (Nitro) | Backend y frontend en el mismo repo |
| UI | Nuxt UI v3 (Tailwind v4) | Componentes reutilizables de la librería, no reinventar |
| BD | SQLite vía `node:sqlite` (built-in Node 22) | 0 dependencias. Todo el acceso detrás de `server/utils/db.ts`; migrar a `better-sqlite3` es cambiar 1 archivo |
| Auth | `nuxt-auth-utils` | Sesión HTTP-only **por usuario** (email + contraseña, scrypt). API keys por usuario para el MCP |
| Tests | vitest | Mínimo: dinero (money), presupuestos, recurrentes |
| E2E / capturas | Playwright (`pnpm screenshots`) + MCP `playwright` | Capturas 1280px/390px para verificación visual; no es suite de tests |
| PWA | `@vite-pwa/nuxt` | Instalable en el teléfono |

## Comandos

```bash
pnpm install
pnpm dev        # desarrollo (PORT o 3071)
pnpm dev:https  # desarrollo con HTTPS autofirmado
pnpm test       # vitest (tests/**, shared/**)
pnpm build      # build de producción
pnpm start      # node .output/server/index.mjs (PORT o 3071)
pnpm lint       # @nuxt/eslint
pnpm typecheck  # nuxt typecheck
pnpm release    # release: bump + tag vX.Y.Z + push (dispara la CI). Gates: main, limpio, lint/tests/build
pnpm screenshots  # capturas Playwright (1280px + 390px) en .screenshots/ — requiere `pnpm build` antes
```

## Deploy (producción)

- **Repo**: `https://github.com/ErwinFloresMarca/caudal` — rama `main`. Trunk-based.
- **Release**: `pnpm release [patch|minor|major]` (`scripts/release.sh`, por crear en SPC-022) valida rama/árbol/lint/tests/build, sube la versión, crea el tag anotado `vX.Y.Z` y hace push.
- **Pipeline** `.github/workflows/build-release.yml` (por crear en SPC-022): en tag `v*` → `test`+`lint`+`typecheck`+`build` → publica `caudal-output.tar.gz`.
- **Deploy real** (en el VPS): `bash /var/www/caudal/current/deploy.sh` — descarga el release con `gh`, extrae `.output` y reinicia pm2 (nombre `caudal`, `127.0.0.1:3071`).
- **nginx**: `<dominio>.erfm.dev` → `127.0.0.1:3071`. DNS/HTTPS los pone Cloudflare.
- **Secrets del repo**: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `VPS_SSH_KEY_PASSPHRASE`.

## Git y Linear (obligatorio)

- **Repo**: `ErwinFloresMarca/caudal` — rama `main`. Trunk-based: se trabaja sobre `main`.
- **Seguimiento**: cada feature/tarea tiene un issue en el proyecto **Caudal** de Linear (workspace `self-proyects`, ids tipo `CAU-xxx`). Toda implementación queda enlazada a su issue.

Workflow por feature:

1. El feature tiene su spec en `docs/specs/` y su issue en Linear. Al empezar, mover el issue a **In Progress**.
2. Al terminar cada paso funcional (no "cada archivo"), hacer commit y push a `main` con el issue como prefijo.
3. Al cerrar la feature: spec `verificada`, issue a **Done** (o **Canceled**), registrar en `docs/decisions/` las decisiones importantes.

Formato de commit:

```
CAU-007: transacciones + módulo money con tests
```

Reglas:

- **Nunca terminar una sesión con cambios sin subir.** Worktree limpio y push hecho antes de dar una tarea por finalizada.
- Un commit se asocia a un solo issue. Sin issue → prefijo `chore:`.
- **Planificación y specs ↔ Linear**: cualquier cambio en planificación o en specs (criterios de aceptación, alcance, estado) debe reflejarse en los issues de Linear correspondientes. Si cambia el plan, crear/actualizar el issue.

## Estructura

```
caudal/
  app/
    pages/            inicio (dashboard), movimientos, cuentas, fondos, transferencias,
                      recurrentes, deudas, metas, reportes, ajustes, login, registro
    components/       Nuxt UI components
    composables/
  server/
    api/              rutas Nitro (auth, fondos, cuentas, categorias, transacciones,
                      transferencias, recurrentes, deudas, metas, reportes, api-keys, mcp)
    utils/db.ts       ★ único punto de acceso a SQLite
    utils/schema.ts   esquema: CREATE TABLE IF NOT EXISTS + user_version
    utils/*.ts        un repositorio por dominio (fondos, cuentas, transacciones…)
  shared/             tipos + lógica pura (money, transacciones, recurrentes…) — sin imports de server
  data/caudal.db      BD local (.gitignore)
  tests/              vitest: money, recurrentes, transacciones, aislamiento
  docs/
    ROADMAP.md
    specs/            specs SDD por feature (SPC-001…)
    decisions/        decisiones marcadas (modelo de datos, multimoneda)
  DESIGN.md
  AGENTS.md
```

## Convenciones

- **Dinero en enteros (centavos).** La aritmética monetaria vive en `shared/money.ts` y SIEMPRE usa enteros. Prohibido `float` para montos. `shared/money.ts` expone: tipo `Money { centavos, moneda }`, `parseAmount()` (acepta `12,50` → 1250), `formatMoney()` (formato BOB/USD), `convertToBase()` (tasa paralelo).
- **Lógica pura va a `shared/`**, importable por tests sin tocar servidor. Las rutas API solo orquestan: leer BD → `shared/` decide → persistir.
- **DB**: un solo módulo (`server/utils/db.ts`) exporta la instancia `DatabaseSync`. Esquema idempotente (`CREATE TABLE IF NOT EXISTS`) con `PRAGMA user_version`. Sin ORM; SQL directo, consultas cortas.
- **Multimusuario**: **toda** tabla de datos lleva `user_id` y **toda** consulta filtra por el usuario de la sesión (nunca un `user_id` que venga del cliente). **No agregar tablas nuevas sin esa columna.**
- **Multimoneda**: cada `cuenta` tiene moneda fija (BOB|USD) y hereda su moneda a las transacciones. Las transacciones en USD guardan `tasa_ref` (BOB por USD, dólar paralelo). Ver `docs/decisions/0002-multimoneda.md`.
- **Aportes/retiros entre fondos** = dos transacciones ligadas por `grupo_id` (gasto en origen + ingreso en destino). Transferencia es solo entre cuentas **del mismo fondo** y no afecta resultado.
- **UI en español.** Toda la copia visible es en español.
- **Style**: seguir `DESIGN.md`. Usar las utilidades `card` / `card-muted`, píldoras `h-13 rounded-full`, titulares two-tone. Solo son válidas las clases y tokens del DESIGN.md; no inventar paletas ni sistemas de iconos (Material Symbols).
- **Color mode**: solo claro (`colorMode.preference: 'light'`).
- **Responsive (mobile-first)**: toda página y componente debe verse y usarse bien en móvil (~360px) y escritorio. Rejillas colapsan a 1 columna. Navegación en sidebar (escritorio, `lg:`) + barra inferior/drawer (móvil). **Crear/editar va en `USlideover`/`UModal`**, no en formularios embebidos. Verificar con capturas en ambos anchos.
- **Minimalismo / ponytail**: sin abstracciones especulativas; reusar Nuxt UI, stdlib y lo ya existente antes de añadir dependencias. El diff más corto que funcione, marcando con `ponytail:` toda simplificación deliberada con techo conocido.

## SDD (Spec-Driven Development)

Cada feature cambia algo en este orden:

1. **Spec** → `docs/specs/<id>-slug.md` con: Problema, Requerimientos, Criterios de aceptación, Estado.
2. **Estado**: `propuesta → aprobada → implementada → verificada`. Actualizar en el archivo.
3. **Implementación** mínima que cumple los criterios.
4. **Verificación**: test vitest si hay lógica (rama/loop/parser/dinero/seguridad) + `pnpm lint` + `pnpm build`.
5. **Decisión importante** (nuevo campo de BD, cambio de stack, regla de dinero) → `docs/decisions/`.

No saltarse fases: cada spec se aprueba y se implementa en orden de dependencias (ver `docs/ROADMAP.md`). Los wireframes se generan DESPUÉS de completar los specs (ver `docs/wireframe-prompt.md`).

## Skills globales de uso obligatorio

Están instaladas globalmente en `~/.config/opencode/skills/` y DEBEN usarse para sus propósitos:

- **spec-driven-development**: toda feature nueva empieza por el spec (docs/specs/). Nunca código sin spec.
- **agents-md**: para crear/editar este y otros AGENTS.md.
- **design-md**: para crear/editar DESIGN.md o la guía de design system.
- **nginx-expose**: para publicar apps/servicios en este VPS.
- **nuxt-project**, **nuxt-ui**, **nuxt-architecture**, **nuxt-reference**: para cualquier código Nuxt; el MCP `nuxt-ui` para detalles de componentes. Nunca aplicar patrones de Nuxt 3 por defecto.
- **ponytail**: antes de implementar un módulo, aplicar su escalera (¿hace falta? → reusar → stdlib → dependencia ya instalada → mínimo código).