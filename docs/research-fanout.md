# Research fan-out

Research fan-out turns every current Surface Scout finding, accepted
official-record candidate, held crawl observation, and official-source coverage
gap into a bounded, machine-proposed task. It exists to keep discoveries and
failures from dying in an Actions log; it does not promote them into graph data.

```text
Surface Scout findings ----\
                            -> exhaustive manifest -> bounded batches -> durable GitHub research tasks
official crawl candidates -/
official crawl rejections -/
official source gaps -------/
LinkedIn retrospective attention -/
LinkedIn profile PDF captures -----/
public-interest source seeds -------/
```

Every task carries `graph_effect: none` and
`verification_status: machine_proposed_unverified`. Additive fields keep
discovery certainty separate from promotion: `discovery_status`,
`certainty_grade`, `source_availability`, and `evidence_state`. The validator
fails if a source finding, rejection, or coverage gap is omitted, duplicated,
self-promoted, or placed in an oversized batch.

A rejection is a held observation, not a negative factual result. A status such
as `partial`, `error`, `skipped_missing_credential`, or `not_run` becomes a
coverage-gap task. It must never be interpreted as evidence that no matching
record exists. Privacy-guard rejections expose only their ledger identifier and
classification; contact/address content is neither restored nor copied into the
fan-out packet.

## Local operation

```bash
npm run compile
npm run fanout -- --batch-size 20
npm run validate:fanout
```

Generated manifests and batch packets live under `build/research-fanout/` and
are disposable. Human or model triage that is worth preserving belongs under
`contributions/inbox/research-batches/`. Neither location is a canonical ledger.

If the private, gitignored `data/local/linkedin-attention.jsonl` exists, every
retrospective attention observation is also included in fan-out. See
[`linkedin-retrospective-intake.md`](linkedin-retrospective-intake.md).
The same fan-out reads `data/local/linkedin-profile-captures.jsonl` when
present, creating one private, non-graphing review task per preserved profile
snapshot.
Private LinkedIn activity/query prose remains only in the local intake ledger;
fan-out packets refer to its stable observation ID without copying that prose.

Checked-in bounded source queries in
`data/research/public-interest-discovery-seeds.jsonl` also enter fan-out. These
currently cover the Epstein public corpus, Trump public/private/capital/office
crossings, and Panama Papers/offshore service-provider topology. Every seed
declares allowed predicates, forbidden inferences, and privacy handling. A seed
is a durable research instruction, not a claim about any named person or
entity; it remains an `investigative_hypothesis` with `graph_effect: none`.

## Scheduled operation

`.github/workflows/research-fanout.yml` runs after a successful Surface Scout or
Official-record intake workflow. It builds a dynamic matrix, runs batches in
parallel, and opens or refreshes one GitHub issue per stable lane/part. Repeated
scans update an existing open batch issue instead of creating a new issue for
the same lane/part.

Closing a research issue is a triage decision, not a canonical promotion.
Promotion still follows `docs/research-intake.md` and requires human review.

