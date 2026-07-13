# Consumption contract and adversarial universe review

Status: constitutional interpretation and selection-review policy. Section 1.11
of `BUILD-INSTRUCTIONS.md` requires this contract to travel with every exported
selection lane and coverage row.

## Why the caveat is data

A careful producer can still create a misleading downstream artifact if an
export drops its limits. A row saying `0 / 3,500,000 pages` is an honest coverage
statement, but detached from its meaning it can be recast as evidence that the
unsearched pages contain something relevant. Likewise, a topology map can be
recast as a finding after its receipts, evidence states, and review status have
been removed.

The repository therefore treats interpretation fields as part of the row, not
as optional surrounding prose. `data/canonical/consumption-contracts.json`
defines the canonical wording. Each selection and coverage row carries an exact
snapshot containing:

- `contract_id`;
- `selection_review_id` and `selection_review_status`;
- `what_this_is`;
- `what_this_is_not`; and
- `copy_ready_caveat`.

A derived or redistributed row that removes or rewrites those fields is not a
conforming project export. The validator compares the attached copy byte for
byte with the canonical contract, so a consumer does not need a second lookup
to recover the warning.

## Copy-ready public caveat

> This is a map of documented public-source topology and coverage, not a
> finding of coordination, motive, causation, illegality, or wrongdoing. A
> coverage denominator describes the declared search universe or source
> potential; it is not evidence that responsive, relevant, or incriminating
> material exists. Follow each predicate to its receipt, evidence state, and
> review status.

The denominator rule is literal: expected or potential counts describe the
search space. They cannot be narrated as discovered evidence, suspected
evidence, or proof that responsive material exists. `observed: 0` means the
repository has ingested zero qualifying items under the stated metric; it does
not predict what unsearched material contains.

## Private support caveat

> This row describes private support material and is not public evidence. Its
> counts do not measure public corpus coverage, do not establish a relationship
> or fact, and must not be redistributed as source data. Any public assertion
> requires a separate public receipt and review.

The private contract has `export_allowed: false`. Only aggregate boundary
metadata and the caveat may leave private intake. Raw rows, query prose, and
sensitive member data stay local and gitignored.

## Adversarial neutral-universe review

Presence of a symmetry rule is machine-checkable; fairness of its boundary is
not. `data/research/selection-adversarial-reviews.json` records the human joint
explicitly instead of pretending the validator solved it.

The second party's task is opposition, not copy editing. For the same
public-interest question, the challenger must:

1. Move temporal, geographic, institutional, source-family, and threshold
   boundaries and record who enters or leaves.
2. Propose the strongest plausible alternative universe.
3. Apply the rule to comparator outcomes that are unflattering to the thesis
   and to exculpatory or null outcomes.
4. Test whether source access, deletion, language, jurisdiction, or
   digitization makes apparent symmetry merely nominal.

`cleared` requires a reviewer distinct from the universe author, at least two
recorded boundary attacks, one alternative universe, one comparator test, and a
written disposition. A pending review may be represented only as:

- `blocked` for proposed and staged public lanes;
- `provisional` for already-active public lanes; or
- `support_only` where no public inferential universe is claimed.

The current ledger is intentionally honest: no public lane is represented as
independently cleared yet. The two active lanes remain visibly provisional;
staged and proposed lanes remain publication-blocked. This is a recorded gap,
not a fabricated review.

## Machine gate

Run:

```bash
npm run validate:consumption
```

The gate fails if a lane or coverage row loses its contract, carries stale
review status, rewrites the canonical caveat, treats a pending review as
cleared, represents self-review as independent, omits the required adversarial
tests from a cleared record, or makes an uncleared staged/proposed lane
publication-ready.
