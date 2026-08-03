import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validatePreferenceCustodyManifestV34, validatePreferenceCustodyManifestV34Build } from '../tools/lib/preference-custody-manifest-v34.mjs';
import { EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS } from '../tools/lib/preference-population-coverage-turnover-assurance.mjs';

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const run = (script, manifest, jsonPath, markdownPath) => {
  const result = spawnSync(process.execPath, [script, manifest, jsonPath, markdownPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};

const directory = mkdtempSync(join(tmpdir(), 'preference-v34-'));
const baseJson = join(directory, 'v33.json');
const baseMarkdown = join(directory, 'v33.md');
const jsonPath = join(directory, 'v34.json');
const markdownPath = join(directory, 'v34.md');
run('tools/compile-preference-custody-manifest-v33.mjs', 'data/research/preference-custody/control-manifest-v33.json', baseJson, baseMarkdown);
run('tools/compile-preference-custody-manifest-v34.mjs', 'data/research/preference-custody/control-manifest-v34.json', jsonPath, markdownPath);

const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v34.json', 'utf8'));
const base = JSON.parse(readFileSync(baseJson, 'utf8'));
const compiled = JSON.parse(readFileSync(jsonPath, 'utf8'));
const markdown = readFileSync(markdownPath, 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV34(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV34Build(compiled), []);
assert.equal(compiled.control_count, 36);
assert.equal(compiled.composition.base_control_count, 35);
assert.equal(compiled.composition.base_promotion_requirement_count, 1213);
assert.equal(compiled.composition.added_promotion_requirement_count, 64);
assert.equal(compiled.composition.final_promotion_requirement_count, 1277);
assert.deepEqual(compiled.controls.slice(0, 35), base.controls);
assert.deepEqual(compiled.promotion_boundary.real_case_requires.slice(0, 1213), base.promotion_boundary.real_case_requires);
assert.equal(compiled.controls.at(-1).control_id, 'PC-36');
assert.equal(compiled.controls.at(-1).fixture_id, 'same-population-coverage-verified-status-different-operational-states-v1');
assert.deepEqual(Object.fromEntries(Object.keys(EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS).map(key => [key, compiled.controls.at(-1).proof_summary[key]])), EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS);
assert.ok(compiled.open_frontiers.includes('hard_to_enumerate_population_nonresponse_missingness_mechanism_and_external_frame_assurance'));
assert.ok(compiled.open_frontiers.includes('population_entry_exit_migration_merger_split_reactivation_snapshot_alignment_and_turnover_governance'));
assert.ok(compiled.open_frontiers.includes('identity_collision_fragmentation_unit_boundary_duplicate_and_cross_source_linkage_assurance'));
assert.ok(!compiled.open_frontiers.includes('population_frame_coverage_hard_to_enumerate_missingness_and_turnover_governance'));
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.real_world_evidence_state, 'none');

let previous = null;
const seen = new Set();
for (const event of compiled.custody_chain) {
  assert.equal(event.previous_event_sha256, previous);
  for (const id of event.source_event_ids) assert.ok(seen.has(id));
  const unsigned = { ...event };
  delete unsigned.event_sha256;
  assert.equal(event.event_sha256, sha256(unsigned));
  seen.add(event.event_id);
  previous = event.event_sha256;
}
assert.equal(previous, compiled.custody_chain_head_sha256);
assert.match(markdown, /floor v34/);
assert.match(markdown, /PC-36/);
assert.match(markdown, /total_unsupported_population_coverage_decisions: 700/);
assert.doesNotMatch(markdown, /named population failed|actual discrimination|publicly authorized/i);

const manifestMutations = [
  candidate => { candidate.schema_version = 'wrong'; },
  candidate => { candidate.manifest_id = 'wrong'; },
  candidate => { candidate.control_issue = 1; },
  candidate => { candidate.graph_effect = 'asserted'; },
  candidate => { candidate.counts_toward_thesis_evidence = true; },
  candidate => { candidate.base_floor.expected_control_count = 34; },
  candidate => { candidate.extension_control.control_id = 'PC-35'; },
  candidate => { candidate.extension_control.fixture_id = 'wrong'; },
  candidate => { candidate.extension_control.failure_class = 'wrong'; },
  candidate => { candidate.extension_control.expected_build_schema = 'wrong'; },
  candidate => { candidate.extension_control.required_refusal_rules.pop(); },
  candidate => { candidate.identification_requirement.stage = 'wrong'; },
  candidate => { candidate.frontier_transition.resolved_base_frontier = 'wrong'; },
  candidate => { candidate.frontier_transition.successor_frontiers.pop(); },
  candidate => { candidate.real_case_requirements_added.pop(); },
  candidate => { candidate.real_case_requirements_added[0] = 'INVALID VALUE'; },
  candidate => { candidate.prohibited_inferences = []; },
  candidate => { candidate.interpretation_contract.copy_ready_caveat = ''; },
];
for (const [index, mutate] of manifestMutations.entries()) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV34(candidate).length > 0, `manifest mutation ${index + 1}`);
}

const buildMutations = [
  candidate => { candidate.schema_version = 'wrong'; },
  candidate => { candidate.manifest_id = 'wrong'; },
  candidate => { candidate.control_issue = 1; },
  candidate => { candidate.status = 'draft'; },
  candidate => { candidate.graph_effect = 'asserted'; },
  candidate => { candidate.counts_toward_thesis_evidence = true; },
  candidate => { candidate.conclusion_generated = true; },
  candidate => { candidate.real_world_evidence_state = 'evidence'; },
  candidate => { candidate.control_count = 35; },
  candidate => { candidate.controls.pop(); },
  candidate => { candidate.composition.base_control_count = 34; },
  candidate => { candidate.composition.added_promotion_requirement_count = 63; },
  candidate => { candidate.controls.at(-1).proof_summary.total_nonresponse_unit_count = 39; },
  candidate => { candidate.controls.at(-1).proof_summary.binding_public_authority_supported = true; },
  candidate => { candidate.open_frontiers = candidate.open_frontiers.filter(item => item !== 'hard_to_enumerate_population_nonresponse_missingness_mechanism_and_external_frame_assurance'); },
  candidate => { candidate.open_frontiers.push('population_frame_coverage_hard_to_enumerate_missingness_and_turnover_governance'); },
  candidate => { candidate.open_frontiers = candidate.open_frontiers.filter(item => item !== 'identity_collision_fragmentation_unit_boundary_duplicate_and_cross_source_linkage_assurance'); },
  candidate => { candidate.control_integrity.base_floor_qualified = false; },
  candidate => { candidate.promotion_boundary.promotion_requirement_count = 1276; },
  candidate => { candidate.promotion_boundary.laboratory_controls_are_real_world_evidence = true; },
  candidate => { candidate.custody_chain[2].payload.open_frontiers = []; },
  candidate => { candidate.custody_chain_head_sha256 = '0'.repeat(64); },
  candidate => { candidate.interpretation_contract.copy_ready_caveat = ''; },
];
for (const [index, mutate] of buildMutations.entries()) {
  const candidate = structuredClone(compiled);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV34Build(candidate).length > 0, `build mutation ${index + 1}`);
}

console.log(`Preference custody laboratory floor v34 integration tests: PASS (${manifestMutations.length + buildMutations.length} adversarial mutations)`);
