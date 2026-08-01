#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave01Manifest } from './build-status-sovereignty-wave-01.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const unique = (values) => new Set(values).size === values.length;
const canonicalObject = (value) => Object.fromEntries(Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b)));

export function loadWave01Context() {
  return {
    wave: read('data/research/status-sovereignty-wave-01.json'),
    sources: read('data/research/status-sovereignty-wave-01-source-receipts.json'),
    review: read('data/research/status-sovereignty-wave-01-maintainer-review.json'),
    hypothesis: read('data/project/status-sovereignty-compact.json'),
    fanout: read('data/project/status-sovereignty-fanout.json'),
    sourceRegistry: read('data/project/status-sovereignty-source-registry.json'),
    schema: read('schemas/status-sovereignty-observation.schema.json'),
    manifest: read('data/project/status-sovereignty-wave-01-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/wave-01/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/wave-01/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/wave-01/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-01/index.html'), 'utf8')
  };
}

export function validateWave01(context = loadWave01Context()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { wave, sources, review, hypothesis, fanout, sourceRegistry, schema, manifest, buildManifest, buildReport, publicReport, html } = context;

  eq(wave.schema_version, 'status-sovereignty-wave@1', 'Wave 01 schema');
  eq(wave.hypothesis_id, 'SSC-H01', 'Wave 01 hypothesis');
  eq(wave.wave_id, 'SSC-W01', 'Wave 01 identity');
  eq(wave.status, 'executed_maintainer_reviewed_zero_complete_compact', 'Wave 01 status');
  eq(wave.selection_contract?.target_first_selection, false, 'Wave 01 target-first selection boundary');
  eq(wave.selection_contract?.supportive_contradictory_ordinary_and_null_results_retained, true, 'Wave 01 result-retention law');
  eq(wave.source_receipts_path, 'data/research/status-sovereignty-wave-01-source-receipts.json', 'Wave 01 source receipt path');

  const expectedLanes = ['SSC-F05','SSC-F06','SSC-F07','SSC-F09','SSC-F10','SSC-F11','SSC-F14','SSC-F16'];
  const expectedLaneCounts = { 'SSC-F05': 1, 'SSC-F06': 3, 'SSC-F07': 1, 'SSC-F09': 1, 'SSC-F10': 2, 'SSC-F11': 1, 'SSC-F14': 1, 'SSC-F16': 4 };
  const expectedDispositionCounts = {
    capital_conversion_unsupported: 1,
    ordinary_patriotic_or_industrial_policy: 4,
    partial_functional_convergence: 6,
    requires_additional_acquisition: 3
  };
  eq(JSON.stringify(wave.executed_lane_ids), JSON.stringify(expectedLanes), 'Wave 01 executed-lane denominator');
  eq(JSON.stringify(canonicalObject(wave.lane_counts)), JSON.stringify(canonicalObject(expectedLaneCounts)), 'Wave 01 lane denominator');
  eq(JSON.stringify(canonicalObject(wave.disposition_counts)), JSON.stringify(canonicalObject(expectedDispositionCounts)), 'Wave 01 disposition denominator');

  const fixedCounts = {
    source_records: 15,
    observations: 14,
    executed_lanes: 8,
    terminal_records: 14,
    maintainer_reviewed: 14,
    second_party_reviewed: 0,
    adjudicated: 0,
    supported_bounded_compact: 0,
    partial_functional_convergence: 6,
    heterogeneous_coalition_limited_overlap: 0,
    ordinary_patriotic_or_industrial_policy: 4,
    racial_hierarchy_unsupported: 0,
    capital_conversion_unsupported: 1,
    bounded_non_link: 0,
    falsified: 0,
    source_restricted: 0,
    source_unavailable: 0,
    requires_additional_acquisition: 3,
    prevalence_findings: 0,
    racial_order_findings: 0,
    coordination_findings: 0,
    common_purpose_findings: 0,
    personal_hostility_findings: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(wave.counts?.[key], value, `Wave 01 count ${key}`);

  eq(wave.current_result?.execution_started, true, 'Wave 01 execution state');
  eq(wave.current_result?.observations_retained, 14, 'Wave 01 retained count');
  eq(wave.current_result?.complete_compact_findings, 0, 'Wave 01 complete compact count');
  eq(wave.current_result?.maintainer_review_complete, true, 'Wave 01 maintainer review state');
  eq(wave.current_result?.second_party_review_complete, false, 'Wave 01 second-party review state');
  eq(wave.current_result?.adjudication_complete, false, 'Wave 01 adjudication state');
  eq(wave.current_result?.review_complete, false, 'Wave 01 complete review state');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) {
    eq(wave.current_result?.[key], false, `Wave 01 ${key}`);
  }
  eq(wave.current_result?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'Wave 01 publication status');
  eq(wave.current_result?.graph_effect, 'none', 'Wave 01 graph effect');
  for (const [key, value] of Object.entries(wave.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Wave 01 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `Wave 01 boundary ${key}`);
  }

  eq(sources.schema_version, 'status-sovereignty-wave-source-receipts@1', 'Wave 01 source schema');
  eq(sources.hypothesis_id, 'SSC-H01', 'Wave 01 source hypothesis');
  eq(sources.wave_id, 'SSC-W01', 'Wave 01 source wave');
  eq(sources.records?.length, 15, 'Wave 01 source record count');
  eq(sources.counts?.records, 15, 'Wave 01 source count total');
  eq(sources.counts?.official_primary_or_program_records, 13, 'Wave 01 official source count');
  eq(sources.counts?.first_party_records, 2, 'Wave 01 first-party count');
  eq(sources.counts?.independently_reviewed, 15, 'Wave 01 reviewed source count');
  eq(sources.counts?.source_bytes_preserved, 0, 'Wave 01 byte-custody count');
  eq(sources.source_plane?.selection_by_expected_conclusion, false, 'Wave 01 source selection law');
  eq(sources.source_plane?.source_bytes_preserved, false, 'Wave 01 source-byte state');
  eq(sources.source_plane?.normalized_fact_records_preserved, true, 'Wave 01 normalized-fact state');
  eq(sources.boundaries?.normalized_fact_record_is_source_bytes, false, 'Wave 01 normalized-fact authority boundary');
  eq(sources.boundaries?.source_presence_proves_observation, false, 'Wave 01 source-presence boundary');
  eq(sources.boundaries?.first_party_statement_is_independent_validation, false, 'Wave 01 first-party authority boundary');
  eq(sources.boundaries?.official_policy_statement_proves_policy_effect, false, 'Wave 01 policy-effect boundary');
  eq(sources.boundaries?.graph_effect, 'none', 'Wave 01 source graph effect');

  const sourceIds = sources.records.map((row) => row.source_id);
  check(unique(sourceIds), 'Wave 01 source IDs duplicate');
  eq(JSON.stringify(sourceIds), JSON.stringify(Array.from({ length: 15 }, (_, i) => `SSC-W01-S${String(i + 1).padStart(3, '0')}`)), 'Wave 01 source ID order');
  for (const source of sources.records) {
    check(source.url?.startsWith('https://'), `${source.source_id}: source URL invalid`);
    eq(source.retrieval?.status, 'independently_reviewed', `${source.source_id}: retrieval status`);
    eq(source.retrieval?.source_bytes_preserved, false, `${source.source_id}: source-byte state`);
    const normalized = `${(source.normalized_fact_record ?? []).join('\n')}\n`;
    eq(source.retrieval?.normalized_fact_record_sha256, sha256(normalized), `${source.source_id}: normalized fact digest`);
    check((source.normalized_fact_record ?? []).length >= 2, `${source.source_id}: normalized facts incomplete`);
    check((source.used_by_observation_ids ?? []).length >= 1, `${source.source_id}: observation usage missing`);
    check((source.limitations ?? []).length >= 2, `${source.source_id}: limitations missing`);
  }

  eq(wave.observations?.length, 14, 'Wave 01 observation count');
  const observationIds = wave.observations.map((row) => row.observation_id);
  check(unique(observationIds), 'Wave 01 observation IDs duplicate');
  eq(JSON.stringify(observationIds), JSON.stringify(Array.from({ length: 14 }, (_, i) => `SSC-OBS-${String(i + 1).padStart(4, '0')}`)), 'Wave 01 observation ID order');
  const schemaProperties = new Set(Object.keys(schema.properties ?? {}));
  const allowedDispositions = new Set(schema.properties?.disposition?.enum ?? []);
  const sourceById = new Map(sources.records.map((row) => [row.source_id, row]));
  const observedSourceUsage = new Map(sourceIds.map((id) => [id, []]));
  const laneCounts = {};
  const dispositionCounts = {};
  for (const observation of wave.observations) {
    for (const field of schema.required ?? []) check(Object.hasOwn(observation, field), `${observation.observation_id}: missing required field ${field}`);
    for (const field of Object.keys(observation)) check(schemaProperties.has(field), `${observation.observation_id}: undeclared field ${field}`);
    check(/^SSC-OBS-[0-9]{4,}$/.test(observation.observation_id), `${observation.observation_id}: invalid observation identity`);
    check(/^SSC-F(0[1-9]|1[0-6])$/.test(observation.lane_id), `${observation.observation_id}: invalid lane`);
    check(expectedLanes.includes(observation.lane_id), `${observation.observation_id}: lane outside Wave 01 denominator`);
    check(observation.time_window && Object.hasOwn(observation.time_window, 'start') && Object.hasOwn(observation.time_window, 'end'), `${observation.observation_id}: time window incomplete`);
    check(typeof observation.protected_center === 'string' && observation.protected_center.length > 0, `${observation.observation_id}: protected center missing`);
    check(typeof observation.affected_population_or_institution === 'string' && observation.affected_population_or_institution.length > 0, `${observation.observation_id}: affected population missing`);
    check(observation.option_universe && typeof observation.option_universe === 'object' && !Array.isArray(observation.option_universe), `${observation.observation_id}: option universe invalid`);
    check(Array.isArray(observation.observed_facts) && observation.observed_facts.length >= 2, `${observation.observation_id}: observed facts incomplete`);
    check(Array.isArray(observation.alternative_explanations) && observation.alternative_explanations.length >= 2, `${observation.observation_id}: alternative explanations incomplete`);
    check(Array.isArray(observation.counterevidence) && observation.counterevidence.length >= 1, `${observation.observation_id}: counterevidence missing`);
    check(Array.isArray(observation.source_ids) && observation.source_ids.length >= 1, `${observation.observation_id}: source IDs missing`);
    check(allowedDispositions.has(observation.disposition), `${observation.observation_id}: disposition invalid`);
    eq(observation.review_state, 'maintainer_reviewed', `${observation.observation_id}: review state`);
    eq(observation.graph_effect, 'none', `${observation.observation_id}: graph effect`);
    check(observation.disposition !== 'supported_bounded_compact', `${observation.observation_id}: complete compact self-awarded`);
    for (const sourceId of observation.source_ids) {
      check(sourceById.has(sourceId), `${observation.observation_id}: missing source ${sourceId}`);
      if (observedSourceUsage.has(sourceId)) observedSourceUsage.get(sourceId).push(observation.observation_id);
    }
    laneCounts[observation.lane_id] = (laneCounts[observation.lane_id] ?? 0) + 1;
    dispositionCounts[observation.disposition] = (dispositionCounts[observation.disposition] ?? 0) + 1;
  }
  eq(JSON.stringify(canonicalObject(laneCounts)), JSON.stringify(canonicalObject(expectedLaneCounts)), 'observed lane denominator drift');
  eq(JSON.stringify(canonicalObject(dispositionCounts)), JSON.stringify(canonicalObject(expectedDispositionCounts)), 'observed disposition denominator drift');
  for (const source of sources.records) {
    const expectedUsage = [...source.used_by_observation_ids].sort();
    const observedUsage = [...(observedSourceUsage.get(source.source_id) ?? [])].sort();
    eq(JSON.stringify(observedUsage), JSON.stringify(expectedUsage), `${source.source_id}: observation usage drift`);
  }

  eq(hypothesis.status, 'canonical_field_hypothesis_two_waves_maintainer_reviewed_open_no_prevalence_finding', 'Wave 01 parent hypothesis status');
  eq(hypothesis.current_state?.query_or_field_execution_started, true, 'Wave 01 parent execution state');
  eq(hypothesis.current_state?.waves_executed, 2, 'Wave 01 parent wave count');
  eq(hypothesis.current_state?.executed_lanes, 16, 'Wave 01 parent executed-lane count');
  eq(hypothesis.current_state?.observations_retained, 22, 'Wave 01 parent retained count');
  eq(hypothesis.current_state?.terminal_observations, 22, 'Wave 01 parent terminal count');
  eq(hypothesis.current_state?.complete_compact_findings, 0, 'Wave 01 parent complete compact count');
  eq(hypothesis.current_state?.maintainer_reviewed_observations, 22, 'Wave 01 parent maintainer review count');
  eq(hypothesis.current_state?.second_party_reviewed_observations, 0, 'Wave 01 parent second-party review count');
  eq(hypothesis.current_state?.adjudicated_observations, 0, 'Wave 01 parent adjudication count');
  for (const key of ['prevalence_finding_generated','racial_order_finding_generated','coordination_finding_generated','common_purpose_finding_generated','personal_hostility_finding_generated']) {
    eq(hypothesis.current_state?.[key], false, `Wave 01 parent ${key}`);
  }
  eq(hypothesis.current_state?.publication_status, 'blocked_pending_second_party_review_and_still_open_denominators', 'Wave 01 parent publication state');
  eq(hypothesis.current_state?.graph_effect, 'none', 'Wave 01 parent graph effect');
  eq(hypothesis.field_waves?.length, 2, 'Wave 01 parent wave registry count');
  eq(hypothesis.field_waves?.[0]?.wave_id, 'SSC-W01', 'Wave 01 parent wave registry identity');
  eq(hypothesis.field_waves?.[1]?.wave_id, 'SSC-W02', 'Wave 02 successor wave registry identity');

  eq(fanout.status, 'canonical_fanout_two_waves_maintainer_reviewed', 'Wave 01 fanout status');
  eq(fanout.counts?.query_or_field_execution_started, true, 'Wave 01 fanout execution state');
  eq(fanout.counts?.waves_executed, 2, 'Wave 01 fanout wave count');
  eq(fanout.counts?.executed_lanes, 16, 'Wave 01 fanout executed count');
  eq(fanout.counts?.records_observed, 22, 'Wave 01 fanout observed count');
  eq(fanout.counts?.records_retained, 22, 'Wave 01 fanout retained count');
  eq(fanout.counts?.terminal_records, 22, 'Wave 01 fanout terminal count');
  eq(fanout.waves?.length, 2, 'Wave 01 fanout wave registry count');
  const wave02LaneCounts = { 'SSC-F01':1, 'SSC-F02':1, 'SSC-F03':1, 'SSC-F04':1, 'SSC-F08':1, 'SSC-F12':1, 'SSC-F13':1, 'SSC-F15':1 };
  for (const lane of fanout.lanes) {
    const expected = (expectedLaneCounts[lane.lane_id] ?? 0) + (wave02LaneCounts[lane.lane_id] ?? 0);
    eq(lane.execution?.started, expected > 0, `${lane.lane_id}: execution state`);
    eq(lane.execution?.records_observed, expected, `${lane.lane_id}: observed count`);
    eq(lane.execution?.records_retained, expected, `${lane.lane_id}: retained count`);
    eq(lane.execution?.terminal_records, expected, `${lane.lane_id}: terminal count`);
    eq(lane.graph_effect, 'none', `${lane.lane_id}: graph effect`);
  }

  eq(sourceRegistry.field_source_receipts?.length, 2, 'Wave 01 source-registry field receipt count');
  const wave01Receipt = sourceRegistry.field_source_receipts?.find((row) => row.wave_id === 'SSC-W01');
  eq(wave01Receipt?.records, 15, 'Wave 01 source-registry wave identity');
  eq(sourceRegistry.counts?.field_source_records, 29, 'Wave 01 source-registry field source count');
  eq(sourceRegistry.counts?.independently_reviewed_field_sources, 26, 'Wave 01 source-registry reviewed count');
  eq(sourceRegistry.counts?.field_source_bytes_preserved, 0, 'Wave 01 source-registry byte count');
  eq(sourceRegistry.boundaries?.normalized_fact_records_equal_source_bytes, false, 'Wave 01 normalized-fact boundary');
  eq(sourceRegistry.boundaries?.field_source_review_is_maintainer_review, false, 'Wave 01 review-authority boundary');

  eq(review.review_id, 'SSC-W01-MR01', 'Wave 01 maintainer review identity');
  eq(review.counts?.maintainer_reviewed, 14, 'Wave 01 maintainer review denominator');
  eq(review.counts?.second_party_reviewed, 0, 'Wave 01 second-party review denominator');
  eq(review.counts?.adjudicated, 0, 'Wave 01 adjudication denominator');
  eq(review.counts?.supported_bounded_compact, 0, 'Wave 01 reviewed complete compact denominator');
  eq(review.current_result?.publication_status, 'blocked_pending_second_party_review_and_open_acquisitions', 'Wave 01 reviewed publication state');
  eq(review.current_result?.graph_effect, 'none', 'Wave 01 reviewed graph effect');
  eq(review.reviewed_observations?.length, 14, 'Wave 01 review row count');
  eq(JSON.stringify(review.reviewed_observations?.map((row) => row.observation_id)), JSON.stringify(observationIds), 'Wave 01 review row identity order');
  check(review.reviewed_observations?.every((row, index) => row.review_state === 'maintainer_reviewed' && row.disposition_changed === false && row.reviewed_disposition === wave.observations[index]?.disposition && row.graph_effect === 'none'), 'Wave 01 review row authority drift');

  eq(manifest.combined_sha256, '7c631c5dc84a2127146aac5fabaace9bb56d35b8caeee2b7872db25f37cad470', 'Wave 01 exact-byte manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Wave 01 build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Wave 01 build/public report drift');
  eq(publicReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Wave 01 report release digest');
  eq(publicReport.counts?.source_records, 15, 'Wave 01 report source count');
  eq(publicReport.counts?.observations, 14, 'Wave 01 report observation count');
  eq(publicReport.counts?.executed_lanes, 8, 'Wave 01 report lane count');
  eq(publicReport.counts?.supported_bounded_compact, 0, 'Wave 01 report complete compact count');
  check(html.includes('EXECUTED · MAINTAINER REVIEWED 14/14 · SECOND-PARTY REVIEW 0 · COMPLETE-COMPACT FINDINGS 0 · RACIAL-ORDER FINDING FALSE · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'Wave 01 report boundary banner missing');
  check(html.includes(manifest.combined_sha256) && html.includes('Declared source universe') && html.includes('Observation packets'), 'Wave 01 report content drift');
  return errors;
}

function main() {
  const errors = validateWave01();
  if (errors.length) {
    console.error(`validate-status-sovereignty-wave-01: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-wave-01: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
