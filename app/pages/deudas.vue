<script setup lang="ts">
import { formatMoney } from '#shared/money'
import type { Deuda } from '~/types/deudas'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const { data, refresh } = await useAsyncData(
  'deudas',
  () => (fondoActivo.value ? request<{ deudas: Deuda[] }>('/api/deudas') : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const deudas = computed(() => data.value?.deudas ?? [])

const resumen = computed(() => {
  const map: Record<string, { pagar: number; cobrar: number }> = {}
  for (const d of deudas.value) {
    const m = d.moneda
    if (!map[m]) map[m] = { pagar: 0, cobrar: 0 }
    if (d.direccion === 'por_pagar') map[m]!.pagar += d.saldo_pendiente_centavos
    else map[m]!.cobrar += d.saldo_pendiente_centavos
  }
  return Object.entries(map)
})
const fechaCorta = (f: string | null) => (f ? new Date(`${f}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—')

const formAbierto = ref(false)
const enEdicion = ref<Deuda | null>(null)
function nueva() {
  enEdicion.value = null
  formAbierto.value = true
}
function editar(d: Deuda) {
  enEdicion.value = d
  formAbierto.value = true
}

const detalleAbierto = ref(false)
const detalleId = ref<number | null>(null)
function verDetalle(d: Deuda) {
  detalleId.value = d.id
  detalleAbierto.value = true
}

const porBorrar = ref<Deuda | null>(null)
const borrarAbierto = computed({ get: () => !!porBorrar.value, set: (v: boolean) => { if (!v) porBorrar.value = null } })
async function confirmarBorrar() {
  if (!porBorrar.value) return
  await $fetch(`/api/deudas/${porBorrar.value.id}`, { method: 'DELETE' })
  porBorrar.value = null
  await refresh()
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Deudas y MSI</h1>
        <p class="mt-1 text-ink-muted">Lo que debes y lo que te deben.</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="nueva">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Nueva deuda</span>
      </button>
    </div>

    <!-- Resumen -->
    <div v-if="resumen.length" class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="[moneda, r] in resumen" :key="moneda" class="card p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">{{ moneda }}</p>
        <div class="mt-2 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs text-ink-muted">Por pagar</p>
            <p class="text-lg font-bold tabular-nums text-negative">{{ formatMoney({ centavos: r.pagar, moneda: moneda as 'BOB' | 'USD' }) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-ink-muted">Por cobrar</p>
            <p class="text-lg font-bold tabular-nums text-positive">{{ formatMoney({ centavos: r.cobrar, moneda: moneda as 'BOB' | 'USD' }) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista -->
    <div class="card divide-y divide-border p-2">
      <div v-for="d in deudas" :key="d.id" class="group flex items-center justify-between gap-3 px-3 py-3">
        <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="verDetalle(d)">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted" :class="d.direccion === 'por_pagar' ? 'text-negative' : 'text-positive'">
            <UIcon name="i-material-symbols-handshake" class="size-5" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-medium text-ink">{{ d.contraparte }}</span>
            <span class="truncate text-xs text-ink-faint">
              {{ d.direccion === 'por_pagar' ? 'En contra' : 'A favor' }}{{ d.concepto ? ` · ${d.concepto}` : '' }} · {{ d.progreso.pagadas }}/{{ d.progreso.total }}
            </span>
          </span>
        </button>
        <span class="flex items-center gap-3">
          <span class="hidden text-right sm:block">
            <span class="block whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{{ d.saldo_pendiente_formateado }}</span>
            <span class="block text-xs text-ink-faint">Próx. {{ fechaCorta(d.proxima_cuota) }}</span>
          </span>
          <span v-if="d.estado === 'saldada'" class="badge-plus">Saldada</span>
          <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="editar(d)">
              <UIcon name="i-material-symbols-edit" class="size-4" />
            </button>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="porBorrar = d">
              <UIcon name="i-material-symbols-delete" class="size-4" />
            </button>
          </span>
        </span>
      </div>
      <p v-if="!deudas.length" class="py-10 text-center text-sm text-ink-muted">Aún no hay deudas ni compras a cuotas.</p>
    </div>

    <FormDeuda v-model:abierto="formAbierto" :deuda="enEdicion" @guardado="refresh" />
    <DetalleDeuda v-model:abierto="detalleAbierto" :deuda-id="detalleId" @cambio="refresh" />

    <UModal v-model:open="borrarAbierto" title="Borrar deuda">
      <template #body>
        <p class="text-sm text-ink-muted">¿Borrar la deuda con «{{ porBorrar?.contraparte }}» y todas sus cuotas?</p>
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
