# Human-permission gate audit

Scanned fingerprint: `8760a28cdf737bd64340aaf10dc6be5237eab4f08aff247a53603aba65be7663`

## Governing finding

Review language remains widespread in the historical corpus, but it may not function as permission to judge or execute. Every active K0, selection, report, and lake domain is mapped to an evidence-grounded decision whose `required_to_decide` value is false.

```text
review-language matches: 3145
legacy matches mapped to decisions: 21
ambiguous review-language matches: 2476
active permission gates: 0
decisions requiring human permission: 0
```

## Classification

| Classification | Matches |
|---|---:|
| ambiguous_review_language | 2476 |
| external_empirical_state | 333 |
| review_or_clearance_metadata | 159 |
| historical_or_descriptive | 99 |
| governing_no_veto_definition | 57 |
| legacy_gate_mapped_to_operational_decision | 21 |

## Active permission gates

| Location | Domain | Excerpt |
|---|---|---|
| None | — | No active permission gate detected. |

## Ambiguous review language

| Location | Domain | Excerpt |
|---|---|---|
| app.js:670 | unmapped | <div class="panel"><div class="metric">${rejected}</div><div class="metric-label">${verifiedRefusals} verified · ${reviewRefusals} review-required refusals</div></div>`; |
| app.js:1278 | unmapped | metricPanel('Review required', item.claim_status_counts.review_required) |
| app.js:1869 | unmapped | : 'The ledger windows do not overlap, but their decisive receipts are judgment-class and unrecoverable. This remains review-required and is not a verified negative finding.'; |
| app.js:1870 | unmapped | return `<div class="receipts"><div class="badge-row"><span class="badge">${verified ? 'Verified refusal' : 'Review required'}</span>${evidenceBadge(p.evidence_class \|\| 'judgment')}</div><p>These two both appear on <strong>${esc(surface(p.surface_id)?.surface_label \|\| p.surface_id)}</strong> (${esc(labelActor(p.actor_a))}: ${esc(p.actor_a_window?.valid_from ?? '?')} → ${esc(p.actor_a_window?.valid_until ?? 'ongoing')}; ${esc(labelActor(p.actor_b))}: ${esc(p.actor_b_window?.valid_from ?? '?')} → $ |
| briefs/anduril-access-ownership.html:19 | report | <div class="panel question"><div class="label">Working proposition · Review required</div><p><strong>The working reporting proposition is that Anduril has expanded ownership of an integrated defense stack while developing access to the institutions that decide eligibility, acceptance, baselines, transition authority, and ordering vehicles.</strong></p><p class="note">This is the question the case organizes. It is not a finding that access caused an award.</p></div> |
| briefs/arcadia-field-autopsy.html:19 | report | <div class="panel question"><div class="label">Working proposition · Review required</div><p><strong>The conversation expressed a place-centered formation reading of Arcadia — public infrastructure, entitlement expansion, intermediary governance, patient ownership, parcel assembly, institutional development, and concentrated uplift — before formal research began.</strong></p><p class="note"><small class="qualification-source">Case-wide boundary</small><br>The conversation intake establishes only |
| briefs/arcadia-field-autopsy.html:26 | report | <div class="table-wrap"><table class="sequence"><thead><tr><th scope="col">Date / period</th><th scope="col">Public infrastructure and capital</th><th scope="col">Planning and entitlement</th><th scope="col">Assessment and intermediary governance</th><th scope="col">Ownership and parcel assembly</th><th scope="col">Project approval and delivery</th></tr></thead><tbody><tr data-event-id="evt-rda-established"><td class="date">1968</td><td class="empty"></td><td><article class="event-card event-car |
| briefs/arcadia-field-autopsy.html:28 | report | <div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Decision thread</th><th scope="col">Public instrument</th><th scope="col">Ownership and land</th><th scope="col">Governance or intermediary</th><th scope="col">Project or delivery outcome</th><th scope="col">Record that closes the gap</th></tr></thead><tbody><tr id="thread-station-public-investment" data-thread-id="station-public-investment"><th class="thread-head" scope="row"><span class="number">01</span><h3>Station and p |
| build/briefings/anduril-access-ownership.json:14 | report | "status": "review_required", |
| build/briefings/anduril-access-ownership.json:22 | report | "status": "review_required", |
| build/briefings/anduril-access-ownership.json:28 | report | "status": "review_required", |
| build/briefings/anduril-access-ownership.json:48 | report | "review_required_claims": 9, |
| build/briefings/anduril-access-ownership.json:98 | report | "review_required_claim_ids": [ |
| build/briefings/anduril-access-ownership.json:245 | report | "status": "review_required" |
| build/briefings/anduril-access-ownership.json:254 | report | "status": "review_required" |
| build/briefings/anduril-access-ownership.json:273 | report | "status": "review_required" |
| build/briefings/anduril-access-ownership.json:310 | report | "status": "review_required" |
| build/briefings/anduril-access-ownership.json:414 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:476 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:596 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:656 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:678 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:716 | report | "state": "review_required", |
| build/briefings/anduril-access-ownership.json:730 | report | "state": "review_required", |
| build/briefings/arcadia-field-autopsy.json:14 | report | "status": "review_required", |
| build/briefings/arcadia-field-autopsy.json:22 | report | "status": "review_required", |
| build/briefings/arcadia-field-autopsy.json:42 | report | "review_required_claims": 21, |
| build/briefings/arcadia-field-autopsy.json:122 | report | "review_required_claim_ids": [ |
| build/briefings/arcadia-field-autopsy.json:504 | report | "status": "review_required" |
| build/briefings/arcadia-field-autopsy.json:532 | report | "status": "review_required" |
| build/briefings/arcadia-field-autopsy.json:541 | report | "status": "review_required" |
| build/briefings/arcadia-field-autopsy.json:578 | report | "status": "review_required" |
| build/briefings/arcadia-field-autopsy.json:715 | report | "state": "review_required", |
| build/briefings/arcadia-field-autopsy.json:790 | report | "state": "review_required", |
| build/briefings/arcadia-field-autopsy.json:1044 | report | "status": "review_required", |
| build/briefings/arcadia-field-autopsy.json:1066 | report | "status": "review_required", |
| build/briefings/index.json:9 | report | "review_required_claims": 30, |
| build/briefings/index.json:34 | report | "review_required_claims": 9, |
| build/briefings/index.json:61 | report | "review_required_claims": 21, |
| build/cases/anduril-access-ownership.json:9 | report | "status": "review_required", |
| build/cases/anduril-access-ownership.json:53 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:98 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:349 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:395 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:445 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:822 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1095 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1168 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1238 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1272 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1444 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1479 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1518 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:1814 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2018 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2071 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2130 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2175 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2402 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2448 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2498 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:2862 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:3122 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:3186 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:3787 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:3833 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:3883 | report | "claim_status": "review_required", |
| build/cases/anduril-access-ownership.json:4247 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:9 | report | "status": "review_required", |
| build/cases/arcadia-field-autopsy.json:59 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:117 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:260 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:727 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:925 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:973 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:1162 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:1659 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:1821 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:1866 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2031 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2076 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2135 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2167 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2361 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2509 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:2703 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3069 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3141 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3214 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3298 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3328 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3358 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3411 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3457 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3587 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3863 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:3895 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:4169 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:4229 | report | "claim_status": "review_required", |
| build/cases/arcadia-field-autopsy.json:4676 | report | "claim_status": "review_required", |

## Compatibility law

- `supported_for_human_review` is a deprecated input label, not an output decision.
- `pending_second_party` is a challenge and confidence state, not permission.
- `independent_reviewer_missing` may withhold the word *cleared*, not bounded judgment or reversible execution.
- `review_required` permits a provisional or internal judgment with receipts and uncertainty attached.
- missing external reproduction controls an empirical adoption level, not the project’s ability to analyze or act.

## Boundary

The audit does not erase review, claim infallibility, or convert a textual match into misconduct. It prevents review metadata from silently becoming a veto.
