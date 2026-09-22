<script setup lang="ts">
const { fondos } = useFondoActivo()
</script>

<template>
  <section>
    <div class="mb-6">
      <h1 class="hs-1">Fondos</h1>
      <p class="mt-1 text-ink-muted">Tus bolsillos: personal y emprendimientos.</p>
    </div>

    <div v-if="fondos.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink v-for="f in fondos" :key="f.id" to="/" class="card p-5 transition-colors hover:bg-surface-hover">
        <div class="flex items-center justify-between">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink">
            <UIcon name="i-material-symbols-folder-special" class="size-5" />
          </span>
          <span class="rounded-full bg-surface-muted px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {{ f.moneda_base }}
          </span>
        </div>
        <p class="mt-3 hs-2">{{ f.nombre }}</p>
        <p class="mt-1 text-sm capitalize text-ink-muted">{{ f.tipo }}</p>
      </NuxtLink>
    </div>

    <div v-else class="card flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-folder-special" class="size-6 text-ink-faint" />
      </span>
      <p class="mt-3 text-ink-muted">Aún no tienes fondos. Crea el primero para empezar.</p>
    </div>
  </section>
</template>
