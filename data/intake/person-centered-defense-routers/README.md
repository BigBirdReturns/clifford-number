# Person-centered defense-technology routers (source-addressed intake)

A **router** is a person who publicly performs several observable functions across otherwise
separate institutions — controls multiple capital vehicles, selects/advises companies, sources deals
for other funds, connects capital stages, transitions operator→investor, and connects companies to
government-market / validation / procurement surfaces. **"Purpose" means a publicly stated or
structurally observable function.** No private intent, coordination, influence, or wrongdoing is
inferred. `graph_effect: none` throughout.

Canonical-first on **`person:jackson-moses`**, protected by
`data/canonical/jackson-moses-preservation-contract.json` (+ `test/jackson-moses-preservation.test.js`).

## Evidence model
Evidence state is applied **per predicate**, not per person:
`observed · self_claimed · counterpart_reported · official_record · independently_corroborated ·
inferred · disputed · name_match_only · unavailable_after_search · not_searched`.
Discovery admission is separate from corroboration. A self-authored page establishes that the person
**publicly represented** a role/relationship — never the counterpart's agreement, legal control,
transaction, influence, coordination, or wrongdoing. **Uncertainty changes the edge label, not the
observation.**

## Financial types are never conflated
`round_size · cumulative_funding · valuation · fund_size · check_size · contract_ceiling ·
obligated_amount · outlay/payment · revenue · exit_value` are separate fields. An IDIQ **ceiling** is
never narrated as spending, revenue, or payment.

## Build / validate / test
```
npm run build:routers        # deterministic from committed universes + inline source-addressed facts
npm run validate:routers
node test/person-routers.test.js
node test/jackson-moses-preservation.test.js
```

## Files
`manifest.json` · `actors.jsonl` · `vehicles.jsonl` · `professional-roles.jsonl` ·
`portfolio-edges.jsonl` · `advisory-edges.jsonl` · `deal-sourcing-claims.jsonl` ·
`funding-rounds.jsonl` · `co-investor-edges.jsonl` · `government-programs.jsonl` ·
`government-awards.jsonl` · `validation-surfaces.jsonl` · `follow-on-capital.jsonl` · `exits.jsonl` ·
`router-source-universe.jsonl` (the roster-derived denominator) · `router-candidates.jsonl` ·
`router-signatures.jsonl` · `game-trails.jsonl` · `trail-frontier.jsonl` · `rejected-joins.jsonl` ·
`coverage-gaps.jsonl` · `receipts.jsonl` · `analysis.md` ·
`sources/` (`jackson-portfolio.json`, `counterpart-searches.jsonl`, `fund-portfolio-census.json`,
`fund-team-rosters.json`, `government-awards.json`)

## Completion contract (enforced by validate:routers + tests)
Fails if: the denominator equals only the 12-name seed list; a counterpart status claims a searched
result without provenance; a required frontier row stays `not_searched`; an admitted router lacks a
two-hop trail; government awards conflate ceiling/obligated/outlay; or Jackson's overlap reverts to
`not_searched`. The neutral denominator derives from the committed LinkedIn projection + fetched fund
team rosters — never a hard-coded seed array.

## Router signatures (score = discovery-routing, NOT suspicion)
A person is admitted after ≥3 of 8 independently observable signature predicates: multiple vehicles;
advises/directs multiple companies; cross-fund deal sourcing; operator→investor transition; connects
multiple portfolio/validation surfaces; connects capital to government/procurement; convening/
fellowship/foundation; multi-stage in the same company's path.

## Continuation
`trail-frontier.jsonl` preserves open frontiers (fund-portfolio census, sourcing counterpart
confirmation, government award-ID resolution) so a later run continues without rediscovery.
