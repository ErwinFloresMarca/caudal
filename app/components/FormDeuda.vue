<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Deuda } from '~/types/deudas'

const props = defineProps<{ abierto: boolean; deuda: Deuda | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const form = reactive({ contraparte: '', direccion: 'por_pagar', concepto: '', monto: '', moneda: 'BOB' as 'BOB' | 'USD', fecha_inicio: new Date().toISOString().slice(0, 10), num_cuotas: '1', nota: '' })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const d = props.deuda
    if (d) {
      form.contraparte = d.contraparte
      form.direccion = d.direccion
      form.concepto = d.concepto ?? ''
      form.monto = (d.monto_total_centavos / 100).toFixed(2).replace('.', ',')
      form.moneda = d.moneda
      form.fecha_inicio = d.fecha_inicio
      form.num_cuotas = String(d.num_cuotas)
      form.nota = d.nota ?? ''
    } else {
      form.contraparte = ''
      form.direccion = 'por_pagar'
      form.concepto = ''
      form.monto = ''
      form.moneda = 'BOB'
      form.fecha_inicio = new Date().toISOString().slice(0, 10)
      form.num_cuotas = '1'
      form.nota = ''
    }
  },
)

async function guardar() {
  error.value = ''
  if (!form.contraparte.trim()) {
    error.value = 'La contraparte es obligatoria'
    return
  }
  let monto: number
  try {
    monto = parseAmount(form.monto)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  const cuotas = Number(form.num_cuotas)
  if (!Number.isInteger(cuotas) || cuotas < 1) {
    error.value = 'El número de cuotas debe ser 1 o más'
    return
  }
  guardando.value = true
  try {
    const body = {
      contraparte: form.contraparte,
      direccion: form.direccion,
      concepto: form.concepto || null,
      monto_total_centavos: monto,
      moneda: form.moneda,
      fecha_inicio: form.fecha_inicio,
      num_cuotas: cuotas,
      nota: form.nota || null,
    }
    if (props.deuda) {
      await $fetch(`/api/deudas/${props.deuda.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/deudas', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="deuda ? 'Editar deuda' : 'Nueva deuda'">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Dirección</span>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="form.direccion === 'por_pagar' ? 'border-negative bg-[rgb(229_72_77/0.10)] text-negative' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="form.direccion = 'por_pagar'">Por pagar</button>
            <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="form.direccion === 'por_cobrar' ? 'border-positive bg-[rgb(15_164_127/0.10)] text-positive' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="form.direccion = 'por_cobrar'">Por cobrar</button>
          </div>
        </div>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Contraparte</span>
          <input v-model="form.contraparte" type="text" placeholder="Ej. Banco, Pedro" class="input-field">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Concepto</span>
          <input v-model="form.concepto" type="text" placeholder="Opcional" class="input-field">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Monto total</span>
            <input v-model="form.monto" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Moneda</span>
            <select v-model="form.moneda" class="input-field">
              <option value="BOB">BOB</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Fecha inicio</span>
            <input v-model="form.fecha_inicio" type="date" class="input-field">
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Nº de cuotas</span>
            <input v-model="form.num_cuotas" type="number" min="1" class="input-field">
          </label>
        </div>
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
          {{ guardando ? 'Guardando…' : (deuda ? 'Guardar' : 'Crear deuda') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
