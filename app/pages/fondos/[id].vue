<script setup lang="ts">
import { formatMoney } from '#shared/money'
import type { CuentaFondo } from '~/types/cuentas'
import type { FondoEditable, CategoriaEditable } from '~/types/fondos'

const route = useRoute()
const request = useRequestFetch()
const fondoId = computed(() => Number(route.params.id))

const { data: fondoData, refresh: refreshFondo } = await useAsyncData('fondo-detalle', () => request<{ fondo: FondoEditable }>(`/api/fondos/${fondoId.value}`))
const { data: cuentasData, refresh: refreshCuentas } = await useAsyncData('fondo-cuentas', () =>
  request<{ fondo: FondoEditable; cuentas: CuentaFondo[]; saldos_por_moneda: Record<string, number> }>(`/api/fondos/${fondoId.value}/cuentas`),
)
const { data: catsData, refresh: refreshCats } = await useAsyncData('fondo-categorias', () => request<{ categorias: CategoriaEditable[] }>(`/api/fondos/${fondoId.value}/categorias`))

const fondo = computed(() => fondoData.value?.fondo ?? cuentasData.value?.fondo ?? null)
const activas = computed(() => (cuentasData.value?.cuentas ?? []).filter((c) => c.activa))
const inactivas = computed(() => (cuentasData.value?.cuentas ?? []).filter((c) => !c.activa))
const saldos = computed(() => Object.entries(cuentasData.value?.saldos_por_moneda ?? {}))
const categorias = computed(() => catsData.value?.categorias ?? [])
const catsGasto = computed(() => categorias.value.filter((c) => c.tipo === 'gasto'))
const catsIngreso = computed(() => categorias.value.filter((c) => c.tipo === 'ingreso'))

const ICONOS: Record<string, string> = {
  efectivo: 'i-material-symbols-payments',
  banco: 'i-material-symbols-account-balance',
  tarjeta: 'i-material-symbols-credit-card',
  ahorro: 'i-material-symbols-savings',
}
const icono = (tipo: string) => ICONOS[tipo] ?? 'i-material-symbols-account-balance-wallet'

// Cuentas
const cuentaAbierta = ref(false)
const cuentaEdicion = ref<CuentaFondo | null>(null)
function abrirNuevaCuenta() {
  cuentaEdicion.value = null
  cuentaAbierta.value = true
}
function abrirEditarCuenta(c: CuentaFondo) {
  cuentaEdicion.value = c
  cuentaAbierta.value = true
}

// Fondo
const fondoAbierto = ref(false)
const fondoEdicion = ref<FondoEditable | null>(null)
function abrirEditarFondo() {
  fondoEdicion.value = fondo.value
  fondoAbierto.value = true
}
async function onFondoGuardado() {
  await refreshFondo()
  await refreshCuentas()
}

// Categorías
const catAbierta = ref(false)
const catEdicion = ref<CategoriaEditable | null>(null)
const catPorBorrar = ref<CategoriaEditable | null>(null)
const borrando = ref(false)
const confirmarAbierto = computed({
  get: () => !!catPorBorrar.value,
  set: (v: boolean) => {
    if (!v) catPorBorrar.value = null
  },
})
function abrirNuevaCat() {
  catEdicion.value = null
  catAbierta.value = true
}
function abrirEditarCat(c: CategoriaEditable) {
  catEdicion.value = c
  catAbierta.value = true
}
async function ocultarCat(c: CategoriaEditable) {
  await $fetch(`/api/fondos/${fondoId.value}/categorias/${c.id}`, { method: 'PATCH', body: { activa: false } })
  await refreshCats()
}
async function confirmarBorradoCat() {
  if (!catPorBorrar.value) return
  borrando.value = true
  try {
    await $fetch(`/api/fondos/${fondoId.value}/categorias/${catPorBorrar.value.id}`, { method: 'DELETE' })
    catPorBorrar.value = null
    await refreshCats()
  } finally {
    borrando.value = false
  }
}
</script>

