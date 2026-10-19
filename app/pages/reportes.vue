<script setup lang="ts">
import { formatMoney } from '#shared/money'
import type { Reporte } from '~/types/reportes'

const { fondos } = useFondoActivo()
const request = useRequestFetch()
const route = useRoute()
const router = useRouter()

function rangoMes(fecha: string) {
  const [y, m] = fecha.split('-').map(Number)
  const ultimo = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  return { desde: `${y}-${String(m).padStart(2, '0')}-01`, hasta: `${y}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}` }
}
const mesActual = new Date().toISOString().slice(0, 7)
const mesAnterior = (() => {
  const [y, m] = mesActual.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
})()
const def = rangoMes(mesActual)

const filtros = reactive({
  desde: (route.query.desde as string) || def.desde,
  hasta: (route.query.hasta as string) || def.hasta,
  fondo: (route.query.fondos as string) || '',
  base: (route.query.base as string) || 'BOB',
})

watch(
  filtros,
  () => {
    const q: Record<string, string> = { desde: filtros.desde, hasta: filtros.hasta, base: filtros.base }
    if (filtros.fondo) q.fondos = filtros.fondo
    router.replace({ query: q })
  },
  { deep: true },
)

const query = computed(() => {
  const p = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta, base: filtros.base })
  if (filtros.fondo) p.set('fondos', filtros.fondo)
  return p.toString()
})

const { data } = await useAsyncData('reporte', () => request<{ reporte: Reporte }>(`/api/reportes?${query.value}`), { watch: [query] })
const r = computed(() => data.value?.reporte ?? null)

function preset(tipo: 'actual' | 'anterior') {
  const rg = rangoMes(tipo === 'actual' ? mesActual : mesAnterior)
  filtros.desde = rg.desde
  filtros.hasta = rg.hasta
}

const fmt = (c: number) => formatMoney({ centavos: c, moneda: (filtros.base as 'BOB' | 'USD') })

// Donut (SVG, circunferencia 100 con r=15.9155)
const donut = computed(() => {
  const cats = r.value?.gastos_por_categoria ?? []
  const total = cats.reduce((s, c) => s + c.centavos, 0)
  let start = 0
  return cats.slice(0, 8).map((c) => {
    const pct = total > 0 ? (c.centavos / total) * 100 : 0
    const seg = { ...c, pct, offset: 25 - start, color: c.color ?? 'var(--color-ink-faint)' }
    start += pct
    return seg
  })
})

// Barras serie mensual
const maxSerie = computed(() => Math.max(1, ...(r.value?.serie_mensual ?? []).flatMap((m) => [m.ingresos_centavos, m.egresos_centavos])))

