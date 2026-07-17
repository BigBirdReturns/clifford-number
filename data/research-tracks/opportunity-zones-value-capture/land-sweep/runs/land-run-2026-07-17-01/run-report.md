# Land-sweep run — `land-run-2026-07-17-01` (first pass)

**Track:** opportunity-zones-value-capture · **Layer:** land (pre-designation ownership + nomination discretion) · **Date:** 2026-07-17 · **Status:** seed set enumerated, `candidate_only` (0 promoted)

The fund layer was a null (oz-run-...-02/03). This starts the layer where the signal actually lives.
Per the banked methodology, Sonnet did the open-web reporting synthesis (derivation-with-a-check); the
top rung verified and gated. Scope is deliberately bounded to the **documented seed set** — tracts
already surfaced by public oversight/reporting — not all ~8,764 tracts.

## What the first pass established (all `candidate_only`, gated)

Five documented instances of an already-owned parcel/project in a tract placed into the OZ designations:

| id | place | reported owner/project | pre-designation? | nomination path |
|---|---|---|---|---|
| L1 | Detroit riverfront, MI | Dan Gilbert / Bedrock (10+ buildings) | yes (ownership predates) | Gov. Snyder selection |
| **L2** | Port Covington, Baltimore, MD | Kevin Plank / Sagamore (~40% of tract) | **yes — verified: buying from 2012** | **verified: aide wrote "does not qualify"; Hogan picked it anyway (Apr 2018)** |
| L3 | Rybovich marina, West Palm Beach, FL | Wayne Huizenga Jr. | yes ("not a new investment") | Gov. Scott, after ~Apr 2018 lobbying letter |
| L4 | Storey County, NV (~700 ac) | Michael Milken | unclear (NYT paywalled) | Treasury cert "at instruction of" Mnuchin (denied) |
| L5 | Tahoe Reno Industrial Center, NV | existing industrial park | yes (already developed) | Gov. Sandoval + Sen. Heller pressure |

**L2 is verified verbatim by the top rung** against the ProPublica primary source (land-buying began
**2012**; the internal "Port Covington does not qualify" note is real, dated before the Feb 5 2018
developer meeting; Hogan selected it in April 2018). It's the cleanest instance of the pattern.

## The honest boundary

- **County-recorder deed images are `not_searched` for every instance** — that's the truly photonic
  surface (per-county JS viewers, no UA trick), and it's the gap that would turn "reported ownership"
  into a hard, dated deed. It needs the photonic adapter the scope names but we haven't built.
- **L4/L5 may be the same Storey County tract** — flagged, not merged, not asserted separate.
- **L4 rests on secondary sources** (the NYT primary is paywalled); marked accordingly.
- Several quotes came through a summarizing fetch; only L2 (and L3, from a prior run) are
  verbatim-verified. Quote fidelity is recorded per-receipt in `receipts.jsonl`.
- **Nothing promoted to a finding.** Forbidden-inference gate held: designating owned land is lawful;
  these rows document a reported sequence + nomination path + oversight response; the Treasury IG and
  Senate Finance Committee are the adjudicators, not this pipeline.

## Telemetry

Sonnet synthesis: 96,717 tokens, 33 tool calls, 421 s, **~$0.75** (web-heavy — the costly path, exactly
as the benchmark predicted; a structured adapter pull is ~$0.07). Adjudication: 1 verification fetch.
Cost rederivable from tokens via `telemetry.json`.

## Next

1. Wire a **county-recorder photonic adapter** for one instance's county (Baltimore City for L2 is the
   strongest candidate) to verify the pre-designation deed dates — turning L2 from "reported" to "deed-dated."
2. Resolve the **L4/L5** Storey County tract identity.
3. Extend the seed set (AP's Kushner reporting, additional GAO/IG material) toward a fuller enumeration.

This is the start of the land layer, not its completion — the remaining ~60% of the OZ track lives in
the deed verification and the per-tract sweep.
