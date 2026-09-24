<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta } from '~/types/movimientos'
import type { FondoEditable } from '~/types/fondos'
import type { Aporte } from '~/types/transferencias'

const props = defineProps<{
  abierto: boolean
  aporte: Aporte | null
  fondos: FondoEditable[]
  cuentasPorFondo: Record<number, Cuenta[]>
  tasaSugerida: number | null
}>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const form = reactive({
  fondo_destino_id: 0,
  cuenta_destino_id: 0,
  fondo_origen_id: 0,
  cuenta_origen_id: 0,
  desdeOtro: false,
  monto: '',
  tasa_ref: '',
  fecha: new Date().toISOString().slice(0, 10),
  nota: '',
})
const error = ref('')
const guardando = ref(false)

const cuentasDestino = computed(() => props.cuentasPorFondo[form.fondo_destino_id] ?? [])
const cuentasOrigen = computed(() => props.cuentasPorFondo[form.fondo_origen_id] ?? [])
const monedaDe = (cuentaId: number, fondoId: number) => (props.cuentasPorFondo[fondoId] ?? []).find((c) => c.id === cuentaId)?.moneda
const cruza = computed(() => {
  if (!form.desdeOtro) return false
  const d = monedaDe(form.cuenta_destino_id, form.fondo_destino_id)
  const o = monedaDe(form.cuenta_origen_id, form.fondo_origen_id)
  return !!d && !!o && d !== o
})

function initDestino() {
  const primero = props.fondos[0]?.id ?? 0
  form.fondo_destino_id = primero
  form.cuenta_destino_id = props.cuentasPorFondo[primero]?.[0]?.id ?? 0
  form.fondo_origen_id = props.fondos[1]?.id ?? primero
  form.cuenta_origen_id = props.cuentasPorFondo[form.fondo_origen_id]?.[0]?.id ?? 0
}

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const a = props.aporte
    if (a?.destino) {
      form.fondo_destino_id = a.destino.fondo_id
      form.cuenta_destino_id = a.destino.cuenta_id
      form.monto = (a.destino.monto_centavos / 100).toFixed(2).replace('.', ',')
      form.desdeOtro = !!a.origen
      form.fondo_origen_id = a.origen?.fondo_id ?? 0
      form.cuenta_origen_id = a.origen?.cuenta_id ?? 0
      form.tasa_ref = a.destino.tasa_ref ? String(a.destino.tasa_ref) : (a.origen?.tasa_ref ? String(a.origen.tasa_ref) : '')
      form.fecha = a.fecha ?? new Date().toISOString().slice(0, 10)
      form.nota = a.nota ?? ''
    } else {
      initDestino()
      form.desdeOtro = false
      form.monto = ''
      form.tasa_ref = props.tasaSugerida ? String(props.tasaSugerida) : ''
      form.fecha = new Date().toISOString().slice(0, 10)
      form.nota = ''
    }
  },
)

watch(
  () => form.fondo_destino_id,
  () => {
    if (!cuentasDestino.value.some((c) => c.id === form.cuenta_destino_id)) form.cuenta_destino_id = cuentasDestino.value[0]?.id ?? 0
  },
)
watch(
  () => form.fondo_origen_id,
  () => {
    if (!cuentasOrigen.value.some((c) => c.id === form.cuenta_origen_id)) form.cuenta_origen_id = cuentasOrigen.value[0]?.id ?? 0
  },
)

async function guardar() {
  error.value = ''
  if (!form.cuenta_destino_id) {
    error.value = 'Elige la cuenta destino'
    return
  }
  if (form.desdeOtro && !form.cuenta_origen_id) {
    error.value = 'Elige la cuenta origen'
    return
  }
  let monto: number
  try {
    monto = parseAmount(form.monto)
  } catch (e) {
    error.value = (e as Error).message
    return
  }
  const body: Record<string, unknown> = {
    cuenta_destino_id: form.cuenta_destino_id,
    monto_destino_centavos: monto,
    cuenta_origen_id: form.desdeOtro ? form.cuenta_origen_id : null,
    fecha: form.fecha,
    nota: form.nota || null,
  }
  if (cruza.value) {
    const tasa = Number(form.tasa_ref.replace(',', '.'))
    if (!Number.isFinite(tasa) || tasa <= 0) {
      error.value = 'Indica la tasa para monedas distintas'
      return
    }
    body.tasa_ref = tasa
  }
  guardando.value = true
  try {
    if (props.aporte) {
      await $fetch(`/api/aportes/${props.aporte.grupo_id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/aportes', { method: 'POST', body })
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
  <USlideover v-model:open="abiertoLocal" :title="aporte ? 'Editar aporte/retiro' : 'Nuevo aporte/retiro'">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Fondo destino</span>
            <select v-model.number="form.fondo_destino_id" class="input-field" :disabled="!!aporte">
              <option v-for="f in fondos" :key="f.id" :value="f.id">{{ f.nombre }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Cuenta destino</span>
            <select v-model.number="form.cuenta_destino_id" class="input-field" :disabled="!!aporte">
              <option v-for="c in cuentasDestino" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Monto ({{ monedaDe(form.cuenta_destino_id, form.fondo_destino_id) ?? '—' }})</span>
          <input v-model="form.monto" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
        </label>

        <label class="flex items-center gap-2 text-sm text-ink-muted">
          <input v-model="form.desdeOtro" type="checkbox" :disabled="!!aporte && !aporte.origen">
          <span>Desde otro fondo (si no, es un aporte externo)</span>
        </label>

        <div v-if="form.desdeOtro" class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Fondo origen</span>
            <select v-model.number="form.fondo_origen_id" class="input-field" :disabled="!!aporte">
              <option v-for="f in fondos" :key="f.id" :value="f.id">{{ f.nombre }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Cuenta origen</span>
            <select v-model.number="form.cuenta_origen_id" class="input-field" :disabled="!!aporte">
              <option v-for="c in cuentasOrigen" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
            </select>
          </label>
        </div>

        <label v-if="cruza" class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tasa (BOB por USD)</span>
          <input v-model="form.tasa_ref" type="text" inputmode="decimal" placeholder="6,96" class="input-field">
        </label>

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
          {{ guardando ? 'Guardando…' : (aporte ? 'Guardar' : 'Registrar') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
