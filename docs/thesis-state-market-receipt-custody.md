# State-market thesis receipt custody

The first two thesis case-intake packets now have immutable repository custody
for the official-source material used in their bounded observations.

## Scope

The tranche covers eleven sources:

- three ACOBA and Civil Service Commission records for the Samantha Jones case;
- seven UK government records for the 10DS, i.AI, DSIT, and new-GDS chronology;
- one GSA Centers of Excellence comparator record.

Every receipt is a **structured factual extract**, not a complete HTML or PDF
snapshot. Each extract preserves the live source URL, capture date, selected
factual content, and a limitation statement. Its ledger hash authenticates the
repository extract only; it does not claim that the remote page bytes were
captured or that the extract is exhaustive.

## State separation

Receipt custody changes the case-packet machine stage from missing-receipt
intake to human-review-pending intake. It does not complete:

- the neutral public-side cohort or matched comparator denominator;
- institutional budget, personnel, programme, supplier, or merger-perimeter normalisation;
- claim-level human review;
- independent selection review;
- a separate evidence-promotion decision.

The compiled state must therefore remain:

```text
receipt-complete cases:           2
unique repository receipts:      11
human-review-complete cases:      0
denominator-complete cases:       0
promotion-eligible cases:         0
emitted thesis evidence packets:  0
graph effect:                   none
conclusion generated:           false
```

Intended `supports`, `weakens`, and `null_result` relations inside an intake
packet remain inadmissible to thesis synthesis until a separate human-reviewed
promotion action creates a proposition-scoped evidence packet.

## Reproduction

```bash
npm run compile:case-packets
npm run validate:case-packets
npm run validate:state-market-receipts
npm run compile:thesis
npm run validate:thesis
```

The repository-wide `npm run release:check` includes the receipt regression
through `npm test`.
