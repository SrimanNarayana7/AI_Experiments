import { describe, it, expect } from 'vitest';
import { generateProject } from './index.js';
import type { ApiManifest } from '../parser/types.js';

const manifest: ApiManifest = {
  spec: { title: 'Petstore', version: '1.0.0', format: 'openapi3', formatVersion: '3.0.3' },
  servers: [{ url: 'https://api.example.com' }],
  securitySchemes: [],
  endpoints: [
    {
      path: '/pets',
      method: 'GET',
      operationId: 'listPets',
      summary: 'List pets',
      tags: ['pets'],
      parameters: [],
      responses: [{ status: '200', description: 'ok' }],
    },
  ],
  coverageRequirements: {
    endpointCount: 1,
    methodCount: 1,
    documentedResponseCount: 1,
    requiredFieldCount: 0,
    boundaryConstraintCount: 0,
    enumCount: 0,
    securityRequirementCount: 0,
    schemaCount: 0,
  },
};

const scenarios = [
  {
    id: 'listPets-happy-path',
    endpoint: 'GET /pets',
    method: 'GET',
    type: 'happy_path' as const,
    name: 'GET /pets happy path',
    expectedStatus: [200],
    expectedAssertions: [],
    source: 'openapi-contract' as const,
  },
];

describe('generators', () => {
  it.each(['playwright', 'restassured', 'karate', 'supertest'] as const)(
    'generates a %s project with README and env',
    (framework) => {
      const output = generateProject({
        manifest,
        scenarios,
        framework,
        baseUrl: 'https://api.example.com',
        projectName: 'petstore-api-tests',
      });
      expect(output.files.length).toBeGreaterThan(0);
      const paths = output.files.map((f) => f.path);
      expect(paths.some((p) => p === 'README.md')).toBe(true);
      expect(paths.some((p) => p === '.env.example')).toBe(true);
    },
  );
});
