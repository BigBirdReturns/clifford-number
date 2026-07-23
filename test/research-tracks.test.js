// Regression: research-track harnesses and their estate populations stay conformant.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(script, expected) {
  const out = execFileSync('node', [script], { cwd: root, encoding: 'utf8' });
  if (!expected.test(out)) {
    throw new Error(`${script} returned unexpected output:\n${out}`);
  }
}

try {
  run('tools/validate-research-tracks.mjs', /OK — 10 tracks/);
  run('tools/validate-estate-expansion.mjs', /OK — 48 first-pass closures, 10 second-cohort estates/);
  console.log('research-tracks.test: OK');
} catch (error) {
  console.error('research-tracks.test: FAIL');
  console.error(error.stdout || error.message);
  process.exit(1);
}
