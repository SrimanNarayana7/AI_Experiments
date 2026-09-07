import { FRAMEWORKS } from '../parser/types.js';

export interface ParseRouteResult {
  id: string;
  name: string;
  sourceType: 'url' | 'upload';
  format: string;
  version: string;
  title: string;
  baseUrl: string;
  manifest: unknown;
}

export interface GenerationRouteResult {
  id: string;
  framework: string;
  projectName: string;
  scenarioCount: number;
  coverage: unknown;
  files: { path: string; content: string }[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
}

export const ERRORS = {
  noSpec: (): ApiError => ({
    statusCode: 400,
    message: 'No OpenAPI specification provided. Upload a JSON/YAML file or provide a specification URL.',
    code: 'NO_SPEC',
  }),
  unsupportedFramework: (): ApiError => ({
    statusCode: 400,
    message: `Unsupported framework. Choose ${FRAMEWORKS.join(', ')}.`,
    code: 'UNSUPPORTED_FRAMEWORK',
  }),
  invalidSpec: (message: string): ApiError => ({
    statusCode: 422,
    message,
    code: 'INVALID_SPEC',
  }),
};

export function isFramework(value: string): value is (typeof FRAMEWORKS)[number] {
  return (FRAMEWORKS as readonly string[]).includes(value);
}

export function baseUrlFromManifest(manifest: { servers?: { url: string }[] }): string {
  return manifest.servers?.[0]?.url ?? '';
}
