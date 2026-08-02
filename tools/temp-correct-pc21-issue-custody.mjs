import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const paths = [
  'data/research/preference-custody/choice-effectiveness.fixture.json',
  'data/research/preference-custody/control-manifest-v19.json',
  'docs/preference-custody-choice-effectiveness.md',
  'docs/preference-custody-laboratory-floor-v19.md',
  'test/preference-choice-effectiveness.test.js',
  'test/preference-custody-manifest-v19.test.js',
  'tools/compile-preference-choice-effectiveness.mjs',
  'tools/compile-preference-custody-manifest-v19.mjs',
  'tools/lib/preference-choice-effectiveness.mjs',
  'tools/lib/preference-custody-manifest-v19.mjs',
  'tools/validate-preference-choice-effectiveness.mjs',
  'tools/validate-preference-custody-manifest-v19.mjs',
  '.github/workflows/preference-choice-effectiveness.yml',
  '.github/workflows/preference-custody-v19.yml'
];

let changed = 0;
for (const path of paths) {
  if (!existsSync(path)) throw new Error(`missing PC-21 path: ${path}`);
  const original = readFileSync(path, 'utf8');
  const corrected = original
    .replaceAll('"issue": 718', '"issue": 717')
    .replaceAll('"control_issue": 718', '"control_issue": 717')
    .replaceAll('issue #718', 'issue #717')
    .replaceAll('Issue #718', 'Issue #717');
  if (corrected !== original) {
    writeFileSync(path, corrected);
    changed += 1;
  }
}

const fixture = JSON.parse(readFileSync('data/research/preference-custody/choice-effectiveness.fixture.json', 'utf8'));
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v19.json', 'utf8'));
if (fixture.issue !== 717) throw new Error(`fixture issue must equal 717, observed ${fixture.issue}`);
if (manifest.control_issue !== 717) throw new Error(`manifest control_issue must equal 717, observed ${manifest.control_issue}`);

for (const path of paths) {
  const source = readFileSync(path, 'utf8');
  for (const forbidden of ['"issue": 718', '"control_issue": 718', 'issue #718', 'Issue #718']) {
    if (source.includes(forbidden)) throw new Error(`stale PC-21 issue reference in ${path}: ${forbidden}`);
  }
}

if (changed < 2) throw new Error(`expected at least fixture and manifest corrections, changed ${changed} files`);
console.log(`corrected PC-21 issue custody in ${changed} files`);
