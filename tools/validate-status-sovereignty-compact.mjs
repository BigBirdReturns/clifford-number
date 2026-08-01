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
    wave: read('data/research/status-sovereignty-wave-01.json'),
    waveSources: read('data/research/status-sovereignty-wave-01-source-receipts.json'),
    waveRelease: read('data/project/status-sovereignty-wave-01-release-manifest.json'),
    review: read('data/research/status-sovereignty-wave-01-maintainer-review.json'),
    reviewRelease: read('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json'),
    acquisition: read('data/research/status-sovereignty-wave-01-targeted-acquisition.json'),
    acquisitionSources: read('data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json'),
    acquisitionRelease: read('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json'),
    wave02: read('data/research/status-sovereignty-wave-02.json'),
    wave02Sources: read('data/intake/status-sovereignty-wave-02-source-denominator.json'),
    wave02Review: read('data/research/status-sovereignty-wave-02-maintainer-review.json'),
    wave02IntakeRelease: read('data/project/status-sovereignty-wave-02-intake-release-manifest.json'),
    wave02ReviewRelease: read('data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json'),
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
  const { hypothesis: h, fanout: f, sources: s, wave, waveSources, waveRelease, review, reviewRelease, acquisition, acquisitionSources, acquisitionRelease, wave02, wave02Sources, wave02Review, wave02IntakeRelease, wave02ReviewRelease, schema, manifest, buildManifest, buildReport, publicReport, html, core, dca, stories, m05Fanout, organism } = context;

  eq(h.schema_version, 'status-sovereignty-compact@1', 'SSC schema');
  eq(h.hypothesis_id, 'SSC-H01', 'SSC hypothesis identity');
  eq(h.program_id, 'M-05', 'SSC program');
  eq(h.status, 'canonical_field_hypothesis_two_waves_maintainer_reviewed_open_no_prevalence_finding', 'SSC status');
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

  eq(h.current_state?.query_or_field_execution_started, true, 'SSC execution state');
  eq(h.current_state?.waves_executed, 2, 'SSC wave count');
  eq(h.current_state?.executed_lanes, 16, 'SSC executed lane count');
  eq(h.current_state?.observations_retained, 22, 'SSC retained observation count');
  eq(h.current_state?.terminal_observations, 22, 'SSC terminal observation count');
  eq(h.current_state?.maintainer_reviewed_observations, 22, 'SSC maintainer-reviewed count');
  eq(h.current_state?.second_party_reviewed_observations, 0, 'SSC second-party-reviewed count');
  eq(h.current_state?.adjudicated_observations, 0, 'SSC adjudicated count');
  eq(h.current_state?.complete_compact_findings, 0, 'SSC complete compact finding count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) {
    eq(h.current_state?.[key], false, `SSC current ${key}`);
  }
  eq(h.current_state?.publication_status, 'blocked_pending_second_party_review_and_still_open_denominators', 'SSC publication status');
  eq(h.current_state?.targeted_acquisition_supplements, 1, 'SSC targeted-acquisition supplement count');
  eq(h.current_state?.targeted_acquisition_source_records, 12, 'SSC targeted-acquisition source count');
  eq(h.current_state?.open_acquisition_obligations, 6, 'SSC open-acquisition obligation count');
  eq(h.current_state?.wave_01_open_acquisition_obligations, 3, 'SSC Wave 01 open-acquisition obligation count');
  eq(h.current_state?.wave_02_open_acquisition_obligations, 3, 'SSC Wave 02 open-acquisition obligation count');
  eq(h.current_state?.partially_repaired_acquisition_obligations, 3, 'SSC partially repaired obligation count');
  eq(h.current_state?.closed_acquisition_obligations, 0, 'SSC closed acquisition obligation count');
  eq(h.targeted_acquisitions?.length, 1, 'SSC targeted-acquisition registry count');
  eq(h.targeted_acquisitions?.[0]?.acquisition_id, 'SSC-W01-TA01', 'SSC targeted-acquisition identity');
  eq(h.targeted_acquisitions?.[0]?.partially_repaired_open, 3, 'SSC targeted-acquisition partially repaired count');
  eq(h.targeted_acquisitions?.[0]?.closed, 0, 'SSC targeted-acquisition closed count');
  eq(h.targeted_acquisitions?.[0]?.graph_effect, 'none', 'SSC targeted-acquisition graph effect');
  eq(h.current_state?.graph_effect, 'none', 'SSC current graph effect');
  eq(h.field_waves?.length, 2, 'SSC field-wave count');
  eq(h.field_waves?.[0]?.wave_id, 'SSC-W01', 'SSC field-wave identity');
  eq(h.field_waves?.[0]?.observations, 14, 'SSC field-wave observation count');
  eq(h.field_waves?.[0]?.complete_compact_findings, 0, 'SSC field-wave finding count');
  eq(h.field_waves?.[0]?.review_state, 'maintainer_reviewed', 'SSC field-wave review state');
  eq(h.field_waves?.[0]?.graph_effect, 'none', 'SSC field-wave graph effect');
  eq(h.field_waves?.[1]?.wave_id, 'SSC-W02', 'SSC Wave 02 field-wave identity');
  eq(h.field_waves?.[1]?.observations, 8, 'SSC Wave 02 observation count');
  eq(h.field_waves?.[1]?.complete_compact_findings, 0, 'SSC Wave 02 finding count');
  eq(h.field_waves?.[1]?.review_state, 'maintainer_reviewed', 'SSC Wave 02 review state');
  eq(h.field_waves?.[1]?.status, 'executed_maintainer_reviewed_zero_complete_compact', 'SSC Wave 02 field-wave status');
  eq(h.field_waves?.[1]?.executed_lanes, 8, 'SSC Wave 02 executed-lane count');
  eq(h.field_waves?.[1]?.maintainer_review_path, 'data/research/status-sovereignty-wave-02-maintainer-review.json', 'SSC Wave 02 maintainer-review path');
  eq(h.field_waves?.[1]?.maintainer_reviewed_observations, 8, 'SSC Wave 02 maintainer-reviewed observations');
  eq(h.field_waves?.[1]?.second_party_reviewed_observations, 0, 'SSC Wave 02 second-party-reviewed observations');
  eq(h.field_waves?.[1]?.adjudicated_observations, 0, 'SSC Wave 02 adjudicated observations');
  eq(h.field_waves?.[1]?.graph_effect, 'none', 'SSC Wave 02 graph effect');
  eq(h.maintainer_reviews?.length, 2, 'SSC maintainer-review registry count');
  eq(JSON.stringify(h.maintainer_reviews?.map((row) => row.review_id)), JSON.stringify(['SSC-W01-MR01','SSC-W02-MR01']), 'SSC maintainer-review registry identities');
  eq(h.maintainer_reviews?.[1]?.reviewed_observations, 8, 'SSC Wave 02 maintainer-review registry count');
  eq(h.maintainer_reviews?.[1]?.graph_effect, 'none', 'SSC Wave 02 maintainer-review registry graph effect');

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
  eq(f.status, 'canonical_fanout_two_waves_maintainer_reviewed', 'SSC fanout status');
  eq(f.issue_groups?.length, 8, 'SSC issue-group count');
  eq(f.lanes?.length, 16, 'SSC fanout lane count');
  check(unique(f.issue_groups.map((row) => row.group_id)), 'SSC issue-group uniqueness');
  check(unique(f.lanes.map((row) => row.lane_id)), 'SSC fanout lane uniqueness');
  eq(JSON.stringify(f.lanes.map((row) => row.lane_id)), JSON.stringify(Array.from({ length: 16 }, (_, i) => `SSC-F${String(i + 1).padStart(2, '0')}`)), 'SSC lane order');
  const issueIds = new Set(f.issue_groups.map((row) => row.issue_number));
  const groupIds = new Set(f.issue_groups.map((row) => row.group_id));
  const dimensionIds = new Set(h.dimensions.map((row) => row.dimension_id));
  const expectedLaneCounts = { 'SSC-F01':1,'SSC-F02':1,'SSC-F03':1,'SSC-F04':1,'SSC-F05':1,'SSC-F06':3,'SSC-F07':1,'SSC-F08':1,'SSC-F09':1,'SSC-F10':2,'SSC-F11':1,'SSC-F12':1,'SSC-F13':1,'SSC-F14':1,'SSC-F15':1,'SSC-F16':4 };
  for (const lane of f.lanes) {
    check(lane.issue_numbers?.length > 0 && lane.issue_numbers.every((id) => issueIds.has(id)), `${lane.lane_id}: issue denominator drift`);
    check(lane.issue_group_ids?.length > 0 && lane.issue_group_ids.every((id) => groupIds.has(id)), `${lane.lane_id}: issue-group drift`);
    check(lane.dimension_ids?.length > 0 && lane.dimension_ids.every((id) => dimensionIds.has(id)), `${lane.lane_id}: dimension drift`);
    check(lane.required_records?.length >= 8, `${lane.lane_id}: required-record contract incomplete`);
    check(lane.matched_controls?.length >= 5, `${lane.lane_id}: matched controls missing`);
    check(lane.allowed_terminal_states?.includes('ordinary_patriotic_or_industrial_policy'), `${lane.lane_id}: ordinary-policy terminal missing`);
    check(lane.allowed_terminal_states?.includes('racial_hierarchy_unsupported'), `${lane.lane_id}: racial-hierarchy terminal missing`);
    const expected = expectedLaneCounts[lane.lane_id] ?? 0;
    eq(lane.execution?.started, expected > 0, `${lane.lane_id}: execution state`);
    eq(lane.execution?.records_observed, expected, `${lane.lane_id}: observed count`);
    eq(lane.execution?.records_retained, expected, `${lane.lane_id}: retained count`);
    eq(lane.execution?.terminal_records, expected, `${lane.lane_id}: terminal count`);
    eq(lane.execution?.maintainer_reviewed_records, expected, `${lane.lane_id}: reviewed count`);
    eq(lane.execution?.review_state, expected > 0 ? 'maintainer_reviewed' : 'not_applicable', `${lane.lane_id}: review state`);
    eq(lane.graph_effect, 'none', `${lane.lane_id}: graph effect`);
  }
  eq(f.counts?.lanes, 16, 'SSC fanout count lanes');
  eq(f.counts?.issue_groups, 8, 'SSC fanout count issues');
  eq(f.counts?.query_or_field_execution_started, true, 'SSC fanout execution state');
  eq(f.counts?.waves_executed, 2, 'SSC fanout wave count');
  eq(f.counts?.executed_lanes, 16, 'SSC fanout executed count');
  eq(f.counts?.records_observed, 22, 'SSC fanout observed count');
  eq(f.counts?.records_retained, 22, 'SSC fanout retained count');
  eq(f.counts?.terminal_records, 22, 'SSC fanout terminal count');
  eq(f.counts?.maintainer_reviewed_records, 22, 'SSC fanout reviewed count');
  eq(f.counts?.second_party_reviewed_records, 0, 'SSC fanout second-party count');
  eq(f.counts?.adjudicated_records, 0, 'SSC fanout adjudication count');
  eq(f.waves?.length, 2, 'SSC fanout wave registry count');
  eq(f.waves?.[1]?.wave_id, 'SSC-W02', 'SSC fanout Wave 02 identity');
  eq(f.waves?.[1]?.source_records, 14, 'SSC fanout Wave 02 source count');
  eq(f.waves?.[1]?.observations, 8, 'SSC fanout Wave 02 observation count');
  eq(f.waves?.[1]?.executed_lanes, 8, 'SSC fanout Wave 02 executed-lane count');
  eq(f.waves?.[1]?.maintainer_review_path, 'data/research/status-sovereignty-wave-02-maintainer-review.json', 'SSC fanout Wave 02 review path');
  eq(f.waves?.[1]?.maintainer_reviewed_records, 8, 'SSC fanout Wave 02 reviewed count');
  eq(f.waves?.[1]?.second_party_reviewed_records, 0, 'SSC fanout Wave 02 second-party count');
  eq(f.waves?.[1]?.adjudicated_records, 0, 'SSC fanout Wave 02 adjudication count');
  eq(f.boundaries?.issue_count_proves_coverage, false, 'SSC issue-count boundary');
  eq(f.boundaries?.controls_may_be_dropped, false, 'SSC control boundary');
  eq(f.boundaries?.graph_effect, 'none', 'SSC fanout graph effect');

  eq(s.schema_version, 'status-sovereignty-source-registry@1', 'SSC source-registry schema');
  eq(s.hypothesis_id, 'SSC-H01', 'SSC source-registry hypothesis');
  eq(s.source_document?.path, h.source_basis.path, 'SSC source-registry path');
  eq(s.source_document?.sha256, h.source_basis.sha256, 'SSC source-registry digest');
  eq(s.source_document?.independent_verification_complete, false, 'SSC source-registry synthesis verification state');
  eq(s.external_references?.length, 8, 'SSC external-reference count');
  eq(s.repository_sources?.length, 7, 'SSC repository-source count');
  check(unique(s.external_references.map((row) => row.source_id)), 'SSC external-reference uniqueness');
  check(unique(s.repository_sources.map((row) => row.source_id)), 'SSC repository-source uniqueness');
  check(s.external_references.every((row) => row.url?.startsWith('https://') && row.custody === 'source_provided_reference_not_retrieved_in_this_change'), 'SSC external-reference custody drift');
  check(s.repository_sources.every((row) => fs.existsSync(path.join(root, row.path))), 'SSC repository source missing');
  eq(s.counts?.independently_retrieved_external_references, 0, 'SSC synthesis-reference retrieval state');
  eq(s.field_source_receipts?.length, 2, 'SSC field-source receipt count');
  eq(s.field_source_receipts?.[0]?.wave_id, 'SSC-W01', 'SSC field-source wave identity');
  eq(s.counts?.field_source_records, 29, 'SSC field source count');
  eq(s.counts?.independently_reviewed_field_sources, 26, 'SSC field source review count');
  eq(s.counts?.field_source_bytes_preserved, 0, 'SSC field source byte count');
  eq(s.counts?.maintainer_reviewed_observation_packets, 22, 'SSC reviewed packet count');
  eq(s.counts?.second_party_reviewed_observation_packets, 0, 'SSC second-party packet count');
  eq(s.counts?.adjudicated_observation_packets, 0, 'SSC adjudicated packet count');
  eq(s.observation_packet_reviews?.length, 2, 'SSC observation review registry count');
  eq(s.observation_packet_reviews?.[0]?.review_id, 'SSC-W01-MR01', 'SSC observation review identity');
  eq(s.field_source_receipts?.[1]?.wave_id, 'SSC-W02', 'SSC Wave 02 field-source wave identity');
  eq(s.observation_packet_reviews?.[1]?.review_id, 'SSC-W02-MR01', 'SSC Wave 02 observation review identity');
  eq(s.boundaries?.source_document_is_canonical_evidence, false, 'SSC source authority boundary');
  eq(s.boundaries?.normalized_fact_records_equal_source_bytes, false, 'SSC normalized-fact authority boundary');
  eq(s.boundaries?.field_source_review_is_maintainer_review, false, 'SSC field-review authority boundary');
  eq(s.boundaries?.graph_effect, 'none', 'SSC source graph effect');

  eq(wave.wave_id, 'SSC-W01', 'SSC live wave identity');
  eq(wave.counts?.source_records, 15, 'SSC live wave source count');
  eq(wave.counts?.observations, 14, 'SSC live wave observation count');
  eq(wave.counts?.executed_lanes, 8, 'SSC live wave executed count');
  eq(wave.counts?.supported_bounded_compact, 0, 'SSC live wave complete compact count');
  eq(wave.counts?.partial_functional_convergence, 6, 'SSC live wave partial count');
  eq(wave.counts?.ordinary_patriotic_or_industrial_policy, 4, 'SSC live wave control count');
  eq(wave.counts?.requires_additional_acquisition, 3, 'SSC live wave acquisition count');
  eq(wave.counts?.capital_conversion_unsupported, 1, 'SSC live wave unsupported capital count');
  eq(wave.counts?.maintainer_reviewed, 14, 'SSC live wave reviewed count');
  eq(wave.counts?.second_party_reviewed, 0, 'SSC live wave second-party count');
  eq(wave.counts?.adjudicated, 0, 'SSC live wave adjudication count');
  eq(review.counts?.maintainer_reviewed, 14, 'SSC review denominator');
  eq(review.counts?.second_party_reviewed, 0, 'SSC review second-party denominator');
  eq(review.counts?.adjudicated, 0, 'SSC review adjudication denominator');
  eq(review.counts?.supported_bounded_compact, 0, 'SSC review complete compact denominator');
  eq(review.current_result?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'SSC review publication state');
  check(/^[0-9a-f]{64}$/.test(reviewRelease.combined_sha256), 'SSC review release digest format');
  eq(acquisition.acquisition_id, 'SSC-W01-TA01', 'SSC acquisition identity');
  eq(acquisition.counts?.source_records, 12, 'SSC acquisition source denominator');
  eq(acquisition.counts?.obligations, 3, 'SSC acquisition obligation denominator');
  eq(acquisition.counts?.partially_repaired_open, 3, 'SSC acquisition partially repaired denominator');
  eq(acquisition.counts?.closed, 0, 'SSC acquisition closed denominator');
  eq(acquisition.counts?.reviewed_disposition_changes, 0, 'SSC acquisition disposition-change count');
  eq(acquisition.counts?.complete_compact_findings, 0, 'SSC acquisition complete compact count');
  eq(acquisition.current_result?.publication_status, 'blocked_pending_second_party_review_and_still_open_denominators', 'SSC acquisition publication state');
  eq(acquisition.current_result?.graph_effect, 'none', 'SSC acquisition graph effect');
  eq(acquisitionSources.records?.length, 12, 'SSC acquisition source rows');
  check(/^[0-9a-f]{64}$/.test(acquisitionRelease.combined_sha256), 'SSC acquisition release digest format');
  eq(wave.current_result?.racial_order_finding_generated, false, 'SSC live wave racial-order state');
  eq(wave.current_result?.graph_effect, 'none', 'SSC live wave graph effect');
  eq(waveSources.records?.length, 15, 'SSC live field source denominator');
  check(/^[0-9a-f]{64}$/.test(waveRelease.combined_sha256), 'SSC Wave 01 release digest format');

  eq(wave02.wave_id, 'SSC-W02', 'SSC Wave 02 identity');
  eq(wave02.counts?.source_records, 14, 'SSC Wave 02 source count');
  eq(wave02.counts?.candidate_observations, 8, 'SSC Wave 02 observation count');
  eq(wave02.counts?.maintainer_reviewed, 8, 'SSC Wave 02 reviewed count');
  eq(wave02.counts?.second_party_reviewed, 0, 'SSC Wave 02 second-party count');
  eq(wave02.counts?.adjudicated, 0, 'SSC Wave 02 adjudication count');
  eq(wave02.counts?.supported_bounded_compact, 0, 'SSC Wave 02 complete compact count');
  eq(wave02Review.counts?.maintainer_reviewed, 8, 'SSC Wave 02 review denominator');
  eq(wave02Review.counts?.second_party_reviewed, 0, 'SSC Wave 02 second-party count');
  eq(wave02Review.counts?.adjudicated, 0, 'SSC Wave 02 adjudication count');
  eq(wave02Review.counts?.requires_additional_acquisition, 3, 'SSC Wave 02 open acquisition count');
  eq(wave02Review.counts?.effective_counterpower_controls, 1, 'SSC Wave 02 counterpower control count');
  eq(wave02Review.current_result?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'SSC Wave 02 review publication state');
  eq(wave02Sources.records?.length, 14, 'SSC Wave 02 source denominator');
  eq(wave02IntakeRelease.combined_sha256, 'c0514c882755f0eb421ff28694edda35bf2aa6f57fa4708b3b66d6e4d8d44988', 'SSC Wave 02 intake release digest');
  check(/^[0-9a-f]{64}$/.test(wave02ReviewRelease.combined_sha256), 'SSC Wave 02 review release digest format');

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

  eq(JSON.stringify(manifest), JSON.stringify(computeReleaseManifest()), 'SSC exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'SSC build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'SSC build/public report drift');
  eq(publicReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'SSC report release digest');
  eq(publicReport.wave_01?.release_manifest?.combined_sha256, waveRelease.combined_sha256, 'SSC report Wave 01 release digest');
  eq(publicReport.maintainer_review?.release_manifest?.combined_sha256, reviewRelease.combined_sha256, 'SSC report review release digest');
  eq(publicReport.targeted_acquisition?.release_manifest?.combined_sha256, acquisitionRelease.combined_sha256, 'SSC report acquisition release digest');
  eq(publicReport.wave_02?.review_release_manifest?.combined_sha256, wave02ReviewRelease.combined_sha256, 'SSC report Wave 02 review release digest');
  eq(publicReport.wave_02_maintainer_review?.release_manifest?.combined_sha256, wave02ReviewRelease.combined_sha256, 'SSC report Wave 02 maintainer-review digest');
  eq(publicReport.counts?.gates, 4, 'SSC report gate count');
  eq(publicReport.counts?.dimensions, 10, 'SSC report dimension count');
  eq(publicReport.counts?.fanout_lanes, 16, 'SSC report lane count');
  eq(publicReport.counts?.issue_groups, 8, 'SSC report issue count');
  eq(publicReport.counts?.field_source_records, 29, 'SSC report field source count');
  eq(publicReport.counts?.waves_executed, 2, 'SSC report wave count');
  eq(publicReport.counts?.executed_lanes, 16, 'SSC report executed count');
  eq(publicReport.counts?.retained_observations, 22, 'SSC report retained count');
  eq(publicReport.counts?.complete_compact_findings, 0, 'SSC report complete compact count');
  eq(publicReport.counts?.targeted_acquisition_supplements, 1, 'SSC report acquisition supplement count');
  eq(publicReport.counts?.targeted_acquisition_source_records, 12, 'SSC report acquisition source count');
  eq(publicReport.counts?.open_acquisition_obligations, 6, 'SSC report open obligation count');
  eq(publicReport.counts?.wave_01_open_acquisition_obligations, 3, 'SSC report Wave 01 open obligation count');
  eq(publicReport.counts?.wave_02_open_acquisition_obligations, 3, 'SSC report Wave 02 open obligation count');
  eq(publicReport.counts?.partially_repaired_acquisition_obligations, 3, 'SSC report partially repaired count');
  eq(publicReport.counts?.closed_acquisition_obligations, 0, 'SSC report closed obligation count');
  check(html.includes('SSC-H01 · TWO WAVES MAINTAINER REVIEWED 22/22 · SECOND-PARTY 0 · COMPLETE-COMPACT FINDINGS 0 · NO RACIAL-ORDER FINDING · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SSC report boundary banner missing');
  check(html.includes('Wave 01 and Wave 02 reviewed source records') && html.includes('SSC-W02-I-S014') && html.includes('3/6') && html.includes('Targeted acquisition') && html.includes('Four-gate discriminator') && html.includes('Sixteen-lane fanout') && html.includes(manifest.combined_sha256), 'SSC report content drift');

  for (const heldPath of [
    'build/core-thesis/status-sovereignty',
    'reports/core-thesis/status-sovereignty',
    'data/project/status-sovereignty-compact.json',
    'data/project/status-sovereignty-fanout.json',
    'data/project/status-sovereignty-release-manifest.json',
    'data/project/status-sovereignty-source-registry.json',
    'data/project/status-sovereignty-wave-01-release-manifest.json',
    'data/research/status-sovereignty-wave-01-source-receipts.json',
    'data/research/status-sovereignty-wave-01.json',
    'docs/methods/status-sovereignty-compact.md',
    'docs/milestones/m05-status-sovereignty-fanout.md',
    'docs/milestones/m05-status-sovereignty-wave-01.md',
    'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
    'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
    'data/research/status-sovereignty-wave-01-maintainer-review.json',
    'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
    'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
    'docs/milestones/m05-status-sovereignty-wave-01-review.md',
    'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md'
    ,'data/research/status-sovereignty-wave-02.json'
    ,'data/research/status-sovereignty-wave-02-maintainer-review.json'
    ,'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json'
    ,'docs/milestones/m05-status-sovereignty-wave-02-review.md'
  ]) {
    const builder = fs.readFileSync(path.join(root, 'tools/build-pages.mjs'), 'utf8');
    const validator = fs.readFileSync(path.join(root, 'tools/validate-pages.mjs'), 'utf8');
    check(builder.includes(heldPath.split('/').map((part) => `'${part}'`).join(', ')), `Pages builder does not hold ${heldPath}`);
    check(validator.includes(`'${heldPath}'`), `Pages validator does not refuse ${heldPath}`);
  }

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

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
