# Caudal — Prompt de wireframes (SPC-021)

Este documento compila los specs (SPC-004…017) y la identidad de `DESIGN.md`.
Se usa tal cual como **prompt de entrada** para generar los wireframes/mockups
de alta fidelidad de T A D A S las pantallas. Los mockups generados se
guardan en `docs/wireframes/` y se adjuntan al issue de Linear de su módulo
para guiar la implementación.

## Contrato de entrega

- Una toma **390px (móvil)** y una **1280px (escritorio)** por cada pantalla y por cada estado indicado.
- UI 100% en **español** (toda la copia visible).
- High fidelity: tokens exactos de `DESIGN.md` (colores, radios, tipografía, iconos).
- Nombres de archivo: `NN.modulo-estado-ancho.png` (ej. `03.movimientos-filtros-390.png`).
- Junto a cada pantalla, una nota de 2-3 líneas con las decisiones de layout tomadas (para validarlas contra los criterios).

---

## 1. Producto

**Caudal** es una app de control de dinero personal y de emprendimientos,
multiusuario y multimoneda (BOB/USD). Un usuario agrupa su dinero en
**fondos** (personal, impresión 3D, chocolates, velas…), cada fondo tiene
**cuentas** (efectivo, banco, tarjeta, ahorro) y **categorías**. Cada
transacción hereda la moneda de su cuenta; las de USD guardan la **tasa del
dólar paralelo del día** para consolidar la historia sin mentir.

Prioridades: **móvil primero**, registro rápido desde el teléfono, números
grandes y legibles, cero decoración. El número manda.

## 2. Identidad visual (tokens obligatorios de DESIGN.md)

- **Modo claro únicamente.**
- Fondo app `#F6F8FC` (Frost); superficies `#FFFFFF` (surface) y `#EDF1F8` (surface-muted).
- Texto `#0B1C34` (ink), texto secundario `#5B6B85` (ink-muted).
- Acción/navegación `#0E6FFF` (brand), hover `#0057D9`.
- **Color semántico**: teal `#0FA47F` = dinero que ENTRA (ingresos, saldo positivo, aportes recibidos); coral `#E5484D` = dinero que SALE (egresos, saldo negativo, deudas por pagar); amber `#E8A13A` = avisos/metas lejanas.
- Radios: cards `rounded-[20px]`; botones **píldora** `h-13 rounded-full`; inputs `rounded-xl` (12px). Sin sombras pesadas: elevación = borde `1px` `rgb(11 28 52 / 0.08)` + a lo sumo `shadow-sm`.
- **Tipografía**: `ui-sans-serif/system-ui`; números **siempre tabulares** (columnas alineadas) en TODO monto. Titulares `font-extrabold tracking-tight`, con técnica **two-tone**: titular en ink con 1-2 palabras en brand.
- **Iconos**: Material Symbols, variante redondeada (`rounded`). No mezclar otros sets.
- Iconos de cuenta por tipo: efectivo `payments`, banco `account_balance`, tarjeta `credit_card`, ahorro `savings`.
- Dinero: `Bs 12.345,67` (BOB) / `US$ 45,00` (USD). Ingreso con prefijo `+` (teal), egreso `−` (coral).

## 3. Dominio en una mirada (referencia para el diseñador)

`Usuario` → `Fondos` (moneda base, color, icono) → `Cuentas` (tipo, moneda FIJA) y `Categorías` (gasto/ingreso). Sobre cuentas: `Transacciones`, `Transferencias` (mismo fondo, no afecta resultado), `Aportes/Retiros` (entre fondos: ingreso en destino + gasto en origen), `Recurrentes` (plantillas con cadencia), `Deudas/MSI` (cuotas), `Metas` (progreso de ahorro).

## 4. Shell y navegación (SPC-004)

- **Escritorio (1280px)**: sidebar izquierda fija — logo Caudal, ítems de navegación, fondo activo al final. Header con **selector de fondo activo**, saldo destacado y avatar.
- **Móvil (390px)**: header compacto (logo + selector de fondo + avatar) y **barra inferior** con accesos principales: Inicio, Movimientos, **+** (registro rápido), Fondos, Ajustes. No drawer oculto.
- Navegación completa (sidebar): **Inicio, Movimientos, Cuentas, Fondos, Transferencias, Recurrentes, Deudas, Metas, Reportes, Ajustes**.
- Sin sesión → `/login`. Con sesión → app.
- Componente **Balances**: saldo de cada cuenta del fondo activo (icono por tipo, tabular, `Bs`/`US$`), visible en el shell o dashboard.

