import json
import os
import subprocess
from pathlib import Path

source_sha = os.environ['SOURCE_SHA']


def fail(message):
    raise SystemExit(message)


def replace_once(path, old, new, label):
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        fail(f'{label} denominator mismatch in {path}: {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


def materialize_from_source(path):
    data = subprocess.check_output(['git', 'show', f'{source_sha}:{path}'])
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)


for path in [
    'tools/build-topology-admission-frontier.mjs',
    'test/topology-admission-frontier.test.js',
]:
    materialize_from_source(path)

surfaces_path = Path('data/ledger/surfaces.jsonl')
refusal_reasons = {
    'electric-twin-seed2-governance-instrument-2025-09-12':
        'governance_instrument_rights_not_exercised_shared_participation',
    'strategic-defence-review-development-2024-2025':
        'workstream_span_not_bounded_shared_participation',
}
surface_lines = surfaces_path.read_text(encoding='utf-8').splitlines(keepends=True)
found = set()
for index, line in enumerate(surface_lines):
    if not line.strip():
        continue
    row = json.loads(line)
    surface_id = row.get('surface_id')
    if surface_id not in refusal_reasons:
        continue
    reason = refusal_reasons[surface_id]
    existing = row.get('hop_refusal_reason')
    if existing not in (None, reason):
        fail(f'{surface_id} refusal conflict: {existing!r}')
    row['hop_refusal_reason'] = reason
    newline = '\n' if line.endswith('\n') else ''
    surface_lines[index] = json.dumps(
        row,
        ensure_ascii=False,
        separators=(',', ':'),
    ) + newline
    found.add(surface_id)
if found != set(refusal_reasons):
    fail(f'refusal surface denominator mismatch: found={sorted(found)}')
surfaces_path.write_text(''.join(surface_lines), encoding='utf-8')

replace_once(
    'tools/compile.mjs',
    "  ['build-hop-graph', 'tools/build-hop-graph.mjs'],\n",
    "  ['build-hop-graph', 'tools/build-hop-graph.mjs'],\n"
    "  ['build-topology-admission-frontier', 'tools/build-topology-admission-frontier.mjs'],\n",
    'compile topology stage',
)

ci_path = Path('.github/workflows/ci.yml')
ci_text = ci_path.read_text(encoding='utf-8')
mutation_step = (
    '      - name: Run topology admission frontier mutation tests\n'
    '        run: node test/topology-admission-frontier.test.js\n'
)
if mutation_step not in ci_text:
    anchor = '          exit "$status"\n'
    if ci_text.count(anchor) != 1:
        fail(f'CI release-gate anchor mismatch: {ci_text.count(anchor)}')
    ci_text = ci_text.replace(anchor, anchor + mutation_step, 1)
    ci_path.write_text(ci_text, encoding='utf-8')

hops_path = Path('tools/lib/hops.mjs')
hops_text = hops_path.read_text(encoding='utf-8')
if 'actor_a_participation:' not in hops_text:
    replace_once(
        hops_path,
        "      const bWin = windowOf(b);\n"
        "      const overlap = intersectAll([\n",
        "      const bWin = windowOf(b);\n"
        "      const actorAPart = ids[0] === a.actor_id ? a : b;\n"
        "      const actorBPart = ids[1] === a.actor_id ? a : b;\n"
        "      const actorAWindow = ids[0] === a.actor_id ? aWin : bWin;\n"
        "      const actorBWindow = ids[1] === a.actor_id ? aWin : bWin;\n"
        "      const actorAReceiptIds = uniq(actorAPart.receipt_ids ?? []);\n"
        "      const actorBReceiptIds = uniq(actorBPart.receipt_ids ?? []);\n"
        "      const surfaceReceiptIds = uniq(surface.receipt_ids ?? []);\n"
        "      const overlap = intersectAll([\n",
        'exact stint prelude',
    )

    replace_once(
        hops_path,
        "        const actorAPart = ids[0] === a.actor_id ? a : b;\n"
        "        const actorBPart = ids[1] === b.actor_id ? b : a;\n"
        "        const actorAWindow = ids[0] === a.actor_id ? aWin : bWin;\n"
        "        const actorBWindow = ids[1] === b.actor_id ? bWin : aWin;\n"
        "        const actorAReceiptIds = uniq(actorAPart.receipt_ids ?? []);\n"
        "        const actorBReceiptIds = uniq(actorBPart.receipt_ids ?? []);\n"
        "        const surfaceReceiptIds = uniq(surface.receipt_ids ?? []);\n",
        '',
        'duplicate refusal stint custody',
    )

    replace_once(
        hops_path,
        "      const receipts = uniq([...(surface.receipt_ids ?? []), ...(a.receipt_ids ?? []), ...(b.receipt_ids ?? [])]);\n",
        "      const receipts = uniq([...surfaceReceiptIds, ...actorAReceiptIds, ...actorBReceiptIds]);\n",
        'basis receipt union',
    )

    replace_once(
        hops_path,
        "        actor_a_role: ids[0] === a.actor_id ? a.role : b.role,\n"
        "        actor_b_role: ids[1] === b.actor_id ? b.role : a.role,\n"
        "        evidence_class: weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]),\n",
        "        actor_a_role: actorAPart.role,\n"
        "        actor_b_role: actorBPart.role,\n"
        "        actor_a_participation: {\n"
        "          actor_id: actorAPart.actor_id,\n"
        "          role: actorAPart.role ?? null,\n"
        "          participation_type: actorAPart.participation_type ?? null,\n"
        "          evidence_class: actorAPart.evidence_class ?? null,\n"
        "          window: actorAWindow,\n"
        "          receipt_ids: actorAReceiptIds,\n"
        "        },\n"
        "        actor_b_participation: {\n"
        "          actor_id: actorBPart.actor_id,\n"
        "          role: actorBPart.role ?? null,\n"
        "          participation_type: actorBPart.participation_type ?? null,\n"
        "          evidence_class: actorBPart.evidence_class ?? null,\n"
        "          window: actorBWindow,\n"
        "          receipt_ids: actorBReceiptIds,\n"
        "        },\n"
        "        evidence_class: weakestEvidence([surface.evidence_class, actorAPart.evidence_class, actorBPart.evidence_class]),\n",
        'basis exact participation custody',
    )

    replace_once(
        hops_path,
        "      const ew = evidenceWeight(weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]));\n",
        "      const ew = evidenceWeight(weakestEvidence([surface.evidence_class, actorAPart.evidence_class, actorBPart.evidence_class]));\n",
        'basis evidence weight',
    )

