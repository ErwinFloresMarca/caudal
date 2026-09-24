<script setup lang="ts">
import { formatMoney } from '#shared/money'
import type { CuentaFondo } from '~/types/cuentas'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()

const { data, refresh } = await useAsyncData(
  'cuentas-activo',
  () => (fondoActivo.value ? request<{ cuentas: CuentaFondo[]; saldos_por_moneda: Record<string, number> }>(`/api/fondos/${fondoActivo.value.id}/cuentas`) : Promise.resolve(null)),
  { watch: [fondoActivo] },
)

const cuentas = computed(() => data.value?.cuentas ?? [])
const activas = computed(() => cuentas.value.filter((c) => c.activa))
const inactivas = computed(() => cuentas.value.filter((c) => !c.activa))
const saldos = computed(() => Object.entries(data.value?.saldos_por_moneda ?? {}))

const ICONOS: Record<string, string> = {
  efectivo: 'i-material-symbols-payments',
  banco: 'i-material-symbols-account-balance',
  tarjeta: 'i-material-symbols-credit-card',
  ahorro: 'i-material-symbols-savings',
}
const icono = (tipo: string) => ICONOS[tipo] ?? 'i-material-symbols-account-balance-wallet'

const formAbierto = ref(false)
const enEdicion = ref<CuentaFondo | null>(null)
function abrirNueva() {
  enEdicion.value = null
  formAbierto.value = true
}
function abrirEditar(c: CuentaFondo) {
  enEdicion.value = c
  formAbierto.value = true
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Cuentas</h1>
        <p class="mt-1 text-ink-muted">{{ fondoActivo?.nombre ?? 'Sin fondo activo' }}</p>
      </div>
      <button v-if="fondoActivo" type="button" class="btn-primary h-11 px-5 text-sm" @click="abrirNueva">
        <UIcon name="i-material-symbols-add" class="size-5" /> <span class="hidden sm:inline">Crear cuenta</span>
      </button>
    </div>

    <div v-if="!fondoActivo" class="card flex flex-col items-center justify-center p-10 text-center">
      <p class="text-ink-muted">Aún no tienes fondos. Crea uno para agregar cuentas.</p>
      <NuxtLink to="/fondos" class="btn-primary mt-5">Ir a fondos</NuxtLink>
    </div>

    <template v-else>
      <!-- Saldo total del fondo activo -->
      <div class="card mb-6 p-6">
        <p class="text-sm text-ink-muted">Saldo total</p>
        <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span v-for="[moneda, centavos] in saldos" :key="moneda" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">
            {{ formatMoney({ centavos, moneda: moneda as 'BOB' | 'USD' }) }}
          </span>
          <span v-if="!saldos.length" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">Bs 0,00</span>
        </div>
      </div>

      <div class="mb-3 flex items-center justify-between">
        <h2 class="hs-2">Cuentas activas</h2>
        <NuxtLink v-if="fondoActivo" :to="`/fondos/${fondoActivo.id}`" class="text-sm font-semibold text-brand hover:text-brand-600">Gestionar en el fondo</NuxtLink>
      </div>

      <div v-if="activas.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="c in activas" :key="c.id" class="card p-5">
          <div class="flex items-start justify-between">
            <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink">
              <UIcon :name="icono(c.tipo)" class="size-5" />
            </span>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="abrirEditar(c)">
              <UIcon name="i-material-symbols-edit" class="size-4" />
            </button>
          </div>
          <p class="mt-3 truncate text-sm font-semibold text-ink">{{ c.nombre }}</p>
          <p class="text-xs uppercase tracking-wide text-ink-faint">{{ c.moneda }} • {{ c.tipo }}</p>
          <p class="mt-3 whitespace-nowrap text-2xl font-extrabold tabular-nums text-ink">{{ formatMoney({ centavos: c.saldo_actual_centavos, moneda: c.moneda }) }}</p>
        </div>
      </div>
      <div v-else class="card flex flex-col items-center justify-center p-10 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
          <UIcon name="i-material-symbols-account-balance-wallet" class="size-6 text-ink-faint" />
        </span>
        <p class="mt-3 text-ink-muted">Este fondo aún no tiene cuentas.</p>
        <button type="button" class="btn-primary mt-5" @click="abrirNueva">Crear la primera cuenta</button>
      </div>

      <template v-if="inactivas.length">
        <h2 class="hs-2 mb-3 mt-8">Cuentas inactivas</h2>
        <div class="card divide-y divide-border p-2">
          <div v-for="c in inactivas" :key="c.id" class="flex items-center justify-between gap-3 px-3 py-3">
            <span class="flex items-center gap-3">
              <span class="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-ink-faint">
                <UIcon :name="icono(c.tipo)" class="size-4" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-medium text-ink-muted">{{ c.nombre }}</span>
                <span class="text-xs text-ink-faint">{{ c.moneda }} • {{ c.tipo }}</span>
              </span>
            </span>
            <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirEditar(c)">Reactivar</button>
          </div>
        </div>
      </template>

      <FormCuenta v-model:abierto="formAbierto" :cuenta="enEdicion" :fondo-id="fondoActivo.id" @guardado="refresh" />
    </template>
  </section>
</template>
