# Clifford-Number work queue

One row = one deliverable. Claim before work: put your handle + date in
`owner`, flip `state` to `claimed`, commit that edit first. Rows derive only
from BUILD-INSTRUCTIONS.md (the governing document); do not add rows that
document does not authorize.

| id | task | owner | lane | state | evidence when done | note |
|----|------|-------|------|-------|--------------------|------|
| CN-P0-1 | Phase 0 §2.1 AXM identity reconciliation: reconcile `tools/lib/axm-id.mjs` byte-for-byte against axm-genesis `axm_verify.identity` | claude 2026-08-20 | driver | done — 2026-08-20 | Shared fixture file of (namespace, label) pairs producing identical IDs in both repositories, committed to both; `npm test` green | Until this gate closes, `build/axm-identity.json` stays quarantined and no cross-case join ships (BUILD-INSTRUCTIONS.md §2.1). Scope: this repo + a fixture landing in axm-genesis. |
