# Evidence-lake identifier repair Wave 02

Source fingerprint: `bf58625cbda9381f1223cf1a78ad18d8c031b8913b2584cf2a3fd12bb6944ea6`

## Governing judgment

A bare `id` field is document-local unless a schema declares a stronger namespace. It is retained as local telemetry and excluded from global joins. Explicit `claim_id`, `event_id`, `object_id`, and `trail_id` projection gaps receive typed source-registration rows. Registration closes the identifier-namespace defect; it does not prove evidence truth, resolve identity, or silently complete native case migration.

```text
projection-without-source rows observed:     3953
explicit target rows registered:            2011
prior bare local projection rows:            398
local-only identifier values observed:       1131
local-only identifier occurrences observed:  7859
native source migrations still required:     612
unresolved registrations:                    164
decisions requiring human permission:        0
```

## Registrations by identifier key

| Identifier key | Rows |
|---|---:|
| claim_id | 1106 |
| event_id | 224 |
| object_id | 408 |
| trail_id | 273 |

## Registrations by rule

| Rule | Rows |
|---|---:|
| core-thesis-derived-object | 408 |
| estate-game-trail-derived-identifier | 273 |
| fallback-unresolved-registration | 164 |
| legacy-master-claim-projection | 718 |
| legacy-uk-ai-case-projection | 448 |

## Boundary

The registry defines identifier namespace and declared lineage only. Same-string recurrence is not identity resolution. Generated lineage is not independent evidence. A legacy registration with `native_source_migration_required: true` remains an explicit migration debt. Independent challenge may correct any row; it is not permission required to create the reversible registration.
