// Regression: the research-track harnesses stay conformant and index-reconciled.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

try {
  const out = execFileSync('node', ['tools/validate-research-tracks.mjs'], { cwd: root, encoding: 'utf8' });
  if (!/OK — 10 tracks/.test(out)) {
    console.error('research-tracks.test: FAIL — unexpected validator output');
    console.error(out);
    process.exit(1);
  }
  console.log('research-tracks.test: OK');
} catch (e) {
  console.error('research-tracks.test: FAIL');
  console.error(e.stdout || e.message);
  process.exit(1);
}
