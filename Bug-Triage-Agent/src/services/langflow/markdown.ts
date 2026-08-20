import type { BugTriageResult, Confidence, Priority, Severity } from '../../types/triage';

/**
 * Parser for the markdown bug-triage report produced by the existing
 * Langflow workflow (Agent → Chat Output).
 *
 * The workflow returns a structured report like:
 *
 *   # Triage: KAN-13 — <summary>
 *
 *   ## 1. SEVERITY: **S2** (Major)
 *   **Rationale:** ...
 *
 *   ## 2. PRIORITY: **P2**
 *   **Rationale:** ...
 *
 *   ## 3. IMPACT_AREAS
 *   - **Login module** ...
 *   - ...
 *
 *   ## 4. ROOT_CAUSE_ANALYSIS
 *   **Confirmed facts (from the issue):**
 *   - ...
 *   **Hypothesis (not confirmed):**
 *   - ...
 *   **What would be required to confirm:**
 *   - ...
 *
 *   ## 5. JUSTIFICATION
 *   **Severity (S2):** ...
 *   **Priority (P2):** ...
 *
 * This parser is tolerant: it searches for known headings and extracts the
 * text that follows. Missing sections surface meaningful errors rather than
 * fabricating values.
 */

interface Section {
  heading: string;
  headingMatch?: string;
  content: string;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split(/\r?\n/);
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      current = { heading: headingMatch[1].trim().toUpperCase(), headingMatch: headingMatch[1].trim(), content: '' };
      sections.push(current);
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  return sections;
}

function findSection(
  sections: Section[],
  keywords: string[],
): Section | undefined {
  return sections.find((section) =>
    keywords.some((keyword) => section.heading.includes(keyword)),
  );
}

function findBoldParagraph(content: string, labels: string[]): string | undefined {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    for (const label of labels) {
      const match = trimmed.match(new RegExp(`^\\*\\*${label}[^:]*:\\*\\*\\s*(.+)$`));
      if (match && match[1].trim()) {
        // Collect continuation lines until the next bold label or empty line.
        let paragraph = match[1].trim();
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (next.startsWith('**') || next.length === 0) {
            break;
          }
          paragraph += ' ' + next.trim();
        }
        return stripMarkdown(paragraph).replace(/\.$/, '');
      }
    }
  }
  return undefined;
}

function findBulletItems(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ') || line.startsWith('* '))
    .map((line) => line.replace(/^[-*]\s+/, ''))
    .map(stripMarkdown)
    .filter((item) => item.length > 0);
}

function extractValueFromHeading(heading: string): string | undefined {
  // Matches both "## 1. SEVERITY: **S2** (Major)" and "## 1. SEVERITY — **S3 (Minor)**"
  const match = heading.match(/\*\*([A-Z]\d)\b/);
  return match ? match[1].toUpperCase() : undefined;
}

function parseConfidence(text: string): Confidence {
  const upper = text.toUpperCase();
  if (/\bHIGH\b/.test(upper)) {
    return 'HIGH';
  }
  if (/\bMEDIUM\b/.test(upper)) {
    return 'MEDIUM';
  }
  if (/\bLOW\b/.test(upper)) {
    return 'LOW';
  }
  return 'MEDIUM';
}

function parseSeverity(section: Section | undefined): Severity {
  const fromHeading = section?.headingMatch ? extractValueFromHeading(section.headingMatch) : undefined;
  const fromContent = section?.content.match(/\b(S[123])\b/);
  const value = fromHeading ?? fromContent?.[1] ?? 'S2';
  return (['S1', 'S2', 'S3'] as const).includes(value as Severity)
    ? (value as Severity)
    : 'S2';
}

function parsePriority(section: Section | undefined): Priority {
  const fromHeading = section?.headingMatch ? extractValueFromHeading(section.headingMatch) : undefined;
  const fromContent = section?.content.match(/\b(P[123])\b/);
  const value = fromHeading ?? fromContent?.[1] ?? 'P2';
  return (['P1', 'P2', 'P3'] as const).includes(value as Priority)
    ? (value as Priority)
    : 'P2';
}

