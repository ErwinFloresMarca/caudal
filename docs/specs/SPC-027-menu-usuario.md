# SPC-027 — Avatar menu del usuario en el header

Estado: verificada
Depende de: SPC-004 (shell), SPC-003 (auth/sesión), SPC-023 (Google OAuth)

## Problema

El header de la app (`app/layouts/default.vue`) muestra un icono de persona
estático arriba a la derecha, sin identidad ni acciones. El usuario no puede ir a
Ajustes ni cerrar sesión desde ahí (hoy solo entrando a `/ajustes`).

## Requerimientos

- El header DEBE mostrar un **avatar del usuario** con la imagen de Google
  (`users.avatar_url`) si existe; si no, las **iniciales** del nombre o email.
- Al abrir el avatar DEBE mostrarse un menú desplegable con:
  - cabecera con nombre y email,
  - **Ajustes** → `/ajustes`,
  - **Cerrar sesión** → `POST /api/auth/logout`, limpiar sesión y `/login`.
- DEBE estar disponible en móvil (390px) y escritorio (1280px).
- DEBE ser accesible (etiqueta para lectores de pantalla, foco/teclado).
- La sesión DEBE exponer `avatar_url` (hoy solo `{ id, email, name }`) para que
  el avatar no requiera una petición extra.

## Criterios de aceptación

- [x] Usuario con Google ve su imagen; usuario de contraseña ve iniciales. (capturas)
- [x] El menú navega a Ajustes. (captura)
- [x] Cerrar sesión limpia la sesión y redirige a `/login`. (captura + e2e)
- [x] Se ve correcto en 390px y 1280px. (capturas)
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios.

## Implementación (decisiones)

- Componente `app/components/AppUserMenu.vue`: `UDropdownMenu` (items por
  grupos) con trigger `UAvatar` (`:src="avatar_url"`, `:alt="name || email"`).
  `UAvatar` calcula las iniciales del `alt` → no se agrega lógica propia.
- Sesión: `types/auth.d.ts` añade `avatar_url?`; `server/api/auth/login.post.ts`
  lo incluye en `setUserSession`; `server/api/auth/me.get.ts` lo devuelve.
- Cerrar sesión reutiliza el flujo de `ajustes.vue` (`$fetch` logout + `clear()`
  + `navigateTo('/login')`).

Archivos: `app/components/AppUserMenu.vue`, `app/layouts/default.vue`,
`types/auth.d.ts`, `server/api/auth/login.post.ts`, `server/api/auth/me.get.ts`.
