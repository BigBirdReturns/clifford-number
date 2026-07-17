# Run report — `oz-run-2026-07-17-02` (finishing the positioning question)

**Track:** opportunity-zones-value-capture · **Date:** 2026-07-17 · **Builds on:** `oz-run-2026-07-17-01` · **Status:** positioning question RESOLVED BY LAYER, `candidate_only` (0 promoted to finding)

Run-01 left the core value-capture question OPEN because retrieval couldn't reach fund-formation dates (SEC 403) or pre-designation ownership. This pass wired the photonic adapter and finished it — with a genuinely interesting result.

## The interesting result: the fund layer is a red herring; the signal is in the land

**Fund layer (SEC EDGAR Form-D, reached via the photonic browser):** Form-D filings containing "qualified opportunity fund" number **zero in all of 2018** and begin **2019-01-04**. The QOF vehicle *entirely postdates* the April/June 2018 designation — by construction, since the OZ regulatory framework didn't exist until late 2018. So there is **no pre-positioning signal at the fund-vehicle layer**. Anyone screening QOF formation dates for "who got in early" is looking at the wrong layer.

**Land layer (public oversight + reporting):** the pre-positioning signal lives here. ProPublica documented that a West Palm Beach tract containing an **already-owned, operating superyacht marina** was added to Florida's OZ nominations *after the owner lobbied Gov. Rick Scott* — appeal in April 2018, selections announced ~one week later (April 19, 2018) — a tract the state "had not originally intended to pick." The mechanism is **patient land ownership + gubernatorial nomination discretion**, and it drew a **Treasury Inspector General probe** and a **Senate Finance Committee inquiry**.

## Why this matters for the harness

This validates the `place-formation` signature's design. Its `patient-ownership` ("positioned before activation") and `intermediary-governance` (here, nomination discretion) stages point at exactly the layer where the documented signal is — land and the designation decision — while the flashier fund layer is inert for this question. The bounded run reproduced the Arcadia thesis (private positioning precedes/captures public de-risking) on a completely different program, with receipts, as `candidate_only`, gate held: designating already-owned land is lawful, and adjudication of any abuse belongs to the named oversight bodies, not this pipeline.

## Telemetry findings (feed Tier-Bench)

- **Adapter result:** `sec-qof-regd` is confirmed **photonic**. WebFetch (structured/direct) → **403**; the in-app browser (ScreenGhost stand-in) with a real User-Agent → **success**. This is the harness's structured-vs-photonic split confirmed empirically.
- **Tiering gap (honest):** the photonic retrieval **could not be delegated to a Haiku subagent** this pass — the browser is a single shared pane, not exposed to subagents, so the **top rung drove it**. Photonic acquisition does *not yet* inherit the cheap-tier economics that structured retrieval demonstrated in run-01 (Haiku, ~$0.09). Closing this needs a per-worker ScreenGhost service, or the browser surfaced to cheap-tier subagents. **This is the single most useful thing this run learned about the tiering.**

## Files

- `phase4-photonic-sec-formd.json` — SEC EDGAR pull + fund-layer temporal screen (0 in 2018)
- `phase5-land-layer.json` — documented land-layer instances + forbidden-inference gate
- `candidates.jsonl` — 4 new `candidate_only` rows (p1–p4)
- `telemetry.json` — adapter result + tiering gap

## Bottom line

The positioning question is resolved by layer, not left open: **QOF formation postdates designation (null); pre-positioning, where documented, is a land-ownership + nomination-discretion phenomenon, already under official oversight.** Nothing promoted to a finding. The next real build is closing the tiering gap so Haiku can drive the photonic surface — because the *research* half now works end-to-end.
