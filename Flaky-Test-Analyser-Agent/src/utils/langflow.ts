/**
 * Extracts a value from an unknown object at a dot-separated path.
 * Returns undefined when any segment is missing.
 */
export function getPath(source: unknown, path: string): unknown {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Locates the raw text content of a Langflow chat response.
 *
 * Langflow chat runs place the Agent/Chat Output message at
 * `item.outputs[].results.message.data.text`. This walks the candidates and
 * returns the first non-empty string found at that path (or at
 * `outputs.message.message.text` for compatibility).
 */
export function findMessageText(candidates: unknown[]): string | undefined {
  for (const item of candidates) {
    const text = getPath(item, 'outputs.0.results.message.data.text');
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
    const legacy = getPath(item, 'outputs.message.message.text');
    if (typeof legacy === 'string' && legacy.trim().length > 0) {
      return legacy;
    }
  }
  return undefined;
}

/** Attempts to parse a string as JSON. Returns undefined when parsing fails. */
export function parseJsonValue(text: string): unknown | undefined {
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return undefined;
  }
}
