type SubmitBatchTranscriptionInput = {
  fetchUrl: string;
  transcriptionId: string;
  filename: string;
  language?: string;
};

type SpeechmaticsJobStatus = 'running' | 'done' | 'rejected' | 'deleted' | 'expired';

type SpeechmaticsJobPayload = {
  id?: string;
  status?: SpeechmaticsJobStatus;
  errors?: Array<{
    timestamp?: string;
    message?: string;
  }>;
};

type SpeechmaticsCreateJobResponse =
  | {
      id?: string;
      status?: SpeechmaticsJobStatus;
      job?: SpeechmaticsJobPayload;
      error?: string;
      message?: string;
    }
  | null;

const DEFAULT_BATCH_API_BASE_URL = 'https://eu1.asr.api.speechmatics.com/v2';

const getSpeechmaticsApiKey = () => {
  const apiKey = process.env.SPEECHMATICS_API_KEY;

  if (!apiKey) {
    throw new Error('Speechmatics API key is missing.');
  }

  return apiKey;
};

const getSpeechmaticsApiBaseUrl = () => {
  return process.env.SPEECHMATICS_BATCH_API_URL ?? DEFAULT_BATCH_API_BASE_URL;
};

const getSpeechmaticsErrorMessage = (payload: SpeechmaticsCreateJobResponse, fallback: string) => {
  if (payload?.error) {
    return payload.error;
  }

  if (payload?.message) {
    return payload.message;
  }

  return fallback;
};

const getSpeechmaticsJob = (payload: SpeechmaticsCreateJobResponse) => {
  return (payload?.job ?? payload) as SpeechmaticsJobPayload | null;
};

export const submitBatchTranscription = async ({
  fetchUrl,
  transcriptionId,
  filename,
  language = 'en',
}: SubmitBatchTranscriptionInput) => {
  const formData = new FormData();

  formData.append(
    'config',
    JSON.stringify({
      type: 'transcription',
      transcription_config: {
        language,
      },
      fetch_data: {
        url: fetchUrl,
      },
      tracking: {
        title: filename,
        reference: transcriptionId,
      },
    })
  );

  const response = await fetch(`${getSpeechmaticsApiBaseUrl()}/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSpeechmaticsApiKey()}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as SpeechmaticsCreateJobResponse;

  if (!response.ok) {
    throw new Error(
      getSpeechmaticsErrorMessage(payload, 'Speechmatics rejected the transcription request.')
    );
  }

  const job = getSpeechmaticsJob(payload);

  if (!job?.id) {
    throw new Error('Speechmatics did not return a job identifier.');
  }

  return {
    id: job.id,
    status: job.status ?? 'running',
  };
};

export const getBatchTranscriptionJob = async (jobId: string) => {
  const response = await fetch(`${getSpeechmaticsApiBaseUrl()}/jobs/${jobId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getSpeechmaticsApiKey()}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as SpeechmaticsCreateJobResponse;

  if (!response.ok) {
    throw new Error(getSpeechmaticsErrorMessage(payload, 'Could not load Speechmatics job details.'));
  }

  const job = getSpeechmaticsJob(payload);

  if (!job?.id || !job.status) {
    throw new Error('Speechmatics did not return complete job details.');
  }

  return {
    id: job.id,
    status: job.status,
    errorMessage:
      typeof job.errors?.[0]?.message === 'string' ? job.errors[0].message : undefined,
  };
};

export const getBatchTranscriptionTranscript = async (jobId: string, format = 'txt') => {
  const response = await fetch(
    `${getSpeechmaticsApiBaseUrl()}/jobs/${jobId}/transcript?format=${encodeURIComponent(format)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getSpeechmaticsApiKey()}`,
      },
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || 'Could not load the Speechmatics transcript.');
  }

  return body;
};
