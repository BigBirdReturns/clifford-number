#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateA08Core } from '../tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd04-internal-adjudication-a08/core.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(core));
const set = (target, pathParts, value) => {
  let cursor = target;
  for (const key of pathParts.slice(0, -1)) cursor = cursor[key];
  cursor[pathParts.at(-1)] = value;
};
const mutation = (name, pathParts, value) => ({ name, apply: (target) => set(target, pathParts, value) });
const mutations = [
  mutation('schema', ['schema_version'], 'ssc-rd04-a08-core@0'),
  mutation('hypothesis', ['hypothesis_id'], 'OTHER'),
  mutation('lane', ['lane_id'], 'SSC-RD99'),
  mutation('execution', ['execution_id'], 'SSC-RD04-A08-OTHER'),
  mutation('issue', ['issue'], 0),
  mutation('as_of', ['as_of'], '2026-08-03'),
  mutation('status', ['status'], 'pass'),
  mutation('parent execution', ['parent', 'execution_id'], 'OTHER'),
  mutation('parent merge', ['parent', 'canonical_merge'], '0'.repeat(40)),
  mutation('parent product', ['parent', 'product_commit'], '0'.repeat(40)),
  mutation('parent release', ['parent', 'release_sha256'], '0'.repeat(64)),
  mutation('parent D1', ['parent', 'D1_shns'], 6291),
  mutation('parent documents', ['parent', 'same_shn_documents'], 1432),
  mutation('parent attempted', ['parent', 'official_attempted_urls'], 346),
  mutation('parent unresolved', ['parent', 'official_unresolved_urls'], 0),
  mutation('adjudication run', ['execution_receipts', 'internal_adjudication', 'workflow_run'], 1),
  mutation('adjudication artifact', ['execution_receipts', 'internal_adjudication', 'artifact_id'], 1),
  mutation('adjudication zip', ['execution_receipts', 'internal_adjudication', 'artifact_zip_sha256'], '0'.repeat(64)),
  mutation('adjudication pass ref', ['execution_receipts', 'internal_adjudication', 'pass_ref_commit'], '0'.repeat(40)),
  mutation('adjudication program blob', ['execution_receipts', 'internal_adjudication', 'original_program_blob_sha1'], '0'.repeat(40)),
  mutation('refresh run', ['execution_receipts', 'bounded_public_refresh', 'workflow_run'], 1),
  mutation('refresh artifact', ['execution_receipts', 'bounded_public_refresh', 'artifact_id'], 1),
  mutation('refresh zip', ['execution_receipts', 'bounded_public_refresh', 'artifact_zip_sha256'], '0'.repeat(64)),
  mutation('refresh pass ref', ['execution_receipts', 'bounded_public_refresh', 'pass_ref_commit'], '0'.repeat(40)),
  mutation('candidate denominator', ['denominator_contract', 'machine_candidate_denominator'], 1),
  mutation('frozen refresh URLs', ['denominator_contract', 'frozen_refresh_urls'], 0),
  mutation('attempt limit', ['denominator_contract', 'bounded_attempt_limit'], 2),
  mutation('human dependency', ['denominator_contract', 'outside_human_dependency'], true),
  mutation('project blocking', ['denominator_contract', 'project_blocking'], true),
  mutation('same SHN count', ['counts', 'same_shn_decision_candidates'], 1),
  mutation('official page count', ['counts', 'official_page_candidates'], 1),
  mutation('total candidates', ['counts', 'total_machine_candidates'], 1),
  mutation('adjudicated count', ['counts', 'adjudicated_candidates'], 1),
  mutation('supported implementation', ['counts', 'internally_supported_public_completed_action_receipts'], 1),
  mutation('supported restoration', ['counts', 'internally_supported_public_restoration_receipts'], 1),
  mutation('rejected candidates', ['counts', 'rejected_or_unresolved_candidates'], 1),
  mutation('negative controls', ['counts', 'negative_controls'], 4),
  mutation('negative failures', ['counts', 'negative_control_failures'], 1),
  mutation('source failures', ['counts', 'source_or_structure_failures'], 1),
  mutation('refresh attempts', ['counts', 'refresh_attempts'], 2),
  mutation('refresh resolved', ['counts', 'refresh_resolved_urls'], 1),
  mutation('refresh unresolved', ['counts', 'refresh_unresolved_urls'], 0),
  mutation('external contacts', ['counts', 'external_contacts'], 1),
  mutation('external reviews', ['counts', 'external_reviews'], 1),
  mutation('graph effects', ['counts', 'graph_effects'], 1),
  mutation('terminal state', ['current_result', 'terminal_state'], 'other'),
  mutation('adjudication incomplete', ['current_result', 'internal_adjudication_complete'], false),
  mutation('refresh incomplete', ['current_result', 'public_source_refresh_complete'], false),
  mutation('implementation supported', ['current_result', 'verified_implementation_supported'], true),
  mutation('missing public noncompliance', ['current_result', 'missing_public_material_is_noncompliance'], true),
  mutation('next human dependency', ['next_handoff', 'outside_human_dependency'], true),
  mutation('external review boundary', ['boundaries', 'result_is_external_review'], true)
];
if (mutations.length !== 52) throw new Error(`mutation denominator ${mutations.length}`);
validateA08Core(core);
let rejected = 0;
for (const item of mutations) {
  const candidate = clone();
  item.apply(candidate);
  try {
    validateA08Core(candidate);
    throw new Error(`mutation survived: ${item.name}`);
  } catch (error) {
    if (String(error.message).startsWith('mutation survived:')) throw error;
    rejected += 1;
  }
}
if (rejected !== mutations.length) throw new Error(`rejected ${rejected}/${mutations.length}`);
console.log(`status-sovereignty-rd04-internal-adjudication-a08.test: ${rejected} adversarial mutations PASS`);
