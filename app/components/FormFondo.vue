<script setup lang="ts">
import type { FondoEditable } from '~/types/fondos'

const props = defineProps<{ abierto: boolean; fondo: FondoEditable | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const COLORES = ['#0E6FFF', '#0FA47F', '#E5484D', '#E8A13A', '#5B6B85', '#8E9BAE']
const ICONOS = ['folder_special', 'savings', 'storefront', 'rocket_launch', 'home', 'work', 'palette', 'pets']

const form = reactive({ nombre: '', tipo: 'personal', moneda_base: 'BOB' as 'BOB' | 'USD', color: COLORES[0]!, icono: ICONOS[0]!, activo: true })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const f = props.fondo
    if (f) {
      form.nombre = f.nombre
      form.tipo = f.tipo
      form.moneda_base = f.moneda_base
      form.color = f.color ?? COLORES[0]!
      form.icono = f.icono ?? ICONOS[0]!
      form.activo = f.activo
    } else {
      form.nombre = ''
      form.tipo = 'personal'
      form.moneda_base = 'BOB'
      form.color = COLORES[0]!
      form.icono = ICONOS[0]!
      form.activo = true
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
    const body: Record<string, unknown> = {
      nombre: form.nombre,
      tipo: form.tipo,
      moneda_base: form.moneda_base,
      color: form.color,
      icono: form.icono,
    }
    if (props.fondo) {
      if (!form.activo) {
        await $fetch(`/api/fondos/${props.fondo.id}`, { method: 'PATCH', body: { activo: false } })
      } else {
        await $fetch(`/api/fondos/${props.fondo.id}`, { method: 'PATCH', body: { ...body, activo: true } })
      }
    } else {
      await $fetch('/api/fondos', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="fondo ? 'Editar fondo' : 'Crear fondo'">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tipo</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in [{ v: 'personal', t: 'Personal' }, { v: 'negocio', t: 'Negocio' }]"
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
          <input v-model="form.nombre" type="text" placeholder="Ej. Personal, Impresión 3D" class="input-field">
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Moneda base</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="m in [{ v: 'BOB', t: 'Bolivianos' }, { v: 'USD', t: 'Dólar' }]"
              :key="m.v"
              type="button"
              class="h-11 rounded-xl border text-sm font-semibold transition-colors"
              :class="form.moneda_base === m.v ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.moneda_base = m.v as 'BOB' | 'USD'"
            >
              {{ m.v }} <span class="text-xs font-normal">{{ m.t }}</span>
            </button>
          </div>
        </div>

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
          <div class="flex flex-wrap gap-2">
            <button
              v-for="ic in ICONOS"
              :key="ic"
              type="button"
              class="grid h-10 w-10 place-items-center rounded-xl border transition-colors"
              :class="form.icono === ic ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
              @click="form.icono = ic"
            >
              <UIcon :name="iconoMaterial(ic, 'folder-special')" class="size-5" />
            </button>
          </div>
        </div>

        <label v-if="fondo" class="flex items-center justify-between gap-3">
          <span class="text-sm text-ink-muted">Fondo activo</span>
          <input v-model="form.activo" type="checkbox">
        </label>

        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : (fondo ? 'Guardar' : 'Crear fondo') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
