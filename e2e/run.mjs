import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const args = process.argv.slice(2);

// Run both projects even when the first fails. Each run releases the test servers before the next starts.
for (const [project, workers] of [['paralelo', '3'], ['sequencial', '1']]) {
  const run = spawnSync(process.execPath, [cli, 'test', '--project', project, '--workers', workers, ...args], { stdio: 'inherit' });
  if (run.error) console.error(run.error);
  if (run.status !== 0) process.exitCode = run.status ?? 1;
}
