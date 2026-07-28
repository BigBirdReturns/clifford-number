#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeK0ReleaseManifest } from './build-k0-epistemic-admissibility.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const allowedSpecies = new Set(['comprehension_failure','status_protective_reclassification','designed_comprehension_ceiling','strategic_bypass','mixed']);
const requiredPath = ['governing_claim','qualified_contradiction','knower_reclassification','explanation_mutation','institutional_gate_action','material_consequence','feedback_source_removed','correction_substitution_or_exit_blocked'];
const documented = status => status === 'documented';
const computeChainDepth = event => {
  let depth = -1;
  for (let i = 0; i < requiredPath.length; i++) {
    if (!documented(event.path?.[requiredPath[i]]?.status)) break;
    depth = i;
  }
  return Math.max(depth, 0);
};
const computeFurthest = event => {
  let depth = 0;
  for (let i = 0; i < requiredPath.length; i++) if (documented(event.path?.[requiredPath[i]]?.status)) depth = i;
  return depth;
};

export function validateK0({
  root = defaultRoot,
  seedPath = 'data/intake/k0-ceiling-conversion-seed-events.json',
  wiringPath = 'data/project/k0-existing-ecosystem-wiring.json',
  sourceAuditPath = 'data/research/k0-source-custody-audit.json',
  fieldAuditPath = 'data/research/k0-field-audit.json'
} = {}) {
  const failures = [];
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const fail = message => failures.push(message);
  const method = read('data/project/k0-epistemic-admissibility-methodology.json');
  const seeds = read(seedPath);
  const wiring = read(wiringPath);
  const sourceAudit = read(sourceAuditPath);
  const fieldAudit = read(fieldAuditPath);
  const neutral = read('data/research/k0-role-neutral-denominator.json');
  const neutralWave01 = read('data/research/k0-role-neutral-wave-01.json');
  const registry = read('data/project/m05-answerable-power-story-registry.json');
  const fanout = read('data/project/m05-answerable-power-fanout.json');
  const selection = read('data/canonical/corpus-selection.json');
  const coverage = read('data/research/corpus-coverage.json');
  const reviews = read('data/research/selection-adversarial-reviews.json');
  const manifest = read('data/project/k0-epistemic-admissibility-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0.json');

  if (method.schema_version !== 'k0-epistemic-admissibility-methodology@2' || method.layer_id !== 'K0') fail('method identity drift');
  if (method.core_path.length !== 8 || method.ceiling_conversion_depth.length !== 8) fail('K0 path or CCD denominator drift');
  if (method.ccd_semantics?.cumulative !== true || method.ccd_semantics?.satisfying_statuses?.join(',') !== 'documented') fail('CCD cumulative law drift');
  if (method.failure_species.length !== 5 || new Set(method.failure_species).size !== 5) fail('failure species denominator drift');
  if (method.boundaries.graph_effect !== 'none' || method.boundaries.project_complete !== false) fail('method boundary drift');
  if (method.boundaries.maintainer_review_is_independent_second_party_review !== false) fail('maintainer independence boundary drift');
  if (sha256(fs.readFileSync(path.join(root, method.source_path))) !== method.source_sha256) fail('source exact-byte hash drift');

  if (sourceAudit.schema_version !== 'k0-source-custody-audit@1' || sourceAudit.rows.length !== 25) fail('source audit denominator drift');
  if (sourceAudit.directly_retrieved !== 23 || sourceAudit.source_restricted !== 2 || sourceAudit.exact_content_hashes_captured !== 0) fail('source audit count drift');
  if (sourceAudit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source audit independence laundering');
  const sourceIds = new Set();
  for (const row of sourceAudit.rows) {
    if (!row.source_id || sourceIds.has(row.source_id)) fail(`duplicate source audit row ${row.source_id}`);
    sourceIds.add(row.source_id);
    if (row.graph_effect !== 'none' || row.claim_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.source_id}: source audit boundary drift`);
    if (row.direct_source_available === false && (!Array.isArray(row.substitute_sources) || row.substitute_sources.length < 1)) fail(`${row.source_id}: restricted source lacks substitute`);
    if (row.exact_content_sha256 !== null || row.hash_status !== 'not_captured_in_maintainer_web_audit') fail(`${row.source_id}: remote hash custody laundering`);
  }

  if (fieldAudit.schema_version !== 'k0-field-audit@1' || fieldAudit.rows.length !== 13) fail('field audit denominator drift');
  if (fieldAudit.disposition_counts.supported_for_human_review !== 6 || fieldAudit.disposition_counts.retained_candidate_only !== 7) fail('field disposition count drift');
  if (fieldAudit.role_changes !== 1 || fieldAudit.ccd_depth_changes !== 6) fail('field correction count drift');
  if (fieldAudit.independence_effect !== 'does_not_satisfy_second_party_review') fail('field audit independence laundering');
  const fieldByEvent = new Map(fieldAudit.rows.map(row => [row.event_id, row]));
  if (fieldByEvent.size !== 13) fail('duplicate field audit event');

  if (seeds.schema_version !== 'k0-ceiling-conversion-seed-events@2') fail('seed schema drift');
  if (seeds.seed_people_count !== 10 || seeds.events.length !== 13) fail('seed denominator drift');
  if (seeds.source_reference_count !== 25) fail('source reference denominator drift');
  const ids = new Set();
  const people = new Set();
  for (const event of seeds.events) {
    if (!event.event_id || ids.has(event.event_id)) fail(`duplicate or missing event id ${event.event_id}`);
    ids.add(event.event_id); people.add(event.seed_person);
    if (event.graph_effect !== 'none' || event.network_edge_created !== false) fail(`${event.event_id}: graph boundary drift`);
    if (event.evidence_truth_determined !== false || event.receipt_audit_complete !== false || event.independent_review_complete !== false) fail(`${event.event_id}: evidence truth laundering`);
    if (event.maintainer_source_audit_complete !== true) fail(`${event.event_id}: maintainer audit state missing`);
    if (event.publication_status !== 'blocked_pending_receipt_audit_and_second_party_selection_review') fail(`${event.event_id}: publication boundary drift`);
    const expectedChain = computeChainDepth(event);
    const expectedFurthest = computeFurthest(event);
    if (event.ccd_chain_depth !== expectedChain || event.ccd_depth !== expectedChain) fail(`${event.event_id}: CCD chain mismatch expected ${expectedChain}`);
    if (event.furthest_documented_stage !== expectedFurthest) fail(`${event.event_id}: furthest documented stage mismatch expected ${expectedFurthest}`);
    if (event.ccd_chain_depth > event.furthest_documented_stage) fail(`${event.event_id}: CCD exceeds furthest documented stage`);
    if (!Array.isArray(event.counterevidence) || event.counterevidence.length < 1) fail(`${event.event_id}: counterevidence missing`);
    if (!Array.isArray(event.alternative_explanations) || event.alternative_explanations.length < 1) fail(`${event.event_id}: alternative explanations missing`);
    if (!Array.isArray(event.sources) || event.sources.length < 2) fail(`${event.event_id}: sources missing`);
    for (const species of event.failure_species || []) if (!allowedSpecies.has(species)) fail(`${event.event_id}: unknown failure species ${species}`);
    for (const key of requiredPath) if (!event.path?.[key]?.status || !event.path?.[key]?.summary) fail(`${event.event_id}: missing path stage ${key}`);
    const audit = fieldByEvent.get(event.event_id);
    if (!audit || event.field_audit_disposition !== audit.disposition || event.audit_record_id !== fieldAudit.audit_id) fail(`${event.event_id}: field audit linkage drift`);
    if (event.corpus_role !== audit.audited_corpus_role || event.ccd_chain_depth !== audit.ccd_chain_depth || event.furthest_documented_stage !== audit.furthest_documented_stage) fail(`${event.event_id}: audited field drift`);
  }
  if (people.size !== 10) fail(`expected 10 seed people, got ${people.size}`);
  if (seeds.events.find(row => row.event_id === 'K0-SEED-012')?.corpus_role !== 'seed_boundary_fixture') fail('JAG boundary demotion drift');
  if (seeds.events.find(row => row.event_id === 'K0-SEED-013')?.ccd_chain_depth !== 5) fail('strategic-bypass CCD drift');

  if (neutral.schema_version !== 'k0-role-neutral-denominator@1' || neutral.gate_strata.length !== 9 || neutral.synthetic_controls.length !== 8 || neutral.search_battery.length !== 9) fail('neutral denominator drift');
  if (neutral.status !== 'execution_started_wave_01_discovery_only' || neutral.execution.name_blind_execution_started !== true || neutral.execution.searches_executed !== 4 || neutral.execution.returned_records !== 10 || neutral.execution.included_events !== 0) fail('neutral execution state drift');
  if (neutral.execution.candidate_records !== 5 || neutral.execution.positive_controls !== 1 || neutral.execution.negative_controls !== 2 || neutral.execution.requires_additional_acquisition !== 2) fail('neutral execution classification drift');
  if (JSON.stringify(neutral.execution.executed_wave_ids) !== JSON.stringify(['K0-W01']) || neutral.execution.independent_second_party_review_complete !== false) fail('neutral wave/independence drift');
  if (neutralWave01.schema_version !== 'k0-role-neutral-wave@1' || neutralWave01.wave_id !== 'K0-W01' || neutralWave01.records.length !== 10 || neutralWave01.excluded_results.length !== 8) fail('neutral wave denominator drift');
  if (neutralWave01.counts.query_executions !== 4 || neutralWave01.counts.raw_results_observed !== 18 || neutralWave01.counts.candidate_requires_field_audit !== 5 || neutralWave01.counts.included_events !== 0) fail('neutral wave count drift');
  if (neutralWave01.boundaries.query_hit_is_event !== false || neutralWave01.boundaries.publication_cleared !== false || neutralWave01.boundaries.graph_effect !== 'none') fail('neutral wave boundary drift');
  if (neutral.boundaries.seed_ten_are_denominator !== false || neutral.boundaries.graph_effect !== 'none') fail('neutral denominator boundary drift');

  if (wiring.schema_version !== 'k0-existing-ecosystem-wiring@2' || wiring.rows.length !== 10) fail('wiring denominator drift');
  if (wiring.natural_k0_fixture_count !== 10 || wiring.clean_first_class_estate_route_count !== 8) fail('wiring route count drift');
  if (wiring.shared_media_publication_taxonomy_gap_count !== 2) fail('media taxonomy gap drift');
  if (wiring.exact_pairwise_chain_count !== 1 || wiring.justified_common_purpose_network_edges_among_top_ten !== 0) fail('pairwise/network boundary drift');
  if (wiring.graph_effect !== 'none') fail('wiring graph effect drift');
  for (const row of wiring.rows) if (!row.natural_join || !row.do_not_join) fail(`${row.person}: incomplete natural/non-link wiring`);

  const story = registry.stories.find(row => row.story_id === 'M05-S14');
  const lane = fanout.lanes.find(row => row.lane_id === 'A17');
  if (!story || story.mode !== 'constitutional_mechanism') fail('M05-S14 missing or wrong mode');
  if (!lane || lane.story_id !== 'M05-S14') fail('A17 missing or disconnected');
  if (registry.stories.length !== 14 || fanout.lanes.length !== 17) fail('M05 integration counts drift');

  const selectionLane = selection.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  if (!selectionLane || selectionLane.status !== 'proposed' || selectionLane.graph_effect !== 'none') fail('selection lane boundary drift');
  if (!coverageRow || coverageRow.coverage_state !== 'active_discovery_partial') fail('coverage row missing');
  if (!review || review.status !== 'pending_second_party' || review.publication_status !== 'blocked' || review.reviewer_id !== null) fail('selection review boundary drift');
  if (review.maintainer_audit?.independence_effect !== 'does_not_satisfy_second_party_clearance') fail('maintainer audit review boundary missing');

  for (const rel of ['data/ledger/surfaces.jsonl','data/ledger/participation.jsonl','data/ledger/chains.jsonl']) {
    const full = path.join(root, rel);
    if (fs.existsSync(full) && /K0-SEED-|M05-S14|epistemic-admissibility-ceiling-events/.test(fs.readFileSync(full, 'utf8'))) fail(`${rel}: K0 leaked into canonical graph ledger`);
  }

  const expected = computeK0ReleaseManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) fail('exact-byte K0 release manifest drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report release hash drift');
  if (report.schema_version !== 'k0-epistemic-admissibility-report@2') fail('report schema drift');
  if (report.counts.top_ten_people !== 10 || report.counts.normalized_seed_events !== 13 || report.counts.common_purpose_network_edges !== 0) fail('report denominator drift');
  if (report.counts.field_audit_supported_for_human_review !== 6 || report.counts.field_audit_retained_candidate_only !== 7) fail('report field audit count drift');
  if (report.current_result.maintainer_source_retrieval_audit_complete !== true || report.current_result.maintainer_field_audit_complete !== true) fail('report audit state drift');
  if (report.current_result.role_neutral_universe_execution_started !== true || report.counts.role_neutral_query_executions !== 4 || report.counts.role_neutral_retained_records !== 10 || report.counts.role_neutral_candidate_records !== 5) fail('report role-neutral execution drift');
  if (report.current_result.source_receipt_exact_hash_custody_complete !== false || report.current_result.independent_second_party_review_complete !== false) fail('report independence/custody laundering');
  if (report.current_result.evidence_truth_determined !== false || report.current_result.graph_effect !== 'none' || report.current_result.project_complete !== false) fail('report result boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateK0();
  if (!result.ok) {
    console.error(`K0 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-epistemic-admissibility: OK');
}
