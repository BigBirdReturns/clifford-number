#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-01-C03.json';
export const RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd01-legal-entity/source-custody/natsec100-2026/source-receipt.json';
export const OUTPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd01-legal-entity/roster-scaffold.json';
export const EXPECTED_SEED_MANIFEST_SHA256 = 'ad645fd1b8e882c12103dc5bcdfabbdba3a0607ccd3d68c28ad763bfbfdf4468';

export const REQUIRED_FIELDS = [
  'edition',
  'published_rank_or_explicit_nonselection_class',
  'published_display_name',
  'resolved_legal_entity',
  'entity_jurisdiction',
  'entity_identifier_and_authoritative_source',
  'parent_subsidiary_dba_or_brand_relationship',
  'identity_confidence_state',
  'source_locators_and_exact_retrieval_custody',
  'unresolved_ambiguity_and_alternative_candidates',
  'terminal_row_state'
];

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const decodeEntities = (value) => value
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/\s+/g, ' ')
  .trim();

const observed = (value, sourceIds, note) => ({
  state: 'observed',
  value,
  source_ids: sourceIds,
  note,
  fixed_protocol_complete: true,
  terminal_for_class_closure: true
});

const pending = (note) => ({
  state: 'pending_fixed_public_record_protocol',
  value: null,
  source_ids: [],
  note,
  fixed_protocol_complete: false,
  terminal_for_class_closure: false
});

