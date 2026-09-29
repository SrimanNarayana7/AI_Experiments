import { Endpoint, Parameter, ResolvedSchema } from '../parser/types.js';
import { TestScenario } from '../scenarios/index.js';
import {
  camelCase,
  collectNamedSchemas,
  hasSecurity,
  literal,
  pascalCase,
  pathParamValue,
  queryParamsSample,
  refName,
  renderInterfaces,
  requestBodyTypeName,
  resolvePath,
  responseTypeName,
  sampleValue,
  slugify,
  successResponseSchema,
  successStatuses,
} from './schema.js';
import { GeneratedFile, GenerationInput } from './types.js';

const NEGATIVE_TYPES = new Set([
  'missing_required',
  'boundary_min',
  'boundary_max',
  'invalid_type',
  'invalid_enum',
  'empty_value',
  'null_value',
  'authentication_missing',
  'authentication_invalid',
]);

const MAX_NEGATIVES_PER_ENDPOINT = 6;

interface EndpointPlan {
  endpoint: Endpoint;
  methodName: string;
}

interface TagPlan {
  tag: string;
  slug: string;
  className: string;
  endpoints: EndpointPlan[];
  hasCreators: boolean;
  hasDeletes: boolean;
}

interface CastType {
  name: string;
  array: boolean;
}

function groupEndpoints(input: GenerationInput): TagPlan[] {
  const byTag = new Map<string, Endpoint[]>();
  for (const endpoint of input.manifest.endpoints) {
    const tag = endpoint.tags[0] ?? 'default';
    const list = byTag.get(tag) ?? [];
    list.push(endpoint);
    byTag.set(tag, list);
  }

  const plans: TagPlan[] = [];
  for (const [tag, endpoints] of byTag) {
    const used = new Set<string>();
    const endpointPlans = endpoints.map((endpoint) => {
      let name = camelCase(
        endpoint.operationId ?? `${endpoint.method}${pascalCase(endpoint.path)}`,
      );
      while (used.has(name)) name = `${name}Alt`;
      used.add(name);
      return { endpoint, methodName: name };
    });
    const hasDeletes = endpoints.some((e) => e.method === 'DELETE');
    const hasCreators = endpoints.some(
      (e) => e.method === 'POST' && Boolean(e.requestBody),
    );
    plans.push({
      tag,
      slug: slugify(tag),
      className: pascalCase(tag),
      endpoints: endpointPlans,
      hasCreators,
      hasDeletes,
    });
  }
  return plans;
}

function parameterSchema(p: Parameter): ResolvedSchema {
  return {
    type: p.type,
    format: p.format,
    enum: p.enum,
    items: p.schema?.items,
  };
}

function parameterTsType(p: Parameter): string {
  const schema = parameterSchema(p);
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum.map((value) => literal(value)).join(' | ');
  }
  if (p.type === 'integer' || p.type === 'number') return 'number';
  if (p.type === 'boolean') return 'boolean';
  return 'string';
}

function buildPathTemplate(endpoint: Endpoint): string {
  return endpoint.path.replace(/\{([^}]+)\}/g, (_m, name: string) => `\${${name}}`);
}

function pathArgs(endpoint: Endpoint): string[] {
  return endpoint.parameters
    .filter((p) => p.in === 'path')
    .map((p) => `${p.name}: ${parameterTsType(p)}`);
}

function queryParamsExist(endpoint: Endpoint): boolean {
  return endpoint.parameters.some((p) => p.in === 'query');
}

function formParams(endpoint: Endpoint): Parameter[] {
  return endpoint.parameters.filter((p) => p.in === 'formData' && p.type !== 'file');
}

function fileParams(endpoint: Endpoint): Parameter[] {
  return endpoint.parameters.filter((p) => p.in === 'formData' && p.type === 'file');
}

