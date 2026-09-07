import { ApiManifest, Framework } from '../parser/types.js';
import { TestScenario } from '../scenarios/index.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationInput {
  manifest: ApiManifest;
  scenarios: TestScenario[];
  framework: Framework;
  baseUrl: string;
  projectName: string;
  authType?: string;
  additionalInstructions?: string;
}

export interface GeneratedProject {
  framework: Framework;
  projectName: string;
  files: GeneratedFile[];
  scenarioCount: number;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function groupByTag(
  manifest: ApiManifest,
): Map<string, { path: string; method: string; operationId?: string; summary?: string }[]> {
  const map = new Map<string, { path: string; method: string; operationId?: string; summary?: string }[]>();
  for (const endpoint of manifest.endpoints) {
    const tags = endpoint.tags.length ? endpoint.tags : ['default'];
    for (const tag of tags) {
      const list = map.get(tag) ?? [];
      list.push({
        path: endpoint.path,
        method: endpoint.method,
        operationId: endpoint.operationId,
        summary: endpoint.summary,
      });
      map.set(tag, list);
    }
  }
  return map;
}

export function toEnvValue(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}