## 5. Datos de prueba (usar estos en "estados con datos")

**Fondos**: «Personal» (personal, BOB) · «Impresión 3D» (negocio, USD).
**Cuentas Personal**: Efectivo `Bs 2.350,00`; BNB Banco `Bs 8.120,00`; Tarjeta de débito `Bs 940,50`.
**Cuentas Impresión 3D**: Caja `US$ 210,00`; Mercantil USD `US$ 1.150,00`.
**Categorías personales** (gastos): Comida, Transporte, Servicios, Salud, Ocio, Vivienda, Compras, Otros; (ingresos): Sueldo, Venta, Otros.
**Movimientos**: Sueldo `+Bs 4.500,00` (ingreso, Efectivo); Mercado `−Bs 120,50` (Comida, Tarjeta); Alquiler `−Bs 1.800,00` (Vivienda, BNB); Streaming `−Bs 35,00` (Ocio); Venta impresión `+US$ 45,00` (ingreso, Caja, tasa 6,96).
**Deudas**: «Tarjeta BNB» por_pagar `Bs 3.000,00` en 3 cuotas (1 pagada); «Pedro me debe» por_cobrar `Bs 500,00` en 1 cuota.
**Metas**: «Impresora nueva» objetivo `US$ 350,00`, 42%; «Fondo de emergencia» `Bs 5.000,00`, 24%.
**Recurrentes**: Sueldo (mensual), Alquiler (mensual), Streaming (mensual), Mercado (quincenal). Dos de ellos con `proxima_fecha` vencida = **pendientes por confirmar**.

## 6. Pantallas

### 6.1 Login / Registro (`/login`, SPC-003/023)
Estados: error de credenciales · validación inline.
- Tarjeta centrada: logo Caudal, campo email, campo contraseña, botón píldora brand «Entrar», enlace «¿No tienes cuenta? Regístrate».
- Registro: nombre, email, contraseña, confirmar; botón «Crear cuenta».
- Botón secundario «Continuar con Google» (SPC-023).
- Mensajes de error en español, amigables (ej. «Ese email ya está registrado»).

### 6.2 Dashboard (`/`, SPC-014)
Estados: con datos · vacío (CTA «Registra tu primer movimiento»).
- **Saldo total del fondo** gigante, tabular. En multimoneda: saldo por moneda y el consolidado a BOB con leyenda «convertido con tasa histórica».
- **Mes en curso**: Ingresos (teal `+`), Egresos (coral `−`), Neto (color según signo).
- **Saldo por cuenta**: chips o filas compactas con icono del tipo.
- **Gastos por categoría del mes**: top categorías con mini barras y valores.
- **Pendientes** (solo los reales): recurrentes por confirmar (con monto y botón acción) y próximas cuotas de deuda.
- **Metas activas**: tarjeta con barra de progreso y porcentaje.
- Móvil: apilado (saldo → mes → pendientes). Escritorio: grid de cards.

### 6.3 Movimientos (`/movimientos`, SPC-008/016)
Estados: con datos · vacío · sin resultados para filtros activos.
- Lista agrupada por fecha; fila: icono-categoría (con su color), nota/categoría, cuenta, monto `+`/`−` con color y moneda. Columna opcional de **saldo running** (decisión de wireframe: incluirla).
- **Filtros** (SPC-016) en panel desplegable móvil / columna o barra en escritorio: rango de fechas, fondo, cuenta, categoría, tipo, moneda, monto mín/máx, fuente (manual/asistente/recurrente). Resumen de filtros activos + «Limpiar». Reflejados en URL.
- **Alta/edición** en slideover (ancho completo en móvil): cuenta (del fondo activo, preseleccionada), categoría (mismo fondo), toggle tipo ingreso/gasto, monto con teclado numérico (`inputmode=decimal`, acepta `12,50`), fecha (hoy por defecto + cambio de día), **tasa BOB/USD solo si la cuenta es USD** (auto-sugerida del último valor, con su campo), nota opcional.
- Botón primario «+ Registrar» (FAB en móvil, píldora en escritorio).
- Borrar/editar con confirmación (danger en modal).

