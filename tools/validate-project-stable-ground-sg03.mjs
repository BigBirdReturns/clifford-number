#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-project-stable-ground-sg03.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const hex40 = /^[0-9a-f]{40}$/;

function defaultHistoricalVerifier(row) {
  const errors = [];
  if (!hex40.test(row?.merge_commit || '')) {
    return ['historical SG-03 merge receipt is not a full commit SHA'];
  }
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', row.merge_commit, 'HEAD'], {
    cwd: root,
    encoding: 'utf8'
  });
  if (ancestor.status !== 0) errors.push('historical SG-03 merge receipt is not an ancestor of HEAD');

  const paths = [
    'data/project/project-stable-ground-sg03.json',
    'data/project/project-stable-ground-sg03-release-manifest.json',
    'reports/core-thesis/stable-ground/sg03/checkpoint.json',
    'reports/core-thesis/stable-ground/sg03/index.html'
  ];
  for (const rel of paths) {
    try {
      const committed = execFileSync('git', ['show', `${row.merge_commit}:${rel}`], {
        cwd: root,
        encoding: null,
        maxBuffer: 32 * 1024 * 1024
      });
      if (!committed.equals(readBytes(rel))) errors.push(`historical SG-03 bytes drifted from merge receipt: ${rel}`);
    } catch (error) {
      errors.push(`historical SG-03 merge receipt cannot recover ${rel}: ${error.message}`);
    }
  }
  return errors;
}

export function loadSg03Context({ historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg03.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg01: read('data/project/project-stable-ground-alignment.json'),
    sg02: read('data/project/project-stable-ground-sg02.json'),
    coreThesis: read('data/project/core-thesis.json'),
    stories: read('data/project/m05-answerable-power-story-registry.json'),
    fanout: read('data/project/m05-answerable-power-fanout.json'),
    poofContract: read('data/project/poof-clifford-ecology-contract.json'),
    poofAperture: read('data/project/poof-clifford-aperture.json'),
    poofObjects: read('data/project/poof-clifford-object-registry.json'),
    poofChanges: read('data/project/poof-clifford-constitutional-change-log.json'),
    poofRelease: read('data/project/poof-clifford-ecology-release-manifest.json'),
    dca: read('data/project/dca-h01-field-hypothesis.json'),
    denominator: read('data/project/dca-h01-role-neutral-denominator.json'),
    k0: read('data/research/k0-role-neutral-denominator.json'),
    sprint08: read('data/project/m05-answerable-power-sprint-08-plan.json'),
    sprint09: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    fieldGate: read('data/project/m05-answerable-power-sprint-09-field-gate.json'),
    manifest: read('data/project/project-stable-ground-sg03-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg03/checkpoint.json'),
    historicalVerifier
  };
}

