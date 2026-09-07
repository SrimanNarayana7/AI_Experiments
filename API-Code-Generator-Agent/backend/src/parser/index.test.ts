import { describe, it, expect } from 'vitest';
import { parseSpec } from './index.js';

const openapi3 = {
  openapi: '3.0.3',
  info: { title: 'Petstore', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/pets/{id}': {
      get: {
        operationId: 'getPet',
        summary: 'Get a pet',
        tags: ['pets'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
          '404': { description: 'not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: ['available', 'sold'] },
        },
      },
    },
  },
};

const swagger2 = {
  swagger: '2.0',
  info: { title: 'Legacy API', version: '2.0.0' },
  host: 'api.legacy.com',
  basePath: '/v1',
  schemes: ['https'],
  paths: {
    '/users': {
      post: {
        operationId: 'createUser',
        tags: ['users'],
        parameters: [
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: { $ref: '#/definitions/User' },
          },
        ],
        responses: {
          '201': { description: 'created', schema: { $ref: '#/definitions/User' } },
        },
      },
    },
  },
  definitions: {
    User: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  },
};

describe('parseSpec', () => {
  it('parses OpenAPI 3 with $ref resolution', async () => {
    const result = await parseSpec(JSON.stringify(openapi3), 'upload');
    expect(result.manifest.spec.title).toBe('Petstore');
    expect(result.manifest.spec.format).toBe('openapi3');
    expect(result.baseUrl).toBe('https://api.example.com');
    expect(result.manifest.endpoints).toHaveLength(1);
    const endpoint = result.manifest.endpoints[0];
    expect(endpoint?.method).toBe('GET');
    const schema = endpoint?.responses.find((r) => r.status === '200')?.schema;
    expect(schema?.type).toBe('object');
    expect(schema?.properties?.name?.minLength).toBe(1);
  });

  it('parses Swagger 2 with definitions resolution', async () => {
    const result = await parseSpec(JSON.stringify(swagger2), 'upload');
    expect(result.manifest.spec.format).toBe('swagger2');
    expect(result.baseUrl).toBe('https://api.legacy.com/v1');
    expect(result.manifest.endpoints[0]?.requestBody?.type).toBe('object');
    expect(result.manifest.endpoints[0]?.requestBody?.required).toEqual(['email']);
  });

  it('rejects non-OpenAPI documents', async () => {
    await expect(parseSpec(JSON.stringify({ hello: 'world' }), 'upload')).rejects.toThrow(
      /Unsupported specification/,
    );
  });
});
