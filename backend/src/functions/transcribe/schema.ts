export default {
  type: 'object',
  properties: {
    transcriptionId: { type: 'string', minLength: 1 },
    language: { type: 'string', minLength: 2, maxLength: 10 },
  },
  required: ['transcriptionId'],
  additionalProperties: false,
} as const;