function bodyTypeName(
  endpoint: Endpoint,
  schemas: Map<string, ResolvedSchema>,
): string | undefined {
  return requestBodyTypeName(endpoint, schemas);
}

function renderClientMethod(
  endpoint: Endpoint,
  methodName: string,
  schemas: Map<string, ResolvedSchema>,
  typeImports: Set<string>,
): string {
  const lines: string[] = [];
  const args = pathArgs(endpoint);
  const query = queryParamsExist(endpoint);
  const body = bodyTypeName(endpoint, schemas);
  const forms = formParams(endpoint);
  const files = fileParams(endpoint);

  let options: string | undefined;
  const multipartParts: string[] = [];

  if (body) {
    typeImports.add(body);
    args.push(`payload: ${body}`);
    options = 'data: payload';
  }
  if (query) {
    args.push('params?: Record<string, string | number | boolean>');
    options = options ? `${options},\n      params` : 'params';
  }
  if (forms.length > 0) {
    const fieldsType = forms
      .map((p) => `${p.name}?: ${parameterTsType(p)}`)
      .join('; ');
    args.push(`fields: { ${fieldsType} } = {}`);
    multipartParts.push(
      "...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))",
    );
  }
  if (files.length > 0) {
    for (const file of files) {
      multipartParts.push(
        `${file.name}: { name: '${file.name}.txt', mimeType: 'text/plain', buffer: Buffer.from('generated test file content', 'utf8') }`,
      );
    }
  }
  if (multipartParts.length > 0) {
    options = `multipart: {\n      ${multipartParts.join(',\n      ')},\n    }`;
  }

  const signature = args.length > 0 ? args.join(', ') : '';
  const pathLiteral = '`' + buildPathTemplate(endpoint) + '`';

  lines.push(`  async ${methodName}(${signature}): Promise<APIResponse> {`);
  lines.push(`    return this.request.${endpoint.method.toLowerCase()}(${pathLiteral}${options ? `, { ${options} }` : ''});`);
  lines.push(`  }`);

  return lines.join('\n');
}

function renderClient(tagPlan: TagPlan, schemas: Map<string, ResolvedSchema>): GeneratedFile {
  const typeImports = new Set<string>();
  const methods = tagPlan.endpoints
    .map((plan) => renderClientMethod(plan.endpoint, plan.methodName, schemas, typeImports))
    .join('\n\n');

  const imports = [
    `import type { APIRequestContext, APIResponse } from '@playwright/test';`,
  ];
  if (typeImports.size > 0) {
    imports.push(
      `import type { ${[...typeImports].sort().join(', ')} } from '../../types/api';`,
    );
  }

  const content = `${imports.join('\n')}

export class ${tagPlan.className}Client {
  constructor(private readonly request: APIRequestContext) {}

${methods}
}
`;
  return {
    path: `lib/api/${tagPlan.slug}.client.ts`,
    content,
  };
}

function runtimeExpr(
  schema: ResolvedSchema | undefined,
  name: string,
  imports: Set<string>,
): string {
  if (!schema) return 'null';
  if (schema.example !== undefined) return literal(schema.example);
  if (schema.default !== undefined) return literal(schema.default);
  if (schema.enum && schema.enum.length > 0) return literal(schema.enum[0]);
  if (schema.$ref && !schema.properties && !schema.type) {
    const ref = refName(schema.$ref);
    if (ref) {
      imports.add(ref);
      return `{} as ${ref}`;
    }
  }
  switch (schema.type) {
    case 'string':
      return stringExpr(schema, name);
    case 'integer':
    case 'number': {
      const min = schema.minimum ?? 1;
      const max = schema.maximum ?? 1000;
      return `faker.number.int({ min: ${min}, max: ${max} })`;
    }
    case 'boolean':
      return 'faker.datatype.boolean()';
    case 'array':
      return `[${runtimeExpr(schema.items, name, imports)}]`;
    case 'object':
    case undefined:
      if (schema.properties && Object.keys(schema.properties).length > 0) {
        return objectExpr(schema, imports);
      }
      return '{}';
    default:
      return 'null';
  }
}

