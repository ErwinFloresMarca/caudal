# SPC-007 — Categorías por fondo

Estado: verificada
Depende de: SPC-002, SPC-005

## Problema

El usuario asigna cada gasto/ingreso a una categoría para ver a dónde va el dinero. Las categorías son **por fondo** (un negocio no usa las categorías personales), con presets útiles ya cargados y la posibilidad de crear propias con icono y color.

## Requerimientos

- Categorías por fondo: `nombre`, `tipo` (`ingreso`|`gasto`), `icono`, `color`, `es_predefinida`, `activa`.
- **Presets al crear un fondo** (por tipo, según `tipo` del fondo):
  - Persona → gastos: Comida, Transporte, Servicios, Salud, Ocio, Vivienda, Compras, Otros; ingresos: Sueldo, Venta, Otros.
  - Negocio → gastos: Insumos, Empaque, Envíos, Impuestos, Herramientas, Marketing, Otros; ingresos: Venta, Servicios, Otros.
- Las predefinidas se pueden ocultar pero no borrar; las propias se borran si no tienen transacciones.
- CRUD en `/ajustes` (o dentro del fondo si SPC-005 trae sección; se decide en wireframes).
- Icono/color libres (Material Symbols + paleta DESIGN.md).
- Una transacción referencia a la categoría de su fondo (SPC-008) — no se carpetan transacciones con categoría de otro fondo.

## Criterios de aceptación

- [x] Crear un fondo personal precarga los presets personales; un fondo negocio precarga los de negocio, sin duplicados (`sembrarCategorias` en `crearFondo`, idempotente por (nombre, tipo)).
- [x] Crear categoría propia con icono/color; aparece en el listado del mismo fondo (el selector de transacciones llega con SPC-008).
- [x] Ocultar una predefinida la quita del selector sin borrarla; las usadas en transacciones siguen visibles en histórico/reportes (`activa=false`, no borrado).
- [x] Intentar asignar a una transacción una categoría de otro fondo falla (validación se completa en SPC-008; aquí las categorías son por fondo y el aislamiento entre usuarios está testado).
- [x] Borrar categoría propia sin transacciones elimina la fila; con transacciones da error (400) y sugiere ocultarla.