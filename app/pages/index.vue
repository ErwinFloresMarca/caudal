<script setup lang="ts">
import { formatMoney } from '#shared/money'

interface SaldoMoneda { moneda: 'BOB' | 'USD'; centavos: number; formateado: string }
interface Cuenta { id: number; nombre: string; tipo: string; moneda: 'BOB' | 'USD'; saldo_actual_centavos: number }
interface CategoriaGasto { categoria_id: number | null; nombre: string; icono: string | null; color: string | null; centavos: number; porcentaje: number }
interface RecurrentePend { id: number; monto_formateado: string; tipo: string; proxima_fecha: string; categoria: { nombre: string } | null }
interface CuotaPend { cuota_id: number; numero: number; fecha_vencimiento: string; monto_formateado: string; contraparte: string; direccion: string; vencida: boolean }
interface MetaResumen { id: number; nombre: string; monto_objetivo_formateado: string; progreso: { porcentaje: number; acumulado_formateado: string; restante_formateado: string; alcanzada: boolean } }
interface Movimiento { id: number; fecha: string; tipo: string; monto_formateado: string; categoria: { nombre: string; icono: string | null; color: string | null } | null }
interface Resumen {
  saldos: { por_moneda: SaldoMoneda[]; consolidado: { centavos: number; formateado: string; nota: string | null } | null }
  cuentas: Cuenta[]
  mes: { desde: string; hasta: string; consolidado: { ingresos_centavos: number; egresos_centavos: number; neto_centavos: number }; por_moneda: SaldoMoneda[] }
  gastos_por_categoria: CategoriaGasto[]
  pendientes: { recurrentes: RecurrentePend[]; cuotas: CuotaPend[] }
  metas: MetaResumen[]
  vacio: boolean
}

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const { data: resumen } = await useAsyncData(
  'dashboard-resumen',
  async () => {
    if (!fondoActivo.value) return null
    const r = await request<{ resumen: Resumen }>('/api/resumen')
    return r.resumen
  },
  { watch: [fondoActivo] },
)
const { data: recientes } = await useAsyncData(
  'dashboard-recientes',
  () => (fondoActivo.value ? request<{ transacciones: Movimiento[] }>('/api/movimientos?limite=5') : Promise.resolve(null)),
  { watch: [fondoActivo] },
)

