// Runs the complete 2025 roster recovery and Capital Factory overlap validators
// as the standing NatSec100 intake regressions.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(HERE, '..');
const checks = [
  {
    label: 'natsec100-2025-roster-recovery',
    path: path.join(HERE, 'natsec100-2025-roster-recovery.test.js'),
  },
  {
    label: 'chunk2-capital-factory',
    path: path.join(root, 'data', 'intake', 'natsec100-pathways', 'chunk2-capital-factory', 'validate-chunk2.mjs'),
  },
];

try {
  for (const check of checks) {
    const out = execFileSync('node', [check.path], { encoding: 'utf8' });
    process.stdout.write(out);
    console.log(`${check.label}: PASS`);
  }
  console.log('chunk2-capital-factory.test: PASS');
} catch (error) {
  console.error('chunk2-capital-factory.test: FAIL');
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exit(1);
}
