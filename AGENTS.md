# Caudal — Guía para agentes

Control de dinero personal y de emprendimientos: **fondos** (personal, impresión 3D, chocolates, velas…) con sus **cuentas** (efectivo, banco, tarjeta, ahorro), multimoneda **BOB/USD**, gastos/ingresos, transferencias, recurrentes, deudas/MSI, metas de ahorro y reportes. App **multiusuario** (cada cuenta ve solo sus datos). Se construye orientado a **Spec-Driven Development** (SDD): el spec es la fuente de verdad, no el código.

## Stack (acordado)

| Capa | Elección | Notas |
|---|---|---|
| Framework | Nuxt 4 (Nitro) | Backend y frontend en el mismo repo |
| UI | Nuxt UI v4 (Tailwind v4) | Componentes reutilizables de la librería, no reinventar |
| BD | **PostgreSQL 16** + **Drizzle ORM** | Acceso solo vía `server/utils/db.ts`; esquema en `server/db/schema.ts` y migraciones con `drizzle-kit`. Dev: base `caudal_dev` del Postgres del workdir (`127.0.0.1:5434`) |
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
pnpm db:generate # drizzle-kit generate: crea migración desde server/db/schema.ts
pnpm db:migrate  # drizzle-kit migrate: aplica las migraciones pendientes
pnpm db:push     # drizzle-kit push: sincroniza el esquema en dev (sin migración)
pnpm db:studio   # drizzle-kit studio: explorar la BD (opcional)
pnpm release    # release: bump + tag vX.Y.Z + push (dispara la CI). Gates: main, limpio, lint/tests/build
pnpm screenshots  # capturas Playwright (1280px + 390px) en .screenshots/ — requiere `pnpm build` antes
pnpm icons        # regenera favicon.ico + PNG de marca desde public/favicon.svg (Playwright)
pnpm seed:demo    # siembra datos de demo vía API (para capturas/pruebas)
pnpm e2e          # verificación end-to-end (BASE_URL, por defecto prod)
```

## Deploy (producción)

- **Repo**: `https://github.com/ErwinFloresMarca/caudal` — rama `main`. Trunk-based.
- **Release**: `pnpm release [patch|minor|major]` (`scripts/release.sh`) valida rama/árbol/lint/tests/build, sube la versión, crea el tag anotado `vX.Y.Z` y hace push.
- **Pipeline** `.github/workflows/build-release.yml`: en tag `v*` → `test`+`lint`+`typecheck`+`build` → publica `caudal-output.tar.gz` (`.output` + `ecosystem.config.cjs`) → el job `deploy` entra por SSH y ejecuta el deploy real.
- **Deploy real**: `bash scripts/deploy.sh [tag]` (desde el checkout del repo; sin tag usa el último release) — descarga el release con `gh`, extrae `.output`+`ecosystem`, aplica migraciones y reinicia pm2 (nombre `caudal`, `127.0.0.1:3071`). El `.env` vive en `/var/www/caudal/current/.env`. El job `deploy` de la CI ejecuta este mismo script (del checkout) con el tag que acaba de publicar (SPC-029/SPC-032): un solo camino, con historial en git.
- **Migraciones en el deploy**: las aplica `deploy.sh` desde el checkout del repo indicado por `CAUDAL_REPO_DIR` (por defecto `/root/apps/opencode-workdir/caudal`), que debe tener `node_modules` y estar igual a `origin/main`; el script falla si no. El bundle de Nitro no lleva `drizzle-kit`. Los secrets `VPS_*` son opcionales: sin ellos el job `deploy` no hace nada y se despliega a mano.
- **nginx**: `caudal.erfm.dev` → `127.0.0.1:3071` (`/etc/nginx/sites-available/caudal`). DNS/HTTPS los pone Cloudflare.
- **BD**: PostgreSQL dedicada de producción (`caudal_prod`, rol `caudal`) en el Postgres de producción `127.0.0.1:5432`, vía `DATABASE_URL` (env del server, nunca en el repo). Las migraciones se aplican en `deploy.sh`.
- **Secrets del repo** (opcionales; sin ellos el job `deploy` de la CI se saltea y se despliega a mano): `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `VPS_SSH_KEY_PASSPHRASE` (solo si la key tiene passphrase). `DATABASE_URL` **no** lo usa el pipeline: la migración corre en la VPS y toma el `DATABASE_URL` del `.env` de `current/`.

## MCP (asistente)

- **`POST /api/mcp`** — servidor MCP (Streamable HTTP, JSON-RPC 2.0) en `server/api/mcp*.ts`; tools en `server/utils/mcp.ts`.
- **Auth**: `Authorization: Bearer caudal_...` (API key de SPC-003, se crea en Ajustes). Sin key → 401.
- **Tools (54)** definidas en `server/utils/mcp.ts` (`TOOLS`), agrupadas por dominio (fondos, cuentas, transacciones, transferencias, aportes, recurrentes, deudas, metas, presupuestos, reportes, ajustes). Cada una declara su `inputSchema` y los argumentos se validan contra él (SPC-033/SPC-036): un argumento no declarado responde -32602. `create_*` guardan `fuente='asistente'`.
- **Sin SDK** (decisión 0008). Las tools operan solo sobre el usuario de la key.

## Git y Linear (obligatorio)

- **Repo**: `ErwinFloresMarca/caudal` — rama `main`. Trunk-based: se trabaja sobre `main`.
- **Seguimiento**: cada feature/tarea tiene un issue en el proyecto **Caudal** de Linear ([Caudal](https://linear.app/self-proyects/project/caudal-52321193bd83), team `SEL`, ids tipo `SEL-xxx`). Toda implementación queda enlazada a su issue.

Workflow por feature:

1. El feature tiene su spec en `docs/specs/` y su issue en Linear. Al empezar, mover el issue a **In Progress**.
2. Al terminar cada paso funcional (no "cada archivo"), hacer commit y push a `main` con el issue como prefijo.
3. Al cerrar la feature: spec `verificada`, issue a **Done** (o **Canceled**), registrar en `docs/decisions/` las decisiones importantes.

Formato de commit:

```
SEL-042: transacciones + módulo money con tests
```

Reglas:

- **Nunca terminar una sesión con cambios sin subir.** Worktree limpio y push hecho antes de dar una tarea por finalizada.
- Un commit se asocia a un solo issue. Sin issue → prefijo `chore:`.
- **Planificación y specs ↔ Linear**: cualquier cambio en planificación o en specs (criterios de aceptación, alcance, estado) debe reflejarse en los issues de Linear correspondientes. Si cambia el plan, crear/actualizar el issue.

## Estructura

```
caudal/
  app/
    pages/            inicio (dashboard), movimientos, cuentas, fondos, presupuestos,
                      transferencias, recurrentes, deudas, metas, reportes, ajustes,
                      login, registro
    components/       Nuxt UI components
    composables/
  server/
    api/              rutas Nitro (auth, fondos, cuentas, categorias, transacciones,
                      transferencias, recurrentes, deudas, metas, presupuestos, reportes,
                      api-keys, mcp)
    utils/db.ts       ★ cliente Drizzle (único punto de acceso a la BD)
    db/schema.ts      ★ esquema Drizzle (tablas, enums, relaciones)
    db/migrations/    migraciones SQL generadas por drizzle-kit
    utils/*.ts        un repositorio por dominio (fondos, cuentas, transacciones…)
  shared/             tipos + lógica pura (money, transacciones, recurrentes, presupuestos...) — sin imports de server
  drizzle.config.ts   configuración de drizzle-kit (schema, out, dialect)
  tests/              vitest: money, recurrentes, transacciones, aislamiento
  docs/
    ROADMAP.md
    specs/            specs SDD por feature (SPC-001…)
    decisions/        decisiones marcadas (modelo de datos, multimoneda, diseño)
    stitch_caudal_wireframe_specs/   mockups aprobados (36 pantallas 390px/1280px) + design canónico
    wireframe-prompt.md              prompt compilado que generó los mockups (SPC-021)
  DESIGN.md
  AGENTS.md
```

## Convenciones

- **Dinero en enteros (centavos).** La aritmética monetaria vive en `shared/money.ts` y SIEMPRE usa enteros. Prohibido `float` para montos. `shared/money.ts` expone: tipo `Money { centavos, moneda }`, `parseAmount()` (acepta `12,50` → 1250), `formatMoney()` (formato BOB/USD), `convertToBase()` (tasa paralelo).
- **Lógica pura va a `shared/`**, importable por tests sin tocar servidor. Las rutas API solo orquestan: leer BD → `shared/` decide → persistir.
- **DB**: **PostgreSQL** vía **Drizzle ORM**. Cliente único en `server/utils/db.ts` (`drizzle(pool)` sobre `pg`, leyendo `DATABASE_URL`); esquema en `server/db/schema.ts`; migraciones generadas con `drizzle-kit` en `server/db/migrations/`. Los repositorios por dominio usan el query builder de Drizzle (sin SQL crudo en rutas). Ids enteros (`identity`). Ver `docs/decisions/0003-postgres-drizzle.md`.
- **Multimusuario**: **toda** tabla de datos lleva `user_id` y **toda** consulta filtra por el usuario de la sesión (nunca un `user_id` que venga del cliente). **No agregar tablas nuevas sin esa columna.**
- **Multimoneda**: cada `cuenta` tiene moneda fija (BOB|USD) y hereda su moneda a las transacciones. Las transacciones en USD guardan `tasa_ref` (BOB por USD, dólar paralelo). Ver `docs/decisions/0002-multimoneda.md`.
- **Aportes/retiros entre fondos** = dos transacciones ligadas por `grupo_id` (gasto en origen + ingreso en destino). Transferencia es solo entre cuentas **del mismo fondo** y no afecta resultado.
- **UI en español.** Toda la copia visible es en español.
- **Style**: seguir `DESIGN.md`. Tipografía **Inter** (fallback system-ui), monetarios siempre `tabular-nums`. Usar las utilidades `card` / `card-muted`, píldoras `h-13 rounded-full`, titulares two-tone. Tokens: `bg #F6F8FC`, `surface`, `surface-muted #EDF1F8`, `surface-tint #EBF3FF`, `ink #0B1C34`, `brand #0E6FFF`/`#0057D9`, `positive #0FA47F`, `negative #E5484D`, `warning #E8A13A`. Solo son válidas las clases y tokens del DESIGN.md; no inventar paletas ni sistemas de iconos (Material Symbols). Detalle de componentes: `docs/stitch_caudal_wireframe_specs/caudal_ledger_standard/DESIGN.md`.
- **Color mode**: claro / oscuro / sistema (SPC-028). `nuxt.config.ts` usa `colorMode.preference: 'system'`; los tokens claros y oscuros viven en `app/assets/css/main.css` (`@theme static` + bloque `.dark`) y el toggle está en el menú del avatar y en Ajustes. Mantener ambos modos al tocar UI (verificar con capturas en los dos).
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