import { ApiManifest, Endpoint, Parameter, ResolvedSchema } from '../parser/types.js';

export function pascalCase(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return 'Unknown';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

export function camelCase(value: string): string {
  const pascal = pascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'api'
  );
}

export function refName($ref?: string): string | undefined {
  if (!$ref) return undefined;
  const part = $ref.split('/').pop();
  return part ? pascalCase(part) : undefined;
}

export function literal(value: unknown): string {
  return JSON.stringify(value);
}

function stringSample(schema: ResolvedSchema, name: string): string {
  const min = schema.minLength ?? 0;
  const base =
    schema.format === 'date-time'
      ? '2026-01-01T00:00:00Z'
      : schema.format === 'date'
        ? '2026-01-01'
        : schema.format === 'email'
          ? 'user@example.com'
          : schema.format === 'uuid'
            ? '123e4567-e89b-42d3-a456-426614174000'
            : schema.format === 'password'
              ? 'Str0ngP@ssw0rd!'
              : schema.format === 'binary' || schema.format === 'byte'
                ? 'dGVzdA=='
                : `sample-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return base.length >= min ? base : `${base}${'x'.repeat(min - base.length)}`;
}

function numericSample(schema: ResolvedSchema): number {
  if (schema.minimum !== undefined) return schema.minimum;
  if (schema.maximum !== undefined) return schema.maximum;
  return 1;
}

function objectSample(schema: ResolvedSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const required = new Set(schema.required ?? []);
  for (const [field, prop] of Object.entries(schema.properties ?? {})) {
    if (required.size === 0 || required.has(field)) {
      out[field] = sampleValue(prop, field);
    }
  }
  return out;
}

export function sampleValue(schema?: ResolvedSchema, name = 'value'): unknown {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: ResolvedSchema = { ...schema };
    for (const part of schema.allOf) {
      merged.properties = { ...merged.properties, ...part.properties };
      merged.required = [...(merged.required ?? []), ...(part.required ?? [])];
    }
    return sampleValue(merged, name);
  }
  const pick = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (pick) return sampleValue(pick, name);

  switch (schema.type) {
    case 'string':
      return stringSample(schema, name);
    case 'integer':
    case 'number':
      return numericSample(schema);
    case 'boolean':
      return true;
    case 'array': {
      const length = Math.max(1, schema.minItems ?? 1);
      return Array.from({ length }, () => sampleValue(schema.items, name));
    }
    case 'object':
    case undefined:
      if (schema.properties) return objectSample(schema);
      return {};
    default:
      return null;
  }
}

function enumLiteralType(values?: unknown[]): string | undefined {
  if (!values || values.length === 0) return undefined;
  return values.map((value) => literal(value)).join(' | ');
}

export function tsType(
  schema: ResolvedSchema | undefined,
  parentName: string,
  fieldName: string,
  queue: Map<string, ResolvedSchema>,
): string {
  if (!schema) return 'unknown';
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    const nested = `${parentName}${pascalCase(fieldName)}`;
    queue.set(nested, schema);
    return nested;
  }
  if (schema.type === 'array') {
    const item = tsType(schema.items, parentName, `${fieldName}Item`, queue);
    return `${item}[]`;
  }
  const enumType = enumLiteralType(schema.enum);
  if (enumType) return enumType;
  if (schema.$ref) return refName(schema.$ref) ?? 'Record<string, unknown>';
  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'object':
      return 'Record<string, unknown>';
    default:
      break;
  }
  if (typeof schema.additionalProperties === 'object') {
    return `Record<string, ${tsType(schema.additionalProperties, parentName, `${fieldName}Value`, queue)}>`;
  }
  return 'Record<string, unknown>';
}

function ensureRefPlaceholders(schema: ResolvedSchema, queue: Map<string, ResolvedSchema>): void {
  if (schema.$ref && !schema.properties && !schema.type) {
    const name = refName(schema.$ref);
    if (name && !queue.has(name)) queue.set(name, {});
  }
  for (const prop of Object.values(schema.properties ?? {})) {
    ensureRefPlaceholders(prop, queue);
  }
  if (schema.items) ensureRefPlaceholders(schema.items, queue);
}

export function renderInterfaces(schemas: Map<string, ResolvedSchema>): string {
  const queue = new Map(schemas);
  const blocks: string[] = [];
  const order: string[] = [];

  for (const name of queue.keys()) order.push(name);
  let index = 0;
  while (index < order.length) {
    const name = order[index] ?? '';
    index += 1;
    const schema = queue.get(name);
    if (!schema) continue;

    const nested = new Map<string, ResolvedSchema>();

    if (schema.type === 'array') {
      const item = tsType(schema.items, name, 'Item', nested);
      blocks.push(`export type ${name} = ${item}[];`);
    } else {
      const props = Object.entries(schema.properties ?? {});
      const required = new Set(schema.required ?? []);

      const lines: string[] = [`export interface ${name} {`];
      if (props.length > 0) {
        for (const [field, prop] of props) {
          const type = tsType(prop, name, field, nested);
          lines.push(`  ${field}${required.has(field) ? '' : '?'}: ${type};`);
        }
      } else if (typeof schema.additionalProperties === 'object') {
        const valueType = tsType(
          schema.additionalProperties,
          name,
          'Value',
          nested,
        );
        lines.push(`  [key: string]: ${valueType};`);
      } else {
        lines.push('  [key: string]: unknown;');
      }
      lines.push('}');
      blocks.push(lines.join('\n'));
    }

    ensureRefPlaceholders(schema, nested);
    for (const nestedName of nested.keys()) {
      if (!queue.has(nestedName)) order.push(nestedName);
    }
    for (const [nestedName, nestedSchema] of nested) {
      if (!queue.has(nestedName)) queue.set(nestedName, nestedSchema);
    }
  }

  return blocks.join('\n\n');
}

export function operationBaseName(endpoint: Endpoint): string {
  return pascalCase(endpoint.operationId ?? `${endpoint.method}${endpoint.path}`);
}

export function requestBodyTypeName(endpoint: Endpoint, schemas: Map<string, ResolvedSchema>): string | undefined {
  const schema = endpoint.requestBody;
  if (!schema) return undefined;
  const named = refName(schema.$ref);
  if (named) return named;
  const fallback = `${operationBaseName(endpoint)}Request`;
  return schemas.has(fallback) ? fallback : undefined;
}

export function responseTypeName(
  endpoint: Endpoint,
  status: string,
  schemas: Map<string, ResolvedSchema>,
): string | undefined {
  const response = endpoint.responses.find((r) => r.status === status);
  const schema = response?.schema;
  if (!schema) return undefined;
  const named = refName(schema.$ref);
  if (named) return named;
  const fallback = `${operationBaseName(endpoint)}${pascalCase(status)}Response`;
  return schemas.has(fallback) ? fallback : undefined;
}

export function collectNamedSchemas(manifest: ApiManifest): Map<string, ResolvedSchema> {
  const schemas = new Map<string, ResolvedSchema>();

  for (const endpoint of manifest.endpoints) {
    const base = operationBaseName(endpoint);
    if (endpoint.requestBody) {
      const name = refName(endpoint.requestBody.$ref) ?? `${base}Request`;
      if (!schemas.has(name)) schemas.set(name, endpoint.requestBody);
    }
    for (const response of endpoint.responses) {
      if (!response.schema) continue;
      const name = refName(response.schema.$ref) ?? `${base}${pascalCase(response.status)}Response`;
      if (!schemas.has(name)) schemas.set(name, response.schema);
    }
  }

  return schemas;
}

export function successStatuses(endpoint: Endpoint): number[] {
  const statuses = endpoint.responses
    .map((r) => Number.parseInt(r.status, 10))
    .filter((status) => Number.isInteger(status) && status >= 200 && status < 300);
  return statuses.length > 0 ? statuses : [200];
}

export function successResponseSchema(endpoint: Endpoint): ResolvedSchema | undefined {
  const success = successStatuses(endpoint);
  return endpoint.responses.find((r) => success.includes(Number.parseInt(r.status, 10)))?.schema;
}

export function paramSchema(param?: Parameter): ResolvedSchema | undefined {
  if (!param) return undefined;
  if (param.schema) return param.schema;
  const schema: ResolvedSchema = {};
  if (param.type !== undefined) schema.type = param.type;
  if (param.format !== undefined) schema.format = param.format;
  if (param.enum !== undefined) schema.enum = param.enum;
  if (param.minimum !== undefined) schema.minimum = param.minimum;
  if (param.maximum !== undefined) schema.maximum = param.maximum;
  if (param.minLength !== undefined) schema.minLength = param.minLength;
  if (param.maxLength !== undefined) schema.maxLength = param.maxLength;
  if (param.pattern !== undefined) schema.pattern = param.pattern;
  if (param.default !== undefined) schema.default = param.default;
  return Object.keys(schema).length > 0 ? schema : undefined;
}

export function resolvePath(endpoint: Endpoint): string {
  return endpoint.path.replace(/\{([^}]+)\}/g, (match, name: string) => {
    const param = endpoint.parameters.find((p) => p.in === 'path' && p.name === name);
    const value = sampleValue(paramSchema(param), name);
    return String(value);
  });
}

export function pathParamValue(endpoint: Endpoint, name: string): unknown {
  const param = endpoint.parameters.find((p) => p.in === 'path' && p.name === name);
  return sampleValue(paramSchema(param), name);
}

export function queryParamsSample(endpoint: Endpoint): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const p of endpoint.parameters) {
    if (p.in !== 'query') continue;
    const value = sampleValue(paramSchema(p), p.name);
    if (Array.isArray(value)) {
      const first = value[0];
      params[p.name] =
        first === null || first === undefined ? '' : typeof first === 'object' ? JSON.stringify(first) : (first as string | number | boolean);
    } else if (value !== null && typeof value === 'object') {
      params[p.name] = JSON.stringify(value);
    } else {
      params[p.name] = value === null ? '' : (value as string | number | boolean);
    }
  }
  return params;
}

export function hasSecurity(endpoint: Endpoint): boolean {
  return Boolean(endpoint.security && endpoint.security.length > 0);
}

export function successSchemaProperties(endpoint: Endpoint): Array<{ field: string; schema: ResolvedSchema; required: boolean }> {
  const schema = successResponseSchema(endpoint);
  if (!schema || !schema.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([field, prop]) => ({
    field,
    schema: prop,
    required: required.has(field),
  }));
}
