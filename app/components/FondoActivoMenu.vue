<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

// `compacto` = versión para el header móvil (pill con nombre + moneda); el sidebar usa la grande.
const props = defineProps<{ compacto?: boolean }>()

const { fondos, fondoActivo, seleccionarFondo } = useFondoActivo()

const items = computed<DropdownMenuItem[][]>(() => [
  fondos.value.map((f) => ({
    label: f.nombre,
    icon: f.id === fondoActivo.value?.id ? 'i-material-symbols-check' : 'i-material-symbols-folder-special',
    onSelect: () => seleccionarFondo(f.id),
  })),
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'start', side: props.compacto ? 'bottom' : 'top' }" :ui="{ content: 'w-60' }">
    <button
      v-if="props.compacto"
      type="button"
      class="flex h-9 items-center gap-1.5 rounded-full bg-surface-muted px-3 transition-colors hover:bg-surface-hover"
    >
      <UIcon name="i-material-symbols-account-balance-wallet" class="size-4 text-brand" />
      <span class="max-w-[7rem] truncate text-sm font-semibold text-ink">{{ fondoActivo?.nombre ?? 'Sin fondo' }}</span>
      <UIcon name="i-material-symbols-unfold-more" class="size-4 text-ink-muted" />
    </button>

    <button
      v-else
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-2xl bg-surface-muted px-3 py-2 text-left transition-colors hover:bg-surface-hover"
    >
      <span class="flex items-center gap-2">
        <span class="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
          <UIcon name="i-material-symbols-account-balance-wallet" class="size-5" />
        </span>
        <span class="flex flex-col">
          <span class="text-sm font-semibold text-ink">{{ fondoActivo?.nombre ?? 'Sin fondo' }}</span>
          <span class="text-xs text-ink-muted capitalize">{{ fondoActivo?.tipo ?? '—' }} · {{ fondoActivo?.moneda_base ?? '' }}</span>
        </span>
      </span>
      <UIcon name="i-material-symbols-unfold-more" class="size-4 text-ink-muted" />
    </button>
  </UDropdownMenu>
</template>
