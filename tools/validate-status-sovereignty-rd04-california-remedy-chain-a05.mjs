#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeA05Manifest, paths } from './build-status-sovereignty-rd04-california-remedy-chain-a05.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const EXPECTED_PARENT_RELEASE = '861fa4ee56fc9caccc0616af5a189a332b812e7d78fa67109150615a83fe7f32';
const EXPECTED_STAGE_IDS = ['A05-S1', 'A05-S2', 'A05-S3', 'A05-S4', 'A05-S5', 'A05-S6', 'A05-S7'];
const EXPECTED_TOTALS = {
  appeals_filed: 44504,
  appeals_administratively_dismissed: 66,
  appeals_withdrawn: 32769,
  hearings_scheduled: 42368,
  hearings_held: 10434,
  hearings_postponed: 4204,
  nonappearances: 5569,
  hearing_administrative_dismissals: 22,
  decisions_released: 10582,
  rehearing_requests: 384
};

export function loadA05Context() {
  return {
    core: readJson(paths.core),
    parent: readJson(paths.parentCore),
    parentManifest: readJson(paths.parentManifest),
    sourceLedger: readJson(paths.sourceLedger),
    manifest: readJson(paths.manifest),
    buildManifest: readJson(paths.buildManifest),
    buildData: readJson(paths.buildData),
    reportData: readJson(paths.reportData),
    html: readText(paths.reportHtml),
    sourceBytes: Object.fromEntries(readJson(paths.sourceLedger).sources.map((source) => [source.source_id, readBytes(source.body_path)])),
    reportText: readText(readJson(paths.sourceLedger).report_text.path),
    parentFaq: readText('data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/page-custody/a02/CA-HEARING/attempt-1.body'),
    parentRestoration: readText('data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/page-custody/a02/CA-RESTORATION/attempt-1.body')
  };
}

