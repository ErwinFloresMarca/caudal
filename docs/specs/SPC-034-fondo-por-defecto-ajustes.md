# SPC-034 — Fondo por defecto también en Ajustes

Estado: implementada · Issue: SEL-272

Depende de: [SPC-030](./SPC-030-fondo-predeterminado.md) (fondo predeterminado), [SPC-017](./SPC-017-ajustes.md) (ajustes)

## Problema

SPC-030 puso el switch de "Fondo por defecto" en la página Fondos, que es donde se ve la lista
completa. Pero el mockup aprobado de **Ajustes** ya contemplaba esa preferencia: una fila
"Fondo por defecto" / "Bóveda predeterminada" con su valor actual y un chevron
(`docs/stitch_caudal_wireframe_specs/11.ajustes_usuario_con_datos_390/code.html:111-123`), y
`DESIGN.md` dice que ante la duda manda el wireframe.

Ajustes es, además, donde un usuario busca sus preferencias: sin esa fila, la única forma de
descubrir la opción es entrar a Fondos.

## Requerimientos

- Ajustes **MUST** mostrar el fondo por defecto actual y **MUST** permitir cambiarlo sin salir de la
  página.
- El selector **MUST** ofrecer todos los fondos activos y **MUST** permitir dejarlo sin definir.
- **MUST** reusar `marcarPredeterminado()` y `POST /api/fondos/predeterminado` (SPC-030): **MUST NOT**
  agregar backend ni duplicar la lógica del switch de Fondos.
- El selector **MUST** ir en `USlideover` para verse bien en móvil (~360px) y **MUST** usar los
  componentes y tokens de `DESIGN.md`.

## Criterios de aceptación

- Elegir un fondo en Ajustes se refleja en `GET /api/fondos` (`predeterminado: true`) y en el switch
  de la página Fondos.
- "Sin definir" vuelve al comportamiento por defecto (primer fondo activo por id).
- Capturas en 390px y 1280px, en claro y oscuro, con el slideover abierto y cerrado.
- `pnpm test` + `pnpm lint` + `pnpm typecheck` verdes.

## Fuera de alcance

- Quitar el switch de la página Fondos (se queda: ahí se ve la lista completa y es donde el usuario
  pidió tenerlo).
- Cambiar el endpoint, el modelo de datos o la política de resolución de SPC-030.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `app/pages/ajustes.vue` | Fila "Fondo por defecto" + `USlideover` de selección |
| `docs/specs/README.md` | Fila de este spec |
