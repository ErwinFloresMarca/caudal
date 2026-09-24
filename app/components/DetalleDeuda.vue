<script setup lang="ts">
import { parseAmount } from '#shared/money'
import type { Cuenta, Categoria } from '~/types/movimientos'
import type { Deuda, Cuota } from '~/types/deudas'

const props = defineProps<{ abierto: boolean; deudaId: number | null }>()
const emit = defineEmits<{ 'update:abierto': [boolean]; cambio: [] }>()

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const abiertoLocal = computed({
  get: () => props.abierto,
  set: (v) => emit('update:abierto', v),
})

const { data, refresh } = await useAsyncData(
  'deuda-detalle',
  () => (props.deudaId ? request<{ deuda: Deuda }>(`/api/deudas/${props.deudaId}`) : Promise.resolve(null)),
  { watch: [() => props.deudaId] },
)
const { data: cuentasData } = await useAsyncData(
  'deuda-cuentas',
  () => (fondoActivo.value ? request<{ cuentas: Cuenta[] }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: catsData } = await useAsyncData(
  'deuda-cats',
  () => (fondoActivo.value ? request<{ categorias: Categoria[] }>(`/api/fondos/${fondoActivo.value.id}/categorias`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)
const { data: tasaData } = await useAsyncData('deuda-tasa', () => request<{ actual: { valor: number } | null }>('/api/ajustes/tasa'))

const deuda = computed(() => data.value?.deuda ?? null)
const cuentas = computed(() => cuentasData.value?.cuentas ?? [])
const categorias = computed(() => catsData.value?.categorias ?? [])
const tasaSugerida = computed(() => tasaData.value?.actual?.valor ?? null)
const fechaCorta = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

// Pagar cuota
const pagando = ref<Cuota | null>(null)
const pago = reactive({ cuenta_id: 0, categoria_id: 0, monto: '', fecha: new Date().toISOString().slice(0, 10), tasa_ref: '' })
const pagoError = ref('')
const pagoAbierto = computed({ get: () => !!pagando.value, set: (v: boolean) => { if (!v) pagando.value = null } })
const cuentaPagoUsd = computed(() => cuentas.value.find((c) => c.id === pago.cuenta_id)?.moneda === 'USD')
const tipoPago = computed(() => (deuda.value?.direccion === 'por_pagar' ? 'gasto' : 'ingreso'))
const catsPago = computed(() => categorias.value.filter((c) => c.tipo === tipoPago.value))

function abrirPagar(c: Cuota) {
  pagando.value = c
  pago.cuenta_id = cuentas.value[0]?.id ?? 0
  pago.categoria_id = 0
  pago.monto = (c.monto_centavos / 100).toFixed(2).replace('.', ',')
  pago.fecha = new Date().toISOString().slice(0, 10)
  pago.tasa_ref = tasaSugerida.value ? String(tasaSugerida.value) : ''
  pagoError.value = ''
}
async function confirmarPago() {
  if (!deuda.value || !pagando.value) return
  pagoError.value = ''
  let monto: number
  try {
    monto = parseAmount(pago.monto)
  } catch (e) {
    pagoError.value = (e as Error).message
    return
  }
  const body: Record<string, unknown> = { cuenta_id: pago.cuenta_id, categoria_id: pago.categoria_id || null, monto_centavos: monto, fecha: pago.fecha }
  if (cuentaPagoUsd.value) {
    const tasa = Number(pago.tasa_ref.replace(',', '.'))
    if (!Number.isFinite(tasa) || tasa <= 0) {
      pagoError.value = 'Indica la tasa para esta cuenta en dólares'
      return
    }
    body.tasa_ref = tasa
  }
  try {
    await $fetch(`/api/deudas/${deuda.value.id}/cuotas/${pagando.value.id}/pagar`, { method: 'POST', body })
    pagando.value = null
    await refresh()
    emit('cambio')
  } catch (e) {
    pagoError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo pagar'
  }
}

// Editar cuota
const editandoCuota = ref<Cuota | null>(null)
const cuotaForm = reactive({ monto: '', fecha: '' })
const cuotaError = ref('')
const cuotaAbierto = computed({ get: () => !!editandoCuota.value, set: (v: boolean) => { if (!v) editandoCuota.value = null } })
function abrirEditarCuota(c: Cuota) {
  editandoCuota.value = c
  cuotaForm.monto = (c.monto_centavos / 100).toFixed(2).replace('.', ',')
  cuotaForm.fecha = c.fecha_vencimiento
  cuotaError.value = ''
}
async function guardarCuota() {
  if (!deuda.value || !editandoCuota.value) return
  cuotaError.value = ''
  let monto: number
  try {
    monto = parseAmount(cuotaForm.monto)
  } catch (e) {
    cuotaError.value = (e as Error).message
    return
  }
  try {
    await $fetch(`/api/deudas/${deuda.value.id}/cuotas/${editandoCuota.value.id}`, { method: 'PATCH', body: { monto_centavos: monto, fecha_vencimiento: cuotaForm.fecha } })
    editandoCuota.value = null
    await refresh()
    emit('cambio')
  } catch (e) {
    cuotaError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo guardar'
  }
}
</script>

<template>
  <USlideover v-model:open="abiertoLocal" :title="deuda ? deuda.contraparte : 'Deuda'">
    <template #body>
      <div v-if="deuda" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="deuda.direccion === 'por_pagar' ? 'badge-minus' : 'badge-plus'">
            {{ deuda.direccion === 'por_pagar' ? 'En contra' : 'A favor' }}
          </span>
          <span class="text-xs capitalize text-ink-faint">{{ deuda.estado }}</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="card-muted p-3">
            <p class="text-xs text-ink-muted">Total</p>
            <p class="text-lg font-bold tabular-nums text-ink">{{ deuda.monto_total_formateado }}</p>
          </div>
          <div class="card-muted p-3">
            <p class="text-xs text-ink-muted">Saldo pendiente</p>
            <p class="text-lg font-bold tabular-nums text-ink">{{ deuda.saldo_pendiente_formateado }}</p>
          </div>
        </div>
        <p class="text-sm text-ink-muted">{{ deuda.progreso.pagadas }} de {{ deuda.progreso.total }} cuotas pagadas{{ deuda.concepto ? ` · ${deuda.concepto}` : '' }}</p>

        <ul class="divide-y divide-border">
          <li v-for="c in deuda.cuotas ?? []" :key="c.id" class="flex items-center justify-between gap-3 py-3">
            <span class="flex items-center gap-3">
              <span class="grid h-8 w-8 place-items-center rounded-full" :class="c.pagada ? 'bg-[rgb(15_164_127/0.10)] text-positive' : 'bg-surface-muted text-ink-muted'">
                <UIcon :name="c.pagada ? 'i-material-symbols-check' : 'i-material-symbols-schedule'" class="size-4" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm text-ink">Cuota {{ c.numero }} · {{ c.monto_formateado }}</span>
                <span class="text-xs" :class="c.pagada ? 'text-ink-faint' : 'text-ink-muted'">
                  {{ c.pagada ? `Pagada el ${c.fecha_pago ? fechaCorta(c.fecha_pago) : ''}` : `Vence ${fechaCorta(c.fecha_vencimiento)}` }}
                </span>
              </span>
            </span>
            <span v-if="!c.pagada" class="flex gap-2">
              <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirEditarCuota(c)">Editar</button>
              <button type="button" class="btn-primary h-9 px-3 text-xs" @click="abrirPagar(c)">Pagar</button>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </USlideover>

  <!-- Pagar cuota -->
  <UModal v-model:open="pagoAbierto" title="Pagar cuota">
    <template #body>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Cuenta</span>
          <select v-model.number="pago.cuenta_id" class="input-field">
            <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} · {{ c.moneda }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Categoría</span>
          <select v-model.number="pago.categoria_id" class="input-field">
            <option :value="0">Sin categoría</option>
            <option v-for="c in catsPago" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Monto</span>
            <input v-model="pago.monto" type="text" inputmode="decimal" class="input-field">
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Fecha</span>
            <input v-model="pago.fecha" type="date" class="input-field">
          </label>
        </div>
        <label v-if="cuentaPagoUsd" class="flex flex-col gap-1">
          <span class="text-sm text-ink-muted">Tasa (BOB por USD)</span>
          <input v-model="pago.tasa_ref" type="text" inputmode="decimal" placeholder="6,96" class="input-field">
        </label>
        <p v-if="pagoError" class="text-sm text-negative">{{ pagoError }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="pagando = null">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" @click="confirmarPago">Pagar cuota</button>
      </div>
    </template>
  </UModal>

  <!-- Editar cuota -->
  <UModal v-model:open="cuotaAbierto" title="Editar cuota">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Monto</span>
            <input v-model="cuotaForm.monto" type="text" inputmode="decimal" class="input-field">
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Vencimiento</span>
            <input v-model="cuotaForm.fecha" type="date" class="input-field">
          </label>
        </div>
        <p v-if="cuotaError" class="text-sm text-negative">{{ cuotaError }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="editandoCuota = null">Cancelar</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" @click="guardarCuota">Guardar</button>
      </div>
    </template>
  </UModal>
</template>
