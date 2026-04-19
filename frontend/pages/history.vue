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
  audioKey?: string;
  createdAt: string;
};

type HistoryResponse = {
  items: HistoryItem[];
  nextCursor: string | null;
};

type TranscriptModalState = {
  filename: string;
  content: string;
};

const auth = useAuth();
const runtimeConfig = useRuntimeConfig();
const apiBaseUrl = computed(() => runtimeConfig.public.apiBaseUrl.replace(/\/$/, ''));
const items = ref<HistoryItem[]>([]);
const page = ref(1);
const nextCursor = ref<string | null>(null);
const previousCursors = ref<Array<string | null>>([]);
const isLoading = ref(false);
const transcriptionInFlightId = ref<string | null>(null);
const transcriptActionId = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const transcriptModal = ref<TranscriptModalState | null>(null);
const pageSize = 10;
const HISTORY_POLL_INTERVAL_MS = 5000;

let historyRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const paginatedItems = computed(() => items.value);

const hasPreviousPage = computed(() => page.value > 1);
const hasNextPage = computed(() => Boolean(nextCursor.value));

const statusClasses: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  uploaded: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30',
  processing: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30',
};

const clearHistoryRefreshTimer = () => {
  if (historyRefreshTimer) {
    clearTimeout(historyRefreshTimer);
    historyRefreshTimer = null;
  }
};

const currentCursor = computed(() => {
  return page.value > 1 ? previousCursors.value.at(-1) ?? null : null;
});

const hasProcessingItems = computed(() => {
  return items.value.some((item) => item.status === 'processing');
});

const formattedDate = (value: string) => {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getTranscriptFilename = (filename: string) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const lastDotIndex = sanitized.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? sanitized.slice(0, lastDotIndex) : sanitized;

  return `${basename || 'transcript'}.txt`;
};

const getAuthToken = async () => {
  const token = await auth.getIdToken();

  if (!token) {
    throw new Error('Sign in again before continuing.');
  }

  return token;
};

const scheduleHistoryRefresh = () => {
  clearHistoryRefreshTimer();

  if (!hasProcessingItems.value) {
    return;
  }

  historyRefreshTimer = setTimeout(() => {
    void loadHistory(currentCursor.value, true);
  }, HISTORY_POLL_INTERVAL_MS);
};

const loadHistory = async (cursor: string | null = null, preserveSuccessMessage = false) => {
  clearHistoryRefreshTimer();
  errorMessage.value = '';

  if (!preserveSuccessMessage) {
    successMessage.value = '';
  }

  if (!apiBaseUrl.value) {
    errorMessage.value = 'Set NUXT_PUBLIC_API_BASE_URL before loading your history.';
    return;
  }

  isLoading.value = true;

  try {
    const token = await getAuthToken();

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
    scheduleHistoryRefresh();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      'Could not load your transcription history.'
    );
  } finally {
    isLoading.value = false;
  }
};

const startTranscription = async (item: HistoryItem) => {
  if (!apiBaseUrl.value || transcriptionInFlightId.value) {
    return;
  }

  transcriptionInFlightId.value = item.transcriptionId;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const token = await getAuthToken();

    await $fetch(`${apiBaseUrl.value}/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        transcriptionId: item.transcriptionId,
      },
    });

    successMessage.value = `Started transcription for ${item.filename}.`;
    await loadHistory(page.value > 1 ? previousCursors.value.at(-1) ?? null : null);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not start the transcription job.');
  } finally {
    transcriptionInFlightId.value = null;
  }
};

const fetchTranscript = async (item: HistoryItem, disposition: 'inline' | 'attachment') => {
  if (!apiBaseUrl.value || transcriptActionId.value) {
    return;
  }

  transcriptActionId.value = item.transcriptionId;
  errorMessage.value = '';

  try {
    const token = await getAuthToken();
    const response = await fetch(
      `${apiBaseUrl.value}/download/${encodeURIComponent(item.transcriptionId)}?disposition=${disposition}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const content = await response.text();

    if (!response.ok) {
      throw new Error(content || 'Could not load the transcript.');
    }

    if (disposition === 'inline') {
      transcriptModal.value = {
        filename: item.filename,
        content,
      };

      return;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = getTranscriptFilename(item.filename);
    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not load the transcript.');
  } finally {
    transcriptActionId.value = null;
  }
};

const viewTranscript = async (item: HistoryItem) => {
  await fetchTranscript(item, 'inline');
};

const downloadTranscript = async (item: HistoryItem) => {
  await fetchTranscript(item, 'attachment');
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

onBeforeUnmount(() => {
  clearHistoryRefreshTimer();
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

        <div
          v-if="successMessage"
          class="border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-200"
        >
          {{ successMessage }}
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
                :disabled="item.status !== 'completed' || Boolean(transcriptActionId)"
                @click="viewTranscript(item)"
              >
                {{
                  transcriptActionId === item.transcriptionId && item.status === 'completed'
                    ? 'Loading...'
                    : 'View'
                }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                :disabled="item.status !== 'completed' || Boolean(transcriptActionId)"
                @click="downloadTranscript(item)"
              >
                Download
              </button>
              <button
                v-if="item.status === 'uploaded'"
                type="button"
                class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="Boolean(transcriptionInFlightId)"
                @click="startTranscription(item)"
              >
                {{
                  transcriptionInFlightId === item.transcriptionId
                    ? 'Starting...'
                    : 'Start transcription'
                }}
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

      <div
        v-if="transcriptModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 py-10"
      >
        <div
          class="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60"
        >
          <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-white">Transcript preview</h2>
              <p class="text-sm text-slate-400">{{ transcriptModal.filename }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              @click="transcriptModal = null"
            >
              Close
            </button>
          </div>

          <div class="overflow-auto px-6 py-5">
            <pre class="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{{
              transcriptModal.content
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
