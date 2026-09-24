<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Meta } from '~/types/metas'

const props = defineProps<{ abierto: boolean; meta: Meta | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const form = reactive({ nombre: '', objetivo: '', moneda: 'BOB' as 'BOB' | 'USD', fecha_objetivo: '' })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const m = props.meta
    if (m) {
      form.nombre = m.nombre
      form.objetivo = (m.monto_objetivo_centavos / 100).toFixed(2).replace('.', ',')
      form.moneda = m.moneda
      form.fecha_objetivo = m.fecha_objetivo ?? ''
    } else {
      form.nombre = ''
      form.objetivo = ''
      form.moneda = 'BOB'
      form.fecha_objetivo = ''
    }
  },
)

async function guardar() {
  error.value = ''
  if (!form.nombre.trim()) {
    error.value = 'El nombre es obligatorio'
    return
  }
  let objetivo: number
  try {
    objetivo = parseAmount(form.objetivo)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  guardando.value = true
  try {
    const body = { nombre: form.nombre, monto_objetivo_centavos: objetivo, moneda: form.moneda, fecha_objetivo: form.fecha_objetivo || null }
    if (props.meta) {
      await $fetch(`/api/metas/${props.meta.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/metas', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="meta ? 'Editar meta' : 'Nueva meta'">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Nombre</span><input v-model="form.nombre" type="text" placeholder="Ej. Impresora nueva" class="input-field"></label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Objetivo</span><input v-model="form.objetivo" type="text" inputmode="decimal" placeholder="0,00" class="input-field"></label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Moneda</span>
            <select v-model="form.moneda" class="input-field"><option value="BOB">BOB</option><option value="USD">USD</option></select>
          </label>
        </div>
        <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Fecha objetivo (opcional)</span><input v-model="form.fecha_objetivo" type="date" class="input-field"></label>
        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">{{ guardando ? 'Guardando…' : (meta ? 'Guardar' : 'Crear meta') }}</button>
      </div>
    </template>
  </USlideover>
</template>
