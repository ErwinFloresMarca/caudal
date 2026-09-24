<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta, Categoria } from '~/types/movimientos'
import type { Recurrente } from '~/types/recurrentes'

const props = defineProps<{ abierto: boolean; recurrente: Recurrente | null; cuentas: Cuenta[]; categorias: Categoria[] }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const FRECUENCIAS = [
  { v: 'diaria', t: 'Diaria' },
  { v: 'semanal', t: 'Semanal' },
  { v: 'quincenal', t: 'Quincenal' },
  { v: 'mensual', t: 'Mensual' },
  { v: 'bimestral', t: 'Bimestral' },
  { v: 'trimestral', t: 'Trimestral' },
  { v: 'semestral', t: 'Semestral' },
  { v: 'anual', t: 'Anual' },
]
const CON_DIA = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual']

const form = reactive({ cuenta_id: 0, tipo: 'gasto', categoria_id: 0, monto: '', frecuencia: 'mensual', dia: '', proxima_fecha: new Date().toISOString().slice(0, 10), nota: '', activo: true })
const error = ref('')
const guardando = ref(false)

const categoriasFiltradas = computed(() => props.categorias.filter((c) => c.tipo === form.tipo))
const usaDia = computed(() => CON_DIA.includes(form.frecuencia))

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const r = props.recurrente
    if (r) {
      form.cuenta_id = r.cuenta_id
      form.tipo = r.tipo
      form.categoria_id = r.categoria_id ?? 0
      form.monto = (r.monto_centavos / 100).toFixed(2).replace('.', ',')
      form.frecuencia = r.cadencia.frecuencia
      form.dia = r.cadencia.dia ? String(r.cadencia.dia) : ''
      form.proxima_fecha = r.proxima_fecha
      form.nota = r.nota ?? ''
      form.activo = r.activo
    } else {
      form.cuenta_id = props.cuentas[0]?.id ?? 0
      form.tipo = 'gasto'
      form.categoria_id = 0
      form.monto = ''
      form.frecuencia = 'mensual'
      form.dia = ''
      form.proxima_fecha = new Date().toISOString().slice(0, 10)
      form.nota = ''
      form.activo = true
    }
  },
)
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
  const cadencia: Record<string, unknown> = { frecuencia: form.frecuencia }
  if (usaDia.value && form.dia.trim()) cadencia.dia = Number(form.dia)
  guardando.value = true
  try {
    const body: Record<string, unknown> = {
      cuenta_id: form.cuenta_id,
      categoria_id: form.categoria_id || null,
      tipo: form.tipo,
      monto_centavos: monto,
      cadencia,
      proxima_fecha: form.proxima_fecha,
      nota: form.nota || null,
      activo: form.activo,
    }
    if (props.recurrente) {
      await $fetch(`/api/recurrentes/${props.recurrente.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/recurrentes', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="recurrente ? 'Editar recurrente' : 'Nuevo recurrente'">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta</span>
          <select v-model.number="form.cuenta_id" class="input-field">
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
        </label>
        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tipo</span>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="form.tipo === 'ingreso' ? 'border-positive bg-[rgb(15_164_127/0.10)] text-positive' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="form.tipo = 'ingreso'">Ingreso</button>
            <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="form.tipo === 'gasto' ? 'border-negative bg-[rgb(229_72_77/0.10)] text-negative' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="form.tipo = 'gasto'">Gasto</button>
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
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Cadencia</span>
            <select v-model="form.frecuencia" class="input-field">
              <option v-for="f in FRECUENCIAS" :key="f.v" :value="f.v">{{ f.t }}</option>
            </select>
          </label>
          <label v-if="usaDia" class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Día (1-31)</span>
            <input v-model="form.dia" type="number" min="1" max="31" placeholder="Auto" class="input-field">
          </label>
        </div>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Próxima fecha</span>
          <input v-model="form.proxima_fecha" type="date" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Nota</span>
          <input v-model="form.nota" type="text" placeholder="Opcional" class="input-field">
        </label>
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm text-ink-muted">Activo</span>
          <input v-model="form.activo" type="checkbox">
        </label>
        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : (recurrente ? 'Guardar' : 'Crear') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
