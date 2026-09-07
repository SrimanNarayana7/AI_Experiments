import 'dotenv/config';

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback ?? '';
}

function readNumber(name: string, fallback: number): number {
  const value = readEnv(name);
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface AppConfig {
  port: number;
  frontendUrl: string;
  storagePath: string;
  maxUploadSize: number;
  langflow: {
    baseUrl: string;
    flowId: string;
    apiKey: string;
    timeoutMs: number;
  };
  databaseUrl: string;
}

export const config: AppConfig = {
  port: readNumber('PORT', 4000),
  frontendUrl: readEnv('FRONTEND_URL', 'http://localhost:5173'),
  storagePath: readEnv('STORAGE_PATH', '../storage'),
  maxUploadSize: readNumber('MAX_UPLOAD_SIZE', 5 * 1024 * 1024),
  langflow: {
    baseUrl: readEnv('LANGFLOW_BASE_URL', 'http://localhost:7860'),
    flowId: readEnv('LANGFLOW_FLOW_ID'),
    apiKey: readEnv('LANGFLOW_API_KEY'),
    timeoutMs: readNumber('LANGFLOW_TIMEOUT_MS', 120_000),
  },
  databaseUrl: readEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/api_code_generator'),
};
