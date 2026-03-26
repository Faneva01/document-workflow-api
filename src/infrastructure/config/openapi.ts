export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Document Generation Platform API',
    version: '1.0.0',
    description: 'Scalable backend API for massive PDF generation with Bull, Redis and MongoDB GridFS.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/api/documents/batch': {
      post: {
        summary: 'Create a document batch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userIds: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 1000,
                    items: { type: 'string' },
                  },
                  documentType: { type: 'string', example: 'cerfa' },
                  priority: { type: 'integer', minimum: 1, maximum: 5, example: 3 },
                },
                required: ['userIds'],
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Batch created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    batchId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/documents/batch/{batchId}': {
      get: {
        summary: 'Get batch status',
        parameters: [{ name: 'batchId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Batch details' },
        },
      },
    },
    '/api/documents/{documentId}': {
      get: {
        summary: 'Download generated PDF',
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'PDF stream',
            content: {
              'application/pdf': {},
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Service health' } },
      },
    },
    '/metrics': {
      get: {
        summary: 'Prometheus metrics',
        responses: { '200': { description: 'Metrics exposition' } },
      },
    },
  },
};
