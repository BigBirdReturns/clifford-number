#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => { const target = path.join(root, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const slash = (value) => value.split(path.sep).join('/');

export const paths = {
  parentCore: 'data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/core.json',
  parentManifest: 'data/project/status-sovereignty-rd04-snap-route-adjudication-a04-release-manifest.json',
  sourceLedger: 'data/intake/status-sovereignty-rd04-california-remedy-chain-a05/source-custody/source-ledger.json',
  core: 'data/intake/status-sovereignty-rd04-california-remedy-chain-a05/core.json',
  manifest: 'data/project/status-sovereignty-rd04-california-remedy-chain-a05-release-manifest.json',
  buildData: 'build/core-thesis/status-sovereignty/rd04-california-remedy-chain-a05/data.json',
  buildManifest: 'build/core-thesis/status-sovereignty/rd04-california-remedy-chain-a05/manifest.json',
  reportData: 'reports/core-thesis/status-sovereignty/rd04-california-remedy-chain-a05/data.json',
  reportHtml: 'reports/core-thesis/status-sovereignty/rd04-california-remedy-chain-a05/index.html'
};

const fixedReleaseScope = [
  '.github/workflows/status-sovereignty-rd04-california-remedy-chain-a05.yml',
  'docs/milestones/ssc-rd04-california-remedy-chain-a05.md',
  'schemas/status-sovereignty-rd04-california-remedy-chain-a05.schema.json',
  'test/status-sovereignty-rd04-california-remedy-chain-a05.test.js',
  'tools/acquire-status-sovereignty-rd04-california-remedy-chain-a05.mjs',
  'tools/build-status-sovereignty-rd04-california-remedy-chain-a05.mjs',
  'tools/validate-status-sovereignty-rd04-california-remedy-chain-a05.mjs',
  paths.core,
  paths.buildData,
  paths.reportData,
  paths.reportHtml
];

function walkFiles(rel) {
  const abs = path.join(root, rel);
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(child));
    else if (entry.isFile()) out.push(slash(child));
  }
  return out;
}

export function releaseScope() {
  return [...fixedReleaseScope, ...walkFiles('data/intake/status-sovereignty-rd04-california-remedy-chain-a05/source-custody')].sort();
}

