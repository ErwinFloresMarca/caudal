// KPIs de la pantalla Movimientos. Puro para poder testearlo sin BD.
export interface KpisMovimientos {
  ingresos_centavos: number
  egresos_centavos: number
  neto_centavos: number
  entradas: number
  salidas: number
  operaciones: number
  porcentaje_consumido: number
  tasa_ahorro: number
  superavit: boolean
}

export function calcularKpis({ ingresos_centavos, egresos_centavos, entradas, salidas }: {
  ingresos_centavos: number
  egresos_centavos: number
  entradas: number
  salidas: number
}): KpisMovimientos {
  const neto_centavos = ingresos_centavos - egresos_centavos
  return {
    ingresos_centavos,
    egresos_centavos,
    neto_centavos,
    entradas,
    salidas,
    operaciones: entradas + salidas,
    // Sin ingresos no hay "porcentaje consumido" que tenga sentido: se deja 0.
    porcentaje_consumido: ingresos_centavos > 0 ? Math.round((egresos_centavos / ingresos_centavos) * 100) : 0,
    tasa_ahorro: ingresos_centavos > 0 ? Math.round((neto_centavos / ingresos_centavos) * 100) : 0,
    superavit: neto_centavos >= 0,
  }
}
