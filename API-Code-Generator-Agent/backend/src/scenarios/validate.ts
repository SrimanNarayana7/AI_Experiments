import { ApiManifest } from '../parser/types.js';
import { TestScenario } from './index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  removed: TestScenario[];
  kept: TestScenario[];
}

function endpointExists(manifest: ApiManifest, method: string, path: string): boolean {
  return manifest.endpoints.some(
    (e) => e.method.toUpperCase() === method.toUpperCase() && e.path === path,
  );
}

export function validateScenarios(
  manifest: ApiManifest,
  scenarios: TestScenario[],
): ValidationResult {
  const errors: string[] = [];
  const removed: TestScenario[] = [];
  const kept: TestScenario[] = [];

  for (const scenario of scenarios) {
    const [method, ...pathParts] = scenario.endpoint.split(' ');
    const path = pathParts.join(' ');

    if (!method || !path || !endpointExists(manifest, method, path)) {
      errors.push(`Scenario ${scenario.id}: endpoint does not exist (${scenario.endpoint})`);
      removed.push(scenario);
      continue;
    }

    if (!Array.isArray(scenario.expectedStatus) || scenario.expectedStatus.length === 0) {
      errors.push(`Scenario ${scenario.id}: missing expected status`);
      removed.push(scenario);
      continue;
    }

    if (scenario.inputMutation) {
      const mutation = scenario.inputMutation;
      if (!mutation.field || !mutation.action) {
        errors.push(`Scenario ${scenario.id}: malformed input mutation`);
        removed.push(scenario);
        continue;
      }
    }

    kept.push(scenario);
  }

  return { valid: errors.length === 0, errors, removed, kept };
}
