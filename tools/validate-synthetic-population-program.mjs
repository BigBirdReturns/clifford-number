#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_FILE = 'contributions/inbox/research-batches/synthetic-population-program.json';
const DEFAULT_SELECTION_FILE = 'contributions/inbox/research-batches/synthetic-population-selection.json';
const DEFAULT_COVERAGE_FILE = 'contributions/inbox/research-batches/synthetic-population-coverage.json';
const DEFAULT_SEEDS_FILE = 'contributions/inbox/research-batches/synthetic-population-discovery-seeds.jsonl';
const EXPECTED_WORKSTREAMS = new Map([
  ['state-market', 4],
  ['legitimacy', 4],
  ['deployment', 4],
  ['substrate', 4],
  ['ownership', 2],
]);
const ALLOWED_DENOMINATORS = new Set(['exact', 'approximate', 'open', 'not_applicable']);
const ALLOWED_GAP_STATUSES = new Set(['open', 'blocking', 'permanent_boundary_until_review']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const nonempty = (value, minimum = 1) =>
  typeof value === 'string' && value.trim().length >= minimum;

const issue = (code, message) => ({ code, message });

function readJson(root, file, errors, code) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'));
  } catch (error) {
    errors.push(issue(code, `${file}: ${error.message}`));
    return null;
  }
}

