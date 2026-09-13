import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CANONICAL_EVIDENCE_CLASSES,
  EVIDENCE_ALIASES,
  compareEvidence,
  evidenceRank,
  isKnownEvidenceClass,
  meetsEvidenceFloor,
  normalizeEvidenceClass
} from '../src/evidence-rank.js';
import { evidenceWeight } from '../tools/lib/ledger.mjs';

// --- vocabulary matches docs/definitions.md -------------------------------
const definitions = readFileSync('docs/definitions.md', 'utf8');
for (const cls of CANONICAL_EVIDENCE_CLASSES) {
  const documented = cls.replace('_', ' ');
  assert.ok(
    definitions.toLowerCase().includes(documented),
    `canonical class "${cls}" must appear in the documented evidence-class vocabulary`
  );
}
assert.deepEqual(
  CANONICAL_EVIDENCE_CLASSES,
  ['official', 'primary_public', 'reported', 'derived', 'judgment', 'open'],
  'canonical order is strongest support first, exactly the documented list'
);

// --- alias resolution ------------------------------------------------------
assert.equal(normalizeEvidenceClass('confirmed'), 'official');
assert.equal(normalizeEvidenceClass('government_record'), 'official');
assert.equal(normalizeEvidenceClass('government record'), 'official');
assert.equal(normalizeEvidenceClass('context'), 'derived');
assert.equal(normalizeEvidenceClass('Primary Public'), 'primary_public');
assert.equal(normalizeEvidenceClass('primary-public'), 'primary_public');
assert.equal(normalizeEvidenceClass('nonsense'), 'open', 'unknown degrades to weakest');
assert.equal(normalizeEvidenceClass(null), 'open');
assert.ok(!isKnownEvidenceClass('nonsense'));
assert.ok(isKnownEvidenceClass('confirmed'));
for (const alias of Object.keys(EVIDENCE_ALIASES)) {
  assert.ok(
    !CANONICAL_EVIDENCE_CLASSES.includes(alias),
    `alias "${alias}" must not itself be a canonical class`
  );
}

// --- rank and floor semantics ----------------------------------------------
assert.equal(evidenceRank('official'), 0);
assert.equal(evidenceRank('confirmed'), 0, 'confirmed ranks equal to official (deliberate unification)');
assert.equal(evidenceRank('open'), 5);
assert.ok(meetsEvidenceFloor('official', 'reported'));
assert.ok(meetsEvidenceFloor('confirmed', 'official'));
assert.ok(!meetsEvidenceFloor('reported', 'official'));
assert.ok(meetsEvidenceFloor('anything-unknown', 'open'), 'open floor admits everything');
assert.ok(compareEvidence('official', 'judgment') < 0);
assert.equal(compareEvidence('confirmed', 'official'), 0);

// --- parity with the frozen legacy tables ----------------------------------
// app.js EVIDENCE_RANK prior to unification. The single deliberate change:
// confirmed was strictly above official; it is now equal. Every other
// co-occurring pair must keep its relative order.
const legacyAppRank = { confirmed: 0, official: 1, government_record: 1, primary_public: 2, reported: 3, derived: 4, judgment: 5, open: 6 };
for (const [a, ra] of Object.entries(legacyAppRank)) {
  for (const [b, rb] of Object.entries(legacyAppRank)) {
    if (a === 'confirmed' || b === 'confirmed') continue; // the documented deliberate change
    if (ra < rb) assert.ok(compareEvidence(a, b) < 0, `legacy app.js order preserved: ${a} < ${b}`);
    if (ra === rb) assert.equal(compareEvidence(a, b), 0, `legacy app.js tie preserved: ${a} == ${b}`);
  }
}
assert.equal(compareEvidence('confirmed', 'official'), 0, 'the one deliberate change: confirmed==official (was confirmed<official)');

// Endpoint builder's former table agreed with canonical on every pair,
// including confirmed==official and context==derived.
const legacyEndpointRank = { official: 0, confirmed: 0, primary_public: 1, reported: 2, derived: 3, context: 3 };
for (const [a, ra] of Object.entries(legacyEndpointRank)) {
  for (const [b, rb] of Object.entries(legacyEndpointRank)) {
    assert.equal(
      Math.sign(compareEvidence(a, b)),
      Math.sign(ra - rb),
      `endpoint-builder order preserved exactly: ${a} vs ${b}`
    );
  }
}

// ledger.mjs keeps its own tuned scoring scale; its ordering must stay
// strictly monotonic with the canonical ranking.
const weights = CANONICAL_EVIDENCE_CLASSES.map(cls => evidenceWeight(cls));
for (let i = 1; i < weights.length; i++) {
  assert.ok(
    weights[i] > weights[i - 1],
    `evidenceWeight ordering must agree with canonical ranking (${CANONICAL_EVIDENCE_CLASSES[i - 1]} < ${CANONICAL_EVIDENCE_CLASSES[i]})`
  );
}

// --- every class actually occurring in the corpus is known -----------------
const participation = readFileSync('data/ledger/participation.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(line => JSON.parse(line));
const researchGraph = JSON.parse(readFileSync('graph.json', 'utf8'));
const hopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const occurring = new Set([
  ...participation.map(row => row.evidence_class),
  ...researchGraph.edges.map(edge => edge.evidence_class),
  ...hopGraph.edges.flatMap(edge => (edge.surfaces ?? []).map(basis => basis.evidence_class))
].filter(Boolean));
for (const cls of occurring) {
  assert.ok(isKnownEvidenceClass(cls), `evidence class "${cls}" occurs in the corpus but is not canonical or aliased`);
}

console.log(`evidence-rank.test.js: OK (${occurring.size} occurring classes, ${CANONICAL_EVIDENCE_CLASSES.length} canonical, ${Object.keys(EVIDENCE_ALIASES).length} aliases)`);
