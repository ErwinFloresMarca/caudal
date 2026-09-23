// Nombre de icono Material Symbols de Iconify. Los presets guardan nombres con
// guion bajo (`directions_bus`); Iconify espera guiones (`directions-bus`).
export function iconoMaterial(nombre: string | null | undefined, fallback = 'category'): string {
  return `i-material-symbols-${(nombre || fallback).replace(/_/g, '-')}`
}
