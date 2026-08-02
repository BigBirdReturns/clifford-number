import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const EXECUTION = 'status-sovereignty-rd04-calfresh-decision-registry-a06';
const INTAKE = path.join(ROOT, 'data', 'intake', EXECUTION);
const CONTRACT_PATH = path.join(INTAKE, 'contract.json');
const DENOMINATOR_PATH = path.join(INTAKE, 'registry-denominator.json');
const SAMPLE_PATH = path.join(INTAKE, 'pdf-sample.json');
const DECISION_LEDGER_PATH = path.join(INTAKE, 'decision-ledger.json');
const COMPLIANCE_LEDGER_PATH = path.join(INTAKE, 'compliance-ledger.json');
const MISSING_LEDGER_PATH = path.join(INTAKE, 'missing-ledger.json');
const CORE_PATH = path.join(INTAKE, 'core.json');
const PROJECT_MANIFEST_PATH = path.join(ROOT, 'data', 'project', `${EXECUTION}-release-manifest.json`);
const BUILD_DIR = path.join(ROOT, 'build', 'core-thesis', 'status-sovereignty', 'rd04-calfresh-decision-registry-a06');
const REPORT_DIR = path.join(ROOT, 'reports', 'core-thesis', 'status-sovereignty', 'rd04-calfresh-decision-registry-a06');
const BUILD_DATA_PATH = path.join(BUILD_DIR, 'data.json');
const BUILD_MANIFEST_PATH = path.join(BUILD_DIR, 'manifest.json');
const REPORT_DATA_PATH = path.join(REPORT_DIR, 'data.json');
const REPORT_HTML_PATH = path.join(REPORT_DIR, 'index.html');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ensureDir = (value) => fs.mkdirSync(value, { recursive: true });
const writeJson = (file, value) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
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

const MARKERS = [
  ['restore', /\brestor(?:e|ed|ation|ing)\b/i],
  ['reimburse', /\breimburs(?:e|ed|ement|ing)\b/i],
  ['benefit_issuance', /\bissu(?:e|ed|ance|ing)\b.{0,40}\bbenefit/i],
  ['benefit_adjustment', /\badjust(?:ed|ment|ing)?\b.{0,40}\bbenefit/i],
  ['set_aside', /\bset\s+aside\b/i],
  ['remand', /\bremand(?:ed)?\b/i],
  ['comply', /\bcompl(?:y|ied|iance)\b/i],
  ['shall', /\bshall\b/i],
  ['order', /\border(?:ed)?\b/i]
];

function lexicalMarkers(text) {
  const rows = [];
  const lines = String(text).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const [term, pattern] of MARKERS) {
      if (!pattern.test(trimmed)) continue;
      rows.push({
        marker: term,
        line_number: index + 1,
        line_sha256: sha256(Buffer.from(line, 'utf8')),
        line_bytes: Buffer.byteLength(line, 'utf8')
      });
      if (rows.length >= 40) return rows;
    }
  }
  return rows;
}

