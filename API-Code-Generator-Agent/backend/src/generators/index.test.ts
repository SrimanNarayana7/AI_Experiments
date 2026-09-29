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

const fileContent = (output: ReturnType<typeof generateProject>, path: string): string => {
  const file = output.files.find((f) => f.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file?.content ?? '';
};

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

  describe('playwright enterprise output', () => {
    const output = generateProject({
      manifest,
      scenarios,
      framework: 'playwright',
      baseUrl: 'https://api.example.com',
      projectName: 'petstore-api-tests',
    });
    const paths = output.files.map((f) => f.path);

    it('emits the enterprise project skeleton', () => {
      for (const expected of [
        'package.json',
        'tsconfig.json',
        'eslint.config.mjs',
        '.prettierrc.json',
        '.gitignore',
        'playwright.config.ts',
        'config/env.ts',
      ]) {
        expect(paths).toContain(expected);
      }
    });

    it('organizes code into typed clients and per-tag specs', () => {
      expect(paths).toContain('lib/api/pets.client.ts');
      expect(paths).toContain('tests/pets.spec.ts');
    });

    it('never repeats imports inside a spec file', () => {
      const spec = fileContent(output, 'tests/pets.spec.ts');
      const importCount = (spec.match(/import \{/g) ?? []).length;
      expect(importCount).toBeLessThanOrEqual(2);
    });

    it('reads the base URL from playwright config instead of hardcoding it', () => {
      const config = fileContent(output, 'playwright.config.ts');
      expect(config).toContain('baseURL: process.env.API_BASE_URL');
      const spec = fileContent(output, 'tests/pets.spec.ts');
      expect(spec).not.toContain('API_BASE_URL');
      expect(spec).not.toContain('https://api.example.com');
    });

    it('asserts documented status codes instead of hardcoded 200s', () => {
      const spec = fileContent(output, 'tests/pets.spec.ts');
      expect(spec).toContain('expect([200]).toContain(response.status())');
      expect(spec).not.toContain('toBe(200)');
    });

    it('exposes quality scripts in package.json', () => {
      const pkg = JSON.parse(fileContent(output, 'package.json')) as { scripts: Record<string, string> };
      expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
      expect(pkg.scripts.lint).toBe('eslint .');
      expect(pkg.scripts.format).toContain('prettier');
    });
  });

  describe('playwright contract handling', () => {
    const richManifest: ApiManifest = {
      ...manifest,
      endpoints: [
        {
          path: '/pets/{petId}',
          method: 'GET',
          operationId: 'getPetById',
          summary: 'Get pet by id',
          tags: ['pets'],
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              type: 'integer',
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              type: 'string',
              enum: ['available', 'sold'],
            },
          ],
          responses: [
            {
              status: '200',
              description: 'ok',
              schema: {
                type: 'object',
                required: ['id', 'name'],
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['available', 'sold'] },
                },
              },
            },
            { status: '404', description: 'not found' },
          ],
        },
        {
          path: '/pets',
          method: 'POST',
          operationId: 'createPet',
          summary: 'Create pet',
          tags: ['pets'],
          parameters: [],
          requestBody: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', example: 'Rex' },
              status: { type: 'string', enum: ['available', 'sold'] },
            },
          },
          responses: [
            {
              status: '201',
              description: 'created',
              schema: { type: 'object', properties: { id: { type: 'integer' } } },
            },
          ],
        },
      ],
      coverageRequirements: {
        ...manifest.coverageRequirements,
        endpointCount: 2,
        methodCount: 2,
      },
    };

    const richScenarios = [
      ...scenarios,
      {
        id: 'createPet-missing-name',
        endpoint: 'POST /pets',
        method: 'POST',
        type: 'missing_required' as const,
        name: 'missing required field: name',
        inputMutation: { field: 'name', action: 'remove' as const },
        expectedStatus: [400, 422],
        expectedAssertions: [],
        source: 'openapi-contract' as const,
      },
      {
        id: 'getPetById-invalid-status',
        endpoint: 'GET /pets/{petId}',
        method: 'GET',
        type: 'invalid_enum' as const,
        name: 'status invalid enum value',
        inputMutation: { field: 'status', action: 'set' as const, value: '__INVALID_ENUM__' },
        expectedStatus: [400, 422],
        expectedAssertions: [],
        source: 'openapi-contract' as const,
      },
    ];

    const output = generateProject({
      manifest: richManifest,
      scenarios: richScenarios,
      framework: 'playwright',
      baseUrl: 'https://api.example.com',
      projectName: 'petstore-api-tests',
    });

    it('substitutes path parameters with contract-derived values', () => {
      const spec = fileContent(output, 'tests/pets.spec.ts');
      expect(spec).toContain('getPetById(1');
    });

    it('generates factories with contract examples', () => {
      const factory = fileContent(output, 'lib/factories/pets.factory.ts');
      expect(factory).toContain('name: "Rex"');
    });

    it('generates typed models from response schemas', () => {
      const types = fileContent(output, 'types/api.ts');
      expect(types).toContain('export interface');
      expect(types).toContain('name: string;');
    });

    it('generates negative scenarios from the scenario engine', () => {
      const spec = fileContent(output, 'tests/pets.spec.ts');
      expect(spec).toContain('missing required field: name');
      expect(spec).toContain('delete (payload as unknown as Record<string, unknown>).name;');
      expect(spec).toContain('expect([400,422])');
    });

    it('asserts documented success status 201 for POST endpoints', () => {
      const spec = fileContent(output, 'tests/pets.spec.ts');
      expect(spec).toContain('expect([201])');
    });

    it('never repeats imports in generated factories and clients', () => {
      const client = fileContent(output, 'lib/api/pets.client.ts');
      const factory = fileContent(output, 'lib/factories/pets.factory.ts');
      expect((client.match(/^import /gm) ?? []).length).toBeLessThanOrEqual(2);
      expect((factory.match(/^import /gm) ?? []).length).toBeLessThanOrEqual(2);
    });
  });
});
