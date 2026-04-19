<template>
  <div class="min-h-dvh bg-slate-950 text-slate-100 antialiased">
    <NuxtRouteAnnouncer />
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header
        class="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Vocali</p>
          <h1 class="text-2xl font-semibold text-white">Audio transcription platform</h1>
          <p class="mt-1 text-sm text-slate-400">
            Record, upload, and manage voice transcriptions in one place.
          </p>
        </div>

        <ClientOnly>
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <template v-if="isLoading">
              <span
                class="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300"
              >
                Checking session...
              </span>
            </template>

            <template v-else-if="isAuthenticated">
              <span
                class="inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950/70 px-3 py-1 text-emerald-300"
              >
                Signed in{{ userLabel ? ` as ${userLabel}` : '' }}
              </span>

              <nav class="flex flex-wrap items-center gap-2">
                <NuxtLink
                  to="/dashboard"
                  class="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-cyan-500 hover:text-white"
                >
                  Dashboard
                </NuxtLink>
                <NuxtLink
                  to="/history"
                  class="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-cyan-500 hover:text-white"
                >
                  History
                </NuxtLink>
                <button
                  type="button"
                  class="rounded-lg bg-cyan-500 px-3 py-2 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="logoutPending"
                  @click="handleLogout"
                >
                  {{ logoutPending ? 'Signing out...' : 'Logout' }}
                </button>
              </nav>
            </template>

            <template v-else>
              <nav class="flex flex-wrap items-center gap-2">
                <NuxtLink
                  to="/login"
                  class="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-cyan-500 hover:text-white"
                >
                  Login
                </NuxtLink>
                <NuxtLink
                  to="/register"
                  class="rounded-lg bg-cyan-500 px-3 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
                >
                  Register
                </NuxtLink>
              </nav>
            </template>
          </div>

          <template #fallback>
            <div class="flex flex-wrap items-center gap-3 text-sm">
              <span
                class="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300"
              >
                Checking session...
              </span>
            </div>
          </template>
        </ClientOnly>
      </header>

      <main class="flex-1">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useAuth } from './composables/useAuth';

const auth = useAuth();
const logoutPending = ref(false);

const isLoading = computed(() => auth.isLoading.value);
const isAuthenticated = computed(() => auth.isAuthenticated.value);
const userLabel = computed(() => {
  const signInDetails = auth.user.value?.signInDetails as { loginId?: string } | undefined;
  return signInDetails?.loginId ?? auth.user.value?.username ?? '';
});

onMounted(async () => {
  await auth.loadUser();
});

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
