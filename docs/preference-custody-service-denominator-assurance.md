# Preference Custody PC-31: service-denominator assurance

PC-31 separates a complete-looking public service denominator from the operational population and state transitions needed to support it. It is a synthetic control. It creates no finding about a named service, provider, institution, policy, population, or authority.

## Frozen public surface

All eight worlds publish the same surface:

```text
operative release                 RELEASE-INCIDENT-V1@1
declared eligible units          100
published service records        100
public service status             service_denominator_verified
published completion rate          1.00
published queue count                 0
published rationing count             0
published denial rate              0.00
published unserved count              0
published median wait days            5
approved use                       systemwide_release_policy
```

## What changes behind the publication

The worlds distinguish complete assurance from pre-intake eligibility omission; lost requests and attempts; hidden queues, abandonment, resets, and censored waits; opaque rationing, priority overrides, and displacement; relabeled denial; completion records contaminated by partials, duplicates, rework, recurrence, and survivor selection; and stale lineage after system succession.

The fixture preserves one valid path and one bounded failure world for each mechanism. Every world emits a ten-event SHA-256 chain covering the public surface, eligibility, requests, queues, rationing, denial, unserved populations, completion, lineage, correction, authority, mechanism classification, and interpretation.

## Refusal boundary

```text
declared eligibility ≠ operational eligibility
no recorded request ≠ no need
no recorded attempt ≠ no attempt
one queue snapshot ≠ complete queue and wait custody
zero published queue ≠ zero true queue
zero published rationing ≠ no priority, override, displacement, or capacity denial
referral, deferral, ineligibility, no-response, withdrawal, or pending ≠ necessarily non-denial
zero published denial ≠ zero true denial
zero published unserved ≠ complete unserved-population coverage
service record or completion label ≠ unique substantive durable completion
published median wait ≠ complete wait distribution
historical assurance ≠ current lineage
synthetic failure ≠ coercion, manipulation, discrimination, breach, misconduct, coordination, common purpose, or intent
complete internal custody ≠ public authorization
```

## Real-case promotion boundary

A real service-denominator claim requires source-addressable operational eligibility; awareness, request, attempt, and intake state; never-attempted need; complete queue entry, exit, abandonment, reset, transfer, and wait-time custody; rationing rules and overrides; denial-label crosswalks; unserved-population reconciliation; unique substantive durable completion; current system lineage; monitoring; correction; appeal; rollback; durability; and separate public authority.
