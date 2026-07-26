# M-05 Sprint 02 Leg 07 — M-04G source-health repair

## Baseline

The first proven all-basin orbit closed its execution denominator but not its source-health denominator.

```text
expected basins: 12
observed basins: 12
selected public polls: 96
content successes: 53
failures: 43
content success rate: 55.2%
```

```text
execution_complete: true
coverage_healthy: false
evidence_sufficient: false
```

## Failure denominator

```text
12  rate limited
20  access blocked
 4  transport failures
 3  oversized responses
 2  timeouts
 1  upstream failure
 1  unresolved redirect
```

No failed source is removed from the denominator.

## Repair installed

### Deterministic basin staggering

Every basin receives a stable six-second offset before polling begins.

```text
G01   0 seconds
G02   6 seconds
...
G12  66 seconds
```

Because GDELT is the first poll in each basin, this converts twelve simultaneous requests into a host-aware sequence consistent with its observed rate limit.

### Bounded retries

The refresher now supports:

- three attempts;
- exponential delay;
- `Retry-After` handling;
- retryable HTTP 408, 425, 429, 500, 502, 503 and 504;
- bounded retry of transport, DNS, TLS and timeout failures;
- a twelve-second maximum retry delay.

Retries do not bypass authentication, bot protection, regional restriction or other access controls.

### Safe redirect handling

Redirects are now followed explicitly with:

- a five-hop maximum;
- complete redirect-chain preservation;
- refusal of HTTPS-to-HTTP downgrade;
- final-URL recording;
- a stable unresolved-redirect failure class.

### Metadata fallback

When bounded content retrieval fails because a response is oversized, access-blocked or method-restricted, the poller may attempt a `HEAD` request.

A successful metadata fingerprint counts only toward route health.

```text
metadata fingerprint
≠ content access
≠ evidentiary sufficiency
```

### Stable failure taxonomy

Every terminal failure is classified as one of:

```text
rate_limited
access_blocked
authentication_required
method_not_allowed
transport_failure
tls_failure
dns_failure
timeout
oversized_response
redirect_unresolved
redirect_insecure
upstream_failure
client_error
content_type_mismatch
parse_failure
regional_access_constraint
manual_only
unknown_failure
```

The observation, attempt, degraded-route and failure ledgers are emitted separately.

## Health states

The workflow now reports four different questions:

```text
execution_complete
Did every expected basin emit and reconcile an artifact?

route_healthy
Did a route return content or a bounded metadata fingerprint?

content_healthy
Did a route return bounded content suitable for candidate generation?

coverage_healthy
Did the full orbit meet global, basin, class and failure-classification thresholds?

evidence_sufficient
Has human adjudication closed the proposition?
```

The polling system cannot set `evidence_sufficient` to true.

## Acceptance contract

A full all-class orbit is healthy only when:

```text
global route success >= 75%
global content success >= 65%
every basin route success >= 50%
every basin content success >= 50%
every basin has freshwater content
and ocean-discovery or archival content
all remaining failures are classified
direct voice remains manual privacy review
```

## Proof receipt

The global orbit proof now publishes:

- exact run and head;
- expected and observed basin denominator;
- route and content success totals and rates;
- metadata-only and failed counts;
- healthy-basin count;
- failure taxonomy;
- execution, coverage and evidence states;
- checksum-bound proof artifact.

## Post-merge requirement

This engineering change does not close the leg by itself.

After merge, one all-class `main` orbit must establish the observed before/after result. If the 75% route target or 65% content target is missed, the remaining failed routes stay in the maintenance queue and the leg remains acquisition-open.

## Boundary

```text
metadata_fingerprint_proves_content_access: false
route_health_proves_evidence_sufficiency: false
retry_may_bypass_access_controls: false
blocked_source_may_be_removed_from_denominator: false
redirect_following_may_downgrade_https: false
direct_voice_may_be_bulk_polled: false
source_failure_proves_suppression_or_intent: false
coverage_healthy_proves_completeness: false

promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
```
