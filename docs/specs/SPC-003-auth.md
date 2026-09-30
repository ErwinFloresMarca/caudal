# SPC-003 — Auth multiusuario + API keys para MCP

Estado: verificada
Depende de: SPC-001, SPC-002

## Problema

Caudal es multiusuario (también para el asistente IA vía MCP). Hace falta registro/login con sesión HTTP-only por usuario y una API key por usuario para que el MCP (o scripts propios) autoricen peticiones fuera del navegador. Sin SSO compartido con Ritmo.

## Requerimientos

- Registro por email + contraseña, hash con `scrypt` (stdlib).
- Login/logout vía `nuxt-auth-utils` (sesión HTTP-only). Protección de rutas API y de página por defecto.
- Login con Google como método alternativo: ver **SPC-023** (extiende este spec; `password_hash` nullable).
- Alto: los email duplicados fallan registrando (no por críptico, con mensaje claro).
- `me` endpoint para el front (¿quién soy?).
- API keys: tabla `api_keys` (SPC-002) con `key_hash` (hash de la key), nombre y `last_used_at`. Solo el dueño las ve/crea/revoca. En Ajustes (SPC-017).
- Middleware de API: rutas que admiten `Authorization: Bearer <apikey>` (para MCP) o sesión de navegador. Prefijo constante `caudal_...` en la key (para reconocerla).
- Un usuario no accede a datos de otro aunque conozca la URL (filtro `user_id` de sesión SIEMPRE, nunca del cuerpo de la petición).
- No guardar la key en claro ni en logs; `last_used_at` se actualiza al usarse.
- Tiene máximo razonable: TTL no obligatorio en v1 (se revoca manualmente).

## Criterios de aceptación

- [x] `POST /api/auth/register` crea usuario y abre sesión; el usuario ve `/dashboard`. (La sesión abre; la página `/dashboard` es de SPC-004/014.)
- [x] Registrarse con email ya usado devuelve error amigable (409).
- [x] `GET /api/me` devuelve `{ id, email, name }` con sesión válida y 401 sin sesión.
- [x] Una API key generada (`POST /api/api-keys`) autentica con `Authorization: Bearer caudal_...` y actualiza `last_used_at`.
- [x] Revocar la key invalida el Bearer al instante.
- [x] Con la key NO se puede pasar `user_id` propio (se ignora y se toma el de la key).
- [x] Test: dos usuarios crean datos; usuario B con API key no ve los datos del A.
- [x] `pnpm lint` y `pnpm build` pasan.

## Implementación (decisiones)

- **Tipos de sesión** (SEL-116): el augmentation de `nuxt-auth-utils` va en `shared/types/auth.d.ts` apuntando al módulo **`#auth-utils`** (no `nuxt-auth-utils`). Nuxt solo incluye `shared/**/*.d.ts` y `*.d.ts` raíz en el tsconfig, por eso un `types/` raíz no se aplicaba. `User` = `{ id, email, name, avatar_url? }`; `UserSession` = `{ fondo_activo_id? }`.
- `avatar_url` (de Google, SPC-023) se incluye en la sesión desde `login.post.ts` y en `GET /api/auth/me`.