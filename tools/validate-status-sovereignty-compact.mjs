#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-status-sovereignty-compact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const unique = (values) => new Set(values).size === values.length;

export function loadStatusSovereigntyContext() {
  return {
    hypothesis: read('data/project/status-sovereignty-compact.json'),
    fanout: read('data/project/status-sovereignty-fanout.json'),
    sources: read('data/project/status-sovereignty-source-registry.json'),
    schema: read('schemas/status-sovereignty-observation.schema.json'),
    manifest: read('data/project/status-sovereignty-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/index.html'), 'utf8'),
    core: read('data/project/core-thesis.json'),
    dca: read('data/project/dca-h01-field-hypothesis.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    m05Fanout: read('data/project/m05-answerable-power-fanout.json'),
    organism: read('data/project/security-state-organism-program.json')
  };
}

export function validateStatusSovereignty(context = loadStatusSovereigntyContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { hypothesis: h, fanout: f, sources: s, schema, manifest, buildManifest, buildReport, publicReport, html, core, dca, stories, m05Fanout, organism } = context;

  eq(h.schema_version, 'status-sovereignty-compact@1', 'SSC schema');
  eq(h.hypothesis_id, 'SSC-H01', 'SSC hypothesis identity');
  eq(h.program_id, 'M-05', 'SSC program');
  eq(h.status, 'canonical_field_hypothesis_zero_execution_no_prevalence_finding', 'SSC status');
  eq(h.authority_tier, 'AT-2', 'SSC authority tier');
  eq(h.coordinator_issue, 468, 'SSC coordinator issue');
  eq(h.parent_hypothesis?.hypothesis_id, 'DCA-H01', 'SSC parent hypothesis');
  eq(h.source_basis?.path, 'data/intake/status-sovereignty-compact-source.md', 'SSC source path');
  eq(h.source_basis?.sha256, sha256(readBytes(h.source_basis.path)), 'SSC source digest');
  eq(h.source_basis?.independent_verification_complete, false, 'SSC source independent-verification state');

  eq(h.four_gate_discriminator?.length, 4, 'SSC gate count');
  eq(JSON.stringify(h.four_gate_discriminator.map((row) => row.gate_id)), JSON.stringify(['SSC-G1','SSC-G2','SSC-G3','SSC-G4']), 'SSC gate identities');
  eq(h.dimensions?.length, 10, 'SSC dimension count');
  eq(JSON.stringify(h.dimensions.map((row) => row.dimension_id)), JSON.stringify(['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']), 'SSC dimension identities');
  eq(h.causal_sequence?.length, 12, 'SSC causal-stage count');
  check(unique(h.alternative_explanations ?? []), 'SSC alternative explanations duplicate');
  check(unique(h.falsifiers ?? []), 'SSC falsifiers duplicate');
  check(unique(h.forbidden_inferences ?? []), 'SSC forbidden inferences duplicate');
  check(h.allowed_terminal_states?.includes('ordinary_patriotic_or_industrial_policy'), 'SSC ordinary-policy terminal state missing');
  check(h.allowed_terminal_states?.includes('racial_hierarchy_unsupported'), 'SSC racial-hierarchy negative terminal state missing');

  eq(h.current_state?.query_or_field_execution_started, false, 'SSC execution state');
  eq(h.current_state?.observations_retained, 0, 'SSC retained observation count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) {
    eq(h.current_state?.[key], false, `SSC current ${key}`);
  }
  eq(h.current_state?.publication_status, 'blocked_pending_source_acquisition_and_review', 'SSC publication status');
  eq(h.current_state?.graph_effect, 'none', 'SSC current graph effect');

  const falseBoundaries = [
    'source_synthesis_is_evidence','patriotism_is_white_power','multiracial_presence_proves_neutrality',
    'multiracial_presence_proves_tokenism','racial_disparity_proves_intent','functional_convergence_proves_common_purpose',
    'shared_ecology_proves_coordination','public_industrial_policy_proves_capture','private_profit_proves_extraction',
    'deterministic_build_proves_hypothesis','fanout_issue_count_proves_coverage','field_hypothesis_creates_actor_edge',
    'field_hypothesis_authorizes_publication','field_hypothesis_advances_adoption','personal_anecdote_proves_prevalence','project_complete'
  ];
  for (const key of falseBoundaries) eq(h.boundaries?.[key], false, `SSC boundary ${key}`);
  eq(h.boundaries?.graph_effect, 'none', 'SSC boundary graph_effect');
  eq(h.boundaries?.promotes_to, 'candidate_only', 'SSC promotion ceiling');

  eq(f.schema_version, 'status-sovereignty-fanout@1', 'SSC fanout schema');
  eq(f.hypothesis_id, 'SSC-H01', 'SSC fanout hypothesis');
  eq(f.coordinator_issue, 468, 'SSC fanout coordinator');
  eq(f.issue_groups?.length, 8, 'SSC issue-group count');
  eq(f.lanes?.length, 16, 'SSC fanout lane count');
  check(unique(f.issue_groups.map((row) => row.group_id)), 'SSC issue-group uniqueness');
  check(unique(f.lanes.map((row) => row.lane_id)), 'SSC fanout lane uniqueness');
  eq(JSON.stringify(f.lanes.map((row) => row.lane_id)), JSON.stringify(Array.from({ length: 16 }, (_, i) => `SSC-F${String(i + 1).padStart(2, '0')}`)), 'SSC lane order');
  const issueIds = new Set(f.issue_groups.map((row) => row.issue_number));
  const groupIds = new Set(f.issue_groups.map((row) => row.group_id));
  const dimensionIds = new Set(h.dimensions.map((row) => row.dimension_id));
  for (const lane of f.lanes) {
    check(lane.issue_numbers?.length > 0 && lane.issue_numbers.every((id) => issueIds.has(id)), `${lane.lane_id}: issue denominator drift`);
    check(lane.issue_group_ids?.length > 0 && lane.issue_group_ids.every((id) => groupIds.has(id)), `${lane.lane_id}: issue-group drift`);
    check(lane.dimension_ids?.length > 0 && lane.dimension_ids.every((id) => dimensionIds.has(id)), `${lane.lane_id}: dimension drift`);
    check(lane.required_records?.length >= 8, `${lane.lane_id}: required-record contract incomplete`);
    check(lane.matched_controls?.length >= 5, `${lane.lane_id}: matched controls missing`);
    check(lane.allowed_terminal_states?.includes('ordinary_patriotic_or_industrial_policy'), `${lane.lane_id}: ordinary-policy terminal missing`);
    check(lane.allowed_terminal_states?.includes('racial_hierarchy_unsupported'), `${lane.lane_id}: racial-hierarchy terminal missing`);
    check(lane.execution?.started === false && lane.execution?.records_observed === 0 && lane.execution?.records_retained === 0 && lane.execution?.terminal_records === 0 && lane.graph_effect === 'none', 'SSC lane execution or graph drift');
  }
  eq(f.counts?.lanes, 16, 'SSC fanout count lanes');
  eq(f.counts?.issue_groups, 8, 'SSC fanout count issues');
  eq(f.counts?.query_or_field_execution_started, false, 'SSC fanout execution count state');
  eq(f.counts?.records_observed, 0, 'SSC fanout observed count');
  eq(f.counts?.records_retained, 0, 'SSC fanout retained count');
  eq(f.boundaries?.issue_count_proves_coverage, false, 'SSC issue-count boundary');
  eq(f.boundaries?.controls_may_be_dropped, false, 'SSC control boundary');
  eq(f.boundaries?.graph_effect, 'none', 'SSC fanout graph effect');

  eq(s.schema_version, 'status-sovereignty-source-registry@1', 'SSC source-registry schema');
  eq(s.hypothesis_id, 'SSC-H01', 'SSC source-registry hypothesis');
  eq(s.source_document?.path, h.source_basis.path, 'SSC source-registry path');
  eq(s.source_document?.sha256, h.source_basis.sha256, 'SSC source-registry digest');
  eq(s.source_document?.independent_verification_complete, false, 'SSC source-registry verification state');
  eq(s.external_references?.length, 8, 'SSC external-reference count');
  eq(s.repository_sources?.length, 7, 'SSC repository-source count');
  check(unique(s.external_references.map((row) => row.source_id)), 'SSC external-reference uniqueness');
  check(unique(s.repository_sources.map((row) => row.source_id)), 'SSC repository-source uniqueness');
  check(s.external_references.every((row) => row.url?.startsWith('https://') && row.custody === 'source_provided_reference_not_retrieved_in_this_change'), 'SSC external-reference custody drift');
  check(s.repository_sources.every((row) => fs.existsSync(path.join(root, row.path))), 'SSC repository source missing');
  eq(s.counts?.independently_retrieved_external_references, 0, 'SSC retrieval state');
  eq(s.boundaries?.source_document_is_canonical_evidence, false, 'SSC source authority boundary');
  eq(s.boundaries?.graph_effect, 'none', 'SSC source graph effect');

  eq(schema.additionalProperties, false, 'SSC observation schema additional-properties boundary');
  eq(schema.properties?.lane_id?.pattern, '^SSC-F(0[1-9]|1[0-6])$', 'SSC observation lane pattern');
  eq(schema.properties?.graph_effect?.const, 'none', 'SSC observation graph effect');
  for (const field of h.observation_required_fields ?? []) check(schema.required?.includes(field), `SSC observation schema missing ${field}`);
  check(schema.properties?.disposition?.enum?.includes('ordinary_patriotic_or_industrial_policy'), 'SSC ordinary-policy disposition missing');
  check(schema.properties?.disposition?.enum?.includes('racial_hierarchy_unsupported'), 'SSC racial-hierarchy disposition missing');
  check(schema.properties?.disposition?.enum?.includes('capital_conversion_unsupported'), 'SSC capital-conversion disposition missing');

  eq(core.field_hypothesis_bridges?.length, 2, 'SSC core field-hypothesis bridge count');
  eq(JSON.stringify(core.field_hypothesis_bridges.map((row) => row.hypothesis_id)), JSON.stringify(['DCA-H01','SSC-H01']), 'SSC core bridge identities');
  check(core.field_hypothesis_bridges.every((row) => row.graph_effect === 'none'), 'SSC core bridge graph drift');
  check(dca.cross_system_join?.SSC_H01?.includes('status-for-sovereignty'), 'SSC DCA bridge missing');
  eq(dca.current_state?.status_for_sovereignty_child_hypothesis_canonical, true, 'SSC DCA child state');
  eq(dca.boundaries?.status_for_sovereignty_hypothesis_proves_white_supremacy, false, 'SSC DCA white-supremacy boundary');
  check(stories.stories?.find((row) => row.story_id === 'M05-S14')?.canonical_routes?.includes('hypothesis:SSC-H01'), 'SSC M05-S14 bridge missing');
  check(stories.stories?.find((row) => row.story_id === 'M05-S15')?.canonical_routes?.includes('hypothesis:SSC-H01'), 'SSC M05-S15 bridge missing');
  eq(stories.boundaries?.patriotic_language_proves_white_power, false, 'SSC story patriotism boundary');
  eq(m05Fanout.boundaries?.patriotic_language_proves_white_power, false, 'SSC M05 patriotism boundary');
  eq(organism.status_for_sovereignty_bridge?.hypothesis_id, 'SSC-H01', 'SSC organism bridge');
  eq(organism.status_for_sovereignty_bridge?.graph_effect, 'none', 'SSC organism bridge graph effect');
  eq(organism.status_for_sovereignty_bridge?.conclusion_generated, false, 'SSC organism bridge conclusion state');
  eq(organism.boundaries?.patriotic_language_proves_white_power, false, 'SSC organism patriotism boundary');

  const recomputed = computeReleaseManifest();
  eq(JSON.stringify(manifest), JSON.stringify(recomputed), 'SSC exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'SSC build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'SSC build/public report drift');
  eq(publicReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'SSC report release digest');
  eq(publicReport.counts?.gates, 4, 'SSC report gate count');
  eq(publicReport.counts?.dimensions, 10, 'SSC report dimension count');
  eq(publicReport.counts?.fanout_lanes, 16, 'SSC report lane count');
  eq(publicReport.counts?.issue_groups, 8, 'SSC report issue count');
  eq(publicReport.counts?.executed_lanes, 0, 'SSC report executed count');
  eq(publicReport.counts?.retained_observations, 0, 'SSC report retained count');
  check(html.includes('SSC-H01 · ZERO EXECUTION · NO RACIAL-ORDER FINDING · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SSC report boundary banner missing');
  check(html.includes('Four-gate discriminator') && html.includes('Sixteen-lane fanout') && html.includes(manifest.combined_sha256), 'SSC report content drift');

  return errors;
}

function main() {
  const errors = validateStatusSovereignty();
  if (errors.length) {
    console.error(`validate-status-sovereignty-compact: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-compact: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
