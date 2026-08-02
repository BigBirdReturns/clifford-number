import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validatePreferenceCustodyManifestV31, validatePreferenceCustodyManifestV31Build } from '../tools/lib/preference-custody-manifest-v31.mjs';
import { EXPECTED_ELIGIBILITY_OUTREACH_METRICS } from '../tools/lib/preference-eligibility-outreach-assurance.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const runCompiler = (script, manifest, json, markdown) => {
  const result = spawnSync(process.execPath, [script, manifest, json, markdown], { encoding:'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
const dir = mkdtempSync(join(tmpdir(), 'preference-v31-'));
const baseJson = join(dir, 'v30.json');
const baseMarkdown = join(dir, 'v30.md');
const jsonPath = join(dir, 'v31.json');
const markdownPath = join(dir, 'v31.md');
runCompiler('tools/compile-preference-custody-manifest-v30.mjs','data/research/preference-custody/control-manifest-v30.json',baseJson,baseMarkdown);
runCompiler('tools/compile-preference-custody-manifest-v31.mjs','data/research/preference-custody/control-manifest-v31.json',jsonPath,markdownPath);
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v31.json','utf8'));
const base = JSON.parse(readFileSync(baseJson,'utf8'));
const compiled = JSON.parse(readFileSync(jsonPath,'utf8'));
const markdown = readFileSync(markdownPath,'utf8');
assert.deepEqual(validatePreferenceCustodyManifestV31(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV31Build(compiled), []);
assert.equal(compiled.control_count, 33);
assert.equal(compiled.composition.base_control_count, 32);
assert.equal(compiled.composition.base_promotion_requirement_count, 1021);
assert.equal(compiled.composition.added_promotion_requirement_count, 64);
assert.equal(compiled.composition.final_promotion_requirement_count, 1085);
assert.deepEqual(compiled.controls.slice(0,32), base.controls);
assert.deepEqual(compiled.promotion_boundary.real_case_requires.slice(0,1021), base.promotion_boundary.real_case_requires);
assert.equal(compiled.controls.at(-1).control_id, 'PC-33');
assert.equal(compiled.controls.at(-1).fixture_id, 'same-eligibility-outreach-verified-status-different-operational-states-v1');
assert.deepEqual(Object.fromEntries(Object.keys(EXPECTED_ELIGIBILITY_OUTREACH_METRICS).map(key => [key, compiled.controls.at(-1).proof_summary[key]])), EXPECTED_ELIGIBILITY_OUTREACH_METRICS);
assert.ok(compiled.open_frontiers.includes('source_population_inclusion_exclusion_appeal_and_proxy_rule_governance'));
assert.ok(compiled.open_frontiers.includes('awareness_comprehension_invitation_delivery_reachability_usability_and_assistance_governance'));
assert.ok(compiled.open_frontiers.includes('latent_need_never_attempted_request_intake_identity_documentation_and_logging_governance'));
assert.ok(compiled.open_frontiers.includes('queue_wait_rationing_priority_denial_disposition_and_completion_durability_governance'));
assert.ok(!compiled.open_frontiers.includes('eligibility_source_population_exclusion_awareness_invitation_and_reachability_assurance'));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.custody_chain.length, 5);
let previous = null;
const seen = new Set();
for (const event of compiled.custody_chain) {
  assert.equal(event.previous_event_sha256, previous);
  for (const sourceId of event.source_event_ids) assert.ok(seen.has(sourceId));
  const unsigned = { ...event }; delete unsigned.event_sha256;
  assert.equal(event.event_sha256, sha256(unsigned));
  seen.add(event.event_id);
  previous = event.event_sha256;
}
assert.equal(previous, compiled.custody_chain_head_sha256);
assert.match(markdown, /floor v31/);
assert.match(markdown, /PC-33/);
assert.match(markdown, /total_unsupported_eligibility_outreach_decisions: 700/);
assert.doesNotMatch(markdown, /named population failed|actual discrimination|publicly authorized/i);

const manifestMutations = [
  c=>{c.schema_version='wrong';},
  c=>{c.manifest_id='wrong';},
  c=>{c.control_issue=830;},
  c=>{c.graph_effect='asserted';},
  c=>{c.counts_toward_thesis_evidence=true;},
  c=>{c.base_floor.expected_control_count=31;},
  c=>{c.extension_control.control_id='PC-32';},
  c=>{c.extension_control.fixture_id='wrong';},
  c=>{c.extension_control.failure_class='wrong';},
  c=>{c.extension_control.expected_build_schema='wrong';},
  c=>{c.extension_control.required_refusal_rules.pop();},
  c=>{c.identification_requirement.stage='wrong';},
  c=>{c.frontier_transition.resolved_base_frontier='wrong';},
  c=>{c.frontier_transition.successor_frontiers.pop();},
  c=>{c.real_case_requirements_added.pop();},
  c=>{c.real_case_requirements_added[0]='INVALID VALUE';},
  c=>{c.prohibited_inferences=[];},
  c=>{c.interpretation_contract.copy_ready_caveat='';}
];
for (const [index, mutate] of manifestMutations.entries()) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV31(candidate).length > 0, `manifest mutation ${index + 1}`);
}

const buildMutations = [
  c=>{c.schema_version='wrong';},
  c=>{c.manifest_id='wrong';},
  c=>{c.control_issue=830;},
  c=>{c.status='draft';},
  c=>{c.graph_effect='asserted';},
  c=>{c.counts_toward_thesis_evidence=true;},
  c=>{c.conclusion_generated=true;},
  c=>{c.real_world_evidence_state='evidence';},
  c=>{c.control_count=32;},
  c=>{c.controls.pop();},
  c=>{c.composition.base_control_count=31;},
  c=>{c.composition.added_promotion_requirement_count=63;},
  c=>{c.controls.at(-1).proof_summary.total_unaware_unit_count=39;},
  c=>{c.controls.at(-1).proof_summary.binding_public_authority_supported=true;},
  c=>{c.open_frontiers=c.open_frontiers.filter(item=>item!=='source_population_inclusion_exclusion_appeal_and_proxy_rule_governance');},
  c=>{c.open_frontiers.push('eligibility_source_population_exclusion_awareness_invitation_and_reachability_assurance');},
  c=>{c.open_frontiers=c.open_frontiers.filter(item=>item!=='latent_need_never_attempted_request_intake_identity_documentation_and_logging_governance');},
  c=>{c.control_integrity.base_floor_qualified=false;},
  c=>{c.promotion_boundary.laboratory_controls_are_real_world_evidence=true;},
  c=>{c.custody_chain[2].payload.open_frontiers=[];},
  c=>{c.custody_chain_head_sha256='0'.repeat(64);},
  c=>{c.interpretation_contract.copy_ready_caveat='';}
];
for (const [index, mutate] of buildMutations.entries()) {
  const candidate = structuredClone(compiled);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV31Build(candidate).length > 0, `build mutation ${index + 1}`);
}
console.log(`Preference custody laboratory floor v31 integration tests: PASS (${manifestMutations.length + buildMutations.length} adversarial mutations)`);
