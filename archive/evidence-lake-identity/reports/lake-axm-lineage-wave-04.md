# Evidence-lake AXM participation lineage Wave 04

Source fingerprint: `d44fcaf4e97ef570c99af7d1e5c0437ca3f57d9c34b9fc5918cceea05e09d9b2`

## Governing judgment

The remaining 164 Wave 02 fallback registrations are the complete provisional AXM `participates_in` claim layer. Every claim recomputes from one or more canonical rows in `data/ledger/participation.jsonl`; no additional factual claim or native case source is missing. The source-lineage debt can therefore close without pretending that the provisional AXM serialization is externally reconciled.

```text
provisional AXM claims:                 164
fallback registrations superseded:     164
canonical participation rows linked:   164
multi-stint claims:                     0
distinct receipt IDs linked:            15
native source migration debt:           164 -> 0
external AXM reconciliation complete:   false
cross-case join authorized:             false
decisions requiring human permission:  0
```

## Boundary

A canonical participation lineage is not evidence truth, identity resolution, coordination, causation, or pairwise-hop authority. The AXM envelope remains provisional and may not be used as a cross-system or cross-case join key until byte-for-byte reconciliation against `axm-genesis` succeeds. That material reproducibility defect controls cross-system use; it does not create a human-permission gate for recording the native lineage already present.
