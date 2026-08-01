#!/usr/bin/env bash
set -euo pipefail

validator='tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs'
next='tools/run-wave27-public-interest-downstream-materializer-v3.sh'
self='tools/run-wave27-public-interest-downstream-materializer-v4.sh'

test -f "$validator"
test -f "$next"
python3 - <<'PY'
from pathlib import Path

path = Path('tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs')
text = path.read_text()
old = """  const eligible = publicRows.filter(row => contract.public_interest_eligible_refs.includes(row.closure_ref));
  const blocked = legislativeRows.filter(row => contract.legislative_blocked_refs.includes(row.closure_ref));
  if (eligible.length !== expected.eligible_tasks) fail(errors, 'Wave 27 eligible task count drift');
"""
new = """  const publicResultRows = publicRows.filter(row => row.row_type === 'closure_execution_result');
  const expectedPublicRefs = [contract.public_interest_gate_ref, ...contract.public_interest_eligible_refs].sort();
  if (!same(publicResultRows.map(row => row.closure_ref).sort(), expectedPublicRefs)) fail(errors, 'Wave 27 public source-row denominator drift');
  const noneligiblePublic = publicResultRows.filter(row => !contract.public_interest_eligible_refs.includes(row.closure_ref));
  if (noneligiblePublic.some(row =>
    row.closure_ref !== contract.public_interest_gate_ref ||
    row.execution_state === contract.eligible_source_state ||
    row.executed_in_wave !== true ||
    row.result_state !== 'complete'
  )) fail(errors, 'Wave 27 noneligible public row entered executable denominator');

  const eligible = publicResultRows.filter(row => contract.public_interest_eligible_refs.includes(row.closure_ref));
  const blocked = legislativeRows.filter(row => contract.legislative_blocked_refs.includes(row.closure_ref));
  if (eligible.length !== expected.eligible_tasks) fail(errors, 'Wave 27 eligible task count drift');
"""
if old not in text:
    raise SystemExit('Wave 27 eligible-source validator marker absent')
path.write_text(text.replace(old, new, 1))
PY
rm -f "$self"
exec bash "$next"
