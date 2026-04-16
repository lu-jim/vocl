export default {
  type: 'object',
  properties: {
    filename: { type: 'string', minLength: 1, maxLength: 255 },
    contentType: { type: 'string', minLength: 1, maxLength: 100 },
    size: { type: 'number', minimum: 1, maximum: 20 * 1024 * 1024 },
  },
  required: ['filename', 'contentType', 'size'],
  additionalProperties: false,
} as const;
