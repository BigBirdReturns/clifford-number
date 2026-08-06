#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT as DEFAULT_ROOT, PATHS, REQUIRED_FIELDS, SUBCOMMITTEES, CHAIR_AUTHORITIES, checkAll } from './build-status-sovereignty-rd-wave03-rd05-member-participation.mjs';

const canonical = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readJsonl = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8').split(/\n/).filter(Boolean).map(line => JSON.parse(line));
const fileReceipt = (root, rel) => { const data = fs.readFileSync(path.join(root, rel)); return { path: rel, bytes: data.length, sha256: sha256(data) }; };

export function validateRD05(root = DEFAULT_ROOT, { deterministic = root === DEFAULT_ROOT } = {}) {
  if (deterministic) checkAll();
  const contract = readJson(root, PATHS.fieldContract);
  const sourceReceipt = readJson(root, PATHS.sourceReceipt);
  const candidateIndex = readJson(root, PATHS.candidateIndex);
  const officialProtocol = readJson(root, PATHS.officialProtocol);
  const observations = readJsonl(root, PATHS.officialObservations);
  const sourceManifest = readJson(root, PATHS.sourceManifest);
  const matrix = readJson(root, PATHS.matrix);
  const summary = readJson(root, PATHS.summary);
  const classReceipt = readJson(root, PATHS.classReceipt);
  const manifest = readJson(root, PATHS.manifest);
  const closure = readJson(root, PATHS.closure);

  assert.equal(contract.class_id, 'RD-05-C02');
  assert.equal(contract.units.length, 17);
  assert.deepEqual(contract.required_fields, REQUIRED_FIELDS);
  assert.equal(new Set(contract.units.map(row => row.unit_id)).size, 17);
  assert.equal(sourceReceipt.artifact_zip_sha256, '0829f39c45dc5308c031dcde3efb6514a1f65ec5787ed19c9490bf49e6c1289b');
  assert.equal(sourceReceipt.fixed_routes, 161);
  assert.equal(sourceReceipt.route_attempts, 161);
  assert.deepEqual(sourceReceipt.terminal_state_counts, { http_success: 161 });
  assert.equal(sourceReceipt.exact_official_routes, 25);
  assert.equal(sourceReceipt.candidate_census_routes, 136);
  assert.equal(sourceReceipt.candidate_rows, 1351);
  assert.equal(sourceReceipt.candidate_followups, 0);
  assert.equal(sourceReceipt.record_absence_inferred, false);
  assert.equal(sourceReceipt.member_event_absence_inferred, false);

  assert.equal(candidateIndex.candidate_parts.length, 5);
  assert.equal(candidateIndex.counts.candidate_rows, 1351);
  assert.equal(candidateIndex.counts.terminal_candidate_dispositions, 1351);
  assert.equal(candidateIndex.counts.selected_candidate_followups, 0);
  assert.equal(candidateIndex.counts.exact_member_name_signal_rows, 0);
  const candidates = candidateIndex.candidate_parts.flatMap(part => readJsonl(root, `${PATHS.candidateDir}/${part.path}`));
  assert.equal(candidates.length, 1351);
  assert.equal(new Set(candidates.map(row => row.candidate_id)).size, 1351);
  assert.deepEqual(candidates.map(row => row.candidate_id), [...candidates].sort((a, b) => a.route_ordinal - b.route_ordinal || a.result_rank - b.result_rank || a.candidate_id.localeCompare(b.candidate_id)).map(row => row.candidate_id));
  for (const row of candidates) {
    const surface = normalize(`${row.title} ${row.description} ${row.url}`);
    assert.equal(surface.includes(normalize(row.canonical_name)), false, `${row.candidate_id}: exact member signal drift`);
    assert.equal(row.exact_member_name_signal, false);
    assert.equal(row.followup_eligibility, false);
    assert.equal(row.terminal_disposition, 'terminal_no_exact_member_identity_signal');
    assert.equal(row.selected_for_followup, false);
    assert.equal(row.followup_requested, false);
    assert.equal(row.admitted_evidence_source, false);
    assert.equal(row.member_field_effect, 'none');
    assert.equal(row.graph_effect, 'none');
  }

  assert.equal(officialProtocol.declared_official_body_rows, 25);
  assert.equal(officialProtocol.network_requests_authorized, 0);
  assert.equal(observations.length, 25);
  assert.equal(new Set(observations.map(row => row.route_id)).size, 25);
  assert.deepEqual(observations.map(row => row.route_id), officialProtocol.route_ids);
  for (const row of observations) {
    assert.equal(row.http_status, 200);
    assert.equal(row.content_type, 'text/html');
    assert.match(row.body_sha256, /^[0-9a-f]{64}$/);
    assert.match(row.headers_sha256, /^[0-9a-f]{64}$/);
    assert.equal(row.member_event_negative_finding_authorized, false);
    assert.equal(row.body_committed_to_git, false);
    assert.equal(row.graph_effect, 'none');
  }

  const sourceBase = 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation';
  const expectedSourceEntries = [
    fileReceipt(root, `${sourceBase}/source-census-execution-receipt.json`).path ? fileReceipt(root, `${sourceBase}/source-census-execution-receipt.json`) : null,
  ];
  const sourceEntryPaths = [
    'source-census-execution-receipt.json', 'candidate-adjudication/index.json',
    ...candidateIndex.candidate_parts.map(part => `candidate-adjudication/${part.path}`),
    'official-body-observation-protocol.json', 'official-body-observations.jsonl',
  ];
  const recomputedSourceEntries = sourceEntryPaths.map(rel => {
    const receipt = fileReceipt(root, `${sourceBase}/${rel}`);
    return { path: rel, bytes: receipt.bytes, sha256: receipt.sha256 };
  });
  assert.deepEqual(sourceManifest.entries, recomputedSourceEntries);
  assert.equal(sourceManifest.entry_count, 9);
  assert.equal(sourceManifest.combined_sha256, sha256(Buffer.from(recomputedSourceEntries.map(row => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n'))));
  assert.equal(sourceManifest.candidate_rows, 1351);
  assert.equal(sourceManifest.terminal_candidate_dispositions, 1351);
  assert.equal(sourceManifest.selected_candidate_followups, 0);
  assert.equal(sourceManifest.official_body_observations, 25);
  assert.equal(sourceManifest.admitted_candidate_sources, 0);
  assert.equal(sourceManifest.result_spawned_requests, 0);
  assert.equal(sourceManifest.outside_human_dependency, false);
  assert.equal(sourceManifest.publication_effect, 'none');
  assert.equal(sourceManifest.adoption_effect, 'none');
  assert.equal(sourceManifest.graph_effect, 'none');

  assert.equal(matrix.schema_version, 'ssc-rd05-wave03-member-participation-terminal-matrix@1');
  assert.equal(matrix.members.length, 17);
  assert.deepEqual(matrix.required_fields, REQUIRED_FIELDS);
  const memberIds = contract.units.map(row => row.unit_id);
  assert.deepEqual(matrix.members.map(row => row.unit_id), memberIds);
  const allFields = [];
  for (const member of matrix.members) {
    assert.deepEqual(Object.keys(member.fields), REQUIRED_FIELDS);
    assert.equal(member.member_result.required_fields, 10);
    assert.equal(member.member_result.terminal_fields, 10);
    assert.equal(member.member_result.member_closed, true);
    assert.equal(member.member_result.member_terminal_state, 'bounded_source_unavailable');
    for (const [fieldName, field] of Object.entries(member.fields)) {
      assert.ok(['observed', 'not_publicly_recovered'].includes(field.state));
      assert.equal(field.fixed_protocol_complete, true);
      assert.equal(field.terminal_for_class_closure, true);
      allFields.push({ unit_id: member.unit_id, field_name: fieldName, ...field });
    }
  }
  assert.equal(allFields.length, 170);
  assert.equal(allFields.filter(row => row.state === 'observed').length, 71);
  assert.equal(allFields.filter(row => row.state === 'not_publicly_recovered').length, 99);
  const observedByField = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, allFields.filter(row => row.field_name === field && row.state === 'observed').map(row => row.unit_id).sort()]));
  assert.deepEqual(observedByField.canonical_member_identity_and_affiliation, memberIds.slice().sort());
  assert.deepEqual(observedByField.subcommittee_assignment_and_role, Object.keys(SUBCOMMITTEES).sort());
  assert.deepEqual(observedByField.agenda_setting_or_chair_authority, Object.keys(CHAIR_AUTHORITIES).sort());
  assert.deepEqual(observedByField.source_identities_and_exact_custody, memberIds.slice().sort());
  assert.deepEqual(observedByField.field_and_member_terminal_state, memberIds.slice().sort());
  for (const field of ['meeting_attendance_state', 'recorded_vote_state_and_vote_identity', 'dissent_concurrence_or_separate_statement_state', 'information_access_or_briefing_custody_where_public', 'recommendation_drafting_or_authorship_custody']) assert.deepEqual(observedByField[field], []);

  const counts = matrix.counts;
  assert.deepEqual(counts, summary.counts);
  assert.deepEqual(counts, classReceipt.counts);
  assert.equal(counts.required_fields, 170);
  assert.equal(counts.terminal_fields, 170);
  assert.equal(counts.observed_fields, 71);
  assert.equal(counts.not_publicly_recovered_fields, 99);
  assert.equal(counts.observed_identity_fields, 17);
  assert.equal(counts.observed_subcommittee_fields, 15);
  assert.equal(counts.observed_chair_authority_fields, 5);
  assert.equal(counts.observed_source_custody_fields, 17);
  assert.equal(counts.observed_terminal_state_fields, 17);
  assert.equal(counts.selected_candidate_followups, 0);
  assert.equal(counts.admitted_candidate_sources, 0);
  assert.equal(summary.terminal_state, 'bounded_source_unavailable');
  assert.equal(summary.class_closed, true);
  assert.equal(classReceipt.terminal_state, 'bounded_source_unavailable');
  assert.equal(classReceipt.class_closed, true);
  assert.equal(classReceipt.unresolved_limit.missing_records_are_not_event_absence, true);
  assert.equal(classReceipt.unresolved_limit.no_recorded_dissent_is_not_unanimity, true);
  assert.equal(classReceipt.unresolved_limit.subcommittee_assignment_is_not_authorship, true);
  assert.equal(closure.class_closed, true);
  assert.equal(closure.terminal_state, 'bounded_source_unavailable');
  assert.equal(closure.product.manifest_combined_sha256, manifest.combined_sha256);
  assert.deepEqual(closure.residual_atlas_effect_if_promoted, { canonical_classes: 42, open_before: 33, closed_before: 9, open_after: 32, closed_after: 10, wave03_selected_attempts_terminal_after_promotion: 4, wave_complete: false });

  for (const object of [matrix.current_result, matrix.authority, summary.current_result, summary.authority, classReceipt.authority, closure.authority]) {
    assert.equal(object.outside_human_dependency, false);
    assert.equal(object.publication_effect, 'none');
    assert.equal(object.adoption_effect, 'none');
    assert.equal(object.graph_effect, 'none');
  }
  for (const [key, value] of Object.entries(matrix.boundaries)) if (key.endsWith('_is_meeting_attendance') || key.includes('_is_') || key.includes('_is_nonoccurrence')) assert.equal(value, false, key);

  const researchBase = 'data/research/status-sovereignty-rd-wave03-rd05-member-participation';
  const researchEntries = ['terminal-field-matrix.json', 'summary.json', 'class-receipt.json'].map(rel => {
    const receipt = fileReceipt(root, `${researchBase}/${rel}`);
    return { path: rel, bytes: receipt.bytes, sha256: receipt.sha256 };
  });
  assert.deepEqual(manifest.entries, researchEntries);
  assert.equal(manifest.entry_count, 3);
  assert.equal(manifest.combined_sha256, sha256(Buffer.from(researchEntries.map(row => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n'))));
  return { members: 17, terminal_fields: 170, observed_fields: 71, not_publicly_recovered_fields: 99, candidate_rows: 1351, official_body_observations: 25, class_closed: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(validateRD05(), null, 2));
