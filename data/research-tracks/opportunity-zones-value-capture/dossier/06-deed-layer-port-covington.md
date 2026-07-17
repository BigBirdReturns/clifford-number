# Deed layer — Port Covington (L2), deed-dated from the primary county record

The land-layer instances carried `deed_verification: not_searched` because county-recorder deeds were
treated as a photonic wall. For Maryland that assumption is wrong: SDAT real-property data (parcel
address, transfer date, consideration) is a **structured Socrata open-data API**
(`opendata.maryland.gov`, dataset `qfyw-ryt6`), pulled cheap-tier by `tools/adapters/md-property-deeds.py`.
Querying the Port Covington peninsula parcels (zip 21230) returns the primary deed record.

## The assemblage, deed-dated (all before the June 14, 2018 designation)

| deed transfer | consideration | parcels | corroboration |
|---|---|---|---|
| **2014-12-23** | $46,500,000 | 100 / 200 / 300 Cromwell St | Sagamore's first buy — the ~60-acre "Sun Park" (2014, Baltimore Sun) |
| **2015-05-05** | $8,000,000 | 120 / 150 / 250 Dickman St | City Garage, 101 W. Dickman (Sagamore, opened 2016) |
| **2014-05-02** | $8,000,000 | 2101 Race St / 151 McComas St | peninsula parcel |
| **2016-07-01** | **$70,300,000** (sum) | 101/201 Cromwell + 2701/2601/2551/2501 Port Covington | matches exactly the Baltimore Sun's "Under Armour buys Port Covington land for $70.3 million," July 2016 |
| 2016-04-04 / 2016-12-27 | $5.6M / $3.3M | McComas / Cromwell | later assemblage parcels |

The July 1, 2016 cluster sums to **precisely $70.3 million** — the exact figure the Baltimore Sun
reported for Under Armour's Port Covington land purchase that month. The SDAT primary record and the
contemporaneous reporting corroborate each other to the dollar.

## What this establishes (candidate_only)

The Port Covington assemblage transferred in **2014–2016**, two to four years before the tract was
designated an Opportunity Zone in June 2018. Owner-entity attribution to Kevin Plank's Sagamore
Development rests on the public reporting (Baltimore Sun; ProPublica), since owner names are redacted
from the open SDAT dataset; the deed *dates and considerations* are primary. Together they upgrade L2
from "reported ownership" to **deed-dated pre-designation ownership** — the cleanest documented
instance of the place-formation "patient ownership positioned before activation" stage, now anchored
in the county record.

The boundary holds: acquiring land years before a later federal designation is lawful. This documents
the sequence with primary records; the Treasury IG and Senate Finance inquiries are the adjudicators.

## Methodological result

The deed layer is **not uniformly photonic.** For any jurisdiction that exposes property data via
Socrata or a comparable open-data API, it is structured and cheap-tier — the same "structured behind
an interface" pattern as SEC EDGAR. The remaining photonic wall is the subset of counties whose only
public surface is a JS-rendered viewer with no API. `md-property-deeds.py` closes Maryland.
