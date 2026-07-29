#!/usr/bin/env node
import fs from 'node:fs';

const packagePath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts['build:judgments'] = 'node tools/build-evidence-grounded-judgments.mjs && node tools/augment-evidence-grounded-judgments-with-lake.mjs && node tools/build-human-permission-gate-audit.mjs';
pkg.scripts['validate:judgments'] = 'node tools/validate-evidence-grounded-judgments.mjs && node tools/validate-evidence-grounded-lake-judgments.mjs && node tools/validate-human-permission-gate-audit.mjs && node test/evidence-grounded-judgments.test.js && node test/human-permission-gate-audit.test.js';

const oldSequence = 'npm run build:k0 && npm run validate:k0 && npm test';
const newSequence = 'npm run build:k0 && npm run validate:k0 && npm run build:judgments && npm run validate:judgments && npm test';
if (!pkg.scripts.check.includes(newSequence)) {
  if (!pkg.scripts.check.includes(oldSequence)) throw new Error('package check sequence drifted; refusing blind migration');
  pkg.scripts.check = pkg.scripts.check.replace(oldSequence, newSequence);
}

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync('.github/tmp/judgment-source-migration-paths.json', JSON.stringify({
  schema_version: 'judgment-source-migration-paths@1',
  changed_paths: ['package.json']
}, null, 2) + '\n');
console.log('installed build:judgments, validate:judgments, and the canonical release-gate invocation');
