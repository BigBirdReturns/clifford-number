#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredInputs = [
  'data/project/evidence-grounded-judgment-authority.json',
  'data/canonical/corpus-selection.json',
  'data/research/corpus-coverage.json',
  'data/research/selection-adversarial-reviews.json',
  'data/research/k0-field-audit.json',
  'data/intake/k0-ceiling-conversion-seed-events.json'
];
const optionalInputs = [
  'build/report-frontier.json',
  'build/lake-index/waterline.json',
  'build/lake-index/basins.json'
];

const full = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readOptional = relative => fs.existsSync(full(relative)) ? read(relative) : null;
const bytes = relative => fs.readFileSync(full(relative));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, null, 2) + '\n';
const write = (relative, value) => {
  const target = full(relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const uniq = values => [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))];
const safeArray = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '');
const isHumanReviewPhrase = value => /(?:independent|second[-_ ]party|human|reviewer|expert).{0,24}(?:review|approval|sign[-_ ]?off|clearance)|(?:review|approval|sign[-_ ]?off|clearance).{0,24}(?:independent|second[-_ ]party|human|reviewer|expert)/i.test(text(value));
const materialGap = gap => !isHumanReviewPhrase(`${gap?.description ?? ''} ${gap?.next_action ?? ''} ${gap?.gap_id ?? ''}`);

for (const input of requiredInputs) {
  if (!fs.existsSync(full(input))) throw new Error(`missing required judgment input: ${input}`);
}

const policy = read(requiredInputs[0]);
const selection = read(requiredInputs[1]);
const coverage = read(requiredInputs[2]);
const reviewLedger = read(requiredInputs[3]);
const fieldAudit = read(requiredInputs[4]);
const seedEvents = read(requiredInputs[5]);
const reportFrontier = readOptional(optionalInputs[0]);
const lakeWaterline = readOptional(optionalInputs[1]);
const lakeBasins = readOptional(optionalInputs[2]);

const inputPaths = [
  ...requiredInputs,
  ...optionalInputs.filter(relative => fs.existsSync(full(relative)))
];
const inputManifest = inputPaths.map(relative => {
  const data = bytes(relative);
  return { path: relative, bytes: data.length, sha256: sha256(data) };
});
const sourceFingerprint = sha256(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));

const coverageByLane = new Map(safeArray(coverage.lanes).map(row => [row.lane_id, row]));
const reviewByLane = new Map(safeArray(reviewLedger.reviews).map(row => [row.lane_id, row]));
const seedById = new Map(safeArray(seedEvents.events).map(row => [row.event_id, row]));
const decisions = [];

function reviewDependency(review) {
  return {
    required_to_decide: false,
    current_review_status: review?.status ?? 'not_declared',
    effect: 'may_raise_lower_or_overturn_confidence_but_does_not_create_permission_to_judge'
  };
}

function reversibility() {
  return {
    mode: 'append_preserving_supersession',
    correction_route: 'new_receipt_or_counterevidence_may_replace_this_judgment_without_deleting_the_prior_record'
  };
}

function decisionBase({ decisionId, domain, subjectId, level, judgment, evidenceBasis, counterevidence, uncertainties, action, review, publicationEffect }) {
  return {
    decision_id: decisionId,
    domain,
    subject_id: subjectId,
    judgment_level: level,
    judgment,
    evidence_basis: evidenceBasis,
    counterevidence: safeArray(counterevidence),
    uncertainties: safeArray(uncertainties),
    action,
    reversibility: reversibility(),
    review_dependency: reviewDependency(review),
    publication_effect: publicationEffect,
    graph_effect: 'none'
  };
}

