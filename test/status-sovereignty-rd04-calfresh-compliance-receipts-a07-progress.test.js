import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  progressPaths,
  validateA07Progress
} from '../tools/validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const positive = validateA07Progress(ROOT, { checkFiles: true });
if (positive.length) throw new Error(`positive A07 progress state failed:\n${positive.join('\n')}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd04-a07-progress-test-'));
for (const [key, rel] of Object.entries(progressPaths)) {
  const source = path.join(ROOT, rel);
  const target = path.join(temp, rel);
  if (key === 'acquisitionRoot') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(temp, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(temp, rel), `${JSON.stringify(value, null, 2)}\n`);
const P = progressPaths.progress;
const S = progressPaths.schema;
const C = progressPaths.constitution;
const A = progressPaths.acquisitionLedger;
const R = progressPaths.rules;
const T = progressPaths.pilotReceipt;
const PC = progressPaths.parentCore;
const RL = progressPaths.parentReleaseLedger;
const D = progressPaths.parentShard00;

const mutationCases = [
  ['progress schema identity', P, (row) => { row.schema_version = 'bad'; }, 'progress schema version'],
  ['progress status promotion', P, (row) => { row.status = 'complete'; }, 'progress status'],
  ['constitution path drift', P, (row) => { row.constitution.path = 'other.json'; }, 'constitution path'],
  ['phase-zero erasure', P, (row) => { row.constitution.phase_zero_snapshot = false; }, 'phase-zero snapshot boundary'],
  ['denominator reopening', P, (row) => { row.constitution.denominator_reopened = true; }, 'denominator reopening boundary'],
  ['post-result rule change', P, (row) => { row.constitution.selection_rules_changed_after_result_inspection = true; }, 'post-result rule-change boundary'],
  ['parent row inflation', P, (row) => { row.parent_denominator.registry_rows = 12283; }, 'progress parent registry rows'],
  ['parent text reduction', P, (row) => { row.parent_denominator.exact_text_documents = 11671; }, 'progress parent exact texts'],
  ['acquisition run drift', P, (row) => { row.official_source_acquisition.workflow_run = 1; }, 'acquisition workflow run'],
  ['acquisition source-head drift', P, (row) => { row.official_source_acquisition.source_head = '0'.repeat(40); }, 'acquisition source head'],
  ['source receipt inflation', P, (row) => { row.official_source_acquisition.frozen_sources = 10; }, 'progress acquisition source denominator'],
  ['semantic promotion', P, (row) => { row.official_source_acquisition.semantic_classifications_complete = 1; }, 'progress acquisition semantic count'],
  ['case receipt promotion', P, (row) => { row.official_source_acquisition.case_level_receipts = 1; }, 'progress acquisition case receipts'],
  ['rules hash drift', P, (row) => { row.content_neutral_extraction.rules_sha256 = '0'.repeat(64); }, 'progress rules SHA-256'],
  ['artifact identity drift', P, (row) => { row.content_neutral_extraction.artifact_id = 1; }, 'progress pilot artifact ID'],
  ['artifact digest drift', P, (row) => { row.content_neutral_extraction.artifact_digest = '0'.repeat(64); }, 'progress pilot artifact digest'],
  ['pilot document inflation', P, (row) => { row.content_neutral_extraction.pilot_documents_processed = 193; }, 'progress pilot documents'],
  ['pilot candidate drift', P, (row) => { row.content_neutral_extraction.candidate_documents = 132; }, 'progress candidate documents'],
  ['pilot negative deletion', P, (row) => { row.content_neutral_extraction.negative_documents = 60; }, 'progress negative documents'],
  ['pilot completeness promotion', P, (row) => { row.content_neutral_extraction.pilot_population_complete = true; }, 'progress pilot-complete boundary'],
  ['full-document inflation', P, (row) => { row.content_neutral_extraction.full_population_documents_processed = 192; }, 'full population document progress'],
  ['full-row inflation', P, (row) => { row.content_neutral_extraction.full_population_registry_rows_represented = 212; }, 'full population registry-row progress'],
  ['full-complete promotion', P, (row) => { row.content_neutral_extraction.full_population_complete = true; }, 'full population complete boundary'],
  ['follow-up authorization', P, (row) => { row.content_neutral_extraction.follow_up_authorized = true; }, 'full population follow-up boundary'],
  ['county-root inflation', P, (row) => { row.county_census.agency_roots_materialized = 58; }, 'county root materialization state'],
  ['county-census inflation', P, (row) => { row.county_census.counties_censused = 58; }, 'county census state'],
  ['county completion promotion', P, (row) => { row.county_census.complete = true; }, 'county census completion boundary'],
  ['county selection authorization', P, (row) => { row.county_census.county_selection_authorized = true; }, 'county selection boundary'],
  ['case join inflation', P, (row) => { row.current_counts.case_level_implementation_joins = 1; }, 'current-count zero case_level_implementation_joins'],
  ['restoration inflation', P, (row) => { row.current_counts.complete_restoration_chains = 1; }, 'current-count zero complete_restoration_chains'],
  ['timeliness inflation', P, (row) => { row.current_counts.remedy_timeliness_observations = 1; }, 'current-count zero remedy_timeliness_observations'],
  ['residual closure inflation', P, (row) => { row.current_counts.residual_classes_closed = 1; }, 'current-count zero residual_classes_closed'],
  ['external contact inflation', P, (row) => { row.current_counts.external_contacts = 1; }, 'current-count zero external_contacts'],
  ['candidate-to-order laundering', P, (row) => { row.authority.pilot_candidate_is_ordered_relief = true; }, 'progress authority pilot_candidate_is_ordered_relief'],
  ['candidate-to-follow-up laundering', P, (row) => { row.authority.pilot_candidate_authorizes_follow_up = true; }, 'progress authority pilot_candidate_authorizes_follow_up'],
  ['policy-to-case laundering', P, (row) => { row.authority.exact_policy_response_is_case_compliance = true; }, 'progress authority exact_policy_response_is_case_compliance'],
  ['absence-to-noncompliance laundering', P, (row) => { row.authority.source_unavailable_is_noncompliance = true; }, 'progress authority source_unavailable_is_noncompliance'],
  ['prevalence promotion', P, (row) => { row.authority.prevalence_supported = true; }, 'progress authority prevalence_supported'],
  ['coordination promotion', P, (row) => { row.authority.coordination_supported = true; }, 'progress authority coordination_supported'],
  ['graph effect promotion', P, (row) => { row.authority.graph_effect = 'add'; }, 'progress effect graph_effect'],
  ['next-transaction reordering', P, (row) => { row.next_transactions.reverse(); }, 'next transaction order'],
  ['progress extra key', P, (row) => { row.result = 'confirmed'; }, 'progress top-level closed shape'],

  ['constitution outcome selection', C, (row) => { row.unit_contract.outcome_selected_sampling_allowed = true; }, 'constitution outcome-selection boundary'],
  ['constitution human dependency', C, (row) => { row.unit_contract.outside_human_dependency = true; }, 'constitution no-human boundary'],
  ['constitution phase-zero inflation', C, (row) => { row.current_state.exact_public_case_receipts = 1; }, 'constitution phase-zero current state exact_public_case_receipts'],

  ['acquisition successful-body drift', A, (row) => { row.counts.exact_successful_bodies = 9; }, 'acquisition successful bodies'],
  ['acquisition unavailable deletion', A, (row) => { row.counts.terminal_states.source_unavailable = 0; }, 'acquisition unavailable state count'],
  ['acquisition semantic inflation', A, (row) => { row.counts.semantic_classifications_complete = 1; }, 'acquisition semantic ceiling'],
  ['unavailable identity substitution', A, (row) => { row.sources.at(-1).source_id = 'OTHER'; }, 'unavailable source identity'],
  ['unavailable retry inflation', A, (row) => { row.sources.at(-1).attempts = 3; }, 'unavailable source bounded attempts'],
  ['source implementation inflation', A, (row) => { row.sources[0].implementation_observed = true; }, 'source implementation ceiling CDSS-STATE-HEARINGS'],

  ['dictionary version drift', R, (row) => { row.dictionary_version = 'v2'; }, 'rules dictionary version'],
  ['rules selector mutation', R, (row) => { row.selection_boundaries.disposition_used_for_matching = true; }, 'extraction rules: selection boundary disposition_used_for_matching'],

  ['pilot workflow drift', T, (row) => { row.workflow_run = 1; }, 'pilot workflow run'],
  ['pilot archive drift', T, (row) => { row.source.archive_sha256 = '0'.repeat(64); }, 'pilot archive SHA-256'],
  ['pilot rule drift', T, (row) => { row.rules.sha256 = '0'.repeat(64); }, 'pilot rules SHA-256'],
  ['pilot denominator drift', T, (row) => { row.denominator.documents = 191; }, 'pilot document denominator'],
  ['pilot candidate inflation', T, (row) => { row.extraction.candidate_documents = 132; }, 'pilot candidate documents'],
  ['pilot negative deletion', T, (row) => { row.extraction.negative_documents = 60; }, 'pilot negative documents'],
  ['pilot population promotion', T, (row) => { row.extraction.population_complete = true; }, 'pilot population-complete boundary'],
  ['pilot artifact drift', T, (row) => { row.artifact.id = 1; }, 'pilot artifact ID'],
  ['pilot follow-up promotion', T, (row) => { row.authority.follow_up_selection_authorized = true; }, 'pilot authority follow_up_selection_authorized'],
  ['pilot implementation promotion', T, (row) => { row.boundaries.implementation_observed = true; }, 'pilot boundary implementation_observed'],

  ['parent registry drift', PC, (row) => { row.counts.registry_rows = 1; }, 'parent registry rows'],
  ['release publication promotion', RL, (row) => { row.draft = false; }, 'parent draft release state'],
  ['release archive identity drift', RL, (row) => { row.assets[0].id = 1; }, 'parent shard-00 archive ID'],
  ['shard document drift', D, (row) => { row.counts.documents = 191; }, 'parent shard documents'],

  ['schema opening', S, (row) => { row.additionalProperties = true; }, 'progress schema closed shape'],
  ['schema semantic weakening', S, (row) => { row.properties.official_source_acquisition.properties.semantic_classifications_complete.const = 1; }, 'progress schema semantic ceiling'],
  ['schema full-population weakening', S, (row) => { row.properties.content_neutral_extraction.properties.full_population_documents_processed.const = 1; }, 'progress schema full-population ceiling'],
  ['schema authority weakening', S, (row) => { row.properties.authority.properties.source_unavailable_is_noncompliance.const = true; }, 'progress schema authority source_unavailable_is_noncompliance']
];

for (const [name, rel, mutate, expected] of mutationCases) {
  const original = readJson(rel);
  const changed = structuredClone(original);
  mutate(changed);
  writeJson(rel, changed);
  const errors = validateA07Progress(temp, { checkFiles: false });
  writeJson(rel, original);
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors.slice(0, 30))}`);
  }
}

const bodyRel = path.join(
  progressPaths.acquisitionRoot,
  'CDSS-STATE-HEARINGS/attempt-1/hop-01.body.bin'
);
const bodyPath = path.join(temp, bodyRel);
const originalBody = fs.readFileSync(bodyPath);
fs.writeFileSync(bodyPath, Buffer.concat([originalBody, Buffer.from('tamper')]));
const bodyErrors = validateA07Progress(temp, { checkFiles: false });
fs.writeFileSync(bodyPath, originalBody);
if (!bodyErrors.some((error) => error.includes('acquisition file custody: body bytes CDSS-STATE-HEARINGS')
  || error.includes('acquisition file custody: body hash CDSS-STATE-HEARINGS'))) {
  throw new Error(`exact source body tampering was not refused: ${JSON.stringify(bodyErrors.slice(0, 30))}`);
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(`status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress.test: 1 positive + ${mutationCases.length + 1} adversarial mutations PASS`);
