import { describe, it, expect } from 'vitest';
import { generateScenarios, summarizeScenarios } from './index.js';
import { validateScenarios } from './validate.js';
import { computeCoverage } from '../coverage/index.js';
import type { ApiManifest } from '../parser/types.js';

const manifest: ApiManifest = {
  spec: { title: 'Petstore', version: '1.0.0', format: 'openapi3', formatVersion: '3.0.3' },
  servers: [{ url: 'https://api.example.com' }],
  securitySchemes: [{ name: 'bearerAuth', type: 'http', scheme: 'bearer' }],
  endpoints: [
    {
      path: '/pets',
      method: 'POST',
      operationId: 'createPet',
      summary: 'Create a pet',
      tags: ['pets'],
      parameters: [],
      requestBody: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 50 },
          age: { type: 'integer', minimum: 0, maximum: 100 },
          status: { type: 'string', enum: ['available', 'sold'] },
        },
      },
      requestBodyRequired: true,
      responses: [
        { status: '201', description: 'created', schema: { type: 'object' } },
        { status: '400', description: 'bad request' },
      ],
      security: [{ bearerAuth: [] }],
    },
  ],
  coverageRequirements: {
    endpointCount: 1,
    methodCount: 1,
    documentedResponseCount: 2,
    requiredFieldCount: 1,
    boundaryConstraintCount: 3,
    enumCount: 1,
    securityRequirementCount: 1,
    schemaCount: 1,
  },
};

describe('scenario engine', () => {
  it('generates happy path, documented response, boundary, missing, enum, auth scenarios', () => {
    const scenarios = generateScenarios(manifest);
    const types = new Set(scenarios.map((s) => s.type));

    expect(types.has('happy_path')).toBe(true);
    expect(types.has('documented_response')).toBe(true);
    expect(types.has('missing_required')).toBe(true);
    expect(types.has('boundary_min')).toBe(true);
    expect(types.has('boundary_max')).toBe(true);
    expect(types.has('invalid_enum')).toBe(true);
    expect(types.has('authentication_missing')).toBe(true);
    expect(types.has('authentication_invalid')).toBe(true);
  });

  it('validates scenarios against the manifest', () => {
    const scenarios = generateScenarios(manifest);
    const result = validateScenarios(manifest, scenarios);
    expect(result.valid).toBe(true);
    expect(result.kept).toHaveLength(scenarios.length);
  });

  it('computes coverage without claiming false 100%', () => {
    const scenarios = generateScenarios(manifest);
    const coverage = computeCoverage(manifest, scenarios);
    expect(coverage.coverage.endpointCoverage).toBe(100);
    expect(coverage.coverage.responseCoverage).toBe(100);
    expect(coverage.coverage.overall).toBeLessThanOrEqual(100);
  });

  it('summarizes scenario counts', () => {
    const scenarios = generateScenarios(manifest);
    const summary = summarizeScenarios(scenarios);
    expect(summary.total).toBe(scenarios.length);
  });
});
