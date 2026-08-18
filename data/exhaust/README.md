# First-party industrial-exhaust intake

This lane captures organization-controlled RSS, Atom, publication indexes, and linked public artifacts as immutable, attributed evidence of what the publisher publicly released. It is separate from the official-record crawler because corporate publications are first-party statements, not official or independent proof of the underlying claims.

Every configured feed entry is captured. Watch terms affect only the derived alert queues, so unfamiliar products, partners, people, geographies, datasets, metrics, governance changes, and capital events remain available for later re-indexing. A missing item in a later rolling feed or index does not prove withdrawal, deletion, supersession, or discontinuation.

The base intake freezes complete XML feed snapshots, hashes each raw item and normalized observation, preserves revisions under one stable source-record key, and strips contact details from the normalized projection. The artifact layer adds two bounded operations. It captures the global `dentsu.com` news-release listing from the publisher's public sitemap surface, then hydrates only feed alerts and watch-matched index discoveries by freezing the linked HTML or PDF artifact beneath a content-addressed receipt. Watch matching is rerun against the normalized article body so names or mechanisms omitted from feed summaries remain reviewable.

Raw public artifacts are preserved byte-for-byte inside receipts. Email addresses and telephone numbers are removed from normalized article projections. URL, GUID, date, hash, and publication identity fields are never passed through contact redaction.

The lane does not crawl personal profiles, infer motive from profile attention, contact any person, or create an interest, monitoring, coordination, customer, supplier, partner, employment, control, or ownership edge. An article-body mention cannot create an actor or relationship automatically. Redirects are followed manually only across the explicit host allowlist, response bodies are streamed beneath the byte ceiling, URL-identical receipts remain separately bound even when two pages publish the same bytes, current watch terms are reapplied to unchanged artifacts, and unseen candidates are selected before previously hydrated pages so a fixed run limit cannot starve the tail of the queue.

All observations, discoveries, artifacts, and alerts retain:

```text
source_class                    first_party_corporate_publication
evidence_class                  first_party_attributed_statement
graph_effect                    none
promotion_authority             false
canonical_mutation_authorized   false
```

Promotion requires a separate human-reviewed change that identifies the exact publisher or unresolved brand surface, legal entity where known, statement, date, reciprocal or independent receipts where required, allowed predicate, forbidden inference, and temporal scope.

Commands:

```bash
node tools/crawl-industrial-exhaust.mjs --audit
node tools/crawl-industrial-exhaust.mjs --dry-run --strict
node tools/crawl-industrial-exhaust.mjs

node tools/hydrate-industrial-exhaust.mjs --audit
node tools/hydrate-industrial-exhaust.mjs --dry-run --strict --limit=20
node tools/hydrate-industrial-exhaust.mjs --strict --limit=50

node test/industrial-exhaust.test.js
node test/industrial-exhaust-artifacts.test.js
```

Generated artifact-layer files are `discovery-observations.jsonl`, `artifacts.jsonl`, `artifact-alerts.jsonl`, and `artifact-state.json`. Their own intake commit is excluded from the workflow's push trigger, preventing recursive crawl loops.
