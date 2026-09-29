import { Endpoint } from '../parser/types.js';
import { hasSecurity, literal, resolvePath, sampleValue, successStatuses } from './schema.js';
import { GeneratedFile, GenerationInput, groupByTag } from './types.js';

function testFileName(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'api';
}

function requestBodyJson(endpoint: Endpoint): string | undefined {
  if (endpoint.requestBody) {
    return literal(sampleValue(endpoint.requestBody, 'payload'));
  }
  const formParams = endpoint.parameters.filter((p) => p.in === 'formData' && p.type !== 'file');
  if (formParams.length > 0) {
    const fields: Record<string, unknown> = {};
    for (const p of formParams) fields[p.name] = sampleValue(p.schema, p.name);
    return literal(fields);
  }
  return undefined;
}

function renderSupertestFile(tag: string, endpoints: Endpoint[], baseUrl: string): string {
  const lines: string[] = [];
  const needsAuth = endpoints.some(hasSecurity);

  lines.push(`import request from 'supertest';`);
  lines.push(`import { expect } from '@jest/globals';`);
  lines.push(`import 'dotenv/config';`);
  lines.push('');
  lines.push(`const API_BASE_URL = process.env.API_BASE_URL ?? '${baseUrl}';`);
  lines.push('');
  lines.push(`describe('${tag}', () => {`);

  for (const e of endpoints) {
    const name = e.summary ?? e.operationId ?? `${e.method} ${e.path}`;
    const body = requestBodyJson(e);

    lines.push(`  it('${e.method} ${e.path} ${name}', async () => {`);
    lines.push(`    let chain = request(API_BASE_URL)`);
    lines.push(`      .${e.method.toLowerCase()}('${resolvePath(e)}')`);
    lines.push(`      .set('Accept', 'application/json');`);
    if (needsAuth) {
      lines.push(`    chain = chain.set('Authorization', \`Bearer \${process.env.BEARER_TOKEN}\`);`);
    }
    if (body !== undefined) {
      lines.push(`    const res = await chain.send(${body});`);
    } else {
      lines.push(`    const res = await chain;`);
    }
    lines.push('');
    lines.push(`    expect(${literal(successStatuses(e))}).toContain(res.status);`);
    lines.push(`    expect(res.body).not.toBeNull();`);
    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  return lines.join('\n');
}

export function generateSupertest(input: GenerationInput): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const groups = groupByTag(input.manifest);

  files.push({
    path: 'package.json',
    content: JSON.stringify(
      {
        name: input.projectName,
        version: '1.0.0',
        private: true,
        scripts: {
          test: 'jest',
        },
        devDependencies: {
          '@jest/globals': '^29.7.0',
          '@types/jest': '^29.5.14',
          '@types/supertest': '^6.0.2',
          dotenv: '^16.4.7',
          jest: '^29.7.0',
          supertest: '^7.0.0',
          'ts-jest': '^29.2.5',
          typescript: '^5.7.3',
        },
      },
      null,
      2,
    ),
  });

  files.push({
    path: 'tsconfig.json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["tests/**/*.ts"]
}
`,
  });

  files.push({
    path: 'jest.config.ts',
    content: `export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
};
`,
  });

  files.push({
    path: '.env.example',
    content: `API_BASE_URL=${input.baseUrl || ''}\nBEARER_TOKEN=\nAPI_KEY=\nUSERNAME=\nPASSWORD=\n`,
  });

  files.push({
    path: 'README.md',
    content: `# ${input.projectName}

Supertest API test project generated from the OpenAPI contract.

## Install

\`\`\`bash
npm install
\`\`\`

## Configure

Copy \`.env.example\` to \`.env\` and set \`API_BASE_URL\` plus authentication variables.

## Run

\`\`\`bash
npm test
\`\`\`
`,
  });

  for (const [tag, endpoints] of groups) {
    files.push({
      path: `tests/${testFileName(tag)}.test.ts`,
      content: renderSupertestFile(tag, endpoints, input.baseUrl),
    });
  }

  return files;
}
