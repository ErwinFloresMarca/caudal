<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta } from '~/types/movimientos'
import type { Meta, AporteMeta } from '~/types/metas'

const props = defineProps<{ abierto: boolean; metaId: number | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; cambio: [] }>()

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const { data, refresh } = await useAsyncData(
  'meta-detalle',
  () => (props.metaId ? request<{ meta: Meta }>(`/api/metas/${props.metaId}`) : Promise.resolve(null)),
  { watch: [() => props.metaId] },
)
const { data: cuentasData } = await useAsyncData(
  'meta-cuentas',
  () => (fondoActivo.value ? request<{ cuentas: Cuenta[] }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const meta = computed(() => data.value?.meta ?? null)
const cuentas = computed(() => cuentasData.value?.cuentas ?? [])
const fechaCorta = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

const aporte = reactive({ monto: '', fecha: new Date().toISOString().slice(0, 10), cuenta_id: 0, nota: '' })
const editando = ref<AporteMeta | null>(null)
const formAbierto = ref(false)
const error = ref('')
function abrirNuevo() {
  editando.value = null
  aporte.monto = ''
  aporte.fecha = new Date().toISOString().slice(0, 10)
  aporte.cuenta_id = 0
  aporte.nota = ''
  error.value = ''
  formAbierto.value = true
}
function abrirEditar(a: AporteMeta) {
  editando.value = a
  aporte.monto = (a.monto_centavos / 100).toFixed(2).replace('.', ',')
  aporte.fecha = a.fecha
  aporte.cuenta_id = a.cuenta_id ?? 0
  aporte.nota = a.nota ?? ''
  error.value = ''
  formAbierto.value = true
}
async function guardar() {
  if (!meta.value) return
  error.value = ''
  let monto: number
  try {
    monto = parseAmount(aporte.monto)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  const body = { monto_centavos: monto, fecha: aporte.fecha, cuenta_id: aporte.cuenta_id || null, nota: aporte.nota || null }
  try {
    if (editando.value) await $fetch(`/api/metas/${meta.value.id}/aportes/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch(`/api/metas/${meta.value.id}/aportes`, { method: 'POST', body })
    formAbierto.value = false
    await refresh()
    emit('cambio')
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo guardar'
  }
}
async function borrarAporte(a: AporteMeta) {
  if (!meta.value) return
  await $fetch(`/api/metas/${meta.value.id}/aportes/${a.id}`, { method: 'DELETE' })
  await refresh()
  emit('cambio')
}
</script>

<template>
  <USlideover v-model:open="abiertoLocal" :title="meta?.nombre ?? 'Meta'">
    <template #body>
      <div v-if="meta" class="flex flex-col gap-4">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink-muted">{{ meta.moneda }} · objetivo {{ meta.monto_objetivo_formateado }}</span>
            <span class="flex items-center gap-1 text-sm font-semibold" :class="meta.progreso.alcanzada ? 'text-positive' : 'text-ink'">
              <UIcon v-if="meta.progreso.alcanzada" name="i-material-symbols-check-circle" class="size-4" />
              {{ meta.progreso.porcentaje }}%
            </span>
          </div>
          <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
            <span class="block h-full rounded-full" :class="meta.progreso.alcanzada ? 'bg-positive' : 'bg-brand'" :style="{ width: `${meta.progreso.porcentaje}%` }" />
          </div>
          <p class="mt-1 text-xs text-ink-faint">{{ meta.progreso.acumulado_formateado }} ahorrado · faltan {{ meta.progreso.restante_formateado }}</p>
        </div>

        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-ink">Historial de aportes</h3>
          <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirNuevo">Aportar</button>
        </div>
        <ul class="divide-y divide-border">
          <li v-for="a in meta.aportes ?? []" :key="a.id" class="group flex items-center justify-between gap-3 py-3">
            <span class="flex flex-col">
              <span class="text-sm font-semibold tabular-nums" :class="a.monto_centavos >= 0 ? 'text-positive' : 'text-negative'">{{ a.monto_formateado }}</span>
              <span class="text-xs text-ink-faint">{{ fechaCorta(a.fecha) }}{{ a.nota ? ` · ${a.nota}` : '' }}</span>
            </span>
            <span class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="abrirEditar(a)">
                <UIcon name="i-material-symbols-edit" class="size-4" />
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="borrarAporte(a)">
                <UIcon name="i-material-symbols-delete" class="size-4" />
              </button>
            </span>
          </li>
          <li v-if="!(meta.aportes ?? []).length" class="py-4 text-center text-sm text-ink-muted">Sin aportes todavía.</li>
        </ul>
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="formAbierto" :title="editando ? 'Editar aporte' : 'Aportar a la meta'">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Monto</span><input v-model="aporte.monto" type="text" inputmode="decimal" placeholder="0,00" class="input-field"></label>
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Fecha</span><input v-model="aporte.fecha" type="date" class="input-field"></label>
        </div>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta (opcional)</span>
          <select v-model.number="aporte.cuenta_id" class="input-field" :disabled="!!editando">
            <option :value="0">Sin cuenta</option>
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
          <span class="text-xs text-ink-faint">
            {{ editando
              ? 'La cuenta no se puede cambiar: borrá el aporte y creálo de nuevo.'
              : 'Si elegís una cuenta, el monto se descuenta de ella. Sin cuenta, solo se registra el avance.' }}
          </span>
        </label>
        <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Nota</span><input v-model="aporte.nota" type="text" placeholder="Opcional" class="input-field"></label>
        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="formAbierto = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" @click="guardar">{{ editando ? 'Guardar' : 'Aportar' }}</button>
      </div>
    </template>
  </UModal>
</template>
