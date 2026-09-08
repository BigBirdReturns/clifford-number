// Runs the complete 2025 roster recovery and Capital Factory overlap validators
// as the standing NatSec100 intake regressions.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
    label: 'natsec100-2025-identity-adjudication',
    path: path.join(HERE, 'natsec100-2025-identity-adjudication.test.js'),
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

  const intakeRoot = path.join(root, 'data', 'intake', 'natsec100-pathways');
  const chunk1 = path.join(intakeRoot, 'chunk1');
  const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
  const countJsonl = file => readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).length;
  const recovery = readJson(path.join(chunk1, 'roster-2025-official-visual-recovery.json'));
  const adjudication = readJson(path.join(chunk1, 'roster-2025-identity-adjudication.json'));
  const companyCount = countJsonl(path.join(chunk1, 'companies.jsonl'));
  const companyYearCount = countJsonl(path.join(chunk1, 'company_years.jsonl'));
  const overlapCount = countJsonl(path.join(intakeRoot, 'chunk2-capital-factory', 'overlap_cf_natsec100.jsonl'));
  const overlapRows = readFileSync(
    path.join(intakeRoot, 'chunk2-capital-factory', 'overlap_cf_natsec100.jsonl'),
    'utf8',
  ).split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const corroborated = overlapRows.filter(row => row.independent_corroboration_state === 'corroborated').length;
  const listingOnly = overlapRows.filter(row => row.independent_corroboration_state === 'cf_listing_only').length;
  const readme = readFileSync(path.join(intakeRoot, 'README.md'), 'utf8');

  const expectedStatusLines = [
    `company registry rows:                         ${companyCount}`,
    `historical company-year rows:                  ${companyYearCount}`,
    `2025 official source rows recovered:           ${recovery.denominator.expected_rows}`,
    `2025 deterministic existing-registry matches:   ${adjudication.denominator.deterministic_existing_matches}`,
    `2025 identity candidates adjudicated:            ${adjudication.denominator.unresolved_source_rows}`,
    `2025 canonical promotions:                       ${adjudication.denominator.canonical_promotions}`,
    `Capital Factory × NatSec100 co-listings:          ${overlapCount}`,
    `independently corroborated co-listings:            ${corroborated}`,
    `CF-listing-only co-listings:                       ${listingOnly}`,
  ];
  for (const line of expectedStatusLines) {
    assert.ok(readme.includes(line), `NatSec100 README status drift: missing ${line}`);
  }
  assert.doesNotMatch(readme, /2025 roster incomplete: 58 companies unidentified/,
    'completed visual recovery must not remain documented as current missing coverage');
  assert.doesNotMatch(readme, /No overlap analysis has been run/,
    'implemented Capital Factory overlap must remain visible in the current status');
  assert.match(readme, /2025 canonical promotions:\s+0/,
    'source recovery and adjudication must remain distinct from canonical promotion');

  console.log('natsec100-status-surface: PASS');
  console.log('chunk2-capital-factory.test: PASS');
} catch (error) {
  console.error('chunk2-capital-factory.test: FAIL');
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exit(1);
}
