<script setup lang="ts">
defineProps<{ titulo: string; descripcion?: string }>()
</script>

<template>
  <section>
    <h1 class="hs-1">{{ titulo }}</h1>
    <div class="card mt-6 flex flex-col items-center justify-center p-10 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-muted">
        <UIcon name="i-material-symbols-construction" class="size-6 text-ink-faint" />
      </span>
      <p class="mt-3 text-ink-muted">{{ descripcion ?? 'Pantalla en construcción.' }}</p>
    </div>
  </section>
</template>
