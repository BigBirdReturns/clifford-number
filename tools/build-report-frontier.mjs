#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root, writeJson } from './lib/ledger.mjs';

export const REPORT_FRONTIER_SCHEMA_VERSION = 'report-frontier@1';

const TERMINAL_TRAIL_STATES = new Set([
  'terminal_confirmed',
  'terminal_rejected',
  'terminal_unavailable',
  'surface_complete',
  'unavailable_after_search',
  'identity_unresolved_after_search'
]);

function countBy(rows, field) {
  const counts = {};
  for (const row of rows ?? []) {
    const value = row?.[field] ?? 'unspecified';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) ?? 0), 0);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function readOptionalJsonl(file) {
  return readJsonl(file, { optional: true });
}

function currentStage({ native, manifest }) {
  if (manifest?.publication?.status === 'approved') return 'approved_publication';
  if (manifest) return 'structured_report';
  if (native) return 'case_ledger';
  return 'intake_or_projection';
}

function nextTransition({ native, manifest, verifiedClaims }) {
  if (manifest?.publication?.status === 'approved') return 'correction_and_version_maintenance';
  if (manifest && verifiedClaims > 0) return 'provisional_publication_and_adversarial_challenge';
  if (manifest) return 'evidence_upgrade';
  if (!native) return 'case_ledger_migration';
  if (verifiedClaims === 0) return 'evidence_upgrade';
  return 'structured_report_specification';
}

function caseBlockers({ native, manifest, queue, verifiedClaims, reviewRequiredClaims }) {
  if (manifest) return [...(queue?.blocking_reasons ?? [])];
  const blockers = [];
  if (!native) blockers.push('canonical_case_ledger_missing');
  if (native && verifiedClaims === 0) blockers.push('no_verified_claims');
  if (reviewRequiredClaims > 0) blockers.push(`${reviewRequiredClaims}_claims_review_required`);
  blockers.push('structured_report_not_declared');
  return blockers;
}

