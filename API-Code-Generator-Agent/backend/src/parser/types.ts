export type SpecFormat = 'swagger2' | 'openapi3';
export type FileFormat = 'json' | 'yaml';
export type SourceType = 'url' | 'upload';

export const FRAMEWORKS = [
  'playwright',
  'restassured',
  'karate',
  'supertest',
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export interface ServerInfo {
  url: string;
  description?: string;
}

export interface SecurityScheme {
  name: string;
  type: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie' | 'body' | 'formData';
  required: boolean;
  description?: string;
  type?: string;
  format?: string;
  schema?: ResolvedSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
}

export interface ResponseDefinition {
  status: string;
  description?: string;
  schema?: ResolvedSchema;
  headers?: Record<string, unknown>;
}

export interface Endpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Parameter[];
  requestBody?: ResolvedSchema;
  requestBodyRequired?: boolean;
  responses: ResponseDefinition[];
  security?: Array<Record<string, string[]>>;
}

export interface ResolvedSchema {
  type?: string;
  format?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  required?: string[];
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  multipleOf?: number;
  items?: ResolvedSchema;
  properties?: Record<string, ResolvedSchema>;
  additionalProperties?: boolean | ResolvedSchema;
  allOf?: ResolvedSchema[];
  oneOf?: ResolvedSchema[];
  anyOf?: ResolvedSchema[];
  $ref?: string;
}

export interface CoverageRequirements {
  endpointCount: number;
  methodCount: number;
  documentedResponseCount: number;
  requiredFieldCount: number;
  boundaryConstraintCount: number;
  enumCount: number;
  securityRequirementCount: number;
  schemaCount: number;
}

export interface ApiManifest {
  spec: {
    title: string;
    version: string;
    format: SpecFormat;
    formatVersion: string;
  };
  servers: ServerInfo[];
  securitySchemes: SecurityScheme[];
  endpoints: Endpoint[];
  coverageRequirements: CoverageRequirements;
}

export interface ParseResult {
  manifest: ApiManifest;
  format: FileFormat;
  sourceType: SourceType;
  sourceUrl?: string;
  baseUrl: string;
}
