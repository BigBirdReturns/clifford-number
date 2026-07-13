import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateCorpusSelection } from '../tools/validate-corpus-selection.mjs';

const sourceRoot = process.cwd();
const selection = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/canonical/corpus-selection.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/research/corpus-coverage.json'), 'utf8'));
const seeds = fs.readFileSync(path.join(sourceRoot, 'data/research/public-interest-discovery-seeds.jsonl'), 'utf8');
const charter = fs.readFileSync(path.join(sourceRoot, 'BUILD-INSTRUCTIONS.md'), 'utf8');

function fixture({ mutateSelection, mutateCoverage, seedText = seeds, charterText = charter } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-selection-'));
  fs.mkdirSync(path.join(root, 'data/canonical'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/research'), { recursive: true });
  const selected = structuredClone(selection);
  const covered = structuredClone(coverage);
  mutateSelection?.(selected);
  mutateCoverage?.(covered);
  fs.writeFileSync(path.join(root, 'BUILD-INSTRUCTIONS.md'), charterText);
  fs.writeFileSync(path.join(root, 'data/canonical/corpus-selection.json'), `${JSON.stringify(selected, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/research/corpus-coverage.json'), `${JSON.stringify(covered, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/research/public-interest-discovery-seeds.jsonl'), seedText);
  return root;
}

function codes(result) {
  return new Set(result.errors.map(error => error.code));
}

{
  const result = validateCorpusSelection({ root: sourceRoot });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
}

{
  const root = fixture({ mutateSelection(value) { delete value.lanes[0].comparison; } });
  assert.ok(codes(validateCorpusSelection({ root })).has('missing-comparison'));
}

{
  const root = fixture({
    mutateSelection(value) {
      value.lanes.find(lane => lane.lane_id === 'linkedin-private-attention').replicability.counts_toward_public_coverage = true;
    },
  });
  assert.ok(codes(validateCorpusSelection({ root })).has('support-only-public-progress'));
}

{
  const root = fixture({ mutateCoverage(value) { value.lanes.pop(); } });
  assert.ok(codes(validateCorpusSelection({ root })).has('selection-coverage-mismatch'));
}

{
  const root = fixture({
    mutateSelection(value) {
      delete value.lanes.find(lane => lane.lane_id === 'epstein-public-corpus').seed_topics;
    },
  });
  assert.ok(codes(validateCorpusSelection({ root })).has('undeclared-seed-topic'));
}

{
  const root = fixture({
    mutateCoverage(value) {
      value.lanes.find(lane => lane.lane_id === 'panama-offshore-service-providers').known_gaps = [];
    },
  });
  assert.ok(codes(validateCorpusSelection({ root })).has('unmeasured-coverage-gap'));
}

{
  const result = validateCorpusSelection({
    root: fixture({ charterText: charter.replace('1.10 **Selection-layer neutrality is constitutional.**', '1.10 **Selection is discretionary.**') }),
  });
  assert.ok(codes(result).has('missing-selection-invariant'));
}

console.log('corpus-selection.test.js: OK');

