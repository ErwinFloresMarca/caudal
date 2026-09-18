# SPC-023 — Login con Google (OAuth)

Estado: propuesta
Depende de: SPC-002, SPC-003, SPC-004
Extiende: SPC-002 (modelo de datos), SPC-003 (auth)

## Problema

Hoy el acceso a Caudal es solo email + contraseña (SPC-003). Crear y recordar otra contraseña es fricción, sobre todo en móvil. Se quiere ofrecer **"Continuar con Google"** como alternativa, reutilizando el patrón ya probado en `coin-holder-generator` y `vault-app` (`nuxt-auth-utils` + `defineOAuthGoogleEventHandler`), pero adaptado al stack de Caudal: SQLite vía `node:sqlite`, **sin ORM**, esquema idempotente y repositorios con SQL directo. Solo Google en v1; Facebook y otros proveedores quedan fuera de alcance.

## Requerimientos

### Modelo de datos (delta sobre SPC-002)

- `users.password_hash` pasa a ser **nullable**: un usuario que entra solo con Google no tiene contraseña.
- `users` gana `avatar_url TEXT` (nullable); se toma del proveedor y puede quedar vacío.
- Nueva tabla `oauth_accounts(id, user_id, provider, provider_id, email, name, avatar_url, created_at)`:
  - `UNIQUE(provider, provider_id)` e índice por `user_id`; FK `user_id → users(id)`.
  - `provider` es `TEXT` (v1: `'google'`). La columna es genérica solo para no migrar si luego se agrega otro proveedor.
- `server/utils/schema.ts`: subir `PRAGMA user_version` con la migración que crea `oauth_accounts` y ajusta `users` (idempotente, como SPC-002).

### Lógica de vinculación (testeable, fuera del handler)

- Nueva función en `server/utils/users.ts`: `findOrCreateOAuthUser({ provider, providerId, email, name, avatarUrl })` → devuelve el `user`. Corre en una transacción.
- Tres casos, igual que los proyectos de referencia:
  1. Existe `oauth_accounts(provider, provider_id)` → actualiza `avatar_url` y usa ese usuario.
  2. No existe la cuenta OAuth pero el email ya está en `users` → crea la fila `oauth_accounts` vinculada a ese usuario (Google garantiza el email verificado) y actualiza `avatar_url`. No se duplica el usuario.
  3. No existe ni email ni cuenta → crea `users` (sin `password_hash`) **y** `oauth_accounts` en la misma transacción.

### Configuración y rutas

- `nuxt.config.ts`: `runtimeConfig.oauth.google = { id: NUXT_OAUTH_GOOGLE_ID, secret: NUXT_OAUTH_GOOGLE_SECRET }`. Añadir ambas variables a `.env.example` (sin valores).
- `server/routes/auth/google.ts` con `defineOAuthGoogleEventHandler` (mismo path que `coin-holder-generator` y `vault-app`):
  - `onSuccess`: resolver el usuario con `findOrCreateOAuthUser`, abrir sesión con `setUserSession(event, { user: { id, email, name } }, sessionCookieConfig(event))` y `sendRedirect(event, '/')`.
  - `onError`: registrar el error en consola (sin tokens) y redirigir a `/auth/error?provider=google`.
- El path `/auth/google` y su callback deben quedar **públicos**: fuera del middleware de API de SPC-003 y de la allowlist de redirección del shell (junto a `/login`).

### UI

- Botón "Continuar con Google" en la pantalla de login (SPC-004) apuntando a `/auth/google`, con el estilo de `DESIGN.md`.
- Página `/auth/error` (o estado de error en login) con el mensaje "No se pudo iniciar sesión con Google" y botón para reintentar. Copia en español.
- Si ya hay sesión, `/login` redirige a `/` (ya definido en SPC-003/SPC-004).

### Seguridad y fronteras

- **NUNCA** persistir tokens de Google: solo `provider_id`, `email`, `name` y `avatar_url`.
- **NUNCA** loggear `clientSecret`, tokens ni códigos OAuth.
- `NUXT_SESSION_PASSWORD` sigue siendo obligatorio en producción.
- No se añade Facebook ni otro método de login: fuera de alcance.

## Criterios de aceptación

- [ ] Con `NUXT_OAUTH_GOOGLE_ID` / `NUXT_OAUTH_GOOGLE_SECRET` válidos, `/auth/google` completa el flujo y deja sesión iniciada (cookie HTTP-only).
- [ ] Email nuevo: crea `users` (sin password) + `oauth_accounts` y entra a `/`.
- [ ] Email que ya existía con contraseña: NO duplica usuario; crea el vínculo en `oauth_accounts` y entra.
- [ ] Reintentar con la misma cuenta Google reutiliza el mismo `user_id` (sin duplicados).
- [ ] `onError` redirige a `/auth/error?provider=google` sin exponer tokens ni secretos.
- [ ] Test vitest de `findOrCreateOAuthUser` cubre los 3 casos y no toca datos de otro usuario.
- [ ] Test: `/auth/google` no exige sesión previa; una ruta de datos sigue devolviendo 401 sin ella.
- [ ] `grep` del repo no encuentra persistencia de access/refresh tokens.
- [ ] `pnpm lint`, `pnpm test` y `pnpm build` pasan.

## Patrón de referencia (a adaptar, no copiar literal)

El flujo es idéntico en ambos proyectos; Caudal cambia el ORM (Prisma → SQL) y los ids (cuid → enteros de SQLite).

- `coin-holder-generator/server/routes/auth/google.ts` — handler con los 3 casos + `setUserSession`.
- `vault-app/server/routes/auth/google.ts` — variante más limpia y comentada.
- `coin-holder-generator/server/utils/auth.ts`, `vault-app/server/utils/auth.ts` — `requireUser` / `requireAdmin`.
- `vault-app/pages/login.vue` — botón "Continuar con Google".
- `vault-app/pages/auth/error.vue` — página de error de OAuth.
