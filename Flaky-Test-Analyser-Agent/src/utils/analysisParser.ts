import type {
  AnalysisResult,
  ConsistentFailure,
  FlakyTest,
  RerunRecommendation,
  Summary,
} from '../types/flakyTest';

/**
 * Response normalization layer for the FlakyTest_AI_Agent.
 *
 * The Langflow agent returns a natural-language report with these logical
 * sections (prompt in FlakyTest_AI_Agent.json):
 *
 *   FLAKY_TESTS
 *   CONSISTENT_FAILURES
 *   RERUN_RECOMMENDATION
 *   SUMMARY
 *
 * The LLM output is not guaranteed to be perfectly formatted, so this parser
 * is deliberately tolerant: it searches for known section markers and pulls
 * structured rows out of markdown lists and tables when possible.
 *
 * It never invents values. If a section cannot be extracted, it is left empty
 * and the raw response remains available for the AI Analysis section.
 */

export interface ParsedAnalysis {
  flakyTests: FlakyTest[];
  consistentFailures: ConsistentFailure[];
  rerunRecommendation: RerunRecommendation;
  summary: Summary;
}

interface TableRow {
  cells: string[];
}

function cleanCell(value: string): string {
  return value.trim().replace(/[*_`]/g, '');
}

function stripLink(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function splitRowCells(line: string): string[] {
  return line
    .split('|')
    .map(cleanCell)
    .filter((cell) => cell.length > 0);
}

function normalizeSectionName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function matchesSection(name: string, keys: string[]): boolean {
  return keys.some((key) => name.includes(key));
}

/**
 * Returns the section key when a heading is a *specific* known section
 * heading (FLAKY_TESTS, CONSISTENT_FAILURES, RERUN_RECOMMENDATION, SUMMARY),
 * otherwise null. Titles such as "Flaky Test Analysis Report" are ignored.
 *
 * Handles numbered headings from the deployed flow, e.g.
 * "### 1. FLAKY_TESTS" and "### 2. CONSISTENT_FAILURES (real bugs, failed
 * in BOTH builds)".
 */
function sectionKeyFor(name: string): string | null {
  const cleaned = name
    .replace(/^\d+/, '') // leading section number "1. FLAKY_TESTS" → "FLAKY_TESTS"
    .replace(/\(.*\)$/g, '') // trailing "(real bugs, ...)" → ""
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (/^FLAKY_TESTS?$/.test(cleaned)) {
    return 'FLAKY';
  }
  if (/^CONSISTENT_FAILURES?$/.test(cleaned)) {
    return 'CONSISTENT';
  }
  if (/^RERUN_RECOMMENDATIONS?$/.test(cleaned) || /^RERUN_ACTIONS?$/.test(cleaned)) {
    return 'RERUN';
  }
  if (/^SUMMARY$/.test(cleaned)) {
    return 'SUMMARY';
  }
  return null;
}

/** Splits the response into logical sections by known heading markers. */
function findSectionRanges(lines: string[]): { start: number; end: number; key: string }[] {
  const ranges: { start: number; end: number; key: string }[] = [];
  let current: { start: number; end: number; key: string } | null = null;

  const isSectionStart = (line: string): string | null => {
    // A section starts at a markdown heading (#...) or a bare label line
    // like "FLAKY_TESTS:" — never inside body text.
    const header = line.match(/^#{1,3}\s+(.+)$/);
    if (!header) {
      if (!/^[\d.]*\s*[A-Z_]+:\s*$/.test(line) && !/^[\d.]*\s*[A-Za-z_ ]+:\s*$/.test(line)) {
        return null;
      }
    }
    let rawName = header ? header[1] : line.replace(/:\s*$/, '');
    // Drop trailing parentheticals BEFORE normalization, e.g.
    // "### 2. CONSISTENT_FAILURES (real bugs, failed in BOTH builds)".
    rawName = rawName.replace(/\s*\(.*\)\s*$/, '');
    const name = normalizeSectionName(rawName);
    if (name.length === 0) {
      return null;
    }
    return sectionKeyFor(name);
  };

  for (let i = 0; i < lines.length; i++) {
    const key = isSectionStart(lines[i].trim());
    if (key) {
      if (current) {
        current.end = i - 1;
        ranges.push(current);
      }
      current = { start: i, end: lines.length - 1, key };
    }
  }
  if (current) {
    current.end = lines.length - 1;
    ranges.push(current);
  }
  return ranges;
}

/** Extracts table rows from a section's lines, skipping the header row. */
function collectTableRows(lines: string[]): TableRow[] {
  const rows: TableRow[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || !line.startsWith('|')) {
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(line)) {
      continue; // separator row
    }
    const cells = splitRowCells(line);
    if (cells.length >= 2) {
      // Skip markdown header rows like "| Test Name | Build 1 | ... |".
      const first = cleanCell(cells[0]).toLowerCase();
      if (first === 'test name' || first === 'test' || first === 'name') {
        continue;
      }
      rows.push({ cells });
    }
  }
  return rows;
}

/** Extracts bullet list items from a section's lines. */
function collectBullets(lines: string[]): string[] {
  const items: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      items.push(stripLink(cleanCell(bullet[1])));
    }
  }
  return items;
}

function pickStatuses(cells: string[]): { build1Status?: string; build2Status?: string } {
  const isStatus = (value: string) => /^(PASS(?:ED)?|FAIL(?:ED)?|SKIP(?:PED)?|FLAKY|ERROR)$/i.test(value);
  const statuses = cells.filter(isStatus);
  return {
    build1Status: statuses[0]?.toUpperCase(),
    build2Status: statuses[1]?.toUpperCase(),
  };
}

/**
 * Interprets a table row for flaky tests / consistent failures.
 *
 * Column shapes supported:
 * - [name, cause]
 * - [name, cause, action]
 * - [name, build1, build2, cause]          (with optional action)
 * - [name, build1, build2, cause, action]
 */
function interpretRow(
  cells: string[],
  defaultAction: string,
): { name: string; detail?: string; action?: string; build1Status?: string; build2Status?: string } {
  const name = stripLink(cells[0]);
  const statuses = pickStatuses(cells);
  const hasStatuses = Boolean(statuses.build1Status || statuses.build2Status);

  let detail: string | undefined;
  let action: string | undefined;

  if (hasStatuses) {
    // Shape: [name, b1, b2, cause?, action?]
    const remaining = cells.slice(1).filter((cell) => !/^(PASS(?:ED)?|FAIL(?:ED)?|SKIP(?:PED)?|FLAKY|ERROR)$/i.test(cell));
    detail = remaining[0] || undefined;
    action = remaining[1] || defaultAction;
  } else {
    // Shape: [name, cause?, action?]
    detail = cells[1] || undefined;
    action = cells[2] || defaultAction;
  }

  return { name, detail, action, ...statuses };
}

function parseTestSection(
  lines: string[],
  defaultAction: string,
): { name: string; detail?: string; action?: string; build1Status?: string; build2Status?: string }[] {
  const rows = collectTableRows(lines);
  if (rows.length > 0) {
    return rows.map((row) => interpretRow(row.cells, defaultAction));
  }

  const bullets = collectBullets(lines);
  if (bullets.length > 0) {
    return bullets.map((item) => {
      const parts = item.split(/\s+[—–-]\s+|\s+:\s+/);
      return {
        name: stripLink(parts[0]),
        detail: parts[1] || undefined,
        action: defaultAction,
      };
    });
  }

  // Plain "Name — cause" lines with no bullet markers.
  return lines
    .map((raw) => raw.trim())
    .filter((line) => line.length > 0 && !/^(SUMMARY|RERUN|FLAKY|CONSISTENT)/i.test(line))
    .map((line) => {
      const parts = line.split(/\s+[—–-]\s+|\s+:\s+/);
      return {
        name: stripLink(parts[0]),
        detail: parts[1] || undefined,
        action: defaultAction,
      };
    })
    .filter((row) => row.name.length > 0);
}

function parseFlakyTests(lines: string[]): FlakyTest[] {
  return parseTestSection(lines, 'Rerun').map((row) => ({
    name: row.name,
    hypothesis: row.detail,
    action: row.action,
    build1Status: row.build1Status,
    build2Status: row.build2Status,
  }));
}

function parseConsistentFailures(lines: string[]): ConsistentFailure[] {
  return parseTestSection(lines, 'Send to Engineering').map((row) => ({
    name: row.name,
    rootCause: row.detail,
    action: row.action,
    build1Status: row.build1Status,
    build2Status: row.build2Status,
  }));
}

function parseRerunRecommendation(lines: string[]): RerunRecommendation {
  const rerun: string[] = [];
  const engineering: string[] = [];
  // Tracks the current category when a label bullet like
  // "- **Rerun (flaky — quarantine, no code fix):**" sets it.
  let category: 'rerun' | 'engineering' | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const content = stripLink(cleanCell(bullet ? bullet[1] : line));
    const lower = content.toLowerCase();

    // Category label bullet (ends with ":" and is short, e.g. "Rerun (flaky...):").
    if (/:\s*$/.test(content) && content.length < 80) {
      if (/rerun|quarantine/.test(lower)) {
        category = 'rerun';
      } else if (/engineer|investigat|fix|defect/.test(lower)) {
        category = 'engineering';
      }
      continue;
    }

    // A nested/plain test bullet under the current category.
    if (/rerun|quarantine/.test(lower)) {
      rerun.push(content);
    } else if (/engineer|investigat|fix|defect/.test(lower)) {
      engineering.push(content);
    } else if (category === 'rerun') {
      rerun.push(content);
    } else if (category === 'engineering') {
      engineering.push(content);
    }
  }
  return { rerun, engineering };
}

function parseSummary(lines: string[]): Summary {
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  const upper = text.toUpperCase();
  const counts: Summary = {};

  // "2 flaky tests", "1 test is flaky", "2 tests are consistent failures"
  const flakyMatch = upper.match(/(\d+)\s*(?:(?:TEST\s*S?)\s+)?(?:(?:IS|ARE)\s+)?FLAKY/);
  const consistentMatch = upper.match(
    /(\d+)\s*(?:(?:TEST\s*S?)\s+)?(?:(?:IS|ARE)\s+)?(?:FAILURES?\s+)?CONSISTENT/,
  );
  const build1Match = upper.match(/BUILD\s*1[^\d]*(\d+)/);
  const build2Match = upper.match(/BUILD\s*2[^\d]*(\d+)/);

  if (flakyMatch) {
    counts.flakyCount = Number.parseInt(flakyMatch[1], 10);
  }
  if (consistentMatch) {
    counts.consistentFailureCount = Number.parseInt(consistentMatch[1], 10);
  }
  if (build1Match) {
    counts.build1Total = Number.parseInt(build1Match[1], 10);
  }
  if (build2Match) {
    counts.build2Total = Number.parseInt(build2Match[1], 10);
  }

  if (/\bHEALTHY\b/.test(upper)) {
    counts.health = 'Healthy';
  } else if (/\bCRITICAL\b/.test(upper)) {
    counts.health = 'Critical';
  } else if (/\bUNSTABLE\b/.test(upper)) {
    counts.health = 'Unstable';
  } else if (/\bATTENTION\b/.test(upper)) {
    counts.health = 'Attention Required';
  }

  if (text.length > 0) {
    counts.text = text;
  }
  return counts;
}

/**
 * Parses the raw AI analysis text into a structured AnalysisResult.
 *
 * Returns a result with empty sections when nothing could be extracted; the
 * caller keeps the rawResponse for the AI Analysis section.
 */
export function parseAnalysisText(text: string): AnalysisResult {
  const lines = text.split(/\r?\n/);
  const sections = findSectionRanges(lines);

  let flakySection: string[] = [];
  let consistentSection: string[] = [];
  let rerunSection: string[] = [];
  let summarySection: string[] = [];

  for (const section of sections) {
    const content = lines.slice(section.start + 1, section.end + 1);
    if (matchesSection(section.key, ['FLAKY'])) {
      flakySection = content;
    } else if (matchesSection(section.key, ['CONSISTENT'])) {
      consistentSection = content;
    } else if (matchesSection(section.key, ['RERUN'])) {
      rerunSection = content;
    } else if (matchesSection(section.key, ['SUMMARY'])) {
      summarySection = content;
    }
  }

  const flakyTests = parseFlakyTests(flakySection);
  const consistentFailures = parseConsistentFailures(consistentSection);
  const rerunRecommendation = parseRerunRecommendation(rerunSection);
  const summary = parseSummary(summarySection);

  const parsed: ParsedAnalysis = {
    flakyTests,
    consistentFailures,
    rerunRecommendation,
    summary,
  };

  return {
    ...parsed,
    rawResponse: text,
    fallbackOnly:
      flakyTests.length === 0 &&
      consistentFailures.length === 0 &&
      rerunRecommendation.rerun.length === 0 &&
      rerunRecommendation.engineering.length === 0 &&
      Object.keys(summary).length === 0,
  };
}
