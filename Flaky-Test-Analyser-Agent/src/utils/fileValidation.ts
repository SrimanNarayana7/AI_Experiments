import type { UploadedBuild } from '../types/flakyTest';

/**
 * Validates an uploaded Playwright result.json before it is sent to Langflow.
 *
 * The frontend only checks that the file is a valid JSON document. Parsing the
 * test results to determine flakiness is Langflow's responsibility.
 */

export interface FileValidationResult {
  valid: boolean;
  /** Human-readable error message, or undefined when the file is valid. */
  error?: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function isJsonFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.json');
}

/**
 * Validates a File. Accepts only .json files whose contents parse as JSON.
 * The file contents are read eagerly so the raw text can be sent to Langflow.
 */
export function validateJsonFile(file: File): Promise<FileValidationResult> {
  return file.text().then(
    (content) => {
      if (!isJsonFileName(file.name)) {
        return {
          valid: false,
          error: 'Unsupported file type. Please upload a .json file.',
        };
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: false,
          error: 'File is too large. Please upload a Playwright result.json under 10 MB.',
        };
      }
      try {
        JSON.parse(content);
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON file. Please upload a valid Playwright result.json.',
        };
      }
      return { valid: true };
    },
    () => ({
      valid: false,
      error: 'Could not read the file. Please try again.',
    }),
  );
}

/** Formats a byte count as a human-readable size, e.g. "68.7 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isBuildUploaded(build: UploadedBuild | undefined): boolean {
  return build !== undefined && build.valid;
}
