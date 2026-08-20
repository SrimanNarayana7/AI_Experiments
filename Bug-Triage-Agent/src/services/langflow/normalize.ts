import type { BugTriageResult } from '../../types/triage';
import { getPath, findRootObject, findMessageText } from '../../utils/langflow';
import { parseMarkdownReport, detectUntriagedReport } from './markdown';
import { TriageError } from './errors';

/**
 * Normalizes a raw Langflow response into a typed BugTriageResult.
 *
 * Langflow chat runs wrap the Agent/Chat Output content inside a nested
 * `outputs[].outputs.message.message` structure. The content itself can be
 * a JSON string, a JSON object, or plain text containing a fenced JSON block.
 * This layer extracts the content, parses it, and validates the required
 * triage fields without silently manufacturing missing values.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()));
  if (strings.length === 0 || strings.some((item) => item.length === 0)) {
    return undefined;
  }
  return strings;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((allowed as readonly string[]).includes(upper)) {
      return upper as T;
    }
  }
  throw new Error(`Langflow response is missing a valid "${field}" value.`);
}

function normalizeConfidence(value: unknown): 'HIGH' | 'MEDIUM' | 'LOW' {
  return normalizeEnum(value, ['HIGH', 'MEDIUM', 'LOW'] as const, 'confidence');
}

function normalizeSeverity(value: unknown): 'S1' | 'S2' | 'S3' {
  return normalizeEnum(value, ['S1', 'S2', 'S3'] as const, 'severity');
}

function normalizePriority(value: unknown): 'P1' | 'P2' | 'P3' {
  return normalizeEnum(value, ['P1', 'P2', 'P3'] as const, 'priority');
}

function normalizeString(value: unknown, field: string): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`Langflow response is missing required field "${field}".`);
  }
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function normalizeRootCause(raw: unknown): {
  confirmed_facts: string[];
  hypothesis: string;
  unknowns: string[];
  evidence_required: string[];
} {
  if (!isRecord(raw)) {
    throw new Error('Langflow response is missing required object "root_cause_analysis".');
  }
  const confirmedFacts = asStringArray(raw.confirmed_facts);
  if (!confirmedFacts) {
    throw new Error('Langflow response is missing required field "root_cause_analysis.confirmed_facts".');
  }
  const hypothesis = normalizeString(raw.hypothesis, 'root_cause_analysis.hypothesis');
  const unknowns = asStringArray(raw.unknowns);
  if (!unknowns) {
    throw new Error('Langflow response is missing required field "root_cause_analysis.unknowns".');
  }
  const evidenceRequired = asStringArray(raw.evidence_required);
  if (!evidenceRequired) {
    throw new Error('Langflow response is missing required field "root_cause_analysis.evidence_required".');
  }
  return {
    confirmed_facts: confirmedFacts,
    hypothesis,
    unknowns,
    evidence_required: evidenceRequired,
  };
}

function normalizeTriage(raw: Record<string, unknown>): BugTriageResult {
  const impactAreas = asStringArray(raw.impact_areas);
  if (!impactAreas) {
    throw new Error('Langflow response is missing required field "impact_areas".');
  }

  const severity = asRecord(raw.severity);
  const priority = asRecord(raw.priority);

  return {
    issue_key: normalizeString(raw.issue_key, 'issue_key'),
    summary: normalizeString(raw.summary, 'summary'),
    issue_type: normalizeOptionalString(raw.issue_type),
    status: normalizeOptionalString(raw.status),
    severity: {
      value: normalizeSeverity(severity?.value ?? raw.severity),
      confidence: normalizeConfidence(severity?.confidence ?? getPath(raw.severity, 'confidence')),
      reason: normalizeString(severity?.reason, 'severity.reason'),
    },
    priority: {
      value: normalizePriority(priority?.value ?? raw.priority),
      confidence: normalizeConfidence(priority?.confidence ?? getPath(raw.priority, 'confidence')),
      reason: normalizeString(priority?.reason, 'priority.reason'),
    },
    impact_areas: impactAreas,
    root_cause_analysis: normalizeRootCause(raw.root_cause_analysis),
    triage_justification: normalizeString(raw.triage_justification, 'triage_justification'),
  };
}

/**
 * Normalizes the raw Langflow run response into a typed BugTriageResult.
 *
 * Two response shapes are supported:
 * 1. Structured JSON payload (object / JSON string / fenced JSON block).
 * 2. The markdown triage report produced by the existing workflow.
 *
 * Throws a descriptive Error when the content cannot be located or validated.
 */
export function normalizeLangflowResponse(payload: unknown): BugTriageResult {
  if (!isRecord(payload)) {
    throw new Error('Langflow returned an unexpected response format.');
  }

  const outputs = payload.outputs;
  if (!Array.isArray(outputs)) {
    throw new Error('Langflow returned an unexpected response format.');
  }

  // Try structured JSON first.
  const rawObject = findRootObject(outputs);
  if (rawObject) {
    return normalizeTriage(rawObject);
  }

  // Fall back to the markdown report from the Agent/Chat Output.
  const text = findMessageText(outputs);
  if (text) {
    const untriagedReason = detectUntriagedReport(text);
    if (untriagedReason) {
      throw new TriageError(
        'ISSUE_NOT_FOUND',
        `The Jira issue could not be triaged: ${untriagedReason}`,
      );
    }
    return parseMarkdownReport(text);
  }

  throw new Error('Langflow did not return a parsable triage result.');
}
