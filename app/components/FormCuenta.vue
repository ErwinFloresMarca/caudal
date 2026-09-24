<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { CuentaFondo } from '~/types/cuentas'

const props = defineProps<{ abierto: boolean; cuenta: CuentaFondo | null; fondoId: number }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; guardado: [] }>()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const TIPOS = [
  { v: 'efectivo', t: 'Efectivo' },
  { v: 'banco', t: 'Banco' },
  { v: 'tarjeta', t: 'Tarjeta' },
  { v: 'ahorro', t: 'Ahorro' },
]

const form = reactive({ nombre: '', tipo: 'efectivo', moneda: 'BOB' as 'BOB' | 'USD', saldo_inicial: '0', activa: true })
const error = ref('')
const guardando = ref(false)

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    error.value = ''
    const c = props.cuenta
    if (c) {
      form.nombre = c.nombre
      form.tipo = c.tipo
      form.moneda = c.moneda
      form.saldo_inicial = (c.saldo_inicial_centavos / 100).toFixed(2).replace('.', ',')
      form.activa = c.activa
    } else {
      form.nombre = ''
      form.tipo = 'efectivo'
      form.moneda = 'BOB'
      form.saldo_inicial = '0'
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
    if (props.cuenta) {
      if (!form.activa) {
        await $fetch(`/api/fondos/${props.fondoId}/cuentas/${props.cuenta.id}`, { method: 'PATCH', body: { activa: false } })
      } else {
        await $fetch(`/api/fondos/${props.fondoId}/cuentas/${props.cuenta.id}`, {
          method: 'PATCH',
          body: { nombre: form.nombre, tipo: form.tipo, activa: true },
        })
      }
    } else {
      let saldo = 0
      if (form.saldo_inicial.trim()) {
        try {
          saldo = parseAmount(form.saldo_inicial)
        } catch (e) {
          error.value = (e as Error).message
          guardando.value = false
          return
        }
      }
      await $fetch(`/api/fondos/${props.fondoId}/cuentas`, {
        method: 'POST',
        body: { nombre: form.nombre, tipo: form.tipo, moneda: form.moneda, saldo_inicial_centavos: saldo },
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
  <USlideover v-model:open="abiertoLocal" :title="cuenta ? 'Editar cuenta' : 'Crear cuenta'">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Nombre</span>
          <input v-model="form.nombre" type="text" placeholder="Ej. BNB Banco" class="input-field">
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tipo</span>
          <select v-model="form.tipo" class="input-field">
            <option v-for="t in TIPOS" :key="t.v" :value="t.v">{{ t.t }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Moneda</span>
          <select v-model="form.moneda" class="input-field" :disabled="!!cuenta">
            <option value="BOB">BOB · Bolivianos</option>
            <option value="USD">USD · Dólares</option>
          </select>
          <span v-if="cuenta" class="text-xs text-ink-faint">La moneda es fija: no se puede cambiar tras crear la cuenta.</span>
        </label>

        <label v-if="!cuenta" class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Saldo inicial</span>
          <input v-model="form.saldo_inicial" type="text" inputmode="decimal" placeholder="0,00" class="input-field">
        </label>
        <p v-else class="text-xs text-ink-faint">El saldo inicial se ajusta con transacciones.</p>

        <label v-if="cuenta" class="flex items-center justify-between gap-3">
          <span class="text-sm text-ink-muted">Cuenta activa</span>
          <input v-model="form.activa" type="checkbox">
        </label>

        <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abiertoLocal = false">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : (cuenta ? 'Guardar' : 'Crear cuenta') }}
        </button>
      </div>
    </template>
  </USlideover>
</template>