for (const lane of safeArray(selection.lanes)) {
  const coverageRow = coverageByLane.get(lane.lane_id);
  const review = reviewByLane.get(lane.lane_id);
  const gaps = safeArray(coverageRow?.known_gaps);
  const materialGaps = gaps.filter(materialGap);
  const reviewOnlyGaps = gaps.filter(gap => !materialGap(gap));
  const metrics = safeArray(coverageRow?.metrics);
  const incompleteMetrics = metrics.filter(metric => Number.isFinite(metric.expected) && metric.observed < metric.expected);
  const privateSupport = lane.lane_kind === 'support_only' || lane.status === 'support_only';
  const paused = ['suspended', 'retired'].includes(lane.status);
  let level = privateSupport ? 'J1' : 'J4';
  let judgment = privateSupport ? 'retain_as_private_support_only' : 'execute_bounded_lane_work';
  let action = privateSupport ? 'preserve_without_public_evidence_or_population_inference' : 'continue_execution_and_resolve_highest_material_coverage_gap';
  if (paused) {
    level = 'J1';
    judgment = 'hold_current_lane_state_for_stated_material_reason';
    action = 'preserve_and_reassess_when_material_evidence_or_scope_changes';
  } else if (lane.status === 'active') {
    judgment = 'continue_active_lane_and_publish_only_at_its_current_caveated_status';
    action = materialGaps.length ? `execute_gap:${materialGaps[0].gap_id}` : 'continue_active_symmetric_execution';
  } else if (['proposed', 'staged'].includes(lane.status)) {
    judgment = 'execute_next_bounded_acquisition_or_comparator_step';
    action = materialGaps.length ? `execute_gap:${materialGaps[0].gap_id}` : 'execute_declared_reproducible_next_step';
  }
  decisions.push(decisionBase({
    decisionId: `JDG-LANE-${lane.lane_id}`,
    domain: 'selection_lane',
    subjectId: lane.lane_id,
    level,
    judgment,
    evidenceBasis: {
      lane_status: lane.status,
      lane_kind: lane.lane_kind,
      comparison_method: lane.comparison?.method ?? null,
      public_reproducible: lane.replicability?.public_reproducible ?? null,
      coverage_metric_count: metrics.length,
      incomplete_metric_count: incompleteMetrics.length,
      material_gap_count: materialGaps.length,
      review_only_gap_count: reviewOnlyGaps.length
    },
    counterevidence: review?.known_boundary_risks ?? [],
    uncertainties: materialGaps.map(gap => gap.description),
    action,
    review,
    publicationEffect: review?.publication_status ?? 'not_declared'
  }));
}

for (const audit of safeArray(fieldAudit.rows)) {
  const event = seedById.get(audit.event_id);
  if (!event) continue;
  const sourceCount = safeArray(event.sources).length;
  const counterevidence = safeArray(event.counterevidence);
  const alternatives = safeArray(event.alternative_explanations);
  const thresholdMet = audit.disposition === 'supported_for_human_review'
    && audit.ccd_chain_depth >= policy.domain_rules.k0_event.bounded_working_threshold.minimum_contiguous_ccd
    && sourceCount >= policy.domain_rules.k0_event.bounded_working_threshold.minimum_sources
    && counterevidence.length > 0
    && alternatives.length > 0;
  let level = 'J1';
  let judgment = 'defining_mechanism_not_yet_supported';
  let action = 'acquire_the_earliest_missing_causal_transition';
  if (thresholdMet) {
    level = 'J2';
    judgment = 'bounded_ceiling_conversion_mechanism_supported';
    action = 'use_as_a_working_case_with_receipts_counterevidence_and_remaining_gaps_attached';
  } else if (audit.ccd_chain_depth >= 3) {
    level = 'J2';
    judgment = audit.audited_corpus_role === 'seed_strategic_boundary_fixture'
      ? 'bounded_strategic_bypass_chain_supported_without_completed_feedback_suppression'
      : 'partial_mechanism_supported_but_the_complete_event_is_not';
    action = 'use_the_supported_prefix_and_acquire_the_first_missing_transition';
  } else if (audit.disposition === 'bounded_non_link') {
    judgment = 'bounded_non_link_supported';
    action = 'reject_the_proposed_bridge_and_preserve_the_non_link';
  } else if (audit.disposition === 'falsified') {
    judgment = 'candidate_falsified_on_current_evidence';
    action = 'stop_using_as_a_positive_case_unless_new_receipts_reopen_it';
  }
  const confidence = level === 'J2'
    ? (audit.ccd_chain_depth >= 6 && sourceCount >= 2 ? 'high' : 'moderate')
    : 'low';
  decisions.push(decisionBase({
    decisionId: `JDG-K0-${audit.event_id}`,
    domain: 'k0_event',
    subjectId: audit.event_id,
    level,
    judgment,
    evidenceBasis: {
      field_audit_id: fieldAudit.audit_id,
      field_audit_disposition: audit.disposition,
      contiguous_ccd: audit.ccd_chain_depth,
      furthest_documented_stage: audit.furthest_documented_stage,
      source_count: sourceCount,
      counterevidence_count: counterevidence.length,
      alternative_explanation_count: alternatives.length,
      confidence_band: confidence,
      rationale: audit.rationale
    },
    counterevidence: [...counterevidence, ...alternatives],
    uncertainties: audit.remaining_gaps,
    action,
    review: { status: event.independent_review_complete ? 'cleared' : 'pending_second_party' },
    publicationEffect: 'preserves_existing_publication_boundary_while_allowing_bounded_working_judgment'
  }));
}

