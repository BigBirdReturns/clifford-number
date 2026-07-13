import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateConsumptionContract } from '../tools/validate-consumption-contract.mjs';

const sourceRoot = process.cwd();
const source = {
  charter: fs.readFileSync(path.join(sourceRoot, 'BUILD-INSTRUCTIONS.md'), 'utf8'),
  contracts: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/canonical/consumption-contracts.json'), 'utf8')),
  selection: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/canonical/corpus-selection.json'), 'utf8')),
  coverage: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/research/corpus-coverage.json'), 'utf8')),
  reviews: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/research/selection-adversarial-reviews.json'), 'utf8')),
};

function fixture({ mutateContracts, mutateSelection, mutateCoverage, mutateReviews, charterText = source.charter } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-consumption-'));
  fs.mkdirSync(path.join(root, 'data/canonical'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/research'), { recursive: true });
  const contracts = structuredClone(source.contracts);
  const selection = structuredClone(source.selection);
  const coverage = structuredClone(source.coverage);
  const reviews = structuredClone(source.reviews);
  mutateContracts?.(contracts);
  mutateSelection?.(selection);
  mutateCoverage?.(coverage);
  mutateReviews?.(reviews);
  fs.writeFileSync(path.join(root, 'BUILD-INSTRUCTIONS.md'), charterText);
  fs.writeFileSync(path.join(root, 'data/canonical/consumption-contracts.json'), `${JSON.stringify(contracts, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/canonical/corpus-selection.json'), `${JSON.stringify(selection, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/research/corpus-coverage.json'), `${JSON.stringify(coverage, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/research/selection-adversarial-reviews.json'), `${JSON.stringify(reviews, null, 2)}\n`);
  return root;
}

function codes(result) {
  return new Set(result.errors.map(error => error.code));
}

assert.equal(validateConsumptionContract({ root: sourceRoot }).ok, true);

{
  const root = fixture({ mutateCoverage(value) { delete value.lanes[0].consumption; } });
  assert.ok(codes(validateConsumptionContract({ root })).has('detached-consumption-contract'));
}

{
  const root = fixture({ mutateSelection(value) { value.lanes[0].consumption.copy_ready_caveat = 'Looks suspicious.'; } });
  assert.ok(codes(validateConsumptionContract({ root })).has('detached-consumption-contract'));
}

{
  const root = fixture({ mutateReviews(value) { value.reviews[0].publication_status = 'cleared'; } });
  assert.ok(codes(validateConsumptionContract({ root })).has('pending-review-cleared'));
}

{
  const root = fixture({
    mutateReviews(value) {
      const review = value.reviews[0];
      review.status = 'cleared';
      review.publication_status = 'cleared';
      review.reviewer_id = review.author_id;
      review.boundary_attacks = ['moved date boundary', 'moved source-family boundary'];
      review.alternative_universes = ['all comparable public advisory bodies'];
      review.comparator_tests = ['same rule applied to comparator'];
    },
    mutateSelection(value) { value.lanes[0].consumption.selection_review_status = 'cleared'; },
    mutateCoverage(value) { value.lanes[0].consumption.selection_review_status = 'cleared'; },
  });
  assert.ok(codes(validateConsumptionContract({ root })).has('self-review-cleared'));
}

{
  const root = fixture({ mutateReviews(value) { value.reviews.pop(); } });
  const result = validateConsumptionContract({ root });
  assert.ok(codes(result).has('missing-adversarial-review'));
  assert.ok(codes(result).has('selection-review-mismatch'));
}

{
  const root = fixture({ charterText: source.charter.replace('1.11 **The interpretation contract travels with the data.**', '1.11 **Caveats are optional.**') });
  assert.ok(codes(validateConsumptionContract({ root })).has('missing-consumption-invariant'));
}

console.log('consumption-contract.test.js: OK');
