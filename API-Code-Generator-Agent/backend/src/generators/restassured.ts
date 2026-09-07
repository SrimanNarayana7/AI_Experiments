import { GeneratedFile, GenerationInput, groupByTag } from './types.js';

function className(tag: string): string {
  const cleaned = tag.replace(/[^a-zA-Z0-9]+/g, '');
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}Test` : 'ApiTest';
}

function renderRestAssuredTest(
  tag: string,
  endpoints: { path: string; method: string; operationId?: string; summary?: string }[],
  baseUrl: string,
): string {
  const lines: string[] = [];
  lines.push(`package com.example.tests;`);
  lines.push('');
  lines.push(`import io.restassured.RestAssured;`);
  lines.push(`import io.restassured.http.ContentType;`);
  lines.push(`import org.junit.jupiter.api.BeforeAll;`);
  lines.push(`import org.junit.jupiter.api.Test;`);
  lines.push(`import static io.restassured.RestAssured.given;`);
  lines.push(`import static org.hamcrest.Matchers.notNullValue;`);
  lines.push('');
  lines.push(`public class ${className(tag)} {`);
  lines.push('');
  lines.push(`    private static final String BASE_URL = System.getenv().getOrDefault("API_BASE_URL", "${baseUrl}");`);
  lines.push('');
  lines.push(`    @BeforeAll`);
  lines.push(`    public static void setup() {`);
  lines.push(`        RestAssured.baseURI = BASE_URL;`);
  lines.push(`    }`);
  lines.push('');

  for (const e of endpoints) {
    const method = e.method.toLowerCase();
    const testName = e.operationId ?? `${e.method}${e.path.replace(/[^a-zA-Z0-9]+/g, '')}`;
    lines.push(`    @Test`);
    lines.push(`    public void ${testName.replace(/[^a-zA-Z0-9]/g, '_')}() {`);
    lines.push(`        given()`);
    lines.push(`            .header("Authorization", "Bearer " + System.getenv("BEARER_TOKEN"))`);
    lines.push(`            .when()`);
    lines.push(`            .${method}("${e.path}")`);
    lines.push(`            .then()`);
    lines.push(`            .statusCode(200)`);
    lines.push(`            .body(notNullValue());`);
    lines.push(`    }`);
    lines.push('');
  }

  lines.push(`}`);
  return lines.join('\n');
}

export function generateRestAssured(input: GenerationInput): GeneratedFile[] {
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
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>5.5.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
    </plugins>
  </build>
</project>
`,
  });

  files.push({
    path: '.env.example',
    content: `API_BASE_URL=${input.baseUrl || ''}\nBEARER_TOKEN=\nAPI_KEY=\nUSERNAME=\nPASSWORD=\n`,
  });

  files.push({
    path: 'README.md',
    content: `# ${input.projectName}\n\nREST Assured API test project generated from the OpenAPI contract.\n\n## Install\n\`\`\`bash\nmvn install\n\`\`\`\n\n## Configure\nSet \`API_BASE_URL\` and authentication environment variables.\n\n## Run\n\`\`\`bash\nmvn test\n\`\`\`\n`,
  });

  for (const [tag, endpoints] of groups) {
    files.push({
      path: `src/test/java/com/example/tests/${className(tag)}.java`,
      content: renderRestAssuredTest(tag, endpoints, input.baseUrl),
    });
  }

  return files;
}
