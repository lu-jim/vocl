<script setup lang="ts">
import type { RealtimeClient as RealtimeClientType, ReceiveMessageEvent } from '@speechmatics/real-time-client';

import { getApiErrorMessage } from '../utils/api-errors';

defineOptions({
  name: 'RealtimeRecorder',
});

type RealtimeTokenResponse = {
  jwt: string;
  websocketUrl: string;
  expiresInSeconds: number;
};

type RealtimeSaveResponse = {
  message: string;
  transcriptionId: string;
  transcriptKey: string;
  filename: string;
  status: string;
};

type RecorderState = 'idle' | 'requesting' | 'connecting' | 'recording' | 'stopping';

const auth = useAuth();
const runtimeConfig = useRuntimeConfig();
const apiBaseUrl = computed(() => runtimeConfig.public.apiBaseUrl.replace(/\/$/, ''));

const recorderState = ref<RecorderState>('idle');
const partialTranscript = ref('');
const finalTranscripts = ref<string[]>([]);
const errorMessage = ref('');
const sessionMessage = ref('Open your microphone to start live transcription.');
const language = ref('en');
const saveTitle = ref('');
const isSaving = ref(false);

const isBusy = computed(() => recorderState.value === 'requesting' || recorderState.value === 'connecting');
const isRecording = computed(() => recorderState.value === 'recording');
const isStopping = computed(() => recorderState.value === 'stopping');
const canStop = computed(() => recorderState.value === 'recording' || recorderState.value === 'stopping');
const canSave = computed(
  () =>
    finalTranscripts.value.length > 0 &&
    !isRecording.value &&
    !isBusy.value &&
    !isStopping.value &&
    !isSaving.value
);
const hasBrowserSupport = () => {
  if (!import.meta.client) {
    return false;
  }

  const browserWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

  return Boolean(
    (browserWindow.AudioContext || browserWindow.webkitAudioContext) &&
      navigator.mediaDevices?.getUserMedia
  );
};

let client: RealtimeClientType | null = null;
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

const getIdToken = async () => {
  const token = await auth.getIdToken();

  if (!token) {
    throw new Error('Sign in again before starting realtime transcription.');
  }

  return token;
};

const fetchRealtimeToken = async () => {
  if (!apiBaseUrl.value) {
    throw new Error('Set NUXT_PUBLIC_API_BASE_URL before starting realtime transcription.');
  }

  const token = await getIdToken();

  return await $fetch<RealtimeTokenResponse>(`${apiBaseUrl.value}/realtime/token`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const saveRealtimeTranscript = async () => {
  if (!apiBaseUrl.value) {
    throw new Error('Set NUXT_PUBLIC_API_BASE_URL before saving realtime transcription.');
  }

  const token = await getIdToken();

  return await $fetch<RealtimeSaveResponse>(`${apiBaseUrl.value}/realtime/save`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      transcript: finalTranscripts.value.join('\n'),
      title: saveTitle.value.trim() || undefined,
      language: language.value,
    },
  });
};

const float32ToInt16 = (input: Float32Array) => {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
};

