import { randomUUID } from 'node:crypto';
import type { StorageService } from '../services/storage/StorageService';
import { sanitizeFilename } from './fileHelpers';
import { AppError } from '../middleware/errorHandler';
import {
  detectResumeDocumentType,
  extractResumeText,
  validateResumeBuffer,
} from './documentExtraction';

export interface UploadedResumePayload {
  name: string;
  content: string;
  rawText: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  extractedText: string;
  sourceType: 'manual' | 'upload';
}

export async function processUploadedResume(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  storageService: StorageService;
  storageFolder: string;
}): Promise<UploadedResumePayload> {
  const buffer = Buffer.from(params.buffer);

  const type = detectResumeDocumentType(params.filename, params.mimeType);
  if (!type) {
    throw new AppError(400, "This file type isn't supported. Please upload a PDF or DOCX resume.", 'INVALID_UPLOAD');
  }

  let extractionError: string | undefined;
  try {
    validateResumeBuffer(buffer, type);
  } catch (error) {
    extractionError = error instanceof Error ? error.message : 'This file is not a valid document.';
  }

  if (extractionError) {
    throw new AppError(400, extractionError, 'INVALID_UPLOAD');
  }

  let extractedText: string;
  try {
    extractedText = await extractResumeText(buffer, type);
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : 'Unable to read this document.';
    throw new AppError(400, message, 'INVALID_UPLOAD');
  }

  const safeName = sanitizeFilename(params.filename);
  const mimeType = type === 'PDF'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const storagePath = await params.storageService.save(
    `${params.storageFolder}/${randomUUID()}-${safeName}`,
    buffer,
  );

  return {
    name: stripExtension(safeName) || 'Master Resume',
    content: extractedText,
    rawText: extractedText,
    originalFilename: params.filename,
    mimeType,
    fileSize: buffer.byteLength,
    storagePath,
    extractedText,
    sourceType: 'upload',
  };
}

export function buildManualResumePayload(content: string): UploadedResumePayload {
  return {
    name: 'Master Resume',
    content,
    rawText: content,
    originalFilename: 'pasted_resume.txt',
    mimeType: 'text/plain',
    fileSize: Buffer.byteLength(content),
    storagePath: '',
    extractedText: content,
    sourceType: 'manual',
  };
}

function stripExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(0, index) : filename;
}
