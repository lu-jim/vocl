<script setup lang="ts">
import { Upload, X, FileAudio } from 'lucide-vue-next';

import type { UploadRequestResponse } from '~/types/api';
import { useApi } from '~/composables/useApi';
import { useMessages } from '~/composables/useMessages';
import {
  ACCEPTED_FILE_TYPES,
  formatFileSize,
  resolveContentType,
  validateAudioFile,
} from '~/utils/audio';

defineOptions({
  name: 'TranscribePage',
});

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const api = useApi();
const { errorMessage, successMessage, setError, setSuccess, clearMessages } = useMessages();

const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploadProgress = ref(0);
const isDragging = ref(false);
const isUploading = ref(false);
const lastUploadSummary = ref<{ audioKey: string; bucketName: string } | null>(null);

const fileInputId = 'audio-upload-input';
const fileSizeLabel = computed(() => {
  if (!selectedFile.value) return '';
  return formatFileSize(selectedFile.value.size);
});

const setSelectedFile = (file: File | null) => {
  clearMessages();
  uploadProgress.value = 0;
  lastUploadSummary.value = null;

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const validationError = validateAudioFile(file);
  if (validationError) {
    selectedFile.value = null;
    setError(validationError);
    return;
  }
  selectedFile.value = file;
};

const clearSelection = () => {
  setSelectedFile(null);
  if (fileInput.value) fileInput.value.value = '';
};

const openFilePicker = () => {
  fileInput.value?.click();
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
  return await api.fetch<UploadRequestResponse>('/upload', {
    method: 'POST',
    body: { filename: file.name, contentType, size: file.size },
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
    const hasContentTypeHeader = Object.keys(headers).some(
      (headerName) => headerName.toLowerCase() === 'content-type'
    );
    if (!hasContentTypeHeader) {
      xhr.setRequestHeader('Content-Type', contentType);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
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
  clearMessages();

  if (!api.isConfigured.value) {
    setError('Set NUXT_PUBLIC_API_BASE_URL before testing uploads.');
    return;
  }

  const file = selectedFile.value;
  const validationError = validateAudioFile(file);
  if (validationError || !file) {
    setError(validationError ?? 'Choose an audio file to upload.');
    return;
  }

  const contentType = resolveContentType(file);
  if (!contentType) {
    setError('Could not determine a content type for this file.');
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
    setSuccess('Audio uploaded successfully. The file is now queued for transcription.');
  } catch (error) {
    const { getApiErrorMessage } = await import('~/utils/api-errors');
    setError(getApiErrorMessage(error, 'The upload could not be completed.'));
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Batch Transcription"
      description="Upload audio files to transcribe them. Supports MP3, WAV, M4A, AAC, OGG, WebM, and FLAC."
    />

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Upload audio</CardTitle>
            <CardDescription>
              Drag and drop or select an audio file from your device.
            </CardDescription>
          </div>
          <span class="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Max 20 MB
          </span>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <div
          :class="[
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
          ]"
          role="button"
          tabindex="0"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop="handleDrop"
          @click="openFilePicker"
          @keydown.enter.prevent="openFilePicker"
          @keydown.space.prevent="openFilePicker"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload class="h-6 w-6 text-muted-foreground" />
          </div>

          <p class="text-sm font-medium">Drop an audio file here</p>
          <p class="mt-1 text-sm text-muted-foreground">or click to browse</p>

          <Button variant="outline" class="mt-4" type="button" @click.stop="openFilePicker">
            Choose file
          </Button>
          <input
            :id="fileInputId"
            ref="fileInput"
            class="sr-only"
            type="file"
            :accept="ACCEPTED_FILE_TYPES"
            @change="handleFileInput"
          >
        </div>

        <div v-if="selectedFile" class="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
              <FileAudio class="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p class="text-sm font-medium">{{ selectedFile.name }}</p>
              <p class="text-xs text-muted-foreground">{{ fileSizeLabel }}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" @click="clearSelection">
            <X class="h-4 w-4" />
          </Button>
        </div>

        <AlertMessage v-if="!api.isConfigured.value" variant="warning">
          Set <code class="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs">NUXT_PUBLIC_API_BASE_URL</code> in your local <code class="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs">.env</code> before testing the upload flow.
        </AlertMessage>

        <AlertMessage v-if="errorMessage" variant="error">
          {{ errorMessage }}
        </AlertMessage>

        <AlertMessage v-if="successMessage" variant="success">
          <p>{{ successMessage }}</p>
          <p v-if="lastUploadSummary" class="mt-2 text-xs text-green-700">
            Stored as <code class="rounded bg-green-100 px-1 py-0.5 font-mono">{{ lastUploadSummary.audioKey }}</code>
          </p>
        </AlertMessage>

        <div v-if="isUploading || uploadProgress > 0" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">
              {{ isUploading ? 'Uploading...' : 'Upload complete' }}
            </span>
            <span class="font-medium">{{ uploadProgress }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex gap-3">
        <Button
          :disabled="!selectedFile || isUploading || !api.isConfigured.value"
          @click="handleUpload"
        >
          <Upload v-if="!isUploading" class="mr-2 h-4 w-4" />
          {{ isUploading ? 'Uploading...' : 'Upload' }}
        </Button>
        <Button variant="outline" :disabled="isUploading" @click="clearSelection">
          Clear
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
