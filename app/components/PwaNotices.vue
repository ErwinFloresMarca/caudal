<script setup lang="ts">
const { $pwa } = useNuxtApp()
const online = useOnline()
</script>

<template>
  <div>
    <!-- Sin conexión: aviso claro, sin bloquear -->
    <div
      v-if="!online"
      class="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-semibold text-ink"
    >
      <UIcon name="i-material-symbols-cloud-off" class="size-5" />
      Sin conexión. No podrás registrar movimientos hasta reconectar.
    </div>

    <!-- Actualización disponible -->
    <div
      v-if="$pwa?.needRefresh"
      class="fixed inset-x-4 bottom-20 z-[70] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-border-strong bg-surface p-3 shadow-md lg:bottom-6"
    >
      <span class="text-sm text-ink">Hay una nueva versión de Caudal.</span>
      <button type="button" class="btn-primary h-10 px-4 text-sm" @click="$pwa?.updateServiceWorker(true)">
        Recargar
      </button>
    </div>

    <!-- Instalación (no intrusiva) -->
    <button
      v-if="$pwa?.showInstallPrompt"
      type="button"
      class="fixed right-4 bottom-20 z-[70] inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-md hover:bg-surface-hover lg:bottom-6"
      @click="$pwa?.install()"
    >
      <UIcon name="i-material-symbols-install-mobile" class="size-5 text-brand" />
      Instalar Caudal
    </button>
  </div>
</template>
