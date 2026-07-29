#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = rel => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, null, 2) + '\n';

export const releaseScope = [
  '.github/workflows/k0-epistemic-admissibility.yml',
  '.github/workflows/k0-source-field-audit.yml',
  '.github/workflows/k0-role-neutral-wave-01.yml',
  '.github/workflows/k0-role-neutral-wave-02.yml',
  '.github/workflows/k0-role-neutral-wave-03.yml',
  '.github/workflows/k0-role-neutral-wave-04.yml',
  '.github/workflows/k0-role-neutral-wave-05.yml',
  '.github/workflows/k0-role-neutral-wave-06.yml',
  'data/intake/k0-epistemic-admissibility-source.txt',
  'data/intake/k0-ceiling-conversion-seed-events.json',
  'data/project/k0-epistemic-admissibility-methodology.json',
  'data/project/k0-existing-ecosystem-wiring.json',
  'data/research/k0-source-custody-audit.json',
  'data/research/k0-field-audit.json',
  'data/research/k0-role-neutral-denominator.json',
  'data/research/k0-role-neutral-wave-01.json',
  'data/research/k0-role-neutral-wave-02.json',
  'data/research/k0-role-neutral-wave-03.json',
  'data/research/k0-role-neutral-wave-04.json',
  'data/research/k0-role-neutral-wave-05.json',
  'data/research/k0-role-neutral-wave-06.json',
  'schemas/k0-ceiling-conversion-event.schema.json',
  'docs/methods/k0-epistemic-admissibility.md',
  'docs/milestones/m05-k0-epistemic-admissibility.md',
  'docs/milestones/m05-k0-source-field-audit.md',
  'docs/milestones/m05-k0-role-neutral-wave-01.md',
  'docs/milestones/m05-k0-role-neutral-wave-02.md',
  'docs/milestones/m05-k0-role-neutral-wave-03.md',
  'docs/milestones/m05-k0-role-neutral-wave-04.md',
  'docs/milestones/m05-k0-role-neutral-wave-05.md',
  'docs/milestones/m05-k0-role-neutral-wave-06.md',
  'tools/build-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-role-neutral-wave-01.mjs',
  'tools/build-k0-role-neutral-wave-02.mjs',
  'tools/validate-k0-role-neutral-wave-02.mjs',
  'tools/build-k0-role-neutral-wave-03.mjs',
  'tools/validate-k0-role-neutral-wave-03.mjs',
  'tools/build-k0-role-neutral-wave-04.mjs',
  'tools/validate-k0-role-neutral-wave-04.mjs',
  'tools/build-k0-role-neutral-wave-05.mjs',
  'tools/validate-k0-role-neutral-wave-05.mjs',
  'tools/build-k0-role-neutral-wave-06.mjs',
  'tools/validate-k0-role-neutral-wave-06.mjs',
  'test/k0-epistemic-admissibility.test.js',
  'test/k0-role-neutral-wave-01.test.js',
  'test/k0-role-neutral-wave-02.test.js',
  'test/k0-role-neutral-wave-03.test.js',
  'test/k0-role-neutral-wave-04.test.js',
  'test/k0-role-neutral-wave-05.test.js',
  'test/k0-role-neutral-wave-06.test.js'
];

