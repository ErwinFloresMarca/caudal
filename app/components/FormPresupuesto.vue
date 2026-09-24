<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Categoria } from '~/types/movimientos'

const props = defineProps<{ abierto: boolean; fondoId: number; mes: string; categorias: Categoria[] }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const gastos = computed(() => props.categorias.filter((c) => c.tipo === 'gasto'))
const form = reactive({ categoria_id: 0, mes: '', monto: '' })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    form.categoria_id = gastos.value[0]?.id ?? 0
    form.mes = props.mes
    form.monto = ''
  },
)

async function guardar() {
  error.value = ''
  if (!form.categoria_id) {
    error.value = 'Elige una categoría de gasto'
    return
  }
  let monto: number
  try {
    monto = parseAmount(form.monto)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  guardando.value = true
  try {
    await $fetch('/api/presupuestos', { method: 'POST', body: { categoria_id: form.categoria_id, mes: form.mes, monto_limite_centavos: monto } })
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
  <USlideover v-model:open="abiertoLocal" title="Asignar presupuesto">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Categoría (gasto)</span>
          <select v-model.number="form.categoria_id" class="input-field">
            <option v-for="c in gastos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Mes</span>
          <input v-model="form.mes" type="month" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Límite mensual</span>
          <input v-model="form.monto" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
        </label>
        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : 'Asignar' }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
