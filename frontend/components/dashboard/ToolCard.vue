<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  title: string;
  description: string;
  icon: Component;
  to: string;
}>();
</script>

<template>
  <NuxtLink :to="to" class="group block">
    <Card class="h-full transition-colors hover:border-foreground/20 hover:bg-accent/50">
      <CardHeader class="pb-3">
        <div
          class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background"
        >
          <component :is="icon" class="h-5 w-5 text-foreground" />
        </div>
        <CardTitle class="text-base">{{ title }}</CardTitle>
        <CardDescription>{{ description }}</CardDescription>
      </CardHeader>
    </Card>
  </NuxtLink>
</template>
