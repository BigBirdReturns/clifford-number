# M-05 Sprint 05 — start-to-finish audit

The audit verified that PR #357 merged and that its pull-request exact-head workflows passed. It also found eight implementation defects that made the v1 conformance layer weaker than its written adoption constitution.

The corrective rule is simple: **a machine may verify structure, custody, date, scope, and internal consistency; it may not manufacture independence, truth, authority, or observed effect.**

## Findings

1. Open blockers were parsed but ignored.
2. Boolean observations could promote A1–A5.
3. Technical review was required by policy but not by code.
4. Claim and actual deployment modes could diverge.
5. Attestations and authorities lacked full freshness and scope checks.
6. Source fingerprints normalized JSON instead of hashing exact bytes.
7. The candidate landscape lacked source locators.
8. The registry fingerprint was placeholder text.

## Disposition

Every finding is corrected in `apc-adoption-package@2`. The v1 package is superseded for promotion purposes. The verified adoption ceiling remains A0 because no independent reproduction, affected-party approval, lawful shadow use, prospective parallel operation, live rights-bearing use, or durability observation has been added.