function stringExpr(schema: ResolvedSchema, name: string): string {
  const slug = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'value';
  switch (schema.format) {
    case 'date-time':
      return 'faker.date.recent().toISOString()';
    case 'date':
      return "faker.date.recent().toISOString().slice(0, 10)";
    case 'email':
      return 'faker.internet.email()';
    case 'uuid':
      return 'faker.string.uuid()';
    case 'password':
      return 'faker.internet.password()';
    case 'uri':
    case 'url':
      return 'faker.internet.url()';
    case 'binary':
    case 'byte':
      return "'dGVzdA=='";
    default: {
      const min = schema.minLength ?? 0;
      const prefix = `'${slug}-'`;
      if (min > 0) {
        return `\`${'x'.repeat(Math.min(min, 20))}\${faker.string.alphanumeric(8)}\``;
      }
      return `${prefix} + faker.string.alphanumeric(8)`;
    }
  }
}

function objectExpr(schema: ResolvedSchema, imports: Set<string>): string {
  const required = new Set(schema.required ?? []);
  const pairs: string[] = [];
  for (const [field, prop] of Object.entries(schema.properties ?? {})) {
    if (required.size > 0 && !required.has(field)) continue;
    pairs.push(`    ${field}: ${runtimeExpr(prop, field, imports)}`);
  }
  if (pairs.length === 0) return '{}';
  return `{\n${pairs.join(',\n')},\n  }`;
}

function renderFactory(tagPlan: TagPlan, schemas: Map<string, ResolvedSchema>): GeneratedFile | undefined {
  const typeImports = new Set<string>();
  const functions: string[] = [];

  for (const { endpoint } of tagPlan.endpoints) {
    const typeName = bodyTypeName(endpoint, schemas);
    if (!typeName) continue;
    typeImports.add(typeName);
    const schema = endpoint.requestBody;
    const body = runtimeExpr(schema, 'payload', typeImports);
    if (schema?.type === 'array') {
      functions.push(
        `export function build${typeName}(overrides: ${typeName} = []): ${typeName} {
  return [
    ...(${body}),
    ...overrides,
  ] as ${typeName};
}`,
      );
    } else {
      functions.push(
        `export function build${typeName}(overrides: Partial<${typeName}> = {}): ${typeName} {
  return {
    ...(${body}),
    ...overrides,
  };
}`,
      );
    }
  }

  if (functions.length === 0) return undefined;

  const content = `import { faker } from '@faker-js/faker';
import type { ${[...typeImports].sort().join(', ')} } from '../../types/api';

${functions.join('\n\n')}
`;
  return {
    path: `lib/factories/${tagPlan.slug}.factory.ts`,
    content,
  };
}

function responseCast(
  endpoint: Endpoint,
  schemas: Map<string, ResolvedSchema>,
): CastType | undefined {
  const statuses = successStatuses(endpoint);
  const schema = endpoint.responses.find((r) =>
    statuses.includes(Number.parseInt(r.status, 10)),
  )?.schema;
  if (!schema) return undefined;

  if (schema.type === 'array') {
    const item = schema.items;
    if (!item) return undefined;
    const name = refName(item.$ref);
    return name ? { name, array: true } : undefined;
  }

  const status = statuses[0] ?? 200;
  const name = responseTypeName(endpoint, String(status), schemas);
  if (!name) return undefined;
  const namedSchema = schemas.get(name);
  if (!namedSchema || !namedSchema.properties) return undefined;
  return { name, array: false };
}

