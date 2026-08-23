import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { cleanEnv, str, port, num, url } from 'envalid';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
];

dotenv.config({
  path: envCandidates.find((candidate) => existsSync(candidate)),
});

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3001 }),
  FRONTEND_URL: url({ default: 'http://localhost:5173' }),
  DATABASE_URL: str(),
  DEEPSEEK_API_KEY: str({ default: '' }),
  DEEPSEEK_BASE_URL: url({ default: 'https://api.deepseek.com' }),
  DEEPSEEK_MODEL: str({ default: 'deepseek-v4-flash' }),
  TARGET_RESUME_SCORE: num({ default: 85 }),
  STORAGE_PATH: str({ default: './storage' }),
  MAX_UPLOAD_SIZE: num({ default: 10 * 1024 * 1024 }),
  RATE_LIMIT_WINDOW_MS: num({ default: 60_000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),
});
