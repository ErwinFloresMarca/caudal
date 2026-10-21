# SPC-047 — Cerrar todas las sesiones

Estado: verificada · Issue: SEL-287
Depende de: SPC-003 (auth), SPC-017 (ajustes)

## Problema

La sesión es una cookie firmada sin store en servidor: "cerrar sesión" solo borra la cookie del dispositivo actual. Si te quedó una sesión abierta en otro equipo o en un teléfono prestado, no hay forma de invalidarla.

## Decisiones

1. **Versión de sesión por usuario, sin store**: `users.session_version`. Cada sesión guarda la versión con la que se creó; si no coincide con la de la base, la cookie ya no vale. Incrementarla = cerrar todas.
2. **Las cookies sin versión cuentan como 0**, así las sesiones existentes sobreviven hasta el primer "cerrar todas" (no se desloguea a todo el mundo al desplegar).
3. **Las API keys del MCP no se revocan**: tienen su propia revocación en Ajustes y se usan desde el asistente, no desde un navegador.
4. **Cerrar todas cierra también la sesión actual** y lleva al login.
5. **El cliente valida la sesión contra el servidor**: el middleware de rutas llama a `/api/auth/me` y un plugin manda al login ante cualquier 401. Sin esto, un dispositivo revocado seguía "dentro" con datos vacíos.

## Requerimientos

- `users.session_version` (integer, default 0) + migración.
- `server/utils/sesiones.ts`: `versionSesion`, `sesionVigente`, `cerrarTodasLasSesiones`.
- `authUserId` compara la versión de la cookie con la de la base; si no coincide, limpia la sesión y responde 401.
- Login (email, registro y Google) guarda `session_version` en la cookie.
- `POST /api/ajustes/cerrar-sesiones`.
- Ajustes: botón **Cerrar todas** junto a "Cerrar sesión", con confirmación que aclara que incluye este dispositivo y que las API keys no se tocan.

## Criterios de aceptación

- [ ] Con dos dispositivos abiertos, al cerrar todas en uno el otro deja de poder llamar a la API (401) y su UI cae en `/login`.
- [ ] El dispositivo que cerró también queda deslogueado.
- [ ] Volver a iniciar sesión funciona con normalidad.
- [ ] Las API keys siguen funcionando después de cerrar todas.
- [ ] Las sesiones que ya existían (sin versión) siguen válidas hasta el primer cierre.
- [ ] Cerrar todas de un usuario no afecta a otro.
- [ ] `pnpm test` cubre versión, invalidación y aislamiento.

## Verificación local (pendiente deploy)

- `tests/sesiones.test.ts`: 4 casos (versión inicial, invalidación, acumulación, aislamiento). 236 tests en total, lint y typecheck en verde.
- **Dos navegadores** (mismo usuario): A cierra todas → A cae en `/login`; B, sin tocar nada, al navegar cae en `/login`; B vuelve a entrar sin problema.
- **API keys**: creada una key, "cerrar todas" → la cookie vieja responde **401** y la API key sigue respondiendo **200** (no se revoca, como dice el modal).
- El modal se ve bien a 390px.
- **Verificado en el deploy de v1.9.0** (run 39544492340): migración `0007` aplicada desde el artefacto (`drizzle.__drizzle_migrations` = **8**), columna `users.session_version` presente y las **5 cuentas en versión 0** conservan su sesión (no se deslogueó a nadie al desplegar). `POST /api/ajustes/cerrar-sesiones` responde **401** sin sesión (ruta viva).
