<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta, Categoria, MovimientoEditable } from '~/types/movimientos'

const props = defineProps<{
  abierto: boolean
  movimiento: MovimientoEditable | null
  cuentas: Cuenta[]
  categorias: Categoria[]
  tasaSugerida: number | null
}>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const form = reactive({
  cuenta_id: 0,
  tipo: 'gasto' as 'ingreso' | 'gasto',
  categoria_id: 0,
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  tasa_ref: '',
  nota: '',
})
const error = ref('')
const guardando = ref(false)

const cuentaSel = computed(() => props.cuentas.find((c) => c.id === form.cuenta_id) ?? null)
const esUsd = computed(() => cuentaSel.value?.moneda === 'USD')
const categoriasFiltradas = computed(() => props.categorias.filter((c) => c.tipo === form.tipo))

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const m = props.movimiento
    if (m) {
      form.cuenta_id = m.cuenta_id
      form.tipo = m.tipo as 'ingreso' | 'gasto'
      form.categoria_id = m.categoria?.id ?? 0
      form.monto = (m.monto_centavos / 100).toFixed(2).replace('.', ',')
      form.fecha = m.fecha
      form.tasa_ref = m.tasa_ref ? String(m.tasa_ref) : ''
      form.nota = m.nota ?? ''
    } else {
      form.cuenta_id = props.cuentas[0]?.id ?? 0
      form.tipo = 'gasto'
      form.categoria_id = 0
      form.monto = ''
      form.fecha = new Date().toISOString().slice(0, 10)
      form.tasa_ref = props.tasaSugerida ? String(props.tasaSugerida) : ''
      form.nota = ''
    }
  },
)

// Al cambiar de cuenta, si pasa a USD y no hay tasa, sugiere la última.
watch(
  () => form.cuenta_id,
  () => {
    if (esUsd.value && !form.tasa_ref && props.tasaSugerida) form.tasa_ref = String(props.tasaSugerida)
  },
)
// Al cambiar el tipo, la categoría previa puede no aplicar.
watch(
  () => form.tipo,
  () => {
    if (!categoriasFiltradas.value.some((c) => c.id === form.categoria_id)) form.categoria_id = 0
  },
)

async function guardar() {
  error.value = ''
  if (!form.cuenta_id) {
    error.value = 'Elige una cuenta'
    return
  }
  let monto: number
  try {
    monto = parseAmount(form.monto)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  if (esUsd.value) {
    const tasa = Number(form.tasa_ref.replace(',', '.'))
    if (!Number.isFinite(tasa) || tasa <= 0) {
      error.value = 'La tasa es obligatoria para cuentas en dólares'
      return
    }
  }
  guardando.value = true
  try {
    const body: Record<string, unknown> = {
      cuenta_id: form.cuenta_id,
      categoria_id: form.categoria_id || null,
      tipo: form.tipo,
      monto_centavos: monto,
      fecha: form.fecha,
      nota: form.nota || null,
    }
    if (esUsd.value) body.tasa_ref = Number(form.tasa_ref.replace(',', '.'))
    if (props.movimiento) {
      await $fetch(`/api/movimientos/${props.movimiento.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/movimientos', { method: 'POST', body })
    }
    emit('guardado')
    abiertoLocal.value = false
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo guardar'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="abiertoLocal" :title="movimiento ? 'Editar movimiento' : 'Registrar movimiento'">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta</span>
          <select v-model.number="form.cuenta_id" class="input-field" :disabled="!!movimiento">
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
          <span v-if="movimiento" class="text-xs text-ink-faint">No se puede cambiar la cuenta de un movimiento.</span>
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tipo</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="h-11 rounded-xl border text-sm font-semibold transition-colors"
              :class="form.tipo === 'ingreso' ? 'border-positive bg-[rgb(15_164_127/0.10)] text-positive' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.tipo = 'ingreso'"
            >
              Ingreso
            </button>
            <button
              type="button"
              class="h-11 rounded-xl border text-sm font-semibold transition-colors"
              :class="form.tipo === 'gasto' ? 'border-negative bg-[rgb(229_72_77/0.10)] text-negative' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.tipo = 'gasto'"
            >
              Gasto
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Monto</span>
          <input v-model="form.monto" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Categoría</span>
          <select v-model.number="form.categoria_id" class="input-field">
            <option :value="0">Sin categoría</option>
            <option v-for="c in categoriasFiltradas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Fecha</span>
          <input v-model="form.fecha" type="date" class="input-field">
        </label>

        <label v-if="esUsd" class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tasa (BOB por USD)</span>
          <input v-model="form.tasa_ref" type="text" inputmode="decimal" placeholder="6,96" class="input-field">
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Nota</span>
          <input v-model="form.nota" type="text" placeholder="Opcional" class="input-field">
        </label>

        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : (movimiento ? 'Guardar' : 'Registrar') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
