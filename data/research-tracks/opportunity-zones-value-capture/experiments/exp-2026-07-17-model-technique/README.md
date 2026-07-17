# Experiment — model × technique fan-out on the OZ "pre-designation fund filing" task

**Date:** 2026-07-17 · **Track:** opportunity-zones-value-capture · **Cells:** 9 (parallel subagents) · **Wall clock:** ~460 s

A Tier-Bench-style benchmark run *on* the OZ track. One bounded, gradable task; 9 straight-through
cells varying **model** {haiku, sonnet, opus} × **technique** {adapter, web-only, adapter+framing}.
Per-cell telemetry is from each subagent's usage envelope. Failures are kept — they're the point.

**Task:** Did any Qualified Opportunity Fund / "opportunity zone" Form-D filing exist before the
June 14 2018 final OZ designation, and what is the earliest such fund Form-D date?
**Ground truth:** No. Earliest = **2018-06-21** (Virtua Opportunity Zone Fund I, LLC, AZ).

## Results

| cell | model | technique | verdict | Q1 | Q2 date | tool calls | tokens | wall | ~$ |
|---|---|---|---|---|---|---|---|---|---|
| e7 | haiku | adapter+framing | **CORRECT_CLEAN** | ✅ | 2018-06-21 ✅ | 2 | 29k | 35s | **0.064** |
| e8 | sonnet | adapter+framing | **CORRECT_CLEAN** | ✅ | 2018-06-21 ✅ | 3 | 39k | 28s | 0.282 |
| e9 | opus | adapter+framing | **CORRECT_CLEAN** | ✅ | 2018-06-21 ✅ | 2 | 33k | 20s | 1.176 |
| e2 | sonnet | adapter | CORRECT | ✅ | 2018-06-21 ✅ | 4 | 40k | 44s | 0.286 |
| e1 | haiku | adapter | PARTIAL | ✅ | null | 9 | 33k | 79s | 0.072 |
| e3 | opus | adapter | CORRECT+RIGOR | ✅ | null | 3 | 33k | 32s | 1.197 |
| e4 | haiku | web-only | CORRECT_COSTLY | ✅ | 2018-06-21 ✅ | 45 | 61k | 354s | 0.159 |
| e6 | opus | web-only | Q1_OK_Q2_WRONG | ✅ | 2018-08-17 ❌ | 14 | 44k | 118s | 1.714 |
| e5 | sonnet | web-only | HONEST_INCONCLUSIVE | — | none | 37 | 82k | 349s | 0.641 |

(Costs approximate — usage envelopes give total tokens, not the input/output split. Opus priced $15/$75 per 1M.)

## What the data says

**1. The crate + the framing dominate the model choice.** With adapter+framing, *all three models
were correct, clean, and cheap* (2–3 tool calls, 20–35 s). Haiku (e7, $0.064) and Opus (e9, $1.176)
produced the **identical answer** — an **~18× price gap for the same result**. This is Tier-Bench H1
(commodity-markup) and H3 (framing/harness lifts the cheap model) reproduced on a brand-new task.

**2. Framing is what separated clean from messy — not model size.** Adapter *without* framing let
every model wander: haiku (e1) saw 2018-06-21 in its own results but left the field null; opus (e3)
went off disambiguating the generic phrase; sonnet (e2) buried the answer in prose. Add the three-step
framing and the same models snap to clean answers. The harness supplies selection, exactly as H3 says.

**3. Web-only is the expensive, unreliable path — the killer "failure is data" result.** Removing the
adapter (forcing WebSearch/WebFetch against a 403-ing SEC) produced: one right-but-costly answer
(haiku e4: correct, but 45 calls, 354 s, and a *press-release* receipt instead of primary), one
**wrong date** (opus e6: 2018-08-17, missed Virtua), and one honest abstention (sonnet e5: refused to
assert without primary access). **Opus web-only cost $1.71 and got the date wrong; Haiku adapter+framing
cost $0.064 and got it right — a ~27× cost swing in favor of the cheap model with the right tool.**

**4. Where Opus actually earned its price: adversarial rigor, not the base answer.** The one thing no
cheaper model did was e3's move — testing the generic "opportunity fund" phrase (817 unrelated hits)
and correctly ruling them out as pre-existing funds, not QOFs. That is the nameable frontier residue:
Opus spends its extra capability on *disambiguation and false-positive defense*, not on getting the
answer everyone already got. Route Opus at the judgment/adversarial step, not the retrieval.

**5. The most epistemically correct cell "failed" the task — and that's correct behavior.** Sonnet
web-only (e5) refused to assert a negative it couldn't verify against a primary source. Under the
Clifford contract that abstention is a feature, not a miss. Grading must credit honest-inconclusive
separately from wrong (e6) — a "success rate" that lumps them together would punish the right instinct.

## Takeaway for the tiering policy

Confirmed, on fresh data: **model tier is the least important variable; the adapter (crate) and the
framing (harness) decide correctness and cost.** Put Haiku on adapter+framed retrieval (it ties Opus at
1/18th the price), reserve the expensive tier for adversarial disambiguation and the promotion decision,
and treat "web-only against a 403 surface" as a last resort that is both pricier and less accurate than a
20-line UA fetcher. Every cell — including the wrong one and the abstention — is retained in
`cells.jsonl` for the Tier-Bench ledger.