function readJsonl(root, file, errors, code) {
  try {
    return fs.readFileSync(path.resolve(root, file), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          errors.push(issue(code, `${file} line ${index + 1}: ${error.message}`));
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    errors.push(issue(code, `${file}: ${error.message}`));
    return [];
  }
}

export function validateSyntheticPopulationProgram({
  root = process.cwd(),
  file = DEFAULT_FILE,
  selectionFile = DEFAULT_SELECTION_FILE,
  coverageFile = DEFAULT_COVERAGE_FILE,
  seedsFile = DEFAULT_SEEDS_FILE,
} = {}) {
  const errors = [];
  const program = readJson(root, file, errors, 'unreadable-program');
  const selection = readJson(root, selectionFile, errors, 'unreadable-selection');
  const coverage = readJson(root, coverageFile, errors, 'unreadable-coverage');
  const seeds = readJsonl(root, seedsFile, errors, 'unreadable-seeds');

  if (!program) {
    return { ok: false, errors, summary: null };
  }

  if (program.schema_version !== 'synthetic-population-program@1') {
    errors.push(issue('schema-version', 'Expected synthetic-population-program@1.'));
  }
  if (program.program_id !== 'synthetic-population-infrastructure') {
    errors.push(issue('program-id', 'Unexpected program_id.'));
  }
  if (program.graph_effect !== 'none') {
    errors.push(issue('program-graph-effect', 'Program must carry graph_effect: none.'));
  }
  if (program.verification_status !== 'machine_proposed_unverified') {
    errors.push(issue('program-verification-status', 'Program must remain machine_proposed_unverified.'));
  }
  if (!Number.isInteger(program.program_issue) || program.program_issue !== 30) {
    errors.push(issue('program-issue', 'Program issue must be #30.'));
  }
  if (!Number.isInteger(program.seed_case_issue) || program.seed_case_issue !== 29) {
    errors.push(issue('seed-case-issue', 'Seed case issue must be #29.'));
  }
  if (!nonempty(program.selection_rule, 120) || !/regardless of party/i.test(program.selection_rule)) {
    errors.push(issue('selection-rule', 'Selection rule must be substantive and explicitly symmetric.'));
  }
  if (!Array.isArray(program.standing_forbidden_inferences)
    || program.standing_forbidden_inferences.length < 8) {
    errors.push(issue('standing-inferences', 'At least eight standing forbidden inferences are required.'));
  }

  const cases = Array.isArray(program.cases) ? program.cases : [];
  const frontier = Array.isArray(program.frontier) ? program.frontier : [];
  if (cases.length !== 18) errors.push(issue('case-count', `Expected 18 cases, found ${cases.length}.`));
  if (frontier.length !== 20) errors.push(issue('frontier-count', `Expected 20 frontier candidates, found ${frontier.length}.`));

  const caseIds = new Set();
  const caseById = new Map();
  const batchIds = new Set();
  const caseIssues = new Set();
  const workstreamCounts = new Map();
  for (const row of cases) {
    if (!nonempty(row.case_id) || caseIds.has(row.case_id)) {
      errors.push(issue('duplicate-case-id', `Missing or duplicate case_id: ${JSON.stringify(row.case_id)}.`));
    } else {
      caseIds.add(row.case_id);
      caseById.set(row.case_id, row);
    }

    if (!nonempty(row.batch_id) || batchIds.has(row.batch_id)) {
      errors.push(issue('duplicate-batch-id', `Missing or duplicate batch_id: ${JSON.stringify(row.batch_id)}.`));
    } else batchIds.add(row.batch_id);

    if (!Number.isInteger(row.issue) || caseIssues.has(row.issue)) {
      errors.push(issue('duplicate-case-issue', `Missing or duplicate case issue: ${JSON.stringify(row.issue)}.`));
    } else caseIssues.add(row.issue);

    if (!EXPECTED_WORKSTREAMS.has(row.workstream)) {
      errors.push(issue('unknown-workstream', `${row.case_id}: unknown workstream ${JSON.stringify(row.workstream)}.`));
    } else {
      workstreamCounts.set(row.workstream, (workstreamCounts.get(row.workstream) ?? 0) + 1);
    }

    for (const field of [
      'title',
      'classification',
      'public_interest_question',
      'selection_unit',
      'selection_universe',
      'acceptance',
    ]) {
      const minimum = ['public_interest_question', 'selection_universe', 'acceptance'].includes(field) ? 60 : 12;
      if (!nonempty(row[field], minimum)) {
        errors.push(issue('weak-case-field', `${row.case_id}: ${field} is missing or too weak.`));
      }
    }

    if (!Array.isArray(row.source_families) || row.source_families.length < 3) {
      errors.push(issue('case-source-families', `${row.case_id}: at least three source families are required.`));
    }
    if (!Array.isArray(row.allowed_predicates) || row.allowed_predicates.length < 4) {
      errors.push(issue('case-allowed-predicates', `${row.case_id}: at least four allowed predicates are required.`));
    }
    if (!Array.isArray(row.forbidden_inferences) || row.forbidden_inferences.length < 4) {
      errors.push(issue('case-forbidden-inferences', `${row.case_id}: at least four forbidden inferences are required.`));
    }
    if (row.graph_effect !== 'none') {
      errors.push(issue('case-graph-effect', `${row.case_id}: graph_effect must be none.`));
    }
    if (row.verification_status !== 'machine_proposed_unverified') {
      errors.push(issue('case-verification-status', `${row.case_id}: invalid verification_status.`));
    }
    if (row.publication_status !== 'blocked_pending_receipts_and_human_review') {
      errors.push(issue('case-publication-status', `${row.case_id}: invalid publication_status.`));
    }
  }

  const expectedIssues = Array.from({ length: 18 }, (_, index) => index + 31);
  if (JSON.stringify([...caseIssues].sort((a, b) => a - b)) !== JSON.stringify(expectedIssues)) {
    errors.push(issue('case-issue-range', 'Case issues must be the complete #31 through #48 range.'));
  }
  for (const [workstream, expected] of EXPECTED_WORKSTREAMS) {
    const observed = workstreamCounts.get(workstream) ?? 0;
    if (observed !== expected) {
      errors.push(issue('workstream-count', `${workstream}: expected ${expected}, found ${observed}.`));
    }
  }

  const frontierIds = new Set();
  const candidateIds = new Set();
  for (const row of frontier) {
    if (!/^F-\d{2}$/.test(row.frontier_id ?? '') || frontierIds.has(row.frontier_id)) {
      errors.push(issue('frontier-id', `Missing, malformed, or duplicate frontier_id: ${JSON.stringify(row.frontier_id)}.`));
    } else frontierIds.add(row.frontier_id);

    if (!nonempty(row.candidate_id) || candidateIds.has(row.candidate_id)) {
      errors.push(issue('frontier-candidate-id', `Missing or duplicate candidate_id: ${JSON.stringify(row.candidate_id)}.`));
    } else candidateIds.add(row.candidate_id);

    if (!nonempty(row.title, 12)
      || !nonempty(row.research_question, 50)
      || !nonempty(row.promotion_condition, 30)) {
      errors.push(issue('weak-frontier-row', `${row.frontier_id}: title, question, and promotion condition are required.`));
    }
    if (row.issue !== 49) errors.push(issue('frontier-issue', `${row.frontier_id}: issue must be #49.`));
    if (row.graph_effect !== 'none') errors.push(issue('frontier-graph-effect', `${row.frontier_id}: graph_effect must be none.`));
    if (row.verification_status !== 'investigative_hypothesis') {
      errors.push(issue('frontier-verification-status', `${row.frontier_id}: invalid verification_status.`));
    }
    if (row.publication_status !== 'inadmissible_until_promoted_to_bounded_case') {
      errors.push(issue('frontier-publication-status', `${row.frontier_id}: invalid publication_status.`));
    }
  }

  const expectedFrontierIds = Array.from({ length: 20 }, (_, index) => `F-${String(index + 1).padStart(2, '0')}`);
  if (JSON.stringify([...frontierIds].sort()) !== JSON.stringify(expectedFrontierIds)) {
    errors.push(issue('frontier-id-range', 'Frontier IDs must be the complete F-01 through F-20 range.'));
  }

  if (program.counts?.seed_cases !== 1
    || program.counts?.bounded_child_cases !== cases.length
    || program.counts?.frontier_candidates !== frontier.length) {
    errors.push(issue('declared-counts', 'Declared counts must match the program arrays.'));
  }
  if (program.review?.required !== 'human'
    || !nonempty(program.review?.promotion_path, 40)
    || !nonempty(program.review?.cross_case_rule, 60)) {
    errors.push(issue('review-contract', 'Human review, promotion path, and cross-case rule are required.'));
  }

  if (selection) {
    if (selection.schema_version !== 'synthetic-population-selection@1') {
      errors.push(issue('selection-schema-version', 'Expected synthetic-population-selection@1.'));
    }
    if (selection.lane_id !== program.program_id) {
      errors.push(issue('selection-lane-id', 'Selection lane_id must equal the program_id.'));
    }
    if (selection.status !== 'staged') errors.push(issue('selection-status', 'Selection status must remain staged.'));
    if (selection.program_issue !== program.program_issue || selection.seed_case_issue !== program.seed_case_issue) {
      errors.push(issue('selection-issue-links', 'Selection issue links must match the program.'));
    }
    if (selection.manifest !== file) errors.push(issue('selection-manifest-link', 'Selection manifest path must match the validated program file.'));
    if (!nonempty(selection.public_interest_question, 120)
      || !nonempty(selection.selection_unit, 80)
      || !nonempty(selection.selection_universe, 120)) {
      errors.push(issue('selection-core-fields', 'Selection question, unit, and universe are missing or too weak.'));
    }
    if (!Array.isArray(selection.inclusion_rules) || selection.inclusion_rules.length < 3) {
      errors.push(issue('selection-inclusion-rules', 'At least three inclusion rules are required.'));
    }
    if (!Array.isArray(selection.exclusion_rules) || selection.exclusion_rules.length < 3) {
      errors.push(issue('selection-exclusion-rules', 'At least three exclusion rules are required.'));
    }
    if (selection.comparison?.method !== 'case_specific_declared_universes'
      || !nonempty(selection.comparison?.comparator_class, 100)
      || !nonempty(selection.comparison?.symmetry_rule, 140)
      || !/regardless of party/i.test(selection.comparison?.symmetry_rule ?? '')) {
      errors.push(issue('selection-comparison', 'Case-specific comparator and explicit symmetry rules are required.'));
    }
    if (!Array.isArray(selection.privacy?.controls) || selection.privacy.controls.length < 4) {
      errors.push(issue('selection-privacy', 'At least four selection-layer privacy controls are required.'));
    }
    if (selection.replicability?.public_reproducible !== true
      || selection.replicability?.counts_toward_public_coverage !== false) {
      errors.push(issue('selection-replicability', 'Program contracts must be public and must not count as evidentiary coverage.'));
    }
    if (!DATE.test(selection.review?.last_reviewed_at ?? '')
      || !DATE.test(selection.review?.review_by ?? '')
      || selection.review?.selection_review_status !== 'pending_second_party'
      || !nonempty(selection.review?.sunset_condition, 100)) {
      errors.push(issue('selection-review', 'Dated pending second-party review and a substantive sunset condition are required.'));
    }
    if (!nonempty(selection.consumption?.copy_ready_caveat, 180)) {
      errors.push(issue('selection-consumption', 'A substantive copy-ready selection caveat is required.'));
    }
    if (selection.graph_effect !== 'none') errors.push(issue('selection-graph-effect', 'Selection declaration must carry graph_effect: none.'));
  }

  const seedIds = new Set();
  const seedCaseIds = new Set();
  const seedIssues = new Set();
  if (seeds.length !== 18) errors.push(issue('seed-count', `Expected 18 discovery seeds, found ${seeds.length}.`));
  for (const seed of seeds) {
    if (seed.schema_version !== 'synthetic-population-discovery-seed@1') {
      errors.push(issue('seed-schema-version', `${seed.seed_id ?? '<unknown>'}: invalid schema_version.`));
    }
    if (!nonempty(seed.seed_id) || seedIds.has(seed.seed_id)) {
      errors.push(issue('duplicate-seed-id', `Missing or duplicate seed_id: ${JSON.stringify(seed.seed_id)}.`));
    } else seedIds.add(seed.seed_id);

    if (!nonempty(seed.case_id) || seedCaseIds.has(seed.case_id)) {
      errors.push(issue('duplicate-seed-case', `Missing or duplicate seed case_id: ${JSON.stringify(seed.case_id)}.`));
    } else seedCaseIds.add(seed.case_id);

    if (!Number.isInteger(seed.issue) || seedIssues.has(seed.issue)) {
      errors.push(issue('duplicate-seed-issue', `Missing or duplicate seed issue: ${JSON.stringify(seed.issue)}.`));
    } else seedIssues.add(seed.issue);

    const matchingCase = caseById.get(seed.case_id);
    if (!matchingCase) {
      errors.push(issue('seed-unknown-case', `${seed.seed_id}: references unknown case ${JSON.stringify(seed.case_id)}.`));
    } else {
      if (seed.issue !== matchingCase.issue) errors.push(issue('seed-case-issue-mismatch', `${seed.seed_id}: issue does not match its case.`));
      if (seed.workstream !== matchingCase.workstream) errors.push(issue('seed-workstream-mismatch', `${seed.seed_id}: workstream does not match its case.`));
    }

    if (seed.program_id !== program.program_id || seed.topic !== 'synthetic-population') {
      errors.push(issue('seed-program-link', `${seed.seed_id}: program_id and topic must link to this program.`));
    }
    if (seed.source_class !== 'machine_proposed_case_contract'
      || seed.source_availability !== 'available'
      || !/^https:\/\/github\.com\/BigBirdReturns\/clifford-number\/issues\/\d+$/.test(seed.source_url ?? '')) {
      errors.push(issue('seed-source-contract', `${seed.seed_id}: invalid source contract.`));
    }
    if (!nonempty(seed.title, 12) || !nonempty(seed.bounded_action, 100)) {
      errors.push(issue('seed-action', `${seed.seed_id}: title or bounded_action is too weak.`));
    }
    if (!Array.isArray(seed.allowed_predicates) || seed.allowed_predicates.length < 4) {
      errors.push(issue('seed-allowed-predicates', `${seed.seed_id}: at least four allowed predicates are required.`));
    }
    if (!Array.isArray(seed.forbidden_inferences) || seed.forbidden_inferences.length < 4) {
      errors.push(issue('seed-forbidden-inferences', `${seed.seed_id}: at least four forbidden inferences are required.`));
    }
    if (!nonempty(seed.privacy_handling, 80)) {
      errors.push(issue('seed-privacy', `${seed.seed_id}: privacy handling is missing or too weak.`));
    }
    if (seed.graph_effect !== 'none') errors.push(issue('seed-graph-effect', `${seed.seed_id}: graph_effect must be none.`));
    if (seed.verification_status !== 'machine_proposed_unverified') {
      errors.push(issue('seed-verification-status', `${seed.seed_id}: invalid verification_status.`));
    }
    if (seed.publication_status !== 'blocked_pending_receipts_and_human_review') {
      errors.push(issue('seed-publication-status', `${seed.seed_id}: invalid publication_status.`));
    }
  }
  if (JSON.stringify([...seedCaseIds].sort()) !== JSON.stringify([...caseIds].sort())) {
    errors.push(issue('seed-case-coverage', 'Discovery seeds must cover every bounded case exactly once.'));
  }
  if (JSON.stringify([...seedIssues].sort((a, b) => a - b)) !== JSON.stringify(expectedIssues)) {
    errors.push(issue('seed-issue-range', 'Discovery seed issues must be the complete #31 through #48 range.'));
  }

  let metricById = new Map();
  if (coverage) {
    if (coverage.schema_version !== 'synthetic-population-coverage@1') {
      errors.push(issue('coverage-schema-version', 'Expected synthetic-population-coverage@1.'));
    }
    if (coverage.lane_id !== program.program_id) errors.push(issue('coverage-lane-id', 'Coverage lane_id must equal the program_id.'));
    if (!DATE.test(coverage.captured_at ?? '')) errors.push(issue('coverage-capture-date', 'Coverage capture date must be YYYY-MM-DD.'));
    if (coverage.coverage_state !== 'staged_program_contracts_only') {
      errors.push(issue('coverage-state', 'Coverage state must remain staged_program_contracts_only.'));
    }
    if (coverage.counts_toward_public_progress !== false) {
      errors.push(issue('coverage-public-progress', 'Staged program architecture cannot count as public evidentiary progress.'));
    }
    if (!Array.isArray(coverage.metrics) || coverage.metrics.length < 8) {
      errors.push(issue('coverage-metrics', 'At least eight coverage metrics are required.'));
    } else {
      for (const metric of coverage.metrics) {
        if (!nonempty(metric.metric_id) || metricById.has(metric.metric_id)) {
          errors.push(issue('duplicate-coverage-metric', `Missing or duplicate metric_id: ${JSON.stringify(metric.metric_id)}.`));
          continue;
        }
        metricById.set(metric.metric_id, metric);
        if (!nonempty(metric.unit) || !ALLOWED_DENOMINATORS.has(metric.denominator_kind)) {
          errors.push(issue('invalid-coverage-metric', `${metric.metric_id}: unit or denominator_kind is invalid.`));
        }
        if (!Number.isFinite(metric.observed) || metric.observed < 0) {
          errors.push(issue('invalid-coverage-count', `${metric.metric_id}: observed must be a non-negative number.`));
        }
        if (metric.expected !== null && (!Number.isFinite(metric.expected) || metric.expected < 0)) {
          errors.push(issue('invalid-coverage-count', `${metric.metric_id}: expected must be null or non-negative.`));
        }
        if (metric.denominator_kind === 'exact'
          && Number.isFinite(metric.expected)
          && metric.observed > metric.expected) {
          errors.push(issue('coverage-exceeds-denominator', `${metric.metric_id}: observed exceeds exact expected count.`));
        }
        if (metric.publicly_reproducible !== true || metric.counts_toward_public_progress !== false) {
          errors.push(issue('coverage-metric-accounting', `${metric.metric_id}: metrics must be reproducible and excluded from public evidentiary progress.`));
        }
      }
    }

    const requiredMetrics = {
      program_contracts: [1, 1],
      bounded_case_contracts: [18, 18],
      frontier_candidate_questions: [20, 20],
      case_discovery_seeds: [18, 18],
      source_complete_vendor_denominators: [1, 0],
      case_receipt_packets: [18, 0],
      independently_reviewed_cases: [18, 0],
      compiled_graph_effects: [0, 0],
    };
    for (const [metricId, [expected, observed]] of Object.entries(requiredMetrics)) {
      const metric = metricById.get(metricId);
      if (!metric || metric.expected !== expected || metric.observed !== observed) {
        errors.push(issue('required-coverage-metric', `${metricId}: expected ${expected}/${observed} expected/observed.`));
      }
    }

    if (!Array.isArray(coverage.known_gaps) || coverage.known_gaps.length < 4) {
      errors.push(issue('coverage-gaps', 'At least four current coverage gaps are required.'));
    } else {
      const gapIds = new Set();
      for (const gap of coverage.known_gaps) {
        if (!nonempty(gap.gap_id) || gapIds.has(gap.gap_id)) {
          errors.push(issue('duplicate-coverage-gap', `Missing or duplicate gap_id: ${JSON.stringify(gap.gap_id)}.`));
        } else gapIds.add(gap.gap_id);
        if (!ALLOWED_GAP_STATUSES.has(gap.status)
          || !nonempty(gap.description, 80)
          || !nonempty(gap.next_action, 70)) {
          errors.push(issue('weak-coverage-gap', `${gap.gap_id ?? '<unknown>'}: status, description, or next_action is invalid.`));
        }
      }
    }
    if (!nonempty(coverage.consumption?.copy_ready_caveat, 160)) {
      errors.push(issue('coverage-consumption', 'A substantive copy-ready coverage caveat is required.'));
    }
    if (coverage.graph_effect !== 'none') errors.push(issue('coverage-graph-effect', 'Coverage accounting must carry graph_effect: none.'));
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      cases: cases.length,
      frontier: frontier.length,
      seeds: seeds.length,
      workstreams: Object.fromEntries([...workstreamCounts].sort()),
      issue_range: caseIssues.size ? [Math.min(...caseIssues), Math.max(...caseIssues)] : null,
      selection_status: selection?.status ?? null,
      coverage_state: coverage?.coverage_state ?? null,
      graph_effect: program.graph_effect,
    },
  };
}

