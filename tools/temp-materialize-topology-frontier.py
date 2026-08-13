#!/usr/bin/env python3
import base64
import gzip
import json
import re
import subprocess
from pathlib import Path

WORKFLOW = '.github/workflows/temp-materialize-topology-refusals.yml'


def unique_index(lines, exact, label, start=0):
    indexes = [i for i, line in enumerate(lines[start:], start) if line == exact]
    if len(indexes) != 1:
        raise SystemExit(f'{label} denominator mismatch: {indexes}')
    return indexes[0]


def inherited_payload(name):
    parent = subprocess.check_output(['git', 'show', f'HEAD^:{WORKFLOW}'], text=True)
    match = re.search(rf'^\s*{name}:\s*(\S+)\s*$', parent, re.MULTILINE)
    if not match:
        raise SystemExit(f'missing inherited payload {name}')
    return gzip.decompress(base64.b64decode(match.group(1)))


Path('tools/build-topology-admission-frontier.mjs').write_bytes(
    inherited_payload('FRONTIER_GZ_B64')
)
Path('test/topology-admission-frontier.test.js').write_bytes(
    inherited_payload('FRONTIER_TEST_GZ_B64')
)

surfaces = {
    row['surface_id']: row
    for row in (
        json.loads(line)
        for line in Path('data/ledger/surfaces.jsonl').read_text(encoding='utf-8').splitlines()
        if line.strip()
    )
}
required_refusals = {
    'electric-twin-seed2-governance-instrument-2025-09-12':
        'governance_instrument_rights_not_exercised_shared_participation',
    'strategic-defence-review-development-2024-2025':
        'workstream_span_not_bounded_shared_participation',
}
for surface_id, reason in required_refusals.items():
    actual = surfaces.get(surface_id, {}).get('hop_refusal_reason')
    if actual != reason:
        raise SystemExit(f'{surface_id} refusal mismatch: {actual!r}')

compile_path = Path('tools/compile.mjs')
compile_lines = compile_path.read_text(encoding='utf-8').splitlines(keepends=True)
frontier_stage = "  ['build-topology-admission-frontier', 'tools/build-topology-admission-frontier.mjs'],\n"
if frontier_stage not in compile_lines:
    anchor = unique_index(
        compile_lines,
        "  ['build-hop-graph', 'tools/build-hop-graph.mjs'],\n",
        'compile stage',
    )
    compile_lines.insert(anchor + 1, frontier_stage)
    compile_path.write_text(''.join(compile_lines), encoding='utf-8')

ci_path = Path('.github/workflows/ci.yml')
ci_lines = ci_path.read_text(encoding='utf-8').splitlines(keepends=True)
mutation_name = '      - name: Run topology admission frontier mutation tests\n'
if mutation_name not in ci_lines:
    anchor = unique_index(ci_lines, '          exit "$status"\n', 'release workflow')
    ci_lines[anchor + 1:anchor + 1] = [
        mutation_name,
        '        run: node test/topology-admission-frontier.test.js\n',
    ]
    ci_path.write_text(''.join(ci_lines), encoding='utf-8')