function decisionClassification(sampleRow) {
  const fetch = sampleRow.fetch;
  const disposition = sampleRow.disposition;
  if (fetch.terminal_state === 'source_unavailable_after_bounded_retry') {
    return {
      decision_text_state: 'source_unavailable_after_bounded_retry',
      order_observation: 'not_observed_source_unavailable',
      implementation_state: 'source_unavailable_after_bounded_retry',
      lexical_order_markers: []
    };
  }
  if (fetch.terminal_state === 'unparseable_exact_bytes_preserved' || !fetch.text_path) {
    return {
      decision_text_state: 'unparseable_exact_bytes_preserved',
      order_observation: 'not_observed_unparseable',
      implementation_state: 'unparseable_exact_bytes_preserved',
      lexical_order_markers: []
    };
  }

  const text = fs.readFileSync(path.join(ROOT, fetch.text_path), 'utf8');
  const markers = lexicalMarkers(text);
  const reliefDisposition = ['Grant', 'Partial Grant', 'Stipulation'].includes(disposition);
  return {
    decision_text_state: 'exact_text_recovered',
    order_observation: reliefDisposition
      ? 'registry_relief_disposition_with_source_addressable_decision_text'
      : 'no_registry_relief_disposition',
    implementation_state: reliefDisposition
      ? 'order_only_no_compliance_receipt'
      : 'no_relief_order_observed',
    lexical_order_markers: markers
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildHtml(core) {
  const dispositionRows = Object.entries(core.registry_distributions.disposition)
    .map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSC RD-04 A06 · CalFresh Decision Registry denominator</title>
<style>body{font-family:system-ui,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem;line-height:1.5}code,pre{background:#f4f4f4}pre{padding:1rem;overflow:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.45rem;text-align:left}.boundary{border-left:5px solid #555;padding-left:1rem}</style>
</head>
<body>
<h1>CalFresh Decision Registry denominator</h1>
<p><strong>Terminal receipt:</strong> <code>${escapeHtml(core.current_result.terminal_state)}</code></p>
<pre>${escapeHtml(JSON.stringify(core.counts, null, 2))}</pre>
<h2>Registry-returned disposition distribution</h2>
<table><thead><tr><th>Disposition</th><th>Returned rows</th></tr></thead><tbody>${dispositionRows}</tbody></table>
<h2>Bounded interpretation</h2>
<div class="boundary">
<p>The exact submitted registry request and complete returned JSON array are preserved. The returned set is not represented as every CalFresh decision, and the submitted date fields are not silently treated as proven inclusive boundaries.</p>
<p>The hash-ranked PDF sample was frozen before decision text was inspected. A grant, partial grant, or stipulation remains an administrative disposition and possible order for relief—not proof of implementation, restoration amount, timeliness, or downstream material recovery.</p>
</div>
<h2>Authority</h2>
<pre>${escapeHtml(JSON.stringify(core.authority, null, 2))}</pre>
</body>
</html>
`;
}

function main() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const denominator = JSON.parse(fs.readFileSync(DENOMINATOR_PATH, 'utf8'));
  const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));

  const decisionRows = sample.rows.map((row) => ({
    selection_position: row.selection_position,
    ordered_registry_position: row.ordered_registry_position,
    row_identity: row.row_identity,
    canonical_row_sha256: row.canonical_row_sha256,
    release_date: row.release_date,
    disposition: row.disposition,
    responsible_agency: row.responsible_agency,
    issue_codes: row.issue_codes,
    parsed_issue_codes: row.parsed_issue_codes,
    shn_number: row.shn_number,
    download_url: row.download_url,
    source: {
      fetch_terminal_state: row.fetch.terminal_state,
      body_path: row.fetch.selected_body_path,
      body_sha256: row.fetch.selected_body_sha256,
      text_path: row.fetch.text_path,
      text_sha256: row.fetch.text_sha256
    },
    ...decisionClassification(row),
    decision_is_precedential_authority: false,
    decision_proves_implementation: false
  }));

  const complianceRows = decisionRows.map((row) => ({
    row_identity: row.row_identity,
    selection_position: row.selection_position,
    registry_disposition: row.disposition,
    decision_order_observation: row.order_observation,
    implementation_state: row.implementation_state,
    separate_public_compliance_receipt_ids: [],
    restoration_amount: null,
    restoration_date: null,
    compliance_date: null,
    downstream_material_outcome: null,
    order_is_implementation: false,
    absence_of_compliance_receipt_is_noncompliance: false
  }));

  const missingRows = decisionRows
    .filter((row) => row.source.fetch_terminal_state !== 'exact_pdf_and_text_recovered')
    .map((row) => ({
      row_identity: row.row_identity,
      selection_position: row.selection_position,
      source_state: row.source.fetch_terminal_state,
      exact_bytes_preserved: Boolean(row.source.body_path),
      absence_semantics: 'source_or_parse_state_not_record_absence'
    }));

  writeJson(DECISION_LEDGER_PATH, {
    schema_version: 'ssc-rd04-a06-decision-ledger@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    rows: decisionRows
  });
  writeJson(COMPLIANCE_LEDGER_PATH, {
    schema_version: 'ssc-rd04-a06-compliance-ledger@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    separate_public_compliance_receipts_recovered: 0,
    rows: complianceRows
  });
  writeJson(MISSING_LEDGER_PATH, {
    schema_version: 'ssc-rd04-a06-missing-ledger@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    rows: missingRows
  });

  const issueCodeRows = denominator.rows.flatMap((row) => row.parsed_issue_codes.map((code) => ({ code })));
  const markerCount = decisionRows.reduce((sum, row) => sum + row.lexical_order_markers.length, 0);
  const exactTextCount = decisionRows.filter((row) => row.decision_text_state === 'exact_text_recovered').length;
  const unavailableCount = decisionRows.filter((row) => row.decision_text_state === 'source_unavailable_after_bounded_retry').length;
  const unparseableCount = decisionRows.filter((row) => row.decision_text_state === 'unparseable_exact_bytes_preserved').length;
  const terminalState = 'bounded_registry_denominator_orders_without_compliance_join';

  const core = {
    schema_version: 'ssc-rd04-a06-core@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    as_of: contract.as_of,
    title: 'CalFresh Decision Registry denominator, decision orders, and compliance separation',
    parent: contract.parent,
    query: {
      exact_request_url: denominator.query.exact_request_url,
      ordered_parameters: denominator.query.ordered_parameters,
      date_boundary_semantics: denominator.query.date_boundary_semantics,
      raw_body_path: denominator.query.raw_body_path,
      raw_body_sha256: denominator.query.raw_body_sha256
    },
    selection: {
      cap: contract.pdf_selection.cap,
      selected_before_pdf_content: sample.selected_before_pdf_content,
      replacements_after_content_inspection: sample.replacements_after_content_inspection,
      selected_count: sample.selected_count,
      selection_method: 'canonical_row_sha256_ascending_then_row_identity'
    },
    counts: {
      registry_rows: denominator.returned_count,
      registry_rows_preserved: denominator.rows.length,
      selected_decisions: sample.selected_count,
      exact_pdf_and_text_recovered: exactTextCount,
      unparseable_exact_bytes_preserved: unparseableCount,
      source_unavailable_after_bounded_retry: unavailableCount,
      decision_rows: decisionRows.length,
      compliance_rows: complianceRows.length,
      separate_public_compliance_receipts: 0,
      lexical_order_markers: markerCount,
      missing_or_unparseable_rows: missingRows.length,
      case_level_implementation_joins: 0,
      residual_classes_closed: 0,
      reviewed_disposition_changes: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0,
      adoption_effects: 0
    },
    registry_distributions: {
      disposition: countBy(denominator.rows, (row) => row.disposition),
      responsible_agency: countBy(denominator.rows, (row) => row.responsible_agency),
      language: countBy(denominator.rows, (row) => row.language),
      issue_code: countBy(issueCodeRows, (row) => row.code)
    },
    selected_distributions: {
      disposition: countBy(decisionRows, (row) => row.disposition),
      implementation_state: countBy(complianceRows, (row) => row.implementation_state)
    },
    current_result: {
      terminal_state: terminalState,
      exact_registry_response_preserved: true,
      complete_returned_set_preserved: true,
      returned_set_is_all_calfresh_decisions: false,
      submitted_dates_prove_inclusive_month: false,
      pdf_sample_fixed_before_content: true,
      decision_orders_source_addressable: exactTextCount > 0,
      separate_compliance_join_supported: false,
      complete_restoration_supported: false,
      remedy_timeliness_supported: false,
      prevalence_supported: false,
      residual_class_closed: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      acquisition_id: 'SSC-RD04-SNAP-A07',
      status: 'authorized_nonblocking_public_compliance_receipt_acquisition',
      unit: 'separately acquire public county or state compliance, issuance, restoration amount, and restoration timing receipts for predeclared A06 relief-disposition rows without contacting claimants or agencies',
      outside_human_dependency: false,
      project_blocking: false
    },
    authority: contract.authority,
    boundaries: {
      returned_registry_set_is_complete_program_denominator: false,
      submitted_date_filters_prove_inclusive_month: false,
      registry_disposition_proves_case_facts: false,
      grant_or_partial_grant_proves_implementation: false,
      stipulation_proves_complete_durable_remedy: false,
      withdrawal_proves_favorable_resolution: false,
      order_to_restore_proves_restoration: false,
      lexical_marker_is_legal_interpretation: false,
      sample_distribution_is_population_prevalence: false,
      responsible_agency_count_is_agency_quality: false,
      public_decision_is_precedent: false,
      reversal_is_racial_hierarchy_or_common_purpose: false
    }
  };
  writeJson(CORE_PATH, core);

  const data = {
    core,
    registry_denominator: denominator,
    pdf_sample: sample,
    decision_ledger: JSON.parse(fs.readFileSync(DECISION_LEDGER_PATH, 'utf8')),
    compliance_ledger: JSON.parse(fs.readFileSync(COMPLIANCE_LEDGER_PATH, 'utf8')),
    missing_ledger: JSON.parse(fs.readFileSync(MISSING_LEDGER_PATH, 'utf8'))
  };
  writeJson(BUILD_DATA_PATH, data);
  writeJson(REPORT_DATA_PATH, data);
  ensureDir(REPORT_DIR);
  fs.writeFileSync(REPORT_HTML_PATH, buildHtml(core));

  const fixedFiles = [
    path.join(ROOT, '.github', 'workflows', 'status-sovereignty-rd04-calfresh-decision-registry-a06.yml'),
    CONTRACT_PATH,
    DENOMINATOR_PATH,
    SAMPLE_PATH,
    DECISION_LEDGER_PATH,
    COMPLIANCE_LEDGER_PATH,
    MISSING_LEDGER_PATH,
    CORE_PATH,
    path.join(ROOT, 'docs', 'milestones', 'ssc-rd04-calfresh-decision-registry-a06.md'),
    path.join(ROOT, 'schemas', 'status-sovereignty-rd04-calfresh-decision-registry-a06.schema.json'),
    path.join(ROOT, 'tools', 'acquire-status-sovereignty-rd04-calfresh-decision-registry-a06.mjs'),
    path.join(ROOT, 'tools', 'build-status-sovereignty-rd04-calfresh-decision-registry-a06.mjs'),
    path.join(ROOT, 'tools', 'validate-status-sovereignty-rd04-calfresh-decision-registry-a06.mjs'),
    path.join(ROOT, 'test', 'status-sovereignty-rd04-calfresh-decision-registry-a06.test.js'),
    BUILD_DATA_PATH,
    REPORT_DATA_PATH,
    REPORT_HTML_PATH
  ];
  const custodyFiles = walkFiles(path.join(INTAKE, 'source-custody'));
  const scope = [...new Set([...fixedFiles, ...custodyFiles])]
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => rel(a).localeCompare(rel(b)));
  const entries = scope.map((file) => {
    const bytes = fs.readFileSync(file);
    return { path: rel(file), sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'));
  const manifest = {
    schema_version: 'ssc-rd04-a06-release-manifest@1',
    execution_id: contract.execution_id,
    as_of: contract.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_program_completeness: false,
      exact_bytes_prove_implementation: false,
      manifest_proves_external_review: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
  writeJson(PROJECT_MANIFEST_PATH, manifest);
  writeJson(BUILD_MANIFEST_PATH, manifest);

  console.log(`build A06: ${denominator.returned_count} registry rows, ${sample.selected_count} hash-selected decisions, ${exactTextCount} parsed, 0 compliance joins`);
  console.log(`release SHA-256: ${combined}`);
}

main();
