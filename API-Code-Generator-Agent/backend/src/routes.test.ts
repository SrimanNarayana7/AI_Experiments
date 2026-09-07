import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes';

const openapi = {
  openapi: '3.0.3',
  info: { title: 'Petstore', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        tags: ['pets'],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
};

let app: ReturnType<typeof Fastify>;

beforeAll(async () => {
  app = Fastify();
  await app.register(multipart);
  await registerRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('API routes', () => {
  it('health check', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('parse accepts JSON upload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/specs/parse',
      payload: openapi,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('Petstore');
    expect(body.endpoints).toHaveLength(1);
    expect(body.scenarioSummary.total).toBeGreaterThan(0);
  });

  it('parse rejects empty spec body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/specs/parse',
      payload: {},
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('generate rejects unsupported framework', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/specs/generate',
      payload: { framework: 'nope' },
    });
    expect(res.statusCode).toBe(400);
  });
});
