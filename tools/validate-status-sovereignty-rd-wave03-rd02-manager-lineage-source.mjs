#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXECUTION_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-execution-receipt.json';
export const SOURCE_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/sources/stifel-north-atlantic-2021-manager-lineage.json';
export const SUMMARY_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-summary.json';
export const MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-manifest.json';
export const PREVIOUS_SOURCE_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/sources/stifel-am-forward-2024-final-approval.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-manager-lineage-source.schema.json';
export const CANONICAL_REPLAY_MERGE = '83eb74ce48573dbcb0c76d05733cef1177df651a';
export const EXPECTED = Object.freeze({
  executionSha: 'c46b51863709d3bf2191d11cfb61ad242a1d146b3701a98b0fdc25489a349e1c',
  sourceSha: '109173a0b9c4b5657f9e90b4644d40bc409312cb128e5ccea73e70ce6a66dd14',
  summarySha: 'db808f3c0842fe2c9a38a645c8423c93d8a4d003258282d0d153fc9696f5b78b',
  manifestSha: '6e3ce909a033cdecc51a62bc718e85a992f16e128be9b703ca81f91cde306ae1',
  manifestCombined: 'e96286ac8b7863da128ec1183e018048582377aaa07edc1e7f303eda75509cff',
  artifactSha: 'ce479d1defb29c6fd07f7981730a8d11d5784d698fd51ead23f38bbed29c7cd7',
  artifactManifestSha: '453c755ea7f9db540798f0e7a2d78ca65f8e23245a707bdb5e4cecfa4e63a857',
  bodySha: '23fbef23cb77df6a6933bafd273b65ea034f14d10ff4ef40c05775a73fde67cf',
  textSha: '5e9b8e9167e6d3956a5f29d1b8d94e9724f152b22ba89b3d9362ed6ec434b76f',
  renderShas: ['ae8e18b55f3358864bea8e89bea61ab1801b2d844975d79246d76b5cb129706d','461d0c446dba37d93a666403e691d6d8bfb8700e55f0582fcb8cb183269c66a8']
});

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const canonicalJsonSha = (value) => sha256(`${JSON.stringify(value, null, 2)}\n`);
function validateBoundary(value, label) {
  ok(value?.outside_human_dependency === false, `${label}: outside-human dependency`);
  ok(value?.external_contacts === 0 && value?.external_reviews === 0, `${label}: external action`);
  for (const key of ['capital_conversion_finding','favoritism_finding','extraction_finding','coordination_finding','common_purpose_finding','complete_compact_finding']) {
    ok(value?.[key] === false, `${label}: ${key}`);
  }
  ok(value?.publication_effect === 'none' && value?.adoption_effect === 'none' && value?.graph_effect === 'none', `${label}: effects`);
}

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd02-manager-lineage-source.schema.json', 'schema ID');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema closure');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd02-wave03-admitted-source-receipt@1', 'schema version');
  ok(schema?.properties?.source_id?.const === 'STIFEL-NORTH-ATLANTIC-2021-MANAGER-LINEAGE', 'schema source ID');
  ok(schema?.properties?.unit_binding?.properties?.unit_ordinal?.const === 15, 'schema unit');
  ok(schema?.properties?.unit_binding?.properties?.exact_frozen_legal_vehicle_string_present?.const === false, 'schema identity boundary');
  ok(schema?.properties?.admitted_observations?.minItems === 4 && schema?.properties?.admitted_observations?.maxItems === 4, 'schema observation count');
  ok(schema?.properties?.source_disposition?.properties?.admitted_source?.const === true, 'schema admission');
  ok(schema?.properties?.source_disposition?.properties?.lifecycle_events_for_rd02_c05_observed?.const === 0, 'schema lifecycle boundary');
  ok(schema?.properties?.source_disposition?.properties?.class_closed?.const === false, 'schema class boundary');
  return true;
}

