import { Endpoint } from '../parser/types.js';
import { GeneratedFile, GenerationInput, groupByTag } from './types.js';

function renderSpec(endpoint: Endpoint, baseUrl: string): string {
  const method = endpoint.method.toLowerCase();
  const hasBody = Boolean(endpoint.requestBody);

  const lines: string[] = [];
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');
  lines.push(`const API_BASE_URL = process.env.API_BASE_URL ?? '${baseUrl}';`);
  lines.push('');
  if (hasBody) {
    lines.push(`const data = {};`);
  }
  lines.push(`test.describe('${endpoint.tags.join(' / ') || endpoint.path}', () => {`);
  lines.push(`  test('${endpoint.method} ${endpoint.path} — ${endpoint.summary ?? endpoint.operationId ?? 'request'}', async ({ request }) => {`);
  lines.push(`    const response = await request.${method}(\`\${API_BASE_URL}${endpoint.path}\`, {`);
  if (hasBody) {
    lines.push(`      data,`);
  }
  lines.push(`    });`);
  lines.push('');
  lines.push(`    expect(response.status()).toBe(200);`);
  lines.push(`    const json = await response.json().catch(() => null);`);
  lines.push(`    expect(json).not.toBeNull();`);
  lines.push(`  });`);
  lines.push(`});`);
  return lines.join('\n');
}

export function generatePlaywright(input: GenerationInput): GeneratedFile[] {
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
          test: 'playwright test',
        },
        devDependencies: {
          '@playwright/test': '^1.49.0',
          dotenv: '^16.4.7',
        },
      },
      null,
      2,
    ),
  });

  files.push({
    path: 'playwright.config.ts',
    content: `import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.API_BASE_URL ?? '${input.baseUrl}',
  },
});
`,
  });

  files.push({
    path: '.env.example',
    content: `API_BASE_URL=${input.baseUrl || ''}\nBEARER_TOKEN=\nAPI_KEY=\nUSERNAME=\nPASSWORD=\n`,
  });

  const readme = `# ${input.projectName}

API test project generated from the OpenAPI contract.

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
`;
  files.push({ path: 'README.md', content: readme });

  for (const [tag, endpoints] of groups) {
    const specName = `${slugFromTag(tag)}.spec.ts`;
    const body = endpoints
      .map((e) => renderSpec({ ...e, tags: [tag] } as Endpoint, input.baseUrl))
      .join('\n\n');
    files.push({ path: `tests/${specName}`, content: `${body}\n` });
  }

  return files;
}

function slugFromTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'api';
}
