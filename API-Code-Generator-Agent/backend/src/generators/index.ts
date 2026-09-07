import { Framework } from '../parser/types.js';
import { GeneratedFile, GenerationInput } from './types.js';
import { generatePlaywright } from './playwright.js';
import { generateRestAssured } from './restassured.js';
import { generateKarate } from './karate.js';
import { generateSupertest } from './supertest.js';

export interface GeneratorOutput {
  framework: Framework;
  projectName: string;
  files: GeneratedFile[];
  scenarioCount: number;
}

const GENERATORS: Record<Framework, (input: GenerationInput) => GeneratedFile[]> = {
  playwright: generatePlaywright,
  restassured: generateRestAssured,
  karate: generateKarate,
  supertest: generateSupertest,
};

export function generateProject(input: GenerationInput): GeneratorOutput {
  const generator = GENERATORS[input.framework];
  const files = generator(input);
  return {
    framework: input.framework,
    projectName: input.projectName,
    files,
    scenarioCount: input.scenarios.length,
  };
}
