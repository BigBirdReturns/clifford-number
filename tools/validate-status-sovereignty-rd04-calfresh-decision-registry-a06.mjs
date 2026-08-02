import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(__filename), '..');
const EXECUTION = 'status-sovereignty-rd04-calfresh-decision-registry-a06';
const INTAKE = path.join(ROOT, 'data', 'intake', EXECUTION);

const PATHS = {
  contract: path.join(INTAKE, 'contract.json'),
  denominator: path.join(INTAKE, 'registry-denominator.json'),
  sample: path.join(INTAKE, 'pdf-sample.json'),
  decisions: path.join(INTAKE, 'decision-ledger.json'),
  compliance: path.join(INTAKE, 'compliance-ledger.json'),
  missing: path.join(INTAKE, 'missing-ledger.json'),
  core: path.join(INTAKE, 'core.json'),
  manifest: path.join(ROOT, 'data', 'project', `${EXECUTION}-release-manifest.json`),
  schema: path.join(ROOT, 'schemas', `${EXECUTION}.schema.json`)
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(target));
    else if (entry.isFile()) out.push(target);
  }
  return out;
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function issueCodes(value) {
  return [...new Set(String(value ?? '').match(/\b\d{3,4}\b/g) ?? [])].sort();
}

function canonicalRow(row) {
  return {
    release_date: row.release_date,
    program: row.program,
    disposition: row.disposition,
    issue_codes: row.issue_codes,
    responsible_agency: row.responsible_agency,
    organizational_ar_name: row.organizational_ar_name,
    language: row.language,
    shn_number: row.shn_number,
    archived: row.archived,
    registry_id: row.registry_id,
    decision_id: row.decision_id,
    row_identity: row.row_identity
  };
}

function expectedDownloadUrl(row) {
  const url = new URL('https://acms.dss.ca.gov/acms/page.request.do');
  url.searchParams.append('page', 'public.decisionRegistryDownload');
  if (row.archived) {
    url.searchParams.append('registry', row.registry_id);
    url.searchParams.append('archived', 'true');
  } else {
    url.searchParams.append('decision', row.decision_id);
    url.searchParams.append('archived', 'false');
  }
  return url.toString();
}

function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

export function loadCorpus(root = ROOT) {
  const intake = path.join(root, 'data', 'intake', EXECUTION);
  return {
    root,
    contract: readJson(path.join(intake, 'contract.json')),
    denominator: readJson(path.join(intake, 'registry-denominator.json')),
    sample: readJson(path.join(intake, 'pdf-sample.json')),
    decisions: readJson(path.join(intake, 'decision-ledger.json')),
    compliance: readJson(path.join(intake, 'compliance-ledger.json')),
    missing: readJson(path.join(intake, 'missing-ledger.json')),
    core: readJson(path.join(intake, 'core.json')),
    manifest: readJson(path.join(root, 'data', 'project', `${EXECUTION}-release-manifest.json`)),
    schema: readJson(path.join(root, 'schemas', `${EXECUTION}.schema.json`))
  };
}