export function computeA05Manifest() {
  const entries = releaseScope().map((rel) => {
    const value = readBytes(rel);
    return { path: rel, sha256: sha256(value), bytes: value.length };
  });
  return {
    schema_version: 'ssc-rd04-a05-release-manifest@1',
    acquisition_id: 'SSC-RD04-SNAP-A05',
    as_of: '2026-08-02',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\u0000${row.sha256}\u0000${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_case_level_success: false,
      exact_bytes_prove_complete_restoration: false,
      manifest_proves_external_review: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

function evidence(stageId, title, procedureState, aggregateState, sources, finding, missing, values = {}) {
  return {
    stage_id: stageId,
    title,
    procedure_state: procedureState,
    aggregate_state: aggregateState,
    case_level_state: 'not_observed',
    source_ids: sources,
    finding,
    missing_join: missing,
    values,
    boundaries: {
      procedure_is_execution: false,
      aggregate_counts_form_one_case_cohort: false,
      stage_proves_effective_counterpower: false
    }
  };
}

export function buildA05Core() {
  const parent = readJson(paths.parentCore);
  const parentManifest = readJson(paths.parentManifest);
  const sourceLedger = readJson(paths.sourceLedger);
  const facts = sourceLedger.normalized_facts;
  const stages = [
    evidence('A05-S1', 'Notice or adverse-action surface', 'published_procedure', 'not_observed', ['A04-CA-ABAWD', 'A04-CA-MANUAL', 'A05-HEARING-REQUESTS'], 'California publishes current CalFresh work-rule, notice, screening, and hearing-request surfaces.', 'No linked denominator of notices, affected households, reductions, terminations, or exemptions is supplied.'),
    evidence('A05-S2', 'Hearing-request access', 'published_procedure', 'program_specific_aggregate', ['A05-HEARING-REQUESTS', 'A05-SHD-FY2025-26'], 'A claimant generally has 90 days to request a hearing through published online, phone, mail, fax, or county routes; the FY report records CalFresh appeals filed.', 'The filed-appeal total is not linked to one adverse-action cohort or to later hearing outcomes.', { appeals_filed: facts.appeals_filed.total }),
    evidence('A05-S3', 'Aid pending or continuity', 'published_procedure', 'not_observed', ['A04-CA-HEARING'], 'A timely request may preserve the existing benefit amount, but CalFresh continuity ends at the certification-period boundary and an unfavorable decision may create repayment liability.', 'No public denominator of aid-pending requests, approvals, denials, amounts, certification cutoffs, or resulting debts is supplied.'),
    evidence('A05-S4', 'Withdrawal or pre-hearing resolution', 'published_procedure', 'program_specific_aggregate', ['A04-CA-HEARING', 'A05-SHD-FY2025-26'], 'The FAQ permits reopening an unresolved conditional withdrawal after 30 days; the FY report records CalFresh withdrawals and administrative dismissals.', 'A withdrawal is not classified as favorable, complete, timely, or complied with, and cross-program conditional-withdrawal proportions cannot be assigned to CalFresh.', { appeals_withdrawn: facts.appeals_withdrawn.total, appeals_administratively_dismissed: facts.appeals_administratively_dismissed.total }),
    evidence('A05-S5', 'Hearing and decision surface', 'published_procedure', 'program_specific_aggregate', ['A05-SHD-FY2025-26', 'A05-DECISION-REGISTRY'], 'The public registry exposes nonprecedential decisions, while the FY report records CalFresh hearings scheduled, held, postponed, nonappearances, administrative dismissals, and decisions released.', 'The report does not provide a CalFresh-specific disposition distribution or link filed appeals, hearings, and decisions as one cohort.', { hearings_scheduled: facts.hearings_scheduled.total, hearings_held: facts.hearings_held.total, hearings_postponed: facts.hearings_postponed.total, nonappearances: facts.nonappearances.total, hearing_administrative_dismissals: facts.hearing_administrative_dismissals.total, decisions_released: facts.decisions_released.total }),
    evidence('A05-S6', 'Rehearing or judicial review', 'published_procedure', 'program_specific_aggregate', ['A04-CA-HEARING', 'A05-SHD-FY2025-26'], 'A claimant may request rehearing and seek judicial review under published deadlines; the FY report records CalFresh rehearing requests.', 'Rehearing determinations are reported only for all programs combined, so their outcome distribution cannot be assigned to CalFresh.', { rehearing_requests: facts.rehearing_requests.total }),
    evidence('A05-S7', 'Compliance, restoration, and downstream outcome', 'published_procedure', 'not_observed', ['A04-CA-HEARING', 'A04-CA-RESTORATION'], 'California publishes a 30-day county-compliance escalation route and restoration-of-lost-benefits rules.', 'No linked public denominator establishes whether CalFresh relief was implemented, how much was restored, how long it took, whether aid was complete, or what downstream material outcome followed.')
  ];
  return {
    schema_version: 'ssc-rd04-a05-core@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-RD04',
    execution_id: 'SSC-RD04-SNAP-A05',
    issue: 708,
    as_of: '2026-08-02',
    title: 'California CalFresh consequence, appeal, restoration, and outcome chain',
    status: 'complete_bounded_procedural_chain_and_aggregate_throughput_case_level_join_absent',
    parent: {
      execution_id: 'SSC-RD04-SNAP-A04',
      core_path: paths.parentCore,
      release_manifest_path: paths.parentManifest,
      release_sha256: parentManifest.combined_sha256,
      selected_state: parent.selection.final_selected_state,
      highest_coverage_set: parent.selection.highest_coverage_set,
      substantive_tiebreaker: parent.selection.substantive_tiebreaker,
      state_selection_reopened: false
    },
    unit_contract: {
      state: 'CA',
      program: 'CalFresh',
      procedure_as_of: '2026-08-02',
      aggregate_period: '2025-07-01/2026-06-30',
      unit: 'published procedural stage plus separately scoped aggregate statistic',
      one_linked_case_cohort: false,
      joins_authorized: false,
      outside_human_dependency: false
    },
    source_ledger: {
      path: paths.sourceLedger,
      newly_custodied_sources: sourceLedger.sources.length,
      parent_custody_sources_reused: 5,
      source_bytes_preserved_new: sourceLedger.sources.filter((row) => row.source_bytes_preserved).length
    },
    stages,
    program_specific_aggregates: {
      fiscal_year: '2025-2026',
      appeals_filed: facts.appeals_filed,
      appeals_administratively_dismissed: facts.appeals_administratively_dismissed,
      appeals_withdrawn: facts.appeals_withdrawn,
      hearings_scheduled: facts.hearings_scheduled,
      hearings_held: facts.hearings_held,
      hearings_postponed: facts.hearings_postponed,
      nonappearances: facts.nonappearances,
      hearing_administrative_dismissals: facts.hearing_administrative_dismissals,
      decisions_released: facts.decisions_released,
      rehearing_requests: facts.rehearing_requests,
      cohort_join: false
    },
    cross_program_aggregates: {
      decision_types: facts.all_program_decision_types,
      rehearing_determinations: facts.all_program_rehearing_determinations,
      applicable_to_calfresh_distribution: false
    },
    anti_join_law: {
      appeals_to_hearings: false,
      hearings_to_decisions: false,
      withdrawals_to_favorable_resolution: false,
      all_program_decisions_to_calfresh: false,
      all_program_rehearings_to_calfresh: false,
      procedure_to_actual_restoration: false,
      aggregate_throughput_to_individual_counterpower: false
    },
    counts: {
      stages: stages.length,
      published_procedure_stages: stages.filter((row) => row.procedure_state === 'published_procedure').length,
      program_specific_aggregate_stages: stages.filter((row) => row.aggregate_state === 'program_specific_aggregate').length,
      cross_program_aggregate_sets: 2,
      case_level_linked_stages: 0,
      complete_case_chains: 0,
      program_specific_disposition_distributions: 0,
      program_specific_rehearing_determination_distributions: 0,
      aid_pending_outcome_denominators: 0,
      restoration_timing_denominators: 0,
      external_contacts: 0,
      external_reviews: 0,
      adjudications: 0,
      publication_clearances: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: 'bounded_procedural_counterpower_and_program_throughput_without_case_level_outcome_join',
      procedure_chain_supported: true,
      aggregate_throughput_supported: true,
      case_level_success_supported: false,
      complete_restoration_supported: false,
      remedy_timeliness_supported: false,
      residual_class_closed: false,
      reviewed_disposition_changed: false,
      publication_effect: 'none',
      graph_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      acquisition_id: 'SSC-RD04-SNAP-A06',
      status: 'authorized_nonblocking_public_registry_acquisition',
      unit: 'predeclared public CalFresh decision-registry denominator with exact decision PDFs, issue codes, disposition, responsible agency, and separately observed compliance or restoration receipts when public',
      outside_human_dependency: false,
      project_blocking: false,
      forbidden_shortcuts: [
        'selecting favorable decisions after reading outcomes',
        'treating registry availability as a complete denominator',
        'treating grant or stipulation as proof of implementation',
        'waiting for an outside person or agency response before continuing other lanes'
      ]
    },
    boundaries: {
      procedure_proves_execution: false,
      aggregate_counts_form_one_cohort: false,
      withdrawal_proves_favorable_resolution: false,
      decisions_released_prove_calfresh_disposition_mix: false,
      rehearing_requests_prove_determination_mix: false,
      restoration_rule_proves_restoration: false,
      result_proves_effective_counterpower: false,
      result_proves_national_prevalence: false,
      result_proves_racial_hierarchy: false,
      result_proves_unlawful_motive: false,
      result_proves_coordination: false,
      result_proves_common_purpose: false,
      result_is_external_review: false,
      graph_effect: 'none'
    }
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export function buildA05() {
  const core = buildA05Core();
  write(paths.core, stable(core));
  const report = {
    schema_version: 'ssc-rd04-a05-report@1',
    ...core,
    release_manifest: { path: paths.manifest }
  };
  write(paths.buildData, stable(report));
  write(paths.reportData, stable(report));
  const rows = core.stages.map((row) => `<tr><td><code>${escapeHtml(row.stage_id)}</code></td><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.procedure_state)}</td><td>${escapeHtml(row.aggregate_state)}</td><td>${escapeHtml(row.case_level_state)}</td><td>${escapeHtml(row.missing_join)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SSC RD-04 A05 · California remedy chain</title></head><body><p><code>SSC-RD04-SNAP-A05</code></p><h1>Published procedure and aggregate throughput; no linked case outcome</h1><p><b>7 PROCEDURAL STAGES · 4 PROGRAM-AGGREGATE STAGES · 0 CASE-LEVEL JOINS · 0 COMPLETE RESTORATION CHAINS · EXTERNAL REVIEW 0 · GRAPH EFFECT NONE</b></p><p>California publishes notice, hearing, aid-pending, rehearing, compliance, and restoration routes. FY 2025-26 aggregate tables establish CalFresh throughput but do not connect one appeal cohort to disposition, implementation, restoration, or downstream outcome.</p><table><thead><tr><th>Stage</th><th>Surface</th><th>Procedure</th><th>Aggregate</th><th>Case link</th><th>Missing join</th></tr></thead><tbody>${rows}</tbody></table><pre>${escapeHtml(JSON.stringify(core.anti_join_law, null, 2))}</pre><p><code>Exact-byte release manifest: ${escapeHtml(paths.manifest)}</code></p></body></html>\n`;
  write(paths.reportHtml, html);
  const manifest = computeA05Manifest();
  write(paths.manifest, stable(manifest));
  write(paths.buildManifest, stable(manifest));
  console.log(`build-status-sovereignty-rd04-california-remedy-chain-a05: ${core.counts.stages} stages, ${core.counts.program_specific_aggregate_stages} program aggregates, 0 case joins`);
  return { core, report, manifest };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildA05();
