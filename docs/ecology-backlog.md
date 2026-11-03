# Ecology backlog: executable historical work

The owner directive of November 2, 2026 supersedes the narrow Integrity daily sweep. The scope is the existing 24 research estates and five overlapping historical phases beginning approximately 1991. Integrity.ai is a consuming view, not the whole research universe. The earlier 35-label/October-2025 boundary and December-2026 timer sunset remain historical specifications, not the active campaign limit.

## Actual owner and procedure

The same Clifford worktree owns `tools/ecology_backlog.py`; the existing project session owns `ecology/ecology.sqlite`, its content-addressed source bodies, request/cursor ledger, full-text search index, temporal observations and generated `index.html`. The SQLite tables are task-specific acquisition cursors and a rebuildable search projection of existing source authorities, not a replacement for canonical claims, the estate scheduler or Cantos. Source records and review standing stay with their owners. No public release or endpoint was added.

```bash
python3 -B tools/ecology_backlog.py init --state <existing-session>/ecology --cutoff 2026-11-02
python3 -u -B tools/ecology_backlog.py cycle --state <existing-session>/ecology --seconds 900 --requests 900 --lanes sources,awards,policy
python3 -B tools/ecology_backlog.py status --state <existing-session>/ecology
python3 -B tools/ecology_backlog.py verify --state <existing-session>/ecology
python3 -B tools/ecology_backlog.py search --state <existing-session>/ecology --query "procurement integrity" --limit 25
```

Initialization is idempotent for its frozen cutoff. Each cycle has one retained TierDesk job and at most three native threads, one per independent source family. It locks the acquisition owner, checkpoints each response and cursor, preserves interrupted/failed captures, and resumes exactly the remaining pages. A fixed request/time quantum ends one invocation, not the campaign. The existing `Drain Clifford historical backlog` automation resumes useful remaining work hourly. It no longer expires on December 31. Models are reserved for bounded source-adapter repair or evidence judgment, not page polling; existing native worker limits still apply.

## First executable inventory

The seed derives from existing project-owned declarations:

- 24 estate definitions and their historical-phase alignment.
- 103 source-route labels representing 76 unique gateway URLs, with 155 estate/source uses retained by the existing registry.
- 196 existing NatSec100 company labels plus the 35 retained/operator-supplied SCHOOLHOUSE labels, producing 230 distinct exact-text queries. No unsupported aliases, subsidiaries or identity joins are manufactured.
- Annual Federal Register search strata from 1994 through 2026 for the declared regulatory, sanctions/foreign-investment, data-rights and procurement terms.
- Annual GOV.UK search strata from 1991 through 2026 for two explicitly declared public-policy topics. Missing years and no-result searches remain bounded search states.

The initial 609 query/gateway tasks are not the total historical backlog. Official document-body tasks are generated from discovered source locators. Remaining unimplemented adapters, archives, source failures, identifier resolution, full-text parsing and human review are separate work. A fetched portal never makes its estate complete. No overall percentage is computed against an open-ended universe.

## Real source-floor observations

An actual USAspending request with a 1991 start returned HTTP 422 and the precise floor `2007-10-01`. Its admissible search interval is therefore recorded separately from the project's 1991 horizon. The pre-October-2007 award interval remains a legacy/archive acquisition gap. A request overlapping a later transaction window can still return an award with an earlier period-of-performance start; that is not comprehensive coverage of its early years.

FederalRegister.gov actually returned 1994 records. Its 1991–1993 interval remains historical-archive work. Results are counted and paginated against source metadata; a source cap triggers smaller date windows rather than a false completeness declaration. GOV.UK result dates are checked against each requested annual window before that query can be accepted.

## Content, identities and chronology

Original source responses are stored by SHA-256, and each normalized search record names its source response and JSON position. Requests and errors remain inspectable. Already captured responses are reused for the same frozen request. A query completion means only that its declared pagination was exhausted; it grants no legal-entity identity, causal connection or publication approval.

USAspending `Award Amount` remains a source-native field. It is not silently presented as a payment, an obligation, a ceiling, a margin, or an accepted delivered system. Names remain query labels until receipt-supported UEI/CIK/EIN or other exact identity evidence is independently reconciled.

Future end/effective/comment dates are recorded in a separate table with source time, observation time, date type and `announced_or_scheduled_not_observed_fulfilled`. A future date never becomes an observed outcome. Unknown dates stay unknown.

## Existing corpus and access

