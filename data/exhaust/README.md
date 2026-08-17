# First-party industrial-exhaust intake

This lane captures organization-controlled RSS and Atom publications as immutable, attributed evidence of what the publisher publicly released. It is separate from the official-record crawler because corporate publications are first-party statements, not official or independent proof of the underlying claims.

Every feed entry is captured. Watch terms affect only the derived alert queue, so unfamiliar products, partners, people, geographies, datasets, metrics, governance changes, and capital events remain available for later re-indexing. A missing item in a later rolling feed does not prove withdrawal, deletion, supersession, or discontinuation.

The intake freezes the complete XML feed snapshot, hashes each raw item and normalized observation, preserves revisions under one stable source-record key, and strips contact details from the normalized projection. It does not crawl personal profiles, infer motive from profile attention, contact any person, or create an interest, monitoring, coordination, customer, supplier, partner, or control edge.

All observations and alerts retain:

```text
source_class                    first_party_corporate_publication
evidence_class                  first_party_attributed_statement
graph_effect                    none
promotion_authority             false
canonical_mutation_authorized   false
```

Promotion requires a separate human-reviewed change that identifies the exact publisher, legal entity, statement, date, reciprocal or independent receipts where required, allowed predicate, forbidden inference, and temporal scope.

Commands:

```bash
node tools/crawl-industrial-exhaust.mjs --audit
node tools/crawl-industrial-exhaust.mjs --dry-run --strict
node tools/crawl-industrial-exhaust.mjs
node test/industrial-exhaust.test.js
```
