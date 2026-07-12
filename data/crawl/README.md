# Official-record crawl intake

This directory is a research queue, not graph data. Nothing here creates a public edge, event, entity, score, case finding, or causal claim.

The crawler freezes a privacy-minimized projection of official records, records the hash of the full upstream record, deduplicates revisions by official identifier, and proposes neutral candidates for review. Promotion requires a separate human-reviewed change to canonical ledgers.

Commands:

```bash
npm run crawl:official -- --audit
npm run crawl:official
npm run validate:crawl
```

`SAM_API_KEY` enables SAM.gov Contract Opportunities. Sources without required credentials are reported as skipped while open adapters continue.

The crawler never stores contact details, street addresses, private individuals, raw SAM points of contact, or unbounded web-search results. Its only expansion keys are configured frontier terms and hard identifiers discovered in official records.
