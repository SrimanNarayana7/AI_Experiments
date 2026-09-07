import { ApiManifest, Endpoint, Parameter, ResolvedSchema } from '../parser/types.js';

export type ScenarioType =
  | 'happy_path'
  | 'documented_response'
  | 'missing_required'
  | 'boundary_min'
  | 'boundary_max'
  | 'invalid_type'
  | 'invalid_format'
  | 'invalid_enum'
  | 'empty_value'
  | 'null_value'
  | 'authentication_missing'
  | 'authentication_invalid'
  | 'schema_validation';

export interface InputMutation {
  field: string;
  action: 'remove' | 'set' | 'replace' | 'clear' | 'null';
  value?: unknown;
}

export interface TestScenario {
  id: string;
  endpoint: string;
  method: string;
  type: ScenarioType;
  name: string;
  inputMutation?: InputMutation;
  expectedStatus: number[];
  expectedAssertions: string[];
  source: 'openapi-contract';
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function successStatuses(endpoint: Endpoint): number[] {
  const statuses = endpoint.responses
    .map((r) => Number.parseInt(r.status, 10))
    .filter((s) => s >= 200 && s < 300);
  return statuses.length ? statuses : [200];
}

function errorStatuses(endpoint: Endpoint): number[] {
  return endpoint.responses
    .map((r) => Number.parseInt(r.status, 10))
    .filter((s) => s >= 400 && s < 600);
}

function isPrimitiveType(type?: string): boolean {
  return type === 'string' || type === 'integer' || type === 'number' || type === 'boolean';
}

function invalidTypeValue(type?: string): unknown | undefined {
  switch (type) {
    case 'string':
      return 12345;
    case 'integer':
    case 'number':
      return 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    default:
      return undefined;
  }
}

function requiredFields(schema?: ResolvedSchema): string[] {
  return schema?.required ?? [];
}

function boundaryScenariosForParameter(
  endpoint: Endpoint,
  p: Parameter,
  scenarios: TestScenario[],
): void {
  const op = endpoint.operationId ?? `${endpoint.method}-${endpoint.path}`;
  const base = slug(op);

  if (p.minimum !== undefined) {
    scenarios.push(
      {
        id: `${base}-${slug(p.name)}-min-below`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_min',
        name: `${p.name} below minimum (${p.minimum})`,
        inputMutation: { field: p.name, action: 'set', value: p.minimum - 1 },
        expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
        expectedAssertions: [`expect ${p.name} rejected below minimum`],
        source: 'openapi-contract',
      },
      {
        id: `${base}-${slug(p.name)}-min-at`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_min',
        name: `${p.name} at minimum (${p.minimum})`,
        inputMutation: { field: p.name, action: 'set', value: p.minimum },
        expectedStatus: successStatuses(endpoint),
        expectedAssertions: [`expect ${p.name} accepted at minimum`],
        source: 'openapi-contract',
      },
    );
  }

  if (p.maximum !== undefined) {
    scenarios.push(
      {
        id: `${base}-${slug(p.name)}-max-at`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_max',
        name: `${p.name} at maximum (${p.maximum})`,
        inputMutation: { field: p.name, action: 'set', value: p.maximum },
        expectedStatus: successStatuses(endpoint),
        expectedAssertions: [`expect ${p.name} accepted at maximum`],
        source: 'openapi-contract',
      },
      {
        id: `${base}-${slug(p.name)}-max-above`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_max',
        name: `${p.name} above maximum (${p.maximum})`,
        inputMutation: { field: p.name, action: 'set', value: p.maximum + 1 },
        expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
        expectedAssertions: [`expect ${p.name} rejected above maximum`],
        source: 'openapi-contract',
      },
    );
  }

  if (p.minLength !== undefined) {
    scenarios.push(
      {
        id: `${base}-${slug(p.name)}-minlen-below`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_min',
        name: `${p.name} below minLength (${p.minLength})`,
        inputMutation: { field: p.name, action: 'set', value: 'x'.repeat(Math.max(0, p.minLength - 1)) },
        expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
        expectedAssertions: [`expect ${p.name} rejected below minLength`],
        source: 'openapi-contract',
      },
    );
  }

  if (p.maxLength !== undefined) {
    scenarios.push(
      {
        id: `${base}-${slug(p.name)}-maxlen-above`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'boundary_max',
        name: `${p.name} above maxLength (${p.maxLength})`,
        inputMutation: { field: p.name, action: 'set', value: 'x'.repeat(p.maxLength + 1) },
        expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
        expectedAssertions: [`expect ${p.name} rejected above maxLength`],
        source: 'openapi-contract',
      },
    );
  }

  if (p.enum && p.enum.length > 0) {
    scenarios.push({
      id: `${base}-${slug(p.name)}-invalid-enum`,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      type: 'invalid_enum',
      name: `${p.name} invalid enum value`,
      inputMutation: { field: p.name, action: 'set', value: '__INVALID_ENUM__' },
      expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
      expectedAssertions: [`expect ${p.name} rejected for invalid enum`],
      source: 'openapi-contract',
    });
  }

  if (isPrimitiveType(p.type)) {
    const bad = invalidTypeValue(p.type);
    if (bad !== undefined) {
      scenarios.push({
        id: `${base}-${slug(p.name)}-invalid-type`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'invalid_type',
        name: `${p.name} invalid type (expected ${p.type})`,
        inputMutation: { field: p.name, action: 'set', value: bad },
        expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
        expectedAssertions: [`expect ${p.name} rejected for invalid type`],
        source: 'openapi-contract',
      });
    }
  }
}

function boundaryScenariosForSchema(
  endpoint: Endpoint,
  schema: ResolvedSchema | undefined,
  prefix: string,
  scenarios: TestScenario[],
): void {
  if (!schema) return;
  const op = endpoint.operationId ?? `${endpoint.method}-${endpoint.path}`;
  const base = slug(op);
  const fields = requiredFields(schema);

  for (const field of fields) {
    scenarios.push({
      id: `${base}-missing-${slug(field)}`,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      type: 'missing_required',
      name: `missing required field: ${field}`,
      inputMutation: { field, action: 'remove' },
      expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
      expectedAssertions: [`expect ${field} is required`],
      source: 'openapi-contract',
    });
  }

  if (schema.properties) {
    for (const [field, prop] of Object.entries(schema.properties)) {
      if (prop.minimum !== undefined) {
        scenarios.push({
          id: `${base}-${prefix}-${slug(field)}-min-below`,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          type: 'boundary_min',
          name: `${field} below minimum (${prop.minimum})`,
          inputMutation: { field, action: 'set', value: prop.minimum - 1 },
          expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
          expectedAssertions: [`expect ${field} rejected below minimum`],
          source: 'openapi-contract',
        });
      }
      if (prop.maximum !== undefined) {
        scenarios.push({
          id: `${base}-${prefix}-${slug(field)}-max-above`,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          type: 'boundary_max',
          name: `${field} above maximum (${prop.maximum})`,
          inputMutation: { field, action: 'set', value: prop.maximum + 1 },
          expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
          expectedAssertions: [`expect ${field} rejected above maximum`],
          source: 'openapi-contract',
        });
      }
      if (prop.enum) {
        scenarios.push({
          id: `${base}-${prefix}-${slug(field)}-invalid-enum`,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          type: 'invalid_enum',
          name: `${field} invalid enum value`,
          inputMutation: { field, action: 'set', value: '__INVALID_ENUM__' },
          expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
          expectedAssertions: [`expect ${field} rejected for invalid enum`],
          source: 'openapi-contract',
        });
      }
      if (isPrimitiveType(prop.type)) {
        const bad = invalidTypeValue(prop.type);
        if (bad !== undefined) {
          scenarios.push({
            id: `${base}-${prefix}-${slug(field)}-invalid-type`,
            endpoint: `${endpoint.method} ${endpoint.path}`,
            method: endpoint.method,
            type: 'invalid_type',
            name: `${field} invalid type (expected ${prop.type})`,
            inputMutation: { field, action: 'set', value: bad },
            expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
            expectedAssertions: [`expect ${field} rejected for invalid type`],
            source: 'openapi-contract',
          });
        }
      }
    }
  }
}

export function generateScenarios(manifest: ApiManifest): TestScenario[] {
  const scenarios: TestScenario[] = [];

  for (const endpoint of manifest.endpoints) {
    const base = slug(endpoint.operationId ?? `${endpoint.method}-${endpoint.path}`);
    const authRequired = endpoint.security?.length ?? 0 > 0;

    // Happy path
    scenarios.push({
      id: `${base}-happy-path`,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      type: 'happy_path',
      name: `${endpoint.method} ${endpoint.path} happy path`,
      expectedStatus: successStatuses(endpoint),
      expectedAssertions: ['expect valid success status', 'expect response schema'],
      source: 'openapi-contract',
    });

    // Documented responses
    for (const response of endpoint.responses) {
      const status = Number.parseInt(response.status, 10);
      if (Number.isNaN(status)) continue;
      scenarios.push({
        id: `${base}-response-${response.status}`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'documented_response',
        name: `${endpoint.method} ${endpoint.path} returns ${response.status}`,
        expectedStatus: [status],
        expectedAssertions: [
          status >= 200 && status < 300
            ? 'expect success response body'
            : 'expect error response body',
        ],
        source: 'openapi-contract',
      });
    }

    // Schema validation
    if (endpoint.responses.some((r) => r.schema)) {
      scenarios.push({
        id: `${base}-schema-validation`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'schema_validation',
        name: `${endpoint.method} ${endpoint.path} response schema validation`,
        expectedStatus: successStatuses(endpoint),
        expectedAssertions: ['expect response matches documented schema'],
        source: 'openapi-contract',
      });
    }

    // Parameters
    for (const p of endpoint.parameters) {
      if (p.in === 'body' || p.in === 'formData') continue;
      boundaryScenariosForParameter(endpoint, p, scenarios);
      if (p.required) {
        scenarios.push({
          id: `${base}-missing-param-${slug(p.name)}`,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          type: 'missing_required',
          name: `missing required parameter: ${p.name}`,
          inputMutation: { field: p.name, action: 'remove' },
          expectedStatus: errorStatuses(endpoint).length ? errorStatuses(endpoint) : [400, 422],
          expectedAssertions: [`expect ${p.name} is required`],
          source: 'openapi-contract',
        });
      }
    }

    // Request body boundary / invalid scenarios
    boundaryScenariosForSchema(endpoint, endpoint.requestBody, 'body', scenarios);

    // Authentication scenarios
    if (authRequired) {
      scenarios.push({
        id: `${base}-auth-missing`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'authentication_missing',
        name: `${endpoint.method} ${endpoint.path} without authentication`,
        expectedStatus: [401, 403],
        expectedAssertions: ['expect unauthorized/forbidden'],
        source: 'openapi-contract',
      });
      scenarios.push({
        id: `${base}-auth-invalid`,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        type: 'authentication_invalid',
        name: `${endpoint.method} ${endpoint.path} with invalid authentication`,
        expectedStatus: [401, 403],
        expectedAssertions: ['expect unauthorized/forbidden'],
        source: 'openapi-contract',
      });
    }
  }

  return dedupe(scenarios);
}

function dedupe(scenarios: TestScenario[]): TestScenario[] {
  const seen = new Set<string>();
  const result: TestScenario[] = [];
  for (const s of scenarios) {
    const key = `${s.id}|${s.type}|${s.expectedStatus.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(s);
  }
  return result;
}

export interface ScenarioSummary {
  total: number;
  byType: Record<ScenarioType, number>;
}

export function summarizeScenarios(scenarios: TestScenario[]): ScenarioSummary {
  const byType = {} as Record<ScenarioType, number>;
  for (const s of scenarios) {
    byType[s.type] = (byType[s.type] ?? 0) + 1;
  }
  return { total: scenarios.length, byType };
}
