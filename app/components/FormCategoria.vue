<script setup lang="ts">
import type { CategoriaEditable } from '~/types/fondos'

const props = defineProps<{ abierto: boolean; categoria: CategoriaEditable | null; fondoId: number }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const COLORES = ['#0E6FFF', '#0FA47F', '#E5484D', '#E8A13A', '#5B6B85', '#8E9BAE']
const ICONOS = [
  'restaurant', 'directions_bus', 'receipt_long', 'ecg_heart', 'sports_esports', 'home',
  'shopping_bag', 'category', 'payments', 'storefront', 'savings', 'construction',
  'inventory_2', 'local_shipping', 'campaign', 'build', 'handyman', 'request_quote',
]

const form = reactive({ nombre: '', tipo: 'gasto', icono: ICONOS[0]!, color: COLORES[0]!, clasificacion: '' as '' | 'necesidad' | 'deseo' | 'ahorro', activa: true })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const c = props.categoria
    if (c) {
      form.nombre = c.nombre
      form.tipo = c.tipo
      form.icono = c.icono ?? ICONOS[0]!
      form.color = c.color ?? COLORES[0]!
      form.clasificacion = c.clasificacion ?? ''
      form.activa = c.activa
    } else {
      form.nombre = ''
      form.tipo = 'gasto'
      form.icono = ICONOS[0]!
      form.color = COLORES[0]!
      form.clasificacion = ''
      form.activa = true
    }
  },
)

async function guardar() {
  error.value = ''
  if (!form.nombre.trim()) {
    error.value = 'El nombre es obligatorio'
    return
  }
  guardando.value = true
  try {
    if (props.categoria) {
      if (!form.activa) {
        await $fetch(`/api/fondos/${props.fondoId}/categorias/${props.categoria.id}`, { method: 'PATCH', body: { activa: false } })
      } else {
        await $fetch(`/api/fondos/${props.fondoId}/categorias/${props.categoria.id}`, {
          method: 'PATCH',
          body: { nombre: form.nombre, tipo: form.tipo, icono: form.icono, color: form.color, clasificacion: form.clasificacion || null, activa: true },
        })
      }
    } else {
      await $fetch(`/api/fondos/${props.fondoId}/categorias`, {
        method: 'POST',
        body: { nombre: form.nombre, tipo: form.tipo, icono: form.icono, color: form.color, clasificacion: form.clasificacion || null },
      })
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
  <USlideover v-model:open="abiertoLocal" :title="categoria ? 'Editar categoría' : 'Nueva categoría'">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tipo</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in [{ v: 'gasto', t: 'Gasto' }, { v: 'ingreso', t: 'Ingreso' }]"
              :key="t.v"
              type="button"
              class="h-11 rounded-xl border text-sm font-semibold transition-colors"
              :class="form.tipo === t.v ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.tipo = t.v"
            >
              {{ t.t }}
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Nombre</span>
          <input v-model="form.nombre" type="text" placeholder="Ej. Comida" class="input-field">
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Color</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="col in COLORES"
              :key="col"
              type="button"
              class="h-9 w-9 rounded-full border-2 transition-transform"
              :class="form.color === col ? 'border-ink scale-110' : 'border-transparent'"
              :style="{ background: col }"
              :aria-label="col"
              @click="form.color = col"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Icono</span>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="ic in ICONOS"
              :key="ic"
              type="button"
              class="grid h-10 place-items-center rounded-xl border transition-colors"
              :class="form.icono === ic ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.icono = ic"
            >
              <UIcon :name="iconoMaterial(ic)" class="size-5" />
            </button>
          </div>
        </div>

        <label v-if="form.tipo === 'gasto'" class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Clasificación 50/30/20</span>
          <select v-model="form.clasificacion" class="input-field">
            <option value="">Sin clasificar</option>
            <option value="necesidad">Necesidad</option>
            <option value="deseo">Deseo</option>
            <option value="ahorro">Ahorro</option>
          </select>
          <span class="text-xs text-ink-faint">Solo se usa para el widget de distribución del ingreso.</span>
        </label>

        <label v-if="categoria" class="flex items-center justify-between gap-3">
          <span class="text-sm text-ink-muted">Categoría activa</span>
          <input v-model="form.activa" type="checkbox">
        </label>

        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : (categoria ? 'Guardar' : 'Crear categoría') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
