<script setup lang="ts">
import { formatMoney } from '#shared/money'
import type { Cuenta, Categoria, Movimiento, MovimientoEditable, ResumenMovimientos } from '~/types/movimientos'

const { fondoActivo, fondos } = useFondoActivo()
const request = useRequestFetch()
const route = useRoute()
const router = useRouter()

const CLAVES = ['q', 'tipo', 'moneda', 'cuenta_id', 'categoria_id', 'desde', 'hasta', 'monto_min', 'monto_max', 'fuente', 'fondo_id'] as const
const ETIQUETAS: Record<string, string> = {
  q: 'Buscar',
  tipo: 'Tipo',
  moneda: 'Moneda',
  cuenta_id: 'Cuenta',
  categoria_id: 'Categoría',
  desde: 'Desde',
  hasta: 'Hasta',
  monto_min: 'Monto mín',
  monto_max: 'Monto máx',
  fuente: 'Fuente',
  fondo_id: 'Fondo',
}

const filtros = reactive<Record<string, string>>({})
for (const k of CLAVES) filtros[k] = typeof route.query[k] === 'string' ? (route.query[k] as string) : ''
const avanzados = ref(false)
const formAbierto = ref(false)
const enEdicion = ref<MovimientoEditable | null>(null)
const porBorrar = ref<Movimiento | null>(null)
const borrando = ref(false)
const confirmarAbierto = computed({
  get: () => !!porBorrar.value,
  set: (v: boolean) => {
    if (!v) porBorrar.value = null
  },
})

const filas = ref<Movimiento[]>([])
const cursor = ref<string | null>(null)
const cargando = ref(false)