export function computeK0ReleaseManifest() {
  const entries = releaseScope.map(rel => {
    const data = bytes(rel);
    return { path: rel, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'k0-epistemic-admissibility-release-manifest@2',
    program_id: 'M-05',
    layer_id: 'K0',
    as_of: '2026-07-27',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_event_truth: false,
      manifest_proves_remote_source_hash_custody: false,
      manifest_proves_selection_neutrality: false,
      maintainer_audit_proves_independent_review: false,
      manifest_creates_graph_effect: false
    }
  };
}

const method = read('data/project/k0-epistemic-admissibility-methodology.json');
const seeds = read('data/intake/k0-ceiling-conversion-seed-events.json');
const wiring = read('data/project/k0-existing-ecosystem-wiring.json');
const sourceAudit = read('data/research/k0-source-custody-audit.json');
const fieldAudit = read('data/research/k0-field-audit.json');
const neutral = read('data/research/k0-role-neutral-denominator.json');
const neutralWave01 = read('data/research/k0-role-neutral-wave-01.json');
const neutralWave02 = read('data/research/k0-role-neutral-wave-02.json');
const neutralWave03 = read('data/research/k0-role-neutral-wave-03.json');
const neutralWave04 = read('data/research/k0-role-neutral-wave-04.json');
const neutralWave05 = read('data/research/k0-role-neutral-wave-05.json');
const neutralWave06 = read('data/research/k0-role-neutral-wave-06.json');
const wave05Field = read('data/research/k0-wave05-field-adjudication.json');
const registry = read('data/project/m05-answerable-power-story-registry.json');
const fanout = read('data/project/m05-answerable-power-fanout.json');
const selection = read('data/canonical/corpus-selection.json');
const coverage = read('data/research/corpus-coverage.json');
const reviews = read('data/research/selection-adversarial-reviews.json');
const manifest = computeK0ReleaseManifest();
const roleCounts = seeds.events.reduce((acc, row) => ((acc[row.corpus_role] = (acc[row.corpus_role] || 0) + 1), acc), {});
const ccdCounts = seeds.events.reduce((acc, row) => ((acc[row.ccd_chain_depth] = (acc[row.ccd_chain_depth] || 0) + 1), acc), {});
const furthestCounts = seeds.events.reduce((acc, row) => ((acc[row.furthest_documented_stage] = (acc[row.furthest_documented_stage] || 0) + 1), acc), {});
const uniqueExternalUrls = new Set(seeds.events.flatMap(row => row.sources || []).map(row => row.url).filter(url => /^https?:/.test(url)));
const selectionLane = selection.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');

const report = {
  schema_version: 'k0-epistemic-admissibility-report@2',
  program_id: 'M-05',
  layer_id: 'K0',
  title: method.title,
  status: 'maintainer_audit_complete_role_neutral_execution_started_independent_review_open',
  as_of: method.as_of,
  source: {
    path: method.source_path,
    sha256: method.source_sha256,
    reference_count: seeds.source_reference_count,
    status: 'source_provided_analysis_maintainer_scope_audited_not_independently_adjudicated'
  },
  counts: {
    top_ten_people: seeds.seed_people_count,
    normalized_seed_events: seeds.events.length,
    seed_positive_fixtures: roleCounts.seed_positive_fixture || 0,
    seed_boundary_fixtures: roleCounts.seed_boundary_fixture || 0,
    seed_strategic_boundary_fixtures: roleCounts.seed_strategic_boundary_fixture || 0,
    ccd_chain_depths: ccdCounts,
    furthest_documented_stages: furthestCounts,
    original_source_rows: sourceAudit.source_denominator,
    directly_retrieved_sources: sourceAudit.directly_retrieved,
    restricted_sources: sourceAudit.source_restricted,
    source_rows_with_substitute_or_primary_upgrade: sourceAudit.rows_with_substitute_or_primary_upgrade,
    exact_remote_content_hashes: sourceAudit.exact_content_hashes_captured,
    field_audit_supported_for_human_review: fieldAudit.disposition_counts.supported_for_human_review,
    field_audit_retained_candidate_only: fieldAudit.disposition_counts.retained_candidate_only,
    ccd_depth_changes: fieldAudit.ccd_depth_changes,
    role_changes: fieldAudit.role_changes,
    role_neutral_query_executions: neutral.execution.searches_executed,
    role_neutral_raw_results_observed: neutral.execution.raw_results_observed,
    role_neutral_retained_records: neutral.execution.returned_records,
    role_neutral_candidate_records: neutral.execution.candidate_records,
    role_neutral_positive_controls: neutral.execution.positive_controls,
    role_neutral_negative_controls: neutral.execution.negative_controls,
    role_neutral_coverage_controls: neutral.execution.coverage_controls,
    role_neutral_requires_additional_acquisition: neutral.execution.open_additional_acquisition,
    role_neutral_resolved_additional_acquisition: neutral.execution.resolved_additional_acquisition,
    role_neutral_wave_01_query_executions: neutralWave01.counts.query_executions,
    role_neutral_wave_01_retained_records: neutralWave01.counts.retained_records,
    role_neutral_wave_02_query_executions: neutralWave02.counts.query_executions,
    role_neutral_wave_02_retained_records: neutralWave02.counts.retained_records,
    role_neutral_wave_02_candidate_records: neutralWave02.counts.candidate_requires_field_audit,
    role_neutral_wave_03_query_executions: neutralWave03.counts.query_executions,
    role_neutral_wave_03_retained_records: neutralWave03.counts.retained_records,
    role_neutral_wave_03_candidate_records: neutralWave03.counts.candidate_requires_field_audit,
    role_neutral_wave_04_query_executions: neutralWave04.counts.query_executions,
    role_neutral_wave_04_retained_records: neutralWave04.counts.retained_records,
    role_neutral_wave_04_candidate_records: neutralWave04.counts.candidate_requires_field_audit,
    role_neutral_wave_05_query_executions: neutralWave05.counts.query_executions,
    role_neutral_wave_05_retained_records: neutralWave05.counts.retained_records,
    role_neutral_wave_05_candidate_records: neutralWave05.counts.candidate_requires_field_audit,
    role_neutral_wave_06_query_executions: neutralWave06.counts.query_executions,
    role_neutral_wave_06_retained_records: neutralWave06.counts.retained_records,
    role_neutral_wave_06_candidate_records: neutralWave06.counts.candidate_requires_field_audit,
    role_neutral_wave_05_field_records_reviewed: wave05Field.counts.retained_records_reviewed,
    role_neutral_wave_05_field_supported_for_human_review: wave05Field.counts.supported_for_human_review,
    role_neutral_wave_05_field_retained_candidate_only: wave05Field.counts.retained_candidate_only,
    unique_external_urls_in_events: uniqueExternalUrls.size,
    natural_k0_fixtures: wiring.natural_k0_fixture_count,
    clean_first_class_estate_routes: wiring.clean_first_class_estate_route_count,
    shared_media_publication_taxonomy_gaps: wiring.shared_media_publication_taxonomy_gap_count,
    canonical_actor_footholds: wiring.canonical_actor_count,
    exact_pairwise_chains: wiring.exact_pairwise_chain_count,
    common_purpose_network_edges: wiring.justified_common_purpose_network_edges_among_top_ten,
    m05_stories: registry.stories.length,
    m05_lanes: fanout.lanes.length
  },
  method: {
    unit_of_analysis: method.unit_of_analysis,
    core_path: method.core_path,
    failure_species: method.failure_species,
    explanation_mutation_types: method.explanation_mutation_types,
    ccd: method.ceiling_conversion_depth,
    ccd_semantics: method.ccd_semantics,
    final_control_question: method.final_control_question
  },
  source_audit: sourceAudit,
  field_audit: fieldAudit,
  role_neutral_denominator: neutral,
  role_neutral_wave_01: neutralWave01,
  role_neutral_wave_02: neutralWave02,
  role_neutral_wave_03: neutralWave03,
  role_neutral_wave_04: neutralWave04,
  role_neutral_wave_05: neutralWave05,
  role_neutral_wave_06: neutralWave06,
  role_neutral_wave_05_field_adjudication: wave05Field,
  ecosystem_wiring: wiring,
  selection: { lane: selectionLane, coverage: coverageRow, review },
  seed_events: seeds.events,
  current_result: {
    source_preserved_exactly: sha256(bytes(method.source_path)) === method.source_sha256,
    structural_event_protocol_complete: true,
    maintainer_source_retrieval_audit_complete: true,
    maintainer_field_audit_complete: true,
    source_receipt_exact_hash_custody_complete: false,
    m05_story_installed: registry.stories.some(row => row.story_id === 'M05-S14'),
    m05_lane_installed: fanout.lanes.some(row => row.lane_id === 'A17'),
    central_selection_lane_installed: Boolean(selectionLane),
    role_neutral_universe_protocol_frozen: true,
    role_neutral_universe_execution_started: neutral.execution.name_blind_execution_started,
    role_neutral_wave_05_field_adjudication_complete: true,
    role_neutral_universe_executed: false,
    independent_second_party_review_complete: false,
    evidence_truth_determined: false,
    publication_status: 'blocked',
    graph_effect: 'none',
    works_standard_met: false,
    project_complete: false
  },
  release_manifest: {
    path: 'data/project/k0-epistemic-admissibility-release-manifest.json',
    combined_sha256: manifest.combined_sha256
  },
  boundaries: method.boundaries
};

write('data/project/k0-epistemic-admissibility-release-manifest.json', stable(manifest));
write('reports/core-thesis/answerable-power/k0.json', stable(report));

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const eventRows = seeds.events.map(row => `<tr><td><code>${esc(row.event_id)}</code></td><td>${esc(row.seed_person)}</td><td>${esc(row.event_name)}</td><td>${esc(row.ccd_chain_depth)}</td><td>${esc(row.furthest_documented_stage)}</td><td>${esc(row.field_audit_disposition)}</td></tr>`).join('');
const sourceRows = sourceAudit.rows.map(row => `<tr><td><code>${esc(row.source_id)}</code></td><td>${esc(row.title)}</td><td>${esc(row.retrieval_status)}</td><td>${row.direct_source_available ? 'yes' : 'no'}</td><td>${esc(row.limits.join(' '))}</td></tr>`).join('');
const wiringRows = wiring.rows.map(row => `<tr><td>${esc(row.rank)}</td><td>${esc(row.person)}</td><td>${esc(row.fit)}</td><td>${esc(row.natural_join)}</td><td>${esc(row.do_not_join)}</td></tr>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K0 · Epistemic admissibility</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · K0</b></p><h1>${esc(method.title)}</h1><p class="state">MAINTAINER SOURCE/FIELD AUDIT COMPLETE · INDEPENDENT REVIEW OPEN · PUBLICATION BLOCKED · GRAPH INERT</p><p>${esc(method.definition)}</p><div class="metrics"><div class="metric"><b>${report.counts.top_ten_people}</b>source people</div><div class="metric"><b>${report.counts.normalized_seed_events}</b>event fixtures</div><div class="metric"><b>${report.counts.directly_retrieved_sources}/${report.counts.original_source_rows}</b>direct sources</div><div class="metric"><b>${report.counts.field_audit_supported_for_human_review}</b>supported for review</div><div class="metric"><b>${report.counts.field_audit_retained_candidate_only}</b>candidate only</div><div class="metric"><b>${report.counts.role_neutral_retained_records}</b>wave-01 records</div><div class="metric"><b>${report.counts.common_purpose_network_edges}</b>network edges</div></div><h2>CCD law</h2><pre class="box">${esc(JSON.stringify(method.ccd_semantics, null, 2))}</pre><h2>Event audit</h2><table><tr><th>ID</th><th>Seed person</th><th>Event</th><th>Chain CCD</th><th>Furthest documented</th><th>Disposition</th></tr>${eventRows}</table><h2>Source custody</h2><table><tr><th>ID</th><th>Source</th><th>Retrieval</th><th>Direct</th><th>Limits</th></tr>${sourceRows}</table><h2>Ecosystem wiring</h2><table><tr><th>Rank</th><th>Person</th><th>Fit</th><th>Natural join</th><th>Do not join</th></tr>${wiringRows}</table><h2>Selection boundary</h2><pre class="box boundary">${esc(JSON.stringify({ status: selectionLane.status, review_status: review.status, publication_status: review.publication_status, gaps: coverageRow.known_gaps }, null, 2))}</pre><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/k0.html', html + '\n');
console.log(`build-k0-epistemic-admissibility: ${seeds.seed_people_count} people, ${seeds.events.length} seed events, ${neutral.execution.returned_records} role-neutral records across ${neutral.execution.executed_wave_ids.length} waves, ${wiring.justified_common_purpose_network_edges_among_top_ten} network edges`);
