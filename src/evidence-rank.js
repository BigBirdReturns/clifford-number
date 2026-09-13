// Canonical evidence-class ranking. Single source of truth for the relative
// strength ordering of evidence classes across the compiler, builders, and UI.
//
// The vocabulary follows docs/definitions.md ("Evidence class"): official,
// primary public, reported, derived, judgment, open — listed strongest support
// first. Classes appearing in older artifacts but absent from the documented
// vocabulary are aliases, not ranks of their own:
//   - confirmed         → official  (legacy research-graph label for the same
//                         strongest tier; this deliberately replaces app.js's
//                         former strict confirmed-above-official ordering — a
//                         display-only distinction, since 'confirmed' occurs
//                         only in graph.json where no floor logic applies)
//   - government_record → official
//   - context           → derived   (legacy endpoint-builder label; 'context'
//                         names a surface classification in definitions.md,
//                         not an evidence class)
// Unknown values rank as 'open' (weakest): unlabeled support must never
// outrank labeled support. Callers that should reject unknowns instead of
// degrading them use isKnownEvidenceClass().
//
// Exception to "everything imports this": tools/lib/ledger.mjs's
// evidenceWeight() is a tuned scoring scale (primary_public = 1.25) whose
// absolute values are frozen by validate:release drift detection. It keeps its
// own numbers; test/evidence-rank.test.js asserts its ordering stays monotonic
// with this module's ranking.

export const CANONICAL_EVIDENCE_CLASSES = Object.freeze([
  'official',
  'primary_public',
  'reported',
  'derived',
  'judgment',
  'open'
]);

export const EVIDENCE_ALIASES = Object.freeze({
  confirmed: 'official',
  government_record: 'official',
  context: 'derived'
});

// Legacy-shaped lookup table (class-or-alias → rank) for call sites that
// index directly instead of calling evidenceRank(). Same source of truth.
export const EVIDENCE_RANK = Object.freeze(Object.fromEntries([
  ...CANONICAL_EVIDENCE_CLASSES.map(cls => [cls, CANONICAL_EVIDENCE_CLASSES.indexOf(cls)]),
  ...Object.entries(EVIDENCE_ALIASES).map(([alias, target]) => [alias, CANONICAL_EVIDENCE_CLASSES.indexOf(target)])
]));

export function normalizeEvidenceClass(value) {
  const cleaned = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const resolved = EVIDENCE_ALIASES[cleaned] ?? cleaned;
  return CANONICAL_EVIDENCE_CLASSES.includes(resolved) ? resolved : 'open';
}

export function isKnownEvidenceClass(value) {
  const cleaned = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CANONICAL_EVIDENCE_CLASSES.includes(EVIDENCE_ALIASES[cleaned] ?? cleaned);
}

export function evidenceRank(value) {
  return CANONICAL_EVIDENCE_CLASSES.indexOf(normalizeEvidenceClass(value));
}

export function meetsEvidenceFloor(value, floor = 'open') {
  return evidenceRank(value) <= evidenceRank(floor);
}

export function compareEvidence(a, b) {
  return evidenceRank(a) - evidenceRank(b);
}