stint_path = Path('test/hop-stints.test.js')
stint_text = stint_path.read_text(encoding='utf-8')
if 'basis.actor_a_participation.actor_id' not in stint_text:
    replace_once(
        stint_path,
        "], 'both legitimate stints must survive as separate hop-basis windows');\n",
        "], 'both legitimate stints must survive as separate hop-basis windows');\n"
        "for (const basis of result.edges[0].surfaces) {\n"
        "  assert.equal(basis.actor_a_participation.actor_id, 'actor-a');\n"
        "  assert.equal(basis.actor_b_participation.actor_id, 'actor-b');\n"
        "  assert.deepEqual(basis.actor_a_participation.receipt_ids, ['r1']);\n"
        "  assert.deepEqual(basis.actor_b_participation.receipt_ids, ['r1']);\n"
        "  assert.equal(basis.actor_a_participation.window.dated, true);\n"
        "  assert.equal(basis.actor_b_participation.window.dated, true);\n"
        "}\n",
        'hop stint exact-custody assertions',
    )

frontier_path = Path('tools/build-topology-admission-frontier.mjs')
replace_once(
    frontier_path,
    "import { loadAll, readJson, writeJson } from './lib/ledger.mjs';\n",
    "import { loadAll, readJson, writeJson } from './lib/ledger.mjs';\n"
    "import { windowOf } from './lib/temporal.mjs';\n",
    'frontier temporal import',
)

helper_anchor = (
    "function surfaceParticipants(participation, surfaceId, participantType) {\n"
    "  return participation.filter(row =>\n"
    "    row.surface_id === surfaceId && row.participant_type === participantType);\n"
    "}\n"
)
helper_block = helper_anchor + r"""

function sameWindow(left = {}, right = {}) {
  return (left.valid_from ?? null) === (right.valid_from ?? null)
    && (left.valid_until ?? null) === (right.valid_until ?? null)
    && Boolean(left.dated) === Boolean(right.dated);
}

function sameReceiptSet(left = [], right = []) {
  return JSON.stringify(uniqueSorted(left)) === JSON.stringify(uniqueSorted(right));
}

function exactParticipationErrors({
  participation,
  basis,
  surfaceId,
  endpointPair,
  endpointName,
  actorId,
}) {
  const errors = [];
  const exact = basis[`${endpointName}_participation`];
  if (!exact || typeof exact !== 'object') {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} is missing exact ${endpointName}_participation`,
    );
    return errors;
  }
  if (exact.actor_id !== actorId) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} actor mismatch: ${exact.actor_id}`,
    );
  }
  const exactReceiptIds = uniqueSorted(exact.receipt_ids ?? []);
  if (!exactReceiptIds.length) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} participation has no receipt_ids`,
    );
  }
  const matches = surfaceParticipants(participation, surfaceId, 'actor')
    .filter(row => row.actor_id === actorId)
    .filter(row =>
      (row.role ?? null) === (exact.role ?? null)
      && (row.participation_type ?? null) === (exact.participation_type ?? null)
      && (row.evidence_class ?? null) === (exact.evidence_class ?? null)
      && sameWindow(windowOf(row), exact.window)
      && sameReceiptSet(row.receipt_ids ?? [], exactReceiptIds));
  if (matches.length !== 1) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} participation matched ${matches.length} canonical rows`,
    );
  }
  const basisReceiptIds = new Set(basis.receipt_ids ?? []);
  for (const receiptId of exactReceiptIds) {
    if (!basisReceiptIds.has(receiptId)) {
      errors.push(
        `hop edge ${endpointPair} basis ${surfaceId} omits exact ${endpointName} receipt ${receiptId}`,
      );
    }
  }
  return errors;
}
"""
replace_once(
    frontier_path,
    helper_anchor,
    helper_block,
    'frontier exact-participation helpers',
)

