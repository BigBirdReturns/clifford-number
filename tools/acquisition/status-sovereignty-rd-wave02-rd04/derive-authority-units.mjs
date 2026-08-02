#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
export const V2_ARTIFACT = path.resolve(
  process.env.RD04_CROSSREF_V2_ARTIFACT || '/tmp/rd04-cross-references-v2'
);
export const OUTPUT = path.resolve(
  process.env.RD04_AUTHORITY_UNIT_OUTPUT || '/tmp/rd04-authority-units'
);
export const RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/cross-reference-receipt.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };

const EXPECTED_CLASS_COUNTS = Object.freeze({
  california_all_county_information_notice: 3,
  california_all_county_letter: 28,
  california_bill: 2,
  california_handbook: 1,
  california_manual_section: 16,
  california_statute_section: 10,
  federal_guidance_document: 3,
  federal_regulation_section: 8,
  federal_statute: 8
});

function verifyV2Artifact() {
  const branchReceipt = readJson(RECEIPT_PATH);
  const registryPath = path.join(V2_ARTIFACT, 'registry.json');
  const deltaPath = path.join(V2_ARTIFACT, 'delta.json');
  const receiptPath = path.join(V2_ARTIFACT, 'receipt.json');
  ok(fs.existsSync(registryPath) && fs.existsSync(deltaPath) && fs.existsSync(receiptPath), 'v2 artifact incomplete');
  const registryBytes = fs.readFileSync(registryPath);
  const deltaBytes = fs.readFileSync(deltaPath);
  ok(registryBytes.length === branchReceipt.execution.registry_bytes, 'v2 registry byte count changed');
  ok(sha256(registryBytes) === branchReceipt.execution.registry_sha256, 'v2 registry digest changed');
  ok(deltaBytes.length === branchReceipt.execution.delta_bytes, 'v2 delta byte count changed');
  ok(sha256(deltaBytes) === branchReceipt.execution.delta_sha256, 'v2 delta digest changed');
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const receipt = readJson(receiptPath);
  ok(registry.extraction_contract?.grammar_version === 'rd04-version-cross-reference-grammar@2', 'v2 grammar changed');
  ok(registry.counts?.unique_reference_ids === 154, 'v2 reference denominator changed');
  ok(registry.counts?.new_cross_reference_candidates === 140, 'v2 candidate denominator changed');
  ok(receipt.parser_repair_complete === true && receipt.class_closed === false, 'v2 authority ceiling changed');
  return { registry, branchReceipt };
}

function rootSection(referenceId, prefix) {
  const match = referenceId.slice(prefix.length).match(/^(\d+(?:\.\d+)?)/);
  ok(match, `${referenceId}: missing root section`);
  return match[1];
}

export function authorityClass(referenceClass) {
  if (referenceClass === 'cfr') return 'federal_regulation_section';
  if ([
    'usc',
    'food_and_nutrition_act_2008',
    'fiscal_responsibility_act_2023',
    'one_big_beautiful_bill_act_2025',
    'prwora_1996',
    'indian_health_care_improvement_act',
    'trade_act_1974',
    'public_law',
    'house_bill',
    'statutory_section'
  ].includes(referenceClass)) return 'federal_statute';
  if ([
    'california_welfare_and_institutions_code',
    'california_health_and_safety_code'
  ].includes(referenceClass)) return 'california_statute_section';
  if (referenceClass === 'california_manual_of_policies_and_procedures') {
    return 'california_manual_section';
  }
  if (referenceClass === 'california_all_county_letter') {
    return 'california_all_county_letter';
  }
  if (referenceClass === 'california_all_county_information_notice') {
    return 'california_all_county_information_notice';
  }
  if (['california_assembly_bill', 'california_senate_bill'].includes(referenceClass)) {
    return 'california_bill';
  }
  if (referenceClass === 'california_abawd_handbook') return 'california_handbook';
  if (['fns_handbook', 'fns_memo'].includes(referenceClass)) {
    return 'federal_guidance_document';
  }
  throw new Error(`unmapped reference class ${referenceClass}`);
}

