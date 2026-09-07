import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';
import {
  ApiManifest,
  CoverageRequirements,
  Endpoint,
  Parameter,
  ParseResult,
  ResolvedSchema,
  ResponseDefinition,
  SecurityScheme,
  ServerInfo,
  SpecFormat,
} from './types.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_DOCUMENT'
      | 'UNSUPPORTED_VERSION'
      | 'UNRESOLVED_REFERENCE'
      | 'MALFORMED_INPUT',
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detectFormat(raw: string): 'json' | 'yaml' {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  return 'yaml';
}

function parseDocument(raw: string): unknown {
  try {
    return YAML.parse(raw, { strict: false, uniqueKeys: true });
  } catch (error) {
    throw new ParseError(
      `Malformed specification: ${error instanceof Error ? error.message : 'unknown error'}`,
      'MALFORMED_INPUT',
    );
  }
}

function resolveVersion(doc: Record<string, unknown>): SpecFormat {
  if (typeof doc.swagger === 'string' && doc.swagger.startsWith('2.')) {
    return 'swagger2';
  }
  if (typeof doc.openapi === 'string' && doc.openapi.startsWith('3.')) {
    return 'openapi3';
  }
  throw new ParseError(
    'Unsupported specification. Expected Swagger 2.0 or OpenAPI 3.x.',
    'UNSUPPORTED_VERSION',
  );
}

function toSchema(value: unknown): ResolvedSchema | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const schema: ResolvedSchema = {};
  if (typeof value.type === 'string') schema.type = value.type;
  if (typeof value.format === 'string') schema.format = value.format;
  if (typeof value.description === 'string') schema.description = value.description;
  if ('default' in value) schema.default = value.default;
  if ('example' in value) schema.example = value.example;
  if (Array.isArray(value.enum)) schema.enum = value.enum;
  if (Array.isArray(value.required)) schema.required = value.required as string[];
  if (typeof value.nullable === 'boolean') schema.nullable = value.nullable;
  if (typeof value.minimum === 'number') schema.minimum = value.minimum;
  if (typeof value.maximum === 'number') schema.maximum = value.maximum;
  if (typeof value.exclusiveMinimum === 'boolean') schema.exclusiveMinimum = value.exclusiveMinimum;
  if (typeof value.exclusiveMaximum === 'boolean') schema.exclusiveMaximum = value.exclusiveMaximum;
  if (typeof value.minLength === 'number') schema.minLength = value.minLength;
  if (typeof value.maxLength === 'number') schema.maxLength = value.maxLength;
  if (typeof value.minItems === 'number') schema.minItems = value.minItems;
  if (typeof value.maxItems === 'number') schema.maxItems = value.maxItems;
  if (typeof value.pattern === 'string') schema.pattern = value.pattern;
  if (typeof value.multipleOf === 'number') schema.multipleOf = value.multipleOf;

  if (isRecord(value.items) || typeof value.items === 'boolean') {
    schema.items = toSchema(value.items);
  }
  if (isRecord(value.properties)) {
    schema.properties = Object.fromEntries(
      Object.entries(value.properties)
        .map(([k, v]) => [k, toSchema(v)])
        .filter(([, v]) => v !== undefined) as [string, ResolvedSchema][],
    );
  }
  if (typeof value.additionalProperties === 'boolean') {
    schema.additionalProperties = value.additionalProperties;
  } else if (isRecord(value.additionalProperties)) {
    schema.additionalProperties = toSchema(value.additionalProperties);
  }
  if (Array.isArray(value.allOf)) schema.allOf = value.allOf.map(toSchema).filter((s): s is ResolvedSchema => s !== undefined);
  if (Array.isArray(value.oneOf)) schema.oneOf = value.oneOf.map(toSchema).filter((s): s is ResolvedSchema => s !== undefined);
  if (Array.isArray(value.anyOf)) schema.anyOf = value.anyOf.map(toSchema).filter((s): s is ResolvedSchema => s !== undefined);
  if (typeof value.$ref === 'string') schema.$ref = value.$ref;

  return schema;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function extractServers(doc: Record<string, unknown>, format: SpecFormat): ServerInfo[] {
  if (format === 'openapi3' && Array.isArray(doc.servers)) {
    return (doc.servers as Array<Record<string, unknown>>)
      .filter((s) => typeof s.url === 'string')
      .map((s) => ({
        url: s.url as string,
        description: typeof s.description === 'string' ? s.description : undefined,
      }));
  }
  // Swagger 2.0: host + basePath + schemes
  const schemes = Array.isArray(doc.schemes) ? (doc.schemes as string[]) : ['https'];
  const host = typeof doc.host === 'string' ? doc.host : '';
  const basePath = typeof doc.basePath === 'string' ? doc.basePath : '';
  if (!host) return [];
  return schemes.map((scheme) => ({
    url: `${scheme}://${host}${basePath}`.replace(/\/$/, ''),
  }));
}

