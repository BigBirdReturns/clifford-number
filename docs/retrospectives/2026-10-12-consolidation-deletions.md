# Consolidation deletions, 2026-10-12

This is the record of what the 2026-10-12 consolidation milestone removed from `tools/`, `test/` and `package.json`. The first part below is the verbatim list that the validator-pruning work package (WP2) wrote for the workflow package: the 116 npm scripts it removed, the 495 files under `tools/` and 189 under `test/` it deleted and why, the workflows that referenced them, and the kept files it edited. Its section F listed the kept validators and tests that could not pass once the workflow package (WP3) reduced `.github/workflows` to five files, because each pins the exact bytes or git blob SHA of a now-deleted workflow file (or of a sibling validator removed with it) inside sealed data. The repository owner approved deleting them, and the consolidation green-up commit did so: 54 files (27 under `tools/`, 27 under `test/`), listed in the addendum after the verbatim text. The sealed data those files pinned was not edited and stays in place, and no data check in the release gate was weakened.

## Addendum: files deleted by the green-up commit

The 40 validators and tests listed in section F, the 9 tests that belong to the listed validators, `tools/validate-no-magic-human-gate.mjs` with its test (its workflow was removed by WP3), and 3 more files of the same class found by running every kept test and validator before and after the deletion: the rd04 state-implementation-intake validator (its sealed manifest pins a deleted workflow), and the m05 observation-time custody validator and test (they pin the git blob SHA of the deleted connection-authentication validator). 40 + 9 + 2 + 3 = 54 files.

- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs`
- `tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs`
- `tools/validate-no-magic-human-gate.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-mt-row-state-reconciliation-v1.py`
- `tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v3.py`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs`
- `tools/validate-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs`
- `tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs`
- `tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs`
- `tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs`
- `tools/validate-status-sovereignty-rd04-snap-route-adjudication-a04.py`
- `tools/validate-status-sovereignty-rd04-snap-source-availability-a02.mjs`
- `tools/validate-status-sovereignty-six-gate-first-pass-reconciliation.mjs`
- `test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.test.js`
- `test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js`
- `test/no-magic-human-gate.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js`
- `test/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.test.js`
- `test/status-sovereignty-rd-wave03-rd04-state-implementation-intake.test.js`
- `test/status-sovereignty-rd-wave03-rd05-member-participation-intake.test.js`
- `test/status-sovereignty-rd04-a06-full-corpus.test.js`
- `test/status-sovereignty-rd04-changed-input-gate-a09.test.js`
- `test/status-sovereignty-rd04-internal-adjudication-a08.test.js`
- `test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js`
- `test/status-sovereignty-rd04-snap-route-adjudication-a04.test.py`
- `test/status-sovereignty-rd04-snap-source-availability-a02.test.js`
- `test/status-sovereignty-six-gate-first-pass-reconciliation.test.js`

Not deleted, still failing outside the release gate, and unrelated to workflow files: validators that compare the branch diff with `origin/main` or a later ledger state (`validate-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs`, `...-state-source-adjudication.mjs`, `validate-status-sovereignty-rd-wave03-rd02-search-census.mjs`), a Python validator that needs environment variables (`...-nd-row-state-reconciliation-v2.py`), and the Playwright browser tests, which need an installed Chromium.

## Verbatim WP2 list (generated against base commit d8392cfb)

~~~~text
WP2 - pruned process-only validators, tests and npm scripts
==========================================================
Purpose: tell the workflow package which npm scripts and repo paths no longer exist, so
.github/workflows can drop references. Generated against base commit d8392cfb.

Summary: 116 of 160 npm scripts removed (44 remain);
         495 files removed under tools/, 189 under test/.
docs/, schemas/ and .github/ were NOT touched. data/, build/ and reports/ keep all inputs; only regenerated release manifests/reports changed (section E).

Remaining npm scripts (44): test, check, release:check, ensure:release-history, compile, compile:denominator, validate:denominator, compile:case-packets, validate:case-packets, compile:thesis, validate:thesis, fanout, validate:fanout, build:estate-fanout, validate:estate-fanout, build:cross-corpus-map, build:public-boundary, build:atlas-projection, build:pages, build:standalone, build:endpoint-standalone, build:artifact-manifest, validate:artifact, validate:pages, validate:release, validate:core-thesis, build:status-sovereignty, validate:status-sovereignty, build:poof-ecology, validate:poof-ecology, validate:crawl, crawl:official, crawl:audit, scout, validate:estate-closures, validate:estate-frontier-surveys, validate:estate-game-trails, validate:state-market-receipts, build:hops, query:hops, serve, smoke:public-routes, narrate, legacy:test

Notes for the workflow package
------------------------------
1. `npm run release:check` still exists and still runs the full kept gate (the project-stable-ground
   chain is the only step dropped from it). Workflows that only call `npm run release:check` need no change
   apart from deleting workflows whose subject was removed (preference-*, counter-selector-*, project-stable-ground-*,
   m04d/m04e/m04g wave workflows, status-sovereignty-residual-denominator-*).
