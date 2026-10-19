// CSV para Excel: RFC 4180 (comillas dobles, CRLF) con BOM UTF-8 para que los
// acentos se lean bien, y las celdas de texto que empiezan con = + - @ se
// neutralizan para que una nota no se ejecute como fórmula al abrir el archivo.
const FORMULA = /^[=+\-@\t\r]/

function celda(valor: string | number | null | undefined): string {
  if (valor == null) return ''
  // Los números van tal cual: un monto negativo debe seguir siendo número.
  if (typeof valor === 'number') return String(valor)
  const texto = FORMULA.test(valor) ? `'${valor}` : valor
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function aCsv(cabeceras: string[], filas: (string | number | null | undefined)[][]): string {
  const lineas = [cabeceras, ...filas].map((fila) => fila.map(celda).join(','))
  return `\uFEFF${lineas.join('\r\n')}\r\n`
}

// Centavos a unidades con dos decimales, con punto (independiente de la moneda).
export function centavosADecimal(centavos: number): string {
  return (centavos / 100).toFixed(2)
}
