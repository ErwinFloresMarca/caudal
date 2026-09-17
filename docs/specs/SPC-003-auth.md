# SPC-003 — Auth multiusuario + API keys para MCP

Estado: propuesta
Depende de: SPC-001, SPC-002

## Problema

Caudal es multiusuario (también para el asistente IA vía MCP). Hace falta registro/login con sesión HTTP-only por usuario y una API key por usuario para que el MCP (o scripts propios) autoricen peticiones fuera del navegador. Sin SSO compartido con Ritmo.

## Requerimientos

- Registro por email + contraseña, hash con `scrypt` (stdlib).
- Login/logout vía `nuxt-auth-utils` (sesión HTTP-only). Protección de rutas API y de página por defecto.
- Alto: los email duplicados fallan registrando (no por críptico, con mensaje claro).
- `me` endpoint para el front (¿quién soy?).
- API keys: tabla `api_keys` (SPC-002) con `key_hash` (hash de la key), nombre y `last_used_at`. Solo el dueño las ve/crea/revoca. En Ajustes (SPC-017).
- Middleware de API: rutas que admiten `Authorization: Bearer <apikey>` (para MCP) o sesión de navegador. Prefijo constante `caudal_...` en la key (para reconocerla).
- Un usuario no accede a datos de otro aunque conozca la URL (filtro `user_id` de sesión SIEMPRE, nunca del cuerpo de la petición).
- No guardar la key en claro ni en logs; `last_used_at` se actualiza al usarse.
- Tiene máximo razonable: TTL no obligatorio en v1 (se revoca manualmente).

## Criterios de aceptación

- [ ] `POST /api/auth/register` crea usuario y abre sesión; el usuario ve `/dashboard`.
- [ ] Registrarse con email ya usado devuelve error amigable.
- [ ] `GET /api/me` devuelve `{ id, email, name }` con sesión válida y 401 sin sesión.
- [ ] Una API key generada (`POST /api/api-keys`) autentica con `Authorization: Bearer caudal_...` y actualiza `last_used_at`.
- [ ] Revocar la key invalida el Bearer al instante.
- [ ] Con la key NO se puede pasar `user_id` propio (se ignora y se toma el de la key).
- [ ] Test: dos usuarios crean datos; usuario B con API key no ve los datos del A.
- [ ] `pnpm lint` y `pnpm build` pasan.