### 6.4 Cuentas (dentro de `/fondos/:id`, SPC-006 + Balances del shell)
Estados: con datos · vacío (CTA crear cuenta).
- Saldo total del fondo arriba. Grid de tarjetas por cuenta: icono por tipo (payments/account_balance/credit_card/savings), nombre, badge del tipo, saldo tabular con moneda.
- Crear/editar en slideover: nombre, tipo (select con 4 iconos), moneda (fija: tras movimientos NO cambiable — aviso), saldo inicial (solo al crear; si hay movimientos se oculta y se ajusta con transacciones), toggle activa.
- Variante shell «Balances»: chips compactos de cada cuenta del fondo activo.

### 6.5 Fondos (`/fondos`, SPC-005)
Estados: con datos · **vacío = primer login** (sugerencia de crear «Personal»).
- Lista de tarjetas: icono+color del fondo, nombre, tipo (personal/negocio), moneda base, saldo total.
- Detalle `/fondos/:id`: cabecera del fondo + sección de cuentas (6.4) y acceso a categorías.
- Crear/editar slideover: tipo (personal/negocio), nombre, moneda base (BOB/USD), color (paleta), icono (selector Material Symbols), toggle activo.
- «Activo» oculto de la lista principal conservando histórico; la ocultación pide confirmación.

### 6.6 Transferencias (`/transferencias`, SPC-009) y Aportes/Retiros (SPC-010)
Estados: con datos · vacío.
- **Tabs**: «Entre cuentas» (SPC-009) · «Entre fondos» (SPC-010) *(decisión de wireframe: esta es la propuesta recomendada)*.
- Entre cuentas: tarjeta con **origen → destino** (mismo fondo, del selector de fondo activo), monto de origen en su moneda; si las monedas difieren, campo aparte para tasa y/o monto destino; fecha; nota. Validaciones visibles: mismo fondo, origen ≠ destino.
- Entre fondos: alta rápida — dirección (aporte/retiro), fondo destino, cuenta destino, monto, y opcional fondo/cuenta origen; sin origen interno = **aporte externo** (solo ingreso). Etiqueta visual «Movimiento interno» en el RFC.
- Historial de transferencias como filas de doble cuenta; borrar/editar restaura ambos saldos (confirmación).
- Nota visible: «Las transferencias no afectan el resultado del período».

### 6.7 Recurrentes (`/recurrentes`, SPC-011)
Estados: con datos + pendientes · sin pendientes · vacío.
- **Bloque de pendientes por confirmar** (vencidos): fila por recurrente con monto, categoría, cuenta y acciones: «Confirmar» (crea movimiento), «Registrar y saltar», «Saltar este» (avanza sin crear). Nada se crea sin confirmación.
- Lista de plantillas: nombre, categoría+cuenta, monto, cadencia (semanal/quincenal/mensual/anual), próxima fecha, estado activo/pausado, acciones editar/pausar.
- Alta/edición slideover: cuenta, categoría, tipo, monto, cadencia, día/semana, próxima fecha, nota.

### 6.8 Deudas / MSI (`/deudas`, SPC-012)
Estados: con datos · vacío · recalcular.
- **Resumen**: total por pagar (coral) vs por cobrar (teal) y neta.
- Lista de deudas: contraparte, dirección (badge «a favor»/«en contra»), concepto, saldo pendiente, próxima cuota (fecha), progreso pagadas/total, estado (activa/saldada con check).
- Detalle: tabla de cuotas (nº, vencimiento, monto, estado pagada/pendiente) y acción «Pagar cuota» → slideover (cuenta, categoría, monto) que crea la transacción y marca la cuota.
- Alta/edición slideover: contraparte, dirección, concepto, monto, moneda (propia), fecha inicio, nº de cuotas (MSI = sin interés), nota.

### 6.9 Metas (`/metas`, SPC-013)
Estados: con datos · alcanzada · vacío.
- Grid de tarjetas: nombre, moneda+objetivo, barra de progreso, % y «restante». Alcanzada = 100% con check y estilo distinto.
- Detalle: historial de aportes (fecha, monto, nota, cuenta opcional) con editar/borrar.
- Alta/edición slideover: nombre, objetivo, moneda, fecha objetivo (opcional), fondo.
- Aporte en slideover: monto, fecha, cuenta (opcional), nota. *(v1: aporte = registro, sin transacción automática en cuentas — no duplicar saldos.)*

