# SPC-019 — PWA

Estado: propuesta
Depende de: SPC-001, SPC-004

## Problema

Caudal se registra desde el teléfono, muchas veces en la calle. Instalarlo como app (icono, pantalla completa, arranque rápido) mejora el uso diario; y si se corta la conexión, al menos debe abrir sin pantalla rota.

## Requerimientos

- `@vite-pwa/nuxt` configurado: manifest (nombre Caudal, iconos, `theme_color` de DESIGN.md, `display: standalone`), service worker con precache del shell y estrategia de red para `/api`.
- Instalable en Android/iOS: icono propio (DERIVADO de identidad — se aprueba en SPC-021).
- Prompt de instalación opcional (no intrusivo).
- Sin soporte offline de escritura: registrar movimientos requiere red (v1). Si no hay red, mensaje claro.
- Actualización: al haber nueva versión, avisar "recargar para actualizar" (evita quedar con shell viejo).
- No cachear respuestas autenticadas de `/api` de forma compartida.

## Criterios de aceptación

- [ ] Lighthouse/Audit detecta la PWA instalable (manifest + SW registrados).
- [ ] Instalada se abre en modo standalone sin barra del navegador.
- [ ] Sin conexión, la app abre el shell y muestra aviso; no pantalla en blanco.
- [ ] El service worker no sirve datos de un usuario a otro (cachés por sesión / sin cachear `/api` autenticada).
- [ ] Los iconos usan la identidad de Caudal (no genéricos) — ver SPC-021.