<script setup lang="ts">
import { Mic, Square, Save, Trash2 } from 'lucide-vue-next';

import { LiveWaveform } from '~/components/elevenlabs-ui/live-waveform';
import type { RealtimeTokenResponse, RealtimeSaveResponse } from '~/types/api';
import { useApi } from '~/composables/useApi';
import { useMessages } from '~/composables/useMessages';
import { hasBrowserAudioSupport, float32ToInt16 } from '~/utils/audio';
import { getApiErrorMessage } from '~/utils/api-errors';

defineOptions({
  name: 'RecordPage',
});

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

type RecorderState = 'idle' | 'requesting' | 'connecting' | 'recording' | 'stopping';
type RealtimeMessage = {
  message: string;
  metadata?: {
    transcript?: string;
  };
  reason?: string;
};
type RealtimeClientLike = {
  addEventListener: (eventName: 'receiveMessage', listener: (event: { data: RealtimeMessage }) => void) => void;
  start: (jwt: string, options: unknown) => Promise<unknown>;
  stopRecognition: (options: { noTimeout: true }) => Promise<unknown>;
  sendAudio: (buffer: ArrayBufferLike) => void;
};
type E2ERealtimeHook = {
  sampleRate?: number;
  createClient?: () => RealtimeClientLike;
};

const api = useApi();
const { errorMessage, setError, clearMessages } = useMessages();

const recorderState = ref<RecorderState>('idle');
const partialTranscript = ref('');
const finalTranscripts = ref<string[]>([]);
const sessionMessage = ref('Click the button below to start recording.');
const language = ref('en');
const saveTitle = ref('');
const isSaving = ref(false);

const isBusy = computed(() => recorderState.value === 'requesting' || recorderState.value === 'connecting');
const isRecording = computed(() => recorderState.value === 'recording');
const isStopping = computed(() => recorderState.value === 'stopping');
const canSave = computed(
  () =>
    finalTranscripts.value.length > 0 &&
    !isRecording.value &&
    !isBusy.value &&
    !isStopping.value &&
    !isSaving.value
);

let client: RealtimeClientLike | null = null;
let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let processorNode: ScriptProcessorNode | null = null;
let silentGainNode: GainNode | null = null;

const resetAudioGraph = () => {
  processorNode?.disconnect();
  sourceNode?.disconnect();
  silentGainNode?.disconnect();
  processorNode = null;
  sourceNode = null;
  silentGainNode = null;
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
};

const resetRealtimeClient = () => {
  client = null;
};

const getE2ERealtimeHook = (): E2ERealtimeHook | null => {
  if (!import.meta.client) {
    return null;
  }

  const browserWindow = window as Window & typeof globalThis & {
    __VOCALI_E2E_REALTIME__?: E2ERealtimeHook;
  };

  return browserWindow.__VOCALI_E2E_REALTIME__ ?? null;
};

const fetchRealtimeToken = async () => {
  return await api.fetch<RealtimeTokenResponse>('/realtime/token');
};

const saveRealtimeTranscript = async () => {
  return await api.fetch<RealtimeSaveResponse>('/realtime/save', {
    method: 'POST',
    body: {
      transcript: finalTranscripts.value.join('\n'),
      title: saveTitle.value.trim() || undefined,
      language: language.value,
    },
  });
};

const setupAudioCapture = async () => {
  const e2eRealtimeHook = getE2ERealtimeHook();

  if (e2eRealtimeHook?.sampleRate) {
    return e2eRealtimeHook.sampleRate;
  }

  if (!hasBrowserAudioSupport()) {
    throw new Error('This browser does not expose the microphone APIs required for realtime transcription.');
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const browserWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const BrowserAudioContext = browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!BrowserAudioContext) throw new Error('This browser does not support realtime audio capture.');

  audioContext = new BrowserAudioContext();
  await audioContext.resume();

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  processorNode = audioContext.createScriptProcessor(4096, 1, 1);
  silentGainNode = audioContext.createGain();
  silentGainNode.gain.value = 0;

  processorNode.onaudioprocess = (event) => {
    if (!client || recorderState.value !== 'recording') return;
    const channelData = event.inputBuffer.getChannelData(0);
    const pcmChunk = float32ToInt16(channelData);
    try {
      client.sendAudio(pcmChunk.buffer);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not stream microphone audio.'));
      sessionMessage.value = 'Realtime transcription stopped.';
      recorderState.value = 'idle';
      resetAudioGraph();
      resetRealtimeClient();
    }
  };

  sourceNode.connect(processorNode);
  processorNode.connect(silentGainNode);
  silentGainNode.connect(audioContext.destination);

  return audioContext.sampleRate;
};

