<script setup lang="ts">
import { getApiErrorMessage } from '../utils/api-errors';

defineOptions({
  name: 'HistoryPage',
});

definePageMeta({
  middleware: 'auth',
});

type HistoryItem = {
  transcriptionId: string;
  filename: string;
  status: string;
  audioKey: string;
  createdAt: string;
};

type HistoryResponse = {
  items: HistoryItem[];
  nextCursor: string | null;
};

const auth = useAuth();
const runtimeConfig = useRuntimeConfig();
const apiBaseUrl = computed(() => runtimeConfig.public.apiBaseUrl.replace(/\/$/, ''));
const items = ref<HistoryItem[]>([]);
const page = ref(1);
const nextCursor = ref<string | null>(null);
const previousCursors = ref<Array<string | null>>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const pageSize = 10;

const paginatedItems = computed(() => items.value);

const hasPreviousPage = computed(() => page.value > 1);
const hasNextPage = computed(() => Boolean(nextCursor.value));

const statusClasses: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  uploaded: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30',
  processing: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30',
};

const formattedDate = (value: string) => {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const loadHistory = async (cursor: string | null = null) => {
  errorMessage.value = '';

  if (!apiBaseUrl.value) {
    errorMessage.value = 'Set NUXT_PUBLIC_API_BASE_URL before loading your history.';
    return;
  }

  isLoading.value = true;

  try {
    const token = await auth.getIdToken();

    if (!token) {
      errorMessage.value = 'Sign in again before loading your history.';
      return;
    }

    const response = await $fetch<HistoryResponse>(`${apiBaseUrl.value}/transcriptions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: {
        limit: pageSize,
        cursor: cursor ?? undefined,
      },
    });

    items.value = response.items;
    nextCursor.value = response.nextCursor;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      'Could not load your transcription history.'
    );
  } finally {
    isLoading.value = false;
  }
};

const goToPreviousPage = async () => {
  if (!hasPreviousPage.value) {
    return;
  }

  const previousCursor = previousCursors.value.pop() ?? null;
  page.value -= 1;
  await loadHistory(previousCursor);
};

const goToNextPage = async () => {
  if (!hasNextPage.value || !nextCursor.value) {
    return;
  }

  previousCursors.value.push(page.value === 1 ? null : previousCursors.value.at(-1) ?? null);
  const cursorForNextPage = nextCursor.value;
  page.value += 1;
  await loadHistory(cursorForNextPage);
};

onMounted(async () => {
  await loadHistory();
});
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
                Browse audio files linked to your account and move through your archive page by page.
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isLoading"
                @click="loadHistory(page > 1 ? previousCursors.at(-1) ?? null : null)"
              >
                {{ isLoading ? 'Loading...' : 'Refresh' }}
              </button>
              <div class="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                Page {{ page }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="border-b border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </div>

        <div v-if="isLoading && paginatedItems.length === 0" class="px-6 py-12 text-center">
          <p class="text-base font-medium text-slate-200">Loading your history...</p>
          <p class="mt-2 text-sm text-slate-400">
            Fetching upload records linked to your account.
          </p>
        </div>

        <div v-else-if="paginatedItems.length > 0" class="divide-y divide-slate-800">
          <article
            v-for="item in paginatedItems"
            :key="item.transcriptionId"
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
                <span>ID: {{ item.transcriptionId }}</span>
                <span>Created: {{ formattedDate(item.createdAt) }}</span>
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
          <p class="text-base font-medium text-slate-200">No uploads yet</p>
          <p class="mt-2 text-sm text-slate-400">
            Upload an audio file from the dashboard to create your first history entry.
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
            Showing {{ paginatedItems.length }} item(s)
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
