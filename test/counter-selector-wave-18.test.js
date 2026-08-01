#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-18.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-18-repair-continuation.json'), 'utf8'));
const clone = () => structuredClone(base);
const set = (fn) => { const x = clone(); fn(x); return x; };

const mutations = [
  ['schema drift', (x) => { x.schema_version = 'counter-selector-repair-continuation-audit@2'; }],
  ['program drift', (x) => { x.program_id = 'other'; }],
  ['wave drift', (x) => { x.wave_id = 'CS-W18-X'; }],
  ['date drift', (x) => { x.as_of = '2026-07-31'; }],
  ['status promotion', (x) => { x.status = 'complete_operator_found'; }],
  ['publication promotion', (x) => { x.publication_status = 'public_ranked_profile'; }],
  ['parent sha malformed', (x) => { x.parent_main_sha = 'bad'; }],
  ['parent sha stale', (x) => { x.parent_main_sha = '752ce5caa7cafb4ca9be4803b481ed80a85fd702'; }],
  ['parent release changed', (x) => { x.parent_release_sha256 = '0'.repeat(64); }],
  ['support count inflated', (x) => { x.counts.person_support_updates = 4; }],
  ['inherited count inflated', (x) => { x.counts.inherited_function_support_attributions = 2; }],
  ['new evidence count inflated', (x) => { x.counts.new_evidence_person_supports = 3; }],
  ['identity block resolved', (x) => { x.counts.identity_blocks_resolved = 1; }],
  ['external review claimed', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['contact authorized count', (x) => { x.counts.contacts_authorized = 1; }],
  ['field test eligible count', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['ranking count', (x) => { x.counts.person_rankings = 1; }],
  ['graph count', (x) => { x.counts.graph_effects = 1; }],
  ['remove person', (x) => { x.person_updates.pop(); }],
  ['duplicate trace', (x) => { x.person_updates[1].trace_id = x.person_updates[0].trace_id; }],
  ['McDonald false surplus', (x) => { x.person_updates[0].support_context.support_adjusted_surplus_established = true; }],
  ['McDonald cross-domain promotion', (x) => { x.person_updates[0].unresolved_dimensions = x.person_updates[0].unresolved_dimensions.filter((d) => d !== 'cross_domain_transfer'); x.person_updates[0].supported_dimensions_after_update.push('cross_domain_transfer'); }],
  ['McDonald model elasticity promotion', (x) => { x.person_updates[0].unresolved_dimensions = x.person_updates[0].unresolved_dimensions.filter((d) => d !== 'model_elasticity'); x.person_updates[0].supported_dimensions_after_update.push('model_elasticity'); }],
  ['McDonald custody handoff ceiling removed', (x) => { x.person_updates[0].new_support_assignments[1].ceiling = ''; }],
  ['Rocha adoption promoted', (x) => { x.person_updates[1].new_support_assignments[0].state = 'bounded_support_observed_organizational_adoption'; }],
  ['Rocha source removed', (x) => { x.person_updates[1].new_support_assignments[0].source_ids = []; }],
  ['Boisjoly manufactured custody', (x) => { x.person_updates[2].new_support_assignments.push({dimension:'custody',support_class:'new_evidence_person_support',state:'bounded',basis:'x',ceiling:'y',source_ids:['CS-W18-S001']}); }],
  ['Febles manufactured elasticity', (x) => { x.person_updates[3].new_support_assignments.push({dimension:'model_elasticity',support_class:'new_evidence_person_support',state:'bounded',basis:'x',ceiling:'y',source_ids:['CS-W18-S001']}); }],
  ['operator finding', (x) => { x.person_updates[0].complete_operator_finding = true; }],
  ['field test finding', (x) => { x.person_updates[0].field_test_eligible = true; }],
  ['identity guessed', (x) => { x.identity_block_updates[0].named_person_inferred = true; }],
  ['identity support assigned', (x) => { x.identity_block_updates[1].person_support_assigned = true; }],
  ['visual limit erased', (x) => { x.identity_block_updates[0].acquired_record_state = 'identity_absence_proven'; }],
  ['review identity included', (x) => { x.external_review_exports[0].source_identity_omitted_from_export = false; }],
  ['review inferability denied', (x) => { x.external_review_exports[0].artifact_may_remain_inferable = false; }],
  ['review sent', (x) => { x.external_review_exports[0].export_state = 'sent'; }],
  ['external review executed', (x) => { x.external_review_exports[0].external_review_executed = true; }],
  ['export contact', (x) => { x.external_review_exports[0].contact_authorized = true; }],
  ['export field test', (x) => { x.external_review_exports[0].field_test_authorized = true; }],
  ['lane contact', (x) => { x.acquisition_lanes[0].contact_authorized = true; }],
  ['safe handoff boundary flipped', (x) => { x.boundaries.repair_team_leadership_is_safe_handoff = true; }],
  ['rank boundary flipped', (x) => { x.boundaries.supported_dimension_count_is_rank = true; }]
];

if (mutations.length !== 42) throw new Error(`expected 42 mutations, got ${mutations.length}`);
validateContract(base);
for (const [name, mutate] of mutations) {
  const candidate = set(mutate);
  let rejected = false;
  try { validateContract(candidate); } catch { rejected = true; }
  if (!rejected) throw new Error(`mutation not rejected: ${name}`);
}
console.log(`counter-selector-wave-18.test: ${mutations.length} adversarial mutations refused`);
