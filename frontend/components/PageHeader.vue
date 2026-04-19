<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
    <p v-if="description" class="mt-1 text-sm text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
