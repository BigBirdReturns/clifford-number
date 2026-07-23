// Regression: research-track harnesses, estate slices, macro estates, and their fan-out stay conformant.
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
  run('tools/build-estates.mjs', /estates: 24 macro estates, 20 slices, 4 cases, 10 tracks/);
  run('tools/validate-estates.mjs', /OK \(24 macro estates, 20 slices, 4 cases, 10 tracks\)/);
  run('tools/build-estate-fanout.mjs', /estate fan-out: 14 estate lane\(s\), \d+ bounded task\(s\), \d+ source route\(s\)/);
  run('test/estate-fanout.test.js', /OK \(14 estates, \d+ tasks, \d+ source routes\)/);
  run('tools/validate-estate-fanout.mjs', /OK \(14 estate lanes, \d+ tasks, \d+ source routes\)/);
  console.log('research-tracks.test: OK');
} catch (error) {
  console.error('research-tracks.test: FAIL');
  console.error(error.stdout || error.message);
  process.exit(1);
}
