# Official-record crawler

The crawler applies the Undercast harvest/triage/publish separation to higher-risk public-interest records.

```text
official API or bulk source
  -> privacy-minimized immutable observation
  -> deduplicated candidate
  -> model/human draft
  -> deterministic review gate
  -> human-reviewed canonical change
  -> compiled case, delta, and beacon
```

An observation or candidate has `graph_effect: none`. The scheduled workflow cannot edit `data/ledger/`, `data/canonical/`, `cases/`, scores, or the public application. `build:pages` explicitly excludes crawl intake and its snapshots from the deployed artifact.

## Source adapters

Adapters share one contract: fetch a bounded configured term/window, retain the upstream official identifier and full-record hash, emit only a whitelisted public-record projection, and checkpoint the run.

- `sam_opportunities`: SAM.gov opportunities and award notices; enabled by the free `SAM_API_KEY` GitHub Actions secret.
- `usaspending_awards`: federal awards and obligations; no credential.
- `sec_form_d`: SEC EDGAR capital filings; no credential, honest contact User-Agent required.
- `federal_register`: notices, rules, meetings, and appointments; no credential.
- `govuk_search`: UK publications and announcements; no credential.

The adapter registry is `data/crawl/sources.json`. Missing credentials skip only that adapter. Do not commit credentials, request URLs containing credentials, raw points of contact, street addresses, or personal contact data.

## Identity and revision rules

- A candidate ID is derived from `(source_id, official_record_id)`.
- An observation ID additionally includes the upstream record content hash.
- A changed official record therefore appends a new immutable observation to the same candidate.
- Names are entity hints, not identity decisions. Hard identifiers such as PIID, notice ID, accession number, CIK, UEI, CAGE, OCID, and content ID drive joins.
- An amount always carries its stage. A SAM notice amount is a `ceiling`; a USAspending award result is `obligated`. Neither becomes `paid` or `outlaid` without the corresponding record.

## Promotion firewall

A coding-session model may transform a bounded candidate batch into proposed claims, events, entities, and relations. Promotion remains a separate reviewed PR. The reviewer must resolve identity, attach claim-level receipts, preserve temporal precision, choose `causal_status`, and reject broad-institution hops.

The crawler never concludes that a decision caused an outcome. It can preserve both observations and propose a relation for review; only source-explicit evidence can upgrade causality.

## Operations

```bash
npm run crawl:audit
npm run crawl:official -- --source federal-register --term Palantir --max-records 10
SAM_API_KEY=... npm run crawl:official -- --source sam-opportunities --term Palantir
npm run validate:crawl
```

The scheduled `.github/workflows/crawl-official.yml` commits only `data/crawl/` and `receipts/crawl/`. It uses overlapping windows so revisions are caught, backs off between requests, caps each run, and journals normalization failures instead of silently dropping them.
