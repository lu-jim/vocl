<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
import { computed, ref } from 'vue';
import { getApiErrorMessage } from '../utils/api-errors';

defineOptions({
  name: 'AudioUploader',
});

type UploadRequestResponse = {
  uploadUrl: string;
  uploadMethod: 'PUT';
  audioKey: string;
  bucketName: string;
  expiresInSeconds: number;
  maxUploadSizeBytes: number;
  headers?: Record<string, string>;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac', 'mp4', 'mpeg'];
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  mpeg: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

const runtimeConfig = useRuntimeConfig();
const auth = useAuth();
const apiBaseUrl = computed(() => runtimeConfig.public.apiBaseUrl.replace(/\/$/, ''));
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const uploadProgress = ref(0);
const isDragging = ref(false);
const isUploading = ref(false);
const lastUploadSummary = ref<{
  audioKey: string;
  bucketName: string;
} | null>(null);

const fileInputId = 'audio-upload-input';
const apiConfigured = computed(() => Boolean(apiBaseUrl.value));
const acceptedFileTypes = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,.mp4';
const fileSizeLabel = computed(() => {
  if (!selectedFile.value) {
    return 'No file selected';
  }

  return `${(selectedFile.value.size / (1024 * 1024)).toFixed(2)} MB`;
});

const resetMessages = () => {
  errorMessage.value = '';
  successMessage.value = '';
};

const getFileExtension = (filename: string): string => {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? segments.at(-1) ?? '' : '';
};

const resolveContentType = (file: File): string => {
  if (file.type) {
    return file.type;
  }

  return EXTENSION_TO_MIME_TYPE[getFileExtension(file.name)] ?? '';
};

const validateFile = (file: File | null): string | null => {
  if (!file) {
    return 'Choose an audio file to upload.';
  }

  if (file.size <= 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Audio uploads must be 20 MB or smaller.';
  }

  const normalizedContentType = resolveContentType(file);
  const extension = getFileExtension(file.name);
  const isAudioType = normalizedContentType.startsWith('audio/');
  const isKnownAudioExtension = AUDIO_EXTENSIONS.includes(extension);

  if (!isAudioType && !isKnownAudioExtension) {
    return 'Choose a supported audio file such as MP3, WAV, M4A, AAC, OGG, WebM, or FLAC.';
  }

  return null;
};

const setSelectedFile = (file: File | null) => {
  resetMessages();
  uploadProgress.value = 0;
  lastUploadSummary.value = null;

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validationError = validateFile(file);

  if (validationError) {
    selectedFile.value = null;
    errorMessage.value = validationError;
    return;
  }

  selectedFile.value = file;
};

const clearSelection = () => {
  setSelectedFile(null);

  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  setSelectedFile(input.files?.[0] ?? null);
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  setSelectedFile(event.dataTransfer?.files?.[0] ?? null);
};

const requestUploadTarget = async (file: File): Promise<UploadRequestResponse> => {
  const contentType = resolveContentType(file);
  const token = await auth.getIdToken();

  if (!token) {
    throw new Error('Sign in again before requesting an upload URL.');
  }

  return await $fetch<UploadRequestResponse>(`${apiBaseUrl.value}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      filename: file.name,
      contentType,
      size: file.size,
    },
  });
};

const uploadToSignedUrl = async (
  uploadTarget: UploadRequestResponse,
  file: File,
  contentType: string
) => {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(uploadTarget.uploadMethod, uploadTarget.uploadUrl);

    const headers = uploadTarget.headers ?? {};
    Object.entries(headers).forEach(([headerName, headerValue]) => {
      xhr.setRequestHeader(headerName, headerValue);
    });

    if (!headers['Content-Type']) {
      xhr.setRequestHeader('Content-Type', contentType);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return;
      }

      uploadProgress.value = Math.round((event.loaded / event.total) * 100);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        uploadProgress.value = 100;
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}.`));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed before the file reached storage.'));
    });

    xhr.send(file);
  });
};

const handleUpload = async () => {
  resetMessages();

  if (!apiConfigured.value) {
    errorMessage.value = 'Set NUXT_PUBLIC_API_BASE_URL before testing uploads.';
    return;
  }

  const file = selectedFile.value;
  const validationError = validateFile(file);

  if (validationError || !file) {
    errorMessage.value = validationError ?? 'Choose an audio file to upload.';
    return;
  }

  const contentType = resolveContentType(file);

  if (!contentType) {
    errorMessage.value = 'Could not determine a content type for this file.';
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const uploadTarget = await requestUploadTarget(file);
    await uploadToSignedUrl(uploadTarget, file, contentType);

    lastUploadSummary.value = {
      audioKey: uploadTarget.audioKey,
      bucketName: uploadTarget.bucketName,
    };
    successMessage.value =
      'Audio uploaded successfully. The file is now in S3 and ready for the transcription step.';
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'The upload could not be completed.');
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">Upload audio</h2>
        <p class="mt-1 text-sm text-slate-300">
          Request a signed upload URL, then send an audio file directly from the browser to S3.
        </p>
      </div>

      <span
        class="inline-flex w-fit rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300"
      >
        Max 20 MB
      </span>
    </div>

    <div
      class="mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition"
      :class="
        isDragging
          ? 'border-cyan-400 bg-cyan-500/10'
          : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
      "
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop="handleDrop"
    >
      <p class="text-sm font-medium text-white">Drop an audio file here</p>
      <p class="mt-2 text-sm text-slate-400">or pick one from your device</p>

      <label
        :for="fileInputId"
        class="mt-4 inline-flex cursor-pointer items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        Choose file
      </label>
      <input
        :id="fileInputId"
        ref="fileInput"
        class="sr-only"
        type="file"
        :accept="acceptedFileTypes"
        @change="handleFileInput"
      >

      <p class="mt-4 text-sm text-slate-300">
        {{ selectedFile ? selectedFile.name : 'Supported formats include MP3, WAV, M4A, AAC, OGG, WebM, and FLAC.' }}
      </p>
      <p class="mt-1 text-xs text-slate-500">{{ fileSizeLabel }}</p>
    </div>

    <div
      v-if="!apiConfigured"
      class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
    >
      Set `NUXT_PUBLIC_API_BASE_URL` in your local `.env` before testing the upload flow.
    </div>

    <div
      v-if="errorMessage"
      class="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
    >
      <p>{{ successMessage }}</p>
      <p v-if="lastUploadSummary" class="mt-2 text-xs text-emerald-100/80">
        Stored as `{{ lastUploadSummary.audioKey }}` in `{{ lastUploadSummary.bucketName }}`.
      </p>
    </div>

    <div v-if="isUploading || uploadProgress > 0" class="mt-5 space-y-2">
      <div class="flex items-center justify-between text-sm text-slate-300">
        <span>{{ isUploading ? 'Uploading...' : 'Upload complete' }}</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          class="h-full rounded-full bg-cyan-400 transition-[width] duration-200"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedFile || isUploading || !apiConfigured"
        @click="handleUpload"
      >
        {{ isUploading ? 'Uploading...' : 'Upload to S3' }}
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isUploading"
        @click="clearSelection"
      >
        Clear
      </button>
    </div>
  </section>
</template>
