#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-public-implementation-receipts-a07';
const dataRoot = path.join(root, 'data/intake', slug);
const custodyRoot = path.join(dataRoot, 'source-custody');
const corePath = path.join(dataRoot, 'core.json');
const releaseManifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const reportDataPath = path.join(root, 'reports/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07/data.json');
const reportHtmlPath = path.join(root, 'reports/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07/index.html');
const buildDataPath = path.join(root, 'build/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07/data.json');
const buildManifestPath = path.join(root, 'build/core-thesis/status-sovereignty/rd04-public-implementation-receipts-a07/manifest.json');
const expectedA06Release = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

export function verifyCoreObject(core, evidence = {}) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(core && typeof core === 'object' && !Array.isArray(core), 'core must be an object');
  if (!core || typeof core !== 'object' || Array.isArray(core)) return errors;

  check(core.schema_version === 'ssc-rd04-a07-core@1', 'schema_version');
  check(core.hypothesis_id === 'SSC-H01', 'hypothesis_id');
  check(core.lane_id === 'SSC-RD04', 'lane_id');
  check(core.execution_id === 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07', 'execution_id');
  check(core.issue === 739, 'issue');
  check(core.as_of === '2026-08-02', 'as_of');
  check(core.status === 'complete_bounded_public_record_search_denominators_machine_candidates_unverified', 'status');

  check(core.parent?.execution_id === 'SSC-RD04-CALFRESH-DECISION-CORPUS-A06', 'parent execution');
  check(core.parent?.release_sha256 === expectedA06Release, 'parent release digest');
  check(core.parent?.registry_rows === 12282, 'parent registry rows');
  check(core.parent?.documents === 11672, 'parent documents');
  check(core.parent?.D1_relief_rows === 6633, 'parent D1 rows');
  check(core.parent?.D1_relief_documents === 6294, 'parent D1 documents');
  check(core.parent?.D1_unique_nonblank_shns === 6292, 'parent D1 SHNs');

  check(core.denominator_contract?.D1_shns === 6292, 'denominator D1 SHNs');
  check(core.denominator_contract?.outcome_selection_before_search === false, 'outcome selection must be false');
  check(core.denominator_contract?.outside_human_dependency === false, 'outside human dependency must be false');
  check(core.denominator_contract?.project_blocking === false, 'project blocking must be false');
  check(Array.isArray(core.denominator_contract?.official_sitemap_seeds) && core.denominator_contract.official_sitemap_seeds.length >= 1, 'official sitemap seeds');

  check(Array.isArray(core.stages) && core.stages.length === 7, 'exactly seven stages');
  const stageIds = Array.isArray(core.stages) ? core.stages.map((stage) => stage?.stage_id) : [];
  check(new Set(stageIds).size === 7, 'stage IDs unique');
  for (let index = 1; index <= 7; index += 1) check(stageIds.includes(`A07-S${index}`), `missing A07-S${index}`);
  for (const stage of core.stages ?? []) {
    check(typeof stage?.title === 'string' && stage.title.length > 0, `stage ${stage?.stage_id} title`);
    check(typeof stage?.state === 'string' && stage.state.length > 0, `stage ${stage?.stage_id} state`);
    check(typeof stage?.finding === 'string' && stage.finding.length > 0, `stage ${stage?.stage_id} finding`);
  }

  const counts = core.counts ?? {};
  for (const [name, value] of Object.entries(counts)) {
    if (name === 'graph_effects') check(value === 0, 'graph effects must be zero');
    else check(Number.isInteger(value) && value >= 0, `count ${name} must be a nonnegative integer`);
  }
  check(counts.D1_shns === 6292, 'count D1_shns');
  check(counts.exact_shn_query_receipts >= 6292, 'query receipts cover D1');
  check(counts.exact_shn_candidate_documents === counts.valid_candidate_pdfs + counts.invalid_candidate_documents, 'candidate document partition');
  check(counts.official_attempted_urls === counts.official_selected_urls, 'official selected URL denominator fully attempted');
  check(counts.official_successful_bodies + counts.official_unresolved_urls === counts.official_attempted_urls, 'official success/unresolved partition');
  check(counts.verified_public_implementation_receipts === 0, 'verified implementation receipts remain zero');
  check(counts.verified_public_restoration_receipts === 0, 'verified restoration receipts remain zero');
  check(counts.external_contacts === 0, 'external contacts remain zero');
  check(counts.external_reviews === 0, 'external reviews remain zero');
  check(counts.adjudications === 0, 'adjudications remain zero');
  check(counts.publication_clearances === 0, 'publication clearances remain zero');
  check(counts.graph_effects === 0, 'graph effects remain zero');

  const result = core.current_result ?? {};
  check(result.terminal_state === 'bounded_public_search_complete_no_verified_implementation_or_restoration_receipt', 'terminal state');
  check(result.exact_shn_denominator_complete === true, 'exact SHN complete');
  check(result.candidate_document_custody_complete === true, 'candidate custody complete');
  check(result.selected_official_url_attempt_denominator_complete === true, 'official selected denominator complete');
  check(result.complete_official_public_web_universe === false, 'complete official universe must remain false');
  check(result.verified_implementation_supported === false, 'implementation support must remain false');
  check(result.verified_restoration_supported === false, 'restoration support must remain false');
  check(result.missing_public_receipt_is_noncompliance === false, 'missing receipt is not noncompliance');
  check(result.residual_class_closed === false, 'residual class stays open');
  check(result.publication_effect === 'none', 'publication effect');
  check(result.graph_effect === 'none', 'graph effect');
  check(result.adoption_effect === 'none', 'adoption effect');

  const handoff = core.next_handoff ?? {};
  check(handoff.acquisition_id === 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A08', 'A08 handoff');
  check(handoff.status === 'authorized_nonblocking_internal_candidate_adjudication_and_public_source_refresh', 'handoff status');
  check(handoff.outside_human_dependency === false, 'handoff outside dependency');
  check(handoff.project_blocking === false, 'handoff project blocking');
  check(Array.isArray(handoff.forbidden_shortcuts) && handoff.forbidden_shortcuts.length >= 5, 'handoff shortcuts');
  check((handoff.forbidden_shortcuts ?? []).some((value) => /outside person|agency response/i.test(value)), 'handoff must forbid outside-human waiting');

  const boundaries = core.boundaries ?? {};
  for (const key of [
    'same_shn_proves_same_claimant',
    'same_shn_proves_implementation',
    'order_proves_compliance',
    'machine_language_candidate_is_verified_receipt',
    'selected_url_denominator_is_complete_official_web_universe',
    'failed_fetch_is_record_absence',
    'missing_public_material_is_noncompliance',
    'result_proves_effective_counterpower',
    'result_proves_national_prevalence',
    'result_proves_racial_hierarchy',
    'result_proves_unlawful_motive',
    'result_proves_coordination',
    'result_proves_common_purpose',
    'result_is_external_review'
  ]) check(boundaries[key] === false, `boundary ${key} must be false`);
  check(boundaries.graph_effect === 'none', 'boundary graph effect');

  const shn = evidence.shn;
  if (shn) {
    check(shn.status === 'pass', 'SHN summary pass');
    check(shn.parent?.a06_release_sha256 === expectedA06Release, 'SHN parent digest');
    check(shn.counts?.D1_shns === counts.D1_shns, 'SHN D1 count');
    check(shn.counts?.query_receipts === counts.exact_shn_query_receipts, 'SHN query receipt count');
    check(shn.counts?.public_followup_candidate_rows === counts.exact_shn_candidate_rows, 'SHN candidate row count');
    check(shn.counts?.public_followup_candidate_documents === counts.exact_shn_candidate_documents, 'SHN candidate document count');
    check(shn.counts?.unresolved_capped_shns === 0, 'SHN unresolved caps zero');
    check(shn.counts?.failures === 0, 'SHN failures zero');
  }

  const candidate = evidence.candidate;
  if (candidate) {
    check(candidate.status === 'pass', 'candidate receipt summary pass');
    check(candidate.input?.D1_shns === counts.D1_shns, 'candidate input D1 count');
    check(candidate.counts?.candidate_rows === counts.exact_shn_candidate_rows, 'candidate row count');
    check(candidate.counts?.candidate_documents === counts.exact_shn_candidate_documents, 'candidate document count');
    check(candidate.counts?.valid_candidate_pdfs === counts.valid_candidate_pdfs, 'valid candidate PDFs');
    check(candidate.counts?.invalid_candidate_documents === counts.invalid_candidate_documents, 'invalid candidate documents');
    check(candidate.counts?.later_same_shn_documents === counts.later_same_shn_documents, 'later same-SHN documents');
    check(candidate.counts?.verified_public_implementation_receipts === 0, 'candidate verified implementation zero');
    check(candidate.counts?.verified_public_restoration_receipts === 0, 'candidate verified restoration zero');
    check(candidate.counts?.failures === 0, 'candidate failures zero');
  }

  const sitemap = evidence.sitemap;
  if (sitemap) {
    check(['pass', 'bounded_with_failures'].includes(sitemap.status), 'sitemap bounded status');
    check(sitemap.parent_a06_release_sha256 === expectedA06Release, 'sitemap parent digest');
    check(sitemap.counts?.seeds === counts.sitemap_seeds, 'sitemap seed count');
    check(sitemap.counts?.discovered_page_urls === counts.sitemap_discovered_page_urls, 'sitemap page count');
    check(sitemap.counts?.lexical_candidate_urls === counts.sitemap_lexical_candidate_urls, 'sitemap candidate count');
    check(sitemap.counts?.external_contacts === 0, 'sitemap contacts zero');
  }

  const crawl = evidence.crawl;
  if (crawl) {
    check(crawl.status === 'pass', 'official crawl pass');
    check(crawl.counts?.selected_urls === counts.official_selected_urls, 'official selected URLs');
    check(crawl.counts?.attempted_urls === counts.official_attempted_urls, 'official attempted URLs');
    check(crawl.counts?.successful_bodies === counts.official_successful_bodies, 'official successful bodies');
    check(crawl.counts?.unresolved_urls === counts.official_unresolved_urls, 'official unresolved URLs');
    check(crawl.counts?.pages_with_exact_D1_shn_strings === counts.official_pages_with_exact_D1_shn_strings, 'official SHN pages');
    check(crawl.counts?.pages_with_qualified_completed_action_language === counts.official_pages_with_qualified_completed_action_language, 'official qualified-language pages');
    check(crawl.counts?.structural_failures === 0, 'official crawl structural failures zero');
  }

  return errors;
}

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

function verifyReleaseManifest(manifest) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(manifest.schema_version === 'ssc-rd04-a07-release-manifest@1', 'release manifest schema');
  check(manifest.acquisition_id === 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07', 'release acquisition');
  check(manifest.as_of === '2026-08-02', 'release as_of');
  check(manifest.hash_mode === 'sha256_exact_bytes', 'release hash mode');
  check(manifest.scope_ordered === true, 'release scope ordered');
  check(manifest.self_included === false, 'release self excluded');
  check(Array.isArray(manifest.entries) && manifest.entries.length > 0, 'release entries');
  const paths = (manifest.entries ?? []).map((entry) => entry.path);
  check(new Set(paths).size === paths.length, 'release paths unique');
  check(stable([...paths].sort()) === stable(paths), 'release paths sorted');
  check(!paths.includes(path.relative(root, releaseManifestPath).replaceAll(path.sep, '/')), 'release self absent');
  for (const entry of manifest.entries ?? []) {
    const target = path.join(root, entry.path);
    check(fs.existsSync(target) && fs.statSync(target).isFile(), `release path exists ${entry.path}`);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
    const body = fs.readFileSync(target);
    check(body.length === entry.bytes, `release bytes ${entry.path}`);
    check(sha256(body) === entry.sha256, `release digest ${entry.path}`);
    check(!/(^|\/)(\.github\/tmp|data\/transport|temporary-|carrier|materializer|trigger)(\/|$)/i.test(entry.path), `transport path prohibited ${entry.path}`);
  }
  const combined = sha256(Buffer.from((manifest.entries ?? []).map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''), 'utf8'));
  check(combined === manifest.combined_sha256, 'release combined digest');
  check(manifest.boundaries?.exact_bytes_prove_claimant_identity === false, 'manifest claimant boundary');
  check(manifest.boundaries?.exact_bytes_prove_implementation === false, 'manifest implementation boundary');
  check(manifest.boundaries?.exact_bytes_prove_restoration === false, 'manifest restoration boundary');
  check(manifest.boundaries?.manifest_proves_external_review === false, 'manifest review boundary');
  check(manifest.boundaries?.manifest_authorizes_publication === false, 'manifest publication boundary');
  check(manifest.boundaries?.manifest_advances_adoption === false, 'manifest adoption boundary');
  check(manifest.boundaries?.graph_effect === 'none', 'manifest graph boundary');
  return errors;
}

