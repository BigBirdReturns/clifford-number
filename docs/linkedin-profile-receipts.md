# LinkedIn profile receipts

## What the captures are

`receipts/linkedin-profile-captures/raw/liprof_*.pdf` holds 484 LinkedIn-generated
profile PDFs ("Save to PDF" exports) that the researcher saved between
2025-03-02 and 2026-07-14. They cover 440 distinct profile URLs. Some profiles
were saved more than once, and those captures share a `series_id`. Each PDF
shows what the profile displayed when it was saved: name, headline and role
entries (organization, title, stated dates).

`receipts/linkedin-profile-captures/captures.jsonl` is the capture manifest,
one row per PDF. It gives the `capture_id` (which is also the file name), the
SHA-256, byte length, page count, the embedded PDF creation date
(`observed_at`) and the profile URL. The `provenance.raw_copy` field still
names the old private location (`data/local/...`). The in-repo copy is
`raw/<capture_id>.pdf`.

## Where they came from

The PDFs and manifest were copied unchanged on 2026-10-23 from the owner's
preserved private layer:
`W:\Incoming\DataArray\Projects\Products\Clifford-Number\recovery\2026-07-17-pre-sync-clean\private\linkedin-data-local\`.
The full machine-extracted role claims (4,122) and crossing candidates (2,257)
from the same layer are in `receipts/linkedin-profile-captures/derived/`.

## Owner decision (2026-10-23)

Captured LinkedIn profiles are public information. They go into the repository
as receipts. The only private material is the owner's own LinkedIn attention
log (`data/local/linkedin-attention*.jsonl` and the attention heatmap). It
stays out of the repository and was not copied.

## Hash check

Every PDF was hashed after the copy and checked against the SHA-256 and byte
length in `captures.jsonl`. Result: 484 of 484 matched, 0 mismatched, 0
missing, 0 extra, 27,556,347 bytes of PDF. The ledger's receipt contract
(`tools/lib/receipt-contract.mjs`) re-checks the hash of every referenced PDF
(`archive.method: in_repo_content_hash`). PDFs are hashed as raw bytes, with no
line-ending normalization.

## How receipts use them

`tools/promote-intake-linkedin-crossings.mjs` stages crossings into
`data/ledger/staging/linkedin-crossings/`. A crossing is a public-employer role
and a private role on the same profile, in either direction. Each staged
receipt is one capture:

- `path`: `receipts/linkedin-profile-captures/raw/<capture_id>.pdf`
- `source_url`: the profile URL
- `archive`: `{ method: in_repo_content_hash, ref: sha256:…, captured }`
- `retrieved_at`: the capture date
- `evidence_class`: `reported`
- `limits`: the export is self-reported by the subject at capture time and
  does not verify employment, dates or titles against official records.

A self-reported profile is only a lead. It is not corroboration. Nothing in
staging is merged into `data/ledger/` until a merge owner decides.
