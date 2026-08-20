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
 * Locates a root-level object in a Langflow outputs array.
 *
 * Langflow chat runs nest the Chat Output content at
 * `item.outputs.message.message` — a Message object whose `text` field holds
 * the content (a JSON string) or an object with `message`/`text` keys, or the
 * content may be a fenced JSON block. This walks each candidate and returns
 * the first object that can be parsed as the triage payload.
 */
export function findRootObject(candidates: unknown[]): Record<string, unknown> | undefined {
  for (const item of candidates) {
    const message = getPath(item, 'outputs.message.message');
    if (typeof message === 'object' && message !== null) {
      const messageRecord = message as Record<string, unknown>;
      const text = messageRecord.text;
      if (typeof text === 'string') {
        const parsed = parseJsonObject(text);
        if (parsed) {
          return parsed;
        }
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) {
          const parsedFenced = parseJsonObject(fenced[1]);
          if (parsedFenced) {
            return parsedFenced;
          }
        }
      } else if (typeof text === 'object' && text !== null) {
        // Content is already a structured object (e.g. message field or text
        // directly holding the payload).
        return text as Record<string, unknown>;
      } else if (
        messageRecord.summary !== undefined ||
        messageRecord.issue_key !== undefined
      ) {
        // Fall back: the message object itself is the payload.
        return messageRecord;
      }
    }
  }
  return undefined;
}

/**
 * Locates the raw text content of a Langflow chat response.
 *
 * Actual Langflow chat runs place the Agent/Chat Output message at
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

/** Attempts to parse a string as a JSON object. Returns undefined when parsing fails. */
export function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return undefined;
}
