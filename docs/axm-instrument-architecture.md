# Clifford Number as an AXM instrument — the shape, and why it isn't wired yet

This document records a load-bearing architectural fact that is not derivable from
this repo alone: **Clifford Number is a layer-2 instrument in the AXM sovereign-evidence
stack**, and it was deliberately built *toward* that shape without being *bound* to it.
It captures the four-layer topology, the seams where Clifford mates to the layers below
it, and the sequencing principle that made building it separately the correct move.

## 1. The four-layer stack

The canonical, machine-checked map is the AXM **watershed manifest**
(`axm-genesis/watershed/example/axm.watershed.json`, enforced by `watershed-check.js`).
It already registers `clifford-number` at layer 2. The stack:

| Layer | Name | Repos | Role |
|---|---|---|---|
| **0** | protocol | `axm-genesis`, `axm-core`, `axm-verify` | Cryptographic custody. Genesis compiles claims into signed, Merkle-rooted shards that verify **detached** (bytes + out-of-band key only). Tamper one byte → root fails → signature fails → rejected. Genesis compiles and signs; everything else reads. |
| **1** | attention | `ghostbox`, `screenghost` | Intake + attention geometry. ScreenGhost is photonic intake — "the UI is the API"; it drives any screen/portal and emits structured state. GhostBox fuses photonic + structured (RSS/XBRL/SEC/iCal) intake into semantic coordinates → tension (contradiction, velocity, convergence) → where to look. |
| **2** | instruments | **`clifford-number`**, `offramp`, `pta-tracker`, + spokes (`axm-chat`, `axm-show`, `axm-embodied`, `axm-fleet`, `axm-sfn`) | Drive a surface, produce sealed evidence. |
| **3** | publications | `field-autopsy`, `fakesoap`, `aktv` | Public-facing outputs. |

Clifford Number is the flagship public-interest instrument in that layer. `field-autopsy`
— the method Clifford's Arcadia and FA-03 cases already use — is registered as the
layer-3 publication sitting directly above it.

## 2. What Clifford currently reimplements, one shelf down

Clifford was built beside this platform, so it grew hand-rolled versions of layers it is
meant to run *on*. Naming them is naming the integration work:

