# Corpus selection and coverage

Status: constitutional selection-layer policy and reproducible coverage
snapshot. Edge discipline controls what the project may assert. This policy
controls what the project chooses to look at.

## Why this layer exists

A corpus can be individually well sourced and still make the instrument
partisan or misleading in aggregate. `graph_effect: none` prevents a candidate
from becoming a factual edge; it does not prevent the project from selecting
only politically convenient candidates, counting private data as public
progress, or refining manifests while leaving major corpora untouched.

Section 1.10 of `BUILD-INSTRUCTIONS.md` therefore requires every lane to
declare:

- its public-interest question;
- neutral selection unit and complete or bounded universe;
- inclusion and exclusion rules;
- source-complete, rule-based, or matched-comparator strategy;
- the rule that admits analogous actors regardless of party or ideology;
- privacy exposure and public reproducibility;
- measured coverage gaps, review date, and sunset condition.

The declarations live in `data/canonical/corpus-selection.json`. The measured
state lives separately in `data/research/corpus-coverage.json`. The separation
prevents a good selection rationale from narrating ingestion that has not
happened.

## Current coverage, without potential counted as progress

| Lane | State | Reproducible observations | Declared void |
|---|---|---:|---|
| AI-policy public/private topology | active partial | 137 actors, 25 organizations, 14 bounded surfaces, 34 hop edges | zero cross-case joins; AXM identity lock remains open |
| NatSec100 second case | staged partial | 342 of 400 target company-year rows; 16 receipts | 58 unresolved 2025 rows; zero compiled case ledger quartets; zero joins |
| Official-record source plane | active partial | 4 of 5 configured sources in `ok`; 6 candidates; 61 held observations | SAM credential gap |
| Private LinkedIn support | support only | **zero public rows** | 12,603 local observations and 78 captures are explicitly nonpublic and do not count toward public progress |
| Epstein public corpus | proposed, un-ingested | **zero hashed artifacts** | approximately 3.5M pages, 2,000 videos, and 180,000 images remain unmanifested; privacy fixtures absent |
| Trump office/business/capital | proposed, un-ingested | **zero resolved mission entities or records** | 0 of 8 seed queries executed; OpenFEC and SEC-submissions adapters absent |
| Panama service-provider topology | proposed, un-ingested | **zero imported nodes** | no licensed snapshot, hashes, importer, registry validations, or privacy fixtures |

The counts above are a dated snapshot, not a permanent claim. The validator
requires the gaps to remain visible but does not pretend open-universe counts
are complete.

## Lane lifecycle

```text
proposed -> staged -> active -> suspended or retired
               ^        |
               |        v
          coverage and selection review
```

- **Proposed:** the public-interest and symmetry test passes, but ingestion or
  privacy machinery is absent.
- **Staged:** reproducible source rows exist, but canonical ingestion or a
  constitutional dependency remains incomplete.
- **Active:** the declared selection universe and coverage state are executable
  under documented commands.
- **Support only:** local or private material may prioritize public-source
  review but cannot count as public coverage or support public assertions.
- **Suspended/retired:** the lane remains documented, with its reason and prior
  coverage preserved.

## Symmetry is a rule, not equal scandal quotas

Selection neutrality does not require an artificial one-for-one partisan name
list. It requires a rule that would admit analogous facts wherever they occur.

Examples:

- The presidential office/business/capital lane first enumerates every distinct
  president serving in the dated 1979-to-present window, then runs the same
  frozen five-predicate battery for all eight members. The Trump topic is a
  discovery router, not a membership rule. See
  [`officeholder-cohort.md`](officeholder-cohort.md).
- The Epstein lane is source-complete at the artifact level. Every public actor
  encountered receives the same contact, travel, communication, meeting,
  financial, allegation, and disposition predicates.
- The Panama lane begins with the complete service-provider and entity graph,
  not a famous-name search. Public actors are tested only after identifier-grade
  entity validation.

Symmetry constrains selection. It does not manufacture unsupported equivalence
between actors, legal statuses, or conduct.

## Validator

```bash
npm run validate:selection
```

The gate fails when:

- a discovery-seed topic lacks exactly one selection declaration;
- a lane lacks a comparison class or symmetry rule;
- selection and coverage registries disagree about which lanes exist;
- a bounded denominator is incomplete without an explicit gap;
- private support is counted as public progress;
- privacy, reproducibility, review, or sunset rules are missing; or
- a selection declaration claims graph effect.

The selection gate does not decide whether a public allegation is true. It
ensures the project can explain, in advance and under a general rule, why it is
looking there at all.

Selection declarations and coverage rows also carry the interpretation and
review fields defined in [`consumption-contract.md`](consumption-contract.md).
This makes pending adversarial review and denominator limits survive export
instead of depending on nearby prose.