const fmt = (centavos: number, moneda: 'BOB' | 'USD') => formatMoney({ centavos, moneda })
const ICONOS: Record<string, string> = {
  efectivo: 'i-material-symbols-payments',
  banco: 'i-material-symbols-account-balance',
  tarjeta: 'i-material-symbols-credit-card',
  ahorro: 'i-material-symbols-savings',
}
const iconoCuenta = (tipo: string) => ICONOS[tipo] ?? 'i-material-symbols-account-balance-wallet'
const monedaBase = computed(() => fondoActivo.value?.moneda_base ?? 'BOB')
const mesLabel = computed(() => {
  const desde = resumen.value?.mes.desde
  if (!desde) return ''
  const [y, m] = desde.split('-').map(Number)
  const nombre = new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(Date.UTC(y!, m! - 1, 1)))
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`
})
const neto = computed(() => resumen.value?.mes.consolidado.neto_centavos ?? 0)
const ahorroPct = computed(() => {
  const { ingresos_centavos, neto_centavos } = resumen.value?.mes.consolidado ?? { ingresos_centavos: 0, neto_centavos: 0 }
  return ingresos_centavos > 0 ? Math.round((neto_centavos / ingresos_centavos) * 100) : 0
})
</script>

<template>
  <section class="space-y-6">
    <!-- Empty state -->
    <div v-if="!resumen || resumen.vacio" class="card flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-water-drop" class="size-6 text-brand" />
      </span>
      <h1 class="mt-3 hs-2">Empieza con Caudal</h1>
      <p class="mt-1 text-ink-muted">Crea un fondo y sus cuentas para ver tu resumen aquí.</p>
      <NuxtLink to="/fondos" class="btn-primary mt-5">Crear mi primer fondo</NuxtLink>
    </div>

    <template v-else>
      <!-- Hero: saldo consolidado -->
      <div class="card relative overflow-hidden p-6">
        <p class="text-sm text-ink-muted">Saldo total · {{ fondoActivo?.nombre }}</p>
        <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span v-for="s in resumen.saldos.por_moneda" :key="s.moneda" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">
            {{ s.formateado }}
          </span>
        </div>
        <p v-if="resumen.saldos.consolidado?.nota" class="mt-2 text-xs text-ink-faint">
          {{ resumen.saldos.consolidado.formateado }} · {{ resumen.saldos.consolidado.nota }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <NuxtLink to="/movimientos" class="btn-primary h-11 px-5 text-sm">
            <UIcon name="i-material-symbols-add" class="size-5" /> Registrar
          </NuxtLink>
          <NuxtLink to="/transferencias" class="btn-secondary h-11 px-5 text-sm">
            <UIcon name="i-material-symbols-sync-alt" class="size-5" /> Transferir
          </NuxtLink>
        </div>
      </div>

      <!-- KPIs del mes -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="hs-2">Resumen de {{ mesLabel }}</h2>
          <span v-if="neto !== 0" class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold" :class="neto >= 0 ? 'text-positive' : 'text-negative'">
            Ahorro del {{ ahorroPct }}% de ingresos
          </span>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="card p-5">
            <div class="flex items-center gap-2 text-ink-muted">
              <UIcon name="i-material-symbols-trending-up" class="size-5 text-positive" />
              <span class="text-sm">Ingresos del mes</span>
            </div>
            <p class="mt-2 text-xl font-bold tabular-nums text-positive">
              {{ fmt(resumen.mes.consolidado.ingresos_centavos, monedaBase) }}
            </p>
          </div>
          <div class="card p-5">
            <div class="flex items-center gap-2 text-ink-muted">
              <UIcon name="i-material-symbols-trending-down" class="size-5 text-negative" />
              <span class="text-sm">Egresos del mes</span>
            </div>
            <p class="mt-2 text-xl font-bold tabular-nums text-negative">
              {{ fmt(resumen.mes.consolidado.egresos_centavos, monedaBase) }}
            </p>
          </div>
          <div class="card p-5">
            <div class="flex items-center gap-2 text-ink-muted">
              <UIcon name="i-material-symbols-account-balance-wallet" class="size-5" />
              <span class="text-sm">Resultado neto</span>
            </div>
            <p class="mt-2 text-xl font-bold tabular-nums" :class="neto >= 0 ? 'text-positive' : 'text-negative'">
              {{ neto >= 0 ? '+' : '' }}{{ fmt(neto, monedaBase) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Cuentas -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="hs-2">Cuentas en este fondo</h2>
          <NuxtLink :to="`/fondos/${fondoActivo?.id}`" class="text-sm font-semibold text-brand hover:text-brand-600">Gestionar cuentas</NuxtLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="c in resumen.cuentas" :key="c.id" class="card p-4">
            <div class="flex min-w-0 items-center gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted text-ink">
                <UIcon :name="iconoCuenta(c.tipo)" class="size-5" />
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-medium text-ink">{{ c.nombre }}</span>
                <span class="text-xs capitalize text-ink-faint">{{ c.tipo }}</span>
              </span>
            </div>
            <p class="mt-3 whitespace-nowrap text-lg font-bold tabular-nums text-ink">{{ fmt(c.saldo_actual_centavos, c.moneda) }}</p>
          </div>
        </div>
      </div>

      <!-- Grid 2/3 + 1/3 -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <!-- Últimos movimientos -->
          <div class="card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="hs-2">Movimientos recientes</h2>
              <NuxtLink to="/movimientos" class="text-sm font-semibold text-brand hover:text-brand-600">Ver todos</NuxtLink>
            </div>
            <ul class="divide-y divide-border">
              <li v-for="m in recientes?.transacciones ?? []" :key="m.id" class="flex items-center justify-between py-3">
                <span class="flex items-center gap-3">
                  <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted" :style="{ color: m.categoria?.color ?? '#5B6B85' }">
                    <UIcon :name="iconoMaterial(m.categoria?.icono)" class="size-5" />
                  </span>
                  <span class="flex flex-col">
                    <span class="text-sm font-medium text-ink">{{ m.categoria?.nombre ?? 'Sin categoría' }}</span>
                    <span class="text-xs text-ink-faint">{{ m.fecha }}</span>
                  </span>
                </span>
                <span class="tabular-nums font-semibold" :class="m.tipo === 'ingreso' ? 'text-positive' : 'text-negative'">
                  {{ m.tipo === 'ingreso' ? '+' : '−' }} {{ m.monto_formateado }}
                </span>
              </li>
              <li v-if="!(recientes?.transacciones?.length)" class="py-6 text-center text-sm text-ink-muted">Sin movimientos todavía.</li>
            </ul>
          </div>

          <!-- Gastos por categoría -->
          <div class="card p-5">
            <h2 class="hs-2 mb-3">Gastos por categoría del mes</h2>
            <div v-if="resumen.gastos_por_categoria.length" class="mb-4 flex h-2.5 overflow-hidden rounded-full bg-surface-muted">
              <span
                v-for="g in resumen.gastos_por_categoria"
                :key="g.categoria_id ?? 'sin'"
                :style="{ width: `${g.porcentaje}%`, background: g.color ?? '#8E9BAE' }"
              />
            </div>
            <ul class="space-y-3">
              <li v-for="g in resumen.gastos_por_categoria" :key="g.categoria_id ?? 'sin'" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-3">
                  <span class="grid h-8 w-8 place-items-center rounded-full bg-surface-muted" :style="{ color: g.color ?? '#5B6B85' }">
                    <UIcon :name="iconoMaterial(g.icono)" class="size-4" />
                  </span>
                  <span class="text-sm text-ink">{{ g.nombre }}</span>
                </span>
                <span class="flex items-center gap-3">
                  <span class="text-xs text-ink-faint tabular-nums">{{ g.porcentaje }}%</span>
                  <span class="text-sm font-semibold tabular-nums text-ink">{{ fmt(g.centavos, monedaBase) }}</span>
                </span>
              </li>
              <li v-if="!resumen.gastos_por_categoria.length" class="py-6 text-center text-sm text-ink-muted">Sin gastos este mes.</li>
            </ul>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Pendientes por confirmar -->
          <div class="card p-5">
            <h2 class="hs-2 mb-3">Pendientes por confirmar</h2>
            <ul class="space-y-3">
              <li v-for="r in resumen.pendientes.recurrentes" :key="r.id" class="flex items-center justify-between gap-3">
                <span class="flex flex-col">
                  <span class="text-sm font-medium text-ink">{{ r.categoria?.nombre ?? 'Recurrente' }}</span>
                  <span class="text-xs text-ink-faint">Vencía {{ r.proxima_fecha }}</span>
                </span>
                <NuxtLink to="/recurrentes" class="btn-secondary h-9 px-3 text-xs">{{ r.monto_formateado }}</NuxtLink>
              </li>
              <li v-if="!resumen.pendientes.recurrentes.length" class="py-3 text-sm text-ink-muted">Nada por confirmar.</li>
            </ul>
          </div>

          <!-- Próximas cuotas -->
          <div class="card p-5">
            <h2 class="hs-2 mb-3">Deudas y compromisos</h2>
            <ul class="space-y-3">
              <li v-for="c in resumen.pendientes.cuotas" :key="c.cuota_id" class="flex items-center justify-between gap-3">
                <span class="flex flex-col">
                  <span class="text-sm font-medium text-ink">{{ c.contraparte }}</span>
                  <span class="text-xs" :class="c.vencida ? 'text-negative' : 'text-ink-faint'">
                    Cuota {{ c.numero }} · {{ c.fecha_vencimiento }}<span v-if="c.vencida"> · vencida</span>
                  </span>
                </span>
                <span class="whitespace-nowrap text-sm font-semibold tabular-nums" :class="c.direccion === 'por_cobrar' ? 'text-positive' : 'text-negative'">
                  {{ c.monto_formateado }}
                </span>
              </li>
              <li v-if="!resumen.pendientes.cuotas.length" class="py-3 text-sm text-ink-muted">Sin cuotas próximas.</li>
            </ul>
          </div>

          <!-- Metas activas -->
          <div class="card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="hs-2">Metas de ahorro</h2>
              <NuxtLink to="/metas" class="text-sm font-semibold text-brand hover:text-brand-600">Ver</NuxtLink>
            </div>
            <ul class="space-y-4">
              <li v-for="m in resumen.metas" :key="m.id">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-ink">{{ m.nombre }}</span>
                  <span class="text-sm font-semibold tabular-nums text-ink">{{ m.progreso.porcentaje }}%</span>
                </div>
                <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <span class="block h-full rounded-full" :class="m.progreso.alcanzada ? 'bg-positive' : 'bg-brand'" :style="{ width: `${m.progreso.porcentaje}%` }" />
                </div>
                <p class="mt-1 text-xs text-ink-faint">{{ m.progreso.acumulado_formateado }} de {{ m.monto_objetivo_formateado }}</p>
              </li>
              <li v-if="!resumen.metas.length" class="py-3 text-sm text-ink-muted">Sin metas activas.</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
