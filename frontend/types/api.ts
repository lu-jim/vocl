export type UploadRequestResponse = {
  uploadUrl: string;
  uploadMethod: 'PUT';
  audioKey: string;
  bucketName: string;
  expiresInSeconds: number;
  maxUploadSizeBytes: number;
  headers?: Record<string, string>;
};

export type RealtimeTokenResponse = {
  jwt: string;
  websocketUrl: string;
  expiresInSeconds: number;
};

export type RealtimeSaveResponse = {
  message: string;
  transcriptionId: string;
  transcriptKey: string;
  filename: string;
  status: string;
};

export type HistoryItem = {
  transcriptionId: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  audioKey?: string;
  createdAt: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  nextCursor: string | null;
};

export type TranscriptionStatus = HistoryItem['status'];
