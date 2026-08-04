#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  loadNoMagicHumanGateContext,
  validateNoMagicHumanGate
} from '../tools/validate-no-magic-human-gate.mjs';

const base = loadNoMagicHumanGateContext();
assert.deepEqual(validateNoMagicHumanGate(base), [], 'canonical no-magic-human policy must validate');

const mutations = [
  ['turn stranger recruitment into a dependency', (c) => { c.policy.laws.stranger_recruitment_is_project_dependency = true; }],
  ['allow absence to suspend work', (c) => { c.policy.laws.absence_must_not_suspend_project_work = false; }],
  ['disable machine and maintainer judgment', (c) => { c.policy.laws.machine_and_maintainer_judgment_may_continue = false; }],
  ['make external review a general requirement', (c) => { c.policy.laws.external_review_required_only_to_claim_external_review = false; }],
  ['open outreach by default', (c) => { c.policy.laws.default_outreach_state = 'allowed'; }],
  ['remove bounded judgment from continuing work', (c) => { c.policy.must_continue = c.policy.must_continue.filter((x) => x !== 'bounded judgment and disposition'); }],
  ['remove the user-recruitment prohibition', (c) => { c.policy.forbidden_global_gates = c.policy.forbidden_global_gates.filter((x) => x !== 'requiring a user to recruit a reviewer'); }],
  ['make an external-review hold project-blocking', (c) => { c.policy.claim_specific_holds[0].project_blocking = true; }],
  ['make Issue 571 project-blocking', (c) => { c.policy.known_optional_lanes[0].project_blocking = true; }],
  ['authorize contact through Issue 571', (c) => { c.policy.known_optional_lanes[0].contact_authorized_by_policy = true; }],
  ['permit unsolicited draft creation', (c) => { c.policy.operator_contract.may_create_outreach_drafts_without_explicit_instruction = true; }],
  ['permit unsolicited sending', (c) => { c.policy.operator_contract.may_send_outreach_without_explicit_instruction = true; }],
  ['permit asking the user to find strangers', (c) => { c.policy.operator_contract.may_ask_user_to_find_strangers_as_a_project_gate = true; }],
  ['treat outside participation as permission to reason', (c) => { c.policy.operator_contract.may_treat_external_participation_as_permission_to_reason = true; }],
  ['replace zero-and-proceed with waiting', (c) => { c.policy.operator_contract.on_absence = 'wait for a reviewer'; }],
  ['let the campaign treat participation as permission to reason', (c) => { c.campaign.selection_contract.external_participation_is_permission_to_reason = true; }],
  ['count an invitation as review', (c) => { c.campaign.counting_law.invited = true; }],
  ['count a candidate as review', (c) => { c.campaign.boundaries.candidate_is_review = true; }],
  ['let a review rewrite disposition', (c) => { c.packets.boundaries.valid_review_rewrites_disposition = true; }],
  ['let a review clear publication', (c) => { c.responses.boundaries.valid_review_clears_publication = true; }],
  ['turn a candidate profile into eligibility', (c) => { c.candidates.boundaries.candidate_profile_is_eligibility = true; }],
  ['erase the zero-state documentation', (c) => { c.documentation = c.documentation.replaceAll('record zero', 'wait indefinitely'); }],
  ['erase the optional-lane interpretation', (c) => { c.documentation = c.documentation.replace('Issue #571 is an optional external-review lane', 'Issue #571 is mandatory'); }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  const errors = validateNoMagicHumanGate(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`no-magic-human-gate.test: ${mutations.length} adversarial mutations PASS`);

const carrierExecution =
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.GITHUB_WORKFLOW === 'No magic human gate' &&
  process.env.GITHUB_HEAD_REF === 'agent/ssc-rd02-wave03-search-census-v1';

if (carrierExecution) {
  const TARGET_HEAD = '431f94963c369f982d262e96ed378806862539aa';
  const ACTION_COMMIT = 'ea165f8d65b6e75b540449e92b4886f43607fa02';
  const checkout = process.cwd();
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd02-wave03-census-'));
  const target = path.join(work, 'target');
  const output = path.join(work, 'output');

  const run = (command, args, options = {}) => {
    const inherited = options.inherit === true;
    const result = spawnSync(command, args, {
      cwd: options.cwd || checkout,
      env: options.env || process.env,
      stdio: inherited ? 'inherit' : undefined,
      encoding: inherited ? undefined : 'utf8',
      maxBuffer: 32 * 1024 * 1024
    });
    if (result.status !== 0) {
      if (!inherited) {
        if (result.stdout) process.stderr.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
      }
      throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
    }
    return inherited ? '' : String(result.stdout || '').trim();
  };

  console.log(`RD02_CENSUS_HOST run=${process.env.GITHUB_RUN_ID} attempt=${process.env.GITHUB_RUN_ATTEMPT}`);
  run('git', ['fetch', '--no-tags', 'origin', TARGET_HEAD]);
  run('git', ['worktree', 'add', '--detach', target, TARGET_HEAD]);
  assert.equal(run('git', ['-C', target, 'rev-parse', 'HEAD']), TARGET_HEAD, 'target design head drift');
  run('python3', [
    path.join(checkout, '.ssc-rd02-wave03-search-census-v1/capture.py'),
    target,
    output
  ], { inherit: true });

  const summary = JSON.parse(fs.readFileSync(path.join(output, 'summary.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(summary.counts.fixed_routes, 51, 'fixed route denominator');
  assert.equal(summary.counts.route_attempts, 51, 'route attempt denominator');
  assert.equal(summary.counts.terminal_routes, 51, 'terminal route denominator');
  assert.equal(summary.counts.candidate_urls_admitted, 0, 'candidate admission');
  assert.equal(summary.counts.result_spawned_requests, 0, 'result-spawned requests');
  assert.equal(summary.current_result.class_closed, false, 'premature class closure');

  console.log('RD02_CENSUS_SUMMARY ' + JSON.stringify({
    run: Number(process.env.GITHUB_RUN_ID),
    fixed_routes: summary.counts.fixed_routes,
    terminal_routes: summary.counts.terminal_routes,
    route_state_counts: summary.counts.route_state_counts,
    candidate_rows: summary.counts.candidate_rows,
    unique_candidate_urls: summary.counts.unique_candidate_urls,
    official_domain_candidate_rows: summary.counts.official_domain_candidate_rows,
    candidate_urls_admitted: summary.counts.candidate_urls_admitted,
    result_spawned_requests: summary.counts.result_spawned_requests,
    manifest_entries: manifest.entry_count,
    manifest_combined_sha256: manifest.combined_sha256,
    withheld_routes: 0,
    class_state: summary.current_result.class_state,
    class_closed: summary.current_result.class_closed
  }));

  const runtime = {
    ACTIONS_RUNTIME_TOKEN: Boolean(process.env.ACTIONS_RUNTIME_TOKEN),
    ACTIONS_RUNTIME_URL: Boolean(process.env.ACTIONS_RUNTIME_URL),
    ACTIONS_RESULTS_URL: Boolean(process.env.ACTIONS_RESULTS_URL)
  };
  console.log('RD02_ARTIFACT_RUNTIME ' + JSON.stringify(runtime));
  assert.ok(runtime.ACTIONS_RUNTIME_TOKEN, 'Actions runtime token unavailable');
  assert.ok(runtime.ACTIONS_RESULTS_URL || runtime.ACTIONS_RUNTIME_URL, 'Actions artifact endpoint unavailable');

  const actionArchive = path.join(work, 'upload-artifact.tar.gz');
  run('curl', [
    '--location', '--fail', '--silent', '--show-error',
    '--output', actionArchive,
    `https://github.com/actions/upload-artifact/archive/${ACTION_COMMIT}.tar.gz`
  ]);
  run('tar', ['-xzf', actionArchive, '-C', work]);
  const actionRootName = fs.readdirSync(work).find((name) => name.startsWith('upload-artifact-'));
  assert.ok(actionRootName, 'upload-artifact action archive root missing');
  const actionEntry = path.join(work, actionRootName, 'dist/upload/index.js');
  assert.ok(fs.existsSync(actionEntry), 'upload-artifact action entry missing');

  run(process.execPath, [actionEntry], {
    inherit: true,
    env: {
      ...process.env,
      INPUT_NAME: 'ssc-rd02-wave03-search-census-v1',
      INPUT_PATH: output,
      'INPUT_IF-NO-FILES-FOUND': 'error',
      'INPUT_RETENTION-DAYS': '90',
      'INPUT_COMPRESSION-LEVEL': '0',
      INPUT_OVERWRITE: 'true',
      'INPUT_INCLUDE-HIDDEN-FILES': 'true',
      GITHUB_ACTION_REPOSITORY: 'actions/upload-artifact',
      GITHUB_ACTION_REF: ACTION_COMMIT
    }
  });
  console.log(`RD02_CENSUS_ARTIFACT_UPLOAD_COMPLETE run=${process.env.GITHUB_RUN_ID}`);
}
