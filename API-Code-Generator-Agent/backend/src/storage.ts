import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const UPLOADS = 'uploads';
const GENERATED = 'generated';

export async function ensureStorage(): Promise<void> {
  const root = path.resolve(config.storagePath);
  await fs.mkdir(path.join(root, UPLOADS), { recursive: true });
  await fs.mkdir(path.join(root, GENERATED), { recursive: true });
}

export function uploadsDir(): string {
  return path.resolve(config.storagePath, UPLOADS);
}

export function generatedDir(): string {
  return path.resolve(config.storagePath, GENERATED);
}