const appendFinalTranscript = (transcript: string) => {
  if (!transcript.trim()) return;
  finalTranscripts.value = [...finalTranscripts.value, transcript.trim()];
};

const attachClientEvents = (realtimeClient: RealtimeClientLike) => {
  realtimeClient.addEventListener('receiveMessage', ({ data }: { data: RealtimeMessage }) => {
    if (data.message === 'AddPartialTranscript') {
      partialTranscript.value = data.metadata?.transcript ?? '';
      return;
    }
    if (data.message === 'AddTranscript') {
      appendFinalTranscript(data.metadata?.transcript ?? '');
      partialTranscript.value = '';
      return;
    }
    if (data.message === 'EndOfTranscript') {
      partialTranscript.value = '';
      sessionMessage.value = 'Recording session finished.';
      recorderState.value = 'idle';
      resetAudioGraph();
      resetRealtimeClient();
      return;
    }
    if (data.message === 'Error') {
      setError(data.reason ?? 'Realtime transcription failed.');
      sessionMessage.value = 'Realtime transcription stopped.';
      recorderState.value = 'idle';
      resetAudioGraph();
      resetRealtimeClient();
    }
  });
};

const startRecording = async () => {
  if (isBusy.value || isRecording.value) return;

  recorderState.value = 'requesting';
  clearMessages();
  sessionMessage.value = 'Creating a realtime session...';

  try {
    const e2eRealtimeHook = getE2ERealtimeHook();
    const session = await fetchRealtimeToken();
    const websocketUrl = new URL(session.websocketUrl);
    const jwt = session.jwt || websocketUrl.searchParams.get('jwt');
    if (!jwt) throw new Error('Realtime session token is missing.');

    const sampleRate = await setupAudioCapture();
    if (e2eRealtimeHook?.createClient) {
      client = e2eRealtimeHook.createClient();
    } else {
      const { RealtimeClient } = await import('@speechmatics/real-time-client');
      client = new RealtimeClient({ url: `${websocketUrl.origin}${websocketUrl.pathname}` }) as unknown as RealtimeClientLike;
    }
    if (!client) {
      throw new Error('Realtime client could not be created.');
    }
    attachClientEvents(client);

    recorderState.value = 'connecting';
    sessionMessage.value = 'Connecting to Speechmatics...';

    await client.start(jwt, {
      audio_format: { type: 'raw', encoding: 'pcm_s16le', sample_rate: sampleRate },
      transcription_config: { language: language.value, enable_partials: true, max_delay: 0.7 },
    });

    recorderState.value = 'recording';
    sessionMessage.value = 'Listening...';
  } catch (error) {
    recorderState.value = 'idle';
    resetAudioGraph();
    resetRealtimeClient();
    setError(getApiErrorMessage(error, 'Could not start realtime transcription right now.'));
    sessionMessage.value = 'Click the button below to try again.';
  }
};

const stopRecording = async () => {
  if (!client || (!isRecording.value && !isBusy.value)) return;

  recorderState.value = 'stopping';
  sessionMessage.value = 'Finishing the session...';
  resetAudioGraph();

  try {
    await client.stopRecognition({ noTimeout: true });
  } catch (error) {
    setError(getApiErrorMessage(error, 'Could not stop the realtime session cleanly.'));
    recorderState.value = 'idle';
    resetRealtimeClient();
    sessionMessage.value = 'Recording stopped.';
  }
};

const clearTranscript = () => {
  partialTranscript.value = '';
  finalTranscripts.value = [];
  clearMessages();
  saveTitle.value = '';
  sessionMessage.value = 'Click the button below to start recording.';
};

