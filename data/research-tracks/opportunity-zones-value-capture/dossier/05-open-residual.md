# Open residual — what remains beyond the apparatus's reach

Honest close-out. The reachable research is complete and packaged; three classes of work remain, and
two of them are structurally not the pipeline's to finish.

## 1. County-recorder deed layer — PARTLY CLOSED (Maryland is structured, not photonic)

This was assumed to be a uniform photonic wall. It is not. **Maryland exposes SDAT real-property data
(parcel address, transfer date, consideration) as a Socrata open-data API** — structured, cheap-tier,
pulled by `tools/adapters/md-property-deeds.py`. Using it, **L2 (Port Covington) is now deed-dated**:
the assemblage transferred 2014–2016, years before the 2018 designation, with the July 2016 cluster
matching the reported $70.3M purchase to the dollar (see the Deed Layer section). Owner names are
redacted from the open set, so owner-entity attribution rests on reporting; the deed dates are primary.

**What remains:** the other instances' counties (Detroit/Wayne MI, West Palm Beach/Palm Beach FL,
Storey County NV) — each needs its own deed source. Where a county exposes Socrata or a comparable API,
it is cheap-tier like Maryland; the genuine photonic subset is counties whose only public surface is a
JS-rendered viewer with no API. The "wall" is now known to be a per-jurisdiction question, not a
universal one.

## 2. Promotion past candidate_only — HUMAN BY CONTRACT

Every row here is `candidate_only` with `graph_effect: none`. Promotion to a finding is a human review
decision the pipeline is designed **not** to make. This is not incomplete work; it is the contract
holding. A reviewer admits (or rejects) each candidate.

## 3. Genesis custody seal — DECLARED, NOT WIRED

The corpus is not yet sealed into an `axm-genesis` shard (verifiable detached). The custody seam is
`declared_not_wired` for the whole track system. Sealing this case is the layer-0↔layer-2
demonstration described in `docs/axm-instrument-architecture.md`.

## Denominator note

The land layer is bounded to the **documented investor-connected set** (the instances public oversight
and reporting have surfaced), not all ~8,764 designated tracts. A full per-tract sweep is the
county-recorder problem in (1) multiplied by the tract count — out of scope for a cheap-tier pass by
construction, and flagged rather than silently implied as complete.

## Completion accounting

- Fund-layer question: **resolved** (null, receipted).
- Land-layer signal: **documented and verified** for 4 of 5 instances (L4 partial, honestly); **L2
  deed-dated** from the primary county record.
- Deed layer: **closed for L2 (Maryland, structured)**; per-jurisdiction for the rest.
- Method, benchmark, telemetry: **complete and rederivable.**
- Packaged deliverable: **this dossier.**
- Remaining: per-jurisdiction deed sources for L1/L3/L4/L5 (cheap where Socrata-enabled, photonic where
  viewer-only), plus the two by-design boundaries — promotion (human) and the Genesis seal (kernel).
  None is a gap in rigor; each is a named, honest boundary.
