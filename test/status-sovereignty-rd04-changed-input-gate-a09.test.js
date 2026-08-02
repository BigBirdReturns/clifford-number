#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateA09Core } from '../tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs';
import { classifyChangedInput } from '../tools/acquisition/status-sovereignty-rd04-a09/detect-changed-input.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/status-sovereignty-rd04-changed-input-gate-a09/core.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(core));
const set = (target, parts, value) => { let cursor = target; for (const key of parts.slice(0, -1)) cursor = cursor[key]; cursor[parts.at(-1)] = value; };
const mutation = (name, parts, value) => ({ name, apply: (target) => set(target, parts, value) });
const mutations = [
  mutation('schema', ['schema_version'], 'ssc-rd04-a09-core@0'),
  mutation('hypothesis', ['hypothesis_id'], 'OTHER'),
  mutation('lane', ['lane_id'], 'SSC-RD99'),
  mutation('execution', ['execution_id'], 'OTHER'),
  mutation('issue', ['issue'], 0),
  mutation('as_of', ['as_of'], '2026-08-03'),
  mutation('status', ['status'], 'pass'),
  mutation('parent merge', ['parent','canonical_merge'], '0'.repeat(40)),
  mutation('parent execution', ['parent','execution_id'], 'OTHER'),
  mutation('parent release', ['parent','release_sha256'], '0'.repeat(64)),
  mutation('run', ['execution_receipt','workflow_run'], 1),
  mutation('artifact', ['execution_receipt','artifact_id'], 1),
  mutation('artifact digest', ['execution_receipt','artifact_zip_sha256'], '0'.repeat(64)),
  mutation('pass ref', ['execution_receipt','pass_ref_commit'], '0'.repeat(40)),
  mutation('start main', ['execution_receipt','start_main'], '0'.repeat(40)),
  mutation('end main', ['execution_receipt','end_main'], '1'.repeat(40)),
  mutation('candidate paths', ['denominator_contract','candidate_ledger_paths'], []),
  mutation('empty blob', ['denominator_contract','expected_empty_candidate_blob_sha1'], '0'.repeat(40)),
  mutation('frozen URLs', ['denominator_contract','frozen_public_urls'], []),
  mutation('request limit', ['denominator_contract','request_limit_per_cycle'], 2),
  mutation('schedule', ['denominator_contract','automatic_schedule_installed'], true),
  mutation('human', ['denominator_contract','outside_human_dependency'], true),
  mutation('candidate count', ['counts','candidate_entries'], 1),
  mutation('requests', ['counts','requests'], 2),
  mutation('changed candidates', ['counts','changed_candidate_inputs'], 1),
  mutation('changed source', ['counts','changed_public_sources'], 1),
  mutation('changed total', ['counts','changed_inputs_observed'], 1),
  mutation('contacts', ['counts','external_contacts'], 1),
  mutation('reviews', ['counts','external_reviews'], 1),
  mutation('mutations', ['counts','adversarial_mutations'], 44),
  mutation('terminal', ['current_result','terminal_state'], 'other'),
  mutation('changed result', ['current_result','changed_input_observed'], true),
  mutation('gate missing', ['current_result','reusable_gate_installed'], false),
  mutation('result schedule', ['current_result','automatic_schedule_installed'], true),
  mutation('broader crawl', ['current_result','broader_crawl_authorized'], true),
  mutation('implementation', ['current_result','case_specific_implementation_receipt_supported'], true),
  mutation('gate id', ['standing_gate','gate_id'], 'OTHER'),
  mutation('standing schedule', ['standing_gate','schedule_installed'], true),
  mutation('dishonest zero', ['standing_gate','unchanged_inputs_terminate_honestly'], false),
  mutation('boundary', ['boundaries','missing_public_material_is_noncompliance'], true)
];
if (mutations.length !== 40) throw new Error(`mutation denominator ${mutations.length}`);
validateA09Core(core);
let rejected = 0;
for (const item of mutations) {
  const candidate = clone();
  item.apply(candidate);
  try { validateA09Core(candidate); throw new Error(`mutation survived: ${item.name}`); }
  catch (error) { if (String(error.message).startsWith('mutation survived:')) throw error; rejected += 1; }
}
const unchanged = classifyChangedInput({ candidateInputChanged:false, curlExit:0, httpStatus:500, finalUrl:'https://courts.ca.gov/california-courts-where-balance-restored', bodyBytes:68, bodySha256:'1f883abab1679fe55395f88313619fa1ed2236c6875895ac37cd4a1f11e511ce' });
if (unchanged.terminal_state !== 'no_changed_input_observed') throw new Error('unchanged control');
const bodyChange = classifyChangedInput({ candidateInputChanged:false, curlExit:0, httpStatus:500, finalUrl:'https://courts.ca.gov/california-courts-where-balance-restored', bodyBytes:69, bodySha256:'0'.repeat(64) });
if (bodyChange.terminal_state !== 'public_source_changed_requires_exact_source_adjudication' || bodyChange.case_specific_implementation_receipt_supported) throw new Error('body-change control');
const statusChange = classifyChangedInput({ candidateInputChanged:false, curlExit:0, httpStatus:200, finalUrl:'https://courts.ca.gov/california-courts-where-balance-restored', bodyBytes:68, bodySha256:'1f883abab1679fe55395f88313619fa1ed2236c6875895ac37cd4a1f11e511ce' });
if (statusChange.terminal_state !== 'public_source_changed_requires_exact_source_adjudication') throw new Error('status-change control');
const transport = classifyChangedInput({ candidateInputChanged:false, curlExit:28, httpStatus:0, finalUrl:'', bodyBytes:0, bodySha256:'0'.repeat(64) });
if (transport.terminal_state !== 'source_request_unresolved_without_change_classification') throw new Error('transport control');
const candidateChange = classifyChangedInput({ candidateInputChanged:true, curlExit:0, httpStatus:500, finalUrl:'https://courts.ca.gov/california-courts-where-balance-restored', bodyBytes:68, bodySha256:'1f883abab1679fe55395f88313619fa1ed2236c6875895ac37cd4a1f11e511ce' });
if (candidateChange.terminal_state !== 'candidate_denominator_changed_requires_internal_adjudication') throw new Error('candidate-change control');
console.log(`status-sovereignty-rd04-changed-input-gate-a09.test: ${rejected + 5} adversarial mutations and classifier controls PASS`);