export function validateCorpus(corpus, { checkFiles = true } = {}) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  const { contract, denominator, sample, decisions, compliance, missing, core, manifest, schema } = corpus;
  const root = corpus.root ?? ROOT;

  fail(contract.schema_version === 'ssc-rd04-a06-contract@1', 'contract schema version');
  fail(contract.execution_id === 'SSC-RD04-SNAP-A06', 'contract execution identity');
  fail(contract.issue === 722, 'contract issue');
  fail(contract.parent?.main_commit === '80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589', 'parent main commit');
  fail(contract.parent?.a05_release_sha256 === 'b3f36dff2969d95767e6f0d564f7d3744bd72de98cf2b758d4729c6bc0de50c4', 'parent A05 release');

  const expectedParameters = [
    ['page', 'public.decisionRegistry'],
    ['releasedAfter', '06/01/2026'],
    ['releasedBefore', '06/30/2026'],
    ['programType', '2'],
    ['isForSearch', '1']
  ];
  fail(contract.query?.endpoint === 'https://acms.dss.ca.gov/acms/page.request.do', 'query endpoint');
  fail(deepEqual(contract.query?.ordered_parameters, expectedParameters), 'query ordered parameters');
  fail(contract.query?.date_boundary_semantics === 'registry_defined_not_assumed_inclusive', 'query date semantics');
  fail(contract.query?.max_attempts === 2, 'query retry ceiling');
  fail(contract.pdf_selection?.cap === 24, 'selection cap');
  fail(contract.pdf_selection?.selection_before_pdf_content === true, 'selection before content');
  fail(contract.pdf_selection?.replacement_after_content_inspection === false, 'no result shopping replacements');
  fail(contract.authority?.outside_human_dependency === false, 'outside human dependency');

  const expectedQuery = new URL(contract.query.endpoint);
  for (const [name, value] of expectedParameters) expectedQuery.searchParams.append(name, value);
  fail(denominator.schema_version === 'ssc-rd04-a06-registry-denominator@1', 'denominator schema version');
  fail(denominator.query?.exact_request_url === expectedQuery.toString(), 'exact registry request URL');
  fail(deepEqual(denominator.query?.ordered_parameters, expectedParameters), 'denominator query parameters');
  fail(denominator.query?.date_boundary_semantics === 'registry_defined_not_assumed_inclusive', 'denominator date semantics');
  fail(denominator.complete_ordered_response_preserved === true, 'complete returned response preserved');
  fail(denominator.registry_returned_set_is_all_calfresh_decisions === false, 'returned set scope boundary');
  fail(Number.isInteger(denominator.returned_count) && denominator.returned_count > 0, 'positive returned count');
  fail(Array.isArray(denominator.rows) && denominator.rows.length === denominator.returned_count, 'returned row count');

  const identities = new Set();
  const rowHashes = new Set();
  for (let index = 0; index < (denominator.rows ?? []).length; index += 1) {
    const row = denominator.rows[index];
    fail(row.ordered_position === index + 1, `registry position ${index + 1}`);
    fail(row.program === 'CalFresh', `${row.row_identity ?? index}: CalFresh program`);
    fail(typeof row.row_identity === 'string' && row.row_identity.length > 0, `row ${index + 1}: identity`);
    fail(!identities.has(row.row_identity), `${row.row_identity}: duplicate identity`);
    identities.add(row.row_identity);
    const expectedIdentity = row.archived ? `registry:${row.registry_id}` : `decision:${row.decision_id}`;
    fail(row.row_identity === expectedIdentity, `${row.row_identity}: identity fields`);
    fail(row.download_url === expectedDownloadUrl(row), `${row.row_identity}: download URL`);
    const expectedHash = sha256(Buffer.from(stableStringify(canonicalRow(row)), 'utf8'));
    fail(row.canonical_row_sha256 === expectedHash, `${row.row_identity}: canonical row hash`);
    fail(!rowHashes.has(row.canonical_row_sha256), `${row.row_identity}: duplicate canonical hash`);
    rowHashes.add(row.canonical_row_sha256);
    fail(deepEqual(row.parsed_issue_codes, issueCodes(row.issue_codes)), `${row.row_identity}: parsed issue codes`);
  }

  fail(sample.schema_version === 'ssc-rd04-a06-pdf-sample@1', 'sample schema version');
  fail(sample.registry_returned_count === denominator.returned_count, 'sample registry denominator');
  fail(sample.selected_before_pdf_content === true, 'sample frozen before content');
  fail(sample.replacements_after_content_inspection === 0, 'sample replacements');
  const expectedSelectedCount = Math.min(24, denominator.returned_count);
  fail(sample.selected_count === expectedSelectedCount, 'sample selected count');
  fail(Array.isArray(sample.rows) && sample.rows.length === expectedSelectedCount, 'sample row count');

  const expectedSelected = [...denominator.rows]
    .sort((a, b) => a.canonical_row_sha256.localeCompare(b.canonical_row_sha256) || a.row_identity.localeCompare(b.row_identity))
    .slice(0, expectedSelectedCount);
  for (let index = 0; index < (sample.rows ?? []).length; index += 1) {
    const row = sample.rows[index];
    const expected = expectedSelected[index];
    fail(row.selection_position === index + 1, `sample position ${index + 1}`);
    fail(row.row_identity === expected?.row_identity, `sample row ${index + 1}: hash-ranked identity`);
    fail(row.canonical_row_sha256 === expected?.canonical_row_sha256, `sample row ${index + 1}: hash`);
    fail(row.ordered_registry_position === expected?.ordered_position, `sample row ${index + 1}: registry position`);
    fail(row.selected_before_pdf_content === true, `sample row ${index + 1}: precontent flag`);
    const fetch = row.fetch ?? {};
    fail(['exact_pdf_and_text_recovered', 'unparseable_exact_bytes_preserved', 'source_unavailable_after_bounded_retry'].includes(fetch.terminal_state), `${row.row_identity}: fetch terminal state`);
    fail(Array.isArray(fetch.attempts) && fetch.attempts.length >= 1 && fetch.attempts.length <= 2, `${row.row_identity}: bounded attempts`);
    fail(fetch.canonical_row_sha256 === row.canonical_row_sha256, `${row.row_identity}: fetch row hash`);
    fail(fetch.exact_download_url === row.download_url, `${row.row_identity}: fetch URL`);
    if (fetch.terminal_state === 'exact_pdf_and_text_recovered') {
      fail(Boolean(fetch.selected_body_path && fetch.selected_body_sha256), `${row.row_identity}: PDF custody`);
      fail(Boolean(fetch.text_path && fetch.text_sha256), `${row.row_identity}: text custody`);
    }
  }

  fail(decisions.schema_version === 'ssc-rd04-a06-decision-ledger@1', 'decision ledger schema');
  fail(Array.isArray(decisions.rows) && decisions.rows.length === expectedSelectedCount, 'decision ledger row count');
  fail(compliance.schema_version === 'ssc-rd04-a06-compliance-ledger@1', 'compliance ledger schema');
  fail(compliance.separate_public_compliance_receipts_recovered === 0, 'separate compliance receipt count');
  fail(Array.isArray(compliance.rows) && compliance.rows.length === expectedSelectedCount, 'compliance ledger row count');

  for (let index = 0; index < expectedSelectedCount; index += 1) {
    const selected = sample.rows[index];
    const decision = decisions.rows[index];
    const implementation = compliance.rows[index];
    fail(decision?.row_identity === selected?.row_identity, `decision row ${index + 1}: identity`);
    fail(decision?.selection_position === index + 1, `decision row ${index + 1}: position`);
    fail(decision?.canonical_row_sha256 === selected?.canonical_row_sha256, `decision row ${index + 1}: hash`);
    fail(decision?.decision_is_precedential_authority === false, `${decision?.row_identity}: nonprecedential boundary`);
    fail(decision?.decision_proves_implementation === false, `${decision?.row_identity}: decision implementation boundary`);
    fail(Array.isArray(decision?.lexical_order_markers), `${decision?.row_identity}: lexical marker array`);
    for (const marker of decision?.lexical_order_markers ?? []) {
      fail(Number.isInteger(marker.line_number) && marker.line_number > 0, `${decision?.row_identity}: marker line`);
      fail(/^[0-9a-f]{64}$/.test(marker.line_sha256 ?? ''), `${decision?.row_identity}: marker hash`);
    }

    fail(implementation?.row_identity === selected?.row_identity, `compliance row ${index + 1}: identity`);
    fail(Array.isArray(implementation?.separate_public_compliance_receipt_ids), `${implementation?.row_identity}: compliance receipt array`);
    fail((implementation?.separate_public_compliance_receipt_ids ?? []).length === 0, `${implementation?.row_identity}: no separate compliance receipt`);
    fail(implementation?.implementation_state !== 'separate_public_compliance_receipt_observed', `${implementation?.row_identity}: false compliance observation`);
    fail(implementation?.order_is_implementation === false, `${implementation?.row_identity}: order is not implementation`);
    fail(implementation?.absence_of_compliance_receipt_is_noncompliance === false, `${implementation?.row_identity}: absence semantics`);
    fail(implementation?.restoration_amount === null, `${implementation?.row_identity}: restoration amount`);
    fail(implementation?.restoration_date === null, `${implementation?.row_identity}: restoration date`);
    fail(implementation?.compliance_date === null, `${implementation?.row_identity}: compliance date`);
  }

  const expectedMissing = decisions.rows.filter((row) => row.source.fetch_terminal_state !== 'exact_pdf_and_text_recovered');
  fail(missing.schema_version === 'ssc-rd04-a06-missing-ledger@1', 'missing ledger schema');
  fail(Array.isArray(missing.rows) && missing.rows.length === expectedMissing.length, 'missing ledger count');
  for (const row of missing.rows ?? []) {
    fail(row.absence_semantics === 'source_or_parse_state_not_record_absence', `${row.row_identity}: missing semantics`);
  }

  const issueCodeRows = denominator.rows.flatMap((row) => row.parsed_issue_codes.map((code) => ({ code })));
  const expectedRegistryDistributions = {
    disposition: countBy(denominator.rows, (row) => row.disposition),
    responsible_agency: countBy(denominator.rows, (row) => row.responsible_agency),
    language: countBy(denominator.rows, (row) => row.language),
    issue_code: countBy(issueCodeRows, (row) => row.code)
  };
  const expectedSelectedDistributions = {
    disposition: countBy(decisions.rows, (row) => row.disposition),
    implementation_state: countBy(compliance.rows, (row) => row.implementation_state)
  };
  fail(deepEqual(core.registry_distributions, expectedRegistryDistributions), 'registry distributions');
  fail(deepEqual(core.selected_distributions, expectedSelectedDistributions), 'selected distributions');

  fail(core.schema_version === 'ssc-rd04-a06-core@1', 'core schema version');
  fail(core.execution_id === 'SSC-RD04-SNAP-A06', 'core execution identity');
  fail(core.issue === 722, 'core issue');
  fail(core.parent?.main_commit === contract.parent.main_commit, 'core parent main');
  fail(core.parent?.a05_release_sha256 === contract.parent.a05_release_sha256, 'core parent release');
  fail(core.query?.exact_request_url === expectedQuery.toString(), 'core query URL');
  fail(core.selection?.selected_count === expectedSelectedCount, 'core selected count');
  fail(core.counts?.registry_rows === denominator.returned_count, 'core registry count');
  fail(core.counts?.registry_rows_preserved === denominator.rows.length, 'core preserved count');
  fail(core.counts?.selected_decisions === expectedSelectedCount, 'core selected decisions');
  fail(core.counts?.decision_rows === decisions.rows.length, 'core decision rows');
  fail(core.counts?.compliance_rows === compliance.rows.length, 'core compliance rows');
  fail(core.counts?.separate_public_compliance_receipts === 0, 'core compliance receipts');
  fail(core.counts?.case_level_implementation_joins === 0, 'core implementation joins');
  fail(core.counts?.residual_classes_closed === 0, 'core residual closure');
  fail(core.counts?.reviewed_disposition_changes === 0, 'core disposition change');
  fail(core.counts?.external_contacts === 0, 'core external contacts');
  fail(core.counts?.external_reviews === 0, 'core external reviews');
  fail(core.counts?.graph_effects === 0 && core.counts?.publication_effects === 0 && core.counts?.adoption_effects === 0, 'core authority counts');

  fail(core.current_result?.terminal_state === 'bounded_registry_denominator_orders_without_compliance_join', 'terminal receipt');
  fail(core.current_result?.returned_set_is_all_calfresh_decisions === false, 'program completeness boundary');
  fail(core.current_result?.submitted_dates_prove_inclusive_month === false, 'date inclusivity boundary');
  fail(core.current_result?.pdf_sample_fixed_before_content === true, 'sample timing boundary');
  fail(core.current_result?.separate_compliance_join_supported === false, 'compliance join boundary');
  fail(core.current_result?.complete_restoration_supported === false, 'restoration boundary');
  fail(core.current_result?.remedy_timeliness_supported === false, 'timeliness boundary');
  fail(core.current_result?.prevalence_supported === false, 'prevalence boundary');
  fail(core.current_result?.residual_class_closed === false, 'closure boundary');
  fail(core.current_result?.graph_effect === 'none' && core.current_result?.publication_effect === 'none' && core.current_result?.adoption_effect === 'none', 'effect boundary');
  fail(core.next_handoff?.acquisition_id === 'SSC-RD04-SNAP-A07', 'next acquisition');
  fail(core.next_handoff?.outside_human_dependency === false && core.next_handoff?.project_blocking === false, 'next handoff nonblocking');

  for (const [key, value] of Object.entries(core.authority ?? {})) {
    if (typeof value === 'number') fail(value === 0, `authority ${key}`);
    if (key.endsWith('_effect')) fail(value === 'none', `authority ${key}`);
  }
  fail(core.authority?.outside_human_dependency === false, 'authority human dependency');
  for (const [key, value] of Object.entries(core.boundaries ?? {})) {
    fail(value === false, `boundary ${key}`);
  }

  fail(schema?.additionalProperties === false, 'closed schema top level');
  fail(schema?.properties?.current_result?.additionalProperties === false, 'closed current-result schema');
  fail(schema?.properties?.authority?.additionalProperties === false, 'closed authority schema');
  const schemaKeys = Object.keys(schema?.properties ?? {}).sort();
  fail(deepEqual(Object.keys(core).sort(), schemaKeys), 'core top-level closed shape');

  if (checkFiles) {
    const rawRegistryPath = path.join(root, denominator.query.raw_body_path);
    fail(fs.existsSync(rawRegistryPath), 'raw registry response exists');
    if (fs.existsSync(rawRegistryPath)) {
      const bytes = fs.readFileSync(rawRegistryPath);
      fail(bytes.length === denominator.query.raw_body_bytes, 'raw registry byte count');
      fail(sha256(bytes) === denominator.query.raw_body_sha256, 'raw registry SHA-256');
    }

    for (const row of sample.rows ?? []) {
      for (const attempt of row.fetch?.attempts ?? []) {
        const bodyFile = path.join(root, attempt.body_path);
        const headersFile = path.join(root, attempt.headers_path);
        fail(fs.existsSync(bodyFile), `${row.row_identity}: attempt body exists`);
        fail(fs.existsSync(headersFile), `${row.row_identity}: attempt headers exist`);
        if (fs.existsSync(bodyFile)) {
          const bytes = fs.readFileSync(bodyFile);
          fail(bytes.length === attempt.body_bytes, `${row.row_identity}: attempt body bytes`);
          fail(sha256(bytes) === attempt.body_sha256, `${row.row_identity}: attempt body hash`);
        }
        if (fs.existsSync(headersFile)) {
          const bytes = fs.readFileSync(headersFile);
          fail(bytes.length === attempt.headers_bytes, `${row.row_identity}: attempt header bytes`);
          fail(sha256(bytes) === attempt.headers_sha256, `${row.row_identity}: attempt header hash`);
        }
      }
      if (row.fetch?.text_path) {
        const textFile = path.join(root, row.fetch.text_path);
        fail(fs.existsSync(textFile), `${row.row_identity}: decision text exists`);
        if (fs.existsSync(textFile)) {
          const bytes = fs.readFileSync(textFile);
          fail(bytes.length === row.fetch.text_bytes, `${row.row_identity}: decision text bytes`);
          fail(sha256(bytes) === row.fetch.text_sha256, `${row.row_identity}: decision text hash`);
        }
      }
    }

    fail(manifest?.schema_version === 'ssc-rd04-a06-release-manifest@1', 'manifest schema version');
    fail(manifest?.execution_id === 'SSC-RD04-SNAP-A06', 'manifest execution identity');
    fail(manifest?.self_included === false, 'manifest self exclusion');
    const entries = manifest?.entries ?? [];
    const paths = entries.map((entry) => entry.path);
    fail(deepEqual(paths, [...paths].sort()), 'manifest ordered paths');
    fail(new Set(paths).size === paths.length, 'manifest unique paths');
    for (const entry of entries) {
      fail(!/(^|\/)(\.github\/tmp|data\/transport|temporary-|carrier|materializer|trigger)/i.test(entry.path), `transport path excluded: ${entry.path}`);
      const file = path.join(root, entry.path);
      fail(fs.existsSync(file), `manifest path exists: ${entry.path}`);
      if (!fs.existsSync(file)) continue;
      const bytes = fs.readFileSync(file);
      fail(bytes.length === entry.bytes, `manifest bytes: ${entry.path}`);
      fail(sha256(bytes) === entry.sha256, `manifest SHA-256: ${entry.path}`);
    }
    const combined = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'));
    fail(manifest?.combined_sha256 === combined, 'manifest combined SHA-256');

    const custodyPaths = walkFiles(path.join(root, 'data', 'intake', EXECUTION, 'source-custody')).map(rel).sort();
    for (const custodyPath of custodyPaths) fail(paths.includes(custodyPath), `manifest covers custody path: ${custodyPath}`);
  }

  return errors;
}

function runCli() {
  const errors = validateCorpus(loadCorpus(ROOT), { checkFiles: true });
  if (errors.length) {
    console.error('A06 validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const core = readJson(PATHS.core);
  console.log(`validate A06: PASS — ${core.counts.registry_rows} registry rows, ${core.counts.selected_decisions} hash-selected decisions, zero compliance joins and zero authority escalation`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
