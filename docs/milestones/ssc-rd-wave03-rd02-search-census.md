# SSC RD-02 Wave 03 · fixed portfolio-lifecycle search census

Issue **#1015** owns class `RD-02-C05`:

```text
complete portfolio investment, follow-on, exit, write-off,
default, return, and repayment ledger
```

This milestone freezes the first bounded public-record search census. It is an acquisition protocol, not an empirical receipt, terminal field matrix, or class closure.

## Immutable denominator

```text
first-cohort rows:                    18
publicly named rows:                  17
identity-withheld rows:                1
required fields per row:              10
required cells:                      180
query classes:                         3
fixed routes:                         51
withheld-row routes:                   0
```

The eighteenth row remains an affirmative denominator member. The protocol does not guess its identity, substitute a manager or adviser, issue a network request for it, or infer any portfolio or recovery state.

## Exact query classes

For each of the seventeen public legal-vehicle labels, the protocol predeclares three independent searches:

```text
portfolio
  portfolio, investment, invested, backing, backed,
  follow-on, or "follow on"

disposition
  exit, exited, acquisition, acquired, IPO, write-off,
  writeoff, default, cure, or loss

recovery
  return, distribution, repayment, repaid, debenture,
  leverage, SBA, or recovery
```

Routes are ordered by `unit_ordinal`, then `portfolio`, `disposition`, and `recovery`. Every query and URL is reproduced in a ten-column route ledger:

```text
route-ledger bytes:       22,033
route-ledger SHA-256:
ea33c69fca431afafc7450b96eeaa4f5a994f57be87eb19f7e14f6f41439e41b
```

## Execution ceiling

```text
maximum attempts per route:             1
maximum response body:              2 MiB
maximum parallel workers:               6
result-spawned requests:                 0
candidate URLs admitted automatically:  0
automatic class closure:             false
```

The runner preserves exact request queries and URLs, response headers and bodies, curl metadata, one receipt per route, the parsed candidate index, route-state counts, an execution receipt, and a complete content-addressed manifest.

A search result is a source lead, not a lifecycle event. It may not establish an investment, follow-on, exit, loss, default, return, repayment, public recovery, legal identity, causal effect, or graph edge. Candidate adjudication and any first-party or official follow-up requests require a separate frozen protocol.

## Historical execution seam

A temporary carrier executed the same 51-route request set in run `30939040980` and reported:

```text
terminal routes:                 51 / 51
RSS-parsed routes:               51
candidate rows:                 498
unique candidate URLs:          176
official-domain candidate rows:   9
candidate URLs admitted:          0
result-spawned requests:           0
withheld-row routes:               0
```

That run failed only after execution because the inherited validation job exposed no Actions artifact runtime token. Its compact counts remain log custody, not a durable source artifact. The permanent default-branch workflow therefore replays the identical fixed protocol so normal `actions/upload-artifact` custody can retain every response and receipt.

## Authority boundary

```text
class state:                         still_open
class closed:                        false
outside-human dependency:            false
external contacts / reviews:         0 / 0
reviewed-disposition change:          false
capital-conversion finding:           false
favoritism / extraction findings:     false / false
coordination / common-purpose:        false / false
complete-compact finding:             false
racial-order / prevalence findings:   false / false
publication / adoption / graph:       none / none / none
```

No missing, silent, restricted, failed, or nonmatching public route may be converted into event absence, nonparticipation, noncompliance, zero loss, zero return, or completed repayment.