hops_path = Path('tools/lib/hops.mjs')
hops_lines = hops_path.read_text(encoding='utf-8').splitlines(keepends=True)
if not any('actor_a_participation:' in line for line in hops_lines):
    awin = unique_index(hops_lines, '      const aWin = windowOf(a);\n', 'aWin')
    bwin = unique_index(hops_lines, '      const bWin = windowOf(b);\n', 'bWin', awin)
    overlap = unique_index(hops_lines, '      const overlap = intersectAll([\n', 'overlap', bwin)
    if overlap != bwin + 1:
        raise SystemExit('unexpected code between bWin and overlap')
    hops_lines[overlap:overlap] = [
        '      const actorAPart = ids[0] === a.actor_id ? a : b;\n',
        '      const actorBPart = ids[1] === a.actor_id ? a : b;\n',
        '      const actorAWindow = ids[0] === a.actor_id ? aWin : bWin;\n',
        '      const actorBWindow = ids[1] === a.actor_id ? aWin : bWin;\n',
        '      const actorAReceiptIds = uniq(actorAPart.receipt_ids ?? []);\n',
        '      const actorBReceiptIds = uniq(actorBPart.receipt_ids ?? []);\n',
        '      const surfaceReceiptIds = uniq(surface.receipt_ids ?? []);\n',
    ]

    null_branch = unique_index(hops_lines, '      if (overlap === null) {\n', 'null branch', overlap)
    duplicate_start = unique_index(
        hops_lines,
        '        const actorAPart = ids[0] === a.actor_id ? a : b;\n',
        'duplicate actor custody',
        null_branch,
    )
    expected_duplicate = [
        '        const actorAPart = ids[0] === a.actor_id ? a : b;\n',
        '        const actorBPart = ids[1] === b.actor_id ? b : a;\n',
        '        const actorAWindow = ids[0] === a.actor_id ? aWin : bWin;\n',
        '        const actorBWindow = ids[1] === b.actor_id ? bWin : aWin;\n',
        '        const actorAReceiptIds = uniq(actorAPart.receipt_ids ?? []);\n',
        '        const actorBReceiptIds = uniq(actorBPart.receipt_ids ?? []);\n',
        '        const surfaceReceiptIds = uniq(surface.receipt_ids ?? []);\n',
    ]
    if hops_lines[duplicate_start:duplicate_start + len(expected_duplicate)] != expected_duplicate:
        raise SystemExit('duplicate actor custody block mismatch')
    del hops_lines[duplicate_start:duplicate_start + len(expected_duplicate)]

    receipts = unique_index(
        hops_lines,
        '      const receipts = uniq([...(surface.receipt_ids ?? []), ...(a.receipt_ids ?? []), ...(b.receipt_ids ?? [])]);\n',
        'basis receipt union',
        null_branch,
    )
    hops_lines[receipts] = '      const receipts = uniq([...surfaceReceiptIds, ...actorAReceiptIds, ...actorBReceiptIds]);\n'

    role_a = unique_index(
        hops_lines,
        '        actor_a_role: ids[0] === a.actor_id ? a.role : b.role,\n',
        'actor_a role',
        receipts,
    )
    expected_roles = [
        '        actor_a_role: ids[0] === a.actor_id ? a.role : b.role,\n',
        '        actor_b_role: ids[1] === b.actor_id ? b.role : a.role,\n',
        '        evidence_class: weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]),\n',
    ]
    if hops_lines[role_a:role_a + 3] != expected_roles:
        raise SystemExit('basis role block mismatch')
    hops_lines[role_a:role_a + 3] = [
        '        actor_a_role: actorAPart.role,\n',
        '        actor_b_role: actorBPart.role,\n',
        '        actor_a_participation: {\n',
        '          actor_id: actorAPart.actor_id,\n',
        '          role: actorAPart.role ?? null,\n',
        '          participation_type: actorAPart.participation_type ?? null,\n',
        '          evidence_class: actorAPart.evidence_class ?? null,\n',
        '          window: actorAWindow,\n',
        '          receipt_ids: actorAReceiptIds,\n',
        '        },\n',
        '        actor_b_participation: {\n',
        '          actor_id: actorBPart.actor_id,\n',
        '          role: actorBPart.role ?? null,\n',
        '          participation_type: actorBPart.participation_type ?? null,\n',
        '          evidence_class: actorBPart.evidence_class ?? null,\n',
        '          window: actorBWindow,\n',
        '          receipt_ids: actorBReceiptIds,\n',
        '        },\n',
        '        evidence_class: weakestEvidence([surface.evidence_class, actorAPart.evidence_class, actorBPart.evidence_class]),\n',
    ]

    weight = unique_index(
        hops_lines,
        '      const ew = evidenceWeight(weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]));\n',
        'basis weight',
        role_a,
    )
    hops_lines[weight] = '      const ew = evidenceWeight(weakestEvidence([surface.evidence_class, actorAPart.evidence_class, actorBPart.evidence_class]));\n'
    hops_path.write_text(''.join(hops_lines), encoding='utf-8')

stint_path = Path('test/hop-stints.test.js')
stint_lines = stint_path.read_text(encoding='utf-8').splitlines(keepends=True)
assertion_start = "for (const basis of result.edges[0].surfaces) {\n"
if assertion_start not in stint_lines:
    anchor = unique_index(
        stint_lines,
        "], 'both legitimate stints must survive as separate hop-basis windows');\n",
        'hop-stint assertion',
    )
    stint_lines[anchor + 1:anchor + 1] = [
        assertion_start,
        "  assert.equal(basis.actor_a_participation.actor_id, 'actor-a');\n",
        "  assert.equal(basis.actor_b_participation.actor_id, 'actor-b');\n",
        "  assert.deepEqual(basis.actor_a_participation.receipt_ids, ['r1']);\n",
        "  assert.deepEqual(basis.actor_b_participation.receipt_ids, ['r1']);\n",
        '  assert.equal(basis.actor_a_participation.window.dated, true);\n',
        '  assert.equal(basis.actor_b_participation.window.dated, true);\n',
        '}\n',
    ]
    stint_path.write_text(''.join(stint_lines), encoding='utf-8')
