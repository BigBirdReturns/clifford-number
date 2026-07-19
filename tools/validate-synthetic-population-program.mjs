#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_FILE = 'contributions/inbox/research-batches/synthetic-population-program.json';
const EXPECTED_WORKSTREAMS = new Map([
  ['state-market', 4],
  ['legitimacy', 4],
  ['deployment', 4],
  ['substrate', 4],
  ['ownership', 2],
]);

const nonempty = (value, minimum = 1) =>
  typeof value === 'string' && value.trim().length >= minimum;

const issue = (code, message) => ({ code, message });

export function validateSyntheticPopulationProgram({
  root = process.cwd(),
  file = DEFAULT_FILE,
} = {}) {
  const errors = [];
  const resolved = path.resolve(root, file);
  let program;
  try {
    program = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      errors: [issue('unreadable-program', `${file}: ${error.message}`)],
      summary: null,
    };
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
  const batchIds = new Set();
  const caseIssues = new Set();
  const workstreamCounts = new Map();
  for (const row of cases) {
    if (!nonempty(row.case_id) || caseIds.has(row.case_id)) {
      errors.push(issue('duplicate-case-id', `Missing or duplicate case_id: ${JSON.stringify(row.case_id)}.`));
    } else caseIds.add(row.case_id);

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

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      cases: cases.length,
      frontier: frontier.length,
      workstreams: Object.fromEntries([...workstreamCounts].sort()),
      issue_range: caseIssues.size ? [Math.min(...caseIssues), Math.max(...caseIssues)] : null,
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
  const result = validateSyntheticPopulationProgram({
    root: rootArg ? rootArg.slice('--root='.length) : process.cwd(),
    file: fileArg ? fileArg.slice('--file='.length) : DEFAULT_FILE,
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.ok) {
    console.error(`Synthetic-population program failed with ${result.errors.length} error(s):\n${formatSyntheticPopulationProgramErrors(result.errors)}`);
  } else {
    console.log(`Synthetic-population program: OK (${result.summary.cases} cases; ${result.summary.frontier} frontier candidates)`);
  }
  if (!result.ok) process.exitCode = 1;
}