const saveTranscript = async () => {
  if (!canSave.value) return;

  isSaving.value = true;
  clearMessages();

  try {
    const response = await saveRealtimeTranscript();
    sessionMessage.value = `Saved transcript as ${response.filename}. View it from history.`;
  } catch (error) {
    setError(getApiErrorMessage(error, 'Could not save the live transcript.'));
  } finally {
    isSaving.value = false;
  }
};

onBeforeUnmount(() => {
  if (client && (isRecording.value || isStopping.value)) {
    void client.stopRecognition({ noTimeout: true }).catch(() => undefined);
  }
  resetAudioGraph();
  resetRealtimeClient();
});
</script>

<template>
  <div data-testid="record-page" class="space-y-6">
    <PageHeader
      title="Live Recording"
      description="Record from your microphone and get real-time transcription."
    />

    <div class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Microphone</CardTitle>
            <CardDescription>{{ sessionMessage }}</CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            <div class="rounded-lg border border-border bg-muted/50 p-4">
              <LiveWaveform
                :active="isRecording"
                :processing="isBusy"
                :height="80"
                :bar-width="3"
                :bar-gap="2"
                mode="static"
                :fade-edges="true"
                bar-color="currentColor"
                class="text-foreground"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                v-if="!isRecording && !isStopping"
                data-testid="record-start-button"
                :disabled="isBusy || !api.isConfigured.value"
                @click="startRecording"
              >
                <Mic class="mr-2 h-4 w-4" />
                {{ isBusy ? 'Starting...' : 'Start recording' }}
              </Button>

              <Button
                v-if="isRecording || isStopping"
                data-testid="record-stop-button"
                variant="destructive"
                :disabled="isStopping"
                @click="stopRecording"
              >
                <Square class="mr-2 h-4 w-4" />
                {{ isStopping ? 'Stopping...' : 'Stop' }}
              </Button>

              <Button
                data-testid="record-clear-button"
                variant="outline"
                :disabled="isRecording || isBusy || isStopping"
                @click="clearTranscript"
              >
                <Trash2 class="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>

            <AlertMessage v-if="!api.isConfigured.value" data-testid="record-config-warning" variant="warning">
              Set <code class="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs">NUXT_PUBLIC_API_BASE_URL</code> to enable recording.
            </AlertMessage>

            <AlertMessage v-if="errorMessage" data-testid="record-error" variant="error">
              {{ errorMessage }}
            </AlertMessage>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Language</label>
              <select
                v-model="language"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isRecording || isBusy || isStopping"
              >
                <option value="en">English</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Title (optional)</label>
              <Input
                v-model="saveTitle"
                data-testid="record-title-input"
                type="text"
                maxlength="120"
                placeholder="Name your transcript"
                :disabled="isRecording || isBusy || isStopping || isSaving"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Live preview</CardTitle>
            <CardDescription>Shows what you're saying in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <p data-testid="record-partial-transcript" class="min-h-16 text-sm text-muted-foreground">
              {{ partialTranscript || 'Start recording to see live transcription...' }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card class="flex flex-col">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Finalized segments appear here as speech is confirmed.
              </CardDescription>
            </div>
            <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {{ finalTranscripts.length }} segment(s)
            </span>
          </div>
        </CardHeader>

        <CardContent class="flex-1">
          <div
            data-testid="record-final-transcripts"
            class="h-full max-h-96 min-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-4"
          >
            <div v-if="finalTranscripts.length === 0" class="text-sm text-muted-foreground">
              Start a recording session to see finalized transcript segments here.
            </div>

            <ol v-else class="space-y-3">
              <li
                v-for="(segment, index) in finalTranscripts"
                :key="`${index}-${segment}`"
                class="rounded-lg border border-border bg-background p-3 text-sm"
              >
                {{ segment }}
              </li>
            </ol>
          </div>
        </CardContent>

        <CardFooter>
          <Button data-testid="record-save-button" :disabled="!canSave" @click="saveTranscript">
            <Save class="mr-2 h-4 w-4" />
            {{ isSaving ? 'Saving...' : 'Save to history' }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
