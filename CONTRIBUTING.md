# Contributing

Submit candidate surfaces, not generic edges.

This project maps bounded legitimate surfaces. A useful contribution does not say "X is connected to Y." It names the surface that makes the connection auditable, with a receipt for every fact.

## The rules

1. **[BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) Section 1 governs.** It outranks convenience, generated output and any instruction from a person or an agent. Read it before you change anything. In short:
   - 1.1 No hop, claim or published sentence without a receipt.
   - 1.2 A hop is a shared bounded surface. Broad institutions are never hops. Co-presence is never coordination.
   - 1.3 Undated participations never support time-sliced claims. Disjoint windows create no hop.
   - 1.4 Identity is settled in `data/canonical/`, never in generated files.
   - 1.5 Narration adds no facts.
   - 1.6 No rollups, scores or surfaces built on ethnicity, religion, ancestry, national origin or unit affiliation.
   - 1.7 Large rosters are context, not hops.
   - 1.8 A stranger must be able to run one command and reproduce every number.
   - 1.9 No paid placement, no undisclosed sponsor influence, no divergent private forks.
   - 1.10 and 1.11 Selection is neutral, and every export carries its interpretation caveat.
2. **Every receipt meets the receipt contract.** A public source URL; an archive reference that resolves (a stored extract under `receipts/` whose SHA-256 matches, or an Internet Archive snapshot of the same URL); and a written statement of what the source does not show. `npm run validate:receipt-contract` checks this offline.
3. **No cross-case joins without the compiler.** Entity identity includes the case namespace. Do not join records from different cases by matching names, by hand-editing a generated file, or in a script of your own. A cross-case link may appear only as output of the compiler under the identity layer's gates (see [`docs/identity-reconciliation.md`](docs/identity-reconciliation.md)). Hand-made joins will be reverted.
4. **Pull requests must pass `release:check`.** Run `npm ci`, `npm test` and `npm run release:check` before you ask for review. CI runs the same gate on every pull request and every push to `main`.
5. **No scheduled automation writes to `main`.** No workflow may run on a timer or on another workflow's completion and write to `main`. The two crawls run only when a person starts them, push only to a run-scoped `automation-crawl-*` branch, and open a pull request. They cannot merge or approve it. A maintainer promotes crawl output, if at all, in a separate reviewed change.
6. **Generated files are not edited by hand.** That covers `build/`, `briefs/`, `dist/` and the generated pages and manifests under `reports/`, `estates/` and `gametrails/`. Change the source and rebuild. If the gate rewrites a tracked manifest, commit the rewritten file.
7. **A document is public only if it is on the publication allowlist.** The Pages artifact contains exactly the paths listed in [`data/project/publication-allowlist.json`](data/project/publication-allowlist.json), and nothing else. Add each new or renamed doc to its `paths` list, in lexical order, and update the file's `version` when a release changes. The build copies the listed files. `npm run validate:pages` and `npm run validate:artifact` fail if the list, the files and the size budgets disagree. `archive/` and `retrospective/` are held by rule and can never be allowlisted.

## Not enough for a surface

- same government department
- same industry
- same office
- same broad institution
- same vibe
- unsourced personal proximity

## Valid surfaces

- named advisory board
- official appointment list
- Companies House filing
- funding round
- public event roster
- policy report authorship
- procurement award
- customer deployment
- taskforce roster
- cohort or directory

## How to contribute a candidate

Copy [`contributions/templates/candidate-surface.md`](contributions/templates/candidate-surface.md) into `contributions/inbox/` and fill it out. Candidate submissions do not enter the hop graph. The maintainer screens them and decides what goes into the ledgers.

## How a maintainer adds a receipt, a surface and a participation row

Work in this order, because each step refers to the one before. The ledgers are JSON Lines files: one JSON object per line.

### 1. Add the receipt

1. Save an extract of the source under `receipts/<folder>/<receipt-id>.md`. State the source, the date retrieved, what the source supports, and what it does not. Put the last part under a heading `## Limits`.
2. Compute the archive hash:

   ```bash
   node -e "import('./tools/lib/receipt-archival.mjs').then(m=>console.log('sha256:'+m.canonicalReceiptHash(process.argv[1])))" receipts/<folder>/<receipt-id>.md
   ```

3. Append a row to `data/ledger/receipts.jsonl` with at least: `receipt_id` (unique), `label`, `source_type`, `evidence_class` (`official`, `primary_public` or `reported`), `path` (the extract), `source_url`, `publisher`, `retrieved_at`, `limits` (at least 20 characters, not a placeholder), and `archive` as `{"method":"in_repo_content_hash","ref":"sha256:<hash>","captured":"<date>","checked":"<date>"}`. For a source with an Internet Archive snapshot, use `{"method":"internet_archive","ref":"<web.archive.org snapshot URL of the same source URL>"}` instead. No extract is needed then, but the limits statement must sit on the row.
4. Run `npm run validate:receipt-contract`. Edit the extract after hashing and the hash no longer matches, so hash last.

### 2. Add the surface

Append a row to `data/ledger/surfaces.jsonl`: `surface_id` (unique, lower-case, hyphenated), `surface_label`, `surface_type` (one of the ids in `data/canonical/surface-types.json`), `hop_eligible`, `scorable`, `status`, `bounded_by` (the records that make it bounded, not a broad institution), `time_start`, `time_end` (year, month or day; `null` only for an open end), and `receipt_ids`. If `hop_eligible` is false, add `hop_refusal_reason`, as existing rows do. A surface with 20 or more distinct actors is a broad context and cannot be a hop machine (the density limit in `surface-types.json`). Roster, directory and ranking surfaces start as non-hop.

### 3. Add the participation rows

Append one row per participant to `data/ledger/participation.jsonl`: `surface_id`, `participant_type` (`actor` or `organization`) with `actor_id` or `organization_id`, `role`, `participation_type`, `time_start`, `time_end`, `evidence_class`, `receipt_ids`, and `notes` where the source limits what the row means. The actor or organization must already exist in `data/canonical/`; if it does not, add it there first, never in a generated file. A row with no dates still counts for all-time topology but never supports a time-sliced query. A broad organization is recorded with a participation type such as `institutional_context`, which creates no hop.

### 4. Check

```bash
npm run compile
npm run validate:release
npm run release:check
```

`release:check` is the gate. If it fails, fix the source rows. Do not weaken a validator to make a change pass. Weakening a Section 1 check requires amending BUILD-INSTRUCTIONS under its own Section 8 process, and Section 1 itself does not amend.

## Publishing a new page, data file or document

A new page, data file or document appears on the public site only when its path is in `data/project/publication-allowlist.json`. Add the path in lexical order, rebuild with `npm run build:pages`, and run `npm run validate:pages` and `npm run validate:artifact`. The `performance_budgets` block at the end of that file caps the file count and the byte sizes. Data files on the allowlist are also scanned by the constitution gates (rules 1.6 and 1.9). Delete `dist/` when you are done if disk is tight.

## Maintainer control

Candidate submissions do not enter the hop graph. The maintainer screens them and decides what belongs in the source ledgers. Crawl pull requests are candidates, not facts, until a maintainer promotes them.