export function extractRoster(html) {
  const sectionStart = html.indexOf('id="comp-lx2ezme0"');
  if (sectionStart < 0) throw new Error('NatSec100 company-list section missing');
  const nextSection = html.indexOf('<section', sectionStart + 20);
  const section = html.slice(sectionStart, nextSection > sectionStart ? nextSection : html.length);
  const names = [...section.matchAll(/<h4\b[^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h4>/gi)]
    .map((match) => decodeEntities(match[1]))
    .filter(Boolean);
  if (names.length !== 100) throw new Error(`ranked roster denominator ${names.length}`);
  if (new Set(names).size !== 100) throw new Error('ranked roster contains duplicate display names');
  if (names.includes('SpaceX') || names.includes('Anthropic')) throw new Error('bounded controls entered ranked roster');
  return names;
}

export function buildScaffold(root = ROOT) {
  const seed = readJson(SEED_PATH);
  if (seed.class_id !== 'RD-01-C03' || seed.child_issue !== 786) throw new Error('RD-01 seed identity changed');
  if (seed.input_manifest?.combined_sha256 !== EXPECTED_SEED_MANIFEST_SHA256) throw new Error('RD-01 seed manifest changed');

  const receipt = readJson(RECEIPT_PATH);
  if (receipt.schema_version !== 'ssc-rd01-wave02-retained-roster-source@1') throw new Error('source receipt schema changed');
  if (receipt.source_id !== 'NATSEC100-2026-FIRST-PARTY') throw new Error('source identity changed');
  if (receipt.terminal_state !== 'http_success_exact_body_captured' || receipt.resolved !== true) throw new Error('source body is not terminally resolved');
  const bodyPath = path.join(root, receipt.retained.body_path);
  const body = fs.readFileSync(bodyPath);
  if (body.length !== receipt.retained.body_bytes || sha256(body) !== receipt.retained.body_sha256) throw new Error('retained source body custody mismatch');
  const html = body.toString('utf8');
  const names = extractRoster(html);
  const pageText = decodeEntities(html);
  if (!pageText.includes('SpaceX was a frequent point of discussion') || !pageText.includes('limited defense-related contracting activity')) {
    throw new Error('bounded SpaceX methodology example missing');
  }
  if (!pageText.includes('recent IPO filings (e.g., Anthropic) also lead to exclusion')) {
    throw new Error('bounded Anthropic eligibility example missing');
  }

  const sourceIds = ['NATSEC100-2026-FIRST-PARTY'];
  const sourceCustody = {
    source_id: receipt.source_id,
    source_url: receipt.source_url,
    final_url: receipt.final_url,
    retrieved_at: receipt.retrieved_at,
    body_path: receipt.retained.body_path,
    body_bytes: receipt.retained.body_bytes,
    body_sha256: receipt.retained.body_sha256,
    headers_path: receipt.retained.headers_path,
    headers_sha256: receipt.retained.headers_sha256,
    capture_run: receipt.execution.workflow_run,
    capture_artifact: receipt.execution.artifact_id
  };

  const rows = names.map((name, index) => {
    const rank = index + 1;
    return {
      row_id: `NATSEC100-2026-RANK-${String(rank).padStart(3, '0')}`,
      unit_class: 'published_selected_roster_row',
      fields: {
        edition: observed(2026, sourceIds, 'Edition is fixed by the first-party 2026 roster page.'),
        published_rank_or_explicit_nonselection_class: observed({ published_rank: rank, class: 'selected' }, sourceIds, 'Rank is the exact source-order position in the published company list.'),
        published_display_name: observed(name, sourceIds, 'Display name is retained exactly after HTML entity decoding and whitespace normalization.'),
        resolved_legal_entity: pending('Requires the fixed public-record legal-entity protocol.'),
        entity_jurisdiction: pending('Requires authoritative entity registration or equivalent official custody.'),
        entity_identifier_and_authoritative_source: pending('Requires an authoritative entity identifier and exact source receipt.'),
        parent_subsidiary_dba_or_brand_relationship: pending('Brand, DBA, parent, and subsidiary relationships remain unresolved until exact evidence is admitted.'),
        identity_confidence_state: pending('Confidence cannot be assigned before the fixed identity protocol.'),
        source_locators_and_exact_retrieval_custody: observed(sourceCustody, sourceIds, 'This custody proves the published display-name row, not the legal entity behind it.'),
        unresolved_ambiguity_and_alternative_candidates: pending('Alternative legal-entity candidates remain open until searched under the fixed protocol.'),
        terminal_row_state: pending('No row closes at scaffold construction.')
      },
      row_result: {
        fixed_protocol_executed: false,
        legal_entity_resolved: false,
        row_closed: false,
        terminal_state: 'still_open'
      }
    };
  });

  const controls = [
    {
      row_id: 'NATSEC100-2026-CONTROL-SPACEX',
      display_name: 'SpaceX',
      class: 'explicit_assessed_nonselection_example',
      basis: 'The first-party methodology discussion states that SpaceX did not appear in the top 100 and attributes that bounded result to the ranking weights, overall capital base, and limited defense-related contracting activity.'
    },
    {
      row_id: 'NATSEC100-2026-CONTROL-ANTHROPIC',
      display_name: 'Anthropic',
      class: 'explicit_ineligibility_example',
      basis: 'The first-party eligibility text gives recent IPO filings, using Anthropic as the example, as a reason for exclusion.'
    }
  ].map((control) => ({
    row_id: control.row_id,
    unit_class: 'explicit_assessed_nonselection_or_ineligibility_example',
    fields: {
      edition: observed(2026, sourceIds, 'Control example belongs to the same first-party edition.'),
      published_rank_or_explicit_nonselection_class: observed({ published_rank: null, class: control.class }, sourceIds, control.basis),
      published_display_name: observed(control.display_name, sourceIds, 'Display name is explicitly present in the first-party methodology or eligibility discussion.'),
      resolved_legal_entity: pending('Requires the same fixed public-record legal-entity protocol as every selected row.'),
      entity_jurisdiction: pending('Requires authoritative entity registration or equivalent official custody.'),
      entity_identifier_and_authoritative_source: pending('Requires an authoritative entity identifier and exact source receipt.'),
      parent_subsidiary_dba_or_brand_relationship: pending('Brand, parent, and subsidiary relationships remain unresolved.'),
      identity_confidence_state: pending('Confidence cannot be assigned before the fixed identity protocol.'),
      source_locators_and_exact_retrieval_custody: observed(sourceCustody, sourceIds, 'This custody proves only the bounded first-party example and its displayed name.'),
      unresolved_ambiguity_and_alternative_candidates: pending('Alternative legal-entity candidates remain open until searched under the fixed protocol.'),
      terminal_row_state: pending('No control row closes at scaffold construction.')
    },
    row_result: {
      fixed_protocol_executed: false,
      legal_entity_resolved: false,
      row_closed: false,
      terminal_state: 'still_open'
    }
  }));

  const allRows = [...rows, ...controls];
  const scaffold = {
    schema_version: 'ssc-rd-wave02-rd01-roster-scaffold@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-01-C03',
    issue: 786,
    as_of: '2026-08-02',
    title: 'NatSec100 2026 selected-roster and explicit-control legal-entity scaffold',
    status: 'immutable_102_row_scaffold_pending_fixed_legal_entity_protocol',
    parent: {
      seed_path: SEED_PATH,
      seed_input_manifest_sha256: EXPECTED_SEED_MANIFEST_SHA256,
      frozen_execution_base: seed.frozen_execution_base,
      constitution_merge: seed.constitution.merge_commit,
      source_receipt_path: RECEIPT_PATH,
      source_body_sha256: receipt.retained.body_sha256
    },
    denominator_contract: {
      selected_roster_rows: 100,
      explicit_assessed_nonselection_or_ineligibility_rows: 2,
      total_required_rows: 102,
      row_membership_frozen: true,
      source_order_is_rank_order: true,
      silent_row_removal_allowed: false,
      source_count_is_unit_denominator: false,
      complete_rejected_or_ineligible_universe_claimed: false
    },
    required_fields: REQUIRED_FIELDS,
    permitted_terminal_row_states: [
      'exact_legal_entity_resolved',
      'bounded_brand_to_entity_resolution',
      'identity_source_restricted',
      'identity_source_unavailable',
      'identity_ambiguous',
      'still_open'
    ],
    rows: allRows,
    counts: {
      selected_roster_rows: rows.length,
      explicit_control_rows: controls.length,
      total_rows: allRows.length,
      exact_source_bodies: 1,
      fixed_protocol_completed_rows: 0,
      legal_entities_resolved: 0,
      closed_rows: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: 'roster_scaffold_frozen_fixed_legal_entity_protocol_pending',
      exact_102_row_denominator_bound: true,
      fixed_protocol_complete: false,
      class_closed: false,
      reviewed_disposition_changed: false,
      project_blocking: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      published_display_name_is_legal_entity: false,
      brand_similarity_is_entity_identity: false,
      shared_parent_is_coordination: false,
      roster_inclusion_is_technical_superiority: false,
      resolved_identity_is_selection_causation: false,
      two_explicit_control_rows_are_complete_rejected_universe: false,
      missing_public_record_is_entity_absence: false,
      scaffold_completion_is_class_closure: false,
      outside_human_dependency: false,
      graph_effect: 'none'
    }
  };
  fs.mkdirSync(path.dirname(path.join(root, OUTPUT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(root, OUTPUT_PATH), stable(scaffold));
  return scaffold;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scaffold = buildScaffold();
  console.log(`build-rd01-roster-scaffold: ${scaffold.counts.selected_roster_rows} selected + ${scaffold.counts.explicit_control_rows} controls = ${scaffold.counts.total_rows}, class open`);
}
