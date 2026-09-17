# SPC-010 — Aportes y retiros entre fondos

Estado: propuesta
Depende de: SPC-008, SPC-009

## Problema

El usuario saca dinero de lo personal y lo mete a un emprendimiento (y a veces al revés). Eso **sí** afecta el resultado de ambos: el emprendimiento recibió un aporte (ingreso) y lo personal hizo una salida (gasto). No es una transferencia neutral. Formalizar esto como "aporte/retiro" evita que los totales mientan.

## Requerimientos

- **Aporte**: dinero que entra a un fondo desde afuera (típico: personal → negocio). En el fondo destino es un **ingreso**; si el origen es otro fondo del mismo usuario, en el origen es un **gasto**.
- **Retiro**: el inverso (negocio → personal): egreso en el fondo origen, ingreso en el destino.
- Se materializa como **dos transacciones ligadas por `grupo_id`** (una en cada fondo cuando hay dos): la de destino `ingreso` con categoría de sistema "Aporte recibido"; la de origen `gasto` con categoría de sistema "Retiro/Aporte entregado".
- La moneda de cada pata es la de su cuenta; si cruzan monedas, la pata que lo requiere guarda `tasa_ref`.
- Una sola operación en UI (alta rápida): elegir fondo destino, cuenta destino, monto, y opcionalmente fondo/cuenta origen; si no hay origen interno se asume aporte externo (solo la pata de ingreso).
- Editar/borrar la operación afecta ambas patas (por `grupo_id`).
- Reportes: cuentan como resultado en cada fondo por separado; en un consolidado multi-fondo se pueden netear/etiquetar como "movimiento interno" (se afina en SPC-015).
- Rutas: dentro de `/movimientos` con tipo especial, o `/transferencias` con pestaña "Entre fondos" (se decide en wireframes).

## Criterios de aceptación

- [ ] Aporte personal → negocio de Bs 500: el fondo negocio sube Bs 500 como ingreso; el personal baja Bs 500 como gasto; ambas patas comparten `grupo_id`. (test)
- [ ] Retiro en sentido inverso hace el efecto simétrico. (test)
- [ ] Borrar la operación elimina/neutraliza ambas patas y restaura ambos fondos. (test)
- [ ] Un aporte externo (sin fondo origen) solo crea la pata de ingreso.
- [ ] En el reporte del fondo destino cuenta como ingreso; en el origen como gasto (no como transferencia neutral).
- [ ] No se puede aportar a un fondo de otro usuario (validación server).