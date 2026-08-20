export const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*-\d+$/;

/**
 * Validates a Jira issue key such as KAN-13, VWO-24 or PROJ-123.
 * Kept intentionally permissive — an uppercase project key followed by
 * a numeric id. Returns null when the value is not a usable issue key.
 */
export function validateIssueKey(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Enter a Jira bug issue key to begin analysis.';
  }
  if (!ISSUE_KEY_PATTERN.test(trimmed)) {
    return 'Enter a valid Jira issue key (for example, KAN-13 or PROJ-123).';
  }
  return null;
}
