#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()


def read_json(path: str):
    return json.loads((ROOT / path).read_text())


def write_json(path: str, value) -> None:
    (ROOT / path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:180]!r}")
    target.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str) -> None:
    target = ROOT / path
    text = target.read_text()
    if marker not in text:
        target.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n")


guard_path = "tools/validate-poof-constitutional-change.mjs"
replace_once(
    guard_path,
    """export function resolveComparisonBase({ candidates, verify, fetchRemoteBranch }) {
  const uniqueCandidates = [...new Set((candidates || []).filter(Boolean))];
  for (const candidate of uniqueCandidates) if (verify(candidate)) return candidate;
  for (const candidate of uniqueCandidates) {
    const branch = remoteBranchForCandidate(candidate);
    if (!branch) continue;
    fetchRemoteBranch(branch);
    if (verify(candidate)) return candidate;
  }
  return null;
}
""",
    """export function resolveComparisonBase({ candidates, verify, fetchRemoteBranch }) {
  const uniqueCandidates = [...new Set((candidates || []).filter(Boolean))];
  for (const candidate of uniqueCandidates) if (verify(candidate)) return candidate;
  for (const candidate of uniqueCandidates) {
    const branch = remoteBranchForCandidate(candidate);
    if (!branch) continue;
    fetchRemoteBranch(branch);
    if (verify(candidate)) return candidate;
  }
  return null;
}

export function resolveCommittedPathDiff({ mergeBaseDiff, treeDiff }) {
  const mergeBaseOutput = mergeBaseDiff();
  if (mergeBaseOutput !== null) return { mode: 'merge_base', output: mergeBaseOutput };
  const treeOutput = treeDiff();
  if (treeOutput !== null) return { mode: 'tree_delta', output: treeOutput };
  throw new Error('Unable to compare constitutional paths with the selected base');
}
""",
)
replace_once(
    guard_path,
    r"""  const committed = git(['diff', '--name-only', `${resolvedBase}...HEAD`]).split('\n').filter(Boolean);
  const working = git(['diff', '--name-only']).split('\n').filter(Boolean);
""",
    r"""  const committedComparison = resolveCommittedPathDiff({
    mergeBaseDiff: () => git(['diff', '--name-only', `${resolvedBase}...HEAD`], { allowFailure: true }),
    treeDiff: () => git(['diff', '--name-only', resolvedBase, 'HEAD'], { allowFailure: true })
  });
  const committed = committedComparison.output.split('\n').filter(Boolean);
  const working = git(['diff', '--name-only']).split('\n').filter(Boolean);
""",
)
replace_once(
    guard_path,
    """  return { baseRef: resolvedBase, ...validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) };
""",
    """  return { baseRef: resolvedBase, comparisonMode: committedComparison.mode, ...validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) };
""",
)
replace_once(
    guard_path,
    """  console.log(`validate-poof-constitutional-change: OK (${result.appended.length} appended receipt(s), ${result.touched.length} protected path(s))`);
""",
    """  console.log(`validate-poof-constitutional-change: OK (${result.appended.length} appended receipt(s), ${result.touched.length} protected path(s), ${result.comparisonMode})`);
""",
)

test_path = "test/poof-constitutional-change.test.js"
replace_once(
    test_path,
    "import { validateConstitutionalChangePlan, canonicalChangeLogPath, remoteBranchForCandidate, resolveComparisonBase } from '../tools/validate-poof-constitutional-change.mjs';\n",
    "import { validateConstitutionalChangePlan, canonicalChangeLogPath, remoteBranchForCandidate, resolveComparisonBase, resolveCommittedPathDiff } from '../tools/validate-poof-constitutional-change.mjs';\n",
)
replace_once(
    test_path,
    "console.log('poof-constitutional-change.test: OK');\n",
    """const comparisonAttempts = [];
const shallowComparison = resolveCommittedPathDiff({
  mergeBaseDiff: () => { comparisonAttempts.push('merge_base'); return null; },
  treeDiff: () => { comparisonAttempts.push('tree_delta'); return 'validator.mjs\\n'; }
});
assert.deepEqual(shallowComparison, { mode: 'tree_delta', output: 'validator.mjs\\n' });
assert.deepEqual(comparisonAttempts, ['merge_base', 'tree_delta']);

const fullComparison = resolveCommittedPathDiff({
  mergeBaseDiff: () => 'constitution.json\\n',
  treeDiff: () => { throw new Error('tree fallback must not run'); }
});
assert.deepEqual(fullComparison, { mode: 'merge_base', output: 'constitution.json\\n' });

console.log('poof-constitutional-change.test: OK');
""",
)

log_path = "data/project/poof-clifford-constitutional-change-log.json"
log = read_json(log_path)
if not any(row.get("change_id") == "POOF-CONST-2026-07-29-004" for row in log["changes"]):
    log["changes"].append(
        {
            "change_id": "POOF-CONST-2026-07-29-004",
            "effective_at": "2026-07-29T19:45:00-07:00",
            "protected_paths_touched": [
                "tools/validate-poof-constitutional-change.mjs",
                "test/poof-constitutional-change.test.js",
            ],
            "affected_invariants": [
                "a shallow merge checkout cannot suppress protected-path comparison by lacking a traversable merge base",
                "the fallback compares complete base and current trees rather than inferring an empty change set",
                "merge-base comparison remains preferred whenever repository history supports it",
            ],
            "reason": "The real depth-one pull-request merge checkout fetched origin/main successfully but Git treated the merge commit as a shallow root, so triple-dot diff had no merge base.",
            "previous_behavior": [
                "base acquisition succeeded but committed-path enumeration terminated on a missing merge base",
                "the generic release gate could not reach constitutional receipt validation in a depth-one PR merge checkout",
            ],
            "proposed_behavior": [
                "attempt the ordinary merge-base diff first",
                "fall back only on failure to a direct base-tree versus current-tree diff",
                "fail closed if neither comparison can be produced and expose the comparison mode in the validation receipt",
            ],
            "migration": "Add an injected committed-path comparison helper, mutation coverage for preferred and fallback modes, and regenerate every release-bound product.",
            "backward_compatibility": "Full-history clones retain merge-base behavior; shallow PR merge clones receive a conservative net-tree comparison that cannot omit a final protected-file difference.",
            "adversarial_fixtures_added": [
                "missing merge-base tree-delta fallback",
                "merge-base preference without fallback execution",
                "comparison-mode receipt",
            ],
            "emergency_override": False,
            "expires_at": None,
            "authority": "repository_change_receipt_below_canonical_evidence",
            "graph_effect": "none",
        }
    )
write_json(log_path, log)

append_once(
    "docs/methods/poof-operational-effect-and-amendment-law.md",
    "## Shallow merge-tree comparison",
    """## Shallow merge-tree comparison

A depth-one pull-request merge checkout may contain the base tree while still marking the merge commit as a shallow root, making an ordinary merge-base diff unavailable. The guard first attempts the merge-base comparison. Only when that fails does it compare the complete selected base tree directly with the current tree. This fallback is conservative: any final protected-file difference remains visible. If neither comparison can be produced, validation fails closed.
""",
)

print("apply-poof-shallow-tree-diff-hardening: source changes applied")