### 6.10 Reportes (`/reportes`, SPC-015)
Estados: con datos · vacío.
- Barra de filtros: rango (mes actual, mes pasado, personalizado), fondo(s), moneda base de consolidación (BOB por defecto). Persistidos en URL.
- Secciones:
  1. **Flujo del período**: ingresos, egresos, neto — desglose por moneda + consolidado.
  2. **Gastos por categoría**: donut o barras horizontales, top N, con leyenda y valores.
  3. **Ingresos vs egresos por mes**: barras agrupadas, últimos 12 meses.
  4. **Evolución del saldo**: línea por cuenta o total del fondo.
- **Nota en todo consolidado**: «equivalente histórico» (cada movimiento con su tasa; no se revalúa). Transferencias excluidas del resultado; aportes etiquetables como «movimiento interno» en multi-fondo.
- Exportar CSV (botón discreto, opcional).

### 6.11 Ajustes (`/ajustes`, SPC-017)
Lista de secciones (lista móvil / columnas en escritorio). Cada edición en slideover:
- **Perfil**: nombre, email (con validación), timezone.
- **Seguridad**: cambiar contraseña (pide la actual + nueva + confirmar).
- **Moneda y tasa**: moneda base por defecto, **tasa paralelo actual** (para auto-sugerir en transacciones USD) + historial de la última usada.
- **Categorías** (del fondo activo): crear/editar/ocultar con icono+color (crédito a 6.x). Predefinidas se ocultan, no se borran; propias sin uso se pueden borrar.
- **Fondos**: enlace a la gestión (sin duplicar).
- **API keys (MCP)**: listar (nombre + `last_used_at`), crear → modal que muestra la key **una sola vez** («cópiala ahora, no se volverá a mostrar») con prefijo `caudal_…` e instrucciones de conexión del asistente; revocar con confirmación.
- **Sesión**: cerrar sesión (y «cerrar todas las sesiones» si es barato).
- **Datos**: exportar / **borrar cuenta** con confirmación explícita (danger).

## 7. Reglas transversales (toda pantalla)

- Números **tabulares** en todo monto; sufijos `Bs` / `US$`; signo `+` teal / `−` coral.
- Multimoneda: una cuenta muestra su moneda siempre; nunca sumar BOB+USD sin tasa; consolidado etiquetado.
- Botones píldora `h-13`; cards `rounded-[20px]`; inputs `rounded-xl`. Light only.
- Iconos Material Symbols redondeados; color semántico para dinero.
- Objetivos táctiles ≥ 44px, formularios con etiqueta visible y errores inline en español.
- Slides/overlays: **slideover ancho completo en móvil**, modal en escritorio.
- Estados siempre contemplados: **vacío con CTA**, **con datos**, y **sin resultados** donde aplique. Fila de carga esqueleto ligero opcional.
- Copy en segunda persona, español neutro de Bolivia (no traducir literamente de otros productos).

## 8. Cómo se adjunta a la implementación

Cada pantalla generada se une a su módulo del roadmap:

| Pantalla | Spec | Issue Linear |
|---|---|---|
| Login / Registro | SPC-003 / 023 | SEL-79, SEL-99 |
| Dashboard | SPC-014 | SEL-90 |
| Movimientos + filtros | SPC-008 / 016 | SEL-84, SEL-92 |
| Cuentas | SPC-006 | SEL-82 |
| Fondos | SPC-005 | SEL-81 |
| Transferencias + Aportes | SPC-009 / 010 | SEL-85, SEL-86 |
| Recurrentes | SPC-011 | SEL-87 |
| Deudas / MSI | SPC-012 | SEL-88 |
| Metas | SPC-013 | SEL-89 |
| Reportes | SPC-015 | SEL-91 |
| Ajustes | SPC-017 | SEL-93 |
| Shell / navegación | SPC-004 | SEL-80 |

- Archivos en `docs/wireframes/` (subcarpeta por módulo) **y** adjuntos al issue de Linear correspondiente (`Estados con datos` = la variante a adjuntar; vacío/error quedan en el repo).
- Al implementar un módulo, su spec se enriquece con los criterios visuales aprobados de su wireframe; lo que el wireframe decida que el spec dejó abierto se vuelve decisión y se registra en `docs/decisions/` si es relevante.