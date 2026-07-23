# Macro estates

An **estate** is a durable domain corpus. It is not a single city, project, cohort, company, program, track, or report.

Examples:

- the Dialog estate;
- the United Kingdom defense estate;
- the United States defense estate;
- the local development estate.

The project previously used `estate_id` for bounded acquisition packets such as one CHIPS site, one transit project, or one annual accelerator cohort. Those objects remain useful and stable, but this registry interprets them as **estate slices**.

```text
raw source or bounded denominator
→ estate slice
→ durable domain estate
→ bounded parallel acquisition lane
→ typed case ledger
→ structured report
→ independent review
→ approved publication
```

## Why this layer exists

A slice answers a bounded collection question. An estate answers a stewardship question:

- Which jurisdiction and domain does this corpus cover?
- Which source families and identity systems belong together?
- Which cases, tracks, slices, and controls are already in custody?
- What denominator and null populations are required?
- Which fog class can still change the interpretation?
- Which acquisition should occur next?
- Which cross-estate joins are lawful and methodologically valid?

The estate registry does not duplicate claims or receipts. It organizes custody over existing source ledgers, case ledgers, research tracks, and estate slices.

## Current estate set

### Existing estates

1. `dialog-estate`
2. `uk-defense-estate`
3. `us-defense-estate`
4. `local-development-estate`

### Next ten estates

1. `transatlantic-defense-innovation-estate`
2. `uk-state-market-estate`
3. `us-executive-appointments-ethics-estate`
4. `us-legislative-political-finance-estate`
5. `state-municipal-authority-estate`
6. `public-money-industrial-policy-estate`
7. `regulatory-markets-estate`
8. `venture-capital-corporate-control-estate`
9. `offshore-beneficial-ownership-estate`
10. `public-interest-crossing-estate`

## Estate fan-out

Each estate compiles to one durable research lane. All fourteen lanes may run concurrently; dependencies are enforced only inside a lane.

```text
denominator and controls
+ one parallel task per declared source route
→ independent identity resolution
→ temporal order and explicit nulls
→ candidate-only handoff
```

The source-route tasks acquire records in parallel. Identity resolution and temporal work wait for the denominator and source packets. The final handoff waits for every prior task and stops at `candidate_only`.

The fan-out methodology requires:

- a bounded universe with inclusion, exclusion, jurisdiction, time window, and snapshot fingerprint;
- source bytes, archives, or stable official record identifiers with query and retrieval provenance;
- accepted, ambiguous, and rejected identity joins rather than forced name matches;
- separate event, decision, filing, execution, award, obligation, outlay, performance, publication, and retrieval dates;
- unsuccessful, withdrawn, denied, nonparticipant, and no-match controls;
- a residual-fog ledger and explicit next acquisition;
- no automatic canonical claim, graph effect, conclusion, allegation, report approval, or publication approval.

Operational priority orders tasks inside a lane. It never ranks estates, subjects, people, institutions, importance, risk, or wrongdoing.

## Compatibility law

Historical source fields remain unchanged:

```text
data/intake/next-ten-estates/**.estate_id
data/intake/estate-expansion-01/next-ten.json estates[].estate_id
```

The macro registry translates those fields to `slice_id`. Future authoring should use “estate slice” for those objects and reserve “estate” for the durable corpus.

## Files

- `meta.json` — ontology, fog vocabulary, generation membership, and boundaries.
- `definitions/*.json` — one macro-estate definition per file.
- `case-map.jsonl`, `track-map.jsonl`, and `slice-map.jsonl` — explicit primary and related estate crosswalks.
- `fanout-methodology.json` — shared task kinds, required outputs, stopping rules, allowed results, and inference firewall.
- `build/estates/index.json` — deterministic compiled registry with counts and per-estate membership.
- `build/estate-fanout/` — generated, disposable issue packets and manifest.
- `tools/build-estates.mjs` and `tools/validate-estates.mjs` — registry compiler and validation.
- `tools/build-estate-fanout.mjs` and `tools/validate-estate-fanout.mjs` — parallel-lane compiler and validation.
- `test/estates.test.js` and `test/estate-fanout.test.js` — ontology and fan-out regression tests.
- `.github/workflows/estate-fanout.yml` — validation plus one open or refreshed issue per estate on `main`.

## Hard rules

1. Every public case has exactly one primary estate.
2. Every declared research track has exactly one primary estate.
3. Every historical estate slice has exactly one primary estate.
4. Related-estate membership is explicit and does not duplicate factual custody.
5. Every path asset must exist; logical assets must be visibly typed as logical references.
6. The registry and fan-out contain no score, rank, verdict, finding, claim status, graph effect, causal conclusion, or publication approval.
7. The four existing estates and ten next estates are generation labels, not importance rankings.
8. Every estate has one issue lane; every declared source route has one acquisition task.
9. Source routes run in parallel, but identity, temporal, and candidate-packet tasks obey their dependencies.
10. No estate becomes complete merely because one slice, denominator, source route, case, or report is complete.

## Build

```bash
node tools/build-estates.mjs
node tools/validate-estates.mjs
node tools/build-estate-fanout.mjs
node tools/validate-estate-fanout.mjs
node test/estates.test.js
node test/estate-fanout.test.js
```

The normal compile sequence rebuilds the estate index after cases, reports, the report frontier, and the two estate-slice packages, then emits the disposable fan-out packets.
