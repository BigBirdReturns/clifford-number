# Master v3 import gate

This document defines how to handle `clifford-number-master-v3.md` without turning the public graph into a raw research dump.

The master document is a pre-import reference. It can contain typed, sourced, evidence-classed rows, but that does not make every row public-graph ready. The repo rule is stricter: every edge must remain public-role-only, sourced, validated, and safe to click through.

## Import rule

Do not commit the raw v3 master document to the public repo as canonical graph data.

Use the importer to generate a local queue first:

```bash
npm run import:master:v3 -- path/to/clifford-number-master-v3.md data/import-queues/master-v3.import-queue.json
npm run check
```

The generated queue is a staging artifact. It does not mutate `graph.json` or any file in `cases/`. It separates ready rows from review rows, verification rows, held rows, and rejected private-field rows.

## Evidence mapping

| Master value | Repo value | Meaning |
|---|---|---|
| `official` | `confirmed` | Official source or primary authority supports the row directly. |
| `primary_public` | `primary_public` | Public source material supports the row directly. |
| `reported` | `reported` | Credible reporting supports the row, but the repo has not independently reverified the primary record. |
| `derived` | `derived` | Sourced ingredients support an analytic connection, not a standalone factual claim. |
| `judgment` | `judgment` | Interpretive classification for navigation only. |
| `open` | `open` | Not publication ready. |

## Status preservation

`listed`, `registered`, and `attended` must never collapse into each other.

A Dialog public directory row becomes `listed`. A 222-person registration row becomes `registered`. A delegation row becomes `attended` only when the source says attendance. If the source only supports co-presence, the UI copy must say co-presence, not coordination.

## Import batches

### Batch 1: already compatible

Use this for official and primary public rows that only state public professional roles, policy publication, appointments, organization roles, and source-backed directory listings.

Expected examples include the anchor node, the AI Opportunities Action Plan, DSIT, ARIA, Entrepreneur First, Detachment 201 core rows, and public-role founder nodes.

### Batch 2: review before graph

Use this for `reported` rows where the source exists but the primary record has not been rechecked inside the repo.

Expected examples include corporate context rows, reported step-down rows, and directory or registration rows that depend on tier-one reporting rather than an official source.

### Batch 3: verify before public

Use this for procurement, nonprofit, VC, capital, 990, Form D, USAspending, EDGAR, LDA, Companies House, Find a Tender, and FARA rows.

These rows may be true and useful, but they should not move to UI weight 1 until the underlying public record is stored as a receipt or reproduced as a structured source object.

### Batch 4: hold

Use this for open claims, low-confidence cluster nodes, hypothesis-generating rows, and rows that have no clean evidence-class mapping.

Held rows can remain useful for research direction. They should not appear in the public pathfinder by default.

### Batch 5: reject

Reject rows that contain private contact material, raw registrant fields, intimate data, questionnaire answers, or any field caught by the private-field guard.

The importer records rejected rows separately so the operator can see what was blocked without copying the sensitive field into the public graph.

## Current blockers from the execution pass

The no-auth ProPublica lookup resolved six nonprofit EINs, but Schedule I grant recipients still require the full IRS 990 XML files rather than the ProPublica summary API.

The USAspending API was unavailable during the execution pass, so procurement rows should use a bulk CSV fallback or be retried before promotion.

SEC Form D work requires CIK discovery for fund vehicles rather than public-company ticker lookup. Senate LDA requires an API key. Companies House also requires an API key.

## Control question

Can this row become a receipt-backed public graph edge without changing what the source actually proves?

If the answer is no, keep the row in the queue and do not promote it into `graph.json` or a case file.
