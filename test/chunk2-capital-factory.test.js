// Runs the Capital Factory × NatSec100 overlap validator as part of the suite.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(HERE, '..', 'data', 'intake', 'natsec100-pathways', 'chunk2-capital-factory', 'validate-chunk2.mjs');

try {
  const out = execFileSync('node', [validator], { encoding: 'utf8' });
  process.stdout.write(out);
  console.log('chunk2-capital-factory.test: PASS');
} catch (e) {
  console.error('chunk2-capital-factory.test: FAIL');
  if (e.stdout) process.stdout.write(e.stdout);
  if (e.stderr) process.stderr.write(e.stderr);
  process.exit(1);
}
