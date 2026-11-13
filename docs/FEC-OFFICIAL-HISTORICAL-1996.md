# Original official FEC 1995–1996 source population and continuity, 2026-11-03

This local research adapter extends the accepted official 1991–1992 and 1993–1994 committee-master and intercommittee-reported-transaction files through the 1995–1996 cycle. The selection unit is the **entire official two-file cycle population**, never a named political actor or a topical shortlist.

Primary archived originals:
- [Official 1996 committee master](https://www.fec.gov/files/bulk-downloads/1996/cm96.zip), original ZIP 517,003 bytes, SHA256 `4678cf5ca9a78fc4fa3560abdf511a262a43eaee9d0d5a90d025162f28eaee28`, member `cm.txt`, 11,075 original rows.
- [Official 1996 other-committee transaction file](https://www.fec.gov/files/bulk-downloads/1996/oth96.zip), original ZIP 5,676,962 bytes, SHA256 `26cf201ea3a66e79e1aaf50b8c97e24b2119a23227ccf1f728fc946338180c0d`, member `itoth.txt`, 312,193 source-reported rows.
- [Committee field definitions](https://www.fec.gov/campaign-finance-data/committee-master-file-description/), [transaction definitions](https://www.fec.gov/campaign-finance-data/any-transaction-one-committee-another-file-description/) and [source-use restriction](https://www.fec.gov/updates/sale-or-use-contributor-information/).

Two exact original ZIP bodies and capture receipts live in the existing owner-private `sessions/integrity-acquisition-20261102/ecology/expansion-canary/fec-1996/`. There is no raw source body, person/donor field, source DB, unpublished factual review, private name list or FEC transaction corpus in this Git change. The original public site and canonical claim graphs remain unchanged.

## Original-source evidence

The original parser accepts all 11,075 FEC committee IDs and 312,193 unique source-native transaction `SUB_ID` rows. Exactly 311,430 transaction dates parse inside the declared 1995–1996 cycle, 733 parse outside the cycle, 29 are absent and one is a source-future-date anomaly. The anomalous source date remains an anomaly rather than a verified future event or commitment.

The original reciprocal-report reconciliation matches opposing FEC `24G/18G`, `24K/18K`, and `24Z/15Z` type codes, filing committee IDs, counterparty committee IDs, reported dates and exact amounts. It retains 899 affiliated-transfer, 1,100 nonaffiliated-contribution and 144 in-kind **source-report correspondence groups**, 2,143 groups overall. These groups represent matching reports, not 2,143 uniquely settled transfers; amendments and mirrored reports may duplicate an economic event.

New `tools/ecology_fec_crosscycle.py` validates all three original source-archive hashes and reconstructs **10,401 same-FEC-committee-ID continuities across at least two of the 1992, 1994 and 1996 source masters**, including 6,765 IDs appearing in all three. Of these, 821 have differing exact original committee labels across editions. Each preserved JSONL connection contains the source-native FEC ID, original committee label, archive URL, original ZIP SHA256, file row and original row SHA256 per observed edition. An example is committee `C00000042`: the official 1992 label is “ILLINOIS TOOL WORKS INC POLITICAL ACTION COMMITTEE,” whereas the 1994 and 1996 masters use “ILLINOIS TOOL WORKS FOR BETTER GOVERNMENT COMMITTEE.” The recurring FEC identifier supports source-register continuity; a legal name change, corporate-control assertion or transfer of funds requires independent evidence.

## Boundaries and adoption

All additions run with the existing qualified Python environment and original source hashes. Prior 1992 and 1994 parser/rights/identity tests remain part of the regression suite, including rejection of unsupported 1998 source-family routes. Original FEC field positions and source ID namespaces stay unchanged. Derived committee records omit treasurer, address and other individual fields. Derived transactions omit individual name/address/employer/occupation/memo text; their source money values are **reported per-row amounts** rather than payment/outlay, unique economic events, contract obligations or accepted causal effects.

The production three-lane acquisition owns the shared ecology DB and exclusive lock. This feature remains a separately accepted original-source candidate until that owner is terminal and explicit source-hash/DB/FTS/idempotence tests accept a controlled live ingestion. Existing W01 reader/version and public Pages remain unchanged until separately verified. Human identity adjudication, financial settlement, ultimate corporate ownership, political influence and event attendance remain unreviewed.

Native continuation:
- Source captures and receipts: `ecology/expansion-canary/fec-1996/`.
- Typed original rows: `fec-1996/source-accepted/`.
- Reciprocal candidates: `fec-1996/FEC-1996-RECIPROCAL-REPORTS.json`.
- Cross-cycle continuity: `fec-1996/reconciliation/FEC-1992-1996-COMMITTEE-CONTINUITIES.jsonl` and `FEC-1992-1996-CONTINUITY-SUMMARY.json`.
- Acceptance tests: `test/test_ecology_fec_1996.py`, `test/test_ecology_fec_crosscycle.py` and existing FEC 1992/1994 original-source tests.