function renderBodyAssertions(endpoint: Endpoint, variable = 'body'): string[] {
  const schema = successResponseSchema(endpoint);
  if (!schema) return [];
  const lines: string[] = [];

  if (schema.type === 'array') {
    lines.push(`expect(Array.isArray(${variable})).toBe(true);`);
    const item = schema.items;
    if (item?.properties) {
      lines.push(`if (${variable}.length > 0) {`);
      lines.push(
        `  expect(${variable}[0]).toMatchObject(${matchObject(item, 6)});`,
      );
      lines.push(`}`);
    }
    return lines;
  }

  const props = Object.entries(schema.properties ?? {});
  if (props.length > 0) {
    lines.push(`expect(${variable}).toMatchObject(${matchObject(schema, 4)});`);
    return lines;
  }

  if (schema.type === 'string' || schema.type === 'boolean') {
    lines.push(`expect(typeof ${variable}).toBe('${schema.type}');`);
  } else if (schema.type === 'integer' || schema.type === 'number') {
    lines.push(`expect(typeof ${variable}).toBe('number');`);
  } else if (schema.type === 'object' || schema.additionalProperties !== undefined) {
    lines.push(`expect(typeof ${variable}).toBe('object');`);
  }
  return lines;
}

function matchObject(schema: ResolvedSchema, baseIndent: number): string {
  const entries = Object.entries(schema.properties ?? {}).map(([field, prop]) => {
    let matcher: string;
    if (prop.type === 'array') {
      matcher = 'expect.any(Array)';
    } else if (prop.properties || prop.type === 'object') {
      matcher = 'expect.any(Object)';
    } else if (prop.type === 'integer' || prop.type === 'number') {
      matcher = 'expect.any(Number)';
    } else if (prop.type === 'boolean') {
      matcher = 'expect.any(Boolean)';
    } else {
      matcher = 'expect.any(String)';
    }
    return `${' '.repeat(baseIndent + 2)}${field}: ${matcher}`;
  });
  return `{\n${entries.join(',\n')},\n${' '.repeat(baseIndent)}}`;
}

function renderHappyPath(
  endpoint: Endpoint,
  methodName: string,
  schemas: Map<string, ResolvedSchema>,
  plan: TagPlan,
): string {
  const lines: string[] = [];
  const statuses = successStatuses(endpoint);
  const title = `${endpoint.method} ${endpoint.path} happy path`;

  lines.push(`  test('${title}', async () => {`);
  if (hasSecurity(endpoint)) {
    lines.push(
      `    test.skip(!hasCredentials(), 'Skipped: no API credentials configured in .env');`,
    );
  }

  const callArgs: string[] = [];
  for (const p of endpoint.parameters.filter((param) => param.in === 'path')) {
    callArgs.push(literal(pathParamValue(endpoint, p.name)));
  }
  const body = bodyTypeName(endpoint, schemas);
  if (body) {
    lines.push(`    const payload = build${body}();`);
    callArgs.push('payload');
  } else if (formParams(endpoint).length > 0) {
    const fields = formParams(endpoint)
      .map((p) => `${p.name}: ${literal(sampleValue(p.schema, p.name))}`)
      .join(', ');
    callArgs.push(`{ ${fields} }`);
  }
  if (queryParamsExist(endpoint)) {
    callArgs.push(literal(queryParamsSample(endpoint)));
  }

  const call = `await client.${methodName}(${callArgs.join(', ')})`;
  lines.push(`    const response = ${call};`);
  lines.push(`    expect(${literal(statuses)}).toContain(response.status());`);

  const schema = successResponseSchema(endpoint);
  if (schema) {
    lines.push(`    expect(response.headers()['content-type'] ?? '').toContain('application/json');`);
  }
  if (statuses.includes(204)) {
    lines.push(`    expect(await response.text()).toBe('');`);
    lines.push(`  });`);
    return lines.join('\n');
  }

  if (schema) {
    const cast = responseCast(endpoint, schemas);
    const castSuffix = cast ? ` as ${cast.name}${cast.array ? '[]' : ''}` : '';
    lines.push(`    const body = (await response.json())${castSuffix};`);
    for (const assertion of renderBodyAssertions(endpoint)) {
      lines.push(`    ${assertion}`);
    }
    if (plan.hasDeletes && endpoint.method === 'POST') {
      lines.push(
        `    const created = body as unknown as { id?: number; username?: string };`,
      );
      lines.push(`    if (typeof created.id === 'number') createdIds.push(created.id);`);
      lines.push(
        `    if (typeof created.username === 'string') createdNames.push(created.username);`,
      );
    }
  } else if (plan.hasDeletes && endpoint.method === 'POST' && body) {
    lines.push(
      `    const created = payload as unknown as { id?: number; username?: string };`,
    );
    lines.push(`    if (typeof created.id === 'number') createdIds.push(created.id);`);
    lines.push(
      `    if (typeof created.username === 'string') createdNames.push(created.username);`,
    );
  }

  lines.push(`  });`);
  return lines.join('\n');
}

