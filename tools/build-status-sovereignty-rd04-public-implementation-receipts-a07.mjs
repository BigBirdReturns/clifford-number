#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-public-implementation-receipts-a07';
const dataRoot = path.join(root, 'data/intake', slug);
const custodyRoot = path.join(dataRoot, 'source-custody');
const projectManifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const reportRoot = path.join(root, 'reports/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07');
const buildRoot = path.join(root, 'build/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07');
const milestonePath = path.join(root, 'docs/milestones/ssc-rd04-public-implementation-receipts-a07.md');
const expectedA06Release = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';

const sourcePaths = {
  shn: process.env.A07_SHN_RECONCILED,
  candidate: process.env.A07_CANDIDATE_RECEIPTS,
  sitemap: process.env.A07_SITEMAP_PROBE,
  crawl: process.env.A07_OFFICIAL_CRAWL_RECONCILED,
  archiveLedger: process.env.A07_ARCHIVE_LEDGER,
  runLedger: process.env.A07_RUN_LEDGER
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => { ensureDir(path.dirname(target)); fs.writeFileSync(target, stable(value)); };
const copyJson = (source, target) => writeJson(target, readJson(source));
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/');

function requireFile(target, label) {
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${label} is missing: ${target ?? '<unset>'}`);
  }
}

function requireDirectory(target, label) {
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    throw new Error(`${label} is missing: ${target ?? '<unset>'}`);
  }
}

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

for (const [key, value] of Object.entries(sourcePaths)) {
  if (key === 'archiveLedger' || key === 'runLedger') requireFile(value, key);
  else requireDirectory(value, key);
}

const shnSummary = readJson(path.join(sourcePaths.shn, 'summary.json'));
const candidateSummary = readJson(path.join(sourcePaths.candidate, 'summary.json'));
const sitemapSummary = readJson(path.join(sourcePaths.sitemap, 'summary.json'));
const crawlSummary = readJson(path.join(sourcePaths.crawl, 'summary.json'));
const archiveLedger = readJson(sourcePaths.archiveLedger);
const runLedger = readJson(sourcePaths.runLedger);

if (shnSummary.status !== 'pass') throw new Error(`exact-SHN summary status ${shnSummary.status}`);
if (candidateSummary.status !== 'pass') throw new Error(`candidate receipt status ${candidateSummary.status}`);
if (!['pass', 'bounded_with_failures'].includes(sitemapSummary.status)) throw new Error(`sitemap status ${sitemapSummary.status}`);
if (crawlSummary.status !== 'pass') throw new Error(`official crawl status ${crawlSummary.status}`);
if (shnSummary.parent?.a06_release_sha256 !== expectedA06Release) throw new Error('exact-SHN parent digest drift');
if (sitemapSummary.parent_a06_release_sha256 !== expectedA06Release) throw new Error('sitemap parent digest drift');

const namedCustody = [
  'shn-full',
  'candidate-receipts',
  'sitemap-probe',
  'official-crawl'
];
for (const name of namedCustody) fs.rmSync(path.join(custodyRoot, name), { recursive: true, force: true });
ensureDir(custodyRoot);

const shnCustody = path.join(custodyRoot, 'shn-full');
const candidateCustody = path.join(custodyRoot, 'candidate-receipts');
const sitemapCustody = path.join(custodyRoot, 'sitemap-probe');
const crawlCustody = path.join(custodyRoot, 'official-crawl');

copyJson(path.join(sourcePaths.shn, 'summary.json'), path.join(shnCustody, 'summary.json'));
copyJson(path.join(sourcePaths.shn, 'candidate-rows.json'), path.join(shnCustody, 'candidate-rows.json'));
copyJson(path.join(sourcePaths.shn, 'candidate-documents.json'), path.join(shnCustody, 'candidate-documents.json'));
copyJson(path.join(sourcePaths.shn, 'failure-ledger.json'), path.join(shnCustody, 'failure-ledger.json'));

copyJson(path.join(sourcePaths.candidate, 'summary.json'), path.join(candidateCustody, 'summary.json'));
copyJson(path.join(sourcePaths.candidate, 'candidate-document-custody.json'), path.join(candidateCustody, 'candidate-document-custody.json'));
copyJson(path.join(sourcePaths.candidate, 'explicit-language-candidates.json'), path.join(candidateCustody, 'explicit-language-candidates.json'));
copyJson(path.join(sourcePaths.candidate, 'failure-ledger.json'), path.join(candidateCustody, 'failure-ledger.json'));

copyJson(path.join(sourcePaths.sitemap, 'summary.json'), path.join(sitemapCustody, 'summary.json'));
copyJson(path.join(sourcePaths.sitemap, 'failure-ledger.json'), path.join(sitemapCustody, 'failure-ledger.json'));
const sourceInventoryRoot = path.join(sourcePaths.sitemap, 'inventories');
const targetInventoryRoot = path.join(sitemapCustody, 'inventories');
requireDirectory(sourceInventoryRoot, 'sitemap inventories');
for (const target of collectFiles(sourceInventoryRoot).sort()) {
  if (!target.endsWith('.json')) continue;
  copyJson(target, path.join(targetInventoryRoot, path.relative(sourceInventoryRoot, target)));
}

for (const name of [
  'summary.json',
  'selected-urls.json',
  'page-receipts.json',
  'shn-page-candidates.json',
  'generic-language-candidates.json',
  'case-joined-machine-candidates.json',
  'unresolved-urls.json',
  'failure-ledger.json'
]) copyJson(path.join(sourcePaths.crawl, name), path.join(crawlCustody, name));

const sourceLedger = {
  schema_version: 'ssc-rd04-a07-source-ledger@1',
  execution_id: 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07',
  as_of: '2026-08-02',
  parent_a06_release_sha256: expectedA06Release,
  run_ledger: runLedger,
  archive_ledger: archiveLedger,
  retained_readable_products: {
    exact_shn: [
      rel(path.join(shnCustody, 'summary.json')),
      rel(path.join(shnCustody, 'candidate-rows.json')),
      rel(path.join(shnCustody, 'candidate-documents.json'))
    ],
    candidate_receipts: [
      rel(path.join(candidateCustody, 'summary.json')),
      rel(path.join(candidateCustody, 'candidate-document-custody.json')),
      rel(path.join(candidateCustody, 'explicit-language-candidates.json'))
    ],
    sitemap_probe: collectFiles(sitemapCustody).filter((target) => target.endsWith('.json')).map(rel).sort(),
    official_crawl: collectFiles(crawlCustody).filter((target) => target.endsWith('.json')).map(rel).sort()
  },
  boundaries: {
    artifact_archive_proves_source_bytes_retained: true,
    exact_shn_match_proves_claimant_identity: false,
    exact_shn_match_proves_implementation: false,
    machine_language_candidate_is_verified_receipt: false,
    failed_fetch_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    external_contacts: 0,
    external_reviews: 0,
    graph_effect: 'none'
  }
};
writeJson(path.join(custodyRoot, 'source-ledger.json'), sourceLedger);

const shnCounts = shnSummary.counts ?? {};
const candidateCounts = candidateSummary.counts ?? {};
const sitemapCounts = sitemapSummary.counts ?? {};
const crawlCounts = crawlSummary.counts ?? {};
const explicitCandidates = readJson(path.join(sourcePaths.candidate, 'explicit-language-candidates.json'));
const caseJoinedCandidates = readJson(path.join(sourcePaths.crawl, 'case-joined-machine-candidates.json'));

const core = {
  schema_version: 'ssc-rd04-a07-core@1',
  hypothesis_id: 'SSC-H01',
  lane_id: 'SSC-RD04',
  execution_id: 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07',
  issue: 739,
  as_of: '2026-08-02',
  title: 'California CalFresh public implementation and restoration receipt denominator',
  status: 'complete_bounded_public_record_search_denominators_machine_candidates_unverified',
  parent: {
    execution_id: 'SSC-RD04-CALFRESH-DECISION-CORPUS-A06',
    release_sha256: expectedA06Release,
    registry_rows: shnSummary.parent?.a06_registry_rows,
    documents: shnSummary.parent?.a06_documents,
    D1_relief_rows: shnSummary.parent?.d1_relief_rows,
    D1_relief_documents: shnSummary.parent?.d1_relief_documents,
    D1_unique_nonblank_shns: shnSummary.parent?.d1_unique_nonblank_shns
  },
  denominator_contract: {
    exact_shn_query_interval: shnSummary.query_contract,
    D1_shns: shnCounts.D1_shns,
    official_sitemap_seeds: sitemapSummary.seeds,
    sitemap_lexical_candidate_urls: sitemapCounts.lexical_candidate_urls,
    official_selected_urls: crawlCounts.selected_urls,
    outcome_selection_before_search: false,
    outside_human_dependency: false,
    project_blocking: false
  },
  stages: [
    {
      stage_id: 'A07-S1',
      title: 'Frozen D1 relief-order denominator',
      state: 'complete_parent_denominator',
      observed: shnSummary.parent?.d1_unique_nonblank_shns,
      finding: 'The exact A06 relief-order denominator contains the complete predeclared nonblank SHN set used by A07.',
      proves_implementation: false
    },
    {
      stage_id: 'A07-S2',
      title: 'All-program exact-SHN registry denominator',
      state: 'complete_exact_query_denominator',
      observed: shnCounts.D1_shns,
      query_receipts: shnCounts.query_receipts,
      candidate_rows: shnCounts.public_followup_candidate_rows,
      candidate_documents: shnCounts.public_followup_candidate_documents,
      unresolved_caps: shnCounts.unresolved_capped_shns,
      finding: 'Every D1 SHN was queried under the frozen all-program public-registry contract with cap resolution and fail-closed reconciliation.',
      proves_claimant_identity: false,
      proves_implementation: false
    },
    {
      stage_id: 'A07-S3',
      title: 'Candidate decision-document custody',
      state: 'complete_candidate_document_custody',
      candidate_documents: candidateCounts.candidate_documents,
      valid_pdfs: candidateCounts.valid_candidate_pdfs,
      invalid_documents: candidateCounts.invalid_candidate_documents,
      later_documents: candidateCounts.later_same_shn_documents,
      machine_language_candidates: candidateCounts.later_documents_with_qualified_completed_action_language,
      finding: 'Every same-public-SHN candidate document was retained and screened conservatively without promoting language into verified implementation.',
      proves_same_claimant: false,
      proves_implementation: false
    },
    {
      stage_id: 'A07-S4',
      title: 'Official sitemap surface denominator',
      state: sitemapSummary.status === 'pass' ? 'complete_bounded_sitemap_probe' : 'bounded_sitemap_probe_with_failures',
      seeds: sitemapCounts.seeds,
      discovered_page_urls: sitemapCounts.discovered_page_urls,
      lexical_candidate_urls: sitemapCounts.lexical_candidate_urls,
      source_failures: sitemapCounts.failures,
      bound_hits: sitemapCounts.bound_hits,
      finding: 'Official CDSS, DHCS, Auditor, and Courts sitemap surfaces were inventoried before crawling; source failures and bounds remain visible.',
      proves_complete_official_web_universe: false
    },
    {
      stage_id: 'A07-S5',
      title: 'Official selected-URL crawl denominator',
      state: 'complete_selected_url_attempt_denominator',
      selected_urls: crawlCounts.selected_urls,
      attempted_urls: crawlCounts.attempted_urls,
      successful_bodies: crawlCounts.successful_bodies,
      unresolved_urls: crawlCounts.unresolved_urls,
      pages_with_exact_D1_shn_strings: crawlCounts.pages_with_exact_D1_shn_strings,
      pages_with_qualified_completed_action_language: crawlCounts.pages_with_qualified_completed_action_language,
      pages_with_exact_shn_and_qualified_language: crawlCounts.pages_with_exact_D1_shn_and_qualified_completed_action_language,
      finding: 'Every sitemap-selected lexical candidate URL was attempted and preserved or recorded unresolved.',
      proves_complete_official_web_universe: false,
      proves_case_specific_implementation: false
    },
    {
      stage_id: 'A07-S6',
      title: 'Machine candidate ledger',
      state: 'machine_candidates_unadjudicated',
      same_shn_explicit_language_candidates: explicitCandidates.length,
      official_page_case_joined_machine_candidates: caseJoinedCandidates.length,
      finding: 'Machine-screened candidates remain candidates only; no language hit is promoted to a verified receipt.',
      is_external_review: false,
      proves_implementation: false
    },
    {
      stage_id: 'A07-S7',
      title: 'Verified public implementation and restoration receipts',
      state: 'not_observed',
      verified_public_implementation_receipts: 0,
      verified_public_restoration_receipts: 0,
      finding: 'No retained public source presently satisfies the full identity, completed-action, amount or benefit, timing, and implementation custody contract.',
      missing_receipt_is_noncompliance: false
    }
  ],
  counts: {
    D1_shns: shnCounts.D1_shns,
    exact_shn_query_receipts: shnCounts.query_receipts,
    exact_shn_candidate_rows: shnCounts.public_followup_candidate_rows,
    exact_shn_candidate_documents: shnCounts.public_followup_candidate_documents,
    valid_candidate_pdfs: candidateCounts.valid_candidate_pdfs,
    invalid_candidate_documents: candidateCounts.invalid_candidate_documents,
    later_same_shn_documents: candidateCounts.later_same_shn_documents,
    same_shn_explicit_language_candidates: explicitCandidates.length,
    sitemap_seeds: sitemapCounts.seeds,
    sitemap_discovered_page_urls: sitemapCounts.discovered_page_urls,
    sitemap_lexical_candidate_urls: sitemapCounts.lexical_candidate_urls,
    official_selected_urls: crawlCounts.selected_urls,
    official_attempted_urls: crawlCounts.attempted_urls,
    official_successful_bodies: crawlCounts.successful_bodies,
    official_unresolved_urls: crawlCounts.unresolved_urls,
    official_pages_with_exact_D1_shn_strings: crawlCounts.pages_with_exact_D1_shn_strings,
    official_pages_with_qualified_completed_action_language: crawlCounts.pages_with_qualified_completed_action_language,
    official_case_joined_machine_candidates: caseJoinedCandidates.length,
    verified_public_implementation_receipts: 0,
    verified_public_restoration_receipts: 0,
    external_contacts: 0,
    external_reviews: 0,
    adjudications: 0,
    publication_clearances: 0,
    graph_effects: 0
  },
  current_result: {
    terminal_state: 'bounded_public_search_complete_no_verified_implementation_or_restoration_receipt',
    exact_shn_denominator_complete: true,
    candidate_document_custody_complete: true,
    selected_official_url_attempt_denominator_complete: true,
    complete_official_public_web_universe: false,
    verified_implementation_supported: false,
    verified_restoration_supported: false,
    missing_public_receipt_is_noncompliance: false,
    residual_class_closed: false,
    publication_effect: 'none',
    graph_effect: 'none',
    adoption_effect: 'none'
  },
  next_handoff: {
    acquisition_id: 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A08',
    status: 'authorized_nonblocking_internal_candidate_adjudication_and_public_source_refresh',
    outside_human_dependency: false,
    project_blocking: false,
    unit: 'machine candidates with exact source context, followed by bounded public-source refreshes; zero candidates terminate honestly',
    forbidden_shortcuts: [
      'treating the same SHN as claimant identity without an explicit source join',
      'treating an order or prospective command as completed implementation',
      'treating a keyword hit as restoration, payment, timeliness, or compliance',
      'treating a failed fetch or missing public page as noncompliance',
      'waiting for an outside person or agency response before continuing nondependent work'
    ]
  },
  boundaries: {
    same_shn_proves_same_claimant: false,
    same_shn_proves_implementation: false,
    order_proves_compliance: false,
    machine_language_candidate_is_verified_receipt: false,
    selected_url_denominator_is_complete_official_web_universe: false,
    failed_fetch_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    result_proves_effective_counterpower: false,
    result_proves_national_prevalence: false,
    result_proves_racial_hierarchy: false,
    result_proves_unlawful_motive: false,
    result_proves_coordination: false,
    result_proves_common_purpose: false,
    result_is_external_review: false,
    graph_effect: 'none'
  }
};
writeJson(path.join(dataRoot, 'core.json'), core);

const projectionManifest = {
  schema_version: 'ssc-rd04-a07-projection-manifest@1',
  execution_id: core.execution_id,
  as_of: core.as_of,
  source_ledger_path: rel(path.join(custodyRoot, 'source-ledger.json')),
  counts: core.counts,
  authority: {
    verified_public_implementation_receipts: 0,
    verified_public_restoration_receipts: 0,
    external_contacts: 0,
    graph_effect: 'none'
  }
};
ensureDir(reportRoot);
ensureDir(buildRoot);
writeJson(path.join(reportRoot, 'data.json'), core);
writeJson(path.join(buildRoot, 'data.json'), core);
writeJson(path.join(buildRoot, 'manifest.json'), projectionManifest);

const cards = core.stages.map((stage) => `
      <article class="stage">
        <h2>${escapeHtml(stage.stage_id)} · ${escapeHtml(stage.title)}</h2>
        <p><strong>State:</strong> ${escapeHtml(stage.state)}</p>
        <p>${escapeHtml(stage.finding)}</p>
      </article>`).join('');
const reportHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(core.title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; padding: 2rem; line-height: 1.55; }
    main { max-width: 74rem; margin: 0 auto; }
    .lede, .stage { border: 1px solid currentColor; border-radius: .75rem; padding: 1rem 1.25rem; margin: 1rem 0; }
    code { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(core.title)}</h1>
    <section class="lede">
      <p><strong>Status:</strong> ${escapeHtml(core.status)}</p>
      <p><strong>Verified public implementation receipts:</strong> 0</p>
      <p><strong>Verified public restoration receipts:</strong> 0</p>
      <p>This held surface records complete bounded search denominators and exact source custody. Same-SHN and language matches remain unverified machine candidates.</p>
    </section>${cards}
  </main>
</body>
</html>
`;
fs.writeFileSync(path.join(reportRoot, 'index.html'), reportHtml);

const milestone = `# SSC RD-04 A07 · Public implementation and restoration receipt denominator

A07 completes the predeclared public-record searches without asking the operator to find or recruit anyone.

\`\`\`text
D1 SHNs:                              ${core.counts.D1_shns}
exact-SHN query receipts:             ${core.counts.exact_shn_query_receipts}
same-SHN candidate rows:              ${core.counts.exact_shn_candidate_rows}
same-SHN candidate documents:         ${core.counts.exact_shn_candidate_documents}
official selected URLs:               ${core.counts.official_selected_urls}
official attempted URLs:              ${core.counts.official_attempted_urls}
official unresolved URLs:             ${core.counts.official_unresolved_urls}
verified implementation receipts:     0
verified restoration receipts:        0
external contacts:                    0
graph effect:                         none
\`\`\`

The result is not a negative finding about agency compliance. It is a bounded statement about what the frozen public searches returned and what exact bytes were retained. Same SHN does not prove claimant identity; an order does not prove implementation; a machine language hit does not prove payment, restoration, or timeliness; and failed or missing public material is not noncompliance.

A08 is authorized as a nonblocking internal candidate-adjudication and public-source-refresh lane. Zero candidates or zero verified receipts remain honest terminal states and do not block unrelated project work.
`;
ensureDir(path.dirname(milestonePath));
fs.writeFileSync(milestonePath, milestone);

const releaseScope = [
  path.join(root, '.github/workflows/status-sovereignty-rd04-public-implementation-receipts-a07.yml'),
  dataRoot,
  milestonePath,
  reportRoot,
  buildRoot,
  path.join(root, 'schemas/status-sovereignty-rd04-public-implementation-receipts-a07.schema.json'),
  path.join(root, 'test/status-sovereignty-rd04-public-implementation-receipts-a07.test.js'),
  path.join(root, 'tools/build-status-sovereignty-rd04-public-implementation-receipts-a07.mjs'),
  path.join(root, 'tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs'),
  path.join(root, 'tools/acquisition/status-sovereignty-rd04-a07')
];
const releaseFiles = releaseScope.flatMap(collectFiles)
  .filter((target) => fs.existsSync(target) && fs.statSync(target).isFile())
  .filter((target) => target !== projectManifestPath)
  .sort((a, b) => rel(a).localeCompare(rel(b)));
const seen = new Set();
const entries = [];
for (const target of releaseFiles) {
  const relative = rel(target);
  if (seen.has(relative)) continue;
  seen.add(relative);
  const body = fs.readFileSync(target);
  entries.push({ path: relative, sha256: sha256(body), bytes: body.length });
}
const combined = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''), 'utf8'));
const releaseManifest = {
  schema_version: 'ssc-rd04-a07-release-manifest@1',
  acquisition_id: core.execution_id,
  as_of: core.as_of,
  hash_mode: 'sha256_exact_bytes',
  scope_ordered: true,
  self_included: false,
  entries,
  combined_sha256: combined,
  boundaries: {
    exact_bytes_prove_claimant_identity: false,
    exact_bytes_prove_implementation: false,
    exact_bytes_prove_restoration: false,
    manifest_proves_external_review: false,
    manifest_authorizes_publication: false,
    manifest_advances_adoption: false,
    graph_effect: 'none'
  }
};
writeJson(projectManifestPath, releaseManifest);

console.log(`build-status-sovereignty-rd04-public-implementation-receipts-a07: ${entries.length} exact-byte entries, release ${combined}`);
