export interface ItemNavegacion {
  label: string
  to: string
  icono: string
  movil?: boolean
}

// Navegación completa (DESIGN.md). `movil` marca los accesos de la barra inferior.
export const NAVEGACION: ItemNavegacion[] = [
  { label: 'Inicio', to: '/', icono: 'i-material-symbols-grid-view', movil: true },
  { label: 'Movimientos', to: '/movimientos', icono: 'i-material-symbols-receipt-long', movil: true },
  { label: 'Cuentas', to: '/cuentas', icono: 'i-material-symbols-account-balance-wallet' },
  { label: 'Fondos', to: '/fondos', icono: 'i-material-symbols-folder-special', movil: true },
  { label: 'Presupuestos', to: '/presupuestos', icono: 'i-material-symbols-pie-chart' },
  { label: 'Transferencias', to: '/transferencias', icono: 'i-material-symbols-sync-alt' },
  { label: 'Recurrentes', to: '/recurrentes', icono: 'i-material-symbols-event-repeat' },
  { label: 'Deudas', to: '/deudas', icono: 'i-material-symbols-handshake' },
  { label: 'Metas', to: '/metas', icono: 'i-material-symbols-savings' },
  { label: 'Reportes', to: '/reportes', icono: 'i-material-symbols-bar-chart' },
  { label: 'Ajustes', to: '/ajustes', icono: 'i-material-symbols-settings', movil: true },
]
