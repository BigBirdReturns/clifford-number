# SSC RD-04 A04 · SNAP route adjudication and score custody

Issue: #690  
Parent replay: #687 / PR #689  
Parent exact head: `a516a05ee137233e93542a5e9886f0acada4f33b`

## Purpose

A04 converts A03 retrieval custody into page-level evidence decisions. It terminally adjudicates all 59 unique official-domain routes returned by the frozen replay, rechecks all 53 A02 baseline sources without downgrading them for replay non-return or present fetch failure, and reconciles all 400 state-dimension score cells.

The acquisition measures public-source availability. It does not rank policy quality, generosity, legality, discrimination, remedy effectiveness, or national representativeness.

## Fixed adjudication law

An A03 candidate can affect a score only when the final response remains official after redirects, the page is parseable, the page matches the query state, SNAP relevance is explicit, a D1–D8 term survives in the same source-addressable text block, and the candidate appeared in a query slot authorized for that dimension.

Automated adjudication may add at most provisional level-one support to a previously zero cell. It cannot create level two, remove an A02 baseline source, or infer record absence from a failed fetch.

Permitted route dispositions:

```text
official_relevant_support
official_route_only_generic
official_wrong_state
official_wrong_program
official_page_unavailable_after_bounded_retry
official_binary_or_unparsed_content
official_snap_page_no_dimension_support
duplicate_or_redirect_alias
not_official_after_page_review
```

## Required denominator

```text
A03 candidate routes:          59
A02 baseline sources:          53
route/source reconciliations: 112
state rows:                    50
state-dimension decisions:    400
```

Every URL receives one bounded fetch and at most one transport/HTTP/empty-response retry. The exact response body, response headers, redirect chain, final URL, content type, byte count, and SHA-256 digest are retained.

## Selection law

The eight equal-weight A02 dimensions remain unchanged. A04 recomputes the complete fifty-state score after page adjudication, preserves the complete highest-coverage set and rejected shortlist, applies no substantive tie-breaker, and retains California only when California belongs to the highest-coverage set.

## Authority ceiling

```text
residual class closures:       0
reviewed disposition changes:  0
complete-compact findings:     0
racial-order findings:         0
prevalence findings:           0
coordination findings:         0
common-purpose findings:       0
graph effects:                 0
publication effects:           0
```

A completed A04 selection gate authorizes only the next bounded selected-state consequence, appeal, restoration, and outcome acquisition. It does not itself prove effective counterpower, timely restoration, national prevalence, racial hierarchy, unlawful motive, coordination, or common purpose.