export function validateBundle(bundle = {}, root = ROOT) {
  const execution = bundle.execution ?? read(root, EXECUTION_PATH);
  const source = bundle.source ?? read(root, SOURCE_PATH);
  const summary = bundle.summary ?? read(root, SUMMARY_PATH);
  const manifest = bundle.manifest ?? read(root, MANIFEST_PATH);
  const previousSource = bundle.previousSource ?? read(root, PREVIOUS_SOURCE_PATH);
  const schema = bundle.schema ?? read(root, SCHEMA_PATH);
  validateSchemaContract(schema);

  ok(canonicalJsonSha(execution) === EXPECTED.executionSha, 'execution exact bytes changed');
  ok(canonicalJsonSha(source) === EXPECTED.sourceSha, 'source exact bytes changed');
  ok(canonicalJsonSha(summary) === EXPECTED.summarySha, 'summary exact bytes changed');
  ok(canonicalJsonSha(manifest) === EXPECTED.manifestSha, 'manifest exact bytes changed');

  ok(execution.canonical_replay_merge === CANONICAL_REPLAY_MERGE, 'execution ancestry');
  ok(execution.execution.workflow_run === 30953678041 && execution.execution.trigger_pr === 1086, 'execution run custody');
  ok(execution.execution.artifact_id === 8910162314 && execution.execution.artifact_zip_bytes === 398574 && execution.execution.artifact_zip_sha256 === EXPECTED.artifactSha, 'execution artifact');
  ok(execution.execution.artifact_manifest_entries === 14 && execution.execution.artifact_manifest_combined_sha256 === EXPECTED.artifactManifestSha, 'execution artifact manifest');
  ok(execution.counts.original_successful_routes_replayed === 0 && execution.counts.fixed_replay_routes === 1 && execution.counts.replay_attempts === 1 && execution.counts.terminal_replay_routes === 1, 'execution replay denominator');
  ok(execution.counts.http_success_pdf_captured === 1 && execution.counts.transport_failures === 0 && execution.counts.http_failures === 0 && execution.counts.source_restrictions === 0, 'execution terminal route state');
  ok(execution.counts.admitted_sources_in_raw_capture === 0 && execution.counts.observations_admitted_in_raw_capture === 0 && execution.counts.fields_closed_in_raw_capture === 0 && execution.counts.result_spawned_requests === 0, 'execution raw authority');
  const route = execution.route_outcome;
  ok(route.route_id === 'RD02-W03-DLR001' && route.replays_route_id === 'RD02-W03-DL002' && route.candidate_ordinal === 405 && route.unit_ordinal === 15, 'route identity');
  ok(decodeURIComponent(route.transport_url) === route.candidate_url && route.transport_url.includes('%20') && !route.transport_url.includes(' '), 'route URL custody');
  ok(route.curl_exit === 0 && route.http_status === 200 && route.final_host_allowed === true && route.content_type === 'application/pdf', 'route transport');
  ok(route.body_bytes === 403442 && route.body_sha256 === EXPECTED.bodySha && route.result_spawned_requests === 0, 'route body');
  const inspection = execution.inspection_custody;
  ok(inspection.pdf_pages === 2 && inspection.embedded_text_bytes === 4581 && inspection.embedded_text_sha256 === EXPECTED.textSha, 'inspection text');
  same(inspection.rendered_page_sha256, EXPECTED.renderShas, 'inspection renders');
  ok(inspection.rendered_pages_inspected === 2 && inspection.all_pages_rendered_and_inspected === true, 'inspection completion');
  ok(execution.current_result.new_admitted_sources === 1 && execution.current_result.new_bounded_observations === 4 && execution.current_result.new_lifecycle_events_observed === 0, 'execution adjudication');
  ok(execution.current_result.fields_terminally_closed === 0 && execution.current_result.row_terminally_closed === false && execution.current_result.class_state === 'still_open' && execution.current_result.class_closed === false, 'execution class boundary');
  ok(execution.current_result.automatic_additional_search_pass_authorized === false, 'execution search boundary');
  validateBoundary(execution.authority_boundaries, 'execution authority');

  ok(source.source_id === 'STIFEL-NORTH-ATLANTIC-2021-MANAGER-LINEAGE' && source.publication_date === '2021-02-19', 'source identity');
  ok(decodeURIComponent(source.transport_url) === source.candidate_url && source.transport_url.includes('%20') && !source.transport_url.includes(' '), 'source URL custody');
  ok(source.unit_binding.unit_ordinal === 15 && source.unit_binding.exact_frozen_legal_vehicle_string_present === false && source.unit_binding.later_public_fund_name_present === false, 'source unit boundary');
  ok(source.exact_custody.artifact_zip_sha256 === EXPECTED.artifactSha && source.exact_custody.body_sha256 === EXPECTED.bodySha && source.exact_custody.embedded_text_sha256 === EXPECTED.textSha, 'source custody');
  same(source.exact_custody.rendered_page_sha256, EXPECTED.renderShas, 'source renders');
  ok(source.admitted_observations.length === 4, 'source observation count');
  same(source.admitted_observations.map((row) => row.field), ['antecedent_acquisition_agreement','manager_affiliation_and_rebrand','antecedent_financial_commitment','sbic_and_vc_manager_context'], 'source observation fields');
  ok(source.admitted_observations.every((row) => row.state === 'observed' && row.not_equivalent_to.length >= 3), 'source observation bounds');
  ok(source.admitted_observations[0].scope === 'announced agreement only' && source.admitted_observations[0].not_equivalent_to.includes('observed transaction closing'), 'agreement boundary');
  ok(source.admitted_observations[2].not_equivalent_to.includes('capital funded') && source.admitted_observations[2].not_equivalent_to.includes('portfolio investment'), 'commitment boundary');
  ok(source.context_not_promoted.length === 2, 'source contextual nonpromotion');
  ok(source.source_disposition.admitted_source === true && source.source_disposition.admitted_observations === 4 && source.source_disposition.lifecycle_events_for_rd02_c05_observed === 0 && source.source_disposition.fields_terminally_closed === 0 && source.source_disposition.class_closed === false, 'source disposition');
  validateBoundary(source.authority_boundaries, 'source authority');

  ok(previousSource.source_id === 'STIFEL-AM-FORWARD-2024-FINAL-APPROVAL', 'previous source identity');
  ok(previousSource.source_disposition.admitted_source === true && previousSource.source_disposition.admitted_observations === 7 && previousSource.source_disposition.lifecycle_events_for_rd02_c05_observed === 0 && previousSource.source_disposition.fields_terminally_closed === 0 && previousSource.source_disposition.class_closed === false, 'previous source boundary');

  ok(summary.authority === 'two_leaf_sources_admitted_without_lifecycle_or_field_promotion', 'summary authority');
  same(summary.counts, { frozen_cohort_rows: 18, required_fields_per_row: 10, required_matrix_cells: 180, admitted_leaf_sources: 2, admitted_bounded_observations: 11, lifecycle_events_observed: 0, fields_terminally_closed_by_leaf_sources: 0, rows_terminally_closed_by_leaf_sources: 0, result_spawned_requests: 0, external_contacts: 0, external_reviews: 0 }, 'summary counts');
  ok(summary.current_result.automatic_additional_search_pass_authorized === false && summary.current_result.next_operation === 'terminally classify all 180 matrix cells from the complete fixed-protocol record', 'summary next operation');
  ok(summary.current_result.field_matrix_terminal === false && summary.current_result.class_state === 'still_open' && summary.current_result.class_closed === false, 'summary class boundary');
  ok(Object.values(summary.boundaries).every((value) => value === false), 'summary boundaries');

  ok(manifest.schema_version === 'ssc-rd02-wave03-manager-lineage-replay-manifest@1' && manifest.entry_count === 3 && manifest.combined_sha256 === EXPECTED.manifestCombined, 'manifest identity');
  same(manifest.entries.map((row) => row.path), [EXECUTION_PATH,SOURCE_PATH,SUMMARY_PATH], 'manifest paths');
  for (const row of manifest.entries) {
    const data = fs.readFileSync(abs(root, row.path));
    ok(row.bytes === data.length && row.sha256 === sha256(data), `manifest entry ${row.path}`);
  }
  const combined = manifest.entries.map((row) => `${row.sha256}  ${row.path}\n`).join('');
  ok(sha256(combined) === EXPECTED.manifestCombined, 'manifest combined hash');
  return { admittedSources: 2, admittedObservations: 11, lifecycleEvents: 0, classClosed: false };
}

export function validateRepository(root = ROOT) {
  const result = validateBundle({}, root);
  execFileSync('git', ['merge-base', '--is-ancestor', CANONICAL_REPLAY_MERGE, 'HEAD'], { cwd: root, stdio: 'ignore' });
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateRepository();
  console.log(`RD-02 manager-lineage source validation: PASS (${result.admittedSources} leaf sources; ${result.admittedObservations} bounded observations; class open)`);
}
