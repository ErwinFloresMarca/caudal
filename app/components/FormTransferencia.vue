<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta } from '~/types/movimientos'
import type { Transferencia } from '~/types/transferencias'

const props = defineProps<{ abierto: boolean; transferencia: Transferencia | null; cuentas: Cuenta[]; tasaSugerida: number | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const form = reactive({ cuenta_origen_id: 0, cuenta_destino_id: 0, monto_origen: '', monto_destino: '', tasa_ref: '', fecha: new Date().toISOString().slice(0, 10), nota: '' })
const error = ref('')
const guardando = ref(false)

const moneda = (id: number) => props.cuentas.find((c) => c.id === id)?.moneda
const cruza = computed(() => {
  const o = moneda(form.cuenta_origen_id)
  const d = moneda(form.cuenta_destino_id)
  return !!o && !!d && o !== d
})

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const t = props.transferencia
    if (t) {
      form.cuenta_origen_id = t.cuenta_origen_id
      form.cuenta_destino_id = t.cuenta_destino_id
      form.monto_origen = (t.monto_origen_centavos / 100).toFixed(2).replace('.', ',')
      form.monto_destino = (t.monto_destino_centavos / 100).toFixed(2).replace('.', ',')
      form.tasa_ref = t.tasa_ref ? String(t.tasa_ref) : ''
      form.fecha = t.fecha
      form.nota = t.nota ?? ''
    } else {
      form.cuenta_origen_id = props.cuentas[0]?.id ?? 0
      form.cuenta_destino_id = props.cuentas[1]?.id ?? props.cuentas[0]?.id ?? 0
      form.monto_origen = ''
      form.monto_destino = ''
      form.tasa_ref = props.tasaSugerida ? String(props.tasaSugerida) : ''
      form.fecha = new Date().toISOString().slice(0, 10)
      form.nota = ''
    }
  },
)

async function guardar() {
  error.value = ''
  if (!form.cuenta_origen_id || !form.cuenta_destino_id) {
    error.value = 'Elige las cuentas de origen y destino'
    return
  }
  let monto: number
  try {
    monto = parseAmount(form.monto_origen)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  const body: Record<string, unknown> = {
    cuenta_origen_id: form.cuenta_origen_id,
    cuenta_destino_id: form.cuenta_destino_id,
    monto_origen_centavos: monto,
    fecha: form.fecha,
    nota: form.nota || null,
  }
  if (cruza.value) {
    if (form.monto_destino.trim()) {
      try {
        body.monto_destino_centavos = parseAmount(form.monto_destino)
      } catch (e) {
        error.value = `Monto destino: ${(e as Error).message}`
        return
      }
    } else {
      const tasa = Number(form.tasa_ref.replace(',', '.'))
      if (!Number.isFinite(tasa) || tasa <= 0) {
        error.value = 'Indica el monto destino o la tasa'
        return
      }
      body.tasa_ref = tasa
    }
  }
  guardando.value = true
  try {
    if (props.transferencia) {
      await $fetch(`/api/transferencias/${props.transferencia.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/transferencias', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="transferencia ? 'Editar transferencia' : 'Nueva transferencia'">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta origen</span>
          <select v-model.number="form.cuenta_origen_id" class="input-field" :disabled="!!transferencia">
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta destino</span>
          <select v-model.number="form.cuenta_destino_id" class="input-field" :disabled="!!transferencia">
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Monto ({{ moneda(form.cuenta_origen_id) ?? '—' }})</span>
          <input v-model="form.monto_origen" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
        </label>

        <template v-if="cruza">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Monto destino ({{ moneda(form.cuenta_destino_id) }}) — opcional</span>
            <input v-model="form.monto_destino" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">o Tasa (BOB por USD)</span>
            <input v-model="form.tasa_ref" type="text" inputmode="decimal" placeholder="6,96" class="input-field">
          </label>
        </template>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Fecha</span>
          <input v-model="form.fecha" type="date" class="input-field">
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
          {{ guardando ? 'Guardando…' : (transferencia ? 'Guardar' : 'Transferir') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