function extractSecuritySchemes(doc: Record<string, unknown>, format: SpecFormat): SecurityScheme[] {
  const schemes: SecurityScheme[] = [];
  const source =
    format === 'openapi3'
      ? (doc.components as Record<string, unknown> | undefined)?.securitySchemes
      : (doc.securityDefinitions as Record<string, unknown> | undefined);

  if (isRecord(source)) {
    for (const [name, def] of Object.entries(source)) {
      if (!isRecord(def)) continue;
      schemes.push({
        name,
        type: typeof def.type === 'string' ? def.type : 'unknown',
        in: typeof def.in === 'string' ? def.in : undefined,
        scheme: typeof def.scheme === 'string' ? def.scheme : undefined,
        bearerFormat: typeof def.bearerFormat === 'string' ? def.bearerFormat : undefined,
        flows: isRecord(def.flows) ? def.flows : undefined,
      });
    }
  }
  return schemes;
}

function extractParameters(
  params: unknown[],
  format: SpecFormat,
): Parameter[] {
  return params
    .filter(isRecord)
    .map((p) => {
      const inValue = typeof p.in === 'string' ? p.in : undefined;
      const schema =
        isRecord(p.schema)
          ? toSchema(p.schema)
          : format === 'openapi3'
            ? toSchema(p.schema)
            : isRecord(p)
              ? toSchema(p)
              : undefined;
      return {
        name: typeof p.name === 'string' ? p.name : 'unknown',
        in: (inValue ?? 'query') as Parameter['in'],
        required: p.required === true,
        description: typeof p.description === 'string' ? p.description : undefined,
        type: schema?.type,
        format: schema?.format,
        schema,
        enum: Array.isArray(p.enum) ? p.enum : undefined,
        minimum: typeof p.minimum === 'number' ? p.minimum : undefined,
        maximum: typeof p.maximum === 'number' ? p.maximum : undefined,
        minLength: typeof p.minLength === 'number' ? p.minLength : undefined,
        maxLength: typeof p.maxLength === 'number' ? p.maxLength : undefined,
        pattern: typeof p.pattern === 'string' ? p.pattern : undefined,
        default: 'default' in p ? p.default : undefined,
      };
    });
}

function schemaFromContent(content: unknown): ResolvedSchema | undefined {
  if (!isRecord(content)) return undefined;
  for (const media of Object.values(content)) {
    if (isRecord(media) && isRecord(media.schema)) {
      return toSchema(media.schema);
    }
  }
  return undefined;
}

function extractResponses(operation: Record<string, unknown>): ResponseDefinition[] {
  const responses = operation.responses;
  if (!isRecord(responses)) return [];
  return Object.entries(responses)
    .filter(([, v]) => isRecord(v))
    .map(([status, v]) => {
      const r = v as Record<string, unknown>;
      const schema = isRecord(r.schema) ? toSchema(r.schema) : schemaFromContent(r.content);
      return {
        status,
        description: typeof r.description === 'string' ? r.description : undefined,
        schema,
        headers: isRecord(r.headers) ? r.headers : undefined,
      };
    });
}

function extractRequestBody(operation: Record<string, unknown>): { schema?: ResolvedSchema; required?: boolean } {
  const requestBody = operation.requestBody;
  if (!isRecord(requestBody)) return {};
  return {
    schema: schemaFromContent(requestBody.content),
    required: requestBody.required === true,
  };
}

function extractEndpoints(doc: Record<string, unknown>, format: SpecFormat): Endpoint[] {
  const paths = doc.paths;
  if (!isRecord(paths)) return [];
  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isRecord(operation)) continue;

      // Merge path-level parameters with operation-level parameters.
      const pathParams = Array.isArray(pathItem.parameters) ? (pathItem.parameters as unknown[]) : [];
      const opParams = Array.isArray(operation.parameters) ? (operation.parameters as unknown[]) : [];
      const parameters = extractParameters([...pathParams, ...opParams], format);

      const requestBody = format === 'openapi3' ? extractRequestBody(operation) : {};
      const bodyParam = parameters.find((p) => p.in === 'body');
      const requestSchema = requestBody.schema ?? bodyParam?.schema;

      const tags = Array.isArray(operation.tags) ? (operation.tags as string[]) : [];

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: typeof operation.operationId === 'string' ? operation.operationId : undefined,
        summary: typeof operation.summary === 'string' ? operation.summary : undefined,
        description: typeof operation.description === 'string' ? operation.description : undefined,
        tags,
        parameters,
        requestBody: requestSchema,
        requestBodyRequired: requestBody.required ?? bodyParam?.required ?? false,
        responses: extractResponses(operation),
        security: Array.isArray(operation.security) ? (operation.security as Endpoint['security']) : undefined,
      });
    }
  }
  return endpoints;
}

