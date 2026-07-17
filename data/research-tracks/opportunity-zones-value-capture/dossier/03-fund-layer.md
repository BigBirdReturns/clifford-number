# Fund layer — the SEC Form-D null (why the QOF vehicle is a red herring)

The Qualified Opportunity Fund is where most "who cashed in" coverage looks. The record says it is the
wrong layer for the *pre-positioning* question.

## What the SEC record shows

Retrieved live from SEC EDGAR full-text search (`tools/adapters/sec-edgar-fts.py`), Form-D filings:

| query | window | Form-D hits | earliest |
|---|---|---|---|
| "qualified opportunity fund" | 2018-01-01 .. 2018-06-13 (pre/at designation) | **0** | — |
| "qualified opportunity fund" | 2019 | 16 | 2019-01-04 |
| "opportunity zone" (broad) | 2018 | 22 | **2018-06-21** |

The earliest fund vehicle of any phrasing (2018-06-21) postdates the June 14, 2018 final designation
by one week. The QOF framework's proposed regulations did not appear until October 2018. **The fund
vehicle cannot carry a pre-positioning signal — it did not exist before the benefit was conferred.**

## What this reduces the question to

If pre-positioning exists, it is upstream of the fund: **land ownership and the nomination decision.**
That is exactly where the documented instances live (see the Case Summary and Land-Layer ledger). The
methodological finding is durable: point a QOF-formation screen at the positioning question and you
get a null; the signal is at the land + designation-discretion layer.

## Provenance and cost

Structured, cheap-tier retrieval: the SEC surface is JSON behind a User-Agent, driven by Haiku via the
adapter at ~$0.07/run (or the browser where a sandbox proxy blocks the CLI). Independently reproducible.