export function formatSyntheticPopulationProgramErrors(errors) {
  return errors.map(error => `- [${error.code}] ${error.message}`).join('\n');
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const rootArg = process.argv.find(arg => arg.startsWith('--root='));
  const fileArg = process.argv.find(arg => arg.startsWith('--file='));
  const selectionArg = process.argv.find(arg => arg.startsWith('--selection='));
  const coverageArg = process.argv.find(arg => arg.startsWith('--coverage='));
  const seedsArg = process.argv.find(arg => arg.startsWith('--seeds='));
  const result = validateSyntheticPopulationProgram({
    root: rootArg ? rootArg.slice('--root='.length) : process.cwd(),
    file: fileArg ? fileArg.slice('--file='.length) : DEFAULT_FILE,
    selectionFile: selectionArg ? selectionArg.slice('--selection='.length) : DEFAULT_SELECTION_FILE,
    coverageFile: coverageArg ? coverageArg.slice('--coverage='.length) : DEFAULT_COVERAGE_FILE,
    seedsFile: seedsArg ? seedsArg.slice('--seeds='.length) : DEFAULT_SEEDS_FILE,
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.ok) {
    console.error(`Synthetic-population program failed with ${result.errors.length} error(s):\n${formatSyntheticPopulationProgramErrors(result.errors)}`);
  } else {
    console.log(`Synthetic-population program: OK (${result.summary.cases} cases; ${result.summary.frontier} frontier candidates; ${result.summary.seeds} discovery seeds)`);
  }
  if (!result.ok) process.exitCode = 1;
}
