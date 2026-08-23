import type { StorageService } from '../services/storage/StorageService';
import { sanitizeFilename } from './fileHelpers';
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
  const type = detectResumeDocumentType(params.filename, params.mimeType);
  if (!type) {
    throw new Error("This file type isn't supported. Please upload a PDF or DOCX resume.");
  }

  validateResumeBuffer(params.buffer, type);
  const extractedText = await extractResumeText(params.buffer, type);
  const safeName = sanitizeFilename(params.filename);
  const storagePath = await params.storageService.save(
    `${params.storageFolder}/${safeName}`,
    params.buffer,
  );

  return {
    name: stripExtension(safeName) || 'Master Resume',
    content: extractedText,
    rawText: extractedText,
    originalFilename: params.filename,
    mimeType: params.mimeType,
    fileSize: params.buffer.byteLength,
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
