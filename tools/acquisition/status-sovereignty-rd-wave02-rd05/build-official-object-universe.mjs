#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-05-C03.json';
export const SOURCE_ROOT = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/initial-surface-capture';
export const SUMMARY_PATH = `${SOURCE_ROOT}/summary.json`;
export const MANIFEST_PATH = `${SOURCE_ROOT}/manifest.json`;
export const OUTPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/official-object-candidate-universe.json';
export const EXPECTED_SEED_MANIFEST_SHA256 = '994c28b5977bab3c83c57f110570c4329712e11e94b33509e71744544cde2434';
export const EXPECTED_CAPTURE_MANIFEST_SHA256 = 'adf851d4a570baaed0a4308c72552f9da8dfe5655c6517a9b613259e5274d76f';
export const EXPECTED_SOURCE_IDS = Array.from({ length: 10 }, (_, index) => `SSC-RD05-S${String(index + 1).padStart(3, '0')}`);
export const TARGET_SOURCE_IDS = new Set(EXPECTED_SOURCE_IDS.slice(0, 7));
export const CONTROL_SOURCE_IDS = new Set(EXPECTED_SOURCE_IDS.slice(7));
export const REQUIRED_FIELDS = [
  'record_class_and_issuing_authority',
  'meeting_or_workstream_identity',
  'publication_and_operative_dates',
  'member_or_subcommittee_authorship',
  'recommendation_state',
  'agency_response_state',
  'adoption_or_rejection_state',
  'implementation_and_outcome_state',
  'exact_source_locator_and_byte_custody',
  'duplicate_supersession_or_archive_relationship',
  'terminal_record_state'
];

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const pending = (note) => ({ state: 'pending_fixed_official_record_protocol', value: null, note, terminal: false });
const observed = (value, note) => ({ state: 'observed', value, note, terminal: true });

export function canonicalUrl(raw) {
  const url = new URL(raw);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  if (!url.pathname.includes('.') && url.pathname !== '/' && !url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}

export function verifyCapture(root = ROOT) {
  const manifest = readJson(root, MANIFEST_PATH);
  if (manifest.schema_version !== 'ssc-rd05-wave02-official-record-surface-manifest@1') throw new Error('capture manifest schema changed');
  if (manifest.combined_sha256 !== EXPECTED_CAPTURE_MANIFEST_SHA256) throw new Error('capture manifest digest changed');
  if (!Array.isArray(manifest.entries) || manifest.entries.length !== 41) throw new Error(`capture manifest denominator ${manifest.entries?.length}`);
  const terms = [];
  for (const entry of manifest.entries) {
    const bytes = fs.readFileSync(path.join(root, SOURCE_ROOT, entry.path));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`capture entry mismatch ${entry.path}`);
    terms.push(`${entry.path}\0${entry.bytes}\0${entry.sha256}\n`);
  }
  if (sha256(Buffer.from(terms.join(''), 'utf8')) !== manifest.combined_sha256) throw new Error('capture combined digest mismatch');
  const summary = readJson(root, SUMMARY_PATH);
  if (summary.schema_version !== 'ssc-rd05-wave02-official-record-surface-capture@1') throw new Error('capture summary schema changed');
  if (summary.class_id !== 'RD-05-C03' || summary.issue !== 790) throw new Error('capture identity changed');
  if (!Array.isArray(summary.sources) || summary.sources.length !== 10) throw new Error(`parent source denominator ${summary.sources?.length}`);
  if (JSON.stringify(summary.sources.map((row) => row.source_id)) !== JSON.stringify(EXPECTED_SOURCE_IDS)) throw new Error('parent source IDs changed');
  if (!summary.sources.every((row) => row.resolved === true && row.terminal_state === 'http_success' && row.attempts?.length === 1)) throw new Error('parent source is not terminally captured');
  if (!Array.isArray(summary.candidate_official_objects) || summary.candidate_official_objects.length !== 55) throw new Error(`linked candidate denominator ${summary.candidate_official_objects?.length}`);
  return { manifest, summary };
}

