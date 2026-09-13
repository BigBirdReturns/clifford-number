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
    label: 'natsec100-2025-identity-source-custody',
    path: path.join(HERE, 'natsec100-2025-identity-source-custody.test.js'),
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
  const sourceManifest = readJson(path.join(intakeRoot, 'chunk2-capital-factory', 'source_manifest.json'));
  const publicMap = readJson(path.join(root, 'data', 'research', 'clifford-cross-corpus-public-interest-map.json'));
  const publicNatsec = publicMap.lanes.find(row => row.lane_id === 'natsec100-defense-companies');
  const companyRows = readFileSync(path.join(chunk1, 'companies.jsonl'), 'utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const companyYearRows = readFileSync(path.join(chunk1, 'company_years.jsonl'), 'utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const companyCount = companyRows.length;
  const companyYearCount = companyYearRows.length;
  const historical2025 = companyYearRows.filter(row => row.year === 2025);
  const historicalRanked2025 = historical2025.filter(row => Number.isInteger(row.rank));
  const historicalPresenceOnly2025 = historical2025.filter(row => row.rank == null);
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
    `Capital Factory public-portfolio denominator:   ${sourceManifest.cf_portfolio_source.slug_count}`,
    `Capital Factory × NatSec100 co-listings:          ${overlapCount}`,
    `independently corroborated co-listings:            ${corroborated}`,
    `CF-listing-only co-listings:                       ${listingOnly}`,
    'canonical hop-surface promotions:                 0',
  ];
  assert.equal(sourceManifest.natsec100_source.company_count, companyCount,
    'Capital Factory source manifest must bind the current company denominator');
  assert.ok(publicNatsec, 'public cross-corpus map must retain the NatSec100 lane');
  assert.deepEqual(publicNatsec.counts, {
    companies: companyCount,
    company_year_rows: companyYearCount,
    conversion_events: countJsonl(path.join(chunk1, 'conversion_events.jsonl')),
    receipts: countJsonl(path.join(chunk1, 'receipts.jsonl')),
    ranking_surfaces: countJsonl(path.join(chunk1, 'surfaces.jsonl')),
    actors: countJsonl(path.join(chunk1, 'actors.jsonl')),
    historical_2025_company_year_rows: historical2025.length,
    historical_2025_ranked_rows: historicalRanked2025.length,
    historical_2025_presence_only_rows: historicalPresenceOnly2025.length,
    official_2025_source_rows_recovered: recovery.denominator.expected_rows,
    new_2025_source_rows_recovered: recovery.denominator.new_source_rows_recovered,
    deterministic_2025_registry_matches: adjudication.denominator.deterministic_existing_matches,
    adjudicated_2025_identity_candidates: adjudication.denominator.unresolved_source_rows,
    canonical_2025_promotions: adjudication.denominator.canonical_promotions,
  }, 'public NatSec100 lane must derive every source, historical, and promotion denominator');
  assert.match(publicNatsec.what_the_data_shows,
    /historical company-year ledger retains 42 rows.*official visual recovery now preserves all 100 source rows/is,
    'public map must distinguish the partial historical table from complete source recovery');
  assert.match(publicNatsec.open_join, /remaining gap is promotion rather than source recovery/i,
    'public map must name the remaining transition as promotion');
  assert.doesNotMatch(
    [publicNatsec.what_the_data_shows, publicNatsec.open_join].join(' '),
    /58 unrecovered 2025 roster rows|known_missing_2025_roster_rows/i,
    'public map must not revive the superseded missing-source claim');
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
