# Method & telemetry — how the question was reduced to a solution space

## The pipeline

`bound the question → enumerate the candidate space from open records via an adapter → attach a
receipt to every candidate → mark the residual honestly.` Tiered by the settled-vs-derived axis
(which coincides with the `candidate_only` boundary): **Haiku** retrieves, **Sonnet** resolves and
verifies, **Fable + human** adjudicate and promote. Full rules: `docs/tiered-research-methodology.md`.

## Runs behind this dossier

- **oz-run-2026-07-17-01** — first tiered execution (Haiku retrieve → Sonnet resolve → Fable
  adjudicate); designation mechanics, tract count adjudicated to 8,764, GAO demographic finding
  verified and gated.
- **oz-run-2026-07-17-02 / -03** — fund-layer resolution: SEC Form-D null; the `sec-edgar-fts.py`
  adapter built and shown Haiku-drivable at ~$0.07 (closing the "photonic vs structured" question —
  EDGAR is structured behind a User-Agent, not truly photonic).
- **land-run-2026-07-17-01 + verification pass** — five documented land instances enumerated (Sonnet),
  then verified/adjudicated: L1/L3/L5 verified, L2 verified verbatim (2012 purchases; "does not
  qualify" note), L4 partial (NYT paywalled), L4/L5 resolved as likely-distinct parcels.

## Model × technique benchmark (measured, on one gradable OZ task)

A 9-cell fan-out established the routing rules empirically: with an adapter + framing, **Haiku ties
Opus on the answer at ~1/18th the cost**; web-only against a blocked surface is the expensive,
unreliable path; Opus's marginal value is adversarial disambiguation, not the base answer. Full data:
`experiments/exp-2026-07-17-model-technique/` (cells.jsonl + rederivable cost).

## Telemetry discipline

Total tokens are authoritative; cost is a derived figure rederivable from tokens via a published price
table and split (see the experiment's `rates-and-assumptions.json`). Even failures are retained —
403s, abstentions, and unreachable sources are data about where the cheap path breaks.
