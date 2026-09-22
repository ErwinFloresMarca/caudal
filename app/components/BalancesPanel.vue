<script setup lang="ts">
import { formatMoney } from '#shared/money'

const { fondoActivo } = useFondoActivo()
const request = useRequestFetch()
const { data } = await useAsyncData(
  'cuentas-fondo-activo',
  () =>
    fondoActivo.value
      ? request<{ cuentas: CuentaPublica[]; saldos_por_moneda: Record<string, number> }>(`/api/fondos/${fondoActivo.value.id}/cuentas`)
      : Promise.resolve(null),
  { watch: [fondoActivo] },
)

const ICONOS: Record<string, string> = {
  efectivo: 'i-material-symbols-payments',
  banco: 'i-material-symbols-account-balance',
  tarjeta: 'i-material-symbols-credit-card',
  ahorro: 'i-material-symbols-savings',
}
const icono = (tipo: string) => ICONOS[tipo] ?? 'i-material-symbols-account-balance-wallet'
const saldos = computed(() => Object.entries(data.value?.saldos_por_moneda ?? {}))
</script>

<template>
  <div class="card p-6">
    <div class="flex items-baseline justify-between">
      <p class="text-sm text-ink-muted">Saldo total</p>
      <span class="text-xs text-ink-faint">{{ fondoActivo?.nombre }}</span>
    </div>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <p
        v-for="[moneda, centavos] in saldos"
        :key="moneda"
        class="text-3xl font-extrabold tracking-tight tabular-nums text-ink"
      >
        {{ formatMoney({ centavos, moneda: moneda as 'BOB' | 'USD' }) }}
      </p>
      <p v-if="!saldos.length" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">Bs 0,00</p>
    </div>

    <ul class="mt-6 divide-y divide-border">
      <li v-for="c in data?.cuentas ?? []" :key="c.id" class="flex items-center justify-between py-3">
        <span class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink">
            <UIcon :name="icono(c.tipo)" class="size-5" />
          </span>
          <span class="flex flex-col">
            <span class="text-sm font-medium text-ink">{{ c.nombre }}</span>
            <span class="text-xs capitalize text-ink-faint">{{ c.tipo }}</span>
          </span>
        </span>
        <span class="font-semibold tabular-nums text-ink">{{ formatMoney({ centavos: c.saldo_actual_centavos, moneda: c.moneda }) }}</span>
      </li>
      <li v-if="!data?.cuentas?.length" class="py-6 text-center text-sm text-ink-muted">Este fondo aún no tiene cuentas.</li>
    </ul>
  </div>
</template>
