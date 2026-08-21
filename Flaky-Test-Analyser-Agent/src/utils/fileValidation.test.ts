import { describe, expect, it } from 'vitest';
import { validateJsonFile, formatFileSize } from './fileValidation';

function createFile(name: string, content: string): File {
  return new File([content], name, { type: 'application/json' });
}

describe('validateJsonFile', () => {
  it('accepts a valid JSON file', async () => {
    const file = createFile('result.json', '{"stats":{"tests":10,"failures":2}}');
    const result = await validateJsonFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a non-json extension', async () => {
    const file = createFile('result.txt', '{"stats":{}}');
    const result = await validateJsonFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects invalid JSON content', async () => {
    const file = createFile('result.json', '{not valid json');
    const result = await validateJsonFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JSON file');
  });

  it('accepts a .JSON uppercase extension', async () => {
    const file = createFile('RESULT.JSON', '{"a":1}');
    const result = await validateJsonFile(file);
    expect(result.valid).toBe(true);
  });

  it('rejects empty content', async () => {
    const file = createFile('result.json', '');
    const result = await validateJsonFile(file);
    expect(result.valid).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(68.7 * 1024)).toBe('68.7 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
