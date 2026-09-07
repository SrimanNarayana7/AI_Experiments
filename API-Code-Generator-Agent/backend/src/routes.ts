import { FastifyInstance } from 'fastify';
import { parseSpec, ParseError } from './parser/index.js';
import { generateScenarios, summarizeScenarios } from './scenarios/index.js';
import { validateScenarios } from './scenarios/validate.js';
import { computeCoverage } from './coverage/index.js';
import { generateProject } from './generators/index.js';
import { assembleProject } from './assembly/index.js';
import { isFramework, ERRORS } from './services/index.js';
import { generatedDir } from './storage.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({ status: 'ok' }));

  app.post('/api/specs/parse', async (request, reply) => {
    const contentType = request.headers['content-type'] ?? '';
    let raw: string | undefined;
    let url: string | undefined;
    let baseUrl: string | undefined;

    if (contentType.includes('application/json')) {
      const body = request.body as Record<string, unknown> | undefined;
      raw = typeof body?.spec === 'string' ? body.spec : JSON.stringify(body);
      url = typeof body?.url === 'string' ? body.url : undefined;
      baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined;
    } else {
      const parts = request.parts();
      const fields: Record<string, unknown> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          raw = buffer.toString('utf8');
        } else {
          fields[part.fieldname] = part.value as unknown;
        }
      }
      url = typeof fields.url === 'string' ? fields.url : undefined;
      baseUrl = typeof fields.baseUrl === 'string' ? fields.baseUrl : undefined;
    }

    if (!url && !raw) {
      return reply.status(400).send(ERRORS.noSpec());
    }

    let content = raw;
    let sourceType: 'url' | 'upload' = 'upload';
    let sourceUrl: string | undefined;

    if (url) {
      sourceType = 'url';
      sourceUrl = url;
      try {
        const response = await fetch(url, { redirect: 'follow' });
        if (!response.ok) {
          return reply
            .status(422)
            .send(ERRORS.invalidSpec(`Failed to fetch specification URL (HTTP ${response.status}).`));
        }
        content = await response.text();
      } catch {
        return reply
          .status(422)
          .send(ERRORS.invalidSpec('Failed to fetch specification URL.'));
      }
    }

    if (!content) {
      return reply.status(400).send(ERRORS.noSpec());
    }

    try {
      const result = await parseSpec(content, sourceType, sourceUrl);
      const scenarios = generateScenarios(result.manifest);
      const validation = validateScenarios(result.manifest, scenarios);
      const summary = summarizeScenarios(validation.kept);
      const coverage = computeCoverage(result.manifest, validation.kept);

      return {
        title: result.manifest.spec.title,
        version: result.manifest.spec.formatVersion,
        format: result.manifest.spec.format,
        baseUrl: baseUrl ?? result.baseUrl,
        endpoints: result.manifest.endpoints,
        coverageRequirements: result.manifest.coverageRequirements,
        scenarios: validation.kept,
        scenarioSummary: summary,
        coverage,
        validationErrors: validation.errors,
      };
    } catch (error: unknown) {
      if (error instanceof ParseError) {
        return reply.status(422).send(ERRORS.invalidSpec(error.message));
      }
      throw error;
    }
  });

  app.post('/api/specs/generate', async (request, reply) => {
    const contentType = request.headers['content-type'] ?? '';
    let raw: string | undefined;
    let framework = '';
    let url: string | undefined;
    let baseUrl: string | undefined;
    let additionalInstructions: string | undefined;

    if (contentType.includes('application/json')) {
      const body = request.body as Record<string, unknown> | undefined;
      raw = typeof body?.spec === 'string' ? body.spec : undefined;
      framework = typeof body?.framework === 'string' ? body.framework : '';
      url = typeof body?.url === 'string' ? body.url : undefined;
      baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined;
      additionalInstructions = typeof body?.additionalInstructions === 'string' ? body.additionalInstructions : undefined;
    } else {
      const parts = request.parts();
      const fields: Record<string, unknown> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          raw = buffer.toString('utf8');
        } else {
          fields[part.fieldname] = part.value as unknown;
        }
      }
      framework = typeof fields.framework === 'string' ? fields.framework : '';
      url = typeof fields.url === 'string' ? fields.url : undefined;
      baseUrl = typeof fields.baseUrl === 'string' ? fields.baseUrl : undefined;
      additionalInstructions =
        typeof fields.additionalInstructions === 'string' ? fields.additionalInstructions : undefined;
    }

    if (!isFramework(framework)) {
      return reply.status(400).send(ERRORS.unsupportedFramework());
    }

    if (!url && !raw) {
      return reply.status(400).send(ERRORS.noSpec());
    }

    let content = raw;
    let sourceType: 'url' | 'upload' = 'upload';
    let sourceUrl: string | undefined;

    if (url) {
      sourceType = 'url';
      sourceUrl = url;
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        return reply
          .status(422)
          .send(ERRORS.invalidSpec(`Failed to fetch specification URL (HTTP ${response.status}).`));
      }
      content = await response.text();
    }

    if (!content) {
      return reply.status(400).send(ERRORS.noSpec());
    }

    const result = await parseSpec(content, sourceType, sourceUrl);
    const scenarios = generateScenarios(result.manifest);
    const validation = validateScenarios(result.manifest, scenarios);
    const coverage = computeCoverage(result.manifest, validation.kept);

    const projectName = `${slugify(result.manifest.spec.title)}-api-tests`;

    const output = generateProject({
      manifest: result.manifest,
      scenarios: validation.kept,
      framework: framework as 'playwright' | 'restassured' | 'karate' | 'supertest',
      baseUrl: baseUrl ?? result.baseUrl,
      projectName,
      additionalInstructions,
    });

    const assembled = await assembleProject(
      output,
      generatedDir(),
      {
        endpointCount: result.manifest.endpoints.length,
        coverage: coverage.coverage.overall,
      },
    );

    return {
      id: assembled.id,
      framework,
      projectName: assembled.projectName,
      scenarioCount: output.scenarioCount,
      coverage,
      files: output.files.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content })),
      zipPath: assembled.zipPath,
      downloadUrl: `/api/projects/${assembled.id}/download`,
    };
  });

  app.get('/api/projects/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { promises: fs } = await import('node:fs');
    const path = await import('node:path');
    const { createReadStream } = await import('node:fs');
    const dir = generatedDir();
    const projectDir = path.join(dir, id);
    try {
      const entries = await fs.readdir(projectDir);
      const zip = entries.find((e) => e.endsWith('.zip'));
      if (!zip) {
        return reply.status(404).send({ message: 'Project ZIP not found.' });
      }
      const stream = createReadStream(path.join(projectDir, zip));
      return reply
        .header('Content-Disposition', `attachment; filename="${zip}"`)
        .type('application/zip')
        .send(stream);
    } catch {
      return reply.status(404).send({ message: 'Project not found.' });
    }
  });

  app.get('/api/projects', async () => {
    const { promises: fs } = await import('node:fs');
    const dir = generatedDir();
    const entries = await fs.readdir(dir);
    return { projects: entries };
  });

  app.get('/api/stats', async () => {
    const { promises: fs } = await import('node:fs');
    const path = await import('node:path');
    const dir = generatedDir();
    const entries = await fs.readdir(dir);

    const history: Array<Record<string, unknown>> = [];
    let specificationsProcessed = 0;
    let endpointsAnalyzed = 0;
    let testsGenerated = 0;
    let coverageSum = 0;
    let projectsGenerated = 0;

    for (const entry of entries) {
      const metaPath = path.join(dir, entry, 'metadata.json');
      try {
        const raw = await fs.readFile(metaPath, 'utf8');
        const meta = JSON.parse(raw) as {
          id: string;
          projectName: string;
          framework: string;
          createdAt: string;
          endpointCount: number;
          scenarioCount: number;
          coverage: number;
        };
        specificationsProcessed += 1;
        endpointsAnalyzed += meta.endpointCount;
        testsGenerated += meta.scenarioCount;
        coverageSum += Math.min(100, Math.max(0, meta.coverage));
        projectsGenerated += 1;
        history.push({ ...meta, coverage: Math.min(100, Math.max(0, meta.coverage)) });
      } catch {
        // not a generated project dir
      }
    }

    history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return {
      specificationsProcessed,
      endpointsAnalyzed,
      testsGenerated,
      averageCoverage:
        coverageSum > 0 && specificationsProcessed > 0
          ? Math.round(coverageSum / specificationsProcessed)
          : 0,
      projectsGenerated,
      history: history.slice(0, 20),
    };
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'api';
}