export function authorityUnitId(referenceId, referenceClass) {
  if (referenceClass === 'cfr') {
    const match = referenceId.match(/^(\d+)-CFR-(\d+(?:\.\d+)?)/);
    ok(match, `${referenceId}: malformed CFR ID`);
    return `AUTH-${match[1]}-CFR-${match[2]}`;
  }
  if (referenceClass === 'usc') {
    const match = referenceId.match(/^(\d+)-USC-(\d+(?:\.\d+)?)/);
    ok(match, `${referenceId}: malformed USC ID`);
    return `AUTH-${match[1]}-USC-${match[2]}`;
  }
  if (referenceClass === 'california_welfare_and_institutions_code') {
    return `AUTH-CA-WIC-${rootSection(referenceId, 'CA-WIC-')}`;
  }
  if (referenceClass === 'california_health_and_safety_code') {
    return `AUTH-CA-HSC-${rootSection(referenceId, 'CA-HSC-')}`;
  }
  if (referenceClass === 'california_manual_of_policies_and_procedures') {
    const base = referenceId.slice('CA-MPP-'.length).replace(/\(.*$/, '');
    ok(/^\d{2}-\d{3}(?:\.\d+)?$/.test(base), `${referenceId}: malformed MPP ID`);
    return `AUTH-CA-MPP-${base}`;
  }
  if (referenceId.startsWith('US-FNA-2008')) return 'AUTH-US-FNA-2008';
  if (referenceId.startsWith('US-FRA-2023')) return 'AUTH-US-FRA-2023';
  if (referenceId.startsWith('US-TRADE-ACT-1974')) return 'AUTH-US-TRADE-ACT-1974';
  return `AUTH-${referenceId}`;
}

export function locatorStrategy(unitClass) {
  return {
    california_all_county_letter: 'cdss_exact_identifier_archive',
    california_all_county_information_notice: 'cdss_exact_identifier_archive',
    california_bill: 'california_legislative_information_exact_bill',
    california_handbook: 'cdss_exact_document_or_archive',
    california_manual_section: 'cdss_manual_exact_section_and_revision_history',
    california_statute_section: 'california_legislative_information_exact_code_section',
    federal_guidance_document: 'usda_fns_exact_title_and_archive',
    federal_regulation_section: 'ecfr_exact_title_section_and_history',
    federal_statute: 'govinfo_or_uscode_house_exact_title_section'
  }[unitClass];
}

export function deriveUnits(references) {
  const candidates = references.filter(
    (row) => row.disposition === 'new_cross_reference_candidate'
  );
  const groups = new Map();
  for (const reference of candidates) {
    const unitClass = authorityClass(reference.reference_class);
    const unitId = authorityUnitId(reference.reference_id, reference.reference_class);
    const row = groups.get(unitId) || {
      authority_unit_id: unitId,
      authority_class: unitClass,
      locator_strategy: locatorStrategy(unitClass),
      reference_ids: [],
      reference_classes: new Set(),
      source_ids: new Set(),
      occurrence_count: 0,
      source_occurrences: {},
      identity_state:
        unitId === 'AUTH-CA-HSC-1231110'
          ? 'possible_source_typographical_alias_pending_adjudication'
          : 'unadjudicated_exact_reference_unit',
      source_state: 'fixed_protocol_not_yet_executed',
      chronology_state: 'not_adjudicated',
      version_edges_adjudicated: 0,
      class_effect: 'none'
    };
    ok(row.authority_class === unitClass, `${unitId}: authority-class conflict`);
    row.reference_ids.push(reference.reference_id);
    row.reference_classes.add(reference.reference_class);
    row.occurrence_count += reference.occurrence_count;
    for (const sourceId of reference.source_ids) row.source_ids.add(sourceId);
    for (const occurrence of reference.occurrences) {
      row.source_occurrences[occurrence.source_id] =
        (row.source_occurrences[occurrence.source_id] || 0) + 1;
    }
    groups.set(unitId, row);
  }

  return [...groups.values()]
    .sort((a, b) => a.authority_unit_id.localeCompare(b.authority_unit_id))
    .map((row) => ({
      ...row,
      reference_ids: [...new Set(row.reference_ids)].sort(),
      reference_classes: [...row.reference_classes].sort(),
      source_ids: [...row.source_ids].sort(),
      source_occurrences: Object.fromEntries(
        Object.entries(row.source_occurrences).sort(([a], [b]) => a.localeCompare(b))
      )
    }));
}

function countByClass(units) {
  const counts = {};
  for (const unit of units) {
    counts[unit.authority_class] = (counts[unit.authority_class] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function main() {
  const { registry, branchReceipt } = verifyV2Artifact();
  const units = deriveUnits(registry.references);
  const mappedReferenceIds = units.flatMap((unit) => unit.reference_ids);
  const candidateReferenceIds = registry.references
    .filter((row) => row.disposition === 'new_cross_reference_candidate')
    .map((row) => row.reference_id)
    .sort();

  ok(units.length === 79, `authority unit denominator ${units.length}`);
  ok(mappedReferenceIds.length === 140, `mapped reference denominator ${mappedReferenceIds.length}`);
  ok(new Set(mappedReferenceIds).size === 140, 'candidate reference mapped more than once');
  ok(
    JSON.stringify([...mappedReferenceIds].sort()) === JSON.stringify(candidateReferenceIds),
    'candidate-reference mapping is incomplete or expanded'
  );
  const classCounts = countByClass(units);
  ok(JSON.stringify(classCounts) === JSON.stringify(EXPECTED_CLASS_COUNTS), 'authority class counts changed');
  ok(units.filter((unit) => unit.identity_state.includes('typographical')).length === 1, 'HSC typo custody changed');

  const product = {
    schema_version: 'ssc-rd-wave02-rd04-authority-unit-denominator@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    as_of: '2026-08-02',
    parent_cross_reference: {
      workflow_run: branchReceipt.execution.workflow_run,
      artifact_id: branchReceipt.execution.artifact_id,
      artifact_zip_sha256: branchReceipt.execution.artifact_zip_sha256,
      registry_sha256: branchReceipt.execution.registry_sha256,
      grammar: branchReceipt.grammar.version,
      reference_ids: 154,
      seed_alias_reference_ids: 14,
      new_cross_reference_candidates: 140
    },
    denominator_contract: {
      mapping_scope: 'all_new_cross_reference_candidates_exactly_once',
      grouping_law: [
        'CFR and USC subsection references group only to the exact title and root section',
        'WIC and HSC subsection references group only to the exact code and root section',
        'MPP paragraph references group only to the exact numbered manual section',
        'named document identifiers remain one document unit',
        'named act and exact act-section references may share one act unit',
        'no source availability, expected result, or ideological salience affects grouping'
      ],
      source_count_is_unit_denominator: false,
      silent_reference_removal_allowed: false,
      cross_class_identity_merge_allowed: false,
      outcome_selected_grouping: false
    },
    seed_source_units: {
      count: 14,
      state: 'preserved_separately_from_cross_reference_candidate_units',
      unresolved_source_ids: ['FED-PL119-21']
    },
    authority_units: units,
    counts: {
      cross_reference_ids: 154,
      seed_alias_reference_ids: 14,
      candidate_reference_ids: 140,
      candidate_reference_ids_mapped: mappedReferenceIds.length,
      candidate_authority_units: units.length,
      seed_source_units: 14,
      preadjudication_execution_units: units.length + 14,
      authority_class_counts: classCounts,
      source_acquisitions_executed: 0,
      source_acquisitions_terminal: 0,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: 'seventy_nine_candidate_authority_units_frozen_source_acquisition_pending',
      authority_unit_denominator_frozen: true,
      all_candidate_reference_ids_mapped_exactly_once: true,
      source_acquisition_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      stage: 'execute_fixed_public_source_protocol_for_all_seventy_nine_candidate_units_and_the_one_unresolved_seed_source',
      maximum_attempts_per_locator: 2,
      outcome_selected_retry: false,
      missing_source_is_record_absence: false,
      failed_source_is_noncompliance: false,
      outside_human_dependency: false
    },
    boundaries: {
      authority_unit_is_controlling_authority: false,
      reference_group_is_version_edge: false,
      source_locator_is_source_custody: false,
      source_failure_is_record_absence: false,
      source_failure_is_noncompliance: false,
      possible_typographical_alias_is_same_source: false,
      grouping_changes_reviewed_disposition: false,
      graph_effect: 'none'
    }
  };

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  writeJson(path.join(OUTPUT, 'authority-units.json'), product);
  const bytes = fs.readFileSync(path.join(OUTPUT, 'authority-units.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-authority-unit-receipt@1',
    parent_cross_reference_artifact_id: branchReceipt.execution.artifact_id,
    product_path: 'authority-units.json',
    product_bytes: bytes.length,
    product_sha256: sha256(bytes),
    counts: product.counts,
    terminal_state: product.current_result.terminal_state,
    class_closed: false,
    outside_human_dependency: false
  });

  console.log(
    `derive-authority-units: ${mappedReferenceIds.length}/140 references -> ` +
      `${units.length} candidate units; preadjudication execution units ${units.length + 14}`
  );
  return product;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
