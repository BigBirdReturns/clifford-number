#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-m05-answerable-power-sprint-09.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = (values) => new Set(values).size === values.length;
const allFalse = (object, ignored = new Set()) => Object.entries(object || {}).every(([key, value]) => ignored.has(key) || typeof value !== 'boolean' || value === false);

export function loadSprint09Package() {
  return {
    plan: read('data/project/m05-answerable-power-sprint-09-plan.json'),
    fieldGate: read('data/project/m05-answerable-power-sprint-09-field-gate.json'),
    candidateRegistry: read('data/project/m05-answerable-power-sprint-09-candidate-registry.json'),
    prospectus: read('data/project/m05-answerable-power-sprint-09-no-adverse-prospectus.json'),
    outreachLedger: read('data/project/m05-answerable-power-sprint-09-outreach-ledger.json'),
    manifest: read('data/project/m05-answerable-power-sprint-09-release-manifest.json'),
    report: read('reports/core-thesis/answerable-power/sprint-09.json')
  };
}

export function validateSprint09Package(documents, { expectedManifest = null } = {}) {
  const errors = [];
  const error = (code, message) => errors.push({ code, message });
  const { plan, fieldGate, candidateRegistry, prospectus, outreachLedger, manifest, report } = documents;

  if (!isObject(plan) || plan.schema_version !== 'm05-answerable-power-sprint-09-plan@1' || plan.sprint_id !== 'M05-SPRINT-09') error('PLAN_IDENTITY', 'Plan identity drift.');
  if (plan?.status !== 'field_campaign_published_no_external_receipt') error('PLAN_STATUS', 'Plan status drift.');
  if (plan?.dependencies?.sprint_08_merge_commit !== 'fdc13faf46e9a4ea273d7dce3d656b8e36d21844') error('SPRINT_08_DEPENDENCY', 'Sprint 08 merge dependency drift.');
  const expectedIssues = { question_4_issue: 411, wave_01_issue: 412, wave_02_issue: 413, f4_public_intake_issue: 414, external_reproduction_issue: 360, adjudicator_pool_issue: 364 };
  for (const [key, value] of Object.entries(expectedIssues)) if (plan?.dependencies?.[key] !== value) error('ISSUE_DEPENDENCY', `${key} must remain ${value}.`);
  if (!Array.isArray(plan?.deliverables) || plan.deliverables.length !== 5) error('DELIVERABLE_DENOMINATOR', 'Expected five permanent deliverables.');

  if (!isObject(fieldGate) || fieldGate.schema_version !== 'm05-answerable-power-sprint-09-field-gate@1') error('FIELD_GATE_IDENTITY', 'Field gate identity drift.');
  if (fieldGate?.question !== 'Can the authority topology survive contact with power?') error('FIELD_QUESTION', 'Question 4 text drift.');
  const stages = Array.isArray(fieldGate?.field_sequence) ? fieldGate.field_sequence : [];
  if (stages.length !== 8) error('FIELD_STAGE_DENOMINATOR', 'F0–F7 must contain eight stages.');
  const stageIds = stages.map((row) => row.stage_id);
  if (JSON.stringify(stageIds) !== JSON.stringify(['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'])) error('FIELD_STAGE_ORDER', 'F0–F7 order or identity drift.');
  if (!unique(stageIds)) error('FIELD_STAGE_DUPLICATION', 'Field stage IDs must be unique.');
  for (const stage of stages) {
    if (stage.external_effect_observed !== false) error('FIELD_EXTERNAL_EFFECT', `${stage.stage_id || 'unknown'} must not claim external effect.`);
    if (!Array.isArray(stage.required_receipts) || stage.required_receipts.length === 0) error('FIELD_RECEIPTS', `${stage.stage_id || 'unknown'} lacks required receipts.`);
    if (typeof stage.forbidden_promotion !== 'string' || stage.forbidden_promotion.length < 20) error('FIELD_FORBIDDEN_PROMOTION', `${stage.stage_id || 'unknown'} lacks a bounded forbidden-promotion rule.`);
  }
  const byStage = Object.fromEntries(stages.map((stage) => [stage.stage_id, stage]));
  if (byStage.F0?.current_state !== 'complete') error('F0_STATE', 'F0 must remain complete.');
  if (byStage.F4?.current_state !== 'intake_published_not_observed') error('F4_STATE', 'F4 must remain intake published but not observed.');
  for (const stageId of ['F1', 'F2', 'F3', 'F5', 'F6', 'F7']) if (byStage[stageId]?.current_state !== 'not_observed') error('UNOBSERVED_STAGE', `${stageId} must remain not observed.`);
  if (!Array.isArray(fieldGate?.parallel_work) || fieldGate.parallel_work.length !== 7) error('PARALLEL_WORK_DENOMINATOR', 'Expected seven parallel work lanes.');
  if (!Array.isArray(fieldGate?.automatic_stop_conditions) || fieldGate.automatic_stop_conditions.length !== 11) error('FIELD_STOP_DENOMINATOR', 'Expected eleven field-level automatic stop conditions.');
  const works = fieldGate?.works_standard || {};
  if (works.minimum_domains !== 3 || works.minimum_jurisdictions !== 2) error('WORKS_STANDARD_DENOMINATOR', 'Works standard domain or jurisdiction denominator drift.');
  for (const [key, value] of Object.entries(works)) if (!['minimum_domains', 'minimum_jurisdictions'].includes(key) && value !== true) error('WORKS_STANDARD_PREDICATE', `${key} must remain required.`);
  const magicHuman = fieldGate?.magic_human_boundary || {};
  const expectedMagicHuman = {
    external_participation_required_for_external_claim: true,
    external_participation_required_for_internal_reasoning: false,
    one_missing_participant_halts_campaign: false,
    one_willing_participant_may_collapse_roles: false,
    bounded_reversible_internal_judgment_permitted: true
  };
  for (const [key, value] of Object.entries(expectedMagicHuman)) if (magicHuman[key] !== value) error('MAGIC_HUMAN_BOUNDARY', `${key} drifted.`);

  if (!isObject(candidateRegistry) || candidateRegistry.schema_version !== 'm05-answerable-power-sprint-09-candidate-registry@1') error('CANDIDATE_REGISTRY_IDENTITY', 'Candidate registry identity drift.');
  if (JSON.stringify(candidateRegistry?.source_issues) !== JSON.stringify([412, 413])) error('CANDIDATE_SOURCE_ISSUES', 'Candidate source issue custody drift.');
  const records = Array.isArray(candidateRegistry?.records) ? candidateRegistry.records : [];
  if (records.length !== 26) error('CANDIDATE_DENOMINATOR', 'Expected twenty-six candidate records.');
  const candidateIds = records.map((row) => row.candidate_id);
  if (!unique(candidateIds)) error('CANDIDATE_DUPLICATION', 'Candidate IDs must be unique.');
  const expectedRoleCounts = {
    rights_impacting_gateholder: 9,
    lower_adverse_rehearsal_host: 1,
    oversight_or_review_component: 3,
    transparency_infrastructure: 2,
    affected_party_standing_candidate: 8,
    secure_evidence_custody_infrastructure: 3
  };
  const computedRoleCounts = Object.fromEntries(Object.keys(expectedRoleCounts).map((key) => [key, 0]));
  const waveCounts = { wave_01: 0, wave_02: 0 };
  for (const row of records) {
    if (!/^F4-[WSC]\d{2}$/.test(row.candidate_id || '')) error('CANDIDATE_ID', `Invalid candidate ID ${row.candidate_id || '<missing>'}.`);
    if (!(row.wave in waveCounts)) error('CANDIDATE_WAVE', `${row.candidate_id} has an invalid wave.`); else waveCounts[row.wave] += 1;
    if (!(row.role_class in computedRoleCounts)) error('CANDIDATE_ROLE', `${row.candidate_id} has an invalid role class.`); else computedRoleCounts[row.role_class] += 1;
    if (!['NL', 'UK', 'AU'].includes(row.jurisdiction)) error('CANDIDATE_JURISDICTION', `${row.candidate_id} has an invalid jurisdiction.`);
    if (!Array.isArray(row.evidence_uris) || row.evidence_uris.length === 0 || row.evidence_uris.some((uri) => typeof uri !== 'string' || !uri.startsWith('https://'))) error('CANDIDATE_EVIDENCE', `${row.candidate_id} lacks public HTTPS evidence.`);
    if (typeof row.observed_predicates !== 'string' || row.observed_predicates.length === 0) error('CANDIDATE_PREDICATES', `${row.candidate_id} lacks observed predicates.`);
    if (typeof row.material_gaps !== 'string' || row.material_gaps.length === 0) error('CANDIDATE_GAPS', `${row.candidate_id} lacks material gaps.`);
  }
  const defaults = candidateRegistry?.default_state || {};
  if (defaults.status !== 'candidate_only') error('CANDIDATE_STATUS', 'Default candidate status must remain candidate_only.');
  if (defaults.contact_state !== 'not_contacted') error('CANDIDATE_CONTACT', 'Default candidate contact state must remain not_contacted.');
  if (defaults.selected_for_field_topology !== false) error('CANDIDATE_SELECTION', 'Default candidate selection must remain false.');
  if (defaults.adoption_effect !== 'none') error('CANDIDATE_ADOPTION_EFFECT', 'Default candidate adoption effect must remain none.');
  if (waveCounts.wave_01 !== 15 || waveCounts.wave_02 !== 11) error('CANDIDATE_WAVE_COUNTS', 'Wave counts must remain 15 and 11.');
  for (const [key, value] of Object.entries(expectedRoleCounts)) if (computedRoleCounts[key] !== value) error('CANDIDATE_ROLE_COUNTS', `${key} must remain ${value}.`);
  const jurisdictions = [...new Set(records.map((row) => row.jurisdiction))].sort();
  if (JSON.stringify(jurisdictions) !== JSON.stringify(['AU', 'NL', 'UK'])) error('CANDIDATE_JURISDICTIONS', 'Candidate jurisdictions must remain AU, NL, and UK.');
  const counts = candidateRegistry?.counts || {};
  const expectedRegistryCounts = {
    total_records: 26,
    wave_01_records: 15,
    wave_02_records: 11,
    jurisdictions: 3,
    rights_impacting_gateholders: 9,
    lower_adverse_rehearsal_hosts: 1,
    oversight_or_review_components: 3,
    transparency_infrastructures: 2,
    affected_party_standing_candidates: 8,
    secure_evidence_custody_infrastructures: 3,
    contacted: 0,
    selected: 0,
    F4_prospectus_eligible: 0
  };
  for (const [key, value] of Object.entries(expectedRegistryCounts)) if (counts[key] !== value) error('CANDIDATE_COUNT', `${key} must remain ${value}.`);
  if (!Array.isArray(candidateRegistry?.status_vocabulary) || candidateRegistry.status_vocabulary.length !== 17 || !candidateRegistry.status_vocabulary.includes('candidate_only') || !candidateRegistry.status_vocabulary.includes('F4_prospectus_eligible')) error('STATUS_VOCABULARY', 'Candidate status vocabulary drift.');

  if (!isObject(prospectus) || prospectus.schema_version !== 'm05-answerable-power-sprint-09-no-adverse-prospectus@1') error('PROSPECTUS_IDENTITY', 'Prospectus identity drift.');
  if (prospectus?.public_intake_issue !== 414) error('PROSPECTUS_INTAKE', 'Public intake issue must remain 414.');
  const exactArrayCounts = {
    eligible_shadow_modes: 4,
    absolute_no_adverse_categories: 4,
    prohibited_uses: 11,
    technical_firewall_requirements: 10,
    legal_and_operating_firewall_requirements: 8,
    affected_party_standing_requirements: 10,
    independent_custody_requirements: 10,
    preregistration_fields: 18,
    failure_denominator_requirements: 11,
    automatic_stop_conditions: 14,
    required_public_receipts: 14,
    admission_predicates: 15
  };
  for (const [key, value] of Object.entries(exactArrayCounts)) {
    const array = prospectus?.[key];
    if (!Array.isArray(array) || array.length !== value) error('PROSPECTUS_DENOMINATOR', `${key} must contain ${value} entries.`);
    else if (!unique(array.map((item) => typeof item === 'string' ? item : JSON.stringify(item)))) error('PROSPECTUS_DUPLICATION', `${key} contains duplicate entries.`);
  }
  const modeIds = Array.isArray(prospectus?.eligible_shadow_modes) ? prospectus.eligible_shadow_modes.map((mode) => mode.mode_id) : [];
  if (JSON.stringify(modeIds) !== JSON.stringify(['F4-M1', 'F4-M2', 'F4-M3', 'F4-M4'])) error('PROSPECTUS_MODES', 'F4 mode order or identity drift.');
  if (!prospectus?.admission_predicates?.includes('A1_support_active') || !prospectus?.admission_predicates?.includes('affected_party_standing') || !prospectus?.admission_predicates?.includes('independent_evidence_custody') || !prospectus?.admission_predicates?.includes('automatic_stop_authority')) error('ADMISSION_CORE', 'Core F4 admission predicates missing.');

  if (!isObject(outreachLedger) || outreachLedger.schema_version !== 'm05-answerable-power-sprint-09-outreach-ledger@1') error('OUTREACH_IDENTITY', 'Outreach ledger identity drift.');
  if (JSON.stringify(outreachLedger?.candidate_registry_source_issues) !== JSON.stringify([412, 413]) || outreachLedger?.public_intake_issue !== 414) error('OUTREACH_SOURCE', 'Outreach source issue custody drift.');
  if (!Array.isArray(outreachLedger?.entries) || outreachLedger.entries.length !== 0) error('OUTREACH_ENTRIES', 'Initial outreach ledger must remain empty.');
  const expectedOutreachCounts = { candidate_records: 26, contacted: 0, responses_received: 0, nonresponses: 0, declined: 0, withdrawn: 0, ineligible: 0, conflicts_disclosed: 0, F4_prospectus_eligible: 0, field_proposals: 0, F4_uses_initiated: 0 };
  for (const [key, value] of Object.entries(expectedOutreachCounts)) if (outreachLedger?.counts?.[key] !== value) error('OUTREACH_COUNT', `${key} must remain ${value}.`);
  const verified = outreachLedger?.verified_state || {};
  const zeroVerifiedKeys = ['external_reproduction_receipts', 'eligible_adjudicators', 'external_independence_decisions', 'external_evidence_decisions', 'A1_registry_entries', 'A3_no_adverse_shadow_uses', 'A4_prospective_parallel_operations', 'A5_rights_bearing_uses', 'R6_cogovernance_observations', 'R7_value_recovery_observations'];
  for (const key of zeroVerifiedKeys) if (verified[key] !== 0) error('VERIFIED_ZERO', `${key} must remain zero.`);
  if (verified.maximum_verified_adoption_level !== 'A0' || verified.real_person_pilot_authorized !== false || verified.works_standard_met !== false || verified.project_complete !== false) error('VERIFIED_CEILING', 'Verified field ceiling drift.');

  const current = plan?.current_result || {};
  const expectedCurrent = {
    candidate_records: 26,
    jurisdictions: 3,
    candidates_contacted: 0,
    field_proposals_received: 0,
    F4_prospectus_eligible_proposals: 0,
    external_reproduction_receipts: 0,
    eligible_adjudicators: 0,
    A1_registry_entries: 0,
    A3_no_adverse_shadow_uses: 0,
    A4_prospective_parallel_operations: 0,
    A5_rights_bearing_uses: 0,
    maximum_verified_adoption_level: 'A0',
    real_person_pilot_authorized: false,
    works_standard_met: false,
    project_complete: false
  };
  for (const [key, value] of Object.entries(expectedCurrent)) if (current[key] !== value) error('CURRENT_RESULT', `${key} must remain ${JSON.stringify(value)}.`);
  for (const key of ['field_sequence_published', 'candidate_registry_published', 'no_adverse_prospectus_published', 'outreach_ledger_published']) if (current[key] !== true) error('DELIVERABLE_STATE', `${key} must be true.`);

  const boundaryDocuments = [plan, fieldGate, candidateRegistry, prospectus, outreachLedger];
  for (const document of boundaryDocuments) if (!allFalse(document?.boundaries, new Set(['promotes_to', 'graph_effect']))) error('BOUNDARY_DRIFT', `${document?.schema_version || 'unknown'} has a true boolean boundary.`);
  if (plan?.boundaries?.promotes_to !== 'field_candidate_only' || plan?.boundaries?.graph_effect !== 'none') error('PROMOTION_BOUNDARY', 'Plan promotion or graph boundary drift.');

  const exactManifest = expectedManifest || computeReleaseManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(exactManifest)) error('RELEASE_MANIFEST', 'Exact-byte release manifest drift.');
  if (manifest?.entries?.length !== 11 || manifest?.combined_sha256?.length !== 64) error('RELEASE_MANIFEST_SHAPE', 'Release manifest shape drift.');
  if (!allFalse(manifest?.boundaries)) error('RELEASE_BOUNDARY', 'Release manifest boundary drift.');

  if (!isObject(report) || report.schema_version !== 'm05-answerable-power-sprint-09-report@1') error('REPORT_IDENTITY', 'Report identity drift.');
  if (report?.release_manifest?.combined_sha256 !== manifest?.combined_sha256) error('REPORT_HASH', 'Report release digest drift.');
  const expectedReportCounts = {
    field_stages: 8,
    candidate_records: 26,
    jurisdictions: 3,
    rights_impacting_gateholders: 9,
    lower_adverse_rehearsal_hosts: 1,
    oversight_or_review_components: 3,
    transparency_infrastructures: 2,
    affected_party_standing_candidates: 8,
    secure_evidence_custody_infrastructures: 3,
    eligible_shadow_modes: 4,
    prohibited_uses: 11,
    technical_firewall_requirements: 10,
    legal_and_operating_firewall_requirements: 8,
    affected_party_standing_requirements: 10,
    independent_custody_requirements: 10,
    preregistration_fields: 18,
    failure_denominator_requirements: 11,
    automatic_stop_conditions: 14,
    required_public_receipts: 14,
    admission_predicates: 15,
    candidates_contacted: 0,
    field_proposals: 0,
    F4_uses_initiated: 0
  };
  for (const [key, value] of Object.entries(expectedReportCounts)) if (report?.counts?.[key] !== value) error('REPORT_COUNT', `${key} report count must remain ${value}.`);
  if (report?.current_result?.maximum_verified_adoption_level !== 'A0' || report?.current_result?.real_person_pilot_authorized !== false || report?.current_result?.project_complete !== false) error('REPORT_CEILING', 'Report verified ceiling drift.');

  return errors;
}

export function validateCurrentSprint09Package() {
  return validateSprint09Package(loadSprint09Package(), { expectedManifest: computeReleaseManifest() });
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const errors = validateCurrentSprint09Package();
  if (errors.length > 0) {
    for (const row of errors) console.error(`${row.code}: ${row.message}`);
    process.exit(1);
  }
  console.log('validate-m05-answerable-power-sprint-09: OK');
}
