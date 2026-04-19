<script setup lang="ts">
import { onMounted } from 'vue';

import { useAuth } from './composables/useAuth';

const auth = useAuth();

onMounted(async () => {
  if (!auth.hasResolvedInitialSession.value && !auth.isLoading.value) {
    await auth.loadUser();
  }
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
