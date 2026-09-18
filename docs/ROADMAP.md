# Caudal — Roadmap

## Visión

Llevar un registro claro y honesto de todo el dinero que entra y sale: lo personal y cada emprendimiento, en **bolivianos y dólares** a la vez, sin perder fidelidad histórica. Que "¿cuánto tengo?" y "¿de dónde salió?" se respondan en tres toques.

## Principios

- **Los números son sagrados**: enteros (centavos) en toda la aritmética; la tasa (dólar paralelo) se guarda por transacción para que la historia se lea como fue.
- **Un fondo, una verdad**: cada fondo (personal, impresión 3D, chocolates, velas…) es su propio "bolsillo" con sus cuentas y categorías.
- **Móvil primero**: el registro debe ser rápido desde el teléfono; escritorio para leer y analizar.
- **La IA entra por la puerta con llave**: el asistente (MCP) usa API keys por usuario; jamás hago trampa con la seguridad.
- **Ponytail**: lo más simple que funcione. Si algo tiene techo conocido, se marca.

## Fases

### 0. Cimientos (docs) — en curso

- [x] AGENTS.md, DESIGN.md (borrador), README, ROADMAP
- [x] docs/decisions/ (modelo de datos, multimoneda)
- [x] specs README (plantilla + workflow)
- [x] specs SPC-001…022 (estado `propuesta`)
- [ ] aprobar specs contra Linear (issues) e implementar en orden

### 1. Fundación (SPC-001…004)

- SPC-001 Bootstrap Nuxt 4
- SPC-002 Modelo de datos y acceso a BD
- SPC-003 Auth multiusuario + API keys
- SPC-004 Shell / layout / navegación / UI base
- SPC-023 Login con Google (OAuth) — depende de 002/003/004

### 2. Núcleo del dinero (SPC-005…010)

- SPC-005 Fondos
- SPC-006 Cuentas
- SPC-007 Categorías
- SPC-008 Transacciones
- SPC-009 Transferencias
- SPC-010 Aportes/retiros entre fondos

### 3. Inteligencia del dinero (SPC-011…017)

- SPC-011 Recurrentes
- SPC-012 Deudas y MSI
- SPC-013 Metas de ahorro
- SPC-014 Dashboard
- SPC-015 Reportes y gráficas
- SPC-016 Búsqueda y filtros
- SPC-017 Ajustes

### 4. Integración y entrega (SPC-018…022)

- SPC-018 MCP server para el asistente
- SPC-019 PWA
- SPC-020 Deploy VPS + nginx
- SPC-021 Pase visual por wireframes
- SPC-022 Release formal

### Fase 2 (fuera de v1)

- Presupuestos por categoría
- Importar CSV / estados de cuenta
- Sincronización bancaria (agregadores)
- Multi-divisa avanzada / valuación real

## Dependencias entre specs

Fundación → `dominio`: SPC-005 base para 006-007; SPC-008 base para 009-010.
`staging`: SPC-011 se apoya en 008; SPC-012 usa cuotas; SPC-013 aportes desde cuentas.
Dashboard (014) y Reportes (015) consumen el modelo completo. Búsqueda (016) es transversal sobre 008-013.
Integración: 018 (MCP) sobre el modelo cerrado; 021 (visual) recorre pantallas ya implementadas; 019/020/022 habilitan usar la app de verdad.