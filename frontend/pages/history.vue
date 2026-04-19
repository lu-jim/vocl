<script setup lang="ts">
import { RefreshCw, Eye, Download, Play, X, ChevronLeft, ChevronRight } from 'lucide-vue-next';

import type { HistoryItem, HistoryResponse } from '~/types/api';
import { useApi } from '~/composables/useApi';
import { useMessages } from '~/composables/useMessages';
import { getTranscriptFilename } from '~/utils/audio';
import { formatDate } from '~/utils/format';
import { getApiErrorMessage } from '~/utils/api-errors';

defineOptions({
  name: 'HistoryPage',
});

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

useSeoMeta({
  title: 'History | Vocali',
  description: 'View and manage your transcription history.',
});

type TranscriptModalState = {
  filename: string;
  content: string;
};

const api = useApi();
const { errorMessage, successMessage, setError, setSuccess, clearMessages } = useMessages();

const items = ref<HistoryItem[]>([]);
const page = ref(1);
const nextCursor = ref<string | null>(null);
const previousCursors = ref<Array<string | null>>([]);
const isLoading = ref(false);
const transcriptionInFlightId = ref<string | null>(null);
const transcriptActionId = ref<string | null>(null);
const transcriptModal = ref<TranscriptModalState | null>(null);
const pageSize = 10;
const HISTORY_POLL_INTERVAL_MS = 5000;

let historyRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const paginatedItems = computed(() => items.value);
const hasPreviousPage = computed(() => page.value > 1);
const hasNextPage = computed(() => Boolean(nextCursor.value));

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

const scheduleHistoryRefresh = () => {
  clearHistoryRefreshTimer();
  if (!hasProcessingItems.value) return;
  historyRefreshTimer = setTimeout(() => {
    void loadHistory(currentCursor.value, true);
  }, HISTORY_POLL_INTERVAL_MS);
};

const loadHistory = async (cursor: string | null = null, preserveSuccessMessage = false) => {
  clearHistoryRefreshTimer();
  if (!preserveSuccessMessage) clearMessages();
  else {
    // Only clear error, keep success
  }

  if (!api.isConfigured.value) {
    setError('Set NUXT_PUBLIC_API_BASE_URL before loading your history.');
    return;
  }

  isLoading.value = true;

  try {
    const response = await api.fetch<HistoryResponse>('/transcriptions', {
      query: { limit: pageSize, cursor: cursor ?? undefined },
    });

    items.value = response.items;
    nextCursor.value = response.nextCursor;
    scheduleHistoryRefresh();
  } catch (error) {
    setError(getApiErrorMessage(error, 'Could not load your transcription history.'));
  } finally {
    isLoading.value = false;
  }
};

const startTranscription = async (item: HistoryItem) => {
  if (!api.isConfigured.value || transcriptionInFlightId.value) return;

  transcriptionInFlightId.value = item.transcriptionId;
  clearMessages();

  try {
    await api.fetch('/transcribe', {
      method: 'POST',
      body: { transcriptionId: item.transcriptionId },
    });

    setSuccess(`Started transcription for ${item.filename}.`);
    await loadHistory(page.value > 1 ? previousCursors.value.at(-1) ?? null : null);
  } catch (error) {
    setError(getApiErrorMessage(error, 'Could not start the transcription job.'));
  } finally {
    transcriptionInFlightId.value = null;
  }
};

