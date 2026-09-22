<script setup lang="ts">
const route = useRoute()
const moviles = computed(() => NAVEGACION.filter((i) => i.movil))
const esActivo = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
  >
    <NuxtLink
      v-for="item in moviles.slice(0, 2)"
      :key="item.to"
      :to="item.to"
      class="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] text-ink-muted"
      :class="esActivo(item.to) ? 'text-brand font-semibold' : ''"
    >
      <UIcon :name="item.icono" class="size-6" />
      <span>{{ item.label }}</span>
    </NuxtLink>

    <NuxtLink
      to="/movimientos"
      aria-label="Registrar movimiento"
      class="-mt-6 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white shadow-md"
    >
      <UIcon name="i-material-symbols-add" class="size-7" />
    </NuxtLink>

    <NuxtLink
      v-for="item in moviles.slice(2)"
      :key="item.to"
      :to="item.to"
      class="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] text-ink-muted"
      :class="esActivo(item.to) ? 'text-brand font-semibold' : ''"
    >
      <UIcon :name="item.icono" class="size-6" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