function parseRootCause(analysisSection: Section | undefined): {
  confirmed_facts: string[];
  hypothesis: string;
  unknowns: string[];
  evidence_required: string[];
} {
  const content = analysisSection?.content ?? '';
  const facts: string[] = [];
  let hypothesis = '';
  const evidence: string[] = [];

  let inFacts = false;
  let inHypothesis = false;
  let inEvidence = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^(\*\*)?confirmed facts/i.test(trimmed) && /:/.test(trimmed)) {
      inFacts = true;
      inHypothesis = false;
      inEvidence = false;
      continue;
    }
    if (/^(\*\*)?hypothesis/i.test(trimmed) && /:/.test(trimmed)) {
      inFacts = false;
      inHypothesis = true;
      inEvidence = false;
      continue;
    }
    if (/^(\*\*)?(what would be required|evidence required|to confirm)/i.test(trimmed) && /:/.test(trimmed)) {
      inFacts = false;
      inHypothesis = false;
      inEvidence = true;
      continue;
    }
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    if (!isBullet) {
      continue;
    }
    const item = stripMarkdown(trimmed.replace(/^[-*]\s+/, ''));
    if (item.length === 0) {
      continue;
    }
    if (inFacts) {
      facts.push(item);
    } else if (inEvidence) {
      evidence.push(item);
    } else if (inHypothesis && !hypothesis) {
      hypothesis = item;
    }
  }

  // Hypothesis may also be a bold paragraph: "**Hypothesis (not confirmed):** <text>".
  hypothesis =
    findBoldParagraph(content, ['Hypothesis']) ??
    hypothesis ??
    'No explicit hypothesis provided in the triage report.';

  return {
    confirmed_facts: facts.length > 0 ? facts : ['Not explicitly stated in the issue.'],
    hypothesis,
    unknowns: [],
    evidence_required: evidence.length > 0 ? evidence : [],
  };
}

function parseJustification(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('**'));
  const text = lines
    .map((line) => {
      const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
      return match ? `${match[1]}: ${stripMarkdown(match[2])}` : stripMarkdown(line);
    })
    .join(' ');
  return text || content.trim() || 'No justification provided in the triage report.';
}

/**
 * Detects whether a Langflow report indicates the issue could not be triaged
 * (e.g. the Jira issue does not exist or is not accessible).
 *
 * Returns a human-readable reason when detected, otherwise null.
 */
export function detectUntriagedReport(text: string): string | null {
  const firstLines = text.slice(0, 600);
  if (/unable to triage|no defect data|not determinable|issue does not exist/i.test(firstLines)) {
    // Prefer the actual Jira API error if present.
    const errorMatch = text.match(/errorMessages['"]?\s*:\s*\[['"]([^'"]+)['"]\]/);
    if (errorMatch) {
      return errorMatch[1];
    }
    if (/does not exist|do not have permission/i.test(text)) {
      return 'The Jira issue could not be found, or you do not have permission to view it.';
    }
    return 'The provided issue key does not correspond to a triageable Jira defect.';
  }
  return null;
}

/**
 * Parses the markdown triage report into a BugTriageResult.
 * Throws when the report cannot be parsed meaningfully.
 */
export function parseMarkdownReport(text: string): BugTriageResult {
  const sections = splitSections(text);
  if (sections.length === 0) {
    throw new Error('Langflow did not return a parsable triage report.');
  }

  // Title formats observed from the workflow:
  //  A) "# Triage: KAN-13 — summary"   (key, then dash, then summary)
  //  B) "# Triage Analysis — KAN-14"    (dash before key)
  // Built via new RegExp to avoid literal non-ASCII being mangled by the
  // module transform.
  const dash = '(?:\u2014|\u2013|--|-)';
  const titlePattern = new RegExp(
    '^#\\s+Triage(?:\\s*:|\\s+Analysis)?\\s*' +
      `(?:${dash}\\s*)?` +
      '([A-Z0-9_-]+)' +
      `(?:\\s*${dash}\\s*(.*))?`,
    'i',
  );
  const titleMatch = text.match(titlePattern);
  const issueKey =
    titleMatch?.[1]?.toUpperCase() ?? findSection(sections, ['TRIAGE'])?.heading.match(/([A-Z0-9_-]+)/)?.[1] ?? 'UNKNOWN';

  const severitySection = findSection(sections, ['SEVERITY']);
  const prioritySection = findSection(sections, ['PRIORITY']);
  const impactSection = findSection(sections, ['IMPACT']);
  const rootCauseSection = findSection(sections, ['ROOT_CAUSE']);
  const justificationSection = findSection(sections, ['JUSTIFICATION']);

  const severity = parseSeverity(severitySection);
  const priority = parsePriority(prioritySection);

  const impactAreas = impactSection
    ? findBulletItems(impactSection.content).map(stripMarkdown)
    : [];

  // Summary: from the title line (KAN-13 format) or a bold "Summary:" line
  // (KAN-14 format).
  const summary =
    (titleMatch?.[2] ? stripMarkdown(titleMatch[2]) : '') ||
    findBoldParagraph(text, ['Summary']) ||
    '';

  const rootCause = parseRootCause(rootCauseSection);

  return {
    issue_key: issueKey,
    summary: summary || 'Jira issue',
    severity: {
      value: severity,
      confidence: parseConfidence(severitySection?.content ?? ''),
      reason: findBoldParagraph(severitySection?.content ?? '', ['Rationale']) ?? 'No rationale provided.',
    },
    priority: {
      value: priority,
      confidence: parseConfidence(prioritySection?.content ?? ''),
      reason: findBoldParagraph(prioritySection?.content ?? '', ['Rationale']) ?? 'No rationale provided.',
    },
    impact_areas: impactAreas,
    root_cause_analysis: rootCause,
    triage_justification: parseJustification(justificationSection?.content ?? ''),
  };
}
