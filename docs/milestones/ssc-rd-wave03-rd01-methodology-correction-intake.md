# SSC RD Wave 03 — RD-01 methodology correction intake

This package freezes the fixed public-record protocol for Wave-03 class `RD-01-C06`:

```text
methodology correction, appeal, and re-evaluation records
```

It is an intake contract, not an acquisition receipt and not a class closure.

## Exact custody

```text
Wave-03 issue:               #1013
RD-01 child issue:           #1014
Wave-02 cumulative parent:   #1012
Wave-02 promotion merge:     2af6bb7819a37e51c7198fb48da894445a29e494
Wave-03 launch base:         a69bffa4c7c6934432b2b93816f5b2b6a466a85b
Wave-03 constitution merge:  dc47681a9ad43e1c64c86e3d823dbb7c203a18c2
RD-01 seed binding commit:   956f2454813fed7a9666597b5953cc57b54e4666
field-matrix contract head:  43d735f93ff0171501c27890d297940e32a5e14f
```

The branch-local field-matrix contract is immutable input custody. The prior `RD-01-C03` class receipt and closure remain immutable historical custody. This package neither reopens nor double-counts them.

## Frozen denominator

```text
edition rows:                 3
ordered editions:             2024, 2025, 2026
required fields per edition:  8
required matrix cells:       24
source-count denominator:  false
later-edition rewrite:     false
```

Each edition remains its own historical unit. A later methodology or roster cannot silently become a correction, appeal, or re-evaluation of an earlier edition.

The eight exact field obligations are:

```text
edition identity and publication cutoff
methodology identity and published input description
published correction or errata record
published appeal or challenge route
published re-evaluation, reranking, or reconsideration record
version, exception, and override custody where public
source identities and exact locators
field and row terminal state
```

Every one of the twenty-four cells must receive an allowed terminal state before a later class-closure transaction may close `RD-01-C06`.

## Fixed request universe

```text
exact first-party edition routes:  3
fixed candidate-query routes:     27
fixed routes total:               30
maximum attempts per route:        1
request concurrency:               2
result-spawned requests:            0
external contacts / reviews:      0 / 0
automatic second pass:          false
```

The three direct routes are the exact NatSec100 edition pages. The twenty-seven candidate routes are the Cartesian product of the three editions with these nine predeclared terms:

```text
correction
errata
appeal
challenge
re-evaluation
reranking
reconsideration
override
exception
```

Candidate-query responses are census inputs only. A candidate URL is not an admitted evidentiary source and may be admitted only in a separate exact-capture transaction after its HTTPS host, path, edition identity, and first-party custody are fixed. No result may spawn an automatic follow-up request.

## Terminal law

Permitted field states are:

```text
observed
not_applicable_by_edition_state
source_restricted
source_unavailable_after_fixed_protocol
not_publicly_recovered
```

A candidate hit blocks `source_unavailable_after_fixed_protocol` until the exact candidate is captured or terminally excluded. Conversely, no candidate hit is not proof that no correction, appeal, challenge, exception, override, or re-evaluation occurred.

The following substitutions remain forbidden:

```text
methodology change -> correction
new edition -> re-evaluation of prior rows
no public appeal route -> no appeal or challenge
no public override record -> no override
rank turnover -> methodology defect
published ranking -> technical superiority or causal treatment
candidate-query result -> admitted source
intake protocol -> class closure
one class closure -> lane closure
```

## Current state

```text
denominator frozen:          true
fixed protocol designed:     true
fixed protocol executed:    false
acquisition attempts:            0
terminal matrix cells:           0 / 24
closed edition rows:              0 / 3
admitted candidate sources:       0
class closed:                 false
```

Authority remains bounded:

```text
outside-human dependency: false
project blocking:          false
selector-accuracy finding: false
technical-superiority:     false
reviewed disposition:      unchanged
publication/adoption/graph: none / none / none
```

The next lawful transaction is exact execution of these thirty fixed routes with immutable request and response custody. That execution may classify fields; it may not itself create a class closure or substantive selector finding.
