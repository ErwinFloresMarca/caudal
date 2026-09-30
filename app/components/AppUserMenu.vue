<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { user, clear } = useUserSession()
const colorMode = useColorMode()

async function cerrarSesion() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

const modos = [
  { valor: 'light', label: 'Claro', icon: 'i-material-symbols-light-mode' },
  { valor: 'dark', label: 'Oscuro', icon: 'i-material-symbols-dark-mode' },
  { valor: 'system', label: 'Sistema', icon: 'i-material-symbols-contrast' },
] as const

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value?.name ?? 'Sesión',
      description: user.value?.email ?? undefined,
      avatar: { src: user.value?.avatar_url ?? undefined, alt: user.value?.name || user.value?.email || 'Usuario' },
    },
  ],
  modos.map((m) => ({
    label: m.label,
    icon: m.icon,
    type: 'checkbox' as const,
    checked: colorMode.preference === m.valor,
    onSelect: () => { colorMode.preference = m.valor },
  })),
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
      <UAvatar
        :src="user?.avatar_url ?? undefined"
        :alt="user?.name || user?.email || 'Usuario'"
        :ui="{ fallback: 'bg-brand text-white' }"
      />
    </button>
  </UDropdownMenu>
</template>