basis_receipt_anchor = (
    "      if (!(basis.receipt_ids ?? []).length) {\n"
    "        errors.push(`hop edge ${endpointPair} basis ${basis.surface_id} has no receipt_ids`);\n"
    "      }\n"
)
basis_receipt_replacement = basis_receipt_anchor + r"""
      errors.push(...exactParticipationErrors({
        participation,
        basis,
        surfaceId: basis.surface_id,
        endpointPair,
        endpointName: 'actor_a',
        actorId: edge.actor_a,
      }));
      errors.push(...exactParticipationErrors({
        participation,
        basis,
        surfaceId: basis.surface_id,
        endpointPair,
        endpointName: 'actor_b',
        actorId: edge.actor_b,
      }));
"""
replace_once(
    frontier_path,
    basis_receipt_anchor,
    basis_receipt_replacement,
    'frontier exact-participation validation',
)

frontier_test_path = Path('test/topology-admission-frontier.test.js')
basis_fixture = (
    "            {\n"
    "              surface_id: 'bounded-event',\n"
    "              receipt_ids: ['receipt-event', 'receipt-a', 'receipt-b'],\n"
    "            },\n"
)
basis_fixture_exact = (
    "            {\n"
    "              surface_id: 'bounded-event',\n"
    "              receipt_ids: ['receipt-event', 'receipt-a', 'receipt-b'],\n"
    "              actor_a_participation: {\n"
    "                actor_id: 'actor-a',\n"
    "                role: null,\n"
    "                participation_type: null,\n"
    "                evidence_class: null,\n"
    "                window: { valid_from: null, valid_until: null, dated: false },\n"
    "                receipt_ids: ['receipt-a'],\n"
    "              },\n"
    "              actor_b_participation: {\n"
    "                actor_id: 'actor-b',\n"
    "                role: null,\n"
    "                participation_type: null,\n"
    "                evidence_class: null,\n"
    "                window: { valid_from: null, valid_until: null, dated: false },\n"
    "                receipt_ids: ['receipt-b'],\n"
    "              },\n"
    "            },\n"
)
replace_once(
    frontier_test_path,
    basis_fixture,
    basis_fixture_exact,
    'frontier fixture exact stints',
)

mutation_block = r"""
const unrelatedReceiptedStint = fixture();
const originalActorB = unrelatedReceiptedStint.participation.find(row =>
  row.surface_id === 'bounded-event' && row.actor_id === 'actor-b');
originalActorB.receipt_ids = [];
unrelatedReceiptedStint.participation.push({
  surface_id: 'bounded-event',
  participant_type: 'actor',
  actor_id: 'actor-b',
  role: 'later unrelated stint',
  time_start: '2027-01-01',
  time_end: '2027-01-01',
  evidence_class: 'official',
  receipt_ids: ['receipt-b-later'],
});
const unrelatedBasis = unrelatedReceiptedStint.hopGraph.edges[0].surfaces[0];
unrelatedBasis.actor_b_participation.receipt_ids = [];
unrelatedBasis.receipt_ids = ['receipt-event', 'receipt-a', 'receipt-b-later'];
const unrelatedReceiptedStintResult = analyzeTopologyAdmissionFrontier(
  unrelatedReceiptedStint,
);
assert.ok(unrelatedReceiptedStintResult.errors.includes(
  'hop edge actor-a|actor-b basis bounded-event exact actor_b participation has no receipt_ids',
), 'a receipt on another stint must not satisfy the exact compiled basis');

const mismatchedExactStint = fixture();
const mismatchedBasis = mismatchedExactStint.hopGraph.edges[0].surfaces[0];
mismatchedBasis.actor_b_participation.receipt_ids = ['receipt-b-other'];
mismatchedBasis.receipt_ids.push('receipt-b-other');
const mismatchedExactStintResult = analyzeTopologyAdmissionFrontier(
  mismatchedExactStint,
);
assert.ok(mismatchedExactStintResult.errors.includes(
  'hop edge actor-a|actor-b basis bounded-event exact actor_b participation matched 0 canonical rows',
), 'the exact stint object must resolve to one canonical participation row');

"""
frontier_test_text = frontier_test_path.read_text(encoding='utf-8')
console_anchor = "console.log('topology-admission-frontier.test: OK');\n"
if frontier_test_text.count(console_anchor) != 1:
    fail('frontier test console anchor mismatch')
frontier_test_path.write_text(
    frontier_test_text.replace(console_anchor, mutation_block + console_anchor, 1),
    encoding='utf-8',
)
