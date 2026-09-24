<script setup lang="ts">
import type { Cuenta } from '~/types/movimientos'
import type { FondoEditable } from '~/types/fondos'
import type { Transferencia, Aporte } from '~/types/transferencias'

const { fondoActivo, fondos } = useFondoActivo()
const request = useRequestFetch()

const tab = ref<'cuentas' | 'fondos'>('cuentas')

const { data: cuentasData } = await useAsyncData(
  'transf-cuentas',
  () => (fondoActivo.value ? request<{ cuentas: Cuenta[] }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: cuentasTodos } = await useAsyncData(
  'transf-cuentas-todos',
  async () => {
    const map: Record<number, Cuenta[]> = {}
    await Promise.all(
      fondos.value.map(async (f) => {
        const r = await request<{ cuentas: Cuenta[] }>(`/api/fondos/${f.id}/cuentas`)
        map[f.id] = r.cuentas
      }),
    )
    return map
  },
  { watch: [fondos] },
)
const { data: tasaData } = await useAsyncData('transf-tasa', () => request<{ actual: { valor: number } | null }>('/api/ajustes/tasa'))
const { data: transfData, refresh: refreshTransf } = await useAsyncData('transf-list', () => request<{ transferencias: Transferencia[] }>('/api/transferencias'), { watch: [fondoActivo] })
const { data: aportesData, refresh: refreshAportes } = await useAsyncData('aportes-list', () => request<{ aportes: Aporte[] }>('/api/aportes'), { watch: [fondoActivo] })

const cuentas = computed(() => cuentasData.value?.cuentas ?? [])
const porFondo = computed(() => cuentasTodos.value ?? {})
const tasaSugerida = computed(() => tasaData.value?.actual?.valor ?? null)
const transferencias = computed(() => transfData.value?.transferencias ?? [])
const aportes = computed(() => aportesData.value?.aportes ?? [])
const fondosEditables = computed<FondoEditable[]>(() => fondos.value as unknown as FondoEditable[])

const cuentaNombre = (fondoId: number, cuentaId: number) => (porFondo.value[fondoId] ?? []).find((c) => c.id === cuentaId)?.nombre ?? '—'
const fondoNombre = (id?: number) => (id == null ? '—' : (fondos.value.find((f) => f.id === id)?.nombre ?? '—'))
const fechaCorta = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

// Transferencias
const transfAbierta = ref(false)
const transfEdicion = ref<Transferencia | null>(null)
function nuevaTransf() {
  transfEdicion.value = null
  transfAbierta.value = true
}
function editarTransf(t: Transferencia) {
  transfEdicion.value = t
  transfAbierta.value = true
}
const transfPorBorrar = ref<Transferencia | null>(null)
const borrarTransfAbierto = computed({ get: () => !!transfPorBorrar.value, set: (v: boolean) => { if (!v) transfPorBorrar.value = null } })
async function confirmarBorrarTransf() {
  if (!transfPorBorrar.value) return
  await $fetch(`/api/transferencias/${transfPorBorrar.value.id}`, { method: 'DELETE' })
  transfPorBorrar.value = null
  await refreshTransf()
}

// Aportes
const aporteAbierto = ref(false)
const aporteEdicion = ref<Aporte | null>(null)
function nuevoAporte() {
  aporteEdicion.value = null
  aporteAbierto.value = true
}
function editarAporte(a: Aporte) {
  aporteEdicion.value = a
  aporteAbierto.value = true
}
const aportePorBorrar = ref<Aporte | null>(null)
const borrarAporteAbierto = computed({ get: () => !!aportePorBorrar.value, set: (v: boolean) => { if (!v) aportePorBorrar.value = null } })
async function confirmarBorrarAporte() {
  if (!aportePorBorrar.value) return
  await $fetch(`/api/aportes/${aportePorBorrar.value.grupo_id}`, { method: 'DELETE' })
  aportePorBorrar.value = null
  await refreshAportes()
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Transferencias</h1>
        <p class="mt-1 text-ink-muted">Mueve dinero entre cuentas o entre fondos.</p>
      </div>
      <button v-if="tab === 'cuentas'" type="button" class="btn-primary h-11 px-5 text-sm" @click="nuevaTransf">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Nueva transferencia</span>
      </button>
      <button v-else type="button" class="btn-primary h-11 px-5 text-sm" @click="nuevoAporte">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Nuevo aporte</span>
      </button>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-2">
      <button
        type="button"
        class="h-9 rounded-full px-4 text-sm font-medium transition-colors"
        :class="tab === 'cuentas' ? 'bg-surface-tint text-ink' : 'border border-border text-ink-muted hover:bg-surface-hover'"
        @click="tab = 'cuentas'"
      >
        Entre cuentas
      </button>
      <button
        type="button"
        class="h-9 rounded-full px-4 text-sm font-medium transition-colors"
        :class="tab === 'fondos' ? 'bg-surface-tint text-ink' : 'border border-border text-ink-muted hover:bg-surface-hover'"
        @click="tab = 'fondos'"
      >
        Entre fondos
      </button>
    </div>

    <!-- Entre cuentas -->
    <template v-if="tab === 'cuentas'">
      <p class="mb-3 rounded-xl bg-surface-muted px-4 py-2 text-xs text-ink-muted">Las transferencias no afectan el resultado del período.</p>
      <div class="card divide-y divide-border p-2">
        <div v-for="t in transferencias" :key="t.id" class="group flex items-center justify-between gap-3 px-3 py-3">
          <span class="flex min-w-0 items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted text-brand">
              <UIcon name="i-material-symbols-sync-alt" class="size-5" />
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-medium text-ink">
                {{ cuentaNombre(fondoActivo?.id ?? 0, t.cuenta_origen_id) }} → {{ cuentaNombre(fondoActivo?.id ?? 0, t.cuenta_destino_id) }}
              </span>
              <span class="text-xs text-ink-faint">{{ fechaCorta(t.fecha) }}{{ t.nota ? ` · ${t.nota}` : '' }}</span>
            </span>
          </span>
          <span class="flex items-center gap-2">
            <span class="whitespace-nowrap text-right">
              <span class="block text-sm font-semibold tabular-nums text-ink">{{ t.monto_origen_formateado }}</span>
              <span v-if="t.moneda_origen !== t.moneda_destino" class="block text-xs text-ink-faint tabular-nums">→ {{ t.monto_destino_formateado }}</span>
            </span>
            <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="editarTransf(t)">
                <UIcon name="i-material-symbols-edit" class="size-4" />
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="transfPorBorrar = t">
                <UIcon name="i-material-symbols-delete" class="size-4" />
              </button>
            </span>
          </span>
        </div>
        <p v-if="!transferencias.length" class="py-10 text-center text-sm text-ink-muted">Aún no hay transferencias.</p>
      </div>
    </template>

    <!-- Entre fondos -->
    <template v-else>
      <p class="mb-3 rounded-xl bg-surface-muted px-4 py-2 text-xs text-ink-muted">
        Un aporte es un ingreso en el fondo destino y un gasto en el origen. Sin origen = aporte externo.
      </p>
      <div class="card divide-y divide-border p-2">
        <div v-for="a in aportes" :key="a.grupo_id" class="group flex items-center justify-between gap-3 px-3 py-3">
          <span class="flex min-w-0 items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted text-positive">
              <UIcon name="i-material-symbols-handshake" class="size-5" />
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-medium text-ink">
                {{ a.origen ? `${fondoNombre(a.origen.fondo_id)} → ${fondoNombre(a.destino?.fondo_id)}` : `Aporte externo → ${fondoNombre(a.destino?.fondo_id)}` }}
              </span>
              <span class="text-xs text-ink-faint">{{ a.fecha ? fechaCorta(a.fecha) : '' }}{{ a.nota ? ` · ${a.nota}` : '' }}</span>
            </span>
          </span>
          <span class="flex items-center gap-2">
            <span class="whitespace-nowrap text-sm font-semibold tabular-nums text-positive">{{ a.destino?.monto_formateado }}</span>
            <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="editarAporte(a)">
                <UIcon name="i-material-symbols-edit" class="size-4" />
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="aportePorBorrar = a">
                <UIcon name="i-material-symbols-delete" class="size-4" />
              </button>
            </span>
          </span>
        </div>
        <p v-if="!aportes.length" class="py-10 text-center text-sm text-ink-muted">Aún no hay aportes ni retiros entre fondos.</p>
      </div>
    </template>

    <FormTransferencia v-model:abierto="transfAbierta" :transferencia="transfEdicion" :cuentas="cuentas" :tasa-sugerida="tasaSugerida" @guardado="refreshTransf" />
    <FormAporte v-model:abierto="aporteAbierto" :aporte="aporteEdicion" :fondos="fondosEditables" :cuentas-por-fondo="porFondo" :tasa-sugerida="tasaSugerida" @guardado="refreshAportes" />

    <UModal v-model:open="borrarTransfAbierto" title="Borrar transferencia">
      <template #body>
        <p class="text-sm text-ink-muted">¿Borrar esta transferencia? Se restauran los saldos de ambas cuentas.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="transfPorBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" @click="confirmarBorrarTransf">Borrar</button>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="borrarAporteAbierto" title="Borrar aporte/retiro">
      <template #body>
        <p class="text-sm text-ink-muted">¿Borrar esta operación? Se eliminan ambas patas y se restauran los fondos.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="aportePorBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" @click="confirmarBorrarAporte">Borrar</button>
        </div>
      </template>
    </UModal>
  </section>
</template>
