#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const stableJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digest = value => crypto.createHash('sha256').update(
  Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))
).digest('hex');
const unique = values => [...new Set(values.filter(value => value !== null && value !== undefined))].sort();
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), stableJson(value));
}
function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}
function gitShow(commit, relative) {
  try {
    return execFileSync('git', ['show', `${commit}:${relative}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (error) {
    throw new Error(`cannot read pinned import ${commit}:${relative}: ${error.message}`);
  }
}
function gitShowJson(commit, relative) {
  return JSON.parse(gitShow(commit, relative).toString('utf8'));
}
function graphDigests() {
  return {
    participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}
function sourceRoute(commit, relative, importedBytes) {
  return {
    source_commit: commit,
    source_path: relative,
    source_sha256: digest(importedBytes)
  };
}
function observationProjection(observation) {
  return {
    jurisdiction: observation.jurisdiction ?? null,
    time_window: observation.time_window ?? null,
    protected_center: observation.protected_center ?? null,
    affected_population_or_institution: observation.affected_population_or_institution ?? null,
    status_order_claim: observation.status_order_claim ?? null,
    patriotic_or_security_frame: observation.patriotic_or_security_frame ?? null,
    qualified_knower_or_evidence: observation.qualified_knower_or_evidence ?? null,
    epistemic_reclassification: observation.epistemic_reclassification ?? null,
    counterpower_function: observation.counterpower_function ?? null,
    counterpower_action: observation.counterpower_action ?? null,
    selector: observation.selector ?? null,
    option_universe: observation.option_universe ?? null,
    public_conversion_instrument: observation.public_conversion_instrument ?? null,
    public_contribution: observation.public_contribution ?? null,
    private_capacity_or_right: observation.private_capacity_or_right ?? null,
    conditional_incorporation: observation.conditional_incorporation ?? null,
    counterfactual_foreclosure: observation.counterfactual_foreclosure ?? null,
    material_consequence: observation.material_consequence ?? null,
    correction_substitution_exit: observation.correction_substitution_exit ?? null,
    observed_facts: observation.observed_facts ?? [],
    working_interpretation: observation.working_interpretation ?? null,
    alternative_explanations: observation.alternative_explanations ?? [],
    counterevidence: observation.counterevidence ?? [],
    source_refs: observation.source_ids ?? []
  };
}
function routeRecordId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(2, '0')}`;
}

const policy = readJson('data/project/lake-allocator-war-wave-21-policy.json');
assert(policy.schema_version === 'lake-allocator-war-wave-21-policy@1', 'unexpected Wave 21 policy schema');
assert(policy.base_checkpoint.commit === 'a09cf6a000947ed9847e6585d65dd36db764013a', 'Wave 21 base checkpoint drifted');
try {
  execFileSync('git', ['merge-base', '--is-ancestor', policy.base_checkpoint.commit, 'HEAD'], { cwd: root, stdio: 'ignore' });
} catch {
  throw new Error(`HEAD does not descend from sealed Wave 20 ${policy.base_checkpoint.commit}`);
}

const importMap = new Map(policy.imports.map(row => [row.import_key, row]));
const wave1Import = importMap.get('allocator-war-wave-01-canonical');
const wave2Import = importMap.get('status-sovereignty-wave-02-intake');
assert(wave1Import && wave2Import, 'required import contract missing');

const importBytes = new Map();
const importDigests = [];
for (const contract of policy.imports) {
  for (const relative of contract.paths) {
    const bytes = gitShow(contract.commit, relative);
    importBytes.set(`${contract.commit}:${relative}`, bytes);
    importDigests.push({
      import_key: contract.import_key,
      source_commit: contract.commit,
      source_path: relative,
      source_sha256: digest(bytes),
      source_bytes: bytes.length,
      authority: contract.authority
    });
  }
}
importDigests.sort((a, b) => `${a.import_key}:${a.source_path}`.localeCompare(`${b.import_key}:${b.source_path}`));

const awWaterlinePath = 'data/project/allocator-war-findings-waterline.json';
const awRoutesPath = 'data/project/allocator-war-estate-feed-registry.json';
const awLakePath = 'data/project/allocator-war-lake-intake.json';
const wave1Path = 'data/research/status-sovereignty-wave-01.json';
const wave1ReviewPath = 'data/research/status-sovereignty-wave-01-maintainer-review.json';
const wave1TargetedPath = 'data/research/status-sovereignty-wave-01-targeted-acquisition.json';
const wave2Path = 'data/intake/status-sovereignty-wave-02-candidate-observations.json';
const wave2DenominatorPath = 'data/intake/status-sovereignty-wave-02-source-denominator.json';

const awWaterline = gitShowJson(wave1Import.commit, awWaterlinePath);
const awRoutes = gitShowJson(wave1Import.commit, awRoutesPath);
const awLake = gitShowJson(wave1Import.commit, awLakePath);
const wave1 = gitShowJson(wave1Import.commit, wave1Path);
const wave1Review = gitShowJson(wave1Import.commit, wave1ReviewPath);
const wave1Targeted = gitShowJson(wave1Import.commit, wave1TargetedPath);
const wave2 = gitShowJson(wave2Import.commit, wave2Path);
const wave2Denominator = gitShowJson(wave2Import.commit, wave2DenominatorPath);

assert(awWaterline.waterline_id === 'AW-WL-01', 'Wave 01 allocator waterline drifted');
assert(awRoutes.registry_id === 'AW-ROUTE-01', 'Wave 01 allocator route registry drifted');
assert(awLake.intake_id === 'AW-LAKE-01', 'Wave 01 allocator lake intake drifted');
assert(wave1.wave_id === 'SSC-W01', 'Wave 01 source wave drifted');
assert(wave1Review.review_id === 'SSC-W01-MR01', 'Wave 01 review drifted');
assert(wave1Targeted.acquisition_id === 'SSC-W01-TA01', 'Wave 01 targeted acquisition drifted');
assert(wave2.wave_id === 'SSC-W02', 'Wave 02 intake wave drifted');
assert(wave2Denominator.wave_id === 'SSC-W02', 'Wave 02 source denominator drifted');

const expected = policy.expected_counts;
assert(wave1.counts.source_records === expected.wave_01_source_records, 'Wave 01 source count drifted');
assert(wave1.observations.length === expected.wave_01_reviewed_observations, 'Wave 01 observation denominator drifted');
assert(wave1Review.counts.maintainer_reviewed === expected.wave_01_reviewed_observations, 'Wave 01 reviewed denominator drifted');
assert(awWaterline.finding_classes.length === expected.wave_01_finding_classes, 'Wave 01 finding-class denominator drifted');
assert(wave2.counts.source_records === expected.wave_02_source_records, 'Wave 02 source count drifted');
assert(wave2.observations.length === expected.wave_02_unreviewed_observations, 'Wave 02 observation denominator drifted');
assert(wave2.observations.every(row => row.review_state === 'unreviewed'), 'Wave 02 contains reviewed state');

const classByObservation = new Map();
for (const findingClass of awWaterline.finding_classes) {
  for (const observationRef of findingClass.observation_ids) {
    assert(!classByObservation.has(observationRef), `${observationRef}: assigned to multiple Wave 01 finding classes`);
    classByObservation.set(observationRef, findingClass);
  }
}
assert(classByObservation.size === expected.wave_01_reviewed_observations, 'Wave 01 class assignment is incomplete');

const reviewByObservation = new Map(wave1Review.reviewed_observations.map(row => [row.observation_id, row]));
const targetedByObservation = new Map((wave1Targeted.obligations ?? []).map(row => [row.observation_id, row]));
const observationRows = [];

for (const [index, observation] of wave1.observations.entries()) {
  const findingClass = classByObservation.get(observation.observation_id);
  const review = reviewByObservation.get(observation.observation_id);
  assert(findingClass, `${observation.observation_id}: finding class missing`);
  assert(review?.review_state === 'maintainer_reviewed', `${observation.observation_id}: maintainer review missing`);
  observationRows.push({
    schema_version: 'lake-allocator-war-observation-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_record_id: `LAW21-OBS-${String(index + 1).padStart(3, '0')}`,
    source_observation_ref: observation.observation_id,
    source_wave_key: 'SSC-W01',
    source_lane_key: observation.lane_id,
    authority_state: 'maintainer_reviewed_below_second_party_review',
    review_state: 'maintainer_reviewed',
    source_disposition: review.reviewed_disposition,
    source_finding_ref: findingClass.finding_id,
    source_finding_classification: findingClass.classification,
    source_review_outcome: review.review_outcome,
    complete_compact_supported: review.complete_compact_supported,
    four_gate_assessment: review.four_gate_assessment,
    targeted_acquisition_state: targetedByObservation.get(observation.observation_id)?.status ?? null,
    evidence_ceiling: findingClass.evidence_ceiling ?? review.review_finding,
    next_required_records: unique([
      ...(findingClass.next_required_records ?? []),
      ...(targetedByObservation.get(observation.observation_id)?.remaining_absences ?? [])
    ]),
    ...observationProjection(observation),
    source_route: sourceRoute(
      wave1Import.commit,
      wave1Path,
      importBytes.get(`${wave1Import.commit}:${wave1Path}`)
    ),
    review_route: sourceRoute(
      wave1Import.commit,
      wave1ReviewPath,
      importBytes.get(`${wave1Import.commit}:${wave1ReviewPath}`)
    ),
    graph_effect: 'none'
  });
}

for (const [index, observation] of wave2.observations.entries()) {
  const route = policy.wave_02_lane_routes[observation.lane_id];
  assert(route, `${observation.observation_id}: Wave 02 lane route missing`);
  observationRows.push({
    schema_version: 'lake-allocator-war-observation-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_record_id: `LAW21-OBS-${String(expected.wave_01_reviewed_observations + index + 1).padStart(3, '0')}`,
    source_observation_ref: observation.observation_id,
    source_wave_key: 'SSC-W02',
    source_lane_key: observation.lane_id,
    authority_state: 'unreviewed_intake_only',
    review_state: 'unreviewed',
    source_disposition: observation.disposition,
    source_finding_ref: null,
    source_finding_classification: 'unreviewed_candidate_frontier',
    source_review_outcome: 'not_reviewed',
    complete_compact_supported: false,
    four_gate_assessment: [],
    targeted_acquisition_state: observation.disposition === 'requires_additional_acquisition'
      ? 'intake_acquisition_required'
      : null,
    evidence_ceiling: 'Wave 02 intake classification only; no reviewed finding, route promotion, graph effect, or publication authority.',
    next_required_records: route.acquisition,
    routed_estate_keys: route.estates,
    routed_program_keys: route.programs,
    control_class: route.control ?? null,
    ...observationProjection(observation),
    source_route: sourceRoute(
      wave2Import.commit,
      wave2Path,
      importBytes.get(`${wave2Import.commit}:${wave2Path}`)
    ),
    review_route: null,
    graph_effect: 'none'
  });
}
observationRows.sort((a, b) => a.source_observation_ref.localeCompare(b.source_observation_ref));
assert(observationRows.length === expected.total_observations, 'combined observation denominator drifted');

const waterlineRows = [];
for (const [index, findingClass] of awWaterline.finding_classes.entries()) {
  waterlineRows.push({
    schema_version: 'lake-allocator-war-waterline-class-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_class_id: `LAW21-CLASS-W1-${String(index + 1).padStart(2, '0')}`,
    source_wave_key: 'SSC-W01',
    source_class_ref: findingClass.finding_id,
    label: findingClass.label,
    authority_state: 'maintainer_reviewed_below_second_party_review',
    classification: findingClass.classification,
    source_observation_refs: [...findingClass.observation_ids].sort(),
    supported_statement: findingClass.supported_statement,
    refused_statement: findingClass.refused_statement ?? null,
    evidence_ceiling: findingClass.evidence_ceiling,
    next_required_records: findingClass.next_required_records ?? [],
    finding_generated: false,
    graph_effect: 'none'
  });
}
for (const [index, observation] of wave2.observations.entries()) {
  waterlineRows.push({
    schema_version: 'lake-allocator-war-waterline-class-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_class_id: `LAW21-FRONTIER-W2-${String(index + 1).padStart(2, '0')}`,
    source_wave_key: 'SSC-W02',
    source_class_ref: null,
    label: `${observation.lane_id} unreviewed intake frontier`,
    authority_state: 'unreviewed_intake_only',
    classification: 'unreviewed_candidate_frontier',
    source_observation_refs: [observation.observation_id],
    supported_statement: null,
    refused_statement: 'Intake classification does not establish a reviewed disposition, complete compact, racial order, prevalence, coordination, common purpose, graph edge, or publication authority.',
    evidence_ceiling: 'acquisition_and_review_routing_only',
    next_required_records: policy.wave_02_lane_routes[observation.lane_id].acquisition,
    finding_generated: false,
    graph_effect: 'none'
  });
}

const existingEstateRoutes = awRoutes.consumer_routes.filter(row => row.consumer_type === 'estate');
const existingProgramRoutes = awRoutes.consumer_routes.filter(row => row.consumer_type === 'program');
assert(existingEstateRoutes.length === expected.wave_01_estate_routes, 'Wave 01 estate route denominator drifted');
assert(existingProgramRoutes.length === expected.wave_01_program_routes, 'Wave 01 program route denominator drifted');

const estateMap = new Map();
for (const route of existingEstateRoutes) {
  estateMap.set(route.consumer_key, {
    consumer_key: route.consumer_key,
    reviewed_source_finding_refs: [...(route.source_finding_ids ?? [])],
    reviewed_source_observation_refs: [...(route.source_observation_ids ?? [])],
    unreviewed_intake_observation_refs: [],
    supplies: [...(route.supplies ?? [])],
    consumer_question: route.consumer_question,
    next_acquisition: [...(route.next_acquisition ?? [])],
    controls_and_refusals_required: true,
    route_authority: 'reviewed_wave_01_routing'
  });
}
for (const observation of wave2.observations) {
  const route = policy.wave_02_lane_routes[observation.lane_id];
  for (const estateKey of route.estates) {
    const target = estateMap.get(estateKey) ?? {
      consumer_key: estateKey,
      reviewed_source_finding_refs: [],
      reviewed_source_observation_refs: [],
      unreviewed_intake_observation_refs: [],
      supplies: [],
      consumer_question: `Acquire the complete allocator, denominator, consequence, and correction chain for ${estateKey}.`,
      next_acquisition: [],
      controls_and_refusals_required: true,
      route_authority: 'unreviewed_wave_02_acquisition_only'
    };
    target.unreviewed_intake_observation_refs.push(observation.observation_id);
    target.supplies.push(`Wave 02 ${observation.lane_id} intake packet as acquisition routing only`);
    target.next_acquisition.push(...route.acquisition);
    if (target.reviewed_source_observation_refs.length) target.route_authority = 'split_reviewed_wave_01_and_unreviewed_wave_02';
    estateMap.set(estateKey, target);
  }
}
const estateRows = [...estateMap.values()]
  .sort((a, b) => a.consumer_key.localeCompare(b.consumer_key))
  .map((row, index) => ({
    schema_version: 'lake-allocator-war-estate-acquisition-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_estate_feed_id: routeRecordId('LAW21-EST', index),
    consumer_type: 'estate',
    consumer_key: row.consumer_key,
    route_authority: row.route_authority,
    reviewed_source_finding_refs: unique(row.reviewed_source_finding_refs),
    reviewed_source_observation_refs: unique(row.reviewed_source_observation_refs),
    unreviewed_intake_observation_refs: unique(row.unreviewed_intake_observation_refs),
    supplies: unique(row.supplies),
    consumer_question: row.consumer_question,
    next_acquisition: unique(row.next_acquisition),
    controls_and_refusals_required: row.controls_and_refusals_required,
    finding_promoted: false,
    graph_effect: 'none'
  }));
assert(estateRows.length === expected.estate_consumers_after, `estate consumer count is ${estateRows.length}`);

const programMap = new Map();
for (const route of existingProgramRoutes) {
  programMap.set(route.consumer_key, {
    consumer_key: route.consumer_key,
    reviewed_source_finding_refs: [...(route.source_finding_ids ?? [])],
    reviewed_source_observation_refs: [...(route.source_observation_ids ?? [])],
    unreviewed_intake_observation_refs: [],
    story_routes: [...(route.story_routes ?? [])],
    supplies: [...(route.supplies ?? [])],
    consumer_question: route.consumer_question,
    next_acquisition: [...(route.next_acquisition ?? [])],
    route_authority: 'reviewed_wave_01_routing'
  });
}
for (const observation of wave2.observations) {
  const route = policy.wave_02_lane_routes[observation.lane_id];
  for (const programKey of route.programs) {
    const target = programMap.get(programKey);
    assert(target, `${programKey}: Wave 02 program consumer absent from canonical Wave 01 route registry`);
    target.unreviewed_intake_observation_refs.push(observation.observation_id);
    target.supplies.push(`Wave 02 ${observation.lane_id} intake packet as graph-inert acquisition routing only`);
    target.next_acquisition.push(...route.acquisition);
    target.route_authority = 'split_reviewed_wave_01_and_unreviewed_wave_02';
  }
}
const programRows = [...programMap.values()]
  .sort((a, b) => a.consumer_key.localeCompare(b.consumer_key))
  .map((row, index) => ({
    schema_version: 'lake-allocator-war-program-feed-wave-21@1',
    program_id: policy.program_id,
    wave_id: policy.wave_id,
    allocator_program_feed_id: routeRecordId('LAW21-PROG', index),
    consumer_type: 'program',
    consumer_key: row.consumer_key,
    route_authority: row.route_authority,
    reviewed_source_finding_refs: unique(row.reviewed_source_finding_refs),
    reviewed_source_observation_refs: unique(row.reviewed_source_observation_refs),
    unreviewed_intake_observation_refs: unique(row.unreviewed_intake_observation_refs),
    story_routes: unique(row.story_routes),
    supplies: unique(row.supplies),
    consumer_question: row.consumer_question,
    next_acquisition: unique(row.next_acquisition),
    authority_transferred: false,
    prevalence_or_recurrence_generated: false,
    graph_effect: 'none'
  }));
assert(programRows.length === expected.program_consumers_after, 'program consumer count drifted');

const sourceRegistryDigests = {
  observation_registry_sha256: digest(observationRows),
  waterline_registry_sha256: digest(waterlineRows),
  estate_registry_sha256: digest(estateRows),
  program_registry_sha256: digest(programRows)
};
const beforeGraphDigests = graphDigests();

const receipt = {
  schema_version: 'lake-allocator-war-wave-21-receipt@1',
  program_id: policy.program_id,
  wave_id: policy.wave_id,
  as_of: policy.as_of,
  status: 'source_materialized_pending_lake_reconciliation',
  base_checkpoint: policy.base_checkpoint,
  import_digests: importDigests,
  projection_contract: policy.projection_contract,
  source_registry_digests: sourceRegistryDigests,
  counts: {
    wave_01_reviewed_observations: expected.wave_01_reviewed_observations,
    wave_02_unreviewed_observations: expected.wave_02_unreviewed_observations,
    total_observations: observationRows.length,
    reviewed_waterline_classes: expected.wave_01_finding_classes,
    unreviewed_frontier_classes: expected.wave_02_unreviewed_observations,
    estate_consumers: estateRows.length,
    program_consumers: programRows.length,
    complete_compact_findings: 0,
    racial_order_findings: 0,
    prevalence_findings: 0,
    coordination_findings: 0,
    common_purpose_findings: 0,
    graph_effects: 0,
    publication_clearances: 0,
    source_ids_index_observed: 0,
    source_ids_projection_observed: 0,
    source_ids_authoritative_reachable: 0,
    estate_ids_index_observed: 0,
    program_ids_index_observed: 0
  },
  graph_digests: beforeGraphDigests,
  post_execution_reconciliation_complete: false,
  source_projection_index_complete: false,
  source_mutations: 0,
  boundaries: policy.boundaries
};

const projection = {
  schema_version: 'lake-allocator-war-wave-21@1',
  program_id: policy.program_id,
  wave_id: policy.wave_id,
  generated_from: {
    policy_path: 'data/project/lake-allocator-war-wave-21-policy.json',
    observation_registry_path: policy.paths.observation_registry,
    waterline_registry_path: policy.paths.waterline_registry,
    estate_registry_path: policy.paths.estate_registry,
    program_registry_path: policy.paths.program_registry
  },
  imported_authority: {
    wave_01: 'maintainer_reviewed_below_second_party_review',
    wave_02: 'unreviewed_intake_only'
  },
  projection_contract: policy.projection_contract,
  basins: policy.basin_contract.map(row => ({
    basin_id: row.basin_id,
    label: row.label,
    semantic_role: row.semantic_role,
    owner_program_id: row.owner_program_id,
    graph_effect: 'none'
  })),
  observations: observationRows,
  waterline_classes: waterlineRows,
  estate_acquisition_routes: estateRows,
  program_feeds: programRows,
  counts: receipt.counts,
  boundaries: policy.boundaries
};

const report = `# Allocator-war lake integration Wave 21

Wave 21 imports exact canonical source bytes from two separate authority states.

\`\`\`text
Wave 01 reviewed observations:             ${expected.wave_01_reviewed_observations}
Wave 02 unreviewed intake observations:     ${expected.wave_02_unreviewed_observations}
combined observation denominator:          ${observationRows.length}
reviewed waterline classes:                 ${expected.wave_01_finding_classes}
unreviewed frontier classes:                ${expected.wave_02_unreviewed_observations}
estate consumers:                           ${estateRows.length}
program consumers:                          ${programRows.length}

complete compact findings:                  0
racial-order findings:                      0
prevalence findings:                        0
coordination findings:                      0
common-purpose findings:                    0
graph effects:                              0
publication clearances:                     0
\`\`\`

Wave 01 supplies maintainer-reviewed bounded mechanisms, positive controls, open acquisitions, and one refused stronger inference. Wave 02 supplies acquisition routing only. Its eight packets remain unreviewed and cannot promote a finding, graph object, or publication claim.

The estate registry now carries the allocator-war denominator into eleven estates. The program registry keeps six one-way feeds into K0, DCA-H01, M-05 Answerable Power, POOF, Counter-Selector, and the C1 through C7 core-thesis chain. Controls, non-links, refused inferences, and missing denominators travel with supportive observations.

## Fixed boundaries

\`\`\`text
commit-and-path custody != source truth
reviewed routing != second-party review
Wave 02 intake != reviewed finding
estate route != estate conclusion
program feed != prevalence or recurrence
basin membership != common purpose
same observation in two consumers != relationship
graph effect: none
\`\`\`
`;

writeJsonl(policy.paths.observation_registry, observationRows);
writeJsonl(policy.paths.waterline_registry, waterlineRows);
writeJsonl(policy.paths.estate_registry, estateRows);
writeJsonl(policy.paths.program_registry, programRows);
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.projection, projection);
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

console.log('allocator-war Wave 21 source products built');
console.log(`  observations reviewed/intake/total: ${expected.wave_01_reviewed_observations}/${expected.wave_02_unreviewed_observations}/${observationRows.length}`);
console.log(`  waterline reviewed/frontier: ${expected.wave_01_finding_classes}/${expected.wave_02_unreviewed_observations}`);
console.log(`  estate/program consumers: ${estateRows.length}/${programRows.length}`);
console.log('  graph/publication findings: 0/0');
