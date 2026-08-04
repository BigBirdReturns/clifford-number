# SSC RD Wave 03 — RD-02 admitted approval source and manager-lineage replay

The two-route disclosure-leaf execution produced one exact PDF and one pretransport URL-encoding failure. The successful PDF is now adjudicated as a bounded source. The failed route is frozen for a one-route replay that cannot repeat the successful request.

## Exact execution custody

```text
canonical protocol merge:
135bc5acc1bec7f13d817caf697aec9c36c157e0

workflow run:                  30952281385
trigger PR:                    #1082
trigger head:
741533b26b6d64bbd554f3df6cc67ccba843492f
synthetic merge head:
ad5c47d0a32754fa9ca7abf1ad4ff4b5f454cefb

artifact ID:                   8909616198
artifact ZIP bytes:               148,771
artifact ZIP SHA-256:
711296d8a951c60191abc9dba2301d37de6d9f40f9b51694374198d229ed23d5

manifest entries:                      18
manifest combined SHA-256:
4a129d9a70f49d2764128fa90010c51c365ff63c2b8c4d8c109d7522a95e8877
```

```text
fixed routes / attempts:        2 / 2
successful PDF captures:            1
pretransport failures:              1
HTTP failures:                       0
source restrictions:                0
result-spawned requests:             0
```

The execution-only PR was closed without merge after the artifact was retained.

## Admitted 2024 approval source

```text
source ID:
STIFEL-AM-FORWARD-2024-FINAL-APPROVAL

route:
RD02-W03-DL001

PDF bytes:                     145,941
PDF pages:                           2
body SHA-256:
a5de66bc80db12ca7fc70de0bc41214cd3e0925c10d7139ede9ea6426fa3028d

embedded text bytes:             4,736
embedded text SHA-256:
dfe8142b7e0033c964fd97508d0aa3d5714a66d10ee1d8ff1b72464557a27a17
```

Every page was rendered and inspected. The source supports seven bounded observations:

```text
1  public fund identity
   Stifel North Atlantic AM-Forward Fund

2  final federal approval

3  Small Business Investment Company license

4  eligibility for SBA leverage

5  earlier initial green-light approval to raise private capital

6  issuer-described private capital commitments from
   Lockheed Martin, GE Aerospace, ASTM International, and others

7  North Atlantic Capital Management manager relationship
```

The source does not print the exact frozen legal-entity string `Stifel North Atlantic AM-Forward, LP`. It corroborates the public fund name and manager relationship without claiming an exact legal-string match.

The source is admitted, but none of the seven observations is a lifecycle event required to close `RD-02-C05`:

```text
leverage eligibility        != leverage commitment or draw
capital commitment          != capital funded
capital commitment          != portfolio investment
license approval            != follow-on investment
license approval            != exit or return
manager relationship        != portfolio company identity
missing public outcome      != zero private activity
```

```text
admitted sources:                       1
admitted bounded observations:          7
RD-02-C05 lifecycle events observed:    0
fields terminally closed:               0
unit rows terminally closed:            0
class closed:                        false
```

## Original manager-lineage failure

The second frozen route never reached HTTP transport:

```text
route:                         RD02-W03-DL002
curl exit:                                  3
HTTP status:                                0
body bytes:                                 0
stderr:
curl: (3) URL rejected: Malformed input to a URL function
```

The raw captured candidate URL contains literal spaces. That wrapper failure is not an HTTP failure, source restriction, or source unavailability.

## Exact one-route replay

```text
replay route:
RD02-W03-DLR001

raw candidate identity:
https://www.stifel.com/docs/pdf/pressreleases/2021/Stifel North Atlantic NEW FINAL for 02.19.21-1.pdf

transport URL:
https://www.stifel.com/docs/pdf/pressreleases/2021/Stifel%20North%20Atlantic%20NEW%20FINAL%20for%2002.19.21-1.pdf
```

Only literal ASCII spaces are percent-encoded for transport. The raw candidate URL and its SHA-256 identity remain unchanged.

```text
original successful routes replayed:       0
fixed replay routes:                        1
maximum replay attempts:                    1
maximum body bytes:                    10 MiB
maximum parallel workers:                   1
result-spawned requests:                     0
automatic source admission:              false
automatic observation admission:         false
automatic field closure:                 false
automatic class closure:                 false
```

A successful replay remains pending exact PDF rendering, text extraction, and separate source adjudication.

## Current authority boundary

```text
frozen cohort rows:                       18
required matrix cells:                   180
field matrix terminal:                 false
class state:                       still_open
class closed:                          false

outside-human dependency:               false
external contacts / reviews:            0 / 0
capital-conversion finding:             false
favoritism / extraction:                false / false
coordination / common purpose:          false / false
complete-compact finding:               false
publication / adoption / graph:         none / none / none
```
