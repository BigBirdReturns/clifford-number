#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, SCHEMA_PATH, WAVE_PATH, REPORT_ROOT, generateWaveOutputs, releaseScope } from './build-status-sovereignty-residual-denominator-wave-01.mjs';
const fail = (m) => { throw new Error(m); };
const ok = (c, m) => { if (!c) fail(m); };
const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const uniq = (xs, m) => ok(new Set(xs).size === xs.length, m);
const key = (v) => JSON.stringify(v && typeof v === 'object' && !Array.isArray(v)
? Object.fromEntries(Object.keys(v).sort().map((k) => [k, JSON.parse(key(v[k]))]))
: Array.isArray(v) ? v.map((x) => JSON.parse(key(x))) : v);
const git = (root, args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
const TERMINALS = {
'RD-01': ['bounded_selector_outcome_association','ordinary_market_or_procurement_control','selection_causation_unsupported','bounded_non_link','source_restricted','source_unavailable','requires_additional_acquisition'],
'RD-02': ['bounded_state_transition_chain','lawful_industrial_policy_control','capital_conversion_unsupported','source_restricted','source_unavailable','requires_additional_acquisition'],
'RD-03': ['bounded_instrument_lifecycle','lawful_industrial_policy_with_observed_recovery','partial_public_conversion_chain','capital_conversion_unsupported','source_restricted','source_unavailable','requires_additional_acquisition'],
'RD-04': ['bounded_nested_superiority_chain','ordinary_lawful_policy_control','partial_correction_control','racial_hierarchy_unsupported','bounded_non_link','source_restricted','source_unavailable','requires_additional_acquisition'],
'RD-05': ['ordinary_advisory_representation_control','independent_multiracial_counterpower_supported','representation_legitimacy_mechanism_supported_bounded','bounded_non_link','racial_hierarchy_unsupported','source_restricted','source_unavailable','requires_additional_acquisition'],
'RD-06': ['counterfactual_foreclosure_supported_bounded','partial_support_asymmetry_without_foreclosure','open_competition_and_effective_review_control','ordinary_integrated_system_explanation','foreclosure_unsupported','bounded_non_link','source_restricted','source_unavailable','requires_additional_acquisition']
};
export function validateAgainstSchema(value, schema, scope = '$') {
if (Object.hasOwn(schema, 'const')) ok(key(value) === key(schema.const), `${scope}: const changed`);
if (schema.type === 'object') {
ok(value && typeof value === 'object' && !Array.isArray(value), `${scope}: expected object`);
const props = schema.properties || {};
for (const name of schema.required || []) ok(Object.hasOwn(value, name), `${scope}: missing ${name}`);
if (schema.additionalProperties === false) for (const name of Object.keys(value)) ok(Object.hasOwn(props, name), `${scope}: unexpected ${name}`);
for (const [name, child] of Object.entries(props)) if (Object.hasOwn(value, name)) validateAgainstSchema(value[name], child, `${scope}.${name}`);
} else if (schema.type === 'array') {
ok(Array.isArray(value), `${scope}: expected array`);
if (schema.minItems !== undefined) ok(value.length >= schema.minItems, `${scope}: minItems ${schema.minItems}`);
if (schema.maxItems !== undefined) ok(value.length <= schema.maxItems, `${scope}: maxItems ${schema.maxItems}`);
if (schema.items) value.forEach((item, i) => validateAgainstSchema(item, schema.items, `${scope}[${i}]`));
} else if (schema.type === 'string') {
ok(typeof value === 'string', `${scope}: expected string`);
if (schema.minLength !== undefined) ok(value.length >= schema.minLength, `${scope}: minLength`);
if (schema.pattern) ok(new RegExp(schema.pattern).test(value), `${scope}: pattern ${schema.pattern}`);
} else if (schema.type === 'integer') {
ok(Number.isInteger(value), `${scope}: expected integer`);
if (schema.minimum !== undefined) ok(value >= schema.minimum, `${scope}: minimum`);
if (schema.maximum !== undefined) ok(value <= schema.maximum, `${scope}: maximum`);
}
return value;
}
function validateSchema(schema) {
ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
ok(schema.additionalProperties === false, 'schema root must remain closed');
const atlas = schema.properties?.canonical_residual_atlas?.properties;
ok(atlas?.residual_classes?.const === 42 && atlas?.closed_residual_classes?.const === 0 && atlas?.open_residual_classes?.const === 42, 'schema denominator weakened');
const result = schema.properties?.current_result?.properties;
ok(result?.reviewed_disposition_changed?.const === false && result?.graph_effect?.const === 'none' && result?.publication_effect?.const === 'none', 'schema authority ceiling weakened');
}
function validateAcquisition(root, receipt) {
const lane = read(root, receipt.acquisition_path);
ok(lane.schema_version === 'status-sovereignty-residual-execution@1', `${receipt.lane_id}: acquisition schema changed`);
ok(lane.execution_id.startsWith(`SSC-${receipt.lane_id.replace('-', '')}`), `${receipt.lane_id}: execution id mismatch`);
ok(lane.hypothesis_id === 'SSC-H01' && lane.parent_issue === 615 && lane.issue === receipt.issue, `${receipt.lane_id}: issue custody mismatch`);
ok(lane.gate_id === receipt.gate_id && lane.observation_id === receipt.observation_id && lane.as_of === '2026-08-01', `${receipt.lane_id}: gate custody mismatch`);
ok(lane.authority === 'source_acquisition_only_not_review_or_adjudication', `${receipt.lane_id}: authority escalated`);
ok(Array.isArray(lane.sources) && lane.sources.length === receipt.source_records, `${receipt.lane_id}: source count mismatch`);
uniq(lane.sources.map((s) => s.source_id), `${receipt.lane_id}: duplicate source id`);
for (const source of lane.sources) {
ok(/^https:\/\//.test(source.url), `${receipt.lane_id}: non-HTTPS source`);
ok(source.supports?.length && source.does_not_support?.length, `${receipt.lane_id}: source boundary incomplete`);
}
ok(Array.isArray(lane.open_denominators) && lane.open_denominators.length === receipt.acquisition_open_records, `${receipt.lane_id}: open-record count mismatch`);
uniq(lane.open_denominators, `${receipt.lane_id}: duplicate open record`);
ok(lane.current_result?.terminal_state === receipt.source_terminal_state, `${receipt.lane_id}: source terminal drift`);
ok(TERMINALS[receipt.lane_id].includes(receipt.wave_terminal_receipt), `${receipt.lane_id}: untyped terminal receipt`);
ok(lane.current_result?.reviewed_disposition_changed === false, `${receipt.lane_id}: reviewed disposition changed`);
ok(lane.current_result?.graph_effect === 'none' && lane.current_result?.publication_effect === 'none', `${receipt.lane_id}: effect escalated`);
ok(lane.boundaries?.graph_effect === 'none', `${receipt.lane_id}: boundary graph effect changed`);
if (receipt.lane_id === 'RD-05') {
const mapping = receipt.record_to_class_mapping;
ok(mapping && Object.keys(mapping).length === 6, 'RD-05: six canonical mappings required');
const rows = Object.values(mapping).flat();
uniq(rows, 'RD-05: mapping duplicates acquisition line');
ok(rows.length === 7 && Math.min(...rows) === 1 && Math.max(...rows) === 7, 'RD-05: mapping must cover seven acquisition lines');
ok(key(mapping['2']) === key([2,3]), 'RD-05: minutes/subcommittee split not preserved');
} else ok(receipt.acquisition_open_records === receipt.canonical_count, `${receipt.lane_id}: open records must equal canonical classes`);
if (receipt.lane_id === 'RD-02') {
ok(lane.cohort_rows?.length === 18, 'RD-02: eighteen cohort rows required');
uniq(lane.cohort_rows.map((r) => r.row), 'RD-02: duplicate cohort row');
ok(lane.cohort_rows.filter((r) => r.legal_vehicle === 'withheld under SBA policy').length === 1, 'RD-02: withheld row missing');
}
if (receipt.lane_id === 'RD-03') ok(lane.counts?.named_instruments === 5 && lane.counts?.executed_loans === 1 && lane.counts?.conditional_pre_close_commitments === 4, 'RD-03: lifecycle counts drifted');
if (receipt.lane_id === 'RD-04') {
ok(lane.selection_audit?.selection_gate_complete === false, 'RD-04: incomplete selection gate promoted');
ok(receipt.wave_terminal_receipt === 'requires_additional_acquisition', 'RD-04: incomplete state selection must remain open');
}
if (receipt.lane_id === 'RD-05') ok(lane.counts?.ACES_binding_authority_classes === 0 && lane.counts?.matched_control_binding_authority_classes === 3, 'RD-05: authority comparison drifted');
if (receipt.lane_id === 'RD-06') ok(lane.recovered_denominators?.later_procurement_proposals_received === 8 && lane.current_result?.counterfactual_foreclosure_supported === false, 'RD-06: proposal or foreclosure state drifted');
}
function validateAncestry(root, wave) {
if (process.env.SKIP_GIT_ANCESTRY === '1') return;
if (git(root, ['rev-parse','--is-inside-work-tree']).status !== 0) return;
for (const receipt of wave.lane_receipts) ok(git(root, ['merge-base','--is-ancestor',receipt.source_head,'HEAD']).status === 0, `${receipt.lane_id}: source head is not an ancestor of HEAD`);
ok(git(root, ['merge-base','--is-ancestor',wave.parent_custody.integration_base,'HEAD']).status === 0, 'integration base is not an ancestor of HEAD');
}
export function validateWave(root = ROOT) {
const schema = read(root, SCHEMA_PATH);
validateSchema(schema);
const wave = read(root, WAVE_PATH);
validateAgainstSchema(wave, schema);
ok(releaseScope.length === 26, 'release scope must contain 26 non-generated paths');
uniq(releaseScope, 'release scope duplicate');
ok(wave.lane_receipts.length === 6 && wave.canonical_residual_atlas.groups.length === 6, 'six lanes required');
uniq(wave.lane_receipts.map((r) => r.lane_id), 'duplicate lane id');
uniq(wave.lane_receipts.map((r) => r.issue), 'duplicate issue');
uniq(wave.lane_receipts.map((r) => r.source_head), 'duplicate source head');
const registry = wave.canonical_residual_atlas.groups.flatMap((group) => {
const source = read(root, group.source_path);
const labels = source[group.residual_field];
ok(Array.isArray(labels) && labels.length === group.count, `${group.lane_id}: first-pass residual count mismatch`);
uniq(labels, `${group.lane_id}: duplicate first-pass residual`);
return labels.map((label, i) => `${group.lane_id}-R${String(i + 1).padStart(2,'0')}:${label}`);
});
uniq(registry, 'duplicate residual registry row');
ok(registry.length === 42, 'canonical residual registry must contain 42 rows');
for (const receipt of wave.lane_receipts) {
const group = wave.canonical_residual_atlas.groups.find((g) => g.lane_id === receipt.lane_id);
ok(group && group.count === receipt.canonical_count && group.class_id === receipt.residual_class_id, `${receipt.lane_id}: atlas custody mismatch`);
ok(receipt.first_pass_path === group.source_path && receipt.first_pass_residual_field === group.residual_field, `${receipt.lane_id}: first-pass custody mismatch`);
validateAcquisition(root, receipt);
}
ok(wave.counts.source_records === wave.lane_receipts.reduce((n,r) => n + r.source_records, 0), 'source total mismatch');
ok(wave.counts.acquisition_open_record_lines === wave.lane_receipts.reduce((n,r) => n + r.acquisition_open_records, 0), 'open-record total mismatch');
ok(wave.counts.canonical_residual_classes === 42 && wave.counts.closed_residual_classes === 0 && wave.counts.open_residual_classes === 42, 'wave denominator changed');
ok(wave.current_result.residual_evidence_obligations_closed === 0, 'residual closure promoted');
ok(wave.current_result.graph_effect === 'none' && wave.current_result.publication_effect === 'none', 'wave effect changed');
validateAncestry(root, wave);
const generated = generateWaveOutputs(root);
for (const [rel, expected] of generated.outputs) {
const full = path.join(root, rel);
ok(fs.existsSync(full), `${rel}: generated output missing`);
ok(fs.readFileSync(full, 'utf8') === expected, `${rel}: generated bytes stale`);
}
const html = fs.readFileSync(path.join(root, `${REPORT_ROOT}/index.html`), 'utf8');
ok(html.includes('noindex,nofollow') && html.includes('GRAPH NONE · PUBLICATION NONE'), 'report authority boundary missing');
console.log(`validate-status-sovereignty-residual-denominator-wave-01: 6/6 receipts, 42 open, 0 closed, sources ${wave.counts.source_records}`);
return { wave, generated };
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) try { validateWave(); } catch (error) { console.error(`validate-status-sovereignty-residual-denominator-wave-01: ${error.message}`); process.exit(1); }
