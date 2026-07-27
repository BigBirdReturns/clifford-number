# M-05 Sprint 03 Leg 07 — Source ecology v2 and cross-domain regression

## Frozen denominator

```text
96 public polling routes
12 geographic basins
8 routes per basin
```

No route may be deleted, reclassified as success, or removed from a basin to satisfy the health target.

## Baseline

```text
route successes:   63 / 96  · 65.62%
content successes: 60 / 96  · 62.50%
metadata only:      3
failures:          33
healthy basins:     9 / 12
unclassified:       0
```

The unhealthy basins are MENA, South Asia, and Oceania/Pacific.

## Repair

### Globally serialized GDELT tide

All GDELT requests pass through one host gate with a minimum interval, bounded retries, and Retry-After support. Results retain their original route and basin identities.

### Authoritative fallbacks

```text
official API
→ official feed
→ official search or document repository
→ official sitemap
→ bounded metadata fingerprint
→ lawful manual or aquifer route
```

Every attempted URL, method, status, failure, redirect, byte count, and final result remains in the observation ledger. Metadata improves route reachability only and never counts as content.

### Host-aware transport

The runtime applies per-host intervals, timeout profiles, bounded response limits, safe redirects, HTTPS downgrade refusal, retry budgets, and stable failure classification.

## Acceptance contract

```text
same route denominator:       96
same basin denominator:       12
route success:              >=75%
content success:            >=65%
healthy basins:              12/12
unclassified failures:          0
freshwater content per basin:  yes
discovery/archive content:      yes
```

## State separation

```text
execution_complete
≠ route_healthy
≠ content_healthy
≠ coverage_healthy
≠ evidentiary_sufficiency
≠ answer_effectiveness
```

The polling system cannot set evidentiary sufficiency or conclude that APC-01 works.

## Cross-domain regression

The repaired source ecology feeds five existing domain adapters:

```text
APC-ADMIN-01     benefits and administrative debt
APC-COERCION-01  surveillance and enforcement
APC-WORK-01      workplace monitoring and co-governance
APC-EXIT-01      public-platform exit and operating sovereignty
APC-VALUE-01     public residual rights and value recovery
```

Every domain must still carry direct voice or an exact deficit, pre-action timing, evidence custody, independent authority, observed remedy, durability, technical-bypass review, and successor-system review.

## Boundary

```text
source reachability proves accuracy: false
metadata proves content access: false
coverage health proves completeness: false
source health proves evidentiary sufficiency: false
source health proves answer effectiveness: false
three domains prove universal transfer: false
all R levels observed prove composed answer: false
repair installation proves target achievement: false

promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
```