// Línea evolución
const linea = computed(() => {
  const pts = r.value?.evolucion_saldo ?? []
  if (pts.length < 2) return ''
  const vals = pts.map((p) => p.saldo_centavos)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  return pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${40 - ((p.saldo_centavos - min) / span) * 40}`).join(' ')
})

// Exportar movimientos con los filtros vigentes (misma query que el reporte).
const csvUrl = computed(() => `/api/reportes/movimientos.csv?${query.value}`)

// Barras diarias por categoría
const series = ref<'ambos' | 'ingresos' | 'egresos'>('ambos')
const barras = computed(() => r.value?.barras_diarias ?? [])
const maxDia = computed(() => {
  let max = 0
  for (const d of barras.value) {
    if (series.value !== 'egresos') max = Math.max(max, d.ingresos.reduce((s, c) => s + c.centavos, 0))
    if (series.value !== 'ingresos') max = Math.max(max, d.egresos.reduce((s, c) => s + c.centavos, 0))
  }
  return max || 1
})
const altoBarra = (centavos: number) => `${(centavos / maxDia.value) * 100}%`
// Paleta de reemplazo: las categorías sin color no pueden compartir todas el gris.
const PALETA = ['#0E6FFF', '#0FA47F', '#E8A13A', '#E5484D', '#7C5CFF', '#0BA5C7', '#8E9BAE']
const leyenda = computed(() => {
  const total = new Map<string, { nombre: string; color: string | null; centavos: number }>()
  for (const d of barras.value) {
    for (const c of [...d.ingresos, ...d.egresos]) {
      const acc = total.get(c.nombre) ?? { nombre: c.nombre, color: c.color, centavos: 0 }
      acc.centavos += c.centavos
      acc.color = acc.color ?? c.color
      total.set(c.nombre, acc)
    }
  }
  const orden = [...total.values()].sort((a, b) => b.centavos - a.centavos)
  const bucket = orden.findIndex((c) => c.nombre === 'Otras categorías')
  if (bucket >= 0) orden.push(...orden.splice(bucket, 1))
  let k = 0
  return orden.map((c) => ({ ...c, color: c.color ?? PALETA[k++ % PALETA.length]! }))
})
const mapaColores = computed(() => new Map(leyenda.value.map((c) => [c.nombre, c.color!])))
const colorBarra = (nombre: string) => mapaColores.value.get(nombre) ?? 'var(--color-ink-faint)'
const etiquetasDia = computed(() => {
  const paso = Math.max(1, Math.ceil(barras.value.length / 8))
  return barras.value.map((d, i) => (i % paso === 0 ? d.fecha.slice(8) : ''))
})
const anchoMinimo = computed(() => (barras.value.length > 45 ? `${barras.value.length * 8}px` : '100%'))

</script>

<template>
  <section>
    <div class="mb-6">
      <h1 class="hs-1">Reportes</h1>
      <p class="mt-1 text-ink-muted">Tendencias con equivalente histórico (tasa de cada movimiento).</p>
    </div>

    <!-- Filtros -->
    <div class="card mb-6 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Desde</span>
          <input v-model="filtros.desde" type="date" class="input-field w-auto">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Hasta</span>
          <input v-model="filtros.hasta" type="date" class="input-field w-auto">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Fondo</span>
          <select v-model="filtros.fondo" class="input-field w-auto">
            <option value="">Todos los fondos</option>
            <option v-for="f in fondos" :key="f.id" :value="String(f.id)">{{ f.nombre }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Moneda base</span>
          <select v-model="filtros.base" class="input-field w-auto">
            <option value="BOB">BOB</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary h-12 px-4 text-sm" @click="preset('actual')">Mes actual</button>
          <button type="button" class="btn-secondary h-12 px-4 text-sm" @click="preset('anterior')">Mes pasado</button>
          <a :href="csvUrl" class="btn-secondary flex h-12 items-center px-4 text-sm" download>Exportar CSV</a>
        </div>
      </div>
    </div>

    <template v-if="r">
      <!-- Flujo del período -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Ingresos</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-positive">{{ fmt(r.flujo.consolidado.ingresos_centavos) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Egresos</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-negative">{{ fmt(r.flujo.consolidado.egresos_centavos) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Neto</p>
          <p class="mt-1 text-xl font-bold tabular-nums" :class="r.flujo.consolidado.neto_centavos >= 0 ? 'text-positive' : 'text-negative'">
            {{ r.flujo.consolidado.neto_centavos >= 0 ? '+' : '' }}{{ fmt(r.flujo.consolidado.neto_centavos) }}
          </p>
        </div>
      </div>
      <p class="mt-2 text-xs text-ink-faint">{{ r.nota }}</p>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <!-- Gastos por categoría (donut) -->
        <div class="card p-5">
          <h2 class="hs-2 mb-4">Gastos por categoría</h2>
          <div v-if="donut.length" class="flex flex-col items-center gap-5 sm:flex-row">
            <svg viewBox="0 0 42 42" class="h-40 w-40 shrink-0 -rotate-90">
              <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#EDF1F8" stroke-width="6" />
              <circle
                v-for="seg in donut"
                :key="seg.categoria_id ?? 'sin'"
                cx="21"
                cy="21"
                r="15.9155"
                fill="transparent"
                :stroke="seg.color"
                stroke-width="6"
                :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                :stroke-dashoffset="seg.offset"
              />
            </svg>
            <ul class="flex w-full flex-col gap-2">
              <li v-for="seg in donut" :key="seg.categoria_id ?? 'sin'" class="flex items-center justify-between gap-3 text-sm">
                <span class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full" :style="{ background: seg.color }" />
                  <span class="text-ink">{{ seg.nombre }}</span>
                </span>
                <span class="tabular-nums text-ink-muted">{{ seg.porcentaje }}% · {{ fmt(seg.centavos) }}</span>
              </li>
            </ul>
          </div>
          <p v-else class="py-8 text-center text-sm text-ink-muted">Sin gastos en el período.</p>
        </div>

        <!-- Ingresos vs egresos por mes -->
        <div class="card p-5">
          <h2 class="hs-2 mb-4">Ingresos vs egresos (12 meses)</h2>
          <div class="flex items-end justify-between gap-1.5" style="height: 11rem">
            <div v-for="m in r.serie_mensual" :key="m.mes" class="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div class="flex w-full flex-1 items-end justify-center gap-0.5">
                <span class="w-1.5 rounded-t bg-positive" :style="{ height: `${(m.ingresos_centavos / maxSerie) * 100}%` }" :title="`Ingresos ${fmt(m.ingresos_centavos)}`" />
                <span class="w-1.5 rounded-t bg-negative" :style="{ height: `${(m.egresos_centavos / maxSerie) * 100}%` }" :title="`Egresos ${fmt(m.egresos_centavos)}`" />
              </div>
              <span class="text-[10px] text-ink-faint">{{ m.mes.slice(5) }}</span>
            </div>
          </div>
          <p class="mt-2 text-xs text-ink-faint">Verde: ingresos · coral: egresos.</p>
        </div>
      </div>

      <!-- Barras diarias por categoría -->
      <div class="card mt-6 p-5">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="hs-2">Por día y categoría</h2>
            <p class="mt-1 text-xs text-ink-faint">Arriba ingresos · abajo egresos. Top 6 del período + Otras categorías.</p>
          </div>
          <div class="flex gap-2">
            <button
              v-for="op in ([['ambos', 'Ambos'], ['ingresos', 'Ingresos'], ['egresos', 'Egresos']] as const)"
              :key="op[0]"
              type="button"
              class="h-9 rounded-full px-4 text-sm font-medium transition-colors"
              :class="series === op[0] ? 'bg-surface-tint text-ink' : 'border border-border text-ink-muted hover:bg-surface-hover'"
              @click="series = op[0]"
            >
              {{ op[1] }}
            </button>
          </div>
        </div>

        <template v-if="barras.length">
          <div class="overflow-x-auto">
            <div class="flex items-stretch gap-0.5" :style="{ height: '12rem', minWidth: anchoMinimo }">
              <div v-for="d in barras" :key="d.fecha" class="flex min-w-[6px] flex-1 flex-col">
                <div v-if="series !== 'egresos'" class="flex flex-1 flex-col justify-end">
                  <span
                    v-for="(c, i) in d.ingresos"
                    :key="`i-${i}`"
                    :style="{ height: altoBarra(c.centavos), background: colorBarra(c.nombre) }"
                    :title="`${d.fecha} · ${c.nombre}: ${fmt(c.centavos)}`"
                  />
                </div>
                <span v-if="series === 'ambos'" class="h-px w-full shrink-0" style="background: var(--color-border-strong)" />
                <div v-if="series !== 'ingresos'" class="flex flex-1 flex-col">
                  <span
                    v-for="(c, i) in d.egresos"
                    :key="`e-${i}`"
                    :style="{ height: altoBarra(c.centavos), background: colorBarra(c.nombre) }"
                    :title="`${d.fecha} · ${c.nombre}: ${fmt(c.centavos)}`"
                  />
                </div>
              </div>
            </div>
            <div class="mt-1 flex gap-0.5" :style="{ minWidth: anchoMinimo }">
              <span v-for="(d, i) in barras" :key="`l-${d.fecha}`" class="min-w-[6px] flex-1 text-center text-[10px] text-ink-faint">
                {{ etiquetasDia[i] }}
              </span>
            </div>
          </div>
          <ul v-if="leyenda.length" class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
            <li v-for="l in leyenda" :key="l.nombre" class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full" :style="{ background: l.color }" />
              {{ l.nombre }}
            </li>
          </ul>
        </template>
        <p v-else class="py-8 text-center text-sm text-ink-muted">Sin movimientos en el período.</p>
      </div>

      <!-- Evolución del saldo -->
      <div class="card mt-6 p-5">
        <h2 class="hs-2 mb-4">Evolución del saldo</h2>
        <svg v-if="linea" viewBox="0 0 100 40" preserveAspectRatio="none" class="h-40 w-full">
          <polyline :points="linea" fill="none" stroke="#0E6FFF" stroke-width="0.8" vector-effect="non-scaling-stroke" />
        </svg>
        <p v-else class="py-8 text-center text-sm text-ink-muted">Sin datos en el período.</p>
        <div v-if="r.evolucion_saldo.length" class="mt-2 flex justify-between text-xs text-ink-faint">
          <span>{{ r.evolucion_saldo[0]?.fecha }}</span>
          <span>{{ fmt(r.evolucion_saldo.at(-1)?.saldo_centavos ?? 0) }}</span>
          <span>{{ r.evolucion_saldo.at(-1)?.fecha }}</span>
        </div>
      </div>
    </template>
  </section>
</template>
