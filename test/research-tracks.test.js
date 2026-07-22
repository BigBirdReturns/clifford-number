// Regression: the research-track harnesses stay conformant, index-reconciled,
// and populated one-to-one by the candidate-only next-ten-estates intake.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(script, expected) {
  const out = execFileSync('node', [script], { cwd: root, encoding: 'utf8' });
  if (!expected.test(out)) {
    console.error(`research-tracks.test: FAIL — unexpected output from ${script}`);
    console.error(out);
    process.exit(1);
  }
}

try {
  run('tools/validate-research-tracks.mjs', /OK — 10 tracks/);
  run('tools/validate-next-ten-estates.mjs', /OK \(10 estates, 25 sources, 239 raw records\)/);
  run('test/next-ten-estates.test.js', /next-ten-estates\.test: OK/);
  console.log('research-tracks.test: OK');
} catch (e) {
  console.error('research-tracks.test: FAIL');
  console.error(e.stdout || e.message);
  process.exit(1);
}
