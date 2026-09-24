<script setup lang="ts">
import type { Meta } from '~/types/metas'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const { data, refresh } = await useAsyncData(
  'metas',
  () => (fondoActivo.value ? request<{ metas: Meta[] }>('/api/metas') : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const metas = computed(() => data.value?.metas ?? [])

const formAbierto = ref(false)
const enEdicion = ref<Meta | null>(null)
function nueva() {
  enEdicion.value = null
  formAbierto.value = true
}
function editar(m: Meta) {
  enEdicion.value = m
  formAbierto.value = true
}

const detalleAbierto = ref(false)
const detalleId = ref<number | null>(null)
function verDetalle(m: Meta) {
  detalleId.value = m.id
  detalleAbierto.value = true
}

const porBorrar = ref<Meta | null>(null)
const borrarAbierto = computed({ get: () => !!porBorrar.value, set: (v: boolean) => { if (!v) porBorrar.value = null } })
async function confirmarBorrar() {
  if (!porBorrar.value) return
  await $fetch(`/api/metas/${porBorrar.value.id}`, { method: 'DELETE' })
  porBorrar.value = null
  await refresh()
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Metas de ahorro</h1>
        <p class="mt-1 text-ink-muted">Ahorra para algo concreto y sigue el avance.</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="nueva">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Nueva meta</span>
      </button>
    </div>

    <div v-if="metas.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="m in metas" :key="m.id" class="card group p-5">
        <div class="flex items-start justify-between">
          <button type="button" class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-brand" @click="verDetalle(m)">
            <UIcon name="i-material-symbols-savings" class="size-5" />
          </button>
          <span v-if="m.progreso.alcanzada" class="badge-plus">Alcanzada</span>
          <span class="flex opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="editar(m)">
              <UIcon name="i-material-symbols-edit" class="size-4" />
            </button>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="porBorrar = m">
              <UIcon name="i-material-symbols-delete" class="size-4" />
            </button>
          </span>
        </div>
        <button type="button" class="mt-3 w-full text-left" @click="verDetalle(m)">
          <p class="truncate text-sm font-semibold text-ink">{{ m.nombre }}</p>
          <p class="text-xs text-ink-faint">{{ m.moneda }} · {{ m.monto_objetivo_formateado }}</p>
        </button>
        <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted">
          <span class="block h-full rounded-full" :class="m.progreso.alcanzada ? 'bg-positive' : 'bg-brand'" :style="{ width: `${m.progreso.porcentaje}%` }" />
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-ink-muted">
          <span class="tabular-nums">{{ m.progreso.porcentaje }}% · {{ m.progreso.acumulado_formateado }}</span>
          <span class="tabular-nums">Faltan {{ m.progreso.restante_formateado }}</span>
        </div>
      </div>
    </div>
    <div v-else class="card flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-savings" class="size-6 text-ink-faint" />
      </span>
      <p class="mt-3 text-ink-muted">Aún no tienes metas de ahorro.</p>
      <button type="button" class="btn-primary mt-5" @click="nueva">Crear mi primera meta</button>
    </div>

    <FormMeta v-model:abierto="formAbierto" :meta="enEdicion" @guardado="refresh" />
    <DetalleMeta v-model:abierto="detalleAbierto" :meta-id="detalleId" @cambio="refresh" />

    <UModal v-model:open="borrarAbierto" title="Borrar meta">
      <template #body><p class="text-sm text-ink-muted">¿Borrar «{{ porBorrar?.nombre }}» y sus aportes?</p></template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="porBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" @click="confirmarBorrar">Borrar</button>
        </div>
      </template>
    </UModal>
  </section>
</template>
