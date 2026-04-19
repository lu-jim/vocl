import {
  createRealtimeTranscriptionToken,
  getBatchTranscriptionJob,
  getBatchTranscriptionTranscript,
  submitBatchTranscription,
} from '@libs/speechmatics';

describe('submitBatchTranscription', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.SPEECHMATICS_API_KEY = 'speechmatics-secret';
    process.env.SPEECHMATICS_BATCH_API_URL = 'https://eu1.asr.api.speechmatics.com/v2';
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    delete process.env.SPEECHMATICS_API_KEY;
    delete process.env.SPEECHMATICS_BATCH_API_URL;
    fetchMock.mockReset();
  });

  it('submits a batch transcription job and returns the Speechmatics job id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          id: 'sm-job-123',
          status: 'running',
        },
      }),
    });

    const result = await submitBatchTranscription({
      fetchUrl: 'https://signed.example/audio.mp3',
      transcriptionId: '01JTRANSCRIBE123',
      filename: 'meeting.mp3',
    });

    expect(result).toEqual({
      id: 'sm-job-123',
      status: 'running',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://eu1.asr.api.speechmatics.com/v2/jobs');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({
      Authorization: 'Bearer speechmatics-secret',
    });
    expect(request.body).toBeInstanceOf(FormData);

    const config = (request.body as FormData).get('config');

    expect(config).toBe(
      JSON.stringify({
        type: 'transcription',
        transcription_config: {
          language: 'en',
        },
        fetch_data: {
          url: 'https://signed.example/audio.mp3',
        },
        tracking: {
          title: 'meeting.mp3',
          reference: '01JTRANSCRIBE123',
        },
      })
    );
  });

  it('surfaces Speechmatics API failures with a useful message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'quota exceeded',
      }),
    });

    await expect(
      submitBatchTranscription({
        fetchUrl: 'https://signed.example/audio.mp3',
        transcriptionId: '01JTRANSCRIBE123',
        filename: 'meeting.mp3',
      })
    ).rejects.toThrow('quota exceeded');
  });

  it('fetches Speechmatics job details for polling', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          id: 'sm-job-123',
          status: 'done',
          errors: [],
        },
      }),
    });

    const result = await getBatchTranscriptionJob('sm-job-123');

    expect(result).toEqual({
      id: 'sm-job-123',
      status: 'done',
      errorMessage: undefined,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://eu1.asr.api.speechmatics.com/v2/jobs/sm-job-123',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer speechmatics-secret',
        },
      }
    );
  });

  it('fetches the plain text transcript for a completed job', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => 'Hello from Speechmatics.',
    });

    const result = await getBatchTranscriptionTranscript('sm-job-123');

    expect(result).toBe('Hello from Speechmatics.');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://eu1.asr.api.speechmatics.com/v2/jobs/sm-job-123/transcript?format=txt',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer speechmatics-secret',
        },
      }
    );
  });

  it('creates a realtime token for browser sessions', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        key_value: 'temporary-jwt',
      }),
    });

    const result = await createRealtimeTranscriptionToken(120);

    expect(result).toEqual({
      key: 'temporary-jwt',
      expiresInSeconds: 120,
      websocketUrl: 'wss://eu.rt.speechmatics.com/v2?jwt=temporary-jwt',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer speechmatics-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: 120,
      }),
    });
  });
});