function mutationBodyLines(mutation: TestScenario['inputMutation']): string[] {
  if (!mutation) return [];
  const expr = `(payload as unknown as Record<string, unknown>).${mutation.field}`;
  switch (mutation.action) {
    case 'remove':
      return [`delete ${expr};`];
    case 'clear':
      return [`${expr} = '';`];
    case 'null':
      return [`${expr} = null;`];
    case 'set':
    case 'replace':
      return [`${expr} = ${literal(mutation.value)};`];
    default:
      return [];
  }
}

function mutationTarget(
  endpoint: Endpoint,
  field: string,
): 'body' | 'query' | 'path' | 'skip' {
  if (endpoint.parameters.some((p) => p.in === 'path' && p.name === field)) return 'path';
  if (endpoint.parameters.some((p) => p.in === 'query' && p.name === field)) return 'query';
  if (endpoint.parameters.some((p) => p.in === 'header' && p.name === field)) return 'skip';
  return endpoint.requestBody ? 'body' : 'skip';
}

function renderNegativeScenario(
  scenario: TestScenario,
  endpoint: Endpoint,
  methodName: string,
  schemas: Map<string, ResolvedSchema>,
  title: string,
): string {
  const isAuth =
    scenario.type === 'authentication_missing' || scenario.type === 'authentication_invalid';
  const lines: string[] = [];
  lines.push(`  test('${title}', async () => {`);

  if (isAuth) {
    const invalid =
      scenario.type === 'authentication_invalid'
        ? `, extraHTTPHeaders: { Authorization: 'Bearer invalid-token', api_key: 'invalid-key' }`
        : '';
    lines.push(
      `    const context = await apiRequest.newContext({ baseURL: env.API_BASE_URL${invalid} });`,
    );
    lines.push(`    try {`);
    const options: string[] = [];
    const body = bodyTypeName(endpoint, schemas);
    if (body) options.push(`data: build${body}()`);
    if (queryParamsExist(endpoint)) {
      options.push(`params: ${literal(queryParamsSample(endpoint))}`);
    }
    lines.push(
      `      const response = await context.${endpoint.method.toLowerCase()}('${resolvePath(endpoint)}'${options.length > 0 ? `, { ${options.join(', ')} }` : ''});`,
    );
    lines.push(`      expect(${literal(scenario.expectedStatus)}).toContain(response.status());`);
    lines.push(`    } finally {`);
    lines.push(`      await context.dispose();`);
    lines.push(`    }`);
    lines.push(`  });`);
    return lines.join('\n');
  }

  if (!scenario.inputMutation) return '';

  const mutation = scenario.inputMutation;
  const target = mutationTarget(endpoint, mutation.field);
  if (target === 'skip') return '';
  const callArgs: string[] = [];
  for (const p of endpoint.parameters.filter((param) => param.in === 'path')) {
    callArgs.push(literal(pathParamValue(endpoint, p.name)));
  }

  if (target === 'path') {
    const pathParams = endpoint.parameters.filter((param) => param.in === 'path');
    const index = pathParams.findIndex((p) => p.name === mutation.field);
    const param = pathParams[index];
    const type = param ? parameterTsType(param) : 'string';
    if (mutation.action === 'remove') {
      callArgs[index] = type === 'number' ? '0' : "''";
    } else {
      callArgs[index] = `${literal(mutation.value)} as unknown as ${type}`;
    }
  }

  if (target === 'body') {
    const body = bodyTypeName(endpoint, schemas);
    if (body) {
      lines.push(`    const payload = build${body}();`);
      for (const mutationLine of mutationBodyLines(mutation)) {
        lines.push(`    ${mutationLine}`);
      }
      callArgs.push('payload');
    }
  } else {
    const body = bodyTypeName(endpoint, schemas);
    if (body) {
      lines.push(`    const payload = build${body}();`);
      callArgs.push('payload');
    }
  }

  if (target === 'query' || queryParamsExist(endpoint)) {
    const params = queryParamsSample(endpoint);
    if (target === 'query') {
      if (mutation.action === 'remove') {
        delete params[mutation.field];
      } else if (mutation.action === 'set' || mutation.action === 'replace') {
        const value = mutation.value;
        params[mutation.field] =
          value !== null && typeof value === 'object'
            ? JSON.stringify(value)
            : (value as string | number | boolean);
      } else if (mutation.action === 'clear') {
        params[mutation.field] = '';
      } else if (mutation.action === 'null') {
        params[mutation.field] = '';
      }
    }
    callArgs.push(literal(params));
  }

  lines.push(`    const response = await client.${methodName}(${callArgs.join(', ')});`);
  lines.push(`    expect(${literal(scenario.expectedStatus)}).toContain(response.status());`);
  lines.push(`  });`);
  return lines.join('\n');
}