<template>
  <section v-if="fondo">
    <NuxtLink to="/fondos" class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
      <UIcon name="i-material-symbols-arrow-back" class="size-4" /> Fondos
    </NuxtLink>

    <div class="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Cuentas de {{ fondo.nombre }}</h1>
        <span class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold capitalize text-ink-muted">
          {{ fondo.tipo }} • {{ fondo.moneda_base }}
        </span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="abrirEditarFondo">Editar fondo</button>
        <button type="button" class="btn-primary h-11 px-5 text-sm" @click="abrirNuevaCuenta">
          <UIcon name="i-material-symbols-add" class="size-5" />
          <span class="hidden sm:inline">Crear cuenta</span>
        </button>
      </div>
    </div>

    <!-- Saldo total -->
    <div class="card mb-6 p-6">
      <p class="text-sm text-ink-muted">Saldo total del fondo</p>
      <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span v-for="[moneda, centavos] in saldos" :key="moneda" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">
          {{ formatMoney({ centavos, moneda: moneda as 'BOB' | 'USD' }) }}
        </span>
        <span v-if="!saldos.length" class="text-3xl font-extrabold tracking-tight tabular-nums text-ink">Bs 0,00</span>
      </div>
    </div>

    <!-- Cuentas activas -->
    <h2 class="hs-2 mb-3">Cuentas activas</h2>
    <div v-if="activas.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="c in activas" :key="c.id" class="card p-5">
        <div class="flex items-start justify-between">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink">
            <UIcon :name="icono(c.tipo)" class="size-5" />
          </span>
          <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover" title="Editar" @click="abrirEditarCuenta(c)">
            <UIcon name="i-material-symbols-edit" class="size-4" />
          </button>
        </div>
        <p class="mt-3 truncate text-sm font-semibold text-ink">{{ c.nombre }}</p>
        <p class="text-xs uppercase tracking-wide text-ink-faint">{{ c.moneda }} • {{ c.tipo }}</p>
        <p class="mt-3 whitespace-nowrap text-2xl font-extrabold tabular-nums text-ink">
          {{ formatMoney({ centavos: c.saldo_actual_centavos, moneda: c.moneda }) }}
        </p>
      </div>
    </div>
    <div v-else class="card flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-account-balance-wallet" class="size-6 text-ink-faint" />
      </span>
      <p class="mt-3 text-ink-muted">Este fondo aún no tiene cuentas.</p>
      <button type="button" class="btn-primary mt-5" @click="abrirNuevaCuenta">Crear la primera cuenta</button>
    </div>

    <!-- Cuentas inactivas -->
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
          <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirEditarCuenta(c)">Reactivar</button>
        </div>
      </div>
    </template>

    <!-- Categorías -->
    <div class="mt-8 flex items-center justify-between">
      <h2 class="hs-2">Categorías</h2>
      <button type="button" class="btn-secondary h-10 px-4 text-sm" @click="abrirNuevaCat">
        <UIcon name="i-material-symbols-add" class="size-4" /> Nueva categoría
      </button>
    </div>
    <div class="card mt-3 divide-y divide-border p-2">
      <div v-for="c in [...catsGasto, ...catsIngreso]" :key="c.id" class="flex items-center justify-between gap-3 px-3 py-3">
        <span class="flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-full bg-surface-muted" :style="{ color: c.color ?? '#5B6B85' }">
            <UIcon :name="iconoMaterial(c.icono)" class="size-4" />
          </span>
          <span class="flex flex-col">
            <span class="text-sm font-medium text-ink">{{ c.nombre }}</span>
            <span class="text-xs capitalize text-ink-faint">{{ c.tipo }}{{ c.es_predefinida ? ' · predefinida' : '' }}</span>
          </span>
        </span>
        <span class="flex gap-2">
          <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirEditarCat(c)">Editar</button>
          <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="ocultarCat(c)">Ocultar</button>
          <button v-if="!c.es_predefinida" type="button" class="grid h-9 w-9 place-items-center rounded-full text-negative hover:bg-surface-hover" title="Borrar" @click="catPorBorrar = c">
            <UIcon name="i-material-symbols-delete" class="size-4" />
          </button>
        </span>
      </div>
    </div>

    <FormCuenta v-model:abierto="cuentaAbierta" :cuenta="cuentaEdicion" :fondo-id="fondoId" @guardado="refreshCuentas" />
    <FormFondo v-model:abierto="fondoAbierto" :fondo="fondoEdicion" @guardado="onFondoGuardado" />
    <FormCategoria v-model:abierto="catAbierta" :categoria="catEdicion" :fondo-id="fondoId" @guardado="refreshCats" />

    <UModal v-model:open="confirmarAbierto" title="Borrar categoría">
      <template #body>
        <p class="text-sm text-ink-muted">¿Borrar «{{ catPorBorrar?.nombre }}»? Solo se puede si no tiene transacciones; si tiene, conviene ocultarla.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="catPorBorrar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" :disabled="borrando" @click="confirmarBorradoCat">
            {{ borrando ? 'Borrando…' : 'Borrar' }}
          </button>
        </div>
      </template>
    </UModal>
  </section>

  <div v-else class="card flex items-center justify-center p-10 text-ink-muted">Cargando…</div>
</template>
