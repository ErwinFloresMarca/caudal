<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const proveedor = computed(() => {
  const p = route.query.provider
  return typeof p === 'string' && p ? p : 'el proveedor'
})
</script>

<template>
  <div class="card p-8 text-center">
    <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
      <UIcon name="i-material-symbols-error" class="size-6 text-negative" />
    </span>
    <h1 class="mt-4 hs-2">No se pudo iniciar sesión con {{ proveedor }}</h1>
    <p class="mt-2 text-sm text-ink-muted">Vuelve a intentarlo. Si el problema persiste, entra con tu email y contraseña.</p>
    <div class="mt-6 flex flex-col gap-2">
      <NuxtLink to="/login" class="btn-primary w-full">Volver a intentar</NuxtLink>
    </div>
  </div>
</template>
