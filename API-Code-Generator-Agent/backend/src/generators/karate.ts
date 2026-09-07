import { GeneratedFile, GenerationInput, groupByTag } from './types.js';

function featureName(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'api';
}

function renderKarateFeature(
  tag: string,
  endpoints: { path: string; method: string; operationId?: string; summary?: string }[],
): string {
  const lines: string[] = [];
  lines.push(`Feature: ${tag}`);
  lines.push('');
  lines.push(`  Background:`);
  lines.push(`    * url karate.get('baseUrl')`);
  lines.push(`    * configure headers = { Authorization: 'Bearer ' + karate.get('bearerToken') }`);
  lines.push('');

  for (const e of endpoints) {
    const method = e.method.toLowerCase();
    const name = e.summary ?? e.operationId ?? `${e.method} ${e.path}`;
    lines.push(`  Scenario: ${name}`);
    lines.push(`    Given path '${e.path.replace(/^\//, '')}'`);
    lines.push(`    When method ${method}`);
    lines.push(`    Then status 200`);
    lines.push(`    And match response != null`);
    lines.push('');
  }
  return lines.join('\n');
}

export function generateKarate(input: GenerationInput): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const groups = groupByTag(input.manifest);

  files.push({
    path: 'pom.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>${input.projectName}</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <karate.version>1.5.1</karate.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>com.intuit.karate</groupId>
      <artifactId>karate-junit5</artifactId>
      <version>\${karate.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <testResources>
      <testResource>
        <directory>src/test/java</directory>
        <excludes>
          <exclude>**/*.java</exclude>
        </excludes>
      </testResource>
    </testResources>
  </build>
</project>
`,
  });

  files.push({
    path: 'karate-config.js',
    content: `function fn() {
  return {
    baseUrl: karate.properties['API_BASE_URL'] || '${input.baseUrl || ''}',
    bearerToken: karate.properties['BEARER_TOKEN'] || '',
    apiKey: karate.properties['API_KEY'] || '',
  };
}
`,
  });

  files.push({
    path: '.env.example',
    content: `API_BASE_URL=${input.baseUrl || ''}\nBEARER_TOKEN=\nAPI_KEY=\nUSERNAME=\nPASSWORD=\n`,
  });

  files.push({
    path: 'README.md',
    content: `# ${input.projectName}\n\nKarate API test project generated from the OpenAPI contract.\n\n## Install\n\`\`\`bash\nmvn install\n\`\`\`\n\n## Run\n\`\`\`bash\nmvn test\n\`\`\`\n`,
  });

  for (const [tag, endpoints] of groups) {
    files.push({
      path: `src/test/java/${featureName(tag)}/${featureName(tag)}.feature`,
      content: renderKarateFeature(tag, endpoints),
    });
  }

  return files;
}
