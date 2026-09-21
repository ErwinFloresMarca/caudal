export type Moneda = 'BOB' | 'USD'

export interface Money {
  centavos: number
  moneda: Moneda
}

// Formato boliviano: punto para miles y coma para decimales ("12,50", "1.250,50").
// Se acepta también el punto como decimal y texto limpio sin separadores.
const MAX_DECIMALES = 2

function invalid(): Error {
  return new Error('Cantidad inválida (usa un número positivo con máximo 2 decimales)')
}

function demasiadoDecimates(): Error {
  return new Error('Cantidad inválida: máximo 2 decimales')
}

export function parseAmount(input: string): number {
  const s = input.trim().replace(/\s/g, '')
  if (!/^\d/.test(s)) throw invalid()
  const cuerpo = s

  let parteEntera: string
  let decimales = ''

  const conComa = cuerpo.split(',')
  if (conComa.length > 2) throw invalid()
  if (conComa.length === 2) {
    // La coma es SIEMPRE el separador decimal; los puntos a la izquierda son miles.
    parteEntera = conComa[0]!
    decimales = conComa[1]!
    if (!/^\d{1,3}(\.\d{3})*$/.test(parteEntera)) throw invalid()
    parteEntera = parteEntera.replace(/\./g, '')
  } else {
    const conPunto = cuerpo.split('.')
    const dec = conPunto[1]
    if (conPunto.length === 1) {
      parteEntera = conPunto[0]!
    } else if (conPunto.length === 2 && dec !== undefined && /^\d{1,2}$/.test(dec)) {
      // Un solo punto con 1-2 dígitos tras él → decimal ("12.50", "3.14").
      parteEntera = conPunto[0]!
      decimales = dec
    } else if (/^(\d{1,3})(\.\d{3})+$/.test(cuerpo)) {
      // Grupos de a 3 → miles ("1.250", "12.500").
      parteEntera = cuerpo.replace(/\./g, '')
    } else {
      throw invalid()
    }
  }

  if (!/^\d+$/.test(parteEntera)) throw invalid()
  if (decimales.length > MAX_DECIMALES) throw demasiadoDecimates()

  const centavos = Number(parteEntera) * 100 + (decimales ? Number(decimales.padEnd(2, '0')) : 0)
  if (!Number.isSafeInteger(centavos) || centavos <= 0) throw invalid()
  return centavos
}

export function formatMoney(money: Money): string {
  const signo = money.centavos < 0 ? '-' : ''
  const abs = Math.abs(money.centavos)
  const entero = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimal = String(abs % 100).padStart(2, '0')
  const cuerpo = `${entero},${decimal}`
  return money.moneda === 'BOB' ? `Bs ${signo}${cuerpo}` : `US$ ${signo}${cuerpo}`
}

// Convierte a la moneda base usando la tasa del dólar paralelo (BOB por USD).
// USD→BOB multiplica; BOB→USD divide.
export function convertToBase(money: Money, tasaRef: number | undefined, base: Moneda = 'BOB'): Money {
  if (money.moneda === base) return money
  if (tasaRef == null) throw new Error('Falta tasa de cambio para convertir')
  if (base === 'USD') {
    return { centavos: Math.round(money.centavos / tasaRef), moneda: 'USD' }
  }
  return { centavos: Math.round(money.centavos * tasaRef), moneda: base }
}