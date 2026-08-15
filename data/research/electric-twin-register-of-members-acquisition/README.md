# Electric Twin September 2025 register-of-members acquisition

**Acquisition ID:** `ET-ROM-2025-09-01`  
**Issue:** `#2138`  
**State:** prepared, not sent  
**Canonical graph effect:** none

This packet prepares a narrow statutory and first-party acquisition concerning Electric Twin Ltd, company number `15173006`. Its target is the historical register state surrounding the Seed 2 financing between 12 and 30 September 2025. It does not attribute any SH01 allotment to Atomico, LocalGlobe, Mercuri, or another holder.

The public evidence presently separates three objects. The SH01 filings establish issuer-level allotment dates, classes, and quantities. The CS01 establishes registered names, classes, and exact holdings as at 27 September 2025. The written resolutions establish allotment authority, pre-emption disapplication, and the eligible-member cohort on 12 September 2025. Matching quantities across those instruments are an acquisition lead, not a transactional join.

The packet contains:

- `request.json`, which defines the acquisition target, legal route, authority state, response states, and non-inference boundaries.
- `custody-manifest.json`, which binds the request to the canonical source receipts and specifies the dispatch and response artifacts that must be hashed.
- `response-ledger.jsonl`, which begins with the prepared-but-unsent state and must receive one append-only row for every later custody event.
- `adjudication-rules.json`, which defines the minimum transaction-specific evidence required before any allottee field can change.
- `docs/requests/electric-twin-section-116-register-of-members-request.md`, which contains separate statutory and voluntary request templates.

The statutory request must not be sent until the requester’s real full name, postal address, email address, date, and intended disclosure recipients have been inserted. A public contact route does not confer authority to send. Any dispatch requires a custody-bearing postal method to the registered office and may be copied by email only for routing. The voluntary request for a redacted allotment or closing instrument remains separate from the statutory register request.

A response that supplies only a registered name, date entered as a member, class, or resulting quantity may strengthen the dated holder history. It does not prove that the holding arose from a specific allotment rather than a transfer, nominee arrangement, aggregation, rectification, or another register movement. Allottee identity may be promoted only when one source-addressable instrument expressly links the issuer, named person or vehicle, share class, quantity, and allotment event, or supplies an equivalent transaction-specific entry.

Evidence tier: official, first-party, and repository-native. The venues are Companies House, Electric Twin’s statutory register, and any voluntarily supplied transaction instrument. The immediate target is a source-addressable historical member entry followed, where available, by a transaction-specific allotment record. The upside is a lawful separation of issuer action, registered title, and original subscription. The downside is that the register may record only resulting legal title. The principal failure mode is converting numerical or temporal correspondence into allotment identity without an explicit mechanism.

The governing control question is whether an obtained entry or instrument names a holder as allottee for a specific September 2025 issue, or whether the repository must retain the exact confirmation-date holder state while leaving the allottee endpoint unresolved.
