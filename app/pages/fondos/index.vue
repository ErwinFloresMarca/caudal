<script setup lang="ts">
const { fondos, cargarFondos } = useFondoActivo()

const formAbierto = ref(false)
const enEdicion = ref<(typeof fondos.value)[number] | null>(null)

function abrirNuevo() {
  enEdicion.value = null
  formAbierto.value = true
}
function abrirEditar(f: (typeof fondos.value)[number]) {
  enEdicion.value = f
  formAbierto.value = true
}
async function onGuardado() {
  await cargarFondos()
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="hs-1">Fondos</h1>
        <p class="mt-1 text-ink-muted">Tus bolsillos: personal y emprendimientos.</p>
      </div>
      <button type="button" class="btn-primary h-11 px-5 text-sm" @click="abrirNuevo">
        <UIcon name="i-material-symbols-add" class="size-5" />
        <span class="hidden sm:inline">Crear fondo</span>
      </button>
    </div>

    <div v-if="fondos.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="f in fondos" :key="f.id" class="card p-5">
        <div class="flex items-start justify-between">
          <NuxtLink :to="`/fondos/${f.id}`" class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted" :style="{ color: f.color ?? '#0E6FFF' }">
            <UIcon :name="iconoMaterial(f.icono, 'folder-special')" class="size-5" />
          </NuxtLink>
          <span class="rounded-full bg-surface-muted px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {{ f.moneda_base }}
          </span>
        </div>
        <NuxtLink :to="`/fondos/${f.id}`">
          <p class="mt-3 hs-2">{{ f.nombre }}</p>
          <p class="mt-1 text-sm capitalize text-ink-muted">{{ f.tipo }}</p>
        </NuxtLink>
        <div class="mt-4 flex gap-2">
          <NuxtLink :to="`/fondos/${f.id}`" class="btn-secondary h-9 px-3 text-xs">Ver cuentas</NuxtLink>
          <button type="button" class="btn-secondary h-9 px-3 text-xs" @click="abrirEditar(f)">Editar</button>
        </div>
      </div>
    </div>

    <div v-else class="card flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-folder-special" class="size-6 text-ink-faint" />
      </span>
      <p class="mt-3 text-ink-muted">Aún no tienes fondos. Crea el primero para empezar.</p>
      <button type="button" class="btn-primary mt-5" @click="abrirNuevo">Crear mi primer fondo</button>
    </div>

    <FormFondo v-model:abierto="formAbierto" :fondo="enEdicion" @guardado="onGuardado" />
  </section>
</template>
