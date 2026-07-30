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
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:160]!r}")
    target.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str) -> None:
    target = ROOT / path
    text = target.read_text()
    if marker not in text:
        target.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n")


guard_path = "tools/validate-poof-constitutional-change.mjs"
replace_once(
    guard_path,
    "const sortedUnique = (values) => [...new Set(values || [])].sort();\n",
    """const sortedUnique = (values) => [...new Set(values || [])].sort();

export function remoteBranchForCandidate(candidate) {
  if (!candidate?.startsWith('origin/')) return null;
  const branch = candidate.slice('origin/'.length);
  if (!branch || branch.startsWith('/') || branch.endsWith('/') || branch.includes('..') || branch.includes('@{') || !/^[A-Za-z0-9._/-]+$/.test(branch)) return null;
  return branch;
}

export function resolveComparisonBase({ candidates, verify, fetchRemoteBranch }) {
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
)
replace_once(
    guard_path,
    """function resolveBase(explicit) {
  const candidates = [explicit, process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null, 'origin/main', 'HEAD^'].filter(Boolean);
  for (const candidate of candidates) if (git(['rev-parse', '--verify', candidate], { allowFailure: true })) return candidate;
  throw new Error('Unable to resolve a constitutional comparison base');
}
""",
    """function resolveBase(explicit) {
  const candidates = [explicit, process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null, 'origin/main', 'HEAD^'].filter(Boolean);
  const verify = (candidate) => Boolean(git(['rev-parse', '--verify', candidate], { allowFailure: true }));
  const fetchRemoteBranch = (branch) => {
    git(['fetch', '--no-tags', '--depth=1', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { allowFailure: true });
  };
  const resolved = resolveComparisonBase({ candidates, verify, fetchRemoteBranch });
  if (resolved) return resolved;
  throw new Error('Unable to resolve a constitutional comparison base');
}
""",
)

test_path = "test/poof-constitutional-change.test.js"
replace_once(
    test_path,
    "import { validateConstitutionalChangePlan, canonicalChangeLogPath } from '../tools/validate-poof-constitutional-change.mjs';\n",
    "import { validateConstitutionalChangePlan, canonicalChangeLogPath, remoteBranchForCandidate, resolveComparisonBase } from '../tools/validate-poof-constitutional-change.mjs';\n",
)
replace_once(
    test_path,
    "console.log('poof-constitutional-change.test: OK');\n",
    """assert.equal(remoteBranchForCandidate('origin/main'), 'main');
assert.equal(remoteBranchForCandidate('origin/feature/constitutional-guard'), 'feature/constitutional-guard');
assert.equal(remoteBranchForCandidate('HEAD^'), null);
assert.equal(remoteBranchForCandidate('origin/../escape'), null);

const availableRefs = new Set();
const fetchedBranches = [];
const resolvedBase = resolveComparisonBase({
  candidates: ['origin/main', 'HEAD^'],
  verify: (candidate) => availableRefs.has(candidate),
  fetchRemoteBranch: (branch) => {
    fetchedBranches.push(branch);
    if (branch === 'main') availableRefs.add('origin/main');
  }
});
assert.equal(resolvedBase, 'origin/main');
assert.deepEqual(fetchedBranches, ['main']);

console.log('poof-constitutional-change.test: OK');
""",
)

log_path = "data/project/poof-clifford-constitutional-change-log.json"
log = read_json(log_path)
if not any(row.get("change_id") == "POOF-CONST-2026-07-29-003" for row in log["changes"]):
    log["changes"].append(
        {
            "change_id": "POOF-CONST-2026-07-29-003",
            "effective_at": "2026-07-29T19:30:00-07:00",
            "protected_paths_touched": [
                "tools/validate-poof-constitutional-change.mjs",
                "test/poof-constitutional-change.test.js",
            ],
            "affected_invariants": [
                "constitutional custody is enforceable from standard shallow pull-request checkouts",
                "missing comparison refs may be acquired only through a validated remote-branch candidate",
                "checkout depth cannot silently disable or crash the constitutional release gate",
            ],
            "reason": "The generic Release Checks workflow exposed that a depth-one pull-request merge checkout lacked origin/main and HEAD^, causing the guard to fail before it could evaluate the receipt sequence.",
            "previous_behavior": [
                "the guard required a comparison ref to be present in the local clone",
                "the dedicated ecology workflow passed because it fetched full history while the generic release workflow failed at depth one",
            ],
            "proposed_behavior": [
                "use an already available comparison ref when present",
                "otherwise fetch only the validated shallow base branch required for comparison",
                "reject malformed remote-ref candidates and fail closed when no lawful base can be acquired",
            ],
            "migration": "Add a deterministic base-resolution helper, a validated one-branch shallow fetch fallback, and mutation coverage for valid and invalid candidates.",
            "backward_compatibility": "Full-history local and CI checkouts keep their existing behavior; only missing comparison refs invoke the bounded fetch fallback.",
            "adversarial_fixtures_added": [
                "shallow remote-base bootstrap",
                "invalid remote-ref rejection",
                "available-ref preference before network acquisition",
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
    "## Shallow-checkout base bootstrap",
    """## Shallow-checkout base bootstrap

The constitutional guard first uses a comparison ref already present in the clone. When a standard shallow pull-request checkout lacks its base ref, the guard may fetch only the validated remote base branch required for the comparison. Malformed ref candidates are rejected, broad history is not required, and failure to acquire a lawful base remains fatal.
""",
)

print("apply-poof-shallow-base-hardening: source changes applied")