const { data: cuentasData } = await useAsyncData(
  'mov-cuentas',
  () => (fondoActivo.value ? request<{ cuentas: Cuenta[] }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: catsData } = await useAsyncData(
  'mov-cats',
  () => (fondoActivo.value ? request<{ categorias: Categoria[] }>(`/api/fondos/${fondoActivo.value.id}/categorias`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: tasaData } = await useAsyncData('mov-tasa', () => request<{ actual: { valor: number } | null }>('/api/ajustes/tasa'))

const cuentas = computed(() => cuentasData.value?.cuentas ?? [])
const categorias = computed(() => catsData.value?.categorias ?? [])
const tasaSugerida = computed(() => tasaData.value?.actual?.valor ?? null)

const resumen = ref<ResumenMovimientos | null>(null)

// Misma query para la lista, el resumen y el CSV: los tres ven el mismo filtro.
function paramsFiltros() {
  const params = new URLSearchParams()
  for (const k of CLAVES) if (filtros[k]) params.set(k, filtros[k]!)
  return params
}
const csvUrl = computed(() => `/api/movimientos/export.csv?${paramsFiltros().toString()}`)

async function cargarResumen() {
  const r = await request<{ resumen: ResumenMovimientos }>(`/api/movimientos/resumen?${paramsFiltros().toString()}`)
  resumen.value = r.resumen
}

function recargar() {
  cargar(true)
  cargarResumen()
}

async function cargar(reset: boolean) {
  if (!reset && !cursor.value) return
  cargando.value = true
  try {
    const params = paramsFiltros()
    params.set('limite', '30')
    if (!reset && cursor.value) params.set('cursor', cursor.value)
    const r = await request<{ transacciones: Movimiento[]; siguiente_cursor: string | null }>(`/api/movimientos?${params.toString()}`)
    filas.value = reset ? r.transacciones : [...filas.value, ...r.transacciones]
    cursor.value = r.siguiente_cursor
  } finally {
    cargando.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  filtros,
  () => {
    const query: Record<string, string> = {}
    for (const k of CLAVES) if (filtros[k]) query[k] = filtros[k]!
    router.replace({ query })
    clearTimeout(timer)
    timer = setTimeout(recargar, 250)
  },
  { deep: true },
)
watch(fondoActivo, () => {
  filtros.fondo_id = ''
  recargar()
})

const grupos = computed(() => {
  const map = new Map<string, Movimiento[]>()
  for (const f of filas.value) {
    const arr = map.get(f.fecha) ?? []
    arr.push(f)
    map.set(f.fecha, arr)
  }
  return [...map.entries()]
})

const kpis = computed(() => resumen.value?.kpis ?? null)
const fmt = (centavos: number) => formatMoney({ centavos, moneda: resumen.value?.moneda ?? 'BOB' })
const maxCategoria = computed(() => Math.max(1, ...(resumen.value?.por_categoria ?? []).map((c) => c.centavos)))
const anchoCategoria = (centavos: number) => `${(centavos / maxCategoria.value) * 100}%`
const mayorGasto = computed(() => resumen.value?.por_categoria[0] ?? null)

const activos = computed(() => Object.entries(filtros).filter(([, v]) => v))
function limpiar() {
  for (const k of CLAVES) filtros[k] = ''
}
function etiquetaFecha(fecha: string) {
  const hoy = new Date().toISOString().slice(0, 10)
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (fecha === hoy) return `Hoy · ${fecha}`
  if (fecha === ayer) return `Ayer · ${fecha}`
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

function abrirNuevo() {
  enEdicion.value = null
  formAbierto.value = true
}
function abrirEditar(m: Movimiento) {
  enEdicion.value = { id: m.id, fecha: m.fecha, tipo: m.tipo, monto_centavos: m.monto_centavos, moneda: m.moneda, tasa_ref: m.tasa_ref, nota: m.nota, cuenta_id: m.cuenta_id, categoria: m.categoria ? { id: m.categoria.id, nombre: m.categoria.nombre } : null }
  formAbierto.value = true
}
async function confirmarBorrado() {
  if (!porBorrar.value) return
  borrando.value = true
  try {
    await $fetch(`/api/movimientos/${porBorrar.value.id}`, { method: 'DELETE' })
    porBorrar.value = null
    recargar()
  } finally {
    borrando.value = false
  }
}

onMounted(() => {
  recargar()
  if (route.query.nuevo === '1') {
    abrirNuevo()
    router.replace({ query: { ...route.query, nuevo: undefined } })
  }
})
</script>

<template>
  <section>
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h1 class="hs-1">Movimientos</h1>
        <p class="mt-1 text-ink-muted">{{ fondoActivo?.nombre }}</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="abrirNuevo">
        <UIcon name="i-material-symbols-add" class="size-5" />
        <span class="hidden sm:inline">Registrar</span>
      </button>
    </div>

    <!-- KPIs del filtro vigente (SPC-042) -->
    <div v-if="kpis" class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-xs uppercase tracking-wide text-ink-faint">Total ingresos</p>
        <p class="mt-1 text-lg font-bold tabular-nums text-positive">{{ fmt(kpis.ingresos_centavos) }}</p>
        <p class="mt-0.5 text-xs text-ink-faint">{{ kpis.entradas }} {{ kpis.entradas === 1 ? 'entrada' : 'entradas' }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs uppercase tracking-wide text-ink-faint">Total egresos</p>
        <p class="mt-1 text-lg font-bold tabular-nums text-negative">{{ fmt(kpis.egresos_centavos) }}</p>
        <p class="mt-0.5 text-xs text-ink-faint">
          {{ kpis.salidas }} {{ kpis.salidas === 1 ? 'egreso' : 'egresos' }}<template v-if="kpis.ingresos_centavos > 0"> · {{ kpis.porcentaje_consumido }} % consumido</template>
        </p>
      </div>
      <div class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-1">
          <p class="whitespace-nowrap text-xs uppercase tracking-wide text-ink-faint">Flujo neto</p>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            :class="kpis.superavit ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'"
          >
            {{ kpis.superavit ? 'SUPERÁVIT' : 'DÉFICIT' }}
          </span>
        </div>
        <p class="mt-1 text-lg font-bold tabular-nums" :class="kpis.superavit ? 'text-positive' : 'text-negative'">
          {{ kpis.neto_centavos >= 0 ? '+' : '' }}{{ fmt(kpis.neto_centavos) }}
        </p>
        <p class="mt-0.5 text-xs text-ink-faint">
          {{ kpis.ingresos_centavos > 0 ? `${kpis.tasa_ahorro} % de ahorro` : 'Sin ingresos en el período' }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-xs uppercase tracking-wide text-ink-faint">Operaciones</p>
        <p class="mt-1 text-lg font-bold tabular-nums text-ink">{{ kpis.operaciones }}</p>
        <p class="mt-0.5 text-xs text-ink-faint">{{ kpis.entradas }} ingresos · {{ kpis.salidas }} egresos</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card mb-5 p-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="relative w-full min-w-0 sm:flex-1">
          <UIcon name="i-material-symbols-search" class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-faint" />
          <input v-model="filtros.q" type="search" placeholder="Buscar por nota o categoría" class="input-field pl-10">
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <select v-model="filtros.tipo" class="input-field w-full sm:w-auto">
            <option value="">Ingresos y gastos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
          </select>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary h-12 flex-1 shrink-0 justify-center px-4 text-sm sm:flex-none" @click="avanzados = !avanzados">
              <UIcon name="i-material-symbols-tune" class="size-5" /> Filtros
            </button>
            <a :href="csvUrl" class="btn-secondary flex h-12 flex-1 shrink-0 items-center justify-center gap-1 px-4 text-sm sm:flex-none" download title="Exportar con estos filtros">
              <UIcon name="i-material-symbols-download" class="size-5" /> <span class="hidden sm:inline">CSV</span>
            </a>
          </div>
        </div>
      </div>

      <div v-if="avanzados" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Fondo</span>
          <select v-model="filtros.fondo_id" class="input-field">
            <option value="">Fondo activo</option>
            <option value="todos">Todos los fondos</option>
            <option v-for="f in fondos" :key="f.id" :value="String(f.id)">{{ f.nombre }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Cuenta</span>
          <select v-model="filtros.cuenta_id" class="input-field">
            <option value="">Todas</option>
            <option v-for="c in cuentas" :key="c.id" :value="String(c.id)">{{ c.nombre }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Categoría</span>
          <select v-model="filtros.categoria_id" class="input-field">
            <option value="">Todas</option>
            <option v-for="c in categorias" :key="c.id" :value="String(c.id)">{{ c.nombre }} ({{ c.tipo }})</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Moneda</span>
          <select v-model="filtros.moneda" class="input-field">
            <option value="">Todas</option>
            <option value="BOB">BOB</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Desde</span>
          <input v-model="filtros.desde" type="date" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Hasta</span>
          <input v-model="filtros.hasta" type="date" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Monto mín (centavos)</span>
          <input v-model="filtros.monto_min" type="number" min="0" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-ink-muted">Monto máx (centavos)</span>
          <input v-model="filtros.monto_max" type="number" min="0" class="input-field">
        </label>
      </div>

      <div v-if="activos.length" class="mt-4 flex flex-wrap items-center gap-2">
        <span class="text-xs text-ink-faint">Filtros activos:</span>
        <button
          v-for="[k, v] in activos"
          :key="k"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-surface-tint px-3 py-1 text-xs text-ink"
          @click="filtros[k] = ''"
        >
          {{ ETIQUETAS[k] ?? k }}: {{ v }}
          <UIcon name="i-material-symbols-close" class="size-3.5" />
        </button>
        <button type="button" class="text-xs font-semibold text-brand hover:text-brand-600" @click="limpiar">Limpiar filtros</button>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
    <!-- Lista -->
    <div class="card p-2 lg:col-span-2">
      <div v-for="[fecha, items] in grupos" :key="fecha">
        <p class="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{{ etiquetaFecha(fecha) }}</p>
        <ul class="divide-y divide-border">
          <li v-for="m in items" :key="m.id" class="group flex items-center justify-between gap-3 px-3 py-3">
            <span class="flex min-w-0 items-center gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted" :style="{ color: m.categoria?.color ?? 'var(--color-ink-muted)' }">
                <UIcon :name="iconoMaterial(m.categoria?.icono)" class="size-5" />
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-medium text-ink">{{ m.nota || m.categoria?.nombre || 'Sin categoría' }}</span>
                <span class="truncate text-xs text-ink-faint">{{ m.categoria?.nombre ?? 'Sin categoría' }} · {{ m.cuenta_nombre ?? '—' }}</span>
              </span>
            </span>
            <span class="flex items-center gap-2">
              <span class="flex flex-col items-end">
                <span class="whitespace-nowrap font-semibold tabular-nums" :class="m.tipo === 'ingreso' ? 'text-positive' : 'text-negative'">
                  {{ m.tipo === 'ingreso' ? '+' : '−' }} {{ m.monto_formateado }}
                </span>
                <span
                  v-if="m.saldo_continuo_centavos != null"
                  class="whitespace-nowrap text-[11px] tabular-nums text-ink-faint"
                  title="Saldo total de tus cuentas después de este movimiento"
                >
                  {{ fmt(m.saldo_continuo_centavos) }}
                </span>
              </span>
              <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="abrirEditar(m)">
                  <UIcon name="i-material-symbols-edit" class="size-4" />
                </button>
                <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="porBorrar = m">
                  <UIcon name="i-material-symbols-delete" class="size-4" />
                </button>
              </span>
            </span>
          </li>
        </ul>
      </div>

      <p v-if="!cargando && !filas.length" class="py-10 text-center text-sm text-ink-muted">
        {{ activos.length ? 'Sin resultados para los filtros activos.' : 'Aún no registraste movimientos.' }}
      </p>

      <p v-if="filas.length" class="px-3 pb-2 pt-3 text-[11px] text-ink-faint">
        El saldo bajo cada monto es el total de tus cuentas ({{ resumen?.moneda ?? 'BOB' }}) después de ese movimiento. Las transferencias mueven plata entre cuentas, no el total.
      </p>

      <div v-if="cursor" class="flex justify-center py-4">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" :disabled="cargando" @click="cargar(false)">
          {{ cargando ? 'Cargando…' : 'Cargar más' }}
        </button>
      </div>
    </div>

    <!-- Egresos por categoría (SPC-042) -->
    <aside class="card h-fit p-5">
      <h2 class="hs-2">Egresos por categoría</h2>
      <p v-if="mayorGasto" class="mt-1 text-xs text-ink-faint">Mayor gasto: {{ mayorGasto.nombre }} · {{ mayorGasto.porcentaje }} %</p>
      <ul v-if="resumen?.por_categoria.length" class="mt-4 flex flex-col gap-4">
        <li v-for="c in resumen.por_categoria" :key="c.categoria_id ?? 'sin'">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="truncate text-ink">{{ c.nombre }}</span>
            <span class="whitespace-nowrap tabular-nums text-ink-muted">{{ fmt(c.centavos) }}</span>
          </div>
          <div class="mt-1.5 h-2 w-full rounded-full bg-surface-muted">
            <div class="h-2 rounded-full" :style="{ width: anchoCategoria(c.centavos), background: c.color ?? 'var(--color-brand)' }" />
          </div>
        </li>
      </ul>
      <p v-else class="py-8 text-center text-sm text-ink-muted">Sin egresos en el período.</p>
      <p class="mt-4 text-xs text-ink-faint">Las transferencias y aportes entre fondos no alteran el resultado del período.</p>
    </aside>
    </div>

    <FormMovimiento
      v-model:abierto="formAbierto"
      :movimiento="enEdicion"
      :cuentas="cuentas"
      :categorias="categorias"
      :tasa-sugerida="tasaSugerida"
      @guardado="recargar"
    />

    <!-- Confirmar borrado -->
    <UModal v-model:open="confirmarAbierto" title="Borrar movimiento">
      <template #body>
        <p class="text-sm text-ink-muted">
          ¿Seguro que quieres borrar «{{ porBorrar?.nota || porBorrar?.categoria?.nombre }}» ({{ porBorrar?.monto_formateado }})? Esta acción no se puede deshacer.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="porBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm hover:bg-negative" :disabled="borrando" @click="confirmarBorrado">
            {{ borrando ? 'Borrando…' : 'Borrar' }}
          </button>
        </div>
      </template>
    </UModal>
  </section>
</template>
