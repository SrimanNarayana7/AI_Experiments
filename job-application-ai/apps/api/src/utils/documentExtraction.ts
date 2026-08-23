import { inflateRawSync, inflateSync } from 'pako';

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

function extractPdfText(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const literalMatches = Array.from(
    content.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*T[Jj]/g),
    (match) => decodePdfString(match[1] ?? ''),
  );
  const hexMatches = Array.from(content.matchAll(/<([0-9A-Fa-f\s]+)>\s*T[Jj]/g), (match) =>
    decodePdfHex(match[1] ?? ''),
  );

  const text = [...literalMatches, ...hexMatches]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  if (text.length < 40) {
    throw new Error('Unable to extract readable text from this document.');
  }

  return text;
}

function decodePdfString(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');
}

function decodePdfHex(value: string): string {
  const hex = value.replace(/\s+/g, '');
  const bytes = Buffer.from(hex.length % 2 === 0 ? hex : `${hex}0`, 'hex');
  return bytes.toString('utf8').replace(/\u0000/g, '');
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
        const inflated = inflateRawSync(compressedData);
        return Buffer.from(inflated);
      }

      return Buffer.from(inflateSync(compressedData));
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
