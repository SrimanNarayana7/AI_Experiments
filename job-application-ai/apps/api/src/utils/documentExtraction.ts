import { inflateRaw, inflate } from 'pako';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

export type ResumeDocumentType = 'PDF' | 'DOCX';

export function detectResumeDocumentType(
  filename: string | undefined,
  mimeType: string | undefined,
): ResumeDocumentType | null {
  const lower = `${filename ?? ''} ${mimeType ?? ''}`.toLowerCase();
  if (lower.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (lower.includes('wordprocessingml') || lower.includes('docx') || lower.endsWith('.docx')) {
    return 'DOCX';
  }
  return null;
}

export function validateResumeBuffer(buffer: Buffer, type: ResumeDocumentType): void {
  if (type === 'PDF' && !buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    throw new Error('This file does not look like a valid PDF document.');
  }

  if (type === 'DOCX' && !buffer.subarray(0, 2).equals(Buffer.from('PK'))) {
    throw new Error('This file does not look like a valid DOCX document.');
  }
}

export async function extractResumeText(
  buffer: Buffer,
  type: ResumeDocumentType,
): Promise<string> {
  if (type === 'PDF') {
    return extractPdfText(buffer);
  }
  return extractDocxText(buffer);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist's legacy build ships as an ES module; a static `await import()`
  // would be lowered to `require()` by CommonJS compilation and fail on the
  // ESM `.mjs` file, so invoke a genuine runtime dynamic import instead.
  const importEsm: (specifier: string) => Promise<{
    getDocument: typeof import('pdfjs-dist/types/src/display/api').getDocument;
  }> = new Function('specifier', 'return import(specifier)') as never;
  const pdfjs = await importEsm('pdfjs-dist/legacy/build/pdf.mjs');
  const data = Uint8Array.from(buffer);

  let doc: PDFDocumentProxy | undefined;
  try {
    doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => item.str)
        .join(' ');
      parts.push(pageText);
      page.cleanup();
    }
    const text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    if (text.length < 40) {
      throw new Error('Unable to extract readable text from this document.');
    }

    return text;
  } finally {
    if (doc) await doc.destroy();
  }
}

function extractDocxText(buffer: Buffer): string {
  const entry = readZipEntry(buffer, 'word/document.xml');
  if (!entry) {
    throw new Error('Unable to extract readable text from this document.');
  }

  const xml = entry.toString('utf8');
  const text = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_match, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length < 40) {
    throw new Error('Unable to extract readable text from this document.');
  }

  return text;
}

function readZipEntry(buffer: Buffer, entryName: string): Buffer | null {
  const end = findSignature(buffer, 0x06054b50);
  if (end < 0) return null;

  const centralDirectoryOffset = buffer.readUInt32LE(end + 16);
  const centralDirectorySize = buffer.readUInt32LE(end + 12);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  let offset = centralDirectoryOffset;
  while (offset < centralDirectoryEnd) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    if (fileName === entryName) {
      const localHeaderSignature = buffer.readUInt32LE(localHeaderOffset);
      if (localHeaderSignature !== 0x04034b50) return null;
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        return Buffer.from(compressedData);
      }

      if (compressionMethod === 8) {
        const inflated = inflateRaw(compressedData);
        return Buffer.from(inflated);
      }

      return Buffer.from(inflate(compressedData));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

function findSignature(buffer: Buffer, signature: number): number {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index;
  }
  return -1;
}
