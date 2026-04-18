<script setup lang="ts">
defineOptions({
  name: 'HistoryPage',
});

definePageMeta({
  middleware: 'auth',
});

const items = [
  {
    id: '01JHISTORY001',
    filename: 'team-sync.mp3',
    status: 'completed',
    createdAt: '2026-04-16 09:30',
  },
  {
    id: '01JHISTORY002',
    filename: 'customer-call.wav',
    status: 'processing',
    createdAt: '2026-04-16 08:10',
  },
  {
    id: '01JHISTORY003',
    filename: 'notes.m4a',
    status: 'failed',
    createdAt: '2026-04-15 18:42',
  },
];

const page = ref(1);
const pageSize = 10;

const paginatedItems = computed(() => {
  const start = (page.value - 1) * pageSize;
  return items.slice(start, start + pageSize);
});

const hasPreviousPage = computed(() => page.value > 1);
const hasNextPage = computed(() => items.length > page.value * pageSize);

const statusClasses: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  processing: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30',
};

const goToPreviousPage = () => {
  if (hasPreviousPage.value) {
    page.value -= 1;
  }
};

const goToNextPage = () => {
  if (hasNextPage.value) {
    page.value += 1;
  }
};
</script>

<template>
  <main class="min-h-dvh bg-slate-950 text-slate-100">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <p class="text-sm font-medium uppercase tracking-[0.24em] text-cyan-300">Your library</p>
          <h1 class="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Transcription history
          </h1>
          <p class="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Review your recent recordings and uploads, keep track of processing status, and return
            to completed transcripts whenever you need them.
          </p>
        </div>

        <NuxtLink
          to="/dashboard"
          class="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
        >
          Back to dashboard
        </NuxtLink>
      </header>

      <section
        class="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/30"
      >
        <div class="border-b border-slate-800 px-6 py-5">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-white">Recent transcriptions</h2>
              <p class="text-sm text-slate-400">
                Browse your most recent transcription jobs and move through your archive page by
                page.
              </p>
            </div>

            <div class="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              Page {{ page }}
            </div>
          </div>
        </div>

        <div v-if="paginatedItems.length > 0" class="divide-y divide-slate-800">
          <article
            v-for="item in paginatedItems"
            :key="item.id"
            class="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
          >
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-base font-medium text-white">
                  {{ item.filename }}
                </h3>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                  :class="statusClasses[item.status]"
                >
                  {{ item.status }}
                </span>
              </div>

              <div class="flex flex-col gap-1 text-sm text-slate-400 md:flex-row md:gap-4">
                <span>ID: {{ item.id }}</span>
                <span>Created: {{ item.createdAt }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                disabled
              >
                View
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                disabled
              >
                Download
              </button>
            </div>
          </article>
        </div>

        <div v-else class="px-6 py-12 text-center">
          <p class="text-base font-medium text-slate-200">No transcriptions yet</p>
          <p class="mt-2 text-sm text-slate-400">
            Upload and transcribe an audio file to see entries here.
          </p>
        </div>

        <footer class="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!hasPreviousPage"
            @click="goToPreviousPage"
          >
            Previous
          </button>

          <span class="text-sm text-slate-400">
            Showing {{ paginatedItems.length }} of {{ items.length }} item(s)
          </span>

          <button
            type="button"
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!hasNextPage"
            @click="goToNextPage"
          >
            Next
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
