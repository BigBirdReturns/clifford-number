# Plain-language layer

Reader-facing narration compiled from the same ledger the hop graph is built
from. Motivated by editorial review: the graph assumes the reader knows who
the actors are; almost no reader does.

## Design rule

The narrator ADDS NO FACTS. Every sentence renders from:
1. participation rows (roles, windows, receipts),
2. surface rows (labels, types, windows),
3. an optional human-written `plain` block on a canonical actor/organization.

If (3) is absent, the intro falls back to a machine-derived profile of the
actor's documented participations, explicitly marked
`[machine-derived from ledger; no editorial profile yet]`. An unfinished
profile is shown as unfinished, never papered over.

## Canonical `plain` block (additive, optional)

```json
{
  "id": "ben-warner",
  "label": "Dr. Ben Warner",
  "kind": "person",
  "plain": {
    "who": "One sentence of who this is, written by a human, receipt-supported.",
    "why_here": "One sentence on why they appear in this case.",
    "receipt_ids": ["uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16", "gov-sage-89-ben-warner-no10-2021-05-13"]
  }
}
```

Discipline: if the `who` sentence cannot be written from receipts already in
the ledger, the actor probably is not ready to be canonical.

The narration test resolves every `plain.receipt_ids` entry and walks the
compiled hop graph from its declared anchor. The anchor and every actor at
Clifford Number 1 or 2 must carry both editorial sentences, so adding a new
anchor-adjacent actor without a receipt-backed profile fails the release test
rather than silently restoring a mechanical introduction.

## Usage

```bash
npm run narrate -- --from dominic-cummings --to matt-clifford --legible
npm run narrate -- --from ben-warner --as-of 2020 --md
```

- `--legible` re-ranks among equal-length shortest paths: prefer hops over
  low-population surfaces, fully dated bases, and known surface types. The
  Clifford Number is unchanged; only which minimal path gets narrated changes.
- `--md` emits publishable markdown; `--json` wraps text + path for tooling.

## Narration flags

Every hop sentence carries inline flags so legibility never costs honesty:
- temporal status when not fully dated,
- `broad surface: N documented participants - low individual signal` when a
  surface carries 20+ actors (roster co-presence is stated as such),
- evidence class,
- receipt IDs.

## Not in scope

No adjectives, no motive language, no inferred relationships. The closing
disclaimer is emitted on every narration: shared surface means documented
co-presence, nothing more.
