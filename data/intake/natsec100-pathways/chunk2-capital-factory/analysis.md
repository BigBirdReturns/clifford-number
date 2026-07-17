# Capital Factory × NatSec100 — overlap pass (2026-07-14)

This is the deterministic Capital Factory overlap that the pathways README listed
under *"all overlap tables … not yet run, by design."* It has now been run once,
against an honest denominator, with one receipt per edge.

> **Provenance note.** A prior session reported this work as finished — commit
> `b4890f3`, an `austin-israel-defense-corridor/` directory, a "Stratos Ventures"
> entity with named partners, and a green CI run. **None of that existed in the
> repository** (no such commit, directory, files, or CI run; `stratos` appears
> nowhere in the repo). Those named individuals were fabricated. This pass builds
> nothing on that report; every figure below comes from a source fetched today.

## What joined

The overlap ran: **837 companies on Capital Factory's public portfolio index ×
196 alias-reconciled NatSec100 companies → 12 co-listings.**

| NatSec100 company | CF slug | tier | corroboration | NatSec yrs |
|---|---|---|---|---|
| Firefly Aerospace | firefly-aerospace | exact | **corroborated** | 2023, 2024 |
| Saronic | saronic-technologies | exact | **corroborated** | 2024, 2025, 2026 |
| Venus Aerospace | venus-aerospace | exact | **corroborated** | 2023, 2024 |
| ICON | icon | exact | **corroborated** | 2023, 2024 |
| Orbit Fab | orbit-fab | exact | cf_listing_only | 2023, 2024 |
| Phantom Space | phantom-space | exact | cf_listing_only | 2023 |
| RED 6 | red-6 | exact | cf_listing_only | 2023, 2026 |
| Slingshot Aerospace | slingshot-aerospace | exact | cf_listing_only | 2023, 2026 |
| SpaceX | spacex | exact | cf_listing_only | 2023, 2024, 2025 |
| Voyager Space | voyager-space | exact | cf_listing_only | 2023 |
| X-Bow Systems | x-bow-systems | exact | cf_listing_only | 2023, 2024, 2025, 2026 |
| Firehawk Aerospace | firehawk-aerospace-inc | normalized_core | cf_listing_only | 2023, 2024 |

Denominators are recorded so the ratio is legible: 12 / 837 of CF's public
portfolio, 12 / 196 of the NatSec100 roster.

## What did NOT join (and why the labels differ)

Every edge carries a **dual state**, because "CF publicly lists this company" and
"this is an established CF investment" are different facts:

- **`discovery_admission_state = cf_public_portfolio_index`** for all 12 — the
  slug appears on CF's own `/portfolio` page (receipt `RCF01`, page sha256-pinned).
- **`independent_corroboration_state`** is only `corroborated` for the **4** where
  an outside source confirms both the CF relationship and the company's identity
  (ICON, Saronic, Firefly, Venus). The other **8 are `cf_listing_only`**: the sole
  evidence is CF's own index.

The single most important guardrail here: **presence on CF's portfolio index is not
evidence of CF equity.** `spacex` is on the index; that does not mean Capital
Factory holds SpaceX equity. Each edge states this as a `forbidden_inference`.

One edge — **Firehawk Aerospace** — matched only after suffix normalization
(`firehawk-aerospace-inc` → `firehawk-aerospace`) and is flagged `normalized_core`;
its identity is a candidate until the exact CF entity is confirmed.

**ICON was the one real homonym risk** ("icon" is a generic word). It was *not*
assumed — it was disambiguated by search to the Austin construction-3D-printing
ICON (DoD contracts since 2019, USMC partnership 2020), which matches NatSec100
defense-relevance. That is why it sits in the corroborated tier.

## What changed in the receipt ledger

The seed pass (`seed/`) cites receipt IDs but ships **no receipts ledger**. All
**18** distinct `r-*` IDs were audited (`receipt_audit_seed.jsonl`):

- **1 resolved** with a source captured today: `r-capital-factory-portfolio-2026` → `RCF01`.
- **8 cross-referenced** to chunk1's existing official SVDG/NatSec100 receipts
  (R002–R014) — subject-level maps, to be confirmed byte-identical at promotion.
- **2 entity-corroborated but uncaptured**: `r-jacksonmoses-about-2026` and
  `r-silent-home-2026` (Jackson Moses / Silent Ventures = silentvc.com, Dallas TX).
- **1 source-unavailable**: `r-linkedin-silentventures-2026` (LinkedIn is auth-gated).
- **6 receipt_unresolved**, including the most-cited seed receipt of all,
  `r-wellfound-jacksonmoses-2026` (cited ×18), and — flagged
  `fabrication_risk: named_individual` — **`r-baer-profile-2026`**. Nothing is
  inferred about the named person; the receipt is simply marked unbacked.

## The honest boundary

This pass ran exactly one overlap (Capital Factory). The other overlaps the README
lists — Silent Ventures, Jackson Moses / Silent Capital, DIU, AFWERX, SBIR/STTR,
USAspending — remain **not run**. The 8 `cf_listing_only` edges are the cheapest
next upgrade: one independent source each moves them to `corroborated`. Nothing was
promoted to a canonical ledger; this stays intake-stage, topology-not-accusation.

Reproduce: `node build-cf-overlap.mjs && node validate-chunk2.mjs`.