The retained-file search projection is limited to the exact existing publication allowlist, with private support, LinkedIn and Arcadia materials excluded. It was partly built before the native time quantum expired. A subsequent indexing launch and a separate candidate-review worker launch were refused by the tool safety layer. They are execution holds, not completed stages or permission to use another transport to circumvent the refusal. Their useful partial results remain preserved. Public-source acquisition is a distinct permitted operation and continues independently.

The search projection retains original source status. Indexing a file cannot upgrade a candidate, a synthetic fixture, a methodology document, or a compiled report into a fact. File/row counts include data and methodological records and must not be described as unique contracts or accepted findings. Generated views can duplicate descriptions of the same underlying record; no economic totals are summed across them.

## Recovery and verification

The first execution exposed a twelve-versus-thirteen-column SQL INSERT defect. Both affected jobs were stopped. Captured source bodies were preserved, the local insertion boundary was corrected, and the exact internal-error tasks were rearmed with their original bytes. The failed jobs, source dispositions and regression are retained. The twelve regression checks exercise the real insertion function, actual captured award data, duplicate/replay behavior, source/FTS consistency, full text retention, private-address and URL-credential refusal, mutation detection, and the distinction between exhausted queries and complete estates.

A source-specific `source_blocked` or `repair_required` state is a prompt for exact access/schema/adapter repair, not a complete corpus. No access bypass, credential disclosure, rate-limit evasion, private-person score, paid overage, external outreach or canonical promotion is authorized by this campaign.

## Completion and next phase

Historical acquisition can close only for named bounded source populations with complete page/partition accounting and reproducible retained bytes. Identity, normalization, indexing and substantive review each retain their own state. The ongoing campaign must keep selecting useful remaining machine work across the other estates and adapters, rather than repeatedly refreshing a finished demonstration. When genuinely source-/permission-/review-dependent residuals remain, keep them explicit with their triggering conditions. Newly arriving records and observed fulfillment can then advance the future-facing layer without rewriting the prior historical record.

## Full-text source correction

The human-facing Federal Register HTML URL returned a HTTP-200 Request Access/CAPTCHA page. The initial generic parser incorrectly labeled those responses as document bodies. This was found by comparing repeated response sizes, verified against the actual retained source page, and corrected in the native state and delivered W01 snapshot. Raw responses and the failed invocation remain retained; 197 challenge captures were reclassified and unattempted HTML paths were placed on a source-access hold. No CAPTCHA was solved, access restriction bypassed or alternative host used to impersonate a browser.

The site explicitly offers its public API for automated access. A separate real request to the official document-detail API supplied `raw_text_url`; that published machine-readable endpoint returned the actual 94-5437 text with source-native document number. The new adapter first acquires and verifies exact API document identity, then follows only the returned text/XML URL, rejecting access challenges and bodies missing the expected document number. It retains the challenged browser path as a distinct hold. Source-data metadata, detail records, machine-readable document bodies and outcomes remain separately classified. Fifteen regression tests include this actual response and source transition.


## Historical Federal Register issue archive, 1991–1993

The FederalRegister.gov article API's demonstrated search era begins in 1994. The official GovInfo digitized Federal Register collection supports issue-level MODS metadata and PDF archive locators for 1991–1993. The older issue-level PDFs are not article-level JSON or text; their presence does not make those years fully searched, read, or topic-classified. One actual January 2, 1991 GovInfo MODS issue was acquired and checked against its native document identifier and date. The new historical source adapter enqueues 784 weekday date candidates for the three-year interval on its next acquisition cycle, retains exact response bytes and hashes, treats 404 and source-access failures as bounded locator outcomes, and indexes successful issues as `federal_register_legacy_issue_metadata` with `source_issue_metadata_only` review. It does not download the potentially enormous scanned PDFs or apply OCR. Source-native PDF locators are retained for later rights-respecting archival extraction. The existing three-lane acquisition lock remains the only native cycle owner. This is a partial archival coverage advance, not a claim that 1991–1993 or any estate is complete.

## Consolidated checkout and retained-source test inputs

The historical acquisition engine and owner-local Evidence Desk are reconciled with the meeting/award publication baseline on canonical local main. The captured source corpus remains in the existing project session, outside Git and outside the Pages allowlist. In arbitrary worktrees, set `CLIFFORD_ECOLOGY_STATE` to that exact state directory before running `python -m unittest discover -s test -p 'ecology*test.py'`. Tests use the retained real source bodies and open the live database read-only; they neither copy the corpus into Git nor silently substitute synthetic data. Canonical and ordinary project worktrees also resolve the known sibling session layout.