for (const item of safeArray(reportFrontier?.cases)) {
  const verified = item.claims?.verified ?? 0;
  const unresolved = item.claims?.review_required ?? 0;
  const approved = item.current_stage === 'approved_publication' || item.report_state === 'approved';
  const structured = item.current_stage === 'structured_report';
  const level = approved ? 'J3' : structured && verified > 0 ? 'J2' : 'J1';
  const judgment = approved
    ? 'approved_report_may_be_used_at_its_declared_scope'
    : structured && verified > 0
      ? 'verified_claim_subset_supports_a_bounded_working_report'
      : 'case_or_projection_requires_evidence_upgrade_before_report_judgment';
  const action = approved
    ? 'publish_and_monitor_corrections'
    : structured && verified > 0
      ? 'use_verified_claim_subset_and_continue_claim_level_resolution'
      : 'execute_the_next_declared_evidence_upgrade';
  decisions.push(decisionBase({
    decisionId: `JDG-REPORT-${item.case_id}`,
    domain: 'report',
    subjectId: item.case_id,
    level,
    judgment,
    evidenceBasis: {
      current_stage: item.current_stage,
      report_state: item.report_state,
      verified_claims: verified,
      review_required_claims: unresolved,
      receipt_count: item.receipts ?? 0
    },
    counterevidence: item.blockers ?? [],
    uncertainties: item.blockers ?? [],
    action,
    review: { status: item.report_state ?? 'not_declared' },
    publicationEffect: approved ? 'approved_at_declared_scope' : 'provisional_or_internal_only'
  }));
}

const basinQueue = safeArray(lakeWaterline?.basin_work_queue);
for (const row of basinQueue) {
  decisions.push(decisionBase({
    decisionId: `JDG-BASIN-${row.basin_id}`,
    domain: 'lake_basin',
    subjectId: row.basin_id,
    level: 'J4',
    judgment: 'execute_ranked_basin_repair',
    evidenceBasis: {
      blocking_gaps: row.blocking_gaps ?? 0,
      review_gaps: row.review_gaps ?? 0,
      total_gaps: row.total_gaps ?? 0,
      priority: row.priority ?? null
    },
    counterevidence: row.caveats ?? [],
    uncertainties: row.uncertainties ?? [],
    action: row.next_action ?? 'execute_highest_burden_reversible_repair',
    review: { status: 'open' },
    publicationEffect: 'none'
  }));
}

if (!basinQueue.length && safeArray(lakeBasins?.basins).length) {
  for (const basin of safeArray(lakeBasins.basins)) {
    const missingEntrypoint = basin.entrypoint_complete === false;
    decisions.push(decisionBase({
      decisionId: `JDG-BASIN-${basin.basin_id}`,
      domain: 'lake_basin',
      subjectId: basin.basin_id,
      level: 'J4',
      judgment: missingEntrypoint ? 'repair_missing_authoritative_entrypoint' : 'continue_basin_index_and_custody_work',
      evidenceBasis: basin.counts ?? {},
      counterevidence: [],
      uncertainties: missingEntrypoint ? ['Declared basin entrypoint is absent from the current census snapshot.'] : [],
      action: missingEntrypoint ? `create_or_correct_entrypoint:${safeArray(basin.authoritative_entrypoints)[0] ?? basin.basin_id}` : 'execute_highest_remaining_gap',
      review: { status: 'open' },
      publicationEffect: basin.publication_disposition ?? 'none'
    }));
  }
}

