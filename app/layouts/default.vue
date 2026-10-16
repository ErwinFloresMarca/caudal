<script setup lang="ts">
const { cargarFondos, cargarFondoActivo, fondoActivo } = useFondoActivo()
await Promise.all([cargarFondos(), cargarFondoActivo()])
</script>

<template>
  <div class="min-h-screen bg-frost">
    <AppSidebar />

    <div class="lg:pl-[260px]">
      <header class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-6">
        <div class="flex min-w-0 items-center gap-2 lg:hidden">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white">
            <UIcon name="i-material-symbols-water-drop" class="size-5" />
          </span>
          <span class="hidden text-lg font-extrabold tracking-tight text-ink sm:inline">Caudal</span>
          <FondoActivoMenu compacto />
        </div>

        <div class="hidden lg:block">
          <NuxtLink to="/fondos" class="inline-flex items-center gap-2 rounded-full bg-surface-muted px-4 text-sm text-ink hover:bg-surface-hover">
            <UIcon name="i-material-symbols-pie-chart" class="size-4 text-brand" />
            <span>{{ fondoActivo?.nombre ?? 'Sin fondo' }}</span>
            <span class="text-ink-muted">{{ fondoActivo?.moneda_base ?? '' }}</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink to="/movimientos?nuevo=1" class="btn-primary h-11 px-5 text-sm">
            <UIcon name="i-material-symbols-add" class="size-5" />
            <span class="hidden sm:inline">Registrar</span>
          </NuxtLink>
          <AppUserMenu />
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1280px] px-4 py-6 pb-24 lg:px-8 lg:pb-10">
        <slot />
      </main>
    </div>

    <AppBottomNav />
  </div>
</template>
