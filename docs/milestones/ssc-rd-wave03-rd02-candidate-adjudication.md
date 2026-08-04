# SSC RD‑02 Wave 03 candidate adjudication and follow-up protocol

The durable 51-route search census is retained and the resulting URL denominator is now terminally adjudicated without converting a search result into evidence.

```text
class:                              RD-02-C05
search routes executed:                  51 / 51
search candidate rows:                      480
unique candidate URLs:                      210
unique URLs adjudicated:                    210 / 210
candidate URLs admitted:                      0
lifecycle events observed:                    0
class state:                         still_open
class closed:                             false
```

## Durable source custody

```text
search protocol merge:
44d4544b23dc24db24a4a7c61939396ada0b5fd5

trigger PR:                         1056
workflow run:                30941752301
artifact ID:                   8905467301
artifact ZIP SHA-256:
6842a094437246095ac69c51dc4813c5e21a6298a60e81648f136485c6fc318a

artifact entries:                       572
artifact manifest SHA-256:
8cda804e330de9aa53c5065322414c79fd2b03bd49d773c07e1741e990647513
```

Every search route reached `http_success_rss_parsed`. The artifact contains the exact bodies, headers, route receipts, candidate index, execution receipt, and content-addressed manifest.

## Complete 210-URL adjudication

The candidate denominator is ordered by exact URL across seven closed thirty-row JSON shards. No URL is silently removed.

```text
exact manager-site candidates:                       1
name-aligned parent-organization candidates:         9
official-domain lexical collisions:                  2
nonresponsive lexical collisions or generic rows: 198
                                                    ---
unique URLs:                                       210
```

The sole exact manager-site candidate is the Moonshots Capital homepage. The nine parent-organization candidates are Stifel-branded surfaces returned for the Stifel North Atlantic row; none is treated as fund-specific evidence. The two `.gov` candidates are Michigan place-name collisions, not Michigan Capital Network lifecycle records.

## Frozen follow-up execution

Exactly ten candidate URLs receive one bounded GET each:

```text
unit 01 / Moonshots Capital routes:       1
unit 15 / Stifel-aligned routes:           9
withheld-row routes:                       0
fixed routes:                             10
maximum attempts per route:                1
maximum body:                         10 MiB
maximum parallel workers:                  4
result-spawned requests:                    0
```

The runner preserves complete transport custody and produces a same-host lifecycle-link census. A discovered link is only a candidate for a later exact route; it is not followed automatically and is not admitted as a source.

## Authority ceiling

```text
outside-human dependency:              false
external contacts / reviews:           0 / 0
capital-conversion finding:             false
favoritism / extraction:                false / false
coordination / common purpose:          false / false
complete-compact finding:               false
publication / adoption / graph:         none / none / none
```

This transaction terminalizes candidate classification only. It does not terminalize the 180-cell field matrix or close `RD-02-C05`.
