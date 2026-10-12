# Allocator-war bounded source snapshots Wave 32 method

Wave 32 converts the nineteen Wave 31 official locators into reproducible acquisition objects. Each source receives exactly one snapshot specification. Fifteen specifications issue bounded public HTTP requests and four terminate as explicit credential boundaries. The acquisition runner does not read repository secrets, operator credentials, cookies, or authorization headers.

## Request custody

Every public request records the exact method, URL, non-secret request headers, canonical request body, request-body hash, and whole-request fingerprint. The runner applies a thirty-second timeout, three-attempt ceiling, bounded retry set, and six-megabyte response ceiling. A response that exceeds the ceiling is refused as an explicit terminal state. A retryable HTTP response is retried only within the declared ceiling. Release validation reads the frozen objects and never repeats the network request.

The seven required JSON controls are the three OPM file inventories, one Federal Register query, the USAspending award count, the USAspending award-type vocabulary, and the Grants.gov search. These controls must terminate as successful parsed JSON responses before Wave 32 may seal. The remaining public HTML requests may preserve successful pages, non-success responses, parsing limits, oversize refusals, or bounded network failures. Each state remains visible rather than being converted to a null row.

## Credential boundaries

SAM contract data, SAM assistance data, PACER, and the Federal Audit Clearinghouse API require an API key, account, billing authority, or other credential not held by the repository runner. Wave 32 records the exact requirement and refusal reason. It does not call a credentialed endpoint without authority, commit a secret, substitute a public landing page for the protected response, or interpret the boundary as no records.

## Amortized execution

The nineteen acquisition objects are reused across the same seven route classes and thirty-eight task results carried from Wave 31. Source use remains 153, but network dispatch remains fifteen bounded requests rather than thirty-eight per-task searches. A source change therefore replays the affected source and the routes that consume it.

## Authority boundary

A frozen response proves what the exact bounded request returned at the recorded time. It does not prove that the source system is complete, that an absent row does not exist, that an HTTP success is a substantive finding, that a published page is a complete action register, that a count response is the contested row denominator, or that a credential boundary means no records. Wave 32 creates no evidence adjudication, estate adoption, finding, identity, relationship, participation, active claim, graph edge, or publication clearance.