const fetchTranscript = async (item: HistoryItem, disposition: 'inline' | 'attachment') => {
  if (!api.isConfigured.value || transcriptActionId.value) return;

  transcriptActionId.value = item.transcriptionId;

  try {
    const response = await api.fetchRaw(
      `/download/${encodeURIComponent(item.transcriptionId)}?disposition=${disposition}`
    );

    const content = await response.text();
    if (!response.ok) throw new Error(content || 'Could not load the transcript.');

    if (disposition === 'inline') {
      transcriptModal.value = { filename: item.filename, content };
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
    setError(getApiErrorMessage(error, 'Could not load the transcript.'));
  } finally {
    transcriptActionId.value = null;
  }
};

const viewTranscript = (item: HistoryItem) => fetchTranscript(item, 'inline');
const downloadTranscript = (item: HistoryItem) => fetchTranscript(item, 'attachment');

const goToPreviousPage = async () => {
  if (!hasPreviousPage.value) return;
  const previousCursor = previousCursors.value.pop() ?? null;
  page.value -= 1;
  await loadHistory(previousCursor);
};

const goToNextPage = async () => {
  if (!hasNextPage.value || !nextCursor.value) return;
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
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader
        title="Transcription History"
        description="Review your recent recordings, track processing status, and access completed transcripts."
      />
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="isLoading"
          @click="loadHistory(page > 1 ? previousCursors.at(-1) ?? null : null)"
        >
          <RefreshCw :class="['mr-2 h-4 w-4', isLoading && 'animate-spin']" />
          Refresh
        </Button>
        <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Page {{ page }}
        </span>
      </div>
    </div>

    <AlertMessage v-if="errorMessage" variant="error">
      {{ errorMessage }}
    </AlertMessage>

    <AlertMessage v-if="successMessage" variant="success">
      {{ successMessage }}
    </AlertMessage>

    <Card>
      <CardHeader>
        <CardTitle>Recent transcriptions</CardTitle>
        <CardDescription>
          Browse audio files linked to your account and move through your archive.
        </CardDescription>
      </CardHeader>

      <CardContent class="p-0">
        <div v-if="isLoading && paginatedItems.length === 0" class="py-12 text-center">
          <p class="font-medium">Loading your history...</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Fetching upload records linked to your account.
          </p>
        </div>

        <div v-else-if="paginatedItems.length === 0" class="py-12 text-center">
          <p class="font-medium">No uploads yet</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Upload an audio file to create your first history entry.
          </p>
          <Button class="mt-4" variant="outline" as-child>
            <NuxtLink to="/transcribe">Upload audio</NuxtLink>
          </Button>
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="item in paginatedItems"
            :key="item.transcriptionId"
            class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ item.filename }}</span>
                <StatusBadge :status="item.status" />
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>ID: {{ item.transcriptionId }}</span>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="item.status !== 'completed' || Boolean(transcriptActionId)"
                @click="viewTranscript(item)"
              >
                <Eye class="mr-2 h-4 w-4" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="item.status !== 'completed' || Boolean(transcriptActionId)"
                @click="downloadTranscript(item)"
              >
                <Download class="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                v-if="item.status === 'uploaded'"
                size="sm"
                :disabled="Boolean(transcriptionInFlightId)"
                @click="startTranscription(item)"
              >
                <Play class="mr-2 h-4 w-4" />
                {{ transcriptionInFlightId === item.transcriptionId ? 'Starting...' : 'Transcribe' }}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex items-center justify-between border-t">
        <Button
          variant="outline"
          size="sm"
          :disabled="!hasPreviousPage"
          @click="goToPreviousPage"
        >
          <ChevronLeft class="mr-2 h-4 w-4" />
          Previous
        </Button>

        <span class="text-sm text-muted-foreground">
          {{ paginatedItems.length }} item(s)
        </span>

        <Button
          variant="outline"
          size="sm"
          :disabled="!hasNextPage"
          @click="goToNextPage"
        >
          Next
          <ChevronRight class="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>

    <div
      v-if="transcriptModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="transcriptModal = null"
    >
      <Card class="flex max-h-[80vh] w-full max-w-3xl flex-col">
        <CardHeader class="flex-row items-center justify-between space-y-0 border-b">
          <div>
            <CardTitle>Transcript preview</CardTitle>
            <CardDescription>{{ transcriptModal.filename }}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" @click="transcriptModal = null">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="flex-1 overflow-auto">
          <pre class="whitespace-pre-wrap break-words text-sm leading-6">{{ transcriptModal.content }}</pre>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
