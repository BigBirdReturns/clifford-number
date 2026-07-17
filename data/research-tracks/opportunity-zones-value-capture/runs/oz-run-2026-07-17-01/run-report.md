# Run report — `oz-run-2026-07-17-01`

**Track:** opportunity-zones-value-capture · **Date:** 2026-07-17 · **Status:** complete, `candidate_only` (0 promoted to finding)

A live tiered execution of the highest-value harness. Three rungs ran the settled-vs-derived
split the Tier-Bench policy predicts: **Haiku** retrieved, **Sonnet** resolved/triaged, and the
**top rung** verified receipts and applied the forbidden-inference gate. Nothing promoted to a
finding; the central value-capture question is left honestly **OPEN**.

## What the run established (all `candidate_only`)

8 candidates, admissible to human review, resting on **9 distinct public sources** (IRS, Treasury,
GAO) after dedupe:
- The OZ **designation mechanics and timeline**: TCJA-2017 authority (IRC 1400Z-2) → gubernatorial
  nomination → Treasury certification → first round Apr 9 2018, final round Jun 14 2018.
- Adjudicated **tract count: 8,764** (IRS Notice 2018-48; the "8,761" in one Treasury press release
  is a superseded early figure).
- One **GAO oversight finding** (GAO-22-104019), verified verbatim, that selected tracts had higher
  poverty and a greater non-White share than eligible-unselected tracts — **gated** with the
  statutory-design competing explanation and barred from any impropriety inference.

## What stays OPEN (the honest boundary)

The core question — *was private capital positioned in eventually-designated tracts before
designation?* — **could not be answered and was not.** Retrieval never reached fund-formation dates,
pre-designation ownership, or SEC Form-D QOF filings. This is not a gap papered over: SEC EDGAR
filing pages returned **403** and the Treasury data page **timed out** via WebFetch — i.e. the run
hit exactly the **photonic (ScreenGhost) acquisition cost the harness predicted**. Advancing the
positioning question requires wiring the SEC Form-D and county-recorder adapters.

## Tiering telemetry (feeds Tier-Bench `cost_per_success`)

| rung | model | tokens | tool calls | wall-clock | cost (approx) | success |
|---|---|---|---|---|---|---|
| retrieval | Haiku 4.5 | 43,479 | 16 | 238 s | ~$0.087 | ✅ receipts verifiable, gaps honest |
| resolution | Sonnet 5 | 48,938 | 0 | 182 s | ~$0.352 | ✅ dedupe/OPEN/contradiction all correct |
| adjudication | Fable 5 + human | (main-loop) | 2 | 72 s | scarce top-rung | ✅ 2 receipts verified, gate held |

**Cheap-tier total ≈ $0.44** produced the entire triaged, receipt-backed, honestly-scoped candidate
set. The expensive rung touched only the one-cell-wide judgment residue: two live receipt checks, one
contradiction resolution, and the forbidden-inference gate. That is H1 (commodity-markup) and the
settled-vs-derived axis confirmed **live**, not just in the Tier-Bench harness.

Costs are approximate — the Agent tool exposes total tokens but not the input/output split; the exact
split is in the subagent transcripts named in `telemetry.json` (`harvest_pointer`).

## Files

- `phase1-haiku-retrieval.json` — retrieval output + step log
- `phase2-sonnet-resolution.json` — resolution/triage output + step log
- `phase3-adjudication.json` — receipt verification, contradiction resolution, promotion decision
- `candidates.jsonl` — the 8 `candidate_only` rows
- `telemetry.json` — the per-rung ledger (the Tier-Bench feed)

## Next pass

Wire the **SEC Form-D (QOF)** and **county-recorder** photonic adapters (ScreenGhost), enumerate a
bounded tract slice, and pull fund-formation + pre-designation ownership dates. Only then can the
positioning question move off OPEN — and even then, only to `candidate_only` pending human admission.
