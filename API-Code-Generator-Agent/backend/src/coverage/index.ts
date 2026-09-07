import { ApiManifest } from '../parser/types.js';
import { TestScenario } from '../scenarios/index.js';

export interface CoverageMetrics {
  endpointCoverage: number;
  methodCoverage: number;
  responseCoverage: number;
  requiredFieldCoverage: number;
  boundaryCoverage: number;
  enumCoverage: number;
  securityCoverage: number;
  schemaCoverage: number;
  overall: number;
}

export interface CoverageReport {
  requirements: {
    endpoints: number;
    methods: number;
    documentedResponses: number;
    requiredFields: number;
    boundaryConstraints: number;
    enums: number;
    securityRequirements: number;
    schemas: number;
  };
  generated: {
    endpoints: number;
    methods: number;
    documentedResponses: number;
    requiredFields: number;
    boundaryConstraints: number;
    enums: number;
    securityRequirements: number;
    schemas: number;
  };
  coverage: CoverageMetrics;
  uncovered: string[];
}

function pct(generated: number, required: number): number {
  if (required === 0) return 100;
  return Math.min(100, Math.round((generated / required) * 100));
}

export function computeCoverage(
  manifest: ApiManifest,
  scenarios: TestScenario[],
): CoverageReport {
  const req = manifest.coverageRequirements;

  const generatedEndpoints = new Set(scenarios.map((s) => s.endpoint)).size;
  const generatedMethods = scenarios.length > 0 ? scenarios.length : 0;
  const generatedResponses = scenarios.filter((s) => s.type === 'documented_response').length;
  const generatedRequired = scenarios.filter((s) => s.type === 'missing_required').length;
  const generatedBoundary = scenarios.filter(
    (s) => s.type === 'boundary_min' || s.type === 'boundary_max',
  ).length;
  const generatedEnums = scenarios.filter((s) => s.type === 'invalid_enum').length;
  const generatedSecurity = scenarios.filter(
    (s) => s.type === 'authentication_missing' || s.type === 'authentication_invalid',
  ).length;
  const generatedSchemas = scenarios.filter((s) => s.type === 'schema_validation').length;

  const coverage: CoverageMetrics = {
    endpointCoverage: pct(generatedEndpoints, req.endpointCount),
    methodCoverage: pct(
      new Set(scenarios.map((s) => `${s.method} ${s.endpoint}`)).size,
      req.methodCount,
    ),
    responseCoverage: pct(generatedResponses, req.documentedResponseCount),
    requiredFieldCoverage: pct(generatedRequired, req.requiredFieldCount),
    boundaryCoverage: pct(generatedBoundary, req.boundaryConstraintCount),
    enumCoverage: pct(generatedEnums, req.enumCount),
    securityCoverage: pct(generatedSecurity, req.securityRequirementCount),
    schemaCoverage: pct(generatedSchemas, req.schemaCount),
    overall: 0,
  };

  const values = Object.values(coverage).filter((v) => v !== undefined);
  coverage.overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const uncovered: string[] = [];
  if (coverage.endpointCoverage < 100) {
    uncovered.push(
      `${req.endpointCount - generatedEndpoints} endpoints have no generated scenario`,
    );
  }
  if (coverage.responseCoverage < 100) {
    uncovered.push(
      `${req.documentedResponseCount - generatedResponses} documented responses have no generated scenario`,
    );
  }
  if (coverage.requiredFieldCoverage < 100) {
    uncovered.push(
      `${req.requiredFieldCount - generatedRequired} required fields have no missing-field scenario`,
    );
  }
  if (coverage.boundaryCoverage < 100) {
    uncovered.push(
      `${req.boundaryConstraintCount - generatedBoundary} boundary constraints have no scenario`,
    );
  }
  if (coverage.enumCoverage < 100) {
    uncovered.push(`${req.enumCount - generatedEnums} enums have no invalid-enum scenario`);
  }
  if (coverage.securityCoverage < 100) {
    uncovered.push(
      `${req.securityRequirementCount - generatedSecurity} security requirements have no scenario`,
    );
  }

  return {
    requirements: {
      endpoints: req.endpointCount,
      methods: req.methodCount,
      documentedResponses: req.documentedResponseCount,
      requiredFields: req.requiredFieldCount,
      boundaryConstraints: req.boundaryConstraintCount,
      enums: req.enumCount,
      securityRequirements: req.securityRequirementCount,
      schemas: req.schemaCount,
    },
    generated: {
      endpoints: generatedEndpoints,
      methods: generatedMethods,
      documentedResponses: generatedResponses,
      requiredFields: generatedRequired,
      boundaryConstraints: generatedBoundary,
      enums: generatedEnums,
      securityRequirements: generatedSecurity,
      schemas: generatedSchemas,
    },
    coverage,
    uncovered,
  };
}
