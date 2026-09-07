import { LangflowError } from './client.js';
import { validateLlmOutput, GenerationResult } from './validate.js';

const OPENAPI_PARSER_NODE_ID = 'OpenAPISpecParser-00001';
const SCENARIO_GENERATOR_NODE_ID = 'ScenarioGenerator-00001';

export interface GenerateViaLangflowInput {
  framework: string;
  manifest: unknown;
  scenarios: unknown;
  baseUrl: string;
  projectName: string;
  additionalInstructions?: string;
}

export async function generateViaLangflow(
  input: GenerateViaLangflowInput,
): Promise<GenerationResult> {
  const inputValue = JSON.stringify({
    framework: input.framework,
    projectName: input.projectName,
    baseUrl: input.baseUrl,
    additionalInstructions: input.additionalInstructions ?? '',
  });

  const { runLangflow } = await import('./client.js');
  const response = await runLangflow(inputValue, {
    [OPENAPI_PARSER_NODE_ID]: {
      manifest: JSON.stringify(input.manifest),
    },
    [SCENARIO_GENERATOR_NODE_ID]: {
      scenarios: JSON.stringify(input.scenarios),
    },
  });

  const validated = validateLlmOutput(response.output);
  if (!validated.valid || !validated.result) {
    throw new LangflowError(
      'INVALID_RESPONSE',
      validated.error ?? 'Langflow produced invalid structured output.',
    );
  }
  return validated.result;
}
