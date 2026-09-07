import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { GeneratorOutput } from '../generators/index.js';

export interface AssembledProject {
  id: string;
  projectName: string;
  rootPath: string;
  fileCount: number;
  zipPath?: string;
}

export interface ProjectMetadata {
  id: string;
  projectName: string;
  framework: string;
  createdAt: string;
  endpointCount: number;
  scenarioCount: number;
  coverage: number;
}

const UNSAFE_PATH = /(^|[\\/])\.\.([\\/]|$)/;

export class AssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblyError';
  }
}

function sanitizeProjectName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || `api-tests-${randomUUID().slice(0, 8)}`;
}

export function validateGeneratedFile(file: GeneratorOutput['files'][number]): void {
  const p = file.path;
  if (!p) throw new AssemblyError('Generated file has empty path');
  if (path.isAbsolute(p)) throw new AssemblyError(`Absolute path rejected: ${p}`);
  if (UNSAFE_PATH.test(p)) throw new AssemblyError(`Path traversal rejected: ${p}`);
  if (Buffer.byteLength(file.content, 'utf8') > 1_000_000) {
    throw new AssemblyError(`File too large: ${p}`);
  }
}

export async function assembleProject(
  output: GeneratorOutput,
  storageRoot: string,
  stats: { endpointCount: number; coverage: number },
  maxFiles = 500,
): Promise<AssembledProject> {
  if (output.files.length > maxFiles) {
    throw new AssemblyError(`Too many generated files: ${output.files.length}`);
  }

  const id = randomUUID();
  const projectName = sanitizeProjectName(output.projectName);
  const rootPath = path.join(storageRoot, id);

  for (const file of output.files) {
    validateGeneratedFile(file);
    const target = path.join(rootPath, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content, 'utf8');
  }

  const metadata: ProjectMetadata = {
    id,
    projectName,
    framework: output.framework,
    createdAt: new Date().toISOString(),
    endpointCount: stats.endpointCount,
    scenarioCount: output.scenarioCount,
    coverage: stats.coverage,
  };
  await fs.writeFile(path.join(rootPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  const fileCount = output.files.length;
  const zipPath = path.join(rootPath, `${projectName}.zip`);
  await writeZip(rootPath, zipPath, output.files);

  return { id, projectName, rootPath, fileCount, zipPath };
}

async function writeZip(
  rootPath: string,
  zipPath: string,
  files: GeneratorOutput['files'],
): Promise<void> {
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise<void>((resolve, reject) => {
    archive.on('error', reject);
    archive.on('end', resolve);
  });

  const stream = createWriteStream(zipPath);
  archive.pipe(stream);
  for (const file of files) {
    archive.append(file.content, { name: file.path });
  }
  await archive.finalize();
  await done;
}
