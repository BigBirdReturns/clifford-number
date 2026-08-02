# SSC RD-04-C01 · version-history seed acquisition

Issue **#789** attempts the first Wave 02 class closure:

```text
RD-04-C01
current statutory, regulatory, and guidance version history after the 2025 law
```

This first pass freezes and fetches the source universe. It does **not** adjudicate every predecessor, successor, amendment, correction, supersession, operative interval, or continuing-effect edge, and therefore cannot close the class by itself.

## Frozen seed denominator

```text
federal instruments:              5
California instruments:           9
seed instruments total:          14
exact source receipts at launch:   0
version edges adjudicated:         0
class closures:                    0
```

The nine California rows are not hand-selected from search results. They are the complete county-resource document set exposed by the exact preserved CDSS ABAWD page body:

```text
data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/
page-custody/a02/CA-ABAWD/attempt-1.body
```

Exact parent-body SHA-256:

```text
d3aa66844880b48d63466f64347a8b06389ec52b5a85159ad205942fc4f88bff
```

That page exposes:

```text
ACL 25-60
ACL 25-64
ACL 25-93
ACL 25-93E
ACL 26-15
ACL 26-26
ACIN I-14-26
ACL 26-29 / ABAWD Handbook 3.0
ACL 26-43
```

The five federal rows preserve the enacted parent authority, the pre-H.R.1 FRA 2023 regulatory baseline, the parent OBBB implementation memorandum, and the two ABAWD-specific exceptions and waiver memoranda.

## Bounded capture law

```text
maximum attempts per source:  2
connect timeout:             15 seconds
total timeout:               60 seconds
redirect following:          yes
outcome-selected retry:      no
```

Every source returns one terminal receipt. A successful body is source custody, not observed implementation. A failed request is source unavailability, not record absence or noncompliance.

The capture preserves request URL, final URL, response status, content type, headers, body, stderr, timestamps, byte counts, and SHA-256 for every attempt. It emits a summary plus an exact-byte manifest over the complete artifact.

## Current boundary

```text
candidate universe complete:         no
cross-reference expansion complete:  no
version adjudication complete:        no
class closed:                         no
outside-human dependency:             false
reviewed-disposition effect:          0
graph/publication/adoption effect:    none / none / none
```

The next lawful step after source capture is to derive and freeze every official cross-reference exposed by the exact bodies, then adjudicate all temporal and supersession edges without treating later guidance as total replacement or publication as implementation.
