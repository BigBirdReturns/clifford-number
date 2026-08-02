# SSC RD-04 A06 — Full FY 2025–26 CalFresh Decision Registry corpus

Issue: #721
Parent A05 merge: `80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589`
Execution: `SSC-RD04-SNAP-A06`

## Frozen registry denominator

The public CDSS Decision Registry is queried for CalFresh across the submitted interval `07/01/2025` through `06/30/2026`. The exact browser-compatible serialization includes empty `shnNumber` and `issueCodes` text fields and omits empty select fields. The source caps each response at one hundred rows, so the interval is exhausted by deterministic date-only bisection until no one-day slice remains capped.

The corrected proof establishes two distinct identities:

```text
registry row: registryId
current decision PDF: decisionId
archived decision PDF: registryId
```

The full mechanical result contains 12,282 registry rows and 11,672 unique current decision documents. Five hundred thirty current documents are shared by multiple registry rows, accounting for 610 excess row-to-document links; the maximum observed multiplicity is seven. No registry row is discarded merely because it shares a document.

## Content-neutral sharding

Each unique document identity is hashed with SHA-256 and assigned to one of sixty-four shards by unsigned integer modulo 64. Shard assignment is frozen before any PDF is read and is independent of disposition, agency, language, issue code, claimant, narrative, or expected outcome.

Four shards may execute concurrently in bounded batches. Each document receives at most two explicit fetch attempts. Every attempt preserves URL, timestamps, HTTP status, final URL, content type, response headers, exact bytes, byte count, and SHA-256. Exact PDFs are text-extracted when possible, but text extraction is not required for exact-byte custody.

## Durable custody without publication

The exact registry proof, prepared denominator, sixty-four PDF archives, and their checksum files are stored as assets on the draft GitHub release:

```text
ssc-rd04-a06-fy2025-26-corpus-v1
```

The release must remain draft. Draft release custody is not a public finding, publication clearance, graph effect, adoption effect, or claim that the registry is the complete administrative universe.

Because GitHub's release-by-tag REST route does not expose an unpublished draft, final asset reconciliation enumerates the authenticated release collection, selects exactly one matching draft tag, verifies that `published_at` remains null, and only then admits the complete asset ledger. A tag-route 404 is a transport-semantic failure, not evidence that the draft or its assets are absent.

The permanent Git tree retains the full 12,282-row denominator, all 11,672 row-to-document assignments, every terminal shard manifest, release asset identities and hashes, missing-source states, deterministic validation, adversarial controls, and a noindex report. The PDF bytes remain in the draft release assets to avoid converting a large exact-source corpus into ordinary Git history.

## Decision and compliance separation

Registry disposition and decision text are administrative-source observations. They do not establish factual correctness, precedent, county compliance, benefit issuance, restoration amount, restoration date, remedy timeliness, durable material recovery, or effective counterpower.

No separate implementation receipt is inferred from a grant, partial grant, stipulation, remand, reversal, or order to restore. Absence of a separately recovered public compliance receipt is not evidence of noncompliance.

## Authority ceiling

```text
complete mechanical registry denominator: yes
complete FY administrative universe:       no
case-level implementation joins:            0
separate public compliance receipts:        0
complete restorations observed:             0
remedy timeliness observed:                 0
residual classes closed:                    0
reviewed dispositions changed:              0
prevalence findings:                        0
racial-order findings:                      0
coordination findings:                      0
common-purpose findings:                    0
external contacts:                          0
external reviews:                           0
graph effect:                            none
publication effect:                      none
adoption effect:                         none
```

A06 is internal, reversible, and nonblocking. A07 may search separately for public county or state compliance, issuance, restoration amount, and restoration timing receipts tied to the predeclared A06 denominator. No claimant contact, agency contact, outside reviewer, or user recruitment is required.
