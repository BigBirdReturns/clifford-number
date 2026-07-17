# Tiered research methodology — what the OZ runs proved, banked for every track

This is the reusable operating procedure for running a research-track harness, validated end-to-end
on `opportunity-zones-value-capture` (runs oz-run-2026-07-17-01..03 and the 9-cell model×technique
benchmark). Apply it to any of the ten tracks. It is deliberately empirical: every rule below is a
measured result, not a preference.

## The pipeline

```
denominator → [Haiku] framed retrieval → [Sonnet] resolution/triage → [Fable+human] adjudication → candidate_only
```

Each rung's job is fixed by the settled-vs-derived axis (Tier-Bench H2), which coincides with
Clifford's `candidate_only` boundary:

- **Haiku — settled retrieval.** Extraction, enumeration, adapter calls, receipt-field capture,
  coverage bookkeeping. Deterministic validation surface (fields/hash/parse). ~all the token volume.
- **Sonnet — derivation-with-a-check.** Entity resolution, exact-overlap join, temporal screen,
  threshold evaluation, coverage prose, candidate triage. Structured check (join reconciles, order
  well-defined).
- **Fable + human — the promotion decision.** Receipt verification, forbidden-inference gate,
  coincidence-vs-structure adjudication, admission to the review queue. Small, scarce.

## The nine measured rules

1. **The crate and the framing dominate the model.** With an adapter + a 3-step frame, Haiku ties
   Opus on the answer at ~1/18th the cost (benchmark e7 $0.064 vs e9 $1.176, identical result). Pick
   the cheapest model that clears the task; spend nothing extra on tier.
2. **Framing is what separates clean from messy — not model size.** Adapter-alone let every model
   wander (a model saw the right date and still left the field null). A short, explicit plan
   ("query narrow first; a zero is a valid answer; then broaden for the earliest") snaps them to clean
   output. The harness supplies selection; the model supplies the judgment it already has (H3).
3. **Try a User-Agent-compliant fetcher before reaching for ScreenGhost.** Some surfaces that 403 a
   headless fetcher (WebFetch) are *structured behind a UA header*, not truly photonic. SEC EDGAR is
   one: a ~70-line fetcher (`tools/adapters/sec-edgar-fts.py`) reclassified it structured/cheap-tier.
   Only JS-rendered viewers (many county recorders) are genuinely photonic.
4. **Web-only against a blocked surface is the expensive, unreliable last resort.** In the benchmark
   it produced one right-but-costly answer (45 tool calls, 354 s, a press-release receipt), one wrong
   date, and one honest abstention. Prefer an adapter every time; a $0.064 framed-adapter Haiku beat a
   $1.71 web-only Opus that got the date *wrong*.
5. **Opus earns its price at adversarial disambiguation, not the base answer.** The only unique move in
   the benchmark was Opus ruling out 817 generic "opportunity fund" false positives. Route the
   expensive tier at judgment/false-positive defense, not retrieval.
6. **Honest-inconclusive is graded separately from wrong.** A model that refuses to assert a negative
   it can't verify against a primary source is behaving correctly under the Clifford contract. Do not
   let a success metric punish abstention by lumping it with error.
7. **Retrieval never promotes.** Every retrieval rung runs `graph_effect: none`; only Fable+human move
   a candidate to a finding. This is why cheap models on retrieval are epistemically safe, not just
   cheap.
8. **Even failures are data — keep every cell.** 403s, wrong dates, abstentions, and unreachable
   surfaces all go in the ledger. They are how the tiering learns where the cheap path breaks.
9. **Telemetry must be rederivable.** Record exact total tokens (authoritative), tool_uses, and
   duration per rung/cell. Cost is a *derived* figure: publish the price table, the assumed
   input/output split, and the formula so every dollar number rederives from tokens
   (`cost = tokens * (split_in*price_in + split_out*price_out) / 1e6`). Exact splits are a transcript
   harvest; say so.

## cost_per_success

`cost_per_success = average_cost / success_rate`, per adapter per tier (Tier-Bench). Grade against a
task with a checkable answer; credit honest-inconclusive as its own outcome. Route on measured rows,
not brand.

## Provenance

Validated on OZ: the fund layer resolved as a cheap-tier structured pull (SEC adapter, Haiku-driven,
~$0.07); the model×technique benchmark (`data/research-tracks/opportunity-zones-value-capture/experiments/`)
established rules 1–6; the run ledgers established the pipeline and rule 9. The remaining photonic
surface (county-recorder deed images) is the honest boundary where rule 3's UA trick stops working.
