# Research fan-out

Research fan-out turns bounded research inputs into durable, machine-proposed work packets. It exists to keep discoveries, failures, source gaps, and estate acquisition plans from dying in an Actions log; it does not promote them into graph data or publication state.

The repository now has two compatible fan-out surfaces:

1. **General research fan-out** batches scout findings, crawl records, held observations, source gaps, bounded source seeds, field-autopsy trails, and formation controls by lane and part.
2. **Macro-estate fan-out** opens one durable lane for each estate and sequences denominator, source, identity, temporal/null, and candidate-packet work inside it.

## General research fan-out

```text
Surface Scout findings ------------\
official crawl candidates ----------\
official crawl rejections -----------\
official source gaps -----------------\
LinkedIn retrospective attention -----\
LinkedIn profile PDF captures ---------\
public-interest source seeds -----------\
field-autopsy bounded trails ------------> exhaustive manifest → bounded batches → durable GitHub research tasks
formation-signature controls -----------/
```

Every task carries `graph_effect: none` and `verification_status: machine_proposed_unverified`. Additive fields keep discovery certainty separate from promotion: `discovery_status`, `certainty_grade`, `source_availability`, and `evidence_state`. The validator fails if a source finding, rejection, or coverage gap is omitted, duplicated, self-promoted, or placed in an oversized batch.

A rejection is a held observation, not a negative factual result. A status such as `partial`, `error`, `skipped_missing_credential`, or `not_run` becomes a coverage-gap task. It must never be interpreted as evidence that no matching record exists. Privacy-guard rejections expose only their ledger identifier and classification; contact/address content is neither restored nor copied into the fan-out packet.

### Local operation

```bash
npm run compile
npm run fanout -- --batch-size 20
npm run validate:fanout
```

Generated manifests and batch packets live under `build/research-fanout/` and are disposable. Human or model triage that is worth preserving belongs under `contributions/inbox/research-batches/`. Neither location is a canonical ledger.

If the private, gitignored `data/local/linkedin-attention.jsonl` exists, every retrospective attention observation is also included in fan-out. See [`linkedin-retrospective-intake.md`](linkedin-retrospective-intake.md). The same fan-out reads `data/local/linkedin-profile-captures.jsonl` when present, creating one private, non-graphing review task per preserved profile snapshot.

Private LinkedIn activity/query prose remains only in the local intake ledger; fan-out packets refer to its stable observation ID without copying that prose.

Checked-in bounded source queries in `data/research/public-interest-discovery-seeds.jsonl` also enter fan-out. These cover the Epstein public corpus, Trump public/private/capital/office crossings, and Panama Papers/offshore service-provider topology. Every seed declares allowed predicates, forbidden inferences, and privacy handling. A seed is a durable research instruction, not a claim about any named person or entity; it remains an `investigative_hypothesis` with `graph_effect: none`.

`.github/workflows/research-fanout.yml` runs after a successful Surface Scout or Official-record intake workflow. It builds a dynamic matrix, runs batches in parallel, and opens or refreshes one GitHub issue per stable lane/part. Repeated scans update an existing open batch issue instead of creating a new issue for the same lane/part.

## Macro-estate fan-out

The macro-estate registry defines the durable corpus, its dominant fog, its decisive output, and its official or primary-public source routes. `data/estates/fanout-methodology.json` compiles those fields into one issue lane per estate:

```text
freeze estate denominator and controls
+ acquire every declared source route in parallel
→ resolve exact identities and reversible joins
→ normalize temporal order and explicit nulls
→ assemble candidate-only estate handoff
```

All fourteen estate lanes may run concurrently. Within a lane:

- source-route work does not wait for another source route;
- identity resolution waits for the denominator and all source packets;
- temporal/null normalization waits for the same inputs;
- the candidate packet waits for every prior task;
- the lane stops before canonical promotion.

Every estate task declares:

- required outputs;
- dependencies;
- a stopping rule;
- allowed bounded results;
- forbidden inferences;
- the estate boundary;
- `candidate_status: intake_only`;
- `promotes_to: candidate_only`;
- `graph_effect: none`;
- `conclusion_generated: false`.

The required evidence discipline is consistent across estates: freeze denominators and nulls; acquire bytes or stable official identifiers; resolve legal identity independently; separate event, decision, filing, execution, ceiling, obligation, outlay, performance, publication, and retrieval dates; preserve unsuccessful and no-match rows; and retain residual fog.

### Local operation

```bash
npm run compile
node tools/validate-estate-fanout.mjs
node test/estate-fanout.test.js
```

Generated packets live under `build/estate-fanout/` and are disposable. `.github/workflows/estate-fanout.yml` validates pull requests, then on `main` opens or refreshes one issue titled `[estate fan-out] <estate label>` for every compiled estate.

## Shared boundary

Closing a research issue is a triage decision, not a canonical promotion. A complete source route, denominator, batch, or estate slice does not complete an estate. Promotion still follows `docs/research-intake.md` and requires typed claims, receipts, exact identities, temporal discipline, counterweights, explicit nulls, and human review.