2. The release manifests written by the kept builders (k0, m05, status-sovereignty, poof, ...) hash the exact bytes of
   package.json. After the final package.json lands (including any other package that edits it), run
   `npm run release:check`, commit the regenerated data/project/*release-manifest.json, build/ and reports/ files, then rerun.
   They no longer hash any .github/workflows file; section F lists the sealed validators that still do.
3. finalize-release-artifact refuses to run on a dirty tracked tree, so run release:check on a committed tree.
4. tools/validate-no-magic-human-gate.mjs and test/no-magic-human-gate.test.js were NOT deleted (the deletion was blocked pending user approval); they do not read workflow files.
5. Deleting .github/workflows/poof-clifford-ecology.yml (a protected POOF path) needs an appended receipt in data/project/poof-clifford-constitutional-change-log.json whose protected_paths_touched covers it.

A. npm scripts removed
-----------------------
ingest:master	[alias dropped; tool(s) kept, run with `node` (see command)]
build:research-graph	[alias dropped; tool(s) kept, run with `node` (see command)]
score	[alias dropped; tool(s) kept, run with `node` (see command)]
import:linkedin	[alias dropped; tool(s) kept, run with `node` (see command)]
import:linkedin-profiles	[alias dropped; tool(s) kept, run with `node` (see command)]
extract:linkedin-profile-claims	[alias dropped; tool(s) kept, run with `node` (see command)]
build:linkedin-heatmap	[alias dropped; tool(s) kept, run with `node` (see command)]
build:linkedin-role-crossings	[alias dropped; tool(s) kept, run with `node` (see command)]
build:linkedin-review-projection	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:linkedin-review-projection	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
compile:cases	[alias dropped; tool(s) kept, run with `node` (see command)]
build:report-frontier	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:report-frontier	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:report-frontier-pages	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:ctt-wrap-up	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:cross-corpus-map	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:m05-source-health-evidence-state	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:research-tracks	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:selection	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:consumption	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:officeholder	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
resolve:openfec	[alias dropped; tool(s) kept, run with `node` (see command)]
ingest:openfec-disbursements	[alias dropped; tool(s) kept, run with `node` (see command)]
ingest:fec-bulk-disbursements	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:disclosures	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:fec-cohort	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:fec-payees	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:oge-interests	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:oge-fec-overlap	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:oge-fec-temporal-screen	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:resolution-frontier	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
acquire:fec-oppexp	[alias dropped; tool(s) kept, run with `node` (see command)]
build:fec-payee-inventory	[alias dropped; tool(s) kept, run with `node` (see command)]
acquire:oge-interests	[alias dropped; tool(s) kept, run with `node` (see command)]
build:oge-fec-overlap	[alias dropped; tool(s) kept, run with `node` (see command)]
screen:oge-fec-temporal-overlap	[alias dropped; tool(s) kept, run with `node` (see command)]
recover:oge-temporal-dates	[alias dropped; tool(s) kept, run with `node` (see command)]
apply:oge-visual-date-corrections	[alias dropped; tool(s) kept, run with `node` (see command)]
build:oge-fec-embedded-names	[alias dropped; tool(s) kept, run with `node` (see command)]
build:sec-exact-overlap-intake	[alias dropped; tool(s) kept, run with `node` (see command)]
acquire:ny-registry-entities	[alias dropped; tool(s) kept, run with `node` (see command)]
acquire:trump-2016-candidate-disclosure	[alias dropped; tool(s) kept, run with `node` (see command)]
analyze:trump-2016-candidate-disclosure	[alias dropped; tool(s) kept, run with `node` (see command)]
build:fec-cohort	[alias dropped; tool(s) kept, run with `node` (see command)]
build:oge-locators	[alias dropped; tool(s) kept, run with `node` (see command)]
build:nara-locators	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:gov-property	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:portfolio	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
acquire:gov-property	[alias dropped; tool(s) kept, run with `node` (see command)]
control:fa03	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
acquire:icij-offshoreleaks	[alias dropped; tool(s) kept, run with `node` (see command)]
import:icij-panama	[alias dropped; tool(s) kept, run with `node` (see command)]
acquire:natsec100-award-controls	[alias dropped; tool(s) kept, run with `node` (see command)]
analyze:linkedin-crossings	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
build:corridor	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:corridor	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
build:routers	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:routers	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
build:estate-closures	[alias dropped; tool(s) kept, run with `node` (see command)]
build:estate-aperture	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:estate-aperture	[alias dropped; tool(s) kept, run with `node` (see command)]
build:estate-frontier-surveys	[alias dropped; tool(s) kept, run with `node` (see command)]
build:estate-game-trails	[alias dropped; tool(s) kept, run with `node` (see command)]
build:estate-frontier	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:estate-frontier	[alias dropped; tool(s) kept, run with `node` (see command)]
build:gametrails	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:gametrails	[alias dropped; tool(s) kept, run with `node` (see command)]
build:core-thesis	[alias dropped; tool(s) kept, run with `node` (see command)]
build:estate-lens-audit	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:estate-lens-audit	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
ci:core-thesis	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:core-thesis, validate:core-thesis, build:estate-lens-audit, validate:estate-lens-audit]
build:security-state-organism	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:security-state-organism	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
ci:security-state-organism	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:security-state-organism, validate:security-state-organism]
ci:status-sovereignty	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:status-sovereignty, validate:status-sovereignty]
build:k0	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
validate:k0	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
ci:poof-ecology	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:core-thesis, validate:core-thesis, build:k0, validate:k0, build:poof-ecology, validate:poof-ecology]
validate:poof-constitution	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
ci:poof-constitution	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:poof-constitution]
build:stable-ground	[tool deleted]
validate:stable-ground	[tool deleted]
ci:stable-ground	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:stable-ground, validate:stable-ground]
build:status-sovereignty-wave-01	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-wave-01	[alias dropped; tool(s) kept, run with `node` (see command)]
ci:status-sovereignty-wave-01	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:status-sovereignty-wave-01]
build:status-sovereignty-wave-01-review	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-wave-01-review	[alias dropped; tool(s) kept, run with `node` (see command)]
ci:status-sovereignty-wave-01-review	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:status-sovereignty-wave-01, validate:status-sovereignty-wave-01-review]
build:status-sovereignty-wave-01-targeted-acquisition	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-wave-01-targeted-acquisition	[alias dropped; tool(s) kept, run with `node` (see command)]
ci:status-sovereignty-wave-01-targeted-acquisition	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:status-sovereignty-wave-01-targeted-acquisition]
build:stable-ground-sg08	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:stable-ground-sg08	[tool deleted]
ci:stable-ground-sg08	[tool deleted]
build:status-sovereignty-second-party-review	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-second-party-review	[alias dropped; tool(s) kept, run with `node` (see command)]
build:stable-ground-sg09	[tool deleted]
validate:stable-ground-sg09	[tool deleted]
ci:stable-ground-sg09	[tool deleted]
build:status-sovereignty-wave-02-review	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-wave-02-review	[alias dropped; tool(s) kept, run with `node` (see command)]
ci:status-sovereignty-wave-02-review	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:status-sovereignty-wave-02-review, validate:status-sovereignty-wave-02-review]
build:status-sovereignty-wave02-second-party	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:status-sovereignty-wave02-second-party	[alias dropped; tool(s) kept, run with `node` (see command)]
build:stable-ground-sg10	[tool deleted]
validate:stable-ground-sg10	[tool deleted]
ci:stable-ground-sg10	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:stable-ground-sg10]
build:stable-ground-sg11	[alias dropped; tool(s) kept, run with `node` (see command)]
validate:stable-ground-sg11	[tool deleted]
ci:stable-ground-sg11	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: validate:stable-ground-sg11]
build:stable-ground-sg12	[tool deleted]
validate:stable-ground-sg12	[tool deleted]
ci:stable-ground-sg12	[alias dropped; tool(s) kept, run with `node` (see command) / chained scripts: build:stable-ground-sg12, validate:stable-ground-sg12]
validate:electric-twin-rights	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]
test:home	[inlined verbatim into `check` (same commands still run in the gate); use `npm run check` or the `node` command]

A.1 Full commands of the removed npm scripts (for mapping to `node` equivalents)
--------------------------------------------------------------------------
ingest:master: node tools/ingest-master.mjs
build:research-graph: node tools/build-graph.mjs
score: node tools/score-deniability.mjs
import:linkedin: node tools/import-linkedin-attention.mjs
import:linkedin-profiles: node tools/import-linkedin-profile-pdfs.mjs
extract:linkedin-profile-claims: node tools/extract-linkedin-profile-claims.mjs
build:linkedin-heatmap: node tools/build-linkedin-attention-heatmap.mjs
build:linkedin-role-crossings: node tools/build-linkedin-role-crossings.mjs
build:linkedin-review-projection: node tools/build-linkedin-targeted-review-projection.mjs
validate:linkedin-review-projection: node test/linkedin-targeted-review-projection.test.js
compile:cases: node tools/compile-cases.mjs
build:report-frontier: node tools/build-report-frontier.mjs && node tools/render-report-frontier.mjs
validate:report-frontier: node test/report-frontier.test.js
validate:report-frontier-pages: node tools/validate-report-frontier-pages.mjs
validate:ctt-wrap-up: node tools/validate-clifford-thiel-trump-wrap-up.mjs
validate:cross-corpus-map: node tools/validate-clifford-cross-corpus-public-interest-map.mjs
validate:m05-source-health-evidence-state: node tools/validate-m05-source-health-evidence-state-regression.mjs && node test/m05-source-health-evidence-state-regression.test.js
validate:research-tracks: node tools/validate-research-tracks.mjs
validate:selection: node tools/validate-corpus-selection.mjs
validate:consumption: node tools/validate-consumption-contract.mjs
validate:officeholder: node tools/validate-officeholder-cohort.mjs
resolve:openfec: node tools/resolve-openfec-cohort.mjs
ingest:openfec-disbursements: node tools/ingest-openfec-schedule-b.mjs
ingest:fec-bulk-disbursements: node tools/ingest-fec-bulk-oppexp.mjs
validate:disclosures: node tools/validate-disclosure-spine.mjs
validate:fec-cohort: node tools/validate-fec-oppexp-cohort.mjs
validate:fec-payees: node tools/validate-fec-payee-inventory.mjs
validate:oge-interests: node tools/validate-oge-beneficial-interests.mjs
validate:oge-fec-overlap: node tools/validate-oge-fec-overlap.mjs
validate:oge-fec-temporal-screen: node tools/validate-oge-fec-temporal-screen.mjs
validate:resolution-frontier: node tools/validate-resolution-frontier.mjs
acquire:fec-oppexp: node tools/acquire-fec-oppexp-cohort.mjs
build:fec-payee-inventory: node tools/build-fec-payee-inventory.mjs
acquire:oge-interests: node tools/acquire-oge-beneficial-interests.mjs
build:oge-fec-overlap: node tools/build-oge-fec-overlap.mjs
screen:oge-fec-temporal-overlap: node tools/screen-oge-fec-temporal-overlap.mjs
recover:oge-temporal-dates: node tools/recover-oge-temporal-dates.mjs
apply:oge-visual-date-corrections: node tools/apply-oge-visual-date-corrections.mjs
build:oge-fec-embedded-names: node tools/build-oge-fec-embedded-name-intake.mjs
build:sec-exact-overlap-intake: node tools/build-sec-exact-overlap-intake.mjs
acquire:ny-registry-entities: node tools/acquire-ny-registry-embedded-entities.mjs
acquire:trump-2016-candidate-disclosure: node tools/acquire-trump-2016-candidate-disclosure.mjs
analyze:trump-2016-candidate-disclosure: node tools/analyze-trump-2016-candidate-disclosure.mjs
build:fec-cohort: node tools/build-fec-oppexp-cohort-manifest.mjs
build:oge-locators: node tools/build-oge-locators.mjs
build:nara-locators: node tools/build-nara-locators.mjs
validate:gov-property: node tools/validate-gov-property.mjs
validate:portfolio: node tools/validate-portfolio-provenance.mjs
acquire:gov-property: node tools/acquire-gov-property-awards.mjs
control:fa03: node tools/fa03-positive-control.mjs
acquire:icij-offshoreleaks: node tools/acquire-icij-offshoreleaks.mjs
import:icij-panama: node tools/import-icij-panama.mjs
acquire:natsec100-award-controls: node tools/acquire-natsec100-award-controls.mjs
analyze:linkedin-crossings: node tools/analyze-linkedin-crossings.mjs
build:corridor: node tools/build-austin-israel-corridor.mjs
validate:corridor: node tools/validate-austin-israel-corridor.mjs
build:routers: node tools/build-person-routers.mjs
validate:routers: node tools/validate-person-routers.mjs
build:estate-closures: node tools/build-estate-closures.mjs
build:estate-aperture: node tools/render-estate-aperture.mjs
validate:estate-aperture: node tools/validate-estate-aperture-pages.mjs
build:estate-frontier-surveys: node tools/build-estate-frontier-surveys.mjs
build:estate-game-trails: node tools/build-estate-game-trails.mjs
build:estate-frontier: node tools/build-estate-frontier-surveys.mjs
validate:estate-frontier: node tools/validate-estate-frontier-surveys.mjs
build:gametrails: node tools/build-estate-game-trails.mjs && node tools/render-gametrail-aperture.mjs
validate:gametrails: node tools/validate-estate-game-trails.mjs && node tools/validate-gametrail-aperture-pages.mjs
build:core-thesis: node tools/build-core-thesis.mjs
build:estate-lens-audit: node tools/build-estate-lens-audit.mjs
validate:estate-lens-audit: node tools/validate-estate-lens-audit.mjs
ci:core-thesis: npm run build:core-thesis && npm run validate:core-thesis && node test/core-thesis.test.js && npm run build:estate-lens-audit && npm run validate:estate-lens-audit && node test/estate-lens-audit.test.js
build:security-state-organism: node tools/build-security-state-organism.mjs
validate:security-state-organism: node tools/validate-security-state-organism.mjs
ci:security-state-organism: npm run build:security-state-organism && npm run validate:security-state-organism && node test/security-state-organism.test.js
ci:status-sovereignty: npm run build:status-sovereignty && npm run validate:status-sovereignty && node test/status-sovereignty-wave-01.test.js && node test/status-sovereignty-wave-01-review.test.js && node test/status-sovereignty-wave-01-targeted-acquisition.test.js && node test/status-sovereignty-wave-01-second-party-review.test.js && node test/status-sovereignty-wave-02-intake.test.js && node test/status-sovereignty-w ...[truncated]
build:k0: node tools/build-k0-epistemic-admissibility.mjs
validate:k0: node tools/validate-k0-epistemic-admissibility.mjs
ci:poof-ecology: npm run build:core-thesis && npm run validate:core-thesis && node test/core-thesis.test.js && node tools/build-m05-answerable-power.mjs && node tools/validate-m05-answerable-power.mjs && node test/m05-answerable-power.test.js && npm run build:k0 && npm run validate:k0 && node test/k0-epistemic-admissibility.test.js && npm run build:poof-ecology && npm run validate:poof-ecology && node test/poof-cl ...[truncated]
validate:poof-constitution: node tools/validate-poof-constitutional-change.mjs
ci:poof-constitution: npm run validate:poof-constitution && node test/poof-constitutional-change.test.js
build:stable-ground: node tools/build-project-stable-ground-sg12.mjs
validate:stable-ground: node tools/validate-project-stable-ground-alignment.mjs && node test/project-stable-ground-alignment.test.js && node tools/validate-project-stable-ground-sg02.mjs && node test/project-stable-ground-sg02.test.js && node tools/validate-project-stable-ground-sg03.mjs && node test/project-stable-ground-sg03.test.js && node tools/validate-project-stable-ground-sg04.mjs && node test/project-stable-groun ...[truncated]
ci:stable-ground: npm run build:stable-ground && npm run validate:stable-ground
build:status-sovereignty-wave-01: node -e "console.log('SSC-W01 historical; no rebuild')"
validate:status-sovereignty-wave-01: node tools/validate-status-sovereignty-wave-01.mjs
ci:status-sovereignty-wave-01: npm run validate:status-sovereignty-wave-01 && node test/status-sovereignty-wave-01.test.js
build:status-sovereignty-wave-01-review: node -e "console.log('SSC-W01 maintainer review historical; no rebuild')"
validate:status-sovereignty-wave-01-review: node tools/validate-status-sovereignty-wave-01-review.mjs
ci:status-sovereignty-wave-01-review: npm run validate:status-sovereignty-wave-01 && npm run validate:status-sovereignty-wave-01-review && node test/status-sovereignty-wave-01.test.js && node test/status-sovereignty-wave-01-review.test.js
build:status-sovereignty-wave-01-targeted-acquisition: node -e "console.log('SSC-W01 targeted acquisition historical; no rebuild')"
validate:status-sovereignty-wave-01-targeted-acquisition: node tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs
ci:status-sovereignty-wave-01-targeted-acquisition: npm run validate:status-sovereignty-wave-01-targeted-acquisition && node test/status-sovereignty-wave-01-targeted-acquisition.test.js
build:stable-ground-sg08: node -e "console.log('SG-08 historical; no rebuild')"
validate:stable-ground-sg08: node tools/validate-project-stable-ground-sg08.mjs
ci:stable-ground-sg08: npm run validate:stable-ground-sg08 && node test/project-stable-ground-sg08.test.js
build:status-sovereignty-second-party-review: node tools/build-status-sovereignty-wave-01-second-party-review.mjs
validate:status-sovereignty-second-party-review: node tools/validate-status-sovereignty-wave-01-second-party-review.mjs
build:stable-ground-sg09: node tools/build-project-stable-ground-sg09.mjs
validate:stable-ground-sg09: node tools/validate-project-stable-ground-sg09.mjs
ci:stable-ground-sg09: npm run build:stable-ground-sg09 && npm run validate:stable-ground-sg09 && node test/project-stable-ground-sg09.test.js
build:status-sovereignty-wave-02-review: node tools/build-status-sovereignty-wave-02-review.mjs
validate:status-sovereignty-wave-02-review: node tools/validate-status-sovereignty-wave-02-review.mjs
ci:status-sovereignty-wave-02-review: npm run build:status-sovereignty-wave-02-review && npm run validate:status-sovereignty-wave-02-review && node test/status-sovereignty-wave-02-review.test.js
build:status-sovereignty-wave02-second-party: node tools/build-status-sovereignty-wave-02-second-party-review.mjs
validate:status-sovereignty-wave02-second-party: node tools/validate-status-sovereignty-wave-02-second-party-review.mjs && node test/status-sovereignty-wave-02-second-party-review.test.js
build:stable-ground-sg10: node tools/build-project-stable-ground-sg10.mjs
validate:stable-ground-sg10: node tools/validate-project-stable-ground-sg10.mjs && node test/project-stable-ground-sg10.test.js
ci:stable-ground-sg10: npm run validate:stable-ground-sg10
build:stable-ground-sg11: node -e "console.log('SG-11 historical; no rebuild')"
validate:stable-ground-sg11: node tools/validate-project-stable-ground-sg11.mjs && node test/project-stable-ground-sg11.test.js
ci:stable-ground-sg11: npm run validate:stable-ground-sg11
build:stable-ground-sg12: node tools/build-project-stable-ground-sg12.mjs
validate:stable-ground-sg12: node tools/validate-project-stable-ground-sg12.mjs && node test/project-stable-ground-sg12.test.js
ci:stable-ground-sg12: npm run build:stable-ground-sg12 && npm run validate:stable-ground-sg12
validate:electric-twin-rights: node tools/validate-electric-twin-class-rights.mjs
test:home: node test/home-model.test.js && node test/ui-contract.test.js

B. Files removed (tools/ and test/), grouped by reason
-----------------------------------------------------
## S1 preference chain (476)
test/preference-acquisition-request.test.js
test/preference-agenda.test.js
test/preference-allocation-formula.test.js
test/preference-attrition.test.js
test/preference-candidate-pair-blocking-recall-assurance.test.js
test/preference-causal-assurance.test.js
test/preference-choice-architecture.test.js
test/preference-choice-effectiveness.test.js
test/preference-collective-distribution.test.js
test/preference-comprehension-assurance.test.js
test/preference-criterion-score-use.test.js
test/preference-custody-manifest-v10.test.js
test/preference-custody-manifest-v11.test.js
test/preference-custody-manifest-v12.test.js
test/preference-custody-manifest-v13.test.js
test/preference-custody-manifest-v14.test.js
test/preference-custody-manifest-v15.test.js
test/preference-custody-manifest-v16.test.js
test/preference-custody-manifest-v17.test.js
test/preference-custody-manifest-v18.test.js
test/preference-custody-manifest-v19.test.js
test/preference-custody-manifest-v20.test.js
test/preference-custody-manifest-v21.test.js
test/preference-custody-manifest-v22.test.js
test/preference-custody-manifest-v23.test.js
test/preference-custody-manifest-v24.test.js
test/preference-custody-manifest-v25.test.js
test/preference-custody-manifest-v26.test.js
test/preference-custody-manifest-v27.test.js
test/preference-custody-manifest-v28.test.js
test/preference-custody-manifest-v29.test.js
test/preference-custody-manifest-v30.test.js
test/preference-custody-manifest-v31.test.js
test/preference-custody-manifest-v32.test.js
test/preference-custody-manifest-v33.test.js
test/preference-custody-manifest-v34.test.js
test/preference-custody-manifest-v35.test.js
test/preference-custody-manifest-v36.test.js
test/preference-custody-manifest-v37.test.js
test/preference-custody-manifest-v38.test.js
test/preference-custody-manifest-v39.test.js
test/preference-custody-manifest-v40.test.js
test/preference-custody-manifest-v41.test.js
test/preference-custody-manifest-v42.test.js
test/preference-custody-manifest-v43.test.js
test/preference-custody-manifest-v44.test.js
test/preference-custody-manifest-v45.test.js
test/preference-custody-manifest-v46.test.js
test/preference-custody-manifest-v47.test.js
test/preference-custody-manifest-v48.test.js
test/preference-custody-manifest-v49.test.js
test/preference-custody-manifest-v50.test.js
test/preference-custody-manifest-v51.test.js
test/preference-custody-manifest-v52.test.js
test/preference-custody-manifest-v53.test.js
test/preference-custody-manifest-v54.test.js
test/preference-custody-manifest-v55.test.js
test/preference-custody-manifest-v56.test.js
test/preference-custody-manifest-v57.test.js
test/preference-custody-manifest-v58.test.js
test/preference-custody-manifest-v59.test.js
test/preference-custody-manifest-v9.test.js
test/preference-custody-manifest.test.js
test/preference-custody.test.js
test/preference-deliberative-formation.test.js
test/preference-dynamic-change.test.js
test/preference-eligibility-outreach-assurance.test.js
test/preference-epistemic-quality.test.js
test/preference-equifinality.test.js
test/preference-equilibrium-assurance.test.js
test/preference-hard-to-enumerate-missingness-assurance.test.js
test/preference-human-companion.test.js
test/preference-human-validation-topology.test.js
test/preference-hybrid-architecture.test.js
test/preference-identity-boundary-assurance.test.js
test/preference-instrument-validity.test.js
test/preference-interference-mapping.test.js
test/preference-liability-remedy.test.js
test/preference-linkage-confidence-adjudication-assurance.test.js
test/preference-linkage-event-estimand-scope-interpretation-assurance.test.js
test/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.test.js
test/preference-linkage-interval-construction-assurance.test.js
test/preference-linkage-interval-method-partition-replication-deployment-assurance.test.js
test/preference-linkage-probability-calibration-assurance.test.js
test/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.test.js
test/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.test.js
test/preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.test.js
test/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.test.js
test/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.test.js
test/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.test.js
test/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.test.js
test/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.test.js
test/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.test.js
test/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.test.js
test/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.test.js
test/preference-linkage-score-calibration-assurance.test.js
test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js
test/preference-linkage-target-construction-exchangeability-assurance.test.js
test/preference-linkage-uncertainty-monitoring-assurance.test.js
test/preference-market-service-assurance.test.js
test/preference-network-formation.test.js
test/preference-package.test.js
test/preference-population-coverage-turnover-assurance.test.js
test/preference-population-frame-assurance.test.js
test/preference-pre-intake-assurance.test.js
test/preference-provenance-recovery.test.js
test/preference-real-case.test.js
test/preference-record-linkage-temporal-succession-assurance.test.js
test/preference-release-authority.test.js
test/preference-remedy-enforcement.test.js
test/preference-representation-custody.test.js
test/preference-service-denominator-assurance.test.js
test/preference-source-population-rule-assurance.test.js
test/preference-standing-matrix.test.js
test/preference-standing.test.js
test/preference-subgroup.test.js
test/preference-succession.test.js
test/preference-topology-assurance.test.js
test/preference-trust-federation.test.js
tools/compile-preference-acquisition-request.mjs
tools/compile-preference-agenda.mjs
tools/compile-preference-allocation-formula.mjs
tools/compile-preference-attrition.mjs
tools/compile-preference-candidate-pair-blocking-recall-assurance.mjs
tools/compile-preference-causal-assurance.mjs
tools/compile-preference-choice-architecture.mjs
tools/compile-preference-choice-effectiveness.mjs
tools/compile-preference-collective-distribution.mjs
tools/compile-preference-comprehension-assurance.mjs
tools/compile-preference-criterion-score-use.mjs
tools/compile-preference-custody-manifest-v10.mjs
tools/compile-preference-custody-manifest-v11.mjs
tools/compile-preference-custody-manifest-v12.mjs
tools/compile-preference-custody-manifest-v13.mjs
tools/compile-preference-custody-manifest-v14.mjs
tools/compile-preference-custody-manifest-v15.mjs
tools/compile-preference-custody-manifest-v16.mjs
tools/compile-preference-custody-manifest-v17.mjs
tools/compile-preference-custody-manifest-v18.mjs
tools/compile-preference-custody-manifest-v19.mjs
tools/compile-preference-custody-manifest-v20.mjs
tools/compile-preference-custody-manifest-v21.mjs
tools/compile-preference-custody-manifest-v22.mjs
tools/compile-preference-custody-manifest-v23.mjs
tools/compile-preference-custody-manifest-v24.mjs
tools/compile-preference-custody-manifest-v25.mjs
tools/compile-preference-custody-manifest-v26.mjs
tools/compile-preference-custody-manifest-v27.mjs
tools/compile-preference-custody-manifest-v28.mjs
tools/compile-preference-custody-manifest-v29.mjs
tools/compile-preference-custody-manifest-v30.mjs
tools/compile-preference-custody-manifest-v31.mjs
tools/compile-preference-custody-manifest-v32.mjs
tools/compile-preference-custody-manifest-v33.mjs
tools/compile-preference-custody-manifest-v34.mjs
tools/compile-preference-custody-manifest-v35.mjs
tools/compile-preference-custody-manifest-v36.mjs
tools/compile-preference-custody-manifest-v37.mjs
tools/compile-preference-custody-manifest-v38.mjs
tools/compile-preference-custody-manifest-v39.mjs
tools/compile-preference-custody-manifest-v40.mjs
tools/compile-preference-custody-manifest-v41.mjs
tools/compile-preference-custody-manifest-v42.mjs
tools/compile-preference-custody-manifest-v43.mjs
tools/compile-preference-custody-manifest-v44.mjs
tools/compile-preference-custody-manifest-v45.mjs
tools/compile-preference-custody-manifest-v46.mjs
tools/compile-preference-custody-manifest-v47.mjs
tools/compile-preference-custody-manifest-v48.mjs
tools/compile-preference-custody-manifest-v49.mjs
tools/compile-preference-custody-manifest-v50.mjs
tools/compile-preference-custody-manifest-v51.mjs
tools/compile-preference-custody-manifest-v52.mjs
tools/compile-preference-custody-manifest-v53.mjs
tools/compile-preference-custody-manifest-v54.mjs
tools/compile-preference-custody-manifest-v55.mjs
tools/compile-preference-custody-manifest-v56.mjs
tools/compile-preference-custody-manifest-v57.mjs
tools/compile-preference-custody-manifest-v58.mjs
tools/compile-preference-custody-manifest-v59.mjs
tools/compile-preference-custody-manifest-v9.mjs
tools/compile-preference-custody-manifest.mjs
tools/compile-preference-custody.mjs
tools/compile-preference-deliberative-formation.mjs
tools/compile-preference-dynamic-change.mjs
tools/compile-preference-eligibility-outreach-assurance.mjs
tools/compile-preference-epistemic-quality.mjs
tools/compile-preference-equifinality.mjs
tools/compile-preference-equilibrium-assurance.mjs
tools/compile-preference-hard-to-enumerate-missingness-assurance.mjs
tools/compile-preference-human-companion.mjs
tools/compile-preference-human-validation-topology.mjs
tools/compile-preference-hybrid-architecture.mjs
tools/compile-preference-identity-boundary-assurance.mjs
tools/compile-preference-instrument-validity.mjs
tools/compile-preference-interference-mapping.mjs
tools/compile-preference-liability-remedy.mjs
tools/compile-preference-linkage-confidence-adjudication-assurance.mjs
tools/compile-preference-linkage-event-estimand-scope-interpretation-assurance.mjs
tools/compile-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs
tools/compile-preference-linkage-interval-construction-assurance.mjs
tools/compile-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs
tools/compile-preference-linkage-probability-calibration-assurance.mjs
tools/compile-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs
tools/compile-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs
tools/compile-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs
tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs
tools/compile-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
tools/compile-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs
tools/compile-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs
tools/compile-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs
tools/compile-preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs
tools/compile-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs
tools/compile-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs
tools/compile-preference-linkage-score-calibration-assurance.mjs
tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs
tools/compile-preference-linkage-uncertainty-monitoring-assurance.mjs
tools/compile-preference-market-service-assurance.mjs
tools/compile-preference-network-formation.mjs
tools/compile-preference-package.mjs
tools/compile-preference-population-coverage-turnover-assurance.mjs
tools/compile-preference-population-frame-assurance.mjs
tools/compile-preference-pre-intake-assurance.mjs
tools/compile-preference-provenance-recovery.mjs
tools/compile-preference-real-case.mjs
tools/compile-preference-record-linkage-temporal-succession-assurance.mjs
tools/compile-preference-release-authority.mjs
tools/compile-preference-remedy-enforcement.mjs
tools/compile-preference-representation-custody.mjs
tools/compile-preference-service-denominator-assurance.mjs
tools/compile-preference-source-population-rule-assurance.mjs
tools/compile-preference-standing-matrix.mjs
tools/compile-preference-standing.mjs
tools/compile-preference-subgroup.mjs
tools/compile-preference-succession.mjs
tools/compile-preference-topology-assurance.mjs
tools/compile-preference-trust-federation.mjs
tools/lib/preference-acquisition-request.mjs
tools/lib/preference-agenda.mjs
tools/lib/preference-allocation-formula.mjs
tools/lib/preference-attrition.mjs
tools/lib/preference-candidate-pair-blocking-recall-assurance.mjs
tools/lib/preference-causal-assurance.mjs
tools/lib/preference-choice-architecture.mjs
tools/lib/preference-choice-effectiveness.mjs
tools/lib/preference-collective-distribution.mjs
tools/lib/preference-comprehension-assurance.mjs
tools/lib/preference-criterion-score-use.mjs
tools/lib/preference-custody-manifest-v10.mjs
tools/lib/preference-custody-manifest-v11.mjs
tools/lib/preference-custody-manifest-v12.mjs
tools/lib/preference-custody-manifest-v13.mjs
tools/lib/preference-custody-manifest-v14.mjs
tools/lib/preference-custody-manifest-v15.mjs
tools/lib/preference-custody-manifest-v16.mjs
tools/lib/preference-custody-manifest-v17.mjs
tools/lib/preference-custody-manifest-v18.mjs
tools/lib/preference-custody-manifest-v19.mjs
tools/lib/preference-custody-manifest-v20.mjs
tools/lib/preference-custody-manifest-v21.mjs
tools/lib/preference-custody-manifest-v22.mjs
tools/lib/preference-custody-manifest-v23.mjs
tools/lib/preference-custody-manifest-v24.mjs
tools/lib/preference-custody-manifest-v25.mjs
tools/lib/preference-custody-manifest-v26.mjs
tools/lib/preference-custody-manifest-v27.mjs
tools/lib/preference-custody-manifest-v28.mjs
tools/lib/preference-custody-manifest-v29.mjs
tools/lib/preference-custody-manifest-v30.mjs
tools/lib/preference-custody-manifest-v31.mjs
tools/lib/preference-custody-manifest-v32.mjs
tools/lib/preference-custody-manifest-v33.mjs
tools/lib/preference-custody-manifest-v34.mjs
tools/lib/preference-custody-manifest-v35.mjs
tools/lib/preference-custody-manifest-v36.mjs
tools/lib/preference-custody-manifest-v37.mjs
tools/lib/preference-custody-manifest-v38.mjs
tools/lib/preference-custody-manifest-v39.mjs
tools/lib/preference-custody-manifest-v40.mjs
tools/lib/preference-custody-manifest-v41.mjs
tools/lib/preference-custody-manifest-v42.mjs
tools/lib/preference-custody-manifest-v43.mjs
tools/lib/preference-custody-manifest-v44.mjs
tools/lib/preference-custody-manifest-v45.mjs
tools/lib/preference-custody-manifest-v46.mjs
tools/lib/preference-custody-manifest-v47.mjs
tools/lib/preference-custody-manifest-v48.mjs
tools/lib/preference-custody-manifest-v49.mjs
tools/lib/preference-custody-manifest-v50.mjs
tools/lib/preference-custody-manifest-v51.mjs
tools/lib/preference-custody-manifest-v52.mjs
tools/lib/preference-custody-manifest-v53.mjs
tools/lib/preference-custody-manifest-v54.mjs
tools/lib/preference-custody-manifest-v55.mjs
tools/lib/preference-custody-manifest-v56.mjs
tools/lib/preference-custody-manifest-v57.mjs
tools/lib/preference-custody-manifest-v58.mjs
tools/lib/preference-custody-manifest-v59.mjs
tools/lib/preference-custody-manifest-v9.mjs
tools/lib/preference-custody-manifest.mjs
tools/lib/preference-custody.mjs
tools/lib/preference-deliberative-formation.mjs
tools/lib/preference-dynamic-change.mjs
tools/lib/preference-eligibility-outreach-assurance.mjs
tools/lib/preference-epistemic-quality.mjs
tools/lib/preference-equifinality.mjs
tools/lib/preference-equilibrium-assurance.mjs
tools/lib/preference-hard-to-enumerate-missingness-assurance.mjs
tools/lib/preference-human-companion.mjs
tools/lib/preference-human-validation-topology.mjs
tools/lib/preference-hybrid-architecture.mjs
tools/lib/preference-identity-boundary-assurance.mjs
tools/lib/preference-instrument-validity.mjs
tools/lib/preference-interference-mapping.mjs
tools/lib/preference-liability-remedy.mjs
tools/lib/preference-linkage-confidence-adjudication-assurance.mjs
tools/lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs
tools/lib/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs
tools/lib/preference-linkage-interval-construction-assurance.mjs
tools/lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs
tools/lib/preference-linkage-probability-calibration-assurance.mjs
tools/lib/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs
tools/lib/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs
tools/lib/preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs
tools/lib/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs
tools/lib/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
tools/lib/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs
tools/lib/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs
tools/lib/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs
tools/lib/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs
tools/lib/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs
tools/lib/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs
tools/lib/preference-linkage-score-calibration-assurance.mjs
tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
tools/lib/preference-linkage-target-construction-exchangeability-assurance.mjs
tools/lib/preference-linkage-uncertainty-monitoring-assurance.mjs
tools/lib/preference-market-service-assurance.mjs
tools/lib/preference-network-formation.mjs
tools/lib/preference-package.mjs
tools/lib/preference-population-coverage-turnover-assurance.mjs
tools/lib/preference-population-frame-assurance.mjs
tools/lib/preference-pre-intake-assurance.mjs
tools/lib/preference-provenance-recovery.mjs
tools/lib/preference-real-case.mjs
tools/lib/preference-record-linkage-temporal-succession-assurance.mjs
tools/lib/preference-release-authority.mjs
tools/lib/preference-remedy-enforcement.mjs
tools/lib/preference-representation-custody.mjs
tools/lib/preference-service-denominator-assurance.mjs
tools/lib/preference-source-population-rule-assurance.mjs
tools/lib/preference-standing-matrix.mjs
tools/lib/preference-standing.mjs
tools/lib/preference-subgroup.mjs
tools/lib/preference-succession.mjs
tools/lib/preference-topology-assurance.mjs
tools/lib/preference-trust-federation.mjs
tools/validate-preference-acquisition-request.mjs
tools/validate-preference-agenda.mjs
tools/validate-preference-allocation-formula.mjs
tools/validate-preference-attrition.mjs
tools/validate-preference-candidate-pair-blocking-recall-assurance.mjs
tools/validate-preference-causal-assurance.mjs
tools/validate-preference-choice-architecture.mjs
tools/validate-preference-choice-effectiveness.mjs
tools/validate-preference-collective-distribution.mjs
tools/validate-preference-comprehension-assurance.mjs
tools/validate-preference-criterion-score-use.mjs
tools/validate-preference-custody-manifest-v10.mjs
tools/validate-preference-custody-manifest-v11.mjs
tools/validate-preference-custody-manifest-v12.mjs
tools/validate-preference-custody-manifest-v13.mjs
tools/validate-preference-custody-manifest-v14.mjs
tools/validate-preference-custody-manifest-v15.mjs
tools/validate-preference-custody-manifest-v16.mjs
tools/validate-preference-custody-manifest-v17.mjs
tools/validate-preference-custody-manifest-v18.mjs
tools/validate-preference-custody-manifest-v19.mjs
tools/validate-preference-custody-manifest-v20.mjs
tools/validate-preference-custody-manifest-v21.mjs
tools/validate-preference-custody-manifest-v22.mjs
tools/validate-preference-custody-manifest-v23.mjs
tools/validate-preference-custody-manifest-v24.mjs
tools/validate-preference-custody-manifest-v25.mjs
tools/validate-preference-custody-manifest-v26.mjs
tools/validate-preference-custody-manifest-v27.mjs
tools/validate-preference-custody-manifest-v28.mjs
tools/validate-preference-custody-manifest-v29.mjs
tools/validate-preference-custody-manifest-v30.mjs
tools/validate-preference-custody-manifest-v31.mjs
tools/validate-preference-custody-manifest-v32.mjs
tools/validate-preference-custody-manifest-v33.mjs
tools/validate-preference-custody-manifest-v34.mjs
tools/validate-preference-custody-manifest-v35.mjs
tools/validate-preference-custody-manifest-v36.mjs
tools/validate-preference-custody-manifest-v37.mjs
tools/validate-preference-custody-manifest-v38.mjs
tools/validate-preference-custody-manifest-v39.mjs
tools/validate-preference-custody-manifest-v40.mjs
tools/validate-preference-custody-manifest-v41.mjs
tools/validate-preference-custody-manifest-v42.mjs
tools/validate-preference-custody-manifest-v43.mjs
tools/validate-preference-custody-manifest-v44.mjs
tools/validate-preference-custody-manifest-v45.mjs
tools/validate-preference-custody-manifest-v46.mjs
tools/validate-preference-custody-manifest-v47.mjs
tools/validate-preference-custody-manifest-v48.mjs
tools/validate-preference-custody-manifest-v49.mjs
tools/validate-preference-custody-manifest-v50.mjs
tools/validate-preference-custody-manifest-v51.mjs
tools/validate-preference-custody-manifest-v52.mjs
tools/validate-preference-custody-manifest-v53.mjs
tools/validate-preference-custody-manifest-v54.mjs
tools/validate-preference-custody-manifest-v55.mjs
tools/validate-preference-custody-manifest-v56.mjs
tools/validate-preference-custody-manifest-v57.mjs
tools/validate-preference-custody-manifest-v58.mjs
tools/validate-preference-custody-manifest-v59.mjs
tools/validate-preference-custody-manifest-v9.mjs
tools/validate-preference-custody-manifest.mjs
tools/validate-preference-custody.mjs
tools/validate-preference-deliberative-formation.mjs
tools/validate-preference-dynamic-change.mjs
tools/validate-preference-eligibility-outreach-assurance.mjs
tools/validate-preference-epistemic-quality.mjs
tools/validate-preference-equifinality.mjs
tools/validate-preference-equilibrium-assurance.mjs
tools/validate-preference-hard-to-enumerate-missingness-assurance.mjs
tools/validate-preference-human-companion.mjs
tools/validate-preference-human-validation-topology.mjs
tools/validate-preference-hybrid-architecture.mjs
tools/validate-preference-identity-boundary-assurance.mjs
tools/validate-preference-instrument-validity.mjs
tools/validate-preference-interference-mapping.mjs
tools/validate-preference-liability-remedy.mjs
tools/validate-preference-linkage-confidence-adjudication-assurance.mjs
tools/validate-preference-linkage-event-estimand-scope-interpretation-assurance.mjs
tools/validate-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs
tools/validate-preference-linkage-interval-construction-assurance.mjs
tools/validate-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs
tools/validate-preference-linkage-probability-calibration-assurance.mjs
tools/validate-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs
tools/validate-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs
tools/validate-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs
tools/validate-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs
tools/validate-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
tools/validate-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs
tools/validate-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs
tools/validate-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs
tools/validate-preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs
tools/validate-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs
tools/validate-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs
tools/validate-preference-linkage-score-calibration-assurance.mjs
tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs
tools/validate-preference-linkage-uncertainty-monitoring-assurance.mjs
tools/validate-preference-market-service-assurance.mjs
tools/validate-preference-network-formation.mjs
tools/validate-preference-package.mjs
tools/validate-preference-population-coverage-turnover-assurance.mjs
tools/validate-preference-population-frame-assurance.mjs
tools/validate-preference-pre-intake-assurance.mjs
tools/validate-preference-provenance-recovery.mjs
tools/validate-preference-real-case.mjs
tools/validate-preference-record-linkage-temporal-succession-assurance.mjs
tools/validate-preference-release-authority.mjs
tools/validate-preference-remedy-enforcement.mjs
tools/validate-preference-representation-custody.mjs
tools/validate-preference-service-denominator-assurance.mjs
tools/validate-preference-source-population-rule-assurance.mjs
tools/validate-preference-standing-matrix.mjs
tools/validate-preference-standing.mjs
tools/validate-preference-subgroup.mjs
tools/validate-preference-succession.mjs
tools/validate-preference-topology-assurance.mjs
tools/validate-preference-trust-federation.mjs

## S2 counter-selector (118)
test/counter-selector-wave-02.test.js
test/counter-selector-wave-03.test.js
test/counter-selector-wave-04.test.js
test/counter-selector-wave-05.test.js
test/counter-selector-wave-06.test.js
test/counter-selector-wave-07.test.js
test/counter-selector-wave-08.test.js
test/counter-selector-wave-09.test.js
test/counter-selector-wave-10.test.js
test/counter-selector-wave-11.test.js
test/counter-selector-wave-12.test.js
test/counter-selector-wave-13.test.js
test/counter-selector-wave-14.test.js
test/counter-selector-wave-15.test.js
test/counter-selector-wave-16.test.js
test/counter-selector-wave-17.test.js
test/counter-selector-wave-18.test.js
test/counter-selector-wave-19.test.js
test/counter-selector-wave-20.test.js
test/counter-selector-wave-21.test.js
test/counter-selector-wave-22.test.js
test/counter-selector-wave-23.test.js
test/counter-selector-wave-24.test.js
test/counter-selector-wave-25.test.js
test/counter-selector-wave-26.test.js
test/counter-selector-wave-27.test.js
test/counter-selector-wave-28.test.js
test/counter-selector-wave-29.test.js
test/counter-selector-wave-30.test.js
test/counter-selector-wave-31.test.js
test/counter-selector-wave-32.test.js
test/counter-selector-wave-33.test.js
test/counter-selector-wave-34.test.js
test/counter-selector-wave-35.test.js
test/counter-selector-wave-36.test.js
test/counter-selector-wave-37.test.js
test/counter-selector-wave-38.test.js
test/counter-selector-wave-39.test.js
test/counter-selector.test.js
tools/build-counter-selector-wave-02.mjs
tools/build-counter-selector-wave-03.mjs
tools/build-counter-selector-wave-04.mjs
tools/build-counter-selector-wave-05.mjs
tools/build-counter-selector-wave-06.mjs
tools/build-counter-selector-wave-07.mjs
tools/build-counter-selector-wave-08.mjs
tools/build-counter-selector-wave-09.mjs
tools/build-counter-selector-wave-10.mjs
tools/build-counter-selector-wave-11.mjs
tools/build-counter-selector-wave-12.mjs
tools/build-counter-selector-wave-13.mjs
tools/build-counter-selector-wave-14.mjs
tools/build-counter-selector-wave-15.mjs
tools/build-counter-selector-wave-16.mjs
tools/build-counter-selector-wave-17.mjs
tools/build-counter-selector-wave-18.mjs
tools/build-counter-selector-wave-19.mjs
tools/build-counter-selector-wave-20.mjs
tools/build-counter-selector-wave-21.mjs
tools/build-counter-selector-wave-22.mjs
tools/build-counter-selector-wave-23.mjs
tools/build-counter-selector-wave-24.mjs
tools/build-counter-selector-wave-25.mjs
tools/build-counter-selector-wave-26.mjs
tools/build-counter-selector-wave-27.mjs
tools/build-counter-selector-wave-28.mjs
tools/build-counter-selector-wave-29.mjs
tools/build-counter-selector-wave-30.mjs
tools/build-counter-selector-wave-31.mjs
tools/build-counter-selector-wave-32.mjs
tools/build-counter-selector-wave-33.mjs
tools/build-counter-selector-wave-34.mjs
tools/build-counter-selector-wave-35.mjs
tools/build-counter-selector-wave-36.mjs
tools/build-counter-selector-wave-37.mjs
tools/build-counter-selector-wave-38.mjs
tools/build-counter-selector-wave-39.mjs
tools/build-counter-selector.mjs
tools/validate-counter-selector-wave-02.mjs
tools/validate-counter-selector-wave-03.mjs
tools/validate-counter-selector-wave-04.mjs
tools/validate-counter-selector-wave-05.mjs
tools/validate-counter-selector-wave-06.mjs
tools/validate-counter-selector-wave-07.mjs
tools/validate-counter-selector-wave-08.mjs
tools/validate-counter-selector-wave-09.mjs
tools/validate-counter-selector-wave-10.mjs
tools/validate-counter-selector-wave-11.mjs
tools/validate-counter-selector-wave-12.mjs
tools/validate-counter-selector-wave-13.mjs
tools/validate-counter-selector-wave-14.mjs
tools/validate-counter-selector-wave-15.mjs
tools/validate-counter-selector-wave-16.mjs
tools/validate-counter-selector-wave-17.mjs
tools/validate-counter-selector-wave-18.mjs
tools/validate-counter-selector-wave-19.mjs
tools/validate-counter-selector-wave-20.mjs
tools/validate-counter-selector-wave-21.mjs
tools/validate-counter-selector-wave-22.mjs
tools/validate-counter-selector-wave-23.mjs
tools/validate-counter-selector-wave-24.mjs
tools/validate-counter-selector-wave-25.mjs
tools/validate-counter-selector-wave-26.mjs
tools/validate-counter-selector-wave-27.mjs
tools/validate-counter-selector-wave-28.mjs
tools/validate-counter-selector-wave-29.mjs
tools/validate-counter-selector-wave-30.mjs
tools/validate-counter-selector-wave-31.mjs
tools/validate-counter-selector-wave-32.mjs
tools/validate-counter-selector-wave-33.mjs
tools/validate-counter-selector-wave-34.mjs
tools/validate-counter-selector-wave-35.mjs
tools/validate-counter-selector-wave-36.mjs
tools/validate-counter-selector-wave-37.mjs
tools/validate-counter-selector-wave-38.mjs
tools/validate-counter-selector-wave-39.mjs
tools/validate-counter-selector.mjs
tools/verify-counter-selector-wave-34-successor.mjs

## S3 stable-ground (36)
test/project-stable-ground-alignment.test.js
test/project-stable-ground-sg02.test.js
test/project-stable-ground-sg03.test.js
test/project-stable-ground-sg04.test.js
test/project-stable-ground-sg05.test.js
test/project-stable-ground-sg06.test.js
test/project-stable-ground-sg07.test.js
test/project-stable-ground-sg08.test.js
test/project-stable-ground-sg09.test.js
test/project-stable-ground-sg10.test.js
test/project-stable-ground-sg11.test.js
test/project-stable-ground-sg12.test.js
tools/build-project-stable-ground-alignment.mjs
tools/build-project-stable-ground-sg02.mjs
tools/build-project-stable-ground-sg03.mjs
tools/build-project-stable-ground-sg04.mjs
tools/build-project-stable-ground-sg05.mjs
tools/build-project-stable-ground-sg06.mjs
tools/build-project-stable-ground-sg07.mjs
tools/build-project-stable-ground-sg08.mjs
tools/build-project-stable-ground-sg09.mjs
tools/build-project-stable-ground-sg10.mjs
tools/build-project-stable-ground-sg11.mjs
tools/build-project-stable-ground-sg12.mjs
tools/validate-project-stable-ground-alignment.mjs
tools/validate-project-stable-ground-sg02.mjs
tools/validate-project-stable-ground-sg03.mjs
tools/validate-project-stable-ground-sg04.mjs
tools/validate-project-stable-ground-sg05.mjs
tools/validate-project-stable-ground-sg06.mjs
tools/validate-project-stable-ground-sg07.mjs
tools/validate-project-stable-ground-sg08.mjs
tools/validate-project-stable-ground-sg09.mjs
tools/validate-project-stable-ground-sg10.mjs
tools/validate-project-stable-ground-sg11.mjs
tools/validate-project-stable-ground-sg12.mjs

## S5 residual-denominator (16)
test/status-sovereignty-residual-denominator-wave-01.test.js
test/status-sovereignty-residual-denominator-wave-02-constitution.test.js
test/status-sovereignty-residual-denominator-wave-02-current.test.js
test/status-sovereignty-residual-denominator-wave-02-reconciliation.test.js
test/status-sovereignty-residual-denominator-wave-03-constitution.test.js
test/status-sovereignty-residual-denominator-wave-03-current.test.js
tools/build-status-sovereignty-residual-denominator-wave-01.mjs
tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs
tools/build-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs
tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs
tools/validate-status-sovereignty-residual-denominator-wave-01.mjs
tools/validate-status-sovereignty-residual-denominator-wave-02-constitution.mjs
tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
tools/validate-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs
tools/validate-status-sovereignty-residual-denominator-wave-03-constitution.mjs
tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs

## S4 m04d-g wave chain (22)
test/m04d-adversarial-triage-ledger.test.js
test/m04d-fog-resolution-wave-01.test.js
test/m04d-fog-resolution-wave-02.test.js
test/m04d-fog-resolution-wave-03.test.js
test/m04d-fog-resolution-wave-04.test.js
test/m04d-fog-resolution-wave-05.test.js
test/m04d-fog-resolution-wave-06.test.js
test/m04d-fog-resolution-wave-07.test.js
test/m04d-fog-resolution-wave-08.test.js
test/m04e-constitutional-awareness.test.js
test/m04f-federated-sensing-action.test.js
test/m04g-evidence-hydrology.test.js
test/m04g-global-circulation.test.js
tools/build-m04e-constitutional-awareness.mjs
tools/build-m04g-evidence-hydrology.mjs
tools/build-m04g-global-circulation.mjs
tools/refresh-m04g-evidence-hydrology.mjs
tools/refresh-m04g-global-circulation.mjs
tools/validate-m04e-constitutional-awareness.mjs
tools/validate-m04f-federated-sensing-action.mjs
tools/validate-m04g-evidence-hydrology.mjs
tools/validate-m04g-global-circulation.mjs

## S7 orphan wrapper (control enforced in validate-release) (1)
tools/validate-reported-hop-evidence-upgrades.mjs

## S6 schoolhouse validator (9)
tools/validate-schoolhouse-irs-candidate-filing-index-custody.mjs
tools/validate-schoolhouse-irs-candidate-latest-filing-xml-v6-custody.mjs
tools/validate-schoolhouse-irs-historical-filing-website-screen-custody.mjs
tools/validate-schoolhouse-legal-identity-current-frontier.py
tools/validate-schoolhouse-rdap-exact-domain-census-custody.py
tools/validate-schoolhouse-sam-public-entity-registration-census-custody.py
tools/validate-schoolhouse-sec-edgar-exact-domain-census-custody.py
tools/validate-schoolhouse-usaspending-recipient-census-custody.py
tools/validate-schoolhouse-uspto-exact-mark-census-custody.py

## S6 schoolhouse validator test (3)
tools/test-schoolhouse-irs-candidate-filing-index-custody.mjs
tools/test-schoolhouse-irs-candidate-latest-filing-xml-v6-custody.mjs
tools/test-schoolhouse-irs-historical-filing-website-screen-custody.mjs

## S6 schoolhouse builder spawning deleted validator (3)
tools/build-schoolhouse-irs-candidate-filing-index-custody.mjs
tools/build-schoolhouse-irs-candidate-latest-filing-xml-v6-custody.mjs
tools/build-schoolhouse-irs-historical-filing-website-screen-custody.mjs

C. Workflows that reference removed scripts or removed paths
-----------------------------------------------------------
(workflow file: removed things it mentions; workflows whose every executable reference is removed are candidates for deletion)
counter-selector-wave-00.yml: 3 ref(s): tools/build-counter-selector.mjs, tools/validate-counter-selector.mjs, test/counter-selector.test.js
counter-selector-wave-02.yml: 3 ref(s): tools/build-counter-selector-wave-02.mjs, tools/validate-counter-selector-wave-02.mjs, test/counter-selector-wave-02.test.js
counter-selector-wave-03.yml: 3 ref(s): tools/build-counter-selector-wave-03.mjs, tools/validate-counter-selector-wave-03.mjs, test/counter-selector-wave-03.test.js
counter-selector-wave-04.yml: 3 ref(s): tools/build-counter-selector-wave-04.mjs, tools/validate-counter-selector-wave-04.mjs, test/counter-selector-wave-04.test.js
counter-selector-wave-05.yml: 3 ref(s): tools/build-counter-selector-wave-05.mjs, tools/validate-counter-selector-wave-05.mjs, test/counter-selector-wave-05.test.js
counter-selector-wave-06.yml: 3 ref(s): tools/build-counter-selector-wave-06.mjs, tools/validate-counter-selector-wave-06.mjs, test/counter-selector-wave-06.test.js
counter-selector-wave-07.yml: 3 ref(s): tools/build-counter-selector-wave-07.mjs, tools/validate-counter-selector-wave-07.mjs, test/counter-selector-wave-07.test.js
counter-selector-wave-08.yml: 3 ref(s): tools/build-counter-selector-wave-08.mjs, tools/validate-counter-selector-wave-08.mjs, test/counter-selector-wave-08.test.js
counter-selector-wave-09.yml: 3 ref(s): tools/build-counter-selector-wave-09.mjs, tools/validate-counter-selector-wave-09.mjs, test/counter-selector-wave-09.test.js
counter-selector-wave-10.yml: 3 ref(s): tools/build-counter-selector-wave-10.mjs, tools/validate-counter-selector-wave-10.mjs, test/counter-selector-wave-10.test.js
counter-selector-wave-11.yml: 3 ref(s): tools/build-counter-selector-wave-11.mjs, tools/validate-counter-selector-wave-11.mjs, test/counter-selector-wave-11.test.js
counter-selector-wave-12.yml: 3 ref(s): tools/build-counter-selector-wave-12.mjs, tools/validate-counter-selector-wave-12.mjs, test/counter-selector-wave-12.test.js
counter-selector-wave-13.yml: 3 ref(s): tools/build-counter-selector-wave-13.mjs, tools/validate-counter-selector-wave-13.mjs, test/counter-selector-wave-13.test.js
counter-selector-wave-14.yml: 3 ref(s): tools/build-counter-selector-wave-14.mjs, tools/validate-counter-selector-wave-14.mjs, test/counter-selector-wave-14.test.js
counter-selector-wave-15.yml: 3 ref(s): tools/build-counter-selector-wave-15.mjs, tools/validate-counter-selector-wave-15.mjs, test/counter-selector-wave-15.test.js
counter-selector-wave-16.yml: 3 ref(s): tools/build-counter-selector-wave-16.mjs, tools/validate-counter-selector-wave-16.mjs, test/counter-selector-wave-16.test.js
counter-selector-wave-17.yml: 3 ref(s): tools/build-counter-selector-wave-17.mjs, tools/validate-counter-selector-wave-17.mjs, test/counter-selector-wave-17.test.js
counter-selector-wave-18.yml: 3 ref(s): tools/build-counter-selector-wave-18.mjs, tools/validate-counter-selector-wave-18.mjs, test/counter-selector-wave-18.test.js
counter-selector-wave-19.yml: 3 ref(s): tools/build-counter-selector-wave-19.mjs, tools/validate-counter-selector-wave-19.mjs, test/counter-selector-wave-19.test.js
counter-selector-wave-20.yml: 3 ref(s): tools/build-counter-selector-wave-20.mjs, tools/validate-counter-selector-wave-20.mjs, test/counter-selector-wave-20.test.js
counter-selector-wave-21.yml: 3 ref(s): tools/build-counter-selector-wave-21.mjs, tools/validate-counter-selector-wave-21.mjs, test/counter-selector-wave-21.test.js
counter-selector-wave-22.yml: 3 ref(s): tools/build-counter-selector-wave-22.mjs, tools/validate-counter-selector-wave-22.mjs, test/counter-selector-wave-22.test.js
counter-selector-wave-23.yml: 3 ref(s): tools/build-counter-selector-wave-23.mjs, tools/validate-counter-selector-wave-23.mjs, test/counter-selector-wave-23.test.js
counter-selector-wave-24.yml: 3 ref(s): tools/build-counter-selector-wave-24.mjs, tools/validate-counter-selector-wave-24.mjs, test/counter-selector-wave-24.test.js
counter-selector-wave-25.yml: 3 ref(s): tools/build-counter-selector-wave-25.mjs, tools/validate-counter-selector-wave-25.mjs, test/counter-selector-wave-25.test.js
counter-selector-wave-26.yml: 3 ref(s): tools/build-counter-selector-wave-26.mjs, tools/validate-counter-selector-wave-26.mjs, test/counter-selector-wave-26.test.js
counter-selector-wave-27.yml: 3 ref(s): tools/build-counter-selector-wave-27.mjs, tools/validate-counter-selector-wave-27.mjs, test/counter-selector-wave-27.test.js
counter-selector-wave-28.yml: 3 ref(s): tools/build-counter-selector-wave-28.mjs, tools/validate-counter-selector-wave-28.mjs, test/counter-selector-wave-28.test.js
counter-selector-wave-29.yml: 3 ref(s): tools/build-counter-selector-wave-29.mjs, tools/validate-counter-selector-wave-29.mjs, test/counter-selector-wave-29.test.js
counter-selector-wave-30.yml: 3 ref(s): tools/build-counter-selector-wave-30.mjs, tools/validate-counter-selector-wave-30.mjs, test/counter-selector-wave-30.test.js
counter-selector-wave-31.yml: 3 ref(s): tools/build-counter-selector-wave-31.mjs, tools/validate-counter-selector-wave-31.mjs, test/counter-selector-wave-31.test.js
counter-selector-wave-32.yml: 3 ref(s): tools/build-counter-selector-wave-32.mjs, tools/validate-counter-selector-wave-32.mjs, test/counter-selector-wave-32.test.js
counter-selector-wave-33.yml: 3 ref(s): test/counter-selector-wave-33.test.js, tools/build-counter-selector-wave-33.mjs, tools/validate-counter-selector-wave-33.mjs
counter-selector-wave-34.yml: 4 ref(s): test/counter-selector-wave-34.test.js, tools/build-counter-selector-wave-34.mjs, tools/validate-counter-selector-wave-34.mjs, tools/verify-counter-selector-wave-34-successor.mjs
counter-selector-wave-35.yml: 3 ref(s): test/counter-selector-wave-35.test.js, tools/build-counter-selector-wave-35.mjs, tools/validate-counter-selector-wave-35.mjs
counter-selector-wave-36.yml: 3 ref(s): test/counter-selector-wave-36.test.js, tools/build-counter-selector-wave-36.mjs, tools/validate-counter-selector-wave-36.mjs
counter-selector-wave-37.yml: 3 ref(s): test/counter-selector-wave-37.test.js, tools/build-counter-selector-wave-37.mjs, tools/validate-counter-selector-wave-37.mjs
counter-selector-wave-38.yml: 3 ref(s): test/counter-selector-wave-38.test.js, tools/build-counter-selector-wave-38.mjs, tools/validate-counter-selector-wave-38.mjs
counter-selector-wave-39.yml: 3 ref(s): test/counter-selector-wave-39.test.js, tools/build-counter-selector-wave-39.mjs, tools/validate-counter-selector-wave-39.mjs
m04d-adversarial-triage-ledger.yml: 1 ref(s): test/m04d-adversarial-triage-ledger.test.js
m04d-fog-resolution-wave-01.yml: 1 ref(s): test/m04d-fog-resolution-wave-01.test.js
m04d-fog-resolution-wave-02.yml: 1 ref(s): test/m04d-fog-resolution-wave-02.test.js
m04d-fog-resolution-wave-03.yml: 1 ref(s): test/m04d-fog-resolution-wave-03.test.js
m04d-fog-resolution-wave-04.yml: 1 ref(s): test/m04d-fog-resolution-wave-04.test.js
m04d-fog-resolution-wave-05.yml: 1 ref(s): test/m04d-fog-resolution-wave-05.test.js
m04d-fog-resolution-wave-06.yml: 1 ref(s): test/m04d-fog-resolution-wave-06.test.js
m04d-fog-resolution-wave-07.yml: 1 ref(s): test/m04d-fog-resolution-wave-07.test.js
m04d-fog-resolution-wave-08.yml: 1 ref(s): test/m04d-fog-resolution-wave-08.test.js
m04e-constitutional-awareness.yml: 3 ref(s): tools/build-m04e-constitutional-awareness.mjs, tools/validate-m04e-constitutional-awareness.mjs, test/m04e-constitutional-awareness.test.js
m04f-federated-sensing-action.yml: 2 ref(s): tools/validate-m04f-federated-sensing-action.mjs, test/m04f-federated-sensing-action.test.js
m04g-evidence-hydrology.yml: 4 ref(s): tools/build-m04g-evidence-hydrology.mjs, tools/validate-m04g-evidence-hydrology.mjs, tools/refresh-m04g-evidence-hydrology.mjs, test/m04g-evidence-hydrology.test.js
m04g-global-circulation.yml: 4 ref(s): test/m04g-global-circulation.test.js, tools/build-m04g-global-circulation.mjs, tools/validate-m04g-global-circulation.mjs, tools/refresh-m04g-global-circulation.mjs
preference-acquisition-request.yml: 4 ref(s): tools/lib/preference-acquisition-request.mjs, tools/compile-preference-acquisition-request.mjs, tools/validate-preference-acquisition-request.mjs, test/preference-acquisition-request.test.js
preference-allocation-formula.yml: 4 ref(s): tools/lib/preference-allocation-formula.mjs, tools/compile-preference-allocation-formula.mjs, tools/validate-preference-allocation-formula.mjs, test/preference-allocation-formula.test.js
preference-candidate-pair-blocking-recall-assurance.yml: 4 ref(s): tools/lib/preference-candidate-pair-blocking-recall-assurance.mjs, tools/compile-preference-candidate-pair-blocking-recall-assurance.mjs, tools/validate-preference-candidate-pair-blocking-recall-assurance.mjs, test/preference-candidate-pair-blocking-recall-assurance.test.js
preference-causal-assurance.yml: 4 ref(s): tools/lib/preference-causal-assurance.mjs, tools/compile-preference-causal-assurance.mjs, tools/validate-preference-causal-assurance.mjs, test/preference-causal-assurance.test.js
preference-choice-architecture.yml: 4 ref(s): tools/lib/preference-choice-architecture.mjs, tools/compile-preference-choice-architecture.mjs, tools/validate-preference-choice-architecture.mjs, test/preference-choice-architecture.test.js
preference-choice-effectiveness.yml: 4 ref(s): tools/lib/preference-choice-effectiveness.mjs, tools/compile-preference-choice-effectiveness.mjs, tools/validate-preference-choice-effectiveness.mjs, test/preference-choice-effectiveness.test.js
preference-collective-distribution.yml: 4 ref(s): tools/lib/preference-collective-distribution.mjs, tools/compile-preference-collective-distribution.mjs, tools/validate-preference-collective-distribution.mjs, test/preference-collective-distribution.test.js
preference-comprehension-assurance.yml: 4 ref(s): tools/lib/preference-comprehension-assurance.mjs, tools/compile-preference-comprehension-assurance.mjs, tools/validate-preference-comprehension-assurance.mjs, test/preference-comprehension-assurance.test.js
preference-criterion-score-use.yml: 4 ref(s): tools/lib/preference-criterion-score-use.mjs, tools/compile-preference-criterion-score-use.mjs, tools/validate-preference-criterion-score-use.mjs, test/preference-criterion-score-use.test.js
preference-custody-v10.yml: 20 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v11.yml: 22 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v12.yml: 24 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v13.yml: 26 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v14.yml: 28 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v15.yml: 30 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody-v16.yml: 6 ref(s): tools/compile-preference-collective-distribution.mjs, tools/validate-preference-collective-distribution.mjs, tools/compile-preference-custody-manifest-v16.mjs, tools/validate-preference-custody-manifest-v16.mjs, test/preference-collective-distribution.test.js, test/preference-custody-manifest-v16.test.js
preference-custody-v17.yml: 6 ref(s): tools/compile-preference-allocation-formula.mjs, tools/validate-preference-allocation-formula.mjs, tools/compile-preference-custody-manifest-v17.mjs, tools/validate-preference-custody-manifest-v17.mjs, test/preference-allocation-formula.test.js, test/preference-custody-manifest-v17.test.js
preference-custody-v18.yml: 6 ref(s): tools/compile-preference-release-authority.mjs, tools/validate-preference-release-authority.mjs, tools/compile-preference-custody-manifest-v18.mjs, tools/validate-preference-custody-manifest-v18.mjs, test/preference-release-authority.test.js, test/preference-custody-manifest-v18.test.js
preference-custody-v19.yml: 6 ref(s): tools/compile-preference-choice-effectiveness.mjs, tools/validate-preference-choice-effectiveness.mjs, tools/compile-preference-custody-manifest-v19.mjs, tools/validate-preference-custody-manifest-v19.mjs, test/preference-choice-effectiveness.test.js, test/preference-custody-manifest-v19.test.js
preference-custody-v20.yml: 6 ref(s): tools/compile-preference-choice-architecture.mjs, tools/validate-preference-choice-architecture.mjs, tools/compile-preference-custody-manifest-v20.mjs, tools/validate-preference-custody-manifest-v20.mjs, test/preference-choice-architecture.test.js, test/preference-custody-manifest-v20.test.js
preference-custody-v21.yml: 6 ref(s): tools/compile-preference-comprehension-assurance.mjs, tools/validate-preference-comprehension-assurance.mjs, tools/compile-preference-custody-manifest-v21.mjs, tools/validate-preference-custody-manifest-v21.mjs, test/preference-comprehension-assurance.test.js, test/preference-custody-manifest-v21.test.js
preference-custody-v22.yml: 6 ref(s): tools/compile-preference-instrument-validity.mjs, tools/validate-preference-instrument-validity.mjs, tools/compile-preference-custody-manifest-v22.mjs, tools/validate-preference-custody-manifest-v22.mjs, test/preference-instrument-validity.test.js, test/preference-custody-manifest-v22.test.js
preference-custody-v23.yml: 6 ref(s): tools/compile-preference-criterion-score-use.mjs, tools/validate-preference-criterion-score-use.mjs, tools/compile-preference-custody-manifest-v23.mjs, tools/validate-preference-custody-manifest-v23.mjs, test/preference-criterion-score-use.test.js, test/preference-custody-manifest-v23.test.js
preference-custody-v24.yml: 6 ref(s): tools/compile-preference-causal-assurance.mjs, tools/validate-preference-causal-assurance.mjs, tools/compile-preference-custody-manifest-v24.mjs, tools/validate-preference-custody-manifest-v24.mjs, test/preference-causal-assurance.test.js, test/preference-custody-manifest-v24.test.js
preference-custody-v25.yml: 6 ref(s): tools/compile-preference-interference-mapping.mjs, tools/validate-preference-interference-mapping.mjs, tools/compile-preference-custody-manifest-v25.mjs, tools/validate-preference-custody-manifest-v25.mjs, test/preference-interference-mapping.test.js, test/preference-custody-manifest-v25.test.js
preference-custody-v26.yml: 6 ref(s): tools/compile-preference-topology-assurance.mjs, tools/validate-preference-topology-assurance.mjs, tools/compile-preference-custody-manifest-v26.mjs, tools/validate-preference-custody-manifest-v26.mjs, test/preference-topology-assurance.test.js, test/preference-custody-manifest-v26.test.js
preference-custody-v27.yml: 6 ref(s): tools/compile-preference-equilibrium-assurance.mjs, tools/validate-preference-equilibrium-assurance.mjs, tools/compile-preference-custody-manifest-v27.mjs, tools/validate-preference-custody-manifest-v27.mjs, test/preference-equilibrium-assurance.test.js, test/preference-custody-manifest-v27.test.js
preference-custody-v28.yml: 6 ref(s): tools/compile-preference-market-service-assurance.mjs, tools/validate-preference-market-service-assurance.mjs, tools/compile-preference-custody-manifest-v28.mjs, tools/validate-preference-custody-manifest-v28.mjs, test/preference-market-service-assurance.test.js, test/preference-custody-manifest-v28.test.js
preference-custody-v29.yml: 6 ref(s): tools/compile-preference-service-denominator-assurance.mjs, tools/validate-preference-service-denominator-assurance.mjs, tools/compile-preference-custody-manifest-v29.mjs, tools/validate-preference-custody-manifest-v29.mjs, test/preference-service-denominator-assurance.test.js, test/preference-custody-manifest-v29.test.js
preference-custody-v30.yml: 6 ref(s): tools/compile-preference-pre-intake-assurance.mjs, tools/validate-preference-pre-intake-assurance.mjs, tools/compile-preference-custody-manifest-v30.mjs, tools/validate-preference-custody-manifest-v30.mjs, test/preference-pre-intake-assurance.test.js, test/preference-custody-manifest-v30.test.js
preference-custody-v31.yml: 6 ref(s): tools/compile-preference-eligibility-outreach-assurance.mjs, tools/validate-preference-eligibility-outreach-assurance.mjs, tools/compile-preference-custody-manifest-v31.mjs, tools/validate-preference-custody-manifest-v31.mjs, test/preference-eligibility-outreach-assurance.test.js, test/preference-custody-manifest-v31.test.js
preference-custody-v32.yml: 6 ref(s): tools/compile-preference-source-population-rule-assurance.mjs, tools/validate-preference-source-population-rule-assurance.mjs, tools/compile-preference-custody-manifest-v32.mjs, tools/validate-preference-custody-manifest-v32.mjs, test/preference-source-population-rule-assurance.test.js, test/preference-custody-manifest-v32.test.js
preference-custody-v33.yml: 6 ref(s): tools/compile-preference-population-frame-assurance.mjs, tools/validate-preference-population-frame-assurance.mjs, tools/compile-preference-custody-manifest-v33.mjs, tools/validate-preference-custody-manifest-v33.mjs, test/preference-population-frame-assurance.test.js, test/preference-custody-manifest-v33.test.js
preference-custody-v34.yml: 6 ref(s): tools/compile-preference-population-coverage-turnover-assurance.mjs, tools/validate-preference-population-coverage-turnover-assurance.mjs, tools/compile-preference-custody-manifest-v34.mjs, tools/validate-preference-custody-manifest-v34.mjs, test/preference-population-coverage-turnover-assurance.test.js, test/preference-custody-manifest-v34.test.js
preference-custody-v35.yml: 6 ref(s): tools/compile-preference-hard-to-enumerate-missingness-assurance.mjs, tools/validate-preference-hard-to-enumerate-missingness-assurance.mjs, tools/compile-preference-custody-manifest-v35.mjs, tools/validate-preference-custody-manifest-v35.mjs, test/preference-hard-to-enumerate-missingness-assurance.test.js, test/preference-custody-manifest-v35.test.js
preference-custody-v36.yml: 6 ref(s): tools/compile-preference-identity-boundary-assurance.mjs, tools/validate-preference-identity-boundary-assurance.mjs, tools/compile-preference-custody-manifest-v36.mjs, tools/validate-preference-custody-manifest-v36.mjs, test/preference-identity-boundary-assurance.test.js, test/preference-custody-manifest-v36.test.js
preference-custody-v37.yml: 6 ref(s): tools/compile-preference-record-linkage-temporal-succession-assurance.mjs, tools/validate-preference-record-linkage-temporal-succession-assurance.mjs, tools/compile-preference-custody-manifest-v37.mjs, tools/validate-preference-custody-manifest-v37.mjs, test/preference-record-linkage-temporal-succession-assurance.test.js, test/preference-custody-manifest-v37.test.js
preference-custody-v38.yml: 6 ref(s): tools/compile-preference-linkage-confidence-adjudication-assurance.mjs, tools/validate-preference-linkage-confidence-adjudication-assurance.mjs, tools/compile-preference-custody-manifest-v38.mjs, tools/validate-preference-custody-manifest-v38.mjs, test/preference-linkage-confidence-adjudication-assurance.test.js, test/preference-custody-manifest-v38.test.js
preference-custody-v39.yml: 7 ref(s): tools/compile-preference-candidate-pair-blocking-recall-assurance.mjs, tools/validate-preference-candidate-pair-blocking-recall-assurance.mjs, tools/compile-preference-custody-manifest-v39.mjs, tools/validate-preference-custody-manifest-v39.mjs, test/preference-candidate-pair-blocking-recall-assurance.test.js, test/preference-custody-manifest-v39.test.js, ...
preference-custody-v40.yml: 7 ref(s): tools/compile-preference-linkage-score-calibration-assurance.mjs, tools/validate-preference-linkage-score-calibration-assurance.mjs, tools/compile-preference-custody-manifest-v40.mjs, tools/validate-preference-custody-manifest-v40.mjs, test/preference-linkage-score-calibration-assurance.test.js, test/preference-custody-manifest-v40.test.js, ...
preference-custody-v41.yml: 7 ref(s): tools/compile-preference-linkage-probability-calibration-assurance.mjs, tools/validate-preference-linkage-probability-calibration-assurance.mjs, tools/compile-preference-custody-manifest-v41.mjs, tools/validate-preference-custody-manifest-v41.mjs, test/preference-linkage-probability-calibration-assurance.test.js, test/preference-custody-manifest-v41.test.js, ...
preference-custody-v42.yml: 7 ref(s): tools/compile-preference-linkage-uncertainty-monitoring-assurance.mjs, tools/validate-preference-linkage-uncertainty-monitoring-assurance.mjs, tools/compile-preference-custody-manifest-v42.mjs, tools/validate-preference-custody-manifest-v42.mjs, test/preference-linkage-uncertainty-monitoring-assurance.test.js, test/preference-custody-manifest-v42.test.js, ...
preference-custody-v43.yml: 7 ref(s): tools/compile-preference-linkage-interval-construction-assurance.mjs, tools/validate-preference-linkage-interval-construction-assurance.mjs, tools/compile-preference-custody-manifest-v43.mjs, tools/validate-preference-custody-manifest-v43.mjs, test/preference-linkage-interval-construction-assurance.test.js, test/preference-custody-manifest-v43.test.js, ...
preference-custody-v44.yml: 7 ref(s): tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs, tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs, tools/compile-preference-custody-manifest-v44.mjs, tools/validate-preference-custody-manifest-v44.mjs, test/preference-linkage-target-construction-exchangeability-assurance.test.js, test/preference-custody-manifest-v44.test.js, ...
preference-custody-v45.yml: 7 ref(s): tools/compile-preference-linkage-event-estimand-scope-interpretation-assurance.mjs, tools/validate-preference-linkage-event-estimand-scope-interpretation-assurance.mjs, tools/compile-preference-custody-manifest-v45.mjs, tools/validate-preference-custody-manifest-v45.mjs, test/preference-linkage-event-estimand-scope-interpretation-assurance.test.js, test/preference-custody-manifest-v45.test.js, ...
preference-custody-v46.yml: 7 ref(s): tools/compile-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs, tools/validate-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs, tools/compile-preference-custody-manifest-v46.mjs, tools/validate-preference-custody-manifest-v46.mjs, test/preference-linkage-interval-method-partition-replication-deployment-assurance.test.js, test/preference-custody-manifest-v46.test.js, ...
preference-custody-v47.yml: 7 ref(s): tools/compile-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs, tools/validate-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs, tools/compile-preference-custody-manifest-v47.mjs, tools/validate-preference-custody-manifest-v47.mjs, test/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.test.js, test/preference-custody-manifest-v47.test.js, ...
preference-custody-v48.yml: 7 ref(s): tools/compile-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs, tools/validate-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs, tools/compile-preference-custody-manifest-v48.mjs, tools/validate-preference-custody-manifest-v48.mjs, test/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.test.js, test/preference-custody-manifest-v48.test.js, ...
preference-custody-v49.yml: 7 ref(s): tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs, tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs, tools/compile-preference-custody-manifest-v49.mjs, tools/validate-preference-custody-manifest-v49.mjs, test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js, test/preference-custody-manifest-v49.test.js, ...
preference-custody-v50.yml: 7 ref(s): tools/compile-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs, tools/validate-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs, tools/compile-preference-custody-manifest-v50.mjs, tools/validate-preference-custody-manifest-v50.mjs, test/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.test.js, test/preference-custody-manifest-v50.test.js, ...
preference-custody-v51.yml: 7 ref(s): tools/compile-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs, tools/validate-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs, tools/compile-preference-custody-manifest-v51.mjs, tools/validate-preference-custody-manifest-v51.mjs, test/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.test.js, test/preference-custody-manifest-v51.test.js, ...
preference-custody-v52.yml: 7 ref(s): tools/compile-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs, tools/validate-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs, tools/compile-preference-custody-manifest-v52.mjs, tools/validate-preference-custody-manifest-v52.mjs, test/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.test.js, test/preference-custody-manifest-v52.test.js, ...
preference-custody-v53.yml: 7 ref(s): tools/compile-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs, tools/compile-preference-custody-manifest-v53.mjs, tools/validate-preference-custody-manifest-v53.mjs, test/preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.test.js, test/preference-custody-manifest-v53.test.js, ...
preference-custody-v54.yml: 7 ref(s): tools/compile-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs, tools/compile-preference-custody-manifest-v54.mjs, tools/validate-preference-custody-manifest-v54.mjs, test/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.test.js, test/preference-custody-manifest-v54.test.js, ...
preference-custody-v55.yml: 7 ref(s): tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs, tools/compile-preference-custody-manifest-v55.mjs, tools/validate-preference-custody-manifest-v55.mjs, test/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.test.js, test/preference-custody-manifest-v55.test.js, ...
preference-custody-v56.yml: 7 ref(s): tools/compile-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs, tools/compile-preference-custody-manifest-v56.mjs, tools/validate-preference-custody-manifest-v56.mjs, test/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.test.js, test/preference-custody-manifest-v56.test.js, ...
preference-custody-v57.yml: 7 ref(s): tools/compile-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs, tools/compile-preference-custody-manifest-v57.mjs, tools/validate-preference-custody-manifest-v57.mjs, test/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.test.js, test/preference-custody-manifest-v57.test.js, ...
preference-custody-v58.yml: 8 ref(s): test/preference-custody-manifest-v58.test.js, tools/compile-preference-custody-manifest-v58.mjs, tools/lib/preference-custody-manifest-v58.mjs, tools/validate-preference-custody-manifest-v58.mjs, test/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.test.js, tools/compile-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs, ...
preference-custody-v59.yml: 8 ref(s): test/preference-custody-manifest-v59.test.js, tools/compile-preference-custody-manifest-v59.mjs, tools/lib/preference-custody-manifest-v59.mjs, tools/validate-preference-custody-manifest-v59.mjs, test/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.test.js, tools/compile-preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs, ...
preference-custody-v9.yml: 18 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-custody.yml: 40 ref(s): tools/lib/preference-custody.mjs, tools/lib/preference-equifinality.mjs, tools/lib/preference-attrition.mjs, tools/lib/preference-subgroup.mjs, tools/lib/preference-standing.mjs, tools/lib/preference-agenda.mjs, ...
preference-deliberative-formation.yml: 4 ref(s): tools/lib/preference-deliberative-formation.mjs, tools/compile-preference-deliberative-formation.mjs, tools/validate-preference-deliberative-formation.mjs, test/preference-deliberative-formation.test.js
preference-dynamic-change.yml: 4 ref(s): tools/lib/preference-dynamic-change.mjs, tools/compile-preference-dynamic-change.mjs, tools/validate-preference-dynamic-change.mjs, test/preference-dynamic-change.test.js
preference-eligibility-outreach-assurance.yml: 4 ref(s): tools/lib/preference-eligibility-outreach-assurance.mjs, tools/compile-preference-eligibility-outreach-assurance.mjs, tools/validate-preference-eligibility-outreach-assurance.mjs, test/preference-eligibility-outreach-assurance.test.js
preference-epistemic-quality.yml: 4 ref(s): tools/lib/preference-epistemic-quality.mjs, tools/compile-preference-epistemic-quality.mjs, tools/validate-preference-epistemic-quality.mjs, test/preference-epistemic-quality.test.js
preference-equilibrium-assurance.yml: 4 ref(s): tools/lib/preference-equilibrium-assurance.mjs, tools/compile-preference-equilibrium-assurance.mjs, tools/validate-preference-equilibrium-assurance.mjs, test/preference-equilibrium-assurance.test.js
preference-hard-to-enumerate-missingness-assurance.yml: 4 ref(s): tools/lib/preference-hard-to-enumerate-missingness-assurance.mjs, tools/compile-preference-hard-to-enumerate-missingness-assurance.mjs, tools/validate-preference-hard-to-enumerate-missingness-assurance.mjs, test/preference-hard-to-enumerate-missingness-assurance.test.js
preference-human-companion.yml: 4 ref(s): tools/lib/preference-human-companion.mjs, tools/compile-preference-human-companion.mjs, tools/validate-preference-human-companion.mjs, test/preference-human-companion.test.js
preference-human-validation-topology.yml: 7 ref(s): tools/lib/preference-real-case.mjs, tools/lib/preference-human-companion.mjs, tools/lib/preference-hybrid-architecture.mjs, tools/lib/preference-human-validation-topology.mjs, tools/compile-preference-human-validation-topology.mjs, tools/validate-preference-human-validation-topology.mjs, ...
preference-hybrid-architecture.yml: 4 ref(s): tools/lib/preference-hybrid-architecture.mjs, tools/compile-preference-hybrid-architecture.mjs, tools/validate-preference-hybrid-architecture.mjs, test/preference-hybrid-architecture.test.js
preference-identity-boundary-assurance.yml: 4 ref(s): tools/lib/preference-identity-boundary-assurance.mjs, tools/compile-preference-identity-boundary-assurance.mjs, tools/validate-preference-identity-boundary-assurance.mjs, test/preference-identity-boundary-assurance.test.js
preference-instrument-validity.yml: 4 ref(s): tools/lib/preference-instrument-validity.mjs, tools/compile-preference-instrument-validity.mjs, tools/validate-preference-instrument-validity.mjs, test/preference-instrument-validity.test.js
preference-interference-mapping.yml: 4 ref(s): tools/lib/preference-interference-mapping.mjs, tools/compile-preference-interference-mapping.mjs, tools/validate-preference-interference-mapping.mjs, test/preference-interference-mapping.test.js
preference-liability-remedy.yml: 4 ref(s): tools/lib/preference-liability-remedy.mjs, tools/compile-preference-liability-remedy.mjs, tools/validate-preference-liability-remedy.mjs, test/preference-liability-remedy.test.js
preference-linkage-confidence-adjudication-assurance.yml: 4 ref(s): tools/lib/preference-linkage-confidence-adjudication-assurance.mjs, tools/compile-preference-linkage-confidence-adjudication-assurance.mjs, tools/validate-preference-linkage-confidence-adjudication-assurance.mjs, test/preference-linkage-confidence-adjudication-assurance.test.js
preference-linkage-event-estimand-scope-interpretation-assurance.yml: 4 ref(s): tools/lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs, tools/compile-preference-linkage-event-estimand-scope-interpretation-assurance.mjs, tools/validate-preference-linkage-event-estimand-scope-interpretation-assurance.mjs, test/preference-linkage-event-estimand-scope-interpretation-assurance.test.js
preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.yml: 4 ref(s): tools/lib/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs, tools/compile-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs, tools/validate-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs, test/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.test.js
preference-linkage-interval-construction-assurance.yml: 4 ref(s): tools/lib/preference-linkage-interval-construction-assurance.mjs, tools/compile-preference-linkage-interval-construction-assurance.mjs, tools/validate-preference-linkage-interval-construction-assurance.mjs, test/preference-linkage-interval-construction-assurance.test.js
preference-linkage-interval-method-partition-replication-deployment-assurance.yml: 4 ref(s): tools/lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs, tools/compile-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs, tools/validate-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs, test/preference-linkage-interval-method-partition-replication-deployment-assurance.test.js
preference-linkage-probability-calibration-assurance.yml: 4 ref(s): tools/lib/preference-linkage-probability-calibration-assurance.mjs, tools/compile-preference-linkage-probability-calibration-assurance.mjs, tools/validate-preference-linkage-probability-calibration-assurance.mjs, test/preference-linkage-probability-calibration-assurance.test.js
preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs, tools/compile-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs, tools/validate-preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs, test/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.test.js
preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs, tools/compile-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs, tools/validate-preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs, test/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.test.js
preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs, tools/compile-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.mjs, test/preference-linkage-repository-owner-immutable-identity-canonical-location-branch-tag-release-review-time-commit-assurance.test.js
preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs, tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs, test/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.test.js
preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs, tools/compile-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs, tools/validate-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs, test/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.test.js
preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs, tools/compile-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs, test/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.test.js
preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.yml: 4 ref(s): tools/lib/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs, tools/compile-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs, test/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.test.js
preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.yml: 4 ref(s): test/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.test.js, tools/compile-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs, tools/lib/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs
preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.yml: 4 ref(s): test/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.test.js, tools/compile-preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs, tools/lib/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs, tools/validate-preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs
preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.yml: 4 ref(s): tools/lib/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs, tools/compile-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs, tools/validate-preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs, test/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.test.js
preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.yml: 4 ref(s): tools/lib/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs, tools/compile-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs, tools/validate-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs, test/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.test.js
preference-linkage-score-calibration-assurance.yml: 4 ref(s): tools/lib/preference-linkage-score-calibration-assurance.mjs, tools/compile-preference-linkage-score-calibration-assurance.mjs, tools/validate-preference-linkage-score-calibration-assurance.mjs, test/preference-linkage-score-calibration-assurance.test.js
preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.yml: 4 ref(s): tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs, tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs, tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs, test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js
preference-linkage-target-construction-exchangeability-assurance.yml: 4 ref(s): tools/lib/preference-linkage-target-construction-exchangeability-assurance.mjs, tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs, tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs, test/preference-linkage-target-construction-exchangeability-assurance.test.js
preference-linkage-uncertainty-monitoring-assurance.yml: 4 ref(s): tools/lib/preference-linkage-uncertainty-monitoring-assurance.mjs, tools/compile-preference-linkage-uncertainty-monitoring-assurance.mjs, tools/validate-preference-linkage-uncertainty-monitoring-assurance.mjs, test/preference-linkage-uncertainty-monitoring-assurance.test.js
preference-market-service-assurance.yml: 4 ref(s): tools/lib/preference-market-service-assurance.mjs, tools/compile-preference-market-service-assurance.mjs, tools/validate-preference-market-service-assurance.mjs, test/preference-market-service-assurance.test.js
preference-network-formation.yml: 4 ref(s): tools/lib/preference-network-formation.mjs, tools/compile-preference-network-formation.mjs, tools/validate-preference-network-formation.mjs, test/preference-network-formation.test.js
preference-population-coverage-turnover-assurance.yml: 4 ref(s): tools/lib/preference-population-coverage-turnover-assurance.mjs, tools/compile-preference-population-coverage-turnover-assurance.mjs, tools/validate-preference-population-coverage-turnover-assurance.mjs, test/preference-population-coverage-turnover-assurance.test.js
preference-population-frame-assurance.yml: 4 ref(s): tools/lib/preference-population-frame-assurance.mjs, tools/compile-preference-population-frame-assurance.mjs, tools/validate-preference-population-frame-assurance.mjs, test/preference-population-frame-assurance.test.js
preference-pre-intake-assurance.yml: 4 ref(s): tools/lib/preference-pre-intake-assurance.mjs, tools/compile-preference-pre-intake-assurance.mjs, tools/validate-preference-pre-intake-assurance.mjs, test/preference-pre-intake-assurance.test.js
preference-provenance-recovery.yml: 4 ref(s): tools/lib/preference-provenance-recovery.mjs, tools/compile-preference-provenance-recovery.mjs, tools/validate-preference-provenance-recovery.mjs, test/preference-provenance-recovery.test.js
preference-real-case.yml: 4 ref(s): tools/lib/preference-real-case.mjs, tools/compile-preference-real-case.mjs, tools/validate-preference-real-case.mjs, test/preference-real-case.test.js
preference-record-linkage-temporal-succession-assurance.yml: 4 ref(s): tools/lib/preference-record-linkage-temporal-succession-assurance.mjs, tools/compile-preference-record-linkage-temporal-succession-assurance.mjs, tools/validate-preference-record-linkage-temporal-succession-assurance.mjs, test/preference-record-linkage-temporal-succession-assurance.test.js
preference-release-authority.yml: 4 ref(s): tools/lib/preference-release-authority.mjs, tools/compile-preference-release-authority.mjs, tools/validate-preference-release-authority.mjs, test/preference-release-authority.test.js
preference-remedy-enforcement.yml: 4 ref(s): tools/lib/preference-remedy-enforcement.mjs, tools/compile-preference-remedy-enforcement.mjs, tools/validate-preference-remedy-enforcement.mjs, test/preference-remedy-enforcement.test.js
preference-representation-custody.yml: 4 ref(s): tools/lib/preference-representation-custody.mjs, tools/compile-preference-representation-custody.mjs, tools/validate-preference-representation-custody.mjs, test/preference-representation-custody.test.js
preference-service-denominator-assurance.yml: 4 ref(s): tools/lib/preference-service-denominator-assurance.mjs, tools/compile-preference-service-denominator-assurance.mjs, tools/validate-preference-service-denominator-assurance.mjs, test/preference-service-denominator-assurance.test.js
preference-source-population-rule-assurance.yml: 4 ref(s): tools/lib/preference-source-population-rule-assurance.mjs, tools/compile-preference-source-population-rule-assurance.mjs, tools/validate-preference-source-population-rule-assurance.mjs, test/preference-source-population-rule-assurance.test.js
preference-standing-matrix.yml: 8 ref(s): tools/lib/preference-real-case.mjs, tools/lib/preference-human-companion.mjs, tools/lib/preference-hybrid-architecture.mjs, tools/lib/preference-representation-custody.mjs, tools/lib/preference-standing-matrix.mjs, tools/compile-preference-standing-matrix.mjs, ...
preference-topology-assurance.yml: 4 ref(s): tools/lib/preference-topology-assurance.mjs, tools/compile-preference-topology-assurance.mjs, tools/validate-preference-topology-assurance.mjs, test/preference-topology-assurance.test.js
preference-trust-federation.yml: 4 ref(s): tools/lib/preference-trust-federation.mjs, tools/compile-preference-trust-federation.mjs, tools/validate-preference-trust-federation.mjs, test/preference-trust-federation.test.js
project-stable-ground-alignment.yml: 3 ref(s): tools/build-project-stable-ground-alignment.mjs, tools/validate-project-stable-ground-alignment.mjs, test/project-stable-ground-alignment.test.js
project-stable-ground-sg02.yml: 2 ref(s): tools/validate-project-stable-ground-sg02.mjs, test/project-stable-ground-sg02.test.js
project-stable-ground-sg03.yml: 2 ref(s): tools/validate-project-stable-ground-sg03.mjs, test/project-stable-ground-sg03.test.js
project-stable-ground-sg04.yml: 11 ref(s): tools/build-project-stable-ground-sg04.mjs, tools/validate-project-stable-ground-sg04.mjs, test/project-stable-ground-sg04.test.js, tools/validate-project-stable-ground-alignment.mjs, test/project-stable-ground-alignment.test.js, tools/validate-project-stable-ground-sg02.mjs, ...
project-stable-ground-sg05.yml: 10 ref(s): tools/validate-project-stable-ground-sg05.mjs, test/project-stable-ground-sg05.test.js, tools/validate-project-stable-ground-alignment.mjs, test/project-stable-ground-alignment.test.js, tools/validate-project-stable-ground-sg02.mjs, test/project-stable-ground-sg02.test.js, ...
project-stable-ground-sg06.yml: 14 ref(s): tools/validate-project-stable-ground-sg06.mjs, test/project-stable-ground-sg06.test.js, tools/validate-project-stable-ground-alignment.mjs, test/project-stable-ground-alignment.test.js, tools/validate-project-stable-ground-sg02.mjs, test/project-stable-ground-sg02.test.js, ...
project-stable-ground-sg07.yml: 19 ref(s): tools/validate-project-stable-ground-sg07.mjs, tools/validate-project-stable-ground-sg08.mjs, test/project-stable-ground-sg07.test.js, test/project-stable-ground-sg08.test.js, test/project-stable-ground-sg09.test.js, tools/validate-project-stable-ground-alignment.mjs, ...
project-stable-ground-sg08.yml: 19 ref(s): tools/validate-project-stable-ground-sg08.mjs, tools/validate-project-stable-ground-sg09.mjs, test/project-stable-ground-sg08.test.js, test/project-stable-ground-sg09.test.js, tools/validate-project-stable-ground-alignment.mjs, test/project-stable-ground-alignment.test.js, ...
project-stable-ground-sg09.yml: 2 ref(s): tools/validate-project-stable-ground-sg09.mjs, test/project-stable-ground-sg09.test.js
project-stable-ground-sg10.yml: 5 ref(s): tools/build-project-stable-ground-sg10.mjs, tools/validate-project-stable-ground-sg10.mjs, test/project-stable-ground-sg10.test.js, tools/validate-project-stable-ground-sg11.mjs, test/project-stable-ground-sg11.test.js
project-stable-ground-sg11.yml: 5 ref(s): tools/build-project-stable-ground-sg11.mjs, tools/validate-project-stable-ground-sg11.mjs, test/project-stable-ground-sg11.test.js, tools/validate-project-stable-ground-sg12.mjs, test/project-stable-ground-sg12.test.js
project-stable-ground-sg12.yml: 7 ref(s): test/project-stable-ground-sg12.test.js, tools/validate-project-stable-ground-sg11.mjs, test/project-stable-ground-sg11.test.js, tools/build-project-stable-ground-sg12.mjs, tools/validate-project-stable-ground-sg12.mjs, npm run build:stable-ground, ...
status-sovereignty-compact.yml: 8 ref(s): test/project-stable-ground-sg08.test.js, test/project-stable-ground-sg09.test.js, tools/validate-project-stable-ground-sg07.mjs, test/project-stable-ground-sg07.test.js, tools/build-project-stable-ground-sg09.mjs, tools/validate-project-stable-ground-sg08.mjs, ...
status-sovereignty-rd-wave02-rd04-version-history.yml: 2 ref(s): tools/validate-status-sovereignty-residual-denominator-wave-01.mjs, tools/validate-status-sovereignty-residual-denominator-wave-02-constitution.mjs
status-sovereignty-rd01-wave02-terminal-closure.yml: 3 ref(s): test/status-sovereignty-residual-denominator-wave-02-current.test.js, tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs, tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
status-sovereignty-residual-denominator-wave-01.yml: 3 ref(s): tools/build-status-sovereignty-residual-denominator-wave-01.mjs, tools/validate-status-sovereignty-residual-denominator-wave-01.mjs, test/status-sovereignty-residual-denominator-wave-01.test.js
status-sovereignty-residual-denominator-wave-02-constitution.yml: 2 ref(s): tools/validate-status-sovereignty-residual-denominator-wave-02-constitution.mjs, test/status-sovereignty-residual-denominator-wave-02-constitution.test.js
status-sovereignty-residual-denominator-wave-02-current.yml: 3 ref(s): tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs, tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs, test/status-sovereignty-residual-denominator-wave-02-current.test.js
status-sovereignty-residual-denominator-wave-02-reconciliation.yml: 6 ref(s): tools/build-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs, tools/validate-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs, test/status-sovereignty-residual-denominator-wave-02-reconciliation.test.js, tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs, tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs, test/status-sovereignty-residual-denominator-wave-02-current.test.js
status-sovereignty-residual-denominator-wave-03-constitution.yml: 2 ref(s): tools/validate-status-sovereignty-residual-denominator-wave-03-constitution.mjs, test/status-sovereignty-residual-denominator-wave-03-constitution.test.js
status-sovereignty-residual-denominator-wave-03-current.yml: 3 ref(s): test/status-sovereignty-residual-denominator-wave-03-current.test.js, tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs, tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs
status-sovereignty-wave-01-review.yml: 1 ref(s): tools/build-project-stable-ground-sg09.mjs
status-sovereignty-wave-01-second-party-review.yml: 7 ref(s): tools/validate-project-stable-ground-sg08.mjs, test/project-stable-ground-sg08.test.js, tools/build-project-stable-ground-sg09.mjs, tools/validate-project-stable-ground-sg09.mjs, test/project-stable-ground-sg09.test.js, npm run build:status-sovereignty-second-party-review, ...
status-sovereignty-wave-01-targeted-acquisition.yml: 7 ref(s): test/project-stable-ground-sg08.test.js, test/project-stable-ground-sg09.test.js, tools/validate-project-stable-ground-sg07.mjs, test/project-stable-ground-sg07.test.js, tools/build-project-stable-ground-sg09.mjs, tools/validate-project-stable-ground-sg08.mjs, ...
status-sovereignty-wave-01.yml: 7 ref(s): tools/validate-project-stable-ground-sg07.mjs, test/project-stable-ground-sg07.test.js, tools/build-project-stable-ground-sg09.mjs, tools/validate-project-stable-ground-sg08.mjs, test/project-stable-ground-sg08.test.js, tools/validate-project-stable-ground-sg09.mjs, ...
status-sovereignty-wave-02-intake.yml: 2 ref(s): tools/validate-project-stable-ground-sg08.mjs, test/project-stable-ground-sg08.test.js
(189 workflows affected)

D. Workflows whose bytes are pinned by kept tools/tests (editing them requires regenerating manifests)
---------------------------------------------------------------------------------------------------
ci.yml: test/scheduled-crawl-admission.test.js, test/scheduled-crawl-pr-identity.test.js, test/scheduled-crawl-promotion.test.js, +2 more
crawl-industrial-exhaust.yml: test/scheduled-crawl-pr-identity.test.js, test/scheduled-crawl-promotion.test.js
crawl-official.yml: test/official-crawl.test.js, test/scheduled-crawl-pr-identity.test.js, test/scheduled-crawl-promotion.test.js
deploy.yml: test/deploy-workflow.test.js
m05-five-domain-route-watch.yml: test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js
m05-intel-realization-connection-authentication-custody-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js
m05-intel-realization-observation-time-custody-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs, tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js, +1 more
m05-intel-realization-provenance-object-custody.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js
m05-intel-realization-provenance-receipt-custody-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js
m05-intel-realization-request-envelope-custody-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js
m05-intel-realization-stage-receipt-control-stack-amendment.yml: test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js
m05-intel-realization-stage-receipt-repository-tree-custody-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.test.js
m05-intel-realization-temporal-reconciliation-admission-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test.js
m05-intel-realization-transport-body-representation-amendment.yml: tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs, test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js
no-magic-human-gate.yml: test/scheduled-crawl-admission.test.js, test/scheduled-crawl-promotion.test.js, test/scheduled-crawl-resumption.test.js, +1 more
other.yml (file absent): test/scheduled-crawl-admission.test.js, test/scheduled-crawl-resumption.test.js, test/scheduled-crawl-watchdog.test.js
preference-custody-v55.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs
preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs
resume-scheduled-crawl-admission.yml: test/scheduled-crawl-resumption.test.js, test/scheduled-crawl-watchdog.test.js
status-sovereignty-rd-wave03-rd04-nd-current-public-record-gap-validation.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs
status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-validation-v2.yml: tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v2.py
status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-validation-v3.yml: tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v3.py
status-sovereignty-rd-wave03-rd04-official-source-adjudication.yml: tools/build-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs
status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs
status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation-validation-v1.yml: tools/validate-status-sovereignty-rd-wave03-rd04-mt-row-state-reconciliation-v1.py
status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.yml: tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs, test/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.test.js
status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.yml: tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs
status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs
status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml: tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs, test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js
status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.yml: tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs
status-sovereignty-rd-wave03-rd04-state-implementation-intake.yml: tools/build-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs
status-sovereignty-rd-wave03-rd04-state-source-adjudication.yml: tools/build-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs
status-sovereignty-rd-wave03-rd05-member-participation-intake.yml: tools/build-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs
status-sovereignty-rd01-wave02-terminal-closure.yml: tools/build-status-sovereignty-rd-wave02-rd01-legal-entity.mjs
status-sovereignty-rd04-changed-input-gate-a09.yml: tools/build-status-sovereignty-rd04-changed-input-gate-a09.mjs, tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs
status-sovereignty-rd04-internal-adjudication-a08.yml: tools/build-status-sovereignty-rd04-internal-adjudication-a08.mjs, tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs
status-sovereignty-rd04-public-implementation-receipts-a07.yml: tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs, tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
status-sovereignty-rd04-snap-route-adjudication-a04.yml: tools/build-status-sovereignty-rd04-snap-route-adjudication-a04.py
status-sovereignty-rd04-snap-search-replay-a03.yml: tools/build-status-sovereignty-rd04-snap-search-replay-a03.py
status-sovereignty-rd04-snap-source-availability-a02.yml: tools/lib/status-sovereignty-rd04-snap-source-availability-a02-constants.mjs
temporary-m03-apply.yml (file absent): tools/validate-release.mjs
temporary-m03-source-export.yml (file absent): tools/validate-release.mjs
temporary-m04b-integrity-repair.yml (file absent): tools/validate-security-state-organism.mjs
temporary-m04b-organism-materialize-v2.yml (file absent): tools/validate-security-state-organism.mjs
temporary-m04b-organism-materialize.yml (file absent): tools/validate-security-state-organism.mjs
temporary-materialize-m05-s03-l7.yml (file absent): tools/validate-release.mjs
temporary-security-state-lineage-materialize.yml (file absent): tools/validate-security-state-organism.mjs

E. Kept tools/tests edited (no deletions) so they stop depending on removed workflow files
---------------------------------------------------------------------------------------
Release-scope builders: the `.github/workflows/<name>.yml` line was removed from the exact-byte release scope and the
manifests/reports they write were regenerated (data/project/*release-manifest.json, build/core-thesis/**, reports/core-thesis/**):
  tools/build-dca-h01.mjs
  tools/build-k0-epistemic-admissibility.mjs
  tools/build-k0-role-neutral-wave-02.mjs
  tools/build-k0-role-neutral-wave-03.mjs
  tools/build-k0-role-neutral-wave-04.mjs
  tools/build-k0-role-neutral-wave-05.mjs
  tools/build-k0-role-neutral-wave-06.mjs
  tools/build-k0-role-neutral-wave-07.mjs
  tools/build-k0-role-neutral-wave-08.mjs
  tools/build-k0-wave01-additional-acquisition.mjs
  tools/build-k0-wave01-field-adjudication.mjs
  tools/build-k0-wave02-field-adjudication.mjs
  tools/build-k0-wave03-field-adjudication.mjs
  tools/build-k0-wave04-field-adjudication.mjs
  tools/build-k0-wave05-field-adjudication.mjs
  tools/build-k0-wave06-field-adjudication.mjs
  tools/build-k0-wave07-field-adjudication.mjs
  tools/build-m05-answerable-power-sprint-06.mjs
  tools/build-m05-answerable-power-sprint-07.mjs
  tools/build-m05-answerable-power-sprint-08.mjs
  tools/build-m05-answerable-power-sprint-09.mjs
  tools/build-poof-clifford-ecology.mjs
  tools/build-status-sovereignty-compact.mjs
  tools/build-status-sovereignty-f02-snap.mjs
  tools/build-status-sovereignty-f04-aces-governance.mjs
  tools/build-status-sovereignty-f13-dcgsa.mjs
  tools/build-status-sovereignty-natsec100-first-pass.mjs
  tools/build-status-sovereignty-osc-first-pass.mjs
  tools/build-status-sovereignty-rd04-california-remedy-chain-a05.mjs
  tools/build-status-sovereignty-sbicct-first-pass.mjs
  tools/build-status-sovereignty-six-gate-first-pass-reconciliation.mjs
  tools/build-status-sovereignty-wave-01-review.mjs
  tools/build-status-sovereignty-wave-01-second-party-review.mjs
  tools/build-status-sovereignty-wave-01-targeted-acquisition.mjs
  tools/build-status-sovereignty-wave-01.mjs
  tools/build-status-sovereignty-wave-02-intake.mjs
  tools/build-status-sovereignty-wave-02-internal-adversarial-review.mjs
  tools/build-status-sovereignty-wave-02-review.mjs
  tools/build-status-sovereignty-wave-02-second-party-review.mjs
Validators/tests where only a workflow-file assertion or the matching count was dropped:
  test/deploy-workflow.test.js
  test/m05-answerable-power-sprint-01.test.js
  test/m05-answerable-power-sprint-02-leg-02.test.js
  test/m05-answerable-power-sprint-02-leg-03.test.js
  test/m05-answerable-power-sprint-08.test.js
  test/m05-answerable-power-sprint-09.test.js
  tools/validate-allocator-war-waterline.mjs
  tools/validate-m05-answerable-power-sprint-09.mjs
  tools/validate-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.mjs
  tools/validate-status-sovereignty-rd-wave03-rd04-ca-sd-wa-successor-protocol.mjs
  tools/validate-status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.mjs
data/project/poof-clifford-constitutional-change-log.json: appended receipt POOF-CONST-2026-10-12-007 (protected_paths_touched = tools/build-poof-clifford-ecology.mjs).
  Deleting the protected path .github/workflows/poof-clifford-ecology.yml needs its own appended receipt (coverage must equal the protected-path diff exactly).
data/project/allocator-war-waterline-release-manifest.json: workflow entry dropped, digests recomputed (7 files).

F. Kept files that cannot pass without workflow files WP3 removed (decision needed)
-----------------------------------------------------------------------------------
Measured with .github/workflows reduced to ci, deploy, update-sweep, crawl-official, crawl-industrial-exhaust and .github/scripts
reduced to the four crawl helpers. None of these run in `npm test` or `npm run release:check`.
They pin the exact bytes / git blob SHA of a removed workflow inside sealed data (or assert its text), and are themselves pinned by
sibling manifests, so removing the assertion would cascade through the sealed chain. Either restore those workflow files or delete these
files (they are the "pins of the repo's own earlier files" class). Not deleted here: they are in the KEEP families and no user approval was given.
## sealed workflow pins (40)
test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js
test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js
test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js
test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js
test/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.test.js
test/status-sovereignty-rd-wave03-rd04-state-implementation-intake.test.js
test/status-sovereignty-rd-wave03-rd05-member-participation-intake.test.js
test/status-sovereignty-rd04-a06-full-corpus.test.js
test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js
test/status-sovereignty-rd04-snap-source-availability-a02.test.js
test/status-sovereignty-six-gate-first-pass-reconciliation.test.js
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs
tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-mt-row-state-reconciliation-v1.py
tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-reconciliation-v3.py
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs
tools/validate-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs
tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs
tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs
tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs
tools/validate-status-sovereignty-rd04-snap-route-adjudication-a04.py
tools/validate-status-sovereignty-rd04-snap-source-availability-a02.mjs
tools/validate-status-sovereignty-six-gate-first-pass-reconciliation.mjs
## scheduled-crawl admission/promotion/resumption/watchdog machinery tests (4) - they test removed .github/scripts and the removed no-magic-human-gate workflow; owned by the workflow package
test/scheduled-crawl-admission.test.js
test/scheduled-crawl-promotion.test.js
test/scheduled-crawl-resumption.test.js
test/scheduled-crawl-watchdog.test.js
~~~~