export function buildReportFrontier() {
  const caseIndex = readJson('build/cases/index.json');
  const briefingIndex = readJson('build/briefings/index.json');
  const reviewQueue = readJson('build/review/reporter-briefing-queue.json');
  const publicCatalog = readJson('build/public-catalog.json');

  const nativeById = new Map((caseIndex.cases ?? []).map(item => [item.case_id, item]));
  const publicById = new Map((publicCatalog.cases ?? []).map(item => [item.case_id, item]));
  const briefingByCase = new Map((briefingIndex.briefings ?? []).map(item => [item.case_id, item]));
  const queueByCase = new Map((reviewQueue.queue ?? []).map(item => [item.case_id, item]));
  const manifestByCase = new Map((briefingIndex.briefings ?? []).map(entry => [
    entry.case_id,
    readJson(`build/briefings/${entry.briefing_id}.json`)
  ]));

  const caseIds = unique([...nativeById.keys(), ...publicById.keys()]).sort();
  const cases = caseIds.map(caseId => {
    const native = nativeById.get(caseId);
    const publicEntry = publicById.get(caseId);
    const reportEntry = briefingByCase.get(caseId);
    const manifest = manifestByCase.get(caseId);
    const queue = queueByCase.get(caseId);
    const claimCounts = native?.claim_status_counts ?? publicEntry?.claim_status_counts ?? {};
    const verifiedClaims = claimCounts.verified ?? 0;
    const reviewRequiredClaims = claimCounts.review_required ?? 0;
    return {
      case_id: caseId,
      title: native?.title ?? publicEntry?.title ?? caseId,
      case_state: native ? 'case_ledger' : 'legacy_projection',
      current_stage: currentStage({ native, manifest }),
      next_transition: nextTransition({ native, manifest, verifiedClaims }),
      report_state: manifest?.publication?.status ?? 'not_declared',
      report_id: reportEntry?.briefing_id ?? null,
      report_version: manifest?.publication?.version ?? null,
      claims: {
        total: native?.counts?.claims ?? publicEntry?.counts?.claims ?? 0,
        verified: verifiedClaims,
        review_required: reviewRequiredClaims
      },
      receipts: native?.counts?.receipts ?? publicEntry?.counts?.receipts ?? 0,
      trails: native?.counts?.trails ?? 0,
      source_trails_linked_to_report: manifest?.counts?.source_trails ?? 0,
      judgment_state: queue?.judgment_state ?? (verifiedClaims > 0 ? 'candidate_judgment' : 'observation_only'),
      provisional_publication_eligible: queue?.provisional_publication_eligible ?? false,
      blockers: caseBlockers({ native, manifest, queue, verifiedClaims, reviewRequiredClaims }),
      scope_limits: queue?.scope_limits ?? [],
      clearance_conditions: queue?.clearance_conditions ?? [],
      review_dependency: queue?.review_dependency ?? { required_to_decide: false, effect: 'not_applicable' },
      graph_effect: 'none'
    };
  });

  const sourceTrailIds = new Set([...manifestByCase.values()].flatMap(manifest => manifest.source_trail_ids ?? []));
  const trailPrograms = [];

  for (const native of [...nativeById.values()].sort((a, b) => a.case_id.localeCompare(b.case_id))) {
    if (!(native.counts?.trails > 0)) continue;
    const caseItem = readJson(native.href);
    const trails = (caseItem.trails ?? []).map(trail => ({
      trail_id: trail.trail_id,
      label: trail.label,
      status: trail.status,
      terminal: TERMINAL_TRAIL_STATES.has(trail.status),
      linked_to_report_workplan: sourceTrailIds.has(trail.trail_id),
      next_transition: sourceTrailIds.has(trail.trail_id)
        ? 'execute_or_close_bounded_search'
        : 'link_to_report_workplan_or_close',
      graph_effect: 'none'
    }));
    trailPrograms.push({
      program_id: `case:${native.case_id}`,
      kind: 'case_trails',
      case_id: native.case_id,
      current_stage: 'case_ledger',
      next_transition: 'bounded_search_and_claim_review',
      totals: {
        trails: trails.length,
        terminal: trails.filter(item => item.terminal).length,
        non_terminal: trails.filter(item => !item.terminal).length,
        linked_to_report_workplan: trails.filter(item => item.linked_to_report_workplan).length
      },
      status_counts: countBy(trails, 'status'),
      blockers: trails.filter(item => !item.terminal).length
        ? [`${trails.filter(item => !item.terminal).length}_trails_non_terminal`]
        : [],
      boundary: 'Case trails may feed a report workplan only. They do not create claims, conclusions, graph effects, or publication status.',
      trails,
      graph_effect: 'none'
    });
  }

  const intakeRoot = path.join(root, 'data', 'intake');
  const intakeDirectories = fs.existsSync(intakeRoot)
    ? fs.readdirSync(intakeRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    : [];

  for (const directory of intakeDirectories) {
    const evidencePath = `data/intake/${directory}/evidence-trails.jsonl`;
    if (!fs.existsSync(path.join(root, evidencePath))) continue;
    const trails = readJsonl(evidencePath);
    const frontierPath = `data/intake/${directory}/trail-frontier.jsonl`;
    const frontier = readOptionalJsonl(frontierPath);
    const nonTerminalFrontier = frontier.filter(item => !TERMINAL_TRAIL_STATES.has(item.coverage_state ?? item.status));
    trailPrograms.push({
      program_id: `intake:${directory}`,
      kind: 'intake_trails',
      case_id: null,
      current_stage: 'intake_or_projection',
      next_transition: 'case_ledger_promotion',
      totals: {
        trails: trails.length,
        frontier_rows: frontier.length,
        frontier_terminal: frontier.length - nonTerminalFrontier.length,
        frontier_non_terminal: nonTerminalFrontier.length,
        linked_to_report_workplan: 0
      },
      status_counts: countBy(trails, 'status'),
      frontier_state_counts: countBy(frontier, frontier.some(item => item.coverage_state) ? 'coverage_state' : 'status'),
      blockers: [
        'not_in_case_ledger',
        ...(nonTerminalFrontier.length ? [`${nonTerminalFrontier.length}_frontier_rows_non_terminal`] : [])
      ],
      boundary: 'Intake trails must be promoted into a typed, receipted case ledger before any report may consume them. Trail recurrence is not a claim or conclusion.',
      graph_effect: 'none'
    });
  }

  const approvedPublications = cases.filter(item => item.current_stage === 'approved_publication').length;
  const structuredReports = cases.filter(item => item.current_stage === 'structured_report').length;
  const nativeCases = cases.filter(item => item.case_state === 'case_ledger').length;
  const legacyProjections = cases.filter(item => item.case_state === 'legacy_projection').length;
  const waterline = approvedPublications > 0
    ? { stage: 'approved_publication', next_transition: 'correction_and_version_maintenance' }
    : structuredReports > 0
      ? { stage: 'structured_report', next_transition: 'provisional_publication_and_adversarial_challenge' }
      : nativeCases > 0
        ? { stage: 'case_ledger', next_transition: 'structured_report_specification' }
        : { stage: 'intake_or_projection', next_transition: 'case_ledger_promotion' };

  const output = {
    schema_version: REPORT_FRONTIER_SCHEMA_VERSION,
    as_of: [...cases.map(item => nativeById.get(item.case_id)?.as_of), ...(briefingIndex.briefings ?? []).map(item => item.as_of)]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
    graph_effect: 'none',
    conclusion_generated: false,
    transition_order: [
      'intake_or_projection',
      'case_ledger',
      'structured_report',
      'independent_review',
      'approved_publication'
    ],
    waterline: {
      ...waterline,
      definition: 'The highest publication transition demonstrated by deterministic repository artifacts. It is a capability boundary, not a quality score or ranking.'
    },
    totals: {
      cases: cases.length,
      native_cases: nativeCases,
      legacy_projections: legacyProjections,
      structured_reports: structuredReports,
      approved_publications: approvedPublications,
      reports_open_to_independent_challenge: cases.filter(item => item.current_stage === 'structured_report').length,
      reports_with_bounded_working_judgment: cases.filter(item => item.judgment_state === 'bounded_working_judgment').length,
      provisional_publication_eligible: cases.filter(item => item.provisional_publication_eligible).length,
      case_trails: sum(trailPrograms.filter(item => item.kind === 'case_trails'), item => item.totals.trails),
      intake_trails: sum(trailPrograms.filter(item => item.kind === 'intake_trails'), item => item.totals.trails),
      report_linked_trails: sum(trailPrograms, item => item.totals.linked_to_report_workplan)
    },
    cases,
    trail_programs: trailPrograms.sort((a, b) => a.program_id.localeCompare(b.program_id)),
    boundaries: [
      'A trail is a bounded search path, not a claim.',
      'A report workplan may reference only graph-inert, candidate-only case trails.',
      'A structured report may organize canonical claims and explicit records gaps but may not generate a conclusion.',
      'Independent challenge can raise, lower, or overturn confidence and may satisfy the independently cleared label; it does not create permission for a bounded judgment or provisional publication.',
      'Legacy projections and intake programs do not skip the case-ledger transition.'
    ]
  };

  writeJson('build/report-frontier.json', output);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = buildReportFrontier();
  console.log(`report frontier: ${output.totals.cases} cases, ${output.totals.structured_reports} structured reports, ${output.totals.report_linked_trails} linked trails, waterline ${output.waterline.stage}`);
}
