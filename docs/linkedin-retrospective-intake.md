# LinkedIn retrospective attention intake

This intake reconstructs a researcher's own prior LinkedIn attention from a
LinkedIn member-data archive and indexes profile PDFs the researcher personally
preserved. It is retrospective; it is not a live feed, account monitor, or
unattended LinkedIn crawler.

LinkedIn's larger account archive can contain dated URLs for the member's own
reactions, saved items, comments, shares or reposts, votes, follows, and search
queries. It does not establish a complete history of posts the member merely
viewed. Passive views require a separately preserved browser-history export or
another local receipt.

LinkedIn-generated profile PDFs are a different receipt class. Their embedded
creation timestamp and profile hyperlink preserve what a named profile
displayed at capture time. They do not independently verify every role claim,
identity match, relationship, motive, or coordination described or implied by
the profile.

## Import

1. In LinkedIn, open **Settings & Privacy → Data Privacy → Get a copy of your
   data** and request the larger archive.
2. Download and extract the archive locally.
3. Run:

```bash
npm run import:linkedin -- --input /path/to/extracted/archive --since 2024-07-13
npm run fanout
npm run validate:fanout
```

The importer selects only the fields needed to reconstruct attention. It does
not copy email addresses, message archives, contacts, login records, or other
unrelated account data. The output is written to
`data/local/linkedin-attention.jsonl`, which is gitignored because it is a
private research intake artifact.

## Import preserved profile PDFs

The profile-PDF importer requires Python 3 and `pypdf`. Set `PYTHON` when the
interpreter is not on `PATH`.

```bash
npm run import:linkedin-profiles -- --input /path/to/saved/profile-pdfs
npm run extract:linkedin-profile-claims
npm run build:linkedin-role-crossings
npm run build:linkedin-heatmap
npm run fanout
npm run validate:fanout
```

Repeat `--input` to merge separately preserved directories into one manifest:

```bash
npm run import:linkedin-profiles -- \
  --input /path/to/earlier/profile-pdfs \
  --input /path/to/additional/profile-pdfs
```

The merge is content-addressed. Existing output rows and additional captures
are unioned by SHA-256, so an additional directory cannot silently replace the
earlier intake and mirrored copies do not inflate the capture count. Use
`--existing-manifest /path/to/older.jsonl` to merge another prior manifest while
preserving its original provenance fields. `--replace` is the explicit escape
hatch for a clean rebuild.

The importer hashes every PDF, reads its embedded creation date and exact
LinkedIn hyperlink, extracts the displayed name from the PDF's visual text
layer, and stores a content-addressed private copy. It writes only bounded
metadata to `data/local/linkedin-profile-captures.jsonl`; it does not copy
phone numbers, email addresses, or the profile's full text into the manifest.
Content-identical backup mirrors are deduplicated by SHA-256. Repeated captures
of the same profile remain separate observations and share a `series_id` so a
reviewer can examine change over time.

Every imported row is `private_intake`, `machine_proposed_unverified`, and
`graph_effect: none`. Fan-out turns each row into a bounded local research task.
Opening the original public URL, preserving a source receipt, resolving public
actors and institutions, and making any factual claim remain separate review
steps. A reaction, save, follow, or search proves only that member action; it
does not prove the content of the target post or any relationship among people
who interacted with it.

For profile captures, the review task is to extract public-role and
organization claims as separately typed candidates, compare captures in the
same series, resolve identity, and seek independent public receipts for
material crossings. The preserved profile is itself a primary observation of
what LinkedIn displayed at that time; its underlying biographical claims still
retain source-specific limits.

`extract:linkedin-profile-claims` performs that second step. It keeps only the
displayed person, public profile URL, organization, title, stated role interval,
capture time, source page, and PDF hash. Phone numbers, email addresses, street
addresses, skills, and narrative descriptions are excluded. The resulting
gitignored `data/local/linkedin-profile-role-claims.jsonl` records are eligible
to satisfy `self_claimed_identity`, `self_claimed_role`, and
`self_claimed_affiliation` receipt roles. They are not eligible by themselves
to establish independent identity, beneficial ownership, a transaction,
influence, coordination, or wrongdoing.

This also prevents the opposite failure: a LinkedIn role tuple is not discarded
merely because it is self-claimed. It remains a timestamped primary observation
of what the named profile publicly represented at capture time. Corroboration
can change its status or weight without erasing it.

`build:linkedin-role-crossings` then pairs public-role and private-role tuples
for the same profile series. It records definite public-to-private sequences,
definite overlap, same-capture dual hats, and temporal unknowns separately.
Every candidate carries both role-claim IDs and remains
`machine_proposed_pending_review` with `graph_effect: none`; this is a discovery
map, not an influence or wrongdoing inference.

## Build the private attention heatmap

`npm run build:linkedin-heatmap` combines both private manifests into
`data/local/linkedin-attention-heatmap.json`. It preserves raw observation IDs
while grouping repeat activity by exact target URL, normalized private search
query, month/category, and profile-capture series. Exact profile-name matches
against activity summaries are discovery joins only. Frequency is explicitly a
measure of the researcher's preserved attention, not platform-wide popularity,
a social relationship, coordination, causation, or wrongdoing.
