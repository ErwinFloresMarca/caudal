<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { user, clear } = useUserSession()

async function cerrarSesion() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value?.name ?? 'Sesión',
      description: user.value?.email ?? undefined,
      avatar: { src: user.value?.avatar_url ?? undefined, alt: user.value?.name || user.value?.email || 'Usuario' },
    },
  ],
  [
    { label: 'Ajustes', icon: 'i-material-symbols-settings', onSelect: () => navigateTo('/ajustes') },
  ],
  [
    { label: 'Cerrar sesión', icon: 'i-material-symbols-logout', color: 'error', onSelect: cerrarSesion },
  ],
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }" :ui="{ content: 'w-56' }">
    <button
      type="button"
      class="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label="Menú del usuario"
    >
      <UAvatar :src="user?.avatar_url ?? undefined" :alt="user?.name || user?.email || 'Usuario'" />
    </button>
  </UDropdownMenu>
</template>
