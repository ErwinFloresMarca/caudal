<script setup lang="ts">
import type { Cuenta, Categoria } from '~/types/movimientos'
import type { Recurrente } from '~/types/recurrentes'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const { data, refresh } = await useAsyncData(
  'recurrentes',
  () => (fondoActivo.value ? request<{ recurrentes: Recurrente[]; pendientes: Recurrente[] }>('/api/recurrentes') : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: cuentasData } = await useAsyncData(
  'rec-cuentas',
  () => (fondoActivo.value ? request<{ cuentas: Cuenta[] }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: catsData } = await useAsyncData(
  'rec-cats',
  () => (fondoActivo.value ? request<{ categorias: Categoria[] }>(`/api/fondos/${fondoActivo.value.id}/categorias`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: tasaData } = await useAsyncData('rec-tasa', () => request<{ actual: { valor: number } | null }>('/api/ajustes/tasa'))

const recurrentes = computed(() => data.value?.recurrentes ?? [])
const pendientes = computed(() => data.value?.pendientes ?? [])
const cuentas = computed(() => cuentasData.value?.cuentas ?? [])
const categorias = computed(() => catsData.value?.categorias ?? [])
const tasaSugerida = computed(() => tasaData.value?.actual?.valor ?? null)

const cuentaNombre = (id: number) => cuentas.value.find((c) => c.id === id)?.nombre ?? '—'
const esUsd = (id: number) => cuentas.value.find((c) => c.id === id)?.moneda === 'USD'
const cadenciaLabel = (r: Recurrente) => `${r.cadencia.frecuencia}${r.cadencia.dia ? ` · día ${r.cadencia.dia}` : ''}`
const fechaCorta = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

// Alta/edición
const formAbierto = ref(false)
const enEdicion = ref<Recurrente | null>(null)
function nuevo() {
  enEdicion.value = null
  formAbierto.value = true
}
function editar(r: Recurrente) {
  enEdicion.value = r
  formAbierto.value = true
}
async function toggleActivo(r: Recurrente) {
  await $fetch(`/api/recurrentes/${r.id}`, {
    method: 'PATCH',
    body: { cuenta_id: r.cuenta_id, categoria_id: r.categoria_id, tipo: r.tipo, monto_centavos: r.monto_centavos, cadencia: r.cadencia, proxima_fecha: r.proxima_fecha, nota: r.nota, activo: !r.activo },
  })
  await refresh()
}

// Confirmar
const confirmando = ref<Recurrente | null>(null)
const confirmFecha = ref('')
const confirmTasa = ref('')
const confirmAbierto = computed({ get: () => !!confirmando.value, set: (v: boolean) => { if (!v) confirmando.value = null } })
const confirmError = ref('')
function abrirConfirmar(r: Recurrente) {
  confirmando.value = r
  confirmFecha.value = r.proxima_fecha
  confirmTasa.value = r.moneda === 'USD' && tasaSugerida.value ? String(tasaSugerida.value) : ''
  confirmError.value = ''
}
async function confirmar() {
  if (!confirmando.value) return
  confirmError.value = ''
  const body: Record<string, unknown> = { fecha: confirmFecha.value }
  if (esUsd(confirmando.value.cuenta_id)) {
    const tasa = Number(confirmTasa.value.replace(',', '.'))
    if (!Number.isFinite(tasa) || tasa <= 0) {
      confirmError.value = 'Indica la tasa para esta cuenta en dólares'
      return
    }
    body.tasa_ref = tasa
  }
  try {
    await $fetch(`/api/recurrentes/${confirmando.value.id}/confirmar`, { method: 'POST', body })
    confirmando.value = null
    await refresh()
  } catch (e) {
    confirmError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo confirmar'
  }
}
async function saltar(r: Recurrente) {
  await $fetch(`/api/recurrentes/${r.id}/saltar`, { method: 'POST' })
  await refresh()
}

// Borrar
const porBorrar = ref<Recurrente | null>(null)
const borrarAbierto = computed({ get: () => !!porBorrar.value, set: (v: boolean) => { if (!v) porBorrar.value = null } })
async function confirmarBorrar() {
  if (!porBorrar.value) return
  await $fetch(`/api/recurrentes/${porBorrar.value.id}`, { method: 'DELETE' })
  porBorrar.value = null
  await refresh()
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Recurrentes</h1>
        <p class="mt-1 text-ink-muted">Sueldos, alquiler y suscripciones que se repiten.</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="nuevo">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Nuevo recurrente</span>
      </button>
    </div>

    <!-- Pendientes por confirmar -->
    <template v-if="pendientes.length">
      <h2 class="hs-2 mb-3">Pendientes por confirmar</h2>
      <div class="card mb-8 divide-y divide-border border-warning p-2">
        <div v-for="r in pendientes" :key="r.id" class="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <span class="flex min-w-0 items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(232_161_58/0.12)] dark:bg-[rgb(251_191_36/0.18)] text-[#C27A18] dark:text-[#FBBF24]">
              <UIcon name="i-material-symbols-event-repeat" class="size-5" />
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-medium text-ink">{{ r.nota || r.categoria?.nombre || 'Recurrente' }}</span>
              <span class="text-xs text-ink-faint">Vencía {{ fechaCorta(r.proxima_fecha) }} · {{ cuentaNombre(r.cuenta_id) }}</span>
            </span>
          </span>
          <span class="flex items-center gap-2">
            <span class="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{{ r.monto_formateado }}</span>
            <button type="button" class="btn-primary h-9 px-3 text-xs" @click="abrirConfirmar(r)">Confirmar</button>
            <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="saltar(r)">Saltar</button>
          </span>
        </div>
      </div>
    </template>

    <!-- Plantillas -->
    <h2 class="hs-2 mb-3">Plantillas</h2>
    <div class="card divide-y divide-border p-2">
      <div v-for="r in recurrentes" :key="r.id" class="group flex items-center justify-between gap-3 px-3 py-3">
        <span class="flex min-w-0 items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted" :style="{ color: r.categoria?.color ?? 'var(--color-ink-muted)' }">
            <UIcon :name="iconoMaterial(r.categoria?.icono)" class="size-5" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-medium" :class="r.activo ? 'text-ink' : 'text-ink-faint'">{{ r.nota || r.categoria?.nombre || 'Recurrente' }}</span>
            <span class="truncate text-xs text-ink-faint">{{ r.categoria?.nombre ?? 'Sin categoría' }} · {{ cuentaNombre(r.cuenta_id) }} · {{ cadenciaLabel(r) }}</span>
          </span>
        </span>
        <span class="flex items-center gap-2">
          <span class="hidden text-right sm:block">
            <span class="block whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{{ r.monto_formateado }}</span>
            <span class="block text-xs text-ink-faint">Próx. {{ fechaCorta(r.proxima_fecha) }}</span>
          </span>
          <span v-if="!r.activo" class="badge-warning">Pausado</span>
          <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" :title="r.activo ? 'Pausar' : 'Activar'" @click="toggleActivo(r)">
              <UIcon :name="r.activo ? 'i-material-symbols-pause' : 'i-material-symbols-play-arrow'" class="size-4" />
            </button>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="editar(r)">
              <UIcon name="i-material-symbols-edit" class="size-4" />
            </button>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="porBorrar = r">
              <UIcon name="i-material-symbols-delete" class="size-4" />
            </button>
          </span>
        </span>
      </div>
      <p v-if="!recurrentes.length" class="py-10 text-center text-sm text-ink-muted">Aún no hay recurrentes. Crea el primero.</p>
    </div>

    <FormRecurrente v-model:abierto="formAbierto" :recurrente="enEdicion" :cuentas="cuentas" :categorias="categorias" @guardado="refresh" />

    <!-- Confirmar -->
    <UModal v-model:open="confirmAbierto" title="Confirmar recurrente">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-ink-muted">
            Se creará el movimiento «{{ confirmando?.nota || confirmando?.categoria?.nombre }}» por {{ confirmando?.monto_formateado }} y se avanzará la fecha.
          </p>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Fecha</span>
            <input v-model="confirmFecha" type="date" class="input-field">
          </label>
          <label v-if="confirmando && esUsd(confirmando.cuenta_id)" class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Tasa (BOB por USD)</span>
            <input v-model="confirmTasa" type="text" inputmode="decimal" placeholder="6,96" class="input-field">
          </label>
          <p v-if="confirmError" class="text-sm text-negative">{{ confirmError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="confirmando = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 px-5 text-sm" @click="confirmar">Confirmar</button>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="borrarAbierto" title="Borrar recurrente">
      <template #body>
        <p class="text-sm text-ink-muted">¿Borrar «{{ porBorrar?.nota || porBorrar?.categoria?.nombre }}»? No afecta a los movimientos ya creados.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="porBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" @click="confirmarBorrar">Borrar</button>
        </div>
      </template>
    </UModal>
  </section>
</template>
