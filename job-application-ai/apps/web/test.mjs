import { startVitest } from 'vitest/node';

const ctx = await startVitest('test', [], {
  run: true,
  config: false,
});

if (!ctx) {
  process.exitCode = 1;
}