function verifyArchiveLedger(ledger) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(ledger.schema_version === 'ssc-rd04-a07-artifact-archive-ledger@1', 'archive ledger schema');
  check(Array.isArray(ledger.archives) && ledger.archives.length > 0, 'archive ledger entries');
  const observed = new Set();
  for (const archive of ledger.archives ?? []) {
    check(typeof archive.stage === 'string' && archive.stage.length > 0, 'archive stage');
    check(typeof archive.artifact_name === 'string' && archive.artifact_name.length > 0, 'archive name');
    check(Array.isArray(archive.parts) && archive.parts.length > 0, `archive parts ${archive.artifact_name}`);
    for (const part of archive.parts ?? []) {
      check(!observed.has(part.path), `duplicate archive part ${part.path}`);
      observed.add(part.path);
      const target = path.join(root, part.path);
      check(fs.existsSync(target) && fs.statSync(target).isFile(), `archive part exists ${part.path}`);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
      const body = fs.readFileSync(target);
      check(body.length === part.bytes, `archive part bytes ${part.path}`);
      check(sha256(body) === part.sha256, `archive part digest ${part.path}`);
    }
  }
  return errors;
}

export function validateRepository() {
  const required = [
    corePath,
    releaseManifestPath,
    reportDataPath,
    reportHtmlPath,
    buildDataPath,
    buildManifestPath,
    path.join(custodyRoot, 'source-ledger.json'),
    path.join(custodyRoot, 'shn-full/summary.json'),
    path.join(custodyRoot, 'candidate-receipts/summary.json'),
    path.join(custodyRoot, 'sitemap-probe/summary.json'),
    path.join(custodyRoot, 'official-crawl/summary.json'),
    path.join(root, 'schemas/status-sovereignty-rd04-public-implementation-receipts-a07.schema.json'),
    path.join(root, 'docs/milestones/ssc-rd04-public-implementation-receipts-a07.md'),
    path.join(root, '.github/workflows/status-sovereignty-rd04-public-implementation-receipts-a07.yml')
  ];
  const errors = [];
  for (const target of required) if (!fs.existsSync(target)) errors.push(`missing required path ${path.relative(root, target)}`);
  if (errors.length) return errors;

  const core = readJson(corePath);
  const evidence = {
    shn: readJson(path.join(custodyRoot, 'shn-full/summary.json')),
    candidate: readJson(path.join(custodyRoot, 'candidate-receipts/summary.json')),
    sitemap: readJson(path.join(custodyRoot, 'sitemap-probe/summary.json')),
    crawl: readJson(path.join(custodyRoot, 'official-crawl/summary.json'))
  };
  errors.push(...verifyCoreObject(core, evidence));

  const explicitCandidates = readJson(path.join(custodyRoot, 'candidate-receipts/explicit-language-candidates.json'));
  const caseCandidates = readJson(path.join(custodyRoot, 'official-crawl/case-joined-machine-candidates.json'));
  const candidateRows = readJson(path.join(custodyRoot, 'shn-full/candidate-rows.json'));
  const candidateDocuments = readJson(path.join(custodyRoot, 'shn-full/candidate-documents.json'));
  const candidateCustody = readJson(path.join(custodyRoot, 'candidate-receipts/candidate-document-custody.json'));
  const selectedUrls = readJson(path.join(custodyRoot, 'official-crawl/selected-urls.json'));
  const pageReceipts = readJson(path.join(custodyRoot, 'official-crawl/page-receipts.json'));
  const unresolvedUrls = readJson(path.join(custodyRoot, 'official-crawl/unresolved-urls.json'));
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(Array.isArray(explicitCandidates) && explicitCandidates.length === core.counts.same_shn_explicit_language_candidates, 'explicit candidate ledger length');
  check(Array.isArray(caseCandidates) && caseCandidates.length === core.counts.official_case_joined_machine_candidates, 'case candidate ledger length');
  check(Array.isArray(candidateRows) && candidateRows.length === core.counts.exact_shn_candidate_rows, 'candidate row ledger length');
  check(Array.isArray(candidateDocuments) && candidateDocuments.length === core.counts.exact_shn_candidate_documents, 'candidate document ledger length');
  check(Array.isArray(candidateCustody) && candidateCustody.length === core.counts.exact_shn_candidate_documents, 'candidate document custody length');
  check(Array.isArray(selectedUrls) && selectedUrls.length === core.counts.official_selected_urls, 'selected URL ledger length');
  check(Array.isArray(pageReceipts) && pageReceipts.length === core.counts.official_attempted_urls, 'page receipt ledger length');
  check(Array.isArray(unresolvedUrls) && unresolvedUrls.length === core.counts.official_unresolved_urls, 'unresolved URL ledger length');

  check(stable(readJson(reportDataPath)) === stable(core), 'report data equals core');
  check(stable(readJson(buildDataPath)) === stable(core), 'build data equals core');
  const buildManifest = readJson(buildManifestPath);
  check(buildManifest.schema_version === 'ssc-rd04-a07-projection-manifest@1', 'build manifest schema');
  check(buildManifest.execution_id === core.execution_id, 'build manifest execution');
  check(stable(buildManifest.counts) === stable(core.counts), 'build manifest counts');
  check(buildManifest.authority?.verified_public_implementation_receipts === 0, 'build manifest implementation zero');
  check(buildManifest.authority?.verified_public_restoration_receipts === 0, 'build manifest restoration zero');
  check(buildManifest.authority?.external_contacts === 0, 'build manifest contacts zero');
  check(buildManifest.authority?.graph_effect === 'none', 'build manifest graph none');

  const html = fs.readFileSync(reportHtmlPath, 'utf8');
  check(/<meta name="robots" content="noindex,nofollow">/.test(html), 'report noindex');
  check(/Verified public implementation receipts:<\/strong> 0/.test(html), 'report implementation zero');
  check(/Verified public restoration receipts:<\/strong> 0/.test(html), 'report restoration zero');
  check(!/<script\b/i.test(html), 'report contains no scripts');

  const sourceLedger = readJson(path.join(custodyRoot, 'source-ledger.json'));
  check(sourceLedger.schema_version === 'ssc-rd04-a07-source-ledger@1', 'source ledger schema');
  check(sourceLedger.parent_a06_release_sha256 === expectedA06Release, 'source ledger parent digest');
  check(sourceLedger.boundaries?.exact_shn_match_proves_claimant_identity === false, 'source ledger claimant boundary');
  check(sourceLedger.boundaries?.exact_shn_match_proves_implementation === false, 'source ledger implementation boundary');
  check(sourceLedger.boundaries?.machine_language_candidate_is_verified_receipt === false, 'source ledger machine candidate boundary');
  check(sourceLedger.boundaries?.failed_fetch_is_record_absence === false, 'source ledger failed fetch boundary');
  check(sourceLedger.boundaries?.missing_public_material_is_noncompliance === false, 'source ledger missing material boundary');
  check(sourceLedger.boundaries?.external_contacts === 0, 'source ledger contacts zero');
  check(sourceLedger.boundaries?.external_reviews === 0, 'source ledger reviews zero');
  check(sourceLedger.boundaries?.graph_effect === 'none', 'source ledger graph none');
  errors.push(...verifyArchiveLedger(sourceLedger.archive_ledger));

  errors.push(...verifyReleaseManifest(readJson(releaseManifestPath)));

  const acquisitionRoot = path.join(root, 'tools/acquisition/status-sovereignty-rd04-a07');
  const acquisitionFiles = collectFiles(acquisitionRoot).filter((target) => target.endsWith('.mjs'));
  check(acquisitionFiles.length >= 7, 'at least seven permanent acquisition programs retained');
  for (const target of acquisitionFiles) check(fs.readFileSync(target, 'utf8').startsWith('#!/usr/bin/env node'), `acquisition program shebang ${path.relative(root, target)}`);

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateRepository();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd04-public-implementation-receipts-a07: FAIL (${errors.length})`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const manifest = readJson(releaseManifestPath);
  console.log(`validate-status-sovereignty-rd04-public-implementation-receipts-a07: PASS — ${manifest.entries.length} exact-byte entries, zero verified receipts, zero outside-human dependency`);
}