- **Custody (layer 0).** Clifford's `receipt-v2` — content hashes, `durability_status:
  captured | archived | url_only` — is *Genesis reached for and stopped short of*. The
  arcadia intake honesty note ("the bytes actually received are hashed; a relayed inventory
  is not mislabeled as an exact transcript") is Genesis's discipline written in prose
  instead of compiled. The corpus's admitted "provenance debt" is exactly the gap Genesis
  closes.
- **Intake (layer 1).** Clifford's per-source `tools/acquire-*.mjs` / `ingest-*.mjs` are a
  bespoke layer-1. ScreenGhost is the generic adapter for the no-API portals that dominate
  Clifford's acquisition cost (county recorders, disclosure viewers, agenda portals);
  GhostBox is the generic structured-intake fabric.
- **Attention (layer 1).** `routing_score`, deniability scoring, and the LinkedIn attention
  heatmap are hand-built instances of GhostBox's tension/attention geometry.
- **Review (shared).** Clifford's `promotes_to: candidate_only` / human-review contract is
  the same discipline `axm-console` implements generically: "the queue records human
  decisions and makes none."

The tell that this is one organism, not six projects: the **epistemic contract is
identical across layers**. Put them side by side —

- Genesis: *every claim traces to exact bytes; tamper → reject.*
- Clifford: *receipt-or-it-didn't-happen; coverage absence ≠ disproof; candidate_only.*
- axm-console tiers: *not identity, not activity classification, not continuous coverage;
  gaps are declared, not hidden; not legal-grade by itself.*

Same DNA, three codebases.

## 3. Why building it separately was correct — the "conform late" principle

It would have been a mistake to make Clifford emit Genesis shards before the shape was
known. The reason is not merely efficiency; premature conformance would have **manufactured
the exact lie the system exists to forbid.**

1. **Dependency inversion.** The layer-2 instrument is what *discovers* what the layer-0
   contract must be able to hold. Clifford is the requirements-gathering process for the
   evidence schema Genesis has to seal. Truths like "keep `discovery_admission_state`
   separate from `independent_corroboration_state`," "coverage needs a `resolved_after_search`
   reverse-rigor state," "a relayed inventory must never be sealed as a transcript" were
   *learned by driving Arcadia into the ground* — unguessable from the kernel side.

2. **A frozen spec is only worth freezing after the learning.** Genesis's rule — "nothing
   changes without a frozen-spec RFC" — produces a *good* frozen format only if you freeze
   around invariants reality has stopped contradicting. Conform-first would have frozen the
   naive schema, turning every later discovery into a migration of a signed, topology-bound
   (Clarion) format — rotating keys on every lesson.

3. **Premature conformance notarizes the lie.** To pass the verifier before receipts had
   matured, you would stub the fields Genesis demands — sealing a shard that
   *cryptographically certifies* content that had not earned its receipts. That is the worst
   object in the ontology: mathematical certainty wrapped around epistemic immaturity —
   "provenance debt silently described as captured," except Merkle-rooted and signed. The
   moment "produce a green shard" becomes the target, you Goodhart the evidence: shaping what
   you found to fit the container instead of shaping the container to hold what is true.

4. **The build recapitulated the system's own epistemics.** The instrument's rule is *don't
   promote a candidate to a finding until receipts license it.* The architecture followed the
   same rule: *don't promote Clifford's schema to a frozen kernel contract until the
   instrument work licenses it.* The AXM↔Clifford seam sat as an **open trail with
   `graph_effect: none`** — declared in the watershed manifest (so it is not lost), not
   asserted as wired (so it is not a lie). Forcing it early would have been asserting a join
   before the search — the very sin the commit *"de-launder person frontiers: 'after search'
   needs a real search"* fixes, one level up.

The payoff: conformance is now a **derivation, not a guess**. The receipt schema has stopped
moving because reality stopped surprising it, so the RFC for "how a public-interest evidence
instrument seals into Genesis" can be written from evidence.

## 4. The two seams to fuse

Both prove different halves of the shape; sequence by which you want lit first.

- **Custody seam (layer 0 ↔ 2).** Compile one Clifford corpus — the `arcadia-field-autopsy`
  case is the natural first, since `field-autopsy` is its registered layer-3 publication —
  into a Genesis shard that passes `axm-verify` **detached**. Success collapses "provenance
  debt" into cryptographic custody and proves the seal point is real, not drawn.
- **Intake seam (layer 1 ↔ 2).** Point ScreenGhost/GhostBox at one no-API record portal
  (a county recorder or a disclosure viewer) and retire one bespoke `acquire-*` adapter.
  Success proves the acquisition cost is amortized by the platform, not re-paid per source.

## 5. The repeatable pattern and the ten harnesses

The instrument logic generalizes along three axes (see
`data/research-tracks/`): **place-formation** (Arcadia's signature, new places/programs),
**person-router** (the routing-score predicate scan, new rosters/surfaces), and
**disclosure-crossing** (the OGE-FEC overlap engine, new cohorts/money-streams). Ten
parallel harnesses are scaffolded there, each carrying the four things a pattern instance
needs: a portable **signature/scan**, its **source adapters** split `structured | photonic`
(the intake seam above), the **epistemic contract**, and a **Genesis custody target** (the
seal seam above). They are `status: scaffold` — declared, adapters not yet wired — which is
the honest state, and validated by `tools/validate-research-tracks.mjs`.

The reason the pattern can point at *so many* places is precisely this stack: once layers 0
and 1 are fused, every new instrument instance inherits custody and intake for free, and the
only marginal cost is one photonic adapter per new jurisdiction.
