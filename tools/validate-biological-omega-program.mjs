#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PROGRAM = 'contributions/inbox/research-batches/biological-omega-program.json';
const DEFAULT_SELECTION = 'contributions/inbox/research-batches/biological-omega-selection.json';
const DEFAULT_COVERAGE = 'contributions/inbox/research-batches/biological-omega-coverage.json';
const DEFAULT_SEEDS = 'contributions/inbox/research-batches/biological-omega-discovery-seeds.jsonl';
const DEFAULT_SURFACES = 'contributions/inbox/research-batches/biological-omega-surface-catalog.csv';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXPECTED_CASE_IDS = Array.from({ length: 12 }, (_, i) => `BIO-C${String(i + 1).padStart(2, '0')}`);
const ALLOWED_GAPS = new Set(['open', 'blocking', 'permanent_boundary_until_review']);

const issue = (code, message) => ({ code, message });
const nonempty = (value, min = 1) => typeof value === 'string' && value.trim().length >= min;

function readJson(root, file, errors, code) {
  try { return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8')); }
  catch (error) { errors.push(issue(code, `${file}: ${error.message}`)); return null; }
}

function readJsonl(root, file, errors, code) {
  try {
    return fs.readFileSync(path.resolve(root, file), 'utf8')
      .split(/\r?\n/).filter(Boolean).map((line, index) => {
        try { return JSON.parse(line); }
        catch (error) { errors.push(issue(code, `${file} line ${index + 1}: ${error.message}`)); return null; }
      }).filter(Boolean);
  } catch (error) { errors.push(issue(code, `${file}: ${error.message}`)); return []; }
}

function readCsv(root, file, errors, code) {
  try {
    const rows = fs.readFileSync(path.resolve(root, file), 'utf8').split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) errors.push(issue(code, `${file}: expected header and at least one row.`));
    return rows;
  } catch (error) { errors.push(issue(code, `${file}: ${error.message}`)); return []; }
}