decisions.sort((a, b) => `${a.domain}:${a.subject_id}`.localeCompare(`${b.domain}:${b.subject_id}`));
const byDomain = {};
const byLevel = {};
for (const decision of decisions) {
  byDomain[decision.domain] = (byDomain[decision.domain] ?? 0) + 1;
  byLevel[decision.judgment_level] = (byLevel[decision.judgment_level] ?? 0) + 1;
}
const humanGated = decisions.filter(decision => decision.review_dependency?.required_to_decide !== false);
const k0Working = decisions.filter(decision => decision.domain === 'k0_event' && decision.judgment_level === 'J2');
const output = {
  schema_version: 'evidence-grounded-judgment-ledger@1',
  authority_id: policy.authority_id,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  summary: {
    decisions: decisions.length,
    by_domain: byDomain,
    by_level: byLevel,
    decisions_requiring_human_permission: humanGated.length,
    k0_bounded_working_judgments: k0Working.length,
    selection_lanes_with_operational_decisions: decisions.filter(row => row.domain === 'selection_lane' && row.judgment_level === 'J4').length,
    lake_layer_present: Boolean(lakeWaterline || lakeBasins),
    independent_review_is_evidence_not_permission: true
  },
  decisions,
  boundaries: {
    judgment_ledger_proves_evidence_truth: false,
    working_judgment_is_clearance: false,
    operational_decision_is_irreversible: false,
    independent_review_is_ignored: false,
    common_purpose_conclusion_generated: false,
    graph_effect: 'none'
  }
};

const k0Rows = k0Working.map(row => `| ${row.subject_id} | ${row.evidence_basis.contiguous_ccd} | ${row.evidence_basis.confidence_band} | ${row.judgment} | ${row.action} |`).join('\n');
const laneRows = decisions.filter(row => row.domain === 'selection_lane').map(row => `| ${row.subject_id} | ${row.judgment_level} | ${row.judgment} | ${row.action} | ${row.publication_effect} |`).join('\n');
const reportRows = decisions.filter(row => row.domain === 'report').map(row => `| ${row.subject_id} | ${row.judgment_level} | ${row.evidence_basis.verified_claims ?? 0} | ${row.judgment} |`).join('\n');
const markdown = `# Evidence-grounded judgment frontier\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Governing decision\n\nThe project makes bounded, reversible judgments from its receipted data. Independent review is evidence that can challenge, strengthen, or overturn a judgment; it is not permission to think or act. Missing review alone never produces \`wait\`.\n\n\`\`\`text\ndecisions: ${decisions.length}\ndecisions requiring human permission: ${humanGated.length}\nK0 bounded working judgments: ${k0Working.length}\nselection lanes with operational decisions: ${output.summary.selection_lanes_with_operational_decisions}\nlake layer present: ${output.summary.lake_layer_present}\n\`\`\`\n\n## K0 bounded working judgments\n\n| Event | Contiguous CCD | Confidence | Judgment | Action |\n|---|---:|---|---|---|\n${k0Rows || '| None | 0 | n/a | none | acquire evidence |'}\n\n## Selection-lane decisions\n\n| Lane | Level | Judgment | Action | Publication state |\n|---|---|---|---|---|\n${laneRows}\n\n## Report decisions\n\n| Case | Level | Verified claims | Judgment |\n|---|---|---:|---|\n${reportRows || '| No report frontier present | J0 | 0 | build report frontier |'}\n\n## Boundary\n\nA working judgment is not infallibility, evidence truth, publication clearance, guilt, motive, or common purpose. Every decision preserves counterevidence, uncertainties, and an append-only correction route.\n`;

write('build/evidence-grounded-judgments.json', stable(output));
write('reports/evidence-grounded-judgments.md', markdown);
console.log(`build-evidence-grounded-judgments: ${decisions.length} decisions; ${k0Working.length} bounded K0 judgments; ${humanGated.length} human-permission gates`);
