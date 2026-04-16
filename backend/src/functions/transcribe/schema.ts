export default {
  type: 'object',
  properties: {
    transcriptionId: { type: 'string', minLength: 1 },
    audioKey: { type: 'string', minLength: 1 },
    filename: { type: 'string', minLength: 1 },
    contentType: { type: 'string', minLength: 1 },
  },
  required: ['transcriptionId', 'audioKey', 'filename', 'contentType'],
  additionalProperties: false,
} as const;
