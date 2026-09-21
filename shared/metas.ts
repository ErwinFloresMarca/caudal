export interface ProgresoMeta {
  acumulado_centavos: number
  porcentaje: number
  restante_centavos: number
  alcanzada: boolean
}

// Progreso = Σ aportes / objetivo. El porcentaje se topa a 100 para la barra,
// pero `alcanzada` se cumple en cuanto Σ ≥ objetivo. Los aportes pueden ser
// negativos (retiros) y restan.
export function calcularProgreso(aportesCentavos: number[], objetivoCentavos: number): ProgresoMeta {
  const acumulado = aportesCentavos.reduce((s, m) => s + m, 0)
  const alcanzada = objetivoCentavos > 0 && acumulado >= objetivoCentavos
  const crudo = objetivoCentavos > 0 ? Math.round((acumulado / objetivoCentavos) * 100) : 0
  return {
    acumulado_centavos: acumulado,
    porcentaje: Math.max(0, Math.min(100, crudo)),
    restante_centavos: Math.max(0, objetivoCentavos - acumulado),
    alcanzada,
  }
}
