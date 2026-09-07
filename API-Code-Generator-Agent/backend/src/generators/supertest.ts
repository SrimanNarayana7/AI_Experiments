import { GeneratedFile, GenerationInput, groupByTag } from './types.js';

function testFileName(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'api';
}

function renderSupertestFile(
  tag: string,
  endpoints: { path: string; method: string; operationId?: string; summary?: string }[],
  baseUrl: string,
): string {
  const lines: string[] = [];
  lines.push(`import request from 'supertest';`);
  lines.push(`import { expect } from '@jest/globals';`);
  lines.push('');
  lines.push(`const API_BASE_URL = process.env.API_BASE_URL ?? '${baseUrl}';`);
  lines.push('');
  lines.push(`describe('${tag}', () => {`);

  for (const e of endpoints) {
    const method = e.method.toLowerCase();
    const name = e.summary ?? e.operationId ?? `${e.method} ${e.path}`;
    lines.push(`  it('${e.method} ${e.path} — ${name}', async () => {`);
    lines.push(`    const res = await request(API_BASE_URL)`);
    lines.push(`      .${method}('${e.path}')`);
    lines.push(`      .set('Authorization', \`Bearer \${process.env.BEARER_TOKEN}\`);`);
    lines.push('');
    lines.push(`    expect(res.status).toBe(200);`);
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
    content: `# ${input.projectName}\n\nSupertest API test project generated from the OpenAPI contract.\n\n## Install\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Configure\nSet \`API_BASE_URL\` and authentication environment variables.\n\n## Run\n\`\`\`bash\nnpm test\n\`\`\`\n`,
  });

  for (const [tag, endpoints] of groups) {
    files.push({
      path: `tests/${testFileName(tag)}.test.ts`,
      content: renderSupertestFile(tag, endpoints, input.baseUrl),
    });
  }

  return files;
}