function renderCleanup(tagPlan: TagPlan): string[] {
  const deleteEndpoints = tagPlan.endpoints
    .map((p) => p.endpoint)
    .filter((e) => e.method === 'DELETE');
  if (deleteEndpoints.length === 0 || !tagPlan.hasCreators) return [];

  const lines: string[] = [`  test.afterAll(async () => {`, `    if (!client) return;`];
  const methods = new Map(
    tagPlan.endpoints.map((p) => [p.endpoint, p.methodName] as const),
  );

  for (const del of deleteEndpoints) {
    const methodName = methods.get(del);
    if (!methodName) continue;
    const pathParam = del.parameters.find((p) => p.in === 'path');
    if (!pathParam) continue;
    const nameBased = /name/i.test(pathParam.name);
    const collection = nameBased ? 'createdNames' : 'createdIds';
    lines.push(`    for (const identifier of ${collection}) {`);
    lines.push(
      `      await client.${methodName}(identifier${nameBased ? '' : ' as number'}).catch(() => undefined);`,
    );
    lines.push(`    }`);
  }
  lines.push(`  });`);
  return lines;
}

function renderSpec(
  tagPlan: TagPlan,
  input: GenerationInput,
  schemas: Map<string, ResolvedSchema>,
): GeneratedFile {
  const typeImports = new Set<string>();
  const factoryImports = new Set<string>();

  const blocks: string[] = [];

  for (const { endpoint, methodName } of tagPlan.endpoints) {
    const happy = renderHappyPath(endpoint, methodName, schemas, tagPlan);
    const cast = responseCast(endpoint, schemas);
    if (cast) typeImports.add(cast.name);
    if (bodyTypeName(endpoint, schemas)) {
      factoryImports.add(`build${bodyTypeName(endpoint, schemas)}`);
    }
    blocks.push(happy);

    const key = `${endpoint.method} ${endpoint.path}`;
    const usedTitles = new Set<string>();
    const negatives = input.scenarios
      .filter((s) => s.endpoint === key && NEGATIVE_TYPES.has(s.type))
      .slice(0, MAX_NEGATIVES_PER_ENDPOINT);
    for (const scenario of negatives) {
      const isAuth =
        scenario.type === 'authentication_missing' ||
        scenario.type === 'authentication_invalid';
      const title = isAuth ? scenario.name : `${key} ${scenario.name}`;
      if (usedTitles.has(title)) continue;
      usedTitles.add(title);
      const rendered = renderNegativeScenario(
        scenario,
        endpoint,
        methodName,
        schemas,
        title,
      );
      if (rendered) blocks.push(rendered);
    }
  }

  const cleanup = renderCleanup(tagPlan);
  const needsApiRequest = blocks.some((b) =>
    b.includes('apiRequest.newContext'),
  );
  const needsEnv = needsApiRequest || blocks.some((b) => b.includes('hasCredentials('));

  const imports = [`import { expect, test${needsApiRequest ? ', request as apiRequest' : ''} } from '@playwright/test';`];
  if (needsEnv) imports.push(`import { env, hasCredentials } from '../config/env';`);
  imports.push(
    `import { ${tagPlan.className}Client } from '../lib/api/${tagPlan.slug}.client';`,
  );
  if (factoryImports.size > 0) {
    imports.push(
      `import { ${[...factoryImports].sort().join(', ')} } from '../lib/factories/${tagPlan.slug}.factory';`,
    );
  }
  if (typeImports.size > 0) {
    imports.push(
      `import type { ${[...typeImports].sort().join(', ')} } from '../types/api';`,
    );
  }

  const setup: string[] = [];
  setup.push(`let client: ${tagPlan.className}Client;`);
  setup.push('');
  setup.push('test.beforeEach(({ request }) => {');
  setup.push(`  client = new ${tagPlan.className}Client(request);`);
  setup.push('});');
  if (tagPlan.hasDeletes && tagPlan.hasCreators) {
    setup.push('');
    setup.push('const createdIds: number[] = [];');
    setup.push('const createdNames: string[] = [];');
  }

  const content = `${imports.join('\n')}

${setup.join('\n')}

test.describe('${tagPlan.tag}', () => {
${blocks.join('\n\n')}
${cleanup.join('\n')}
});
`;
  return {
    path: `tests/${tagPlan.slug}.spec.ts`,
    content,
  };
}

function packageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName,
      version: '1.0.0',
      private: true,
      description: 'API contract tests generated from the OpenAPI specification.',
      scripts: {
        test: 'playwright test',
        'test:headed': 'playwright test --headed',
        'test:debug': 'playwright test --debug',
        typecheck: 'tsc --noEmit',
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        format: 'prettier --write .',
        'format:check': 'prettier --check .',
      },
      devDependencies: {
        '@faker-js/faker': '^9.3.0',
        '@playwright/test': '^1.49.0',
        '@types/node': '^22.10.0',
        dotenv: '^16.4.7',
        eslint: '^9.16.0',
        'eslint-plugin-playwright': '^2.1.0',
        prettier: '^3.4.1',
        typescript: '^5.7.2',
        'typescript-eslint': '^8.17.0',
      },
    },
    null,
    2,
  );
}

function tsconfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["tests", "lib", "config", "types", "playwright.config.ts"]
}
`;
}

function eslintConfig(): string {
  return `import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
  {
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      'playwright/no-skipped-test': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/prefer-hooks-on-top': 'off',
      'playwright/consistent-spacing-between-blocks': 'off',
    },
  },
);
`;
}

function prettierConfig(): string {
  return `{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
`;
}

function gitignore(): string {
  return `node_modules/
playwright-report/
test-results/
.env
`;
}

function playwrightConfig(baseUrl: string): string {
  return `import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.API_BASE_URL ?? '${baseUrl}',
    extraHTTPHeaders: {
      ...(process.env.API_KEY ? { api_key: process.env.API_KEY } : {}),
      ...(process.env.BEARER_TOKEN ? { Authorization: \`Bearer \${process.env.BEARER_TOKEN}\` } : {}),
    },
  },
});
`;
}

function envConfig(baseUrl: string): string {
  return `import 'dotenv/config';

export const env = {
  API_BASE_URL: process.env.API_BASE_URL ?? '${baseUrl}',
  BEARER_TOKEN: process.env.BEARER_TOKEN ?? '',
  API_KEY: process.env.API_KEY ?? '',
  USERNAME: process.env.USERNAME ?? '',
  PASSWORD: process.env.PASSWORD ?? '',
};

export function hasCredentials(): boolean {
  return Boolean(env.BEARER_TOKEN || env.API_KEY || (env.USERNAME && env.PASSWORD));
}
`;
}

function envExample(baseUrl: string): string {
  return `API_BASE_URL=${baseUrl || ''}
BEARER_TOKEN=
API_KEY=
USERNAME=
PASSWORD=
`;
}

function readme(projectName: string, baseUrl: string): string {
  return `# ${projectName}

API contract test project generated from the OpenAPI specification.

## Structure

\`\`\`text
├── playwright.config.ts      Playwright runner configuration
├── config/env.ts             Typed environment configuration
├── types/api.ts              TypeScript models derived from the API contract
├── lib/api/                  Typed API clients, one per resource/tag
├── lib/factories/            Test data factories for request payloads
├── tests/                    Contract tests, one spec per resource/tag
└── .env.example              Environment variable template
\`\`\`

## Prerequisites

- Node.js 20+

## Install

\`\`\`bash
npm install
\`\`\`

## Configure

Copy \`.env.example\` to \`.env\` and fill in the values:

\`\`\`env
API_BASE_URL=${baseUrl || '<api base url>'}
BEARER_TOKEN=
API_KEY=
USERNAME=
PASSWORD=
\`\`\`

The base URL defaults to \`${baseUrl}\` when \`API_BASE_URL\` is not set.

Tests that require authentication are skipped when no credentials are configured.

## Run

\`\`\`bash
npm test
\`\`\`

## Quality checks

\`\`\`bash
npm run typecheck
npm run lint
npm run format:check
\`\`\`

## Interpreting failures

Every assertion is derived from the OpenAPI contract: documented status codes, required
fields, schema constraints, and authentication requirements. A failing test means the
running API returned something the contract does not document. Treat those failures as
contract drift or API defects, and update either the contract or the API — not the test.
`;
}

export function generatePlaywright(input: GenerationInput): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const schemas = collectNamedSchemas(input.manifest);
  const plans = groupEndpoints(input);

  files.push({ path: 'package.json', content: `${packageJson(input.projectName)}\n` });
  files.push({ path: 'tsconfig.json', content: tsconfig() });
  files.push({ path: 'eslint.config.mjs', content: eslintConfig() });
  files.push({ path: '.prettierrc.json', content: prettierConfig() });
  files.push({ path: '.gitignore', content: gitignore() });
  files.push({ path: 'playwright.config.ts', content: playwrightConfig(input.baseUrl) });
  files.push({ path: 'config/env.ts', content: envConfig(input.baseUrl) });
  files.push({ path: '.env.example', content: envExample(input.baseUrl) });
  files.push({ path: 'README.md', content: readme(input.projectName, input.baseUrl) });

  if (schemas.size > 0) {
    files.push({
      path: 'types/api.ts',
      content: `// TypeScript models derived from the OpenAPI contract.\n// Generated file: do not edit by hand.\n\n${renderInterfaces(schemas)}\n`,
    });
  }

  for (const plan of plans) {
    files.push(renderClient(plan, schemas));
    const factory = renderFactory(plan, schemas);
    if (factory) files.push(factory);
    files.push(renderSpec(plan, input, schemas));
  }

  return files;
}