export function validateSg03(context = loadSg03Context()) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const equal = (actual, expected, message) => {
    if (actual !== expected) errors.push(`${message}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };

  const {
    checkpoint,
    pointer,
    governor,
    sg01,
    sg02,
    coreThesis,
    stories,
    fanout,
    poofContract,
    poofAperture,
    poofObjects,
    poofChanges,
    poofRelease,
    dca,
    denominator,
    k0,
    sprint08,
    sprint09,
    fieldGate,
    manifest,
    report,
    historicalVerifier
  } = context;
  const snapshot = checkpoint.canonical_snapshot;

  equal(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-03 schema');
  equal(checkpoint.checkpoint_id, 'SG-2026-07-29-03', 'SG-03 checkpoint identity');
  equal(checkpoint.governor, 'data/project/project-stable-ground-governor.json', 'SG-03 governor path');
  equal(checkpoint.supersedes.checkpoint_id, 'SG-2026-07-29-02', 'SG-03 predecessor identity');
  equal(checkpoint.supersedes.source_path, 'data/project/project-stable-ground-sg02.json', 'SG-03 predecessor path');
  equal(checkpoint.supersedes.merge_commit, '6b54d531885b5de72be547933ad4f7828a34d529', 'SG-02 merge receipt');
  equal(checkpoint.supersedes.preserved_unchanged, true, 'SG-02 preservation law');
  equal(sg02.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-02 source identity');
  equal(sg01.checkpoint_id, 'SG-2026-07-29-01', 'SG-01 source identity');
  equal(checkpoint.preserved_history.length, 2, 'SG-03 preserved-history count');
  equal(
    JSON.stringify(checkpoint.preserved_history.map((row) => row.checkpoint_id)),
    JSON.stringify(['SG-2026-07-29-01', 'SG-2026-07-29-02']),
    'SG-03 preserved-history order'
  );
  check(checkpoint.preserved_history.every((row) => row.status === 'superseded_preserved'), 'SG-03 predecessor status drift');

  equal(checkpoint.trigger.type, 'canonical_POOF_Clifford_ecology', 'SG-03 trigger type');
  equal(checkpoint.trigger.issue, 438, 'SG-03 trigger issue');
  equal(checkpoint.trigger.fanout_issue, 419, 'SG-03 fan-out issue');
  equal(checkpoint.trigger.pull_request, 410, 'SG-03 trigger PR');
  equal(checkpoint.trigger.merge_commit, 'e8fa1b4d188d128e856fb9900b0a4da8053042a5', 'POOF merge receipt');
  equal(checkpoint.trigger.release_sha256, '26ebcd554cdc4a0c7a9b21946decf098aba8e2720c0a11121459f9fddb126248', 'POOF trigger release digest');
  equal(checkpoint.canonical_main.commit, checkpoint.trigger.merge_commit, 'SG-03 canonical base');
  equal(checkpoint.canonical_main.repository, 'BigBirdReturns/clifford-number', 'SG-03 repository identity');
  equal(checkpoint.canonical_main.branch, 'main', 'SG-03 canonical branch');

  equal(checkpoint.preserved_stable_propositions.length, 9, 'preserved stable-proposition count');
  equal(
    JSON.stringify(checkpoint.preserved_stable_propositions),
    JSON.stringify(sg01.stable_propositions.map((row) => row.proposition_id)),
    'preserved stable-proposition identities'
  );

  equal(governor.schema_version, 'project-stable-ground-governor@1', 'governor schema');
  equal(governor.current_pointer_path, 'data/project/project-stable-ground-current.json', 'governor pointer path');
  equal(governor.history_law.append_only, true, 'governor append-only law');
  equal(governor.history_law.checkpoint_ids_unique, true, 'governor unique-ID law');
  equal(governor.history_law.history_order_oldest_to_newest, true, 'governor history-order law');
  equal(governor.history_law.one_current_checkpoint, true, 'governor current-checkpoint law');
  equal(governor.history_law.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  equal(governor.history_law.historical_release_manifests_recomputed, false, 'governor no-recompute law');
  equal(governor.validation_modes.historical.must_not_validate.length, 3, 'governor historical refusal count');
  check(governor.validation_modes.historical.must_not_validate.some((row) => row.includes('later live corpus state')), 'governor does not refuse historical/live equality');
  equal(governor.checkpoint_contract.correction_mode, 'append_preserving_supersession', 'governor correction mode');
  equal(governor.authority_law.projection_is_canonical_evidence, false, 'governor projection authority boundary');
  equal(governor.authority_law.publication_is_adoption, false, 'governor publication/adoption boundary');
  equal(governor.authority_law.same_mechanism_is_coordination, false, 'governor coordination boundary');

  equal(pointer.schema_version, 'project-stable-ground-current@1', 'pointer schema');
  equal(pointer.project_id, checkpoint.project_id, 'pointer project identity');
  equal(pointer.governor_path, checkpoint.governor, 'pointer governor');
  equal(pointer.history.length, 3, 'pointer history count');
  equal(
    JSON.stringify(pointer.history.map((row) => row.checkpoint_id)),
    JSON.stringify(['SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03']),
    'pointer history order'
  );
  equal(new Set(pointer.history.map((row) => row.checkpoint_id)).size, pointer.history.length, 'pointer checkpoint uniqueness');
  equal(pointer.history.filter((row) => row.status === 'current').length, 1, 'pointer current-state denominator');
  equal(pointer.history[0].merge_commit, 'c810cc741b23062b7eb3d026a46404e138e93eda', 'pointer SG-01 receipt');
  equal(pointer.history[0].status, 'superseded_preserved', 'pointer SG-01 state');
  equal(pointer.history[1].merge_commit, '6b54d531885b5de72be547933ad4f7828a34d529', 'pointer SG-02 receipt');
  equal(pointer.history[1].trigger_commit, 'af26b797ded7e11fc102f0935f71a9282e976090', 'pointer SG-02 trigger');
  equal(pointer.history[1].status, 'superseded_preserved', 'pointer SG-02 state');

  equal(checkpoint.authority_change.changed_layer, 'L6-POOF', 'SG-03 changed layer');
  equal(checkpoint.authority_change.prior_authority, 'projection_method_pending_repository_ecology', 'SG-03 prior authority');
  equal(checkpoint.authority_change.current_authority, 'canonical_projection_and_publication_infrastructure_below_Clifford_evidence', 'SG-03 current authority');
  equal(checkpoint.authority_change.release_sha256, checkpoint.trigger.release_sha256, 'SG-03 authority release digest');
  equal(
    checkpoint.authority_change.governing_law,
    'Evidence authority moves outward. Challenges move inward. Publication never writes facts backward into the evidence estate.',
    'SG-03 governing law'
  );
  equal(checkpoint.authority_change.canonical_effect, 'projection contracts, staged publication aperture, R8, R9, M05-S15, and A18', 'SG-03 canonical effect');
  equal(checkpoint.authority_change.graph_effect, 'none', 'SG-03 graph effect');
  equal(checkpoint.authority_change.publication_effect, 'none', 'SG-03 publication effect');
  equal(checkpoint.authority_change.field_effect, 'none', 'SG-03 field effect');
  equal(checkpoint.authority_change.adoption_effect, 'none', 'SG-03 adoption effect');

  equal(snapshot.k0.query_templates_total, 9, 'frozen K0 denominator');
  equal(snapshot.k0.query_templates_executed, 8, 'frozen K0 execution count');
  equal(snapshot.k0.searches_executed, 44, 'frozen K0 search count');
  equal(snapshot.k0.raw_results_observed, 206, 'frozen K0 raw-result count');
  equal(snapshot.k0.returned_records, 57, 'frozen K0 retained count');
  equal(snapshot.k0.included_events, 0, 'frozen K0 included count');
  equal(snapshot.k0.graph_effect, 'none', 'frozen K0 graph boundary');

  equal(snapshot.core_thesis.report_contracts, 9, 'frozen core-thesis report count');
  equal(
    JSON.stringify(snapshot.core_thesis.new_report_contracts),
    JSON.stringify(['R8-epistemic-admissibility-ceiling-conversion', 'R9-two-tier-constitution-safeguard-allocation']),
    'frozen R8/R9 identities'
  );
  equal(snapshot.core_thesis.graph_effect, 'none', 'frozen core-thesis graph boundary');

  equal(snapshot.m05_story_ecology.stories, 15, 'frozen M-05 story count');
  equal(snapshot.m05_story_ecology.standalone_actor, 3, 'frozen standalone-story count');
  equal(snapshot.m05_story_ecology.exact_overlap, 3, 'frozen overlap-story count');
  equal(snapshot.m05_story_ecology.constitutional_mechanism, 5, 'frozen constitutional-story count');
  equal(snapshot.m05_story_ecology.answer_story, 3, 'frozen answer-story count');
  equal(snapshot.m05_story_ecology.non_link, 1, 'frozen non-link count');
  equal(snapshot.m05_story_ecology.last_canonical_story_id, 'M05-S15', 'frozen last story');
  equal(snapshot.m05_story_ecology.research_lanes, 18, 'frozen research-lane count');
  equal(snapshot.m05_story_ecology.last_canonical_lane_id, 'A18', 'frozen last lane');

  equal(snapshot.poof.ecology_id, 'poof-clifford-constitutional-publication-ecology', 'frozen POOF identity');
  equal(snapshot.poof.authority, 'canonical_projection_and_publication_infrastructure_below_Clifford_evidence', 'frozen POOF authority');
  equal(snapshot.poof.jurisdictions, 4, 'frozen POOF jurisdiction count');
  equal(snapshot.poof.typed_transaction_objects, 5, 'frozen POOF object count');
  equal(snapshot.poof.routes, 9, 'frozen POOF route count');
  equal(snapshot.poof.operational_effect_dimensions, 7, 'frozen POOF effect count');
  equal(snapshot.poof.constitutional_change_receipts, 5, 'frozen POOF change-receipt count');
  equal(snapshot.poof.staged, true, 'frozen POOF staged state');
  equal(snapshot.poof.deployed, false, 'frozen POOF deployment state');
  equal(snapshot.poof.indexable, false, 'frozen POOF indexability state');
  equal(snapshot.poof.canonical_claim_created, false, 'frozen POOF canonical-claim state');
  equal(snapshot.poof.graph_effect, 'none', 'frozen POOF graph boundary');

  equal(snapshot.dca.hypothesis_id, 'DCA-H01', 'frozen DCA identity');
  equal(snapshot.dca.authority_tier, 'AT-2', 'frozen DCA authority');
  equal(snapshot.dca.frozen_query_templates, 12, 'frozen DCA denominator');
  equal(snapshot.dca.query_templates_executed, 0, 'frozen DCA execution count');
  equal(snapshot.dca.field_records, 0, 'frozen DCA record count');
  equal(snapshot.dca.prevalence_finding_generated, false, 'frozen DCA prevalence finding');
  equal(snapshot.dca.coordination_finding_generated, false, 'frozen DCA coordination finding');
  equal(snapshot.dca.common_purpose_finding_generated, false, 'frozen DCA common-purpose finding');
  equal(snapshot.dca.personal_hostility_finding_generated, false, 'frozen DCA personal-hostility finding');
  equal(snapshot.dca.graph_effect, 'none', 'frozen DCA graph boundary');

  equal(snapshot.sprint_08.A1_registry_entries, 0, 'frozen Sprint 08 A1 count');
  equal(snapshot.sprint_08.maximum_verified_adoption_level, 'A0', 'frozen Sprint 08 adoption ceiling');
  equal(snapshot.sprint_08.real_person_pilot_authorized, false, 'frozen Sprint 08 pilot state');
  equal(snapshot.sprint_09.candidate_records, 26, 'frozen field-candidate count');
  equal(snapshot.sprint_09.external_reproduction_receipts, 0, 'frozen reproduction count');
  equal(snapshot.sprint_09.eligible_adjudicators, 0, 'frozen adjudicator count');
  equal(snapshot.sprint_09.A1_registry_entries, 0, 'frozen A1 count');
  equal(snapshot.sprint_09.A3_no_adverse_shadow_uses, 0, 'frozen A3 count');
  equal(snapshot.sprint_09.A4_prospective_parallel_operations, 0, 'frozen A4 count');
  equal(snapshot.sprint_09.A5_rights_bearing_uses, 0, 'frozen A5 count');
  equal(snapshot.sprint_09.maximum_verified_adoption_level, 'A0', 'frozen adoption ceiling');
  equal(snapshot.sprint_09.real_person_pilot_authorized, false, 'frozen pilot state');
  equal(snapshot.sprint_09.project_complete, false, 'frozen project state');

  equal(checkpoint.fanout_state.owner_lanes.length, 6, 'owner-lane count');
  equal(
    JSON.stringify(checkpoint.fanout_state.owner_lanes.map((row) => row.lane_id)),
    JSON.stringify(['FAN-01', 'FAN-02', 'FAN-03', 'FAN-04', 'FAN-05', 'FAN-06']),
    'owner-lane identities'
  );
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-01')?.state, 'complete_canonical', 'FAN-01 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-01')?.receipt, checkpoint.trigger.merge_commit, 'FAN-01 receipt');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-02')?.state, 'open_draft_noncanonical', 'FAN-02 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-03')?.state, 'canonical_protocol_execution_zero', 'FAN-03 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-04')?.state, 'open_transport_bound_dependency', 'FAN-04 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-05')?.state, 'validated_branch_shadow_not_main', 'FAN-05 state');
  equal(checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-06')?.state, 'external_zero_state', 'FAN-06 state');
  equal(checkpoint.fanout_state.dca_execution_waves.length, 6, 'DCA wave count');
  check(checkpoint.fanout_state.dca_execution_waves.every((row) => row.state.includes('zero')), 'DCA wave state silently promotes execution');

  equal(checkpoint.lifecycle_repair.SG01.state, 'immutable_history_validation_complete', 'SG-01 lifecycle state');
  equal(checkpoint.lifecycle_repair.SG02.state, 'immutable_history_validation_required_in_this_checkpoint', 'SG-02 lifecycle state');
  equal(checkpoint.lifecycle_repair.SG03.state, 'successor_aware_from_initial_release', 'SG-03 lifecycle state');
  equal(checkpoint.lifecycle_repair.SG03.governor, checkpoint.governor, 'SG-03 lifecycle governor');
  equal(checkpoint.build_order.length, 8, 'SG-03 build-order count');
  equal(checkpoint.build_order.find((row) => row.order === 2)?.state, 'complete', 'POOF build-order state');
  equal(checkpoint.build_order.find((row) => row.order === 3)?.state, 'open_PR_405', 'K0 build-order state');
  equal(checkpoint.build_order.find((row) => row.order === 5)?.state, 'open_PR_382', 'publication-safety build-order state');

  for (const [key, value] of Object.entries(checkpoint.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `SG-03 boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `SG-03 boundary ${key}`);
  }
  for (const [key, value] of Object.entries(governor.boundaries)) {
    if (key === 'graph_effect') equal(value, 'none', `governor boundary ${key}`);
    else if (typeof value === 'boolean') equal(value, false, `governor boundary ${key}`);
  }

  equal(poofRelease.schema_version, 'poof-clifford-ecology-release-manifest@1', 'POOF release schema');
  equal(poofRelease.combined_sha256, checkpoint.trigger.release_sha256, 'POOF exact release digest');
  equal(manifest.schema_version, 'project-stable-ground-sg03-release-manifest@1', 'SG-03 release schema');
  equal(manifest.checkpoint_id, checkpoint.checkpoint_id, 'SG-03 release identity');
  equal(report.schema_version, 'project-stable-ground-sg03-report@1', 'SG-03 report schema');
  equal(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-03 report identity');
  equal(report.canonical_main.commit, checkpoint.canonical_main.commit, 'SG-03 report canonical base');
  equal(report.counts.checkpoints_preserved, pointer.history.length, 'SG-03 report history count');
  equal(report.counts.poof_jurisdictions, snapshot.poof.jurisdictions, 'SG-03 report POOF jurisdiction count');
  equal(report.counts.poof_transaction_objects, snapshot.poof.typed_transaction_objects, 'SG-03 report POOF object count');
  equal(report.counts.m05_stories, snapshot.m05_story_ecology.stories, 'SG-03 report M-05 count');
  equal(report.counts.k0_executed, snapshot.k0.query_templates_executed, 'SG-03 report K0 count');
  equal(report.counts.dca_executed, snapshot.dca.query_templates_executed, 'SG-03 report DCA count');
  equal(report.poof_release.combined_sha256, poofRelease.combined_sha256, 'SG-03 report POOF digest');
  equal(report.release_manifest.combined_sha256, manifest.combined_sha256, 'SG-03 report release digest');

  const isCurrent = pointer.current_checkpoint_id === checkpoint.checkpoint_id;
  if (isCurrent) {
    equal(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg03.json', 'current SG-03 pointer path');
    equal(pointer.current_canonical_main_commit, checkpoint.canonical_main.commit, 'current SG-03 main pointer');
    equal(pointer.history[2].path, 'data/project/project-stable-ground-sg03.json', 'current SG-03 history path');
    equal(pointer.history[2].trigger_commit, checkpoint.trigger.merge_commit, 'current SG-03 history trigger');
    equal(pointer.history[2].status, 'current', 'current SG-03 history status');
    equal(JSON.stringify(manifest), JSON.stringify(computeReleaseManifest()), 'current SG-03 exact-byte manifest');

    equal(coreThesis.report_contracts.length, snapshot.core_thesis.report_contracts, 'live core-thesis report count');
    equal(
      JSON.stringify(coreThesis.report_contracts.slice(-2).map((row) => row.report_type_id)),
      JSON.stringify(snapshot.core_thesis.new_report_contracts),
      'live R8/R9 identities'
    );
    equal(stories.counts.stories, snapshot.m05_story_ecology.stories, 'live M-05 story count');
    equal(stories.stories.at(-1)?.story_id, snapshot.m05_story_ecology.last_canonical_story_id, 'live last M-05 story');
    equal(fanout.counts.lanes, snapshot.m05_story_ecology.research_lanes, 'live research-lane count');
    equal(fanout.lanes.at(-1)?.lane_id, snapshot.m05_story_ecology.last_canonical_lane_id, 'live last research lane');

    equal(poofContract.ecology_id, snapshot.poof.ecology_id, 'live POOF identity');
    equal(poofContract.jurisdictions.length, snapshot.poof.jurisdictions, 'live POOF jurisdiction count');
    equal(poofContract.transaction_objects.length, snapshot.poof.typed_transaction_objects, 'live POOF object count');
    equal(poofContract.publication_state.current_state, 'staged_nonpublic_generated_aperture', 'live POOF publication state');
    equal(poofContract.publication_state.may_be_represented_as_deployed, false, 'live POOF deployment representation');
    equal(poofContract.boundaries.canonical_claim_created, false, 'live POOF canonical-claim boundary');
    equal(poofContract.boundaries.graph_effect, 'none', 'live POOF graph boundary');
    equal(poofAperture.routes.length, snapshot.poof.routes, 'live POOF route count');
    equal(poofAperture.publication.deployed, snapshot.poof.deployed, 'live POOF deployment state');
    equal(poofAperture.publication.indexable, snapshot.poof.indexable, 'live POOF indexability state');
    equal(poofObjects.objects.length, snapshot.poof.typed_transaction_objects, 'live POOF object-registry count');
    equal(poofObjects.effect_dimensions.length, snapshot.poof.operational_effect_dimensions, 'live POOF effect count');
    equal(
      JSON.stringify(poofObjects.effect_dimensions),
      JSON.stringify(['evidence', 'graph', 'review_queue', 'publication', 'visibility', 'ranking', 'custody']),
      'live POOF effect identities'
    );
    check(poofObjects.objects.every((row) => row.canonical_write === false && row.graph_effect === 'none'), 'live POOF object authority drift');
    check(poofObjects.objects.every((row) => JSON.stringify(Object.keys(row.effect_contract)) === JSON.stringify(poofObjects.effect_dimensions)), 'live POOF effect-contract drift');
    equal(poofChanges.changes.length, snapshot.poof.constitutional_change_receipts, 'live POOF change-receipt count');
    equal(poofChanges.changes.at(-1)?.change_id, 'POOF-CONST-2026-07-29-005', 'live POOF last change receipt');

    equal(k0.execution.query_templates_executed, snapshot.k0.query_templates_executed, 'live K0 execution count');
    equal(k0.execution.searches_executed, snapshot.k0.searches_executed, 'live K0 search count');
    equal(k0.execution.returned_records, snapshot.k0.returned_records, 'live K0 retained count');
    equal(k0.execution.included_events, snapshot.k0.included_events, 'live K0 included count');
    equal(dca.hypothesis_id, snapshot.dca.hypothesis_id, 'live DCA identity');
    equal(dca.current_state.prevalence_denominator_executed, false, 'live DCA execution state');
    equal(dca.current_state.prevalence_finding_generated, false, 'live DCA prevalence state');
    equal(denominator.execution.query_templates_executed, snapshot.dca.query_templates_executed, 'live DCA query count');
    equal(denominator.execution.records_retained, snapshot.dca.field_records, 'live DCA record count');
    equal(sprint08.current_result.maximum_verified_adoption_level, snapshot.sprint_08.maximum_verified_adoption_level, 'live Sprint 08 adoption ceiling');
    equal(sprint09.current_result.external_reproduction_receipts, snapshot.sprint_09.external_reproduction_receipts, 'live reproduction count');
    equal(sprint09.current_result.A1_registry_entries, snapshot.sprint_09.A1_registry_entries, 'live A1 count');
    equal(sprint09.current_result.A3_no_adverse_shadow_uses, snapshot.sprint_09.A3_no_adverse_shadow_uses, 'live A3 count');
    equal(sprint09.current_result.A4_prospective_parallel_operations, snapshot.sprint_09.A4_prospective_parallel_operations, 'live A4 count');
    equal(sprint09.current_result.A5_rights_bearing_uses, snapshot.sprint_09.A5_rights_bearing_uses, 'live A5 count');
    equal(sprint09.current_result.maximum_verified_adoption_level, snapshot.sprint_09.maximum_verified_adoption_level, 'live adoption ceiling');
    equal(fieldGate.field_sequence.length, 8, 'live F0-F7 denominator');
    check(fieldGate.field_sequence.slice(1).every((row) => row.external_effect_observed === false), 'live field effect silently promoted');
  } else {
    const historyRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
    check(Boolean(historyRow), 'historical pointer row missing for SG-03');
    equal(historyRow?.path, 'data/project/project-stable-ground-sg03.json', 'historical SG-03 pointer path');
    equal(historyRow?.status, 'superseded_preserved', 'historical SG-03 pointer status');
    for (const error of historicalVerifier(historyRow)) errors.push(error);
  }

  return errors;
}

function main() {
  const errors = validateSg03();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg03: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg03: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
