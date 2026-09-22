<script setup lang="ts">
const route = useRoute()
const esActivo = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <aside class="fixed left-0 top-0 z-50 hidden h-screen w-[260px] flex-col justify-between border-r border-border bg-surface lg:flex">
    <div class="flex flex-col">
      <div class="flex h-16 items-center gap-2 px-5">
        <span class="grid h-8 w-8 place-items-center rounded-full bg-brand text-white">
          <UIcon name="i-material-symbols-water-drop" class="size-5" />
        </span>
        <span class="text-xl font-extrabold tracking-tight text-ink">Caudal</span>
      </div>
      <nav class="flex flex-col gap-1 px-2 pt-1">
        <NuxtLink
          v-for="item in NAVEGACION"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-full px-4 py-3 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          :class="esActivo(item.to) ? 'bg-brand font-semibold text-white hover:bg-brand hover:text-white' : ''"
        >
          <UIcon :name="item.icono" class="size-5" />
          <span class="text-sm">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>
    <div class="p-3">
      <FondoActivoMenu />
    </div>
  </aside>
</template>
