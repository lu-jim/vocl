<script setup lang="ts">
import { computed, ref } from 'vue';
import { LogOut } from 'lucide-vue-next';

import { useAuth } from '~/composables/useAuth';

const auth = useAuth();
const logoutPending = ref(false);

const showAuthenticatedActions = computed(
  () => auth.hasResolvedInitialSession.value && auth.isAuthenticated.value
);

const handleLogout = async () => {
  logoutPending.value = true;
  try {
    await auth.logout();
    await navigateTo('/login');
  } finally {
    logoutPending.value = false;
  }
};
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground antialiased">
    <div class="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-8 flex items-center justify-between border-b border-border pb-6">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img
            src="/Vocali-logo.svg"
            alt="Vocali"
            class="h-8 w-auto"
          >
        </NuxtLink>

        <nav class="flex items-center gap-2">
          <template v-if="showAuthenticatedActions">
            <Button variant="ghost" as-child>
              <NuxtLink to="/dashboard">Dashboard</NuxtLink>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :disabled="logoutPending"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
            </Button>
          </template>

          <template v-else>
            <Button variant="ghost" as-child>
              <NuxtLink to="/login">Login</NuxtLink>
            </Button>
            <Button as-child>
              <NuxtLink to="/register">Register</NuxtLink>
            </Button>
          </template>
        </nav>
      </header>

      <main class="flex-1">
        <slot />
      </main>

      <footer class="mt-auto border-t border-border pt-6 text-sm text-muted-foreground">
        Vocali — Audio transcription platform
      </footer>
    </div>
  </div>
</template>
