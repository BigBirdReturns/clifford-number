import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateOfficeholderCohort } from '../tools/validate-officeholder-cohort.mjs';

const sourceRoot = process.cwd();
const files = {
  cohort: 'data/canonical/us-presidential-officeholder-cohort.json',
  predicates: 'data/canonical/officeholder-crossing-predicates.json',
  identifiers: 'data/research/openfec-presidential-identifiers.json',
  selection: 'data/canonical/corpus-selection.json',
  coverage: 'data/research/corpus-coverage.json',
  reviews: 'data/research/selection-adversarial-reviews.json',
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(sourceRoot, file), 'utf8'))]));

function fixture(mutate = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-officeholder-'));
  for (const [key, file] of Object.entries(files)) {
    const value = structuredClone(source[key]);
    mutate[key]?.(value);
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
  }
  return root;
}

const codes = result => new Set(result.errors.map(error => error.code));

assert.equal(validateOfficeholderCohort({ root: sourceRoot }).ok, true);

{
  const root = fixture({ cohort(value) { value.members.pop(); } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('incomplete-officeholder-cohort'));
}

{
  const root = fixture({ predicates(value) { value.predicates[0].application_scope = 'donald-trump'; } });
  const result = validateOfficeholderCohort({ root });
  assert.ok(codes(result).has('asymmetric-officeholder-predicate'));
  assert.ok(codes(result).has('target-shaped-officeholder-predicate'));
}

{
  const root = fixture({ predicates(value) { value.predicates[0].subject = 'A Trump committee pays a Trump property.'; } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('target-shaped-officeholder-predicate'));
}

{
  const root = fixture({ identifiers(value) { value.identities.pop(); } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('incomplete-openfec-candidate-identifiers'));
}

{
  const root = fixture({ identifiers(value) { value.coverage.schedule_b_queries_executed = 37; } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('dishonest-openfec-identifier-coverage'));
}

{
  const root = fixture({ reviews(value) { const review = value.reviews.find(item => item.lane_id === 'trump-office-business-capital'); review.status = 'cleared'; review.publication_status = 'cleared'; review.reviewer_id = 'ai-red-team-assist-2026-07-13'; } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('fabricated-independent-clearance'));
}

{
  const root = fixture({ coverage(value) { const row = value.lanes.find(item => item.lane_id === 'trump-office-business-capital'); row.known_gaps = row.known_gaps.filter(gap => gap.gap_id !== 'selection-gap-trump-historical-digitization'); } });
  assert.ok(codes(validateOfficeholderCohort({ root })).has('missing-officeholder-source-gap'));
}

console.log('officeholder-cohort.test.js: OK');