export function deriveUniverse(summary) {
  const rows = new Map();
  const ensure = (rawUrl) => {
    const url = canonicalUrl(rawUrl);
    if (!rows.has(url)) rows.set(url, { url, seed_sources: [], discovered_from: [] });
    return rows.get(url);
  };
  for (const source of summary.sources) ensure(source.requested_url).seed_sources.push(source.source_id);
  for (const candidate of summary.candidate_official_objects) ensure(candidate.url).discovered_from.push(candidate.discovered_from);

  const objects = [...rows.values()]
    .map((row) => {
      row.seed_sources = [...new Set(row.seed_sources)].sort();
      row.discovered_from = [...new Set(row.discovered_from)].sort();
      const allSources = [...row.seed_sources, ...row.discovered_from];
      const target = allSources.some((id) => TARGET_SOURCE_IDS.has(id));
      return { ...row, source_scope: target ? 'aces_target' : 'matched_nsb_control' };
    })
    .sort((a, b) => a.source_scope.localeCompare(b.source_scope) || a.url.localeCompare(b.url))
    .map((row, index) => {
      const source = row.seed_sources.length === 1 ? summary.sources.find((candidate) => candidate.source_id === row.seed_sources[0]) : null;
      const custody = source ? {
        source_id: source.source_id,
        terminal_state: source.terminal_state,
        final_url: source.attempts[0].final_url,
        body_path: `${SOURCE_ROOT}/${source.attempts[0].body_path}`,
        body_bytes: source.attempts[0].body_bytes,
        body_sha256: source.attempts[0].body_sha256,
        headers_path: `${SOURCE_ROOT}/${source.attempts[0].headers_path}`,
        headers_sha256: source.attempts[0].headers_sha256
      } : null;
      return {
        object_id: `RD05-OBJ-${String(index + 1).padStart(3, '0')}`,
        source_scope: row.source_scope,
        url: row.url,
        seed_source_ids: row.seed_sources,
        discovered_from_source_ids: row.discovered_from,
        admission_state: source ? 'frozen_parent_surface_exact_body_captured' : 'linked_candidate_pending_exact_capture',
        fields: {
          record_class_and_issuing_authority: source ? observed({ source_class: source.source_class, publisher: source.publisher, title: source.title }, 'Observed only for the frozen parent source surface.') : pending('Requires exact object capture and classification.'),
          meeting_or_workstream_identity: pending('Requires fixed official-record classification.'),
          publication_and_operative_dates: pending('Publication and operative dates remain distinct and unadjudicated.'),
          member_or_subcommittee_authorship: pending('Authorship is not inferred from membership or page context.'),
          recommendation_state: pending('Keyword occurrence, agenda language, or planned work is not a completed recommendation.'),
          agency_response_state: pending('No agency response is inferred from source proximity.'),
          adoption_or_rejection_state: pending('Neither adoption nor rejection is inferred without an exact disposition object.'),
          implementation_and_outcome_state: pending('Recommendation, implementation, and outcome remain separate predicates.'),
          exact_source_locator_and_byte_custody: custody ? observed(custody, 'Exact byte custody for a frozen parent surface only.') : pending('Linked candidate requires exact response custody.'),
          duplicate_supersession_or_archive_relationship: pending('Duplicate, supersession, archive, and transfer relationships remain unadjudicated.'),
          terminal_record_state: pending('No object closes at candidate-universe construction.')
        },
        object_result: { exact_object_capture_complete: Boolean(custody), fixed_protocol_complete: false, record_closed: false, terminal_state: 'still_open' }
      };
    });
  return objects;
}

export function buildUniverse(root = ROOT) {
  const seed = readJson(root, SEED_PATH);
  if (seed.class_id !== 'RD-05-C03' || seed.child_issue !== 790) throw new Error('RD-05 seed identity changed');
  if (seed.input_manifest?.combined_sha256 !== EXPECTED_SEED_MANIFEST_SHA256) throw new Error('RD-05 seed manifest changed');
  const { manifest, summary } = verifyCapture(root);
  const objects = deriveUniverse(summary);
  const targetObjects = objects.filter((row) => row.source_scope === 'aces_target').length;
  const controlObjects = objects.length - targetObjects;
  const seedLinkOverlaps = objects.filter((row) => row.seed_source_ids.length && row.discovered_from_source_ids.length).length;
  const value = {
    schema_version: 'ssc-rd-wave02-rd05-official-object-candidate-universe@1',
    wave_id: 'SSC-RD-W02', class_id: 'RD-05-C03', issue: 790, as_of: '2026-08-02',
    title: 'ACES recommendation-to-disposition official-object candidate universe',
    status: 'immutable_initial_surface_candidate_universe_pending_exact_object_capture_and_disposition_protocol',
    parent: {
      seed_path: SEED_PATH, seed_input_manifest_sha256: EXPECTED_SEED_MANIFEST_SHA256,
      frozen_execution_base: seed.frozen_execution_base, constitution_merge: seed.constitution.merge_commit,
      capture_summary_path: SUMMARY_PATH, capture_manifest_path: MANIFEST_PATH,
      capture_manifest_sha256: manifest.combined_sha256, capture_child_head: summary.exact_child_head
    },
    denominator_contract: {
      frozen_parent_sources: 10, linked_candidates: 55, unique_object_candidates: 58,
      aces_target_objects: 51, matched_control_objects: 7, seed_link_overlaps: 7,
      candidate_membership_frozen_before_object_adjudication: true,
      silent_object_removal_allowed: false, source_count_is_object_denominator: false,
      complete_official_object_universe_claimed: false
    },
    required_fields: REQUIRED_FIELDS,
    objects,
    counts: {
      frozen_parent_sources: 10, terminal_parent_source_receipts: 10, linked_candidates: 55,
      unique_object_candidates: objects.length, aces_target_objects: targetObjects, matched_control_objects: controlObjects,
      exact_object_bodies: objects.filter((row) => row.object_result.exact_object_capture_complete).length,
      fixed_protocol_completed_objects: 0, completed_recommendations: 0, agency_responses: 0,
      adopted_outputs: 0, rejected_outputs: 0, implementation_or_outcomes: 0, closed_objects: 0,
      external_contacts: 0, external_reviews: 0, graph_effects: 0
    },
    current_result: {
      terminal_state: 'initial_candidate_universe_frozen_exact_object_capture_pending',
      initial_candidate_universe_frozen: true, complete_official_object_universe_frozen: false,
      recommendation_disposition_protocol_complete: false, class_closed: false,
      outside_human_dependency: false, project_blocking: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    boundaries: {
      candidate_url_is_official_object_admission: false,
      parent_surface_is_completed_recommendation: false,
      keyword_occurrence_is_recommendation: false,
      agenda_is_completed_output: false,
      committee_termination_is_suppression_or_rejection: false,
      missing_public_output_is_no_influence: false,
      matched_control_is_target_evidence: false,
      candidate_universe_completion_is_class_closure: false,
      outside_human_dependency: false,
      graph_effect: 'none'
    }
  };
  fs.mkdirSync(path.dirname(path.join(root, OUTPUT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(root, OUTPUT_PATH), stable(value));
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = buildUniverse();
  console.log(`build-rd05-object-universe: ${value.counts.unique_object_candidates} unique objects (${value.counts.aces_target_objects} target / ${value.counts.matched_control_objects} control), class open`);
}