export function validateA05(context = loadA05Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { core, parent, parentManifest, sourceLedger, manifest, buildManifest, buildData, reportData, html, sourceBytes, reportText, parentFaq, parentRestoration } = context;

  eq(core.schema_version, 'ssc-rd04-a05-core@1', 'A05 schema');
  eq(core.execution_id, 'SSC-RD04-SNAP-A05', 'A05 execution identity');
  eq(core.issue, 708, 'A05 issue receipt');
  eq(core.status, 'complete_bounded_procedural_chain_and_aggregate_throughput_case_level_join_absent', 'A05 status');
  eq(core.parent.release_sha256, EXPECTED_PARENT_RELEASE, 'A04 parent release receipt');
  eq(parentManifest.combined_sha256, EXPECTED_PARENT_RELEASE, 'A04 manifest custody');
  eq(parent.selection?.final_selected_state, 'CA', 'A04 selected state');
  eq(parent.selection?.substantive_tiebreaker, null, 'A04 substantive tiebreaker');
  eq(JSON.stringify(parent.selection?.highest_coverage_set), JSON.stringify(['CA', 'CT', 'KS', 'KY', 'WA']), 'A04 highest-coverage set');
  eq(parent.counts?.score_changes, 0, 'A04 score-change boundary');
  eq(parent.current_result?.selected_state_chain_may_proceed, true, 'A04 handoff authority');
  eq(core.parent.selected_state, 'CA', 'A05 parent selected state');
  eq(core.parent.state_selection_reopened, false, 'A05 state-selection reopening');
  eq(core.parent.substantive_tiebreaker, null, 'A05 tiebreaker custody');

  eq(core.unit_contract.state, 'CA', 'A05 state unit');
  eq(core.unit_contract.program, 'CalFresh', 'A05 program unit');
  eq(core.unit_contract.aggregate_period, '2025-07-01/2026-06-30', 'A05 aggregate period');
  eq(core.unit_contract.one_linked_case_cohort, false, 'A05 linked-cohort boundary');
  eq(core.unit_contract.joins_authorized, false, 'A05 join authority');
  eq(core.unit_contract.outside_human_dependency, false, 'A05 outside-human dependency');

  eq(sourceLedger.schema_version, 'ssc-rd04-a05-source-ledger@1', 'source-ledger schema');
  eq(sourceLedger.acquisition_id, core.execution_id, 'source-ledger identity');
  eq(sourceLedger.sources.length, 3, 'new source denominator');
  eq(core.source_ledger.newly_custodied_sources, 3, 'core new-source denominator');
  eq(core.source_ledger.parent_custody_sources_reused, 5, 'parent-source reuse denominator');
  eq(core.source_ledger.source_bytes_preserved_new, 3, 'new exact-byte denominator');

  const expectedHosts = new Map([
    ['SHD-FY2025-26', 'www.cdss.ca.gov'],
    ['DECISION-REGISTRY', 'acms.dss.ca.gov'],
    ['HEARING-REQUESTS', 'www.cdss.ca.gov']
  ]);
  for (const source of sourceLedger.sources) {
    check(expectedHosts.has(source.source_id), `unexpected source id: ${source.source_id}`);
    eq(source.official_host, expectedHosts.get(source.source_id), `${source.source_id} official host`);
    eq(source.source_bytes_preserved, true, `${source.source_id} byte custody`);
    eq(source.http_status, 200, `${source.source_id} HTTP status`);
    const bytes = sourceBytes[source.source_id];
    check(Boolean(bytes), `${source.source_id} body unavailable`);
    if (bytes) {
      eq(bytes.length, source.body_bytes, `${source.source_id} body length`);
      eq(sha256(bytes), source.body_sha256, `${source.source_id} body digest`);
    }
  }
  eq(sha256(Buffer.from(reportText)), sourceLedger.report_text.sha256, 'report-text digest');
  eq(Buffer.byteLength(reportText), sourceLedger.report_text.bytes, 'report-text bytes');
  for (const token of ['APPEALS FILED BY PROGRAM AND QUARTER', 'DECISIONS RELEASED BY PROGRAM AND QUARTER', 'REHEARING REQUESTS FILED BY PROGRAM AND QUARTER']) check(reportText.includes(token), `report text token missing: ${token}`);
  const registryText = sourceBytes['DECISION-REGISTRY']?.toString('utf8') ?? '';
  for (const token of ['Decision Registry', 'CalFresh', 'Partial Grant']) check(registryText.toLowerCase().includes(token.toLowerCase()), `decision registry token missing: ${token}`);
  check(/not precedential/i.test(registryText), 'decision registry nonprecedential boundary missing');
  const hearingText = sourceBytes['HEARING-REQUESTS']?.toString('utf8') ?? '';
  check(/90 days/i.test(hearingText), 'hearing-request 90-day rule missing');
  check(/CalFresh/i.test(hearingText), 'hearing-request CalFresh program missing');
  for (const token of ['aid pending', 'rehearing', 'judicial review', 'not complying with the judge']) check(parentFaq.toLowerCase().includes(token.toLowerCase()), `parent hearing custody token missing: ${token}`);
  check(/Restoration of lost benefits/i.test(parentRestoration), 'parent restoration rule missing');

  eq(core.stages.length, 7, 'stage denominator');
  eq(JSON.stringify(core.stages.map((row) => row.stage_id)), JSON.stringify(EXPECTED_STAGE_IDS), 'stage order');
  eq(core.counts.stages, 7, 'stage count');
  eq(core.counts.published_procedure_stages, 7, 'published-procedure denominator');
  eq(core.counts.program_specific_aggregate_stages, 4, 'program-aggregate stage denominator');
  eq(core.counts.cross_program_aggregate_sets, 2, 'cross-program aggregate set denominator');
  eq(core.counts.case_level_linked_stages, 0, 'case-level linked stage denominator');
  eq(core.counts.complete_case_chains, 0, 'complete-case-chain denominator');
  for (const stage of core.stages) {
    eq(stage.case_level_state, 'not_observed', `${stage.stage_id} case-level state`);
    check(stage.source_ids.length > 0, `${stage.stage_id} source denominator`);
    check(typeof stage.missing_join === 'string' && stage.missing_join.length > 30, `${stage.stage_id} missing-join custody`);
    eq(stage.boundaries?.procedure_is_execution, false, `${stage.stage_id} procedure boundary`);
    eq(stage.boundaries?.aggregate_counts_form_one_case_cohort, false, `${stage.stage_id} cohort boundary`);
    eq(stage.boundaries?.stage_proves_effective_counterpower, false, `${stage.stage_id} counterpower boundary`);
  }

  for (const [key, expected] of Object.entries(EXPECTED_TOTALS)) eq(core.program_specific_aggregates[key]?.total, expected, `CalFresh ${key} total`);
  eq(core.program_specific_aggregates.cohort_join, false, 'CalFresh aggregate cohort join');
  eq(core.cross_program_aggregates.decision_types.denial, 13134, 'all-program denial total');
  eq(core.cross_program_aggregates.decision_types.dismissal, 3723, 'all-program dismissal total');
  eq(core.cross_program_aggregates.decision_types.grant_or_partial_grant, 9308, 'all-program grant/partial total');
  eq(core.cross_program_aggregates.decision_types.stipulation, 6512, 'all-program stipulation total');
  eq(core.cross_program_aggregates.decision_types.total, 32677, 'all-program decision total');
  eq(core.cross_program_aggregates.rehearing_determinations.denied, 1132, 'all-program rehearing denied');
  eq(core.cross_program_aggregates.rehearing_determinations.denied_untimely, 58, 'all-program rehearing untimely');
  eq(core.cross_program_aggregates.rehearing_determinations.granted_hearing_scheduled, 117, 'all-program rehearing scheduled');
  eq(core.cross_program_aggregates.rehearing_determinations.granted_on_record, 42, 'all-program rehearing on record');
  eq(core.cross_program_aggregates.rehearing_determinations.total, 1349, 'all-program rehearing total');
  eq(core.cross_program_aggregates.applicable_to_calfresh_distribution, false, 'cross-program applicability boundary');

  for (const [key, value] of Object.entries(core.anti_join_law ?? {})) eq(value, false, `anti-join law ${key}`);
  eq(core.counts.program_specific_disposition_distributions, 0, 'CalFresh disposition-distribution denominator');
  eq(core.counts.program_specific_rehearing_determination_distributions, 0, 'CalFresh rehearing-distribution denominator');
  eq(core.counts.aid_pending_outcome_denominators, 0, 'aid-pending outcome denominator');
  eq(core.counts.restoration_timing_denominators, 0, 'restoration-timing denominator');
  for (const key of ['external_contacts', 'external_reviews', 'adjudications', 'publication_clearances', 'graph_effects']) eq(core.counts[key], 0, `${key} zero state`);

  eq(core.current_result.terminal_state, 'bounded_procedural_counterpower_and_program_throughput_without_case_level_outcome_join', 'terminal state');
  eq(core.current_result.procedure_chain_supported, true, 'procedure-chain support');
  eq(core.current_result.aggregate_throughput_supported, true, 'aggregate-throughput support');
  for (const key of ['case_level_success_supported', 'complete_restoration_supported', 'remedy_timeliness_supported', 'residual_class_closed', 'reviewed_disposition_changed']) eq(core.current_result[key], false, `current-result ${key}`);
  eq(core.current_result.publication_effect, 'none', 'publication effect');
  eq(core.current_result.graph_effect, 'none', 'graph effect');
  eq(core.current_result.adoption_effect, 'none', 'adoption effect');

  eq(core.next_handoff.acquisition_id, 'SSC-RD04-SNAP-A06', 'next handoff identity');
  eq(core.next_handoff.status, 'authorized_nonblocking_public_registry_acquisition', 'next handoff status');
  eq(core.next_handoff.outside_human_dependency, false, 'next handoff outside-human dependency');
  eq(core.next_handoff.project_blocking, false, 'next handoff project-blocking state');
  check(core.next_handoff.forbidden_shortcuts.includes('waiting for an outside person or agency response before continuing other lanes'), 'next-handoff no-human rule missing');

  for (const [key, value] of Object.entries(core.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `boundary ${key}`);
    else eq(value, false, `boundary ${key}`);
  }

  eq(JSON.stringify(buildData), JSON.stringify(reportData), 'build/report data parity');
  eq(buildData.execution_id, core.execution_id, 'report execution identity');
  eq(buildData.release_manifest?.path, paths.manifest, 'report manifest path');
  check(html.includes('noindex,nofollow'), 'held report robots boundary');
  check(html.includes('0 CASE-LEVEL JOINS'), 'held report case-link banner');
  check(html.includes('EXTERNAL REVIEW 0'), 'held report external-review banner');
  check(html.includes(paths.manifest), 'held report manifest pointer');

  const expectedManifest = computeA05Manifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'build-manifest parity');
  for (const [key, value] of Object.entries(manifest.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `manifest boundary ${key}`);
    else eq(value, false, `manifest boundary ${key}`);
  }
  return errors;
}

function main() {
  const errors = validateA05();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd04-california-remedy-chain-a05: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd04-california-remedy-chain-a05: PASS — procedure and aggregate throughput retained; zero case-level joins');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
