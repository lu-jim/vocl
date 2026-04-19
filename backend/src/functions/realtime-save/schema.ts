export default {
  type: 'object',
  properties: {
    transcript: { type: 'string', minLength: 1, maxLength: 100000 },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    language: { type: 'string', minLength: 2, maxLength: 20 },
  },
  required: ['transcript'],
  additionalProperties: false,
} as const;
