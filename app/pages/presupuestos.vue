<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Categoria } from '~/types/movimientos'
import type { Presupuesto, PresupuestosResp, EstadoPresupuesto } from '~/types/presupuestos'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const hoyMes = new Date().toISOString().slice(0, 7)
const mes = ref(hoyMes)
function cambiarMes(delta: number) {
  const [y, m] = mes.value.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
  mes.value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const mesLabel = computed(() => {
  const [y, m] = mes.value.split('-').map(Number)
  const n = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y!, m! - 1, 1)))
  return `${n.charAt(0).toUpperCase()}${n.slice(1)}`
})

const { data, refresh } = await useAsyncData(
  'presupuestos',
  () => (fondoActivo.value ? request<{ presupuestos: PresupuestosResp }>(`/api/presupuestos?mes=${mes.value}`) : Promise.resolve(null)),
  { watch: [fondoActivo, mes] },
)
const { data: catsData } = await useAsyncData(
  'presu-cats',
  () => (fondoActivo.value ? request<{ categorias: Categoria[] }>(`/api/fondos/${fondoActivo.value.id}/categorias`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)

const resp = computed(() => data.value?.presupuestos ?? null)
const categorias = computed(() => catsData.value?.categorias ?? [])
const estadoFiltro = ref<'todos' | EstadoPresupuesto>('todos')
const lista = computed(() => {
  const all = resp.value?.presupuestos ?? []
  return estadoFiltro.value === 'todos' ? all : all.filter((p) => p.estado === estadoFiltro.value)
})

const ESTADO: Record<EstadoPresupuesto, { label: string; text: string; bar: string }> = {
  en_ritmo: { label: 'En ritmo', text: 'text-positive', bar: 'bg-brand' },
  alerta: { label: 'Alerta', text: 'text-[#C27A18]', bar: 'bg-warning' },
  sobregiro: { label: 'Sobregiro', text: 'text-negative', bar: 'bg-negative' },
}
const barra = (p: Presupuesto) => Math.min(100, Math.max(0, p.porcentaje))

// Alta
const formAbierto = ref(false)
function asignar() {
  formAbierto.value = true
}

// Compensar
const compensando = ref<Presupuesto | null>(null)
const compOrigen = ref(0)
const compMonto = ref('')
const compError = ref('')
const compAbierto = computed({ get: () => !!compensando.value, set: (v: boolean) => { if (!v) compensando.value = null } })
const origenes = computed(() => (resp.value?.presupuestos ?? []).filter((p) => p.id !== compensando.value?.id && p.disponible_centavos > 0))
function abrirCompensar(p: Presupuesto) {
  compensando.value = p
  compOrigen.value = origenes.value[0]?.id ?? 0
  compMonto.value = (p.excedido_centavos / 100).toFixed(2).replace('.', ',')
  compError.value = ''
}
async function compensar() {
  if (!compensando.value) return
  compError.value = ''
  let monto: number
  try {
    monto = parseAmount(compMonto.value)
  } catch (e) {
    compError.value = (e as Error).message
    return
  }
  try {
    await $fetch('/api/presupuestos/compensar', { method: 'POST', body: { origen_id: compOrigen.value, destino_id: compensando.value.id, monto_centavos: monto } })
    compensando.value = null
    await refresh()
  } catch (e) {
    compError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo compensar'
  }
}

const barras = computed(() => resp.value?.historial ?? [])
const maxHist = computed(() => Math.max(1, ...barras.value.map((h) => Math.max(h.asignado_centavos, h.gastado_centavos))))
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Presupuestos</h1>
        <p class="mt-1 text-ink-muted">Límites por categoría y alertas en vivo.</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="asignar">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Asignar presupuesto</span>
      </button>
    </div>

    <!-- Selector de mes -->
    <div class="mb-5 flex items-center gap-2">
      <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-border text-ink-muted hover:bg-surface-hover" @click="cambiarMes(-1)">
        <UIcon name="i-material-symbols-chevron-left" class="size-5" />
      </button>
      <span class="min-w-40 text-center text-sm font-semibold text-ink">{{ mesLabel }}</span>
      <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-border text-ink-muted hover:bg-surface-hover" @click="cambiarMes(1)">
        <UIcon name="i-material-symbols-chevron-right" class="size-5" />
      </button>
    </div>

    <template v-if="resp">
      <!-- KPIs -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Asignado</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-ink">{{ resp.kpis.asignado_formateado }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Consumido</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-ink">{{ resp.kpis.consumido_formateado }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Disponible restante</p>
          <p class="mt-1 text-xl font-bold tabular-nums" :class="resp.kpis.disponible_centavos > 0 ? 'text-positive' : 'text-negative'">{{ resp.kpis.disponible_formateado }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-ink-muted">Gasto diario permitido</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-ink">{{ resp.kpis.gasto_diario_permitido_formateado }}</p>
          <p class="text-xs text-ink-faint">{{ resp.dias_restantes }} días restantes</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="my-5 flex flex-wrap gap-2">
        <button
          v-for="f in [{ v: 'todos', t: 'Todos' }, { v: 'en_ritmo', t: 'En ritmo' }, { v: 'alerta', t: 'Alerta >80%' }, { v: 'sobregiro', t: 'Sobregirados' }]"
          :key="f.v"
          type="button"
          class="h-9 rounded-full px-4 text-sm font-medium transition-colors"
          :class="estadoFiltro === f.v ? 'bg-surface-tint text-ink' : 'border border-border text-ink-muted hover:bg-surface-hover'"
          @click="estadoFiltro = f.v as 'todos' | EstadoPresupuesto"
        >
          {{ f.t }}
        </button>
      </div>

      <!-- Cards -->
      <div v-if="lista.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="p in lista" :key="p.id" class="card p-5">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted" :style="{ color: p.categoria.color ?? '#5B6B85' }">
                <UIcon :name="iconoMaterial(p.categoria.icono)" class="size-5" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold text-ink">{{ p.categoria.nombre }}</span>
                <span class="text-xs" :class="ESTADO[p.estado].text">{{ ESTADO[p.estado].label }}</span>
              </span>
            </span>
            <span class="text-sm font-semibold tabular-nums" :class="ESTADO[p.estado].text">{{ p.porcentaje }}%</span>
          </div>
          <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted">
            <span class="block h-full rounded-full" :class="ESTADO[p.estado].bar" :style="{ width: `${barra(p)}%` }" />
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-ink-muted">
            <span class="tabular-nums">{{ p.consumido_formateado }} de {{ p.monto_limite_formateado }}</span>
            <span class="tabular-nums">{{ p.disponible_por_dia_formateado }}/día</span>
          </div>
          <div v-if="p.estado === 'sobregiro'" class="mt-3 flex items-center justify-between rounded-xl bg-[rgb(229_72_77/0.08)] px-3 py-2">
            <span class="text-xs font-semibold text-negative">Excedido {{ p.excedido_formateado }}</span>
            <button type="button" class="text-xs font-semibold text-brand hover:text-brand-600" @click="abrirCompensar(p)">Compensar categoría</button>
          </div>
        </div>
      </div>
      <p v-else class="card py-10 text-center text-sm text-ink-muted">
        {{ estadoFiltro === 'todos' ? 'Aún no asignaste presupuestos este mes.' : 'Ninguna categoría en ese estado.' }}
      </p>

      <!-- Histórico + ZBB -->
      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-2">
          <h2 class="hs-2 mb-4">Histórico de cumplimiento</h2>
          <div class="flex items-end justify-between gap-3">
            <div v-for="h in barras" :key="h.mes" class="flex flex-1 flex-col items-center gap-1">
              <div class="flex h-28 w-full items-end justify-center gap-1">
                <span class="w-3 rounded-t bg-surface-muted" :style="{ height: `${(h.asignado_centavos / maxHist) * 100}%` }" :title="`Asignado`" />
                <span class="w-3 rounded-t" :class="h.porcentaje > 100 ? 'bg-negative' : 'bg-brand'" :style="{ height: `${(h.gastado_centavos / maxHist) * 100}%` }" :title="`Gastado`" />
              </div>
              <span class="text-xs text-ink-faint">{{ h.mes.slice(5) }}</span>
            </div>
          </div>
          <p class="mt-3 text-xs text-ink-faint">Gris: asignado · color: gastado real.</p>
        </div>
        <div class="card p-5">
          <h2 class="hs-2 mb-2">Presupuesto base cero</h2>
          <p class="text-sm text-ink-muted">Todo ingreso se asigna a una categoría: sin asignaciones, el mes está vacío. Los presupuestos solo fijan límites; no crean ni bloquean movimientos.</p>
        </div>
      </div>
    </template>

    <FormPresupuesto v-model:abierto="formAbierto" :fondo-id="fondoActivo?.id ?? 0" :mes="mes" :categorias="categorias" @guardado="refresh" />

    <UModal v-model:open="compAbierto" title="Compensar categoría">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-ink-muted">Mueve límite desde otra categoría hacia «{{ compensando?.categoria.nombre }}» sin cambiar el total asignado.</p>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Desde</span>
            <select v-model.number="compOrigen" class="input-field">
              <option v-for="o in origenes" :key="o.id" :value="o.id">{{ o.categoria.nombre }} (disponible {{ o.disponible_formateado }})</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Monto a mover</span>
            <input v-model="compMonto" type="text" inputmode="decimal" class="input-field">
          </label>
          <p v-if="!origenes.length" class="text-sm text-negative">No hay otra categoría con disponible para compensar.</p>
          <p v-if="compError" class="text-sm text-negative">{{ compError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="compensando = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="!origenes.length" @click="compensar">Compensar</button>
        </div>
      </template>
    </UModal>
  </section>
</template>