function countRequiredFields(endpoints: Endpoint[]): number {
  let count = 0;
  const walk = (schema?: ResolvedSchema): void => {
    if (!schema) return;
    if (schema.required) count += schema.required.length;
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) walk(prop);
    }
    if (schema.items) walk(schema.items);
  };
  for (const endpoint of endpoints) {
    walk(endpoint.requestBody);
    for (const response of endpoint.responses) walk(response.schema);
  }
  return count;
}

function countBoundaryConstraints(endpoints: Endpoint[]): number {
  let count = 0;
  const walk = (schema?: ResolvedSchema): void => {
    if (!schema) return;
    if (
      schema.minimum !== undefined ||
      schema.maximum !== undefined ||
      schema.minLength !== undefined ||
      schema.maxLength !== undefined ||
      schema.minItems !== undefined ||
      schema.maxItems !== undefined ||
      schema.pattern !== undefined
    ) {
      count += 1;
    }
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) walk(prop);
    }
    if (schema.items) walk(schema.items);
  };
  for (const endpoint of endpoints) {
    for (const p of endpoint.parameters) {
      if (
        p.minimum !== undefined ||
        p.maximum !== undefined ||
        p.minLength !== undefined ||
        p.maxLength !== undefined ||
        p.pattern !== undefined
      ) {
        count += 1;
      }
    }
    walk(endpoint.requestBody);
  }
  return count;
}

function countEnums(endpoints: Endpoint[]): number {
  let count = 0;
  const walk = (schema?: ResolvedSchema): void => {
    if (!schema) return;
    if (schema.enum) count += 1;
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) walk(prop);
    }
    if (schema.items) walk(schema.items);
  };
  for (const endpoint of endpoints) {
    for (const p of endpoint.parameters) if (p.enum) count += 1;
    walk(endpoint.requestBody);
  }
  return count;
}

function computeCoverage(endpoints: Endpoint[]): CoverageRequirements {
  const methodCount = endpoints.length;
  const documentedResponseCount = endpoints.reduce(
    (sum, e) => sum + e.responses.length,
    0,
  );
  const securityRequirementCount = endpoints.filter((e) => e.security?.length).length;
  const schemaSet = new Set<string>();
  const collectSchemaRefs = (schema?: ResolvedSchema): void => {
    if (!schema) return;
    if (schema.$ref) schemaSet.add(schema.$ref);
    if (schema.properties) for (const p of Object.values(schema.properties)) collectSchemaRefs(p);
    if (schema.items) collectSchemaRefs(schema.items);
  };
  for (const e of endpoints) {
    collectSchemaRefs(e.requestBody);
    for (const r of e.responses) collectSchemaRefs(r.schema);
  }

  return {
    endpointCount: new Set(endpoints.map((e) => `${e.method} ${e.path}`)).size,
    methodCount,
    documentedResponseCount,
    requiredFieldCount: countRequiredFields(endpoints),
    boundaryConstraintCount: countBoundaryConstraints(endpoints),
    enumCount: countEnums(endpoints),
    securityRequirementCount,
    schemaCount: schemaSet.size,
  };
}

export async function parseSpec(
  raw: string,
  sourceType: 'url' | 'upload',
  sourceUrl?: string,
): Promise<ParseResult> {
  const format = detectFormat(raw);
  const doc = parseDocument(raw);

  if (!isRecord(doc)) {
    throw new ParseError(
      'Specification is not a valid object document.',
      'INVALID_DOCUMENT',
    );
  }

  const specFormat = resolveVersion(doc);

  // Dereference all $refs (local + remote) and validate against the format.
  let resolved: Record<string, unknown>;
  try {
    resolved = (await SwaggerParser.dereference(doc as never)) as Record<string, unknown>;
  } catch (error) {
    throw new ParseError(
      `Unable to resolve $ref references: ${error instanceof Error ? error.message : 'unknown error'}`,
      'UNRESOLVED_REFERENCE',
    );
  }

  const formatVersion =
    specFormat === 'openapi3' ? (resolved.openapi as string) : (resolved.swagger as string);
  const title =
    (isRecord(resolved.info) && typeof resolved.info.title === 'string'
      ? resolved.info.title
      : 'Untitled API') as string;
  const version =
    isRecord(resolved.info) && typeof resolved.info.version === 'string'
      ? (resolved.info.version as string)
      : '0.0.0';

  const servers = extractServers(resolved, specFormat);
  const endpoints = extractEndpoints(resolved, specFormat);

  const manifest: ApiManifest = {
    spec: {
      title,
      version,
      format: specFormat,
      formatVersion,
    },
    servers,
    securitySchemes: extractSecuritySchemes(resolved, specFormat),
    endpoints,
    coverageRequirements: computeCoverage(endpoints),
  };

  const baseUrl = servers[0]?.url ?? '';

  return {
    manifest,
    format,
    sourceType,
    sourceUrl,
    baseUrl,
  };
}