export function validateBiologicalOmegaProgram({
  root = process.cwd(),
  programFile = DEFAULT_PROGRAM,
  selectionFile = DEFAULT_SELECTION,
  coverageFile = DEFAULT_COVERAGE,
  seedsFile = DEFAULT_SEEDS,
  surfacesFile = DEFAULT_SURFACES,
} = {}) {
  const errors = [];
  const program = readJson(root, programFile, errors, 'unreadable-program');
  const selection = readJson(root, selectionFile, errors, 'unreadable-selection');
  const coverage = readJson(root, coverageFile, errors, 'unreadable-coverage');
  const seeds = readJsonl(root, seedsFile, errors, 'unreadable-seeds');
  const surfaces = readCsv(root, surfacesFile, errors, 'unreadable-surfaces');
  if (!program) return { ok: false, errors, summary: null };

  if (program.schema_version !== 'bio-omega-program@1') errors.push(issue('program-schema', 'Expected bio-omega-program@1.'));
  if (program.program_id !== 'biological-omega-control-topology') errors.push(issue('program-id', 'Unexpected program_id.'));
  if (program.program_issue !== 361) errors.push(issue('program-issue', 'Program issue must be #361.'));
  if (program.graph_effect !== 'none') errors.push(issue('program-graph', 'Program graph_effect must be none.'));
  if (program.verification_status !== 'machine_proposed_unverified') errors.push(issue('program-status', 'Program must remain machine_proposed_unverified.'));
  if (!/blocked_pending/.test(program.publication_status ?? '')) errors.push(issue('program-publication', 'Program publication must remain blocked.'));
  if (!nonempty(program.selection_rule, 180) || !/cannot define membership/i.test(program.selection_rule)) errors.push(issue('selection-rule', 'Selection rule must be substantive and target-neutral.'));
  if (!Array.isArray(program.standing_forbidden_inferences) || program.standing_forbidden_inferences.length < 10) errors.push(issue('forbidden-inferences', 'At least ten standing forbidden inferences are required.'));

  const cases = Array.isArray(program.cases) ? program.cases : [];
  if (cases.length !== 12) errors.push(issue('case-count', `Expected 12 cases, found ${cases.length}.`));
  const ids = new Set();
  const batches = new Set();
  for (const row of cases) {
    if (!EXPECTED_CASE_IDS.includes(row.case_id) || ids.has(row.case_id)) errors.push(issue('case-id', `Malformed or duplicate case_id: ${row.case_id}.`));
    ids.add(row.case_id);
    if (!nonempty(row.batch_id) || batches.has(row.batch_id)) errors.push(issue('batch-id', `${row.case_id}: missing or duplicate batch_id.`));
    batches.add(row.batch_id);
    if (row.program_issue !== 361) errors.push(issue('case-issue', `${row.case_id}: program_issue must be 361.`));
    for (const [field, min] of [['title',12],['public_interest_question',80],['selection_unit',40],['selection_universe',60],['acceptance',120]]) {
      if (!nonempty(row[field], min)) errors.push(issue('weak-case-field', `${row.case_id}: ${field} is missing or too weak.`));
    }
    if (!Array.isArray(program.common_case_contract?.source_families) || program.common_case_contract.source_families.length < 4) errors.push(issue('source-families', 'Common case contract requires at least four source families.'));
    if (!Array.isArray(program.common_case_contract?.allowed_predicates) || program.common_case_contract.allowed_predicates.length < 5) errors.push(issue('allowed-predicates', 'Common case contract requires at least five allowed predicates.'));
    if (!Array.isArray(program.common_case_contract?.forbidden_inferences) || program.common_case_contract.forbidden_inferences.length < 5) errors.push(issue('case-inferences', 'Common case contract requires at least five forbidden inferences.'));
    if (row.graph_effect !== 'none' || row.promotes_to !== 'candidate_only') errors.push(issue('case-boundary', `${row.case_id}: candidate-only and graph_effect none required.`));
    if (row.verification_status !== 'machine_proposed_unverified' || !/blocked_pending/.test(row.publication_status ?? '')) errors.push(issue('case-status', `${row.case_id}: invalid verification or publication status.`));
  }
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(EXPECTED_CASE_IDS)) errors.push(issue('case-range', 'Case IDs must be the complete BIO-C01 through BIO-C12 range.'));

  if (selection) {
    if (selection.schema_version !== 'bio-omega-selection@1') errors.push(issue('selection-schema', 'Expected bio-omega-selection@1.'));
    if (selection.lane_id !== program.program_id || selection.program_issue !== 361) errors.push(issue('selection-links', 'Selection lane and issue must match program.'));
    if (selection.manifest !== programFile || selection.coverage !== coverageFile || selection.discovery_seeds !== seedsFile) errors.push(issue('selection-paths', 'Selection file links must match validated files.'));
    if (selection.status !== 'staged' || selection.graph_effect !== 'none') errors.push(issue('selection-state', 'Selection must remain staged with graph_effect none.'));
    if (!nonempty(selection.public_interest_question, 180) || !nonempty(selection.selection_unit, 100) || !nonempty(selection.selection_universe, 150)) errors.push(issue('selection-core', 'Selection core fields are missing or too weak.'));
    if (!Array.isArray(selection.inclusion_rules) || selection.inclusion_rules.length < 4) errors.push(issue('selection-inclusion', 'At least four inclusion rules required.'));
    if (!Array.isArray(selection.exclusion_rules) || selection.exclusion_rules.length < 5) errors.push(issue('selection-exclusion', 'At least five exclusion rules required.'));
    if (selection.comparison?.method !== 'case_specific_declared_universes' || !/regardless of country/i.test(selection.comparison?.symmetry_rule ?? '')) errors.push(issue('selection-symmetry', 'Explicit cross-country and cross-institution symmetry required.'));
    if (!Array.isArray(selection.privacy?.controls) || selection.privacy.controls.length < 7) errors.push(issue('selection-privacy', 'At least seven privacy and security controls required.'));
    if (selection.replicability?.public_reproducible !== true || selection.replicability?.counts_toward_public_coverage !== false) errors.push(issue('selection-replicability', 'Selection contract must be reproducible but not count as evidence.'));
    if (!DATE.test(selection.review?.last_reviewed_at ?? '') || !DATE.test(selection.review?.review_by ?? '') || selection.review?.selection_review_status !== 'pending_second_party') errors.push(issue('selection-review', 'Dated pending second-party review required.'));
    if (!nonempty(selection.review?.sunset_condition, 140) || !nonempty(selection.consumption?.copy_ready_caveat, 240)) errors.push(issue('selection-consumption', 'Sunset and copy-ready caveat must be substantive.'));
  }

  if (coverage) {
    if (coverage.schema_version !== 'bio-omega-coverage@1' || coverage.program_id !== program.program_id || coverage.program_issue !== 361) errors.push(issue('coverage-links', 'Coverage identity must match program.'));
    for (const key of ['completed_receipt_packets','independently_reviewed_cases','promoted_claims','promoted_surfaces','graph_effects','origin_findings']) {
      if (coverage.counts?.[key] !== 0) errors.push(issue('coverage-overstatement', `${key} must remain zero.`));
    }
    if (!Array.isArray(coverage.gaps) || coverage.gaps.length < 5) errors.push(issue('coverage-gaps', 'At least five explicit gaps required.'));
    for (const gap of coverage.gaps ?? []) if (!ALLOWED_GAPS.has(gap.status) || !nonempty(gap.description, 50)) errors.push(issue('coverage-gap', `${gap.gap_id}: invalid gap.`));
    if (coverage.graph_effect !== 'none' || !nonempty(coverage.copy_ready_caveat, 240)) errors.push(issue('coverage-boundary', 'Coverage boundary and caveat required.'));
  }

  if (seeds.length !== 12) errors.push(issue('seed-count', `Expected 12 seeds, found ${seeds.length}.`));
  const seedCases = new Set();
  for (const seed of seeds) {
    if (seed.schema_version !== 'bio-omega-discovery-seed@1' || seed.program_id !== program.program_id || seed.program_issue !== 361) errors.push(issue('seed-links', `${seed.seed_id}: identity mismatch.`));
    if (!ids.has(seed.case_id) || seedCases.has(seed.case_id)) errors.push(issue('seed-case', `${seed.seed_id}: missing or duplicate case link.`));
    seedCases.add(seed.case_id);
    if (!nonempty(seed.research_question, 80) || !nonempty(seed.selection_universe, 60)) errors.push(issue('seed-fields', `${seed.seed_id}: weak research question or universe.`));
    if (seed.graph_effect !== 'none' || seed.public_evidence_effect !== 'none' || seed.status !== 'machine_proposed_unverified' || !/inadmissible_until/.test(seed.publication_status ?? '')) errors.push(issue('seed-boundary', `${seed.seed_id}: invalid boundary.`));
  }

  if (surfaces.length < 13) errors.push(issue('surface-count', `Expected at least 12 surface rows plus header, found ${surfaces.length}.`));
  const surfaceText = surfaces.join('\n');
  for (const required of ['broad_institution_is_not_a_surface', 'co_presence_is_not_coordination', 'graph_effect']) {
    if (!surfaceText.includes(required)) errors.push(issue('surface-boundary', `Surface catalog missing ${required}.`));
  }

  const summary = {
    cases: cases.length,
    seeds: seeds.length,
    surface_rows: Math.max(0, surfaces.length - 1),
    public_evidence_records: coverage?.counts?.completed_receipt_packets ?? null,
    graph_effects: coverage?.counts?.graph_effects ?? null,
    origin_findings: coverage?.counts?.origin_findings ?? null,
  };
  return { ok: errors.length === 0, errors, summary };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const result = validateBiologicalOmegaProgram();
  if (!result.ok) {
    for (const row of result.errors) console.error(`[${row.code}] ${row.message}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, ...result.summary }, null, 2));
}
