<script setup lang="ts">
defineOptions({
  name: 'DashboardPage',
});

definePageMeta({
  middleware: 'auth',
});

const { user, isAuthenticated, logout, isLoading, lastError } = useAuth();

const displayName = computed(() => {
  if (!user.value) {
    return 'Authenticated user';
  }

  const signInDetails = user.value.signInDetails as { loginId?: string } | undefined;
  return signInDetails?.loginId || user.value.username || 'Authenticated user';
});

const handleLogout = async () => {
  await logout();
  await navigateTo('/login');
};
</script>

<template>
  <main class="min-h-dvh bg-slate-950 px-6 py-12 text-slate-100">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header
        class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30 md:flex-row md:items-center md:justify-between"
      >
        <div class="space-y-2">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Vocali</p>
          <h1 class="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p class="max-w-2xl text-sm text-slate-300">
            Manage your recordings, track transcription jobs, and access your saved results from one
            place.
          </p>
        </div>

        <button
          class="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading"
          @click="handleLogout"
        >
          {{ isLoading ? 'Signing out...' : 'Sign out' }}
        </button>
      </header>

      <section class="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <article
          class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30"
        >
          <h2 class="text-lg font-semibold text-white">Session status</h2>

          <div class="mt-4 space-y-4 text-sm text-slate-300">
            <div class="flex items-center gap-3">
              <span
                class="inline-block h-3 w-3 rounded-full"
                :class="isAuthenticated ? 'bg-emerald-400' : 'bg-rose-400'"
              />
              <span>
                {{ isAuthenticated ? 'Authenticated' : 'Not authenticated' }}
              </span>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Current user</p>
              <p class="mt-2 text-base font-medium text-white">
                {{ displayName }}
              </p>
            </div>

            <div
              v-if="lastError"
              class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200"
            >
              {{ lastError }}
            </div>
          </div>
        </article>

        <aside
          class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30"
        >
          <h2 class="text-lg font-semibold text-white">Workspace overview</h2>

          <ul class="mt-4 space-y-3 text-sm text-slate-300">
            <li class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              Upload audio files to start new transcription jobs.
            </li>
            <li class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              Follow processing status and return to completed transcripts later.
            </li>
            <li class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              Review previous recordings and download finished transcriptions from your history.
            </li>
          </ul>
        </aside>
      </section>

      <AudioUploader />
      <RealtimeRecorder />

      <section
        class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-white">Your tools</h2>
            <p class="mt-1 text-sm text-slate-300">
              Use your dashboard to move between active jobs, saved transcripts, and future realtime
              recording features.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <NuxtLink
              to="/history"
              class="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-500/20"
            >
              View history
            </NuxtLink>

            <NuxtLink
              to="/"
              class="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-700"
            >
              Back to home
            </NuxtLink>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Upload</p>
            <p class="mt-2 text-sm text-slate-300">
              Start a transcription by uploading an audio file from your device.
            </p>
          </div>

          <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">History</p>
            <p class="mt-2 text-sm text-slate-300">
              Browse your previous transcription jobs and open completed results.
            </p>
          </div>

          <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Realtime</p>
            <p class="mt-2 text-sm text-slate-300">
              Capture speech from your microphone for live transcription sessions.
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