const setupAudioCapture = async () => {
  if (!hasBrowserSupport()) {
    throw new Error(
      'This browser does not expose the microphone APIs required for realtime transcription.'
    );
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const browserWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const BrowserAudioContext = browserWindow.AudioContext || browserWindow.webkitAudioContext;

  if (!BrowserAudioContext) {
    throw new Error('This browser does not support realtime audio capture.');
  }

  audioContext = new BrowserAudioContext();
  await audioContext.resume();

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  processorNode = audioContext.createScriptProcessor(4096, 1, 1);
  silentGainNode = audioContext.createGain();
  silentGainNode.gain.value = 0;

  processorNode.onaudioprocess = (event) => {
    if (!client || recorderState.value !== 'recording') {
      return;
    }

    const channelData = event.inputBuffer.getChannelData(0);
    const pcmChunk = float32ToInt16(channelData);

    try {
      client.sendAudio(pcmChunk.buffer);
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Could not stream microphone audio.');
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
  if (!transcript.trim()) {
    return;
  }

  finalTranscripts.value = [...finalTranscripts.value, transcript.trim()];
};

const attachClientEvents = (realtimeClient: RealtimeClientType) => {
  realtimeClient.addEventListener('receiveMessage', ({ data }: ReceiveMessageEvent) => {
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
      sessionMessage.value = 'Realtime session finished.';
      recorderState.value = 'idle';
      resetAudioGraph();
      resetRealtimeClient();
      return;
    }

    if (data.message === 'Error') {
      errorMessage.value = data.reason ?? 'Realtime transcription failed.';
      sessionMessage.value = 'Realtime transcription stopped.';
      recorderState.value = 'idle';
      resetAudioGraph();
      resetRealtimeClient();
    }
  });
};

const startRecording = async () => {
  if (isBusy.value || isRecording.value) {
    return;
  }

  recorderState.value = 'requesting';
  errorMessage.value = '';
  sessionMessage.value = 'Creating a realtime session...';

  try {
    const { RealtimeClient } = await import('@speechmatics/real-time-client');
    const session = await fetchRealtimeToken();
    const websocketUrl = new URL(session.websocketUrl);
    const jwt = session.jwt || websocketUrl.searchParams.get('jwt');

    if (!jwt) {
      throw new Error('Realtime session token is missing.');
    }

    const sampleRate = await setupAudioCapture();

    client = new RealtimeClient({
      url: `${websocketUrl.origin}${websocketUrl.pathname}`,
    });

    attachClientEvents(client);

    recorderState.value = 'connecting';
    sessionMessage.value = 'Connecting to Speechmatics...';

    await client.start(jwt, {
      audio_format: {
        type: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: sampleRate,
      },
      transcription_config: {
        language: language.value,
        enable_partials: true,
        max_delay: 0.7,
      },
    });

    recorderState.value = 'recording';
    sessionMessage.value = 'Listening for live speech...';
  } catch (error) {
    recorderState.value = 'idle';
    resetAudioGraph();
    resetRealtimeClient();
    errorMessage.value = getApiErrorMessage(
      error,
      'Could not start realtime transcription right now.'
    );
    sessionMessage.value = 'Open your microphone to try again.';
  }
};

const stopRecording = async () => {
  if (!client || (!isRecording.value && !isBusy.value)) {
    return;
  }

  recorderState.value = 'stopping';
  sessionMessage.value = 'Finishing the realtime session...';
  resetAudioGraph();

  try {
    await client.stopRecognition({
      noTimeout: true,
    });
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not stop the realtime session cleanly.');
    recorderState.value = 'idle';
    resetRealtimeClient();
    sessionMessage.value = 'Realtime transcription stopped.';
  }
};

const clearTranscript = () => {
  partialTranscript.value = '';
  finalTranscripts.value = [];
  errorMessage.value = '';
  saveTitle.value = '';
  sessionMessage.value = 'Open your microphone to start live transcription.';
};

const saveTranscript = async () => {
  if (!canSave.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const response = await saveRealtimeTranscript();
    sessionMessage.value = `Saved transcript as ${response.filename}. View it from history.`;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Could not save the live transcript.');
  } finally {
    isSaving.value = false;
  }
};

onBeforeUnmount(() => {
  if (client && (isRecording.value || isStopping.value)) {
    void client.stopRecognition({
      noTimeout: true,
    }).catch(() => undefined);
  }

  resetAudioGraph();
  resetRealtimeClient();
});
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">Realtime transcription</h2>
        <p class="mt-1 text-sm text-slate-300">
          Stream your microphone directly to Speechmatics with a short-lived session token from
          Vocali.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isBusy || isRecording"
          @click="startRecording"
        >
          {{
            isBusy
              ? 'Starting...'
              : isRecording
                ? 'Recording'
                : 'Start microphone'
          }}
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canStop"
          @click="stopRecording"
        >
          {{ isStopping ? 'Stopping...' : 'Stop' }}
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-700"
          @click="clearTranscript"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div class="space-y-4">
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Connection state</p>
          <p class="mt-2 text-sm font-medium text-white">
            {{ sessionMessage }}
          </p>
        </div>

        <div
          v-if="errorMessage"
          class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </div>

        <label class="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-[0.2em] text-slate-400">Language</span>
          <select
            v-model="language"
            class="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
            :disabled="isRecording || isBusy || isStopping"
          >
            <option value="en">English</option>
          </select>
        </label>

        <label class="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-[0.2em] text-slate-400">Save title</span>
          <input
            v-model="saveTitle"
            type="text"
            maxlength="120"
            placeholder="Optional transcript name"
            class="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
            :disabled="isRecording || isBusy || isStopping || isSaving"
          >
        </label>

        <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Live partial</p>
          <p class="mt-3 min-h-16 text-sm leading-6 text-slate-200">
            {{ partialTranscript || 'Partial transcript will appear here while you speak.' }}
          </p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Final transcript</p>
            <p class="mt-1 text-sm text-slate-300">
              Finalized segments are appended here as Speechmatics confirms them.
            </p>
          </div>
          <span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            {{ finalTranscripts.length }} segment(s)
          </span>
        </div>

        <div class="mt-4 max-h-96 overflow-auto rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <div v-if="finalTranscripts.length === 0" class="text-sm text-slate-400">
            Start a realtime session to see finalized transcript segments here.
          </div>

          <ol v-else class="space-y-3 text-sm leading-6 text-slate-100">
            <li
              v-for="(segment, index) in finalTranscripts"
              :key="`${index}-${segment}`"
              class="rounded-lg border border-slate-800 bg-slate-950/80 p-3"
            >
              {{ segment }}
            </li>
          </ol>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSave"
            @click="saveTranscript"
          >
            {{ isSaving ? 'Saving...' : 'Save to history' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
