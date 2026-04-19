export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac', 'mp4', 'mpeg'
] as const;

export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
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

export const ACCEPTED_FILE_TYPES = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,.mp4';

export const getFileExtension = (filename: string): string => {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? segments.at(-1) ?? '' : '';
};

export const resolveContentType = (file: File): string => {
  if (file.type) return file.type;
  return EXTENSION_TO_MIME_TYPE[getFileExtension(file.name)] ?? '';
};

export const formatFileSize = (bytes: number): string => {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const validateAudioFile = (file: File | null): string | null => {
  if (!file) return 'Choose an audio file to upload.';
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'Audio uploads must be 20 MB or smaller.';

  const normalizedContentType = resolveContentType(file);
  const extension = getFileExtension(file.name);
  const isAudioType = normalizedContentType.startsWith('audio/');
  const isKnownAudioExtension = AUDIO_EXTENSIONS.includes(extension as typeof AUDIO_EXTENSIONS[number]);

  if (!isAudioType && !isKnownAudioExtension) {
    return 'Choose a supported audio file such as MP3, WAV, M4A, AAC, OGG, WebM, or FLAC.';
  }
  
  return null;
};

export const getTranscriptFilename = (filename: string): string => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const lastDotIndex = sanitized.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? sanitized.slice(0, lastDotIndex) : sanitized;
  return `${basename || 'transcript'}.txt`;
};

export const hasBrowserAudioSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const browserWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  
  return Boolean(
    (browserWindow.AudioContext || browserWindow.webkitAudioContext) &&
      navigator.mediaDevices?.getUserMedia
  );
};

export const float32ToInt16 = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
};
