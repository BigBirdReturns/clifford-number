# Research gap audit and source-pull plan

Generated: 2026-06-29

This note reconciles the current graph posture with the priority data gaps. It is an operator checklist, not a publication claim. Tooling in `tools/research/` emits review artifacts only; promote rows through the import gate after source review.

## Critical corrections and deadlines

### Corrected nonprofit EINs

The Schedule I workflow must use the corrected EINs below. The earlier v3 working notes had five incorrect EINs; using those values will produce empty or misleading extraction results.

| Organization | Incorrect v3 EIN | Correct EIN used by tooling |
|---|---:|---:|
| Charles Koch Foundation | `48-0916813` | `48-0918408` |
| Berggruen Institute | `46-3806254` | `46-5602320` |
| New America Foundation | `52-1768579` | `52-2096845` |
| Mercatus Center | `52-1137647` | `54-1436224` |
| Federalist Society | `52-1153928` | `36-3235550` |
| ADL | `13-1818723` | `13-1818723` |

### Senate LDA migration deadline

The LDA pull must target the post-migration API at `https://lda.senate.gov/api/v1/`, not the legacy `disclosure.senate.gov` surfaces. As of 2026-06-29, the relevant migration deadline is 2026-06-30, so this is the most time-sensitive pull.

Run:

```bash
LDA_API_KEY=... npm run research:lda
```

### SEC Form D CIK-resolution bottleneck

The Form D blocker is CIK resolution for private fund/adviser names, not public-company ticker lookup. The SEC script therefore starts with `https://www.sec.gov/cgi-bin/browse-edgar` Atom searches such as `company=8VC&type=D`, extracts candidate CIKs from the feed, and then calls `https://data.sec.gov/submissions/CIK{cik}.json` for recent Form D and D/A amendment rows.

Run:

```bash
SEC_USER_AGENT="name email" npm run research:sec:formd
```

D/A amendments are retained alongside original D filings in review artifacts. Do not treat retention as supersession modeling: an analyst must decide which amendment controls before importing offering amounts, dates, or related-person claims into the graph.

### USAspending API fallback

The priority procurement edges remain blocked until award IDs, amounts, agencies, and dates are confirmed. If ordinary USAspending API calls return HTTP 500s, use the bulk-download endpoint via:

```bash
npm run research:usaspending
```

### IRS XML bulk requirement

ProPublica summary pages are useful for officers and high-level filing metadata, but Schedule I recipient rows require IRS TEOS XML bulk data or equivalent filing XML. The extractor reads target EINs from `graph.json` `identifiers.ein` values by default, so seed-data corrections and extraction inputs cannot drift silently. The CSV output includes `graph_node_id`, `node_label`, and `normalized_ein` columns so import review can create graph edges without fuzzy matching on labels.

Run:

```bash
npm run research:irs:download -- 2023 2024
npm run research:irs:schedule-i -- '*_TEOS_XML_*.zip' --output schedule_i_grants.csv
```

## Graph audit snapshot

| Area | Current posture | Gap to close |
|---|---|---|
| Policy spine | Strong: official/confirmed public-policy chain around the AI Opportunities Action Plan and delivery machinery. | Keep watching GOV.UK and implementation updates. |
| Dialog directory | Strong as a directory/listing layer only. | Preserve redaction discipline: listed-in-directory does not prove attendance or relationship. |
| Detachment 201 | Publication-ready where backed by official Army/company role sources. | Keep claims narrow to public role and appointment facts. |
| Procurement surfaces | Weak-to-medium where based on reported procurement surfaces. | Promote only after USAspending/SAM award IDs, amounts, agencies, and dates are captured. |
| Nonprofit officers | Medium where backed by public filing summaries. | Add Schedule I grant recipient rows from IRS XML before making grant-flow claims. |
| LDA lobbying | Not yet in graph. | Pull row-level filings for Palantir, SpaceX, Meta, Google, and Walmart from the new LDA API. |
| SEC Form D | Not yet in graph. | Resolve CIKs through browse-edgar Atom, then pull issuer/fund D and D/A rows from data.sec.gov. |
| Companies House / UK procurement | Not yet in graph. | Pull primary registry and procurement notices before importing entity/officer or contract claims. |

## Publication readiness sequencing

| Story | Status | Reason |
|---|---|---|
| Detachment 201 opener | Publish now | Official source posture is strong enough for a narrow public-role story. |
| Bio-gap follow-up | Publish now | Primary-source juxtaposition is sufficient if claims stay factual and scoped. |
| Procurement explainer | Blocked | Needs USAspending/SAM award IDs, amounts, agencies, and dates before publication. |
| 990/Form D design piece | Blocked | Needs Schedule I extraction and Form D CIK/submission pulls. |
| Cluster I | Internal only | Keep as internal analysis until primary row-level support is available. |

## MCP server note

The MCP server remains useful for graph queries (`npm run mcp`) once configured in an MCP-capable client. It does not replace source acquisition: LDA, SEC, IRS, USAspending, Companies House, and procurement pulls still need to happen as reviewable source artifacts before graph promotion.


## Remaining manual steps

| Step | Owner action | Why it remains manual |
|---|---|---|
| LDA API key registration | Register at `https://lda.senate.gov/api/register/`, then run with `LDA_API_KEY=...`. | The Senate API requires a human-held token and terms acceptance. |
| Companies House API key | Register at `https://developer.company-information.service.gov.uk/` before Clifford/EF/ARIA entity pulls. | Primary UK company/officer registry access requires an API key. |
| Sweep review | Review `docs/update-sweep.md` after every source import and decide promote/hold/reject. | Evidence-class promotion is editorial and should not be automatic. |
| Form D LP interpretation | Treat Sanabil/PIF/Fund/Founder paths as structural until row-level issuer and related-person records are reviewed. | Sovereign-LP conclusions require analyst judgment before UI weight upgrades. |


## Import review loop

The static app includes a Schedule I import-review panel. Paste extractor CSV rows with `graph_node_id`, `node_label`, `normalized_ein`, `recipient_name`, `amount`, `purpose`, `source_zip`, and `source_xml`; the panel validates `graph_node_id` and `normalized_ein` against the loaded graph, then renders proposed `node tools/add-edge.mjs` commands without mutating `graph.json`. The add-edge helper can create a missing `--to` recipient node when `--to-label` and `--to-type` are supplied, so reviewed grant rows can become exact `granted-to` edge commands instead of fuzzy label matches.
