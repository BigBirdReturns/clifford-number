#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const changed = [];
const full = relative => path.join(root, relative);

function read(relative) {
  return fs.readFileSync(full(relative), 'utf8');
}
function write(relative, content) {
  if (!content.endsWith('\n')) content += '\n';
  const current = read(relative);
  if (current === content) return;
  fs.writeFileSync(full(relative), content);
  changed.push(relative);
}
function replaceExact(relative, before, after) {
  const current = read(relative);
  if (!current.includes(before)) throw new Error(`${relative}: expected migration text not found: ${before.slice(0, 120)}`);
  write(relative, current.replace(before, after));
}
function replaceRegex(relative, pattern, after) {
  const current = read(relative);
  if (!pattern.test(current)) throw new Error(`${relative}: expected migration pattern not found: ${pattern}`);
  write(relative, current.replace(pattern, after));
}
function updateJson(relative, mutate) {
  const value = JSON.parse(read(relative));
  mutate(value);
  write(relative, JSON.stringify(value, null, 2));
}

const newQueueFunction = `export function reporterBriefingQueueEntry(manifest) {
  const scopeLimits = [];
  if (manifest.publication.status !== 'approved') scopeLimits.push(\`publication_status_\${manifest.publication.status}\`);
  if (manifest.counts.review_required_claims > 0) scopeLimits.push(\`\${manifest.counts.review_required_claims}_claims_review_required\`);
  if (manifest.counts.inherited_qualifications > 0) scopeLimits.push(\`\${manifest.counts.inherited_qualifications}_qualifications_inherited_from_case_boundary\`);
  const clearanceConditions = [];
  if (!manifest.publication.reviewer) clearanceConditions.push('independent_reviewer_missing');
  if (!manifest.publication.reviewed_at) clearanceConditions.push('review_date_missing');
  const blockers = [];
  if (!(manifest.counts.verified_claims > 0)) blockers.push('no_verified_claims');
  if (!(manifest.counts.public_receipts > 0)) blockers.push('no_public_receipts');
  const provisionalPublicationEligible = blockers.length === 0;
  return {
    briefing_id: manifest.briefing_id,
    case_id: manifest.case_id,
    title: manifest.title,
    version: manifest.publication.version,
    publication_status: manifest.publication.status,
    reviewer: manifest.publication.reviewer ?? null,
    reviewed_at: manifest.publication.reviewed_at ?? null,
    judgment_state: provisionalPublicationEligible ? 'bounded_working_judgment' : 'observation_only',
    blocking_reasons: blockers,
    scope_limits: scopeLimits,
    clearance_conditions: clearanceConditions,
    provisional_publication_eligible: provisionalPublicationEligible,
    eligible_for_approval: provisionalPublicationEligible && scopeLimits.length === 0 && clearanceConditions.length === 0,
    review_dependency: {
      required_to_decide: false,
      effect: 'challenge_or_clearance_only_not_permission_to_form_a_bounded_judgment'
    },
    graph_effect: 'none'
  };
}
`;
replaceRegex('tools/lib/reporter-briefing.mjs', /export function reporterBriefingQueueEntry\(manifest\) \{[\s\S]*$/, newQueueFunction);

write('tools/lib/report-waterline.mjs', `import { reporterBriefingQueueEntry } from './reporter-briefing.mjs';

export function applyReportWaterline(manifest, caseItem) {
  const caseUnsequenced = new Set(caseItem?.unsequenced_claim_ids ?? []);
  const unsequencedClaimIds = (manifest.claim_ids ?? []).filter(claimId => caseUnsequenced.has(claimId));
  return {
    ...manifest,
    counts: {
      ...manifest.counts,
      unsequenced_claims: unsequencedClaimIds.length
    },
    unsequenced_claim_ids: unsequencedClaimIds
  };
}

export function reportWaterlineQueueEntry(manifest) {
  const entry = reporterBriefingQueueEntry(manifest);
  const count = manifest.counts?.unsequenced_claims ?? 0;
  if (count > 0) {
    entry.scope_limits.push(\`\${count}_unsequenced_case_claims\`);
    entry.eligible_for_approval = false;
  }
  return entry;
}
`);

replaceExact('tools/compile-reporter-briefings.mjs',
`    eligible_for_approval: queue.filter(item => item.eligible_for_approval).length
`,
`    eligible_for_approval: queue.filter(item => item.eligible_for_approval).length,
    provisional_publication_eligible: queue.filter(item => item.provisional_publication_eligible).length,
    bounded_working_judgments: queue.filter(item => item.judgment_state === 'bounded_working_judgment').length
`);
replaceExact('tools/compile-reporter-briefings.mjs',
`console.log(\`reporter briefings: \${manifests.length} compiled, \${queue.filter(item => item.eligible_for_approval).length} approval-ready\`);
`,
`console.log(\`reporter briefings: \${manifests.length} compiled, \${queue.filter(item => item.provisional_publication_eligible).length} provisionally publishable, \${queue.filter(item => item.eligible_for_approval).length} independently cleared\`);
`);

replaceExact('tools/build-report-frontier.mjs',
`function nextTransition({ native, manifest, verifiedClaims }) {
  if (manifest?.publication?.status === 'approved') return 'correction_and_version_maintenance';
  if (manifest) return 'independent_review';
  if (!native) return 'case_ledger_migration';
  if (verifiedClaims === 0) return 'evidence_upgrade';
  return 'structured_report_specification';
}
`,
`function nextTransition({ native, manifest, verifiedClaims }) {
  if (manifest?.publication?.status === 'approved') return 'correction_and_version_maintenance';
  if (manifest && verifiedClaims > 0) return 'provisional_publication_and_adversarial_challenge';
  if (manifest) return 'evidence_upgrade';
  if (!native) return 'case_ledger_migration';
  if (verifiedClaims === 0) return 'evidence_upgrade';
  return 'structured_report_specification';
}
`);
replaceExact('tools/build-report-frontier.mjs',
`      blockers: caseBlockers({ native, manifest, queue, verifiedClaims, reviewRequiredClaims }),
      graph_effect: 'none'
`,
`      judgment_state: queue?.judgment_state ?? (verifiedClaims > 0 ? 'candidate_judgment' : 'observation_only'),
      provisional_publication_eligible: queue?.provisional_publication_eligible ?? false,
      blockers: caseBlockers({ native, manifest, queue, verifiedClaims, reviewRequiredClaims }),
      scope_limits: queue?.scope_limits ?? [],
      clearance_conditions: queue?.clearance_conditions ?? [],
      review_dependency: queue?.review_dependency ?? { required_to_decide: false, effect: 'not_applicable' },
      graph_effect: 'none'
`);
replaceExact('tools/build-report-frontier.mjs',
`      ? { stage: 'structured_report', next_transition: 'independent_review' }
`,
`      ? { stage: 'structured_report', next_transition: 'provisional_publication_and_adversarial_challenge' }
`);
replaceExact('tools/build-report-frontier.mjs',
`      reports_awaiting_independent_review: cases.filter(item => item.current_stage === 'structured_report').length,
`,
`      reports_open_to_independent_challenge: cases.filter(item => item.current_stage === 'structured_report').length,
      reports_with_bounded_working_judgment: cases.filter(item => item.judgment_state === 'bounded_working_judgment').length,
      provisional_publication_eligible: cases.filter(item => item.provisional_publication_eligible).length,
`);
replaceExact('tools/build-report-frontier.mjs',
`      'Independent review requires a named reviewer, review date, resolved claim-level qualifications, and append-only publication history.',
`,
`      'Independent challenge can raise, lower, or overturn confidence and may satisfy the independently cleared label; it does not create permission for a bounded judgment or provisional publication.',
`);

replaceExact('tools/lib/report-frontier-html.mjs',
`  independent_review: 'Independent review',
`,
`  independent_review: 'Independent corroboration',
  provisional_publication_and_adversarial_challenge: 'Provisional publication and adversarial challenge',
  bounded_working_judgment: 'Bounded working judgment',
`);
replaceExact('tools/lib/report-frontier-html.mjs',
`const blockers = values => values?.length
  ? \`<ul>\${values.map(value => \`<li>\${escapeHtml(String(value).replaceAll('_', ' '))}</li>\`).join('')}</ul>\`
  : '<span class="clear">No recorded blocker</span>';
`,
`const blockers = values => values?.length
  ? \`<ul>\${values.map(value => \`<li>\${escapeHtml(String(value).replaceAll('_', ' '))}</li>\`).join('')}</ul>\`
  : '<span class="clear">No material blocker</span>';
const decisionLimits = item => {
  const scope = item.scope_limits?.length ? \`<small>Scope limits</small>\${blockers(item.scope_limits)}\` : '';
  const clearance = item.clearance_conditions?.length ? \`<small>Clearance conditions only</small>\${blockers(item.clearance_conditions)}\` : '';
  return \`\${blockers(item.blockers)}\${scope}\${clearance}\`;
};
`);
replaceExact('tools/lib/report-frontier-html.mjs',
`<td><strong>\${escapeHtml(label(item.current_stage))}</strong><small>\${escapeHtml(item.report_state === 'not_declared' ? 'No report declared' : \`\${item.report_state} · v\${item.report_version}\`)}</small></td>
`,
`<td><strong>\${escapeHtml(label(item.current_stage))}</strong><small>\${escapeHtml(item.report_state === 'not_declared' ? 'No report declared' : \`\${item.report_state} · v\${item.report_version}\`)}</small><small>\${escapeHtml(label(item.judgment_state))}</small></td>
`);
replaceExact('tools/lib/report-frontier-html.mjs',
`<td>\${blockers(item.blockers)}</td>
`,
`<td>\${decisionLimits(item)}</td>
`);
replaceExact('tools/lib/report-frontier-html.mjs',
`<div class="section-head"><div><span class="eyebrow">Case frontier</span><h2>Current state and next allowed transition</h2></div><p>Blockers are refusal reasons. They do not imply that a stronger theory is true.</p></div><div class="table-wrap"><table><thead><tr><th>Case</th><th>Custody</th><th>Current</th><th>Next</th><th>Claims</th><th>Receipts / trails</th><th>Blockers</th></tr></thead><tbody>\${caseRows(frontier)}</tbody></table></div>
`,
`<div class="section-head"><div><span class="eyebrow">Case frontier</span><h2>Current state and next evidence action</h2></div><p>Material blockers, scope limits, and independent-clearance conditions are separate. Missing clearance never erases a bounded working judgment.</p></div><div class="table-wrap"><table><thead><tr><th>Case</th><th>Custody</th><th>Current</th><th>Next</th><th>Claims</th><th>Receipts / trails</th><th>Decision limits</th></tr></thead><tbody>\${caseRows(frontier)}</tbody></table></div>
`);
replaceExact('tools/lib/report-frontier-html.mjs',
`<div class="top"><div><nav class="brand brand-nav" aria-label="Project waterlines"><a href="../">CN · public instrument</a><a class="primary" href="../estates/">Estate Aperture</a><a href="../docs/milestones/estate-aperture-v1.md">Milestone M-01</a></nav><div class="eyebrow" style="margin-top:26px">Publication transitions · as known \${escapeHtml(frontier.as_of)}</div><h1>The report waterline</h1><p class="dek">Cases, reports, reviews, and bounded searches shown at their current transition. This surface exposes what the project can do next without scoring subjects or generating a narrative conclusion.</p></div>`,
`<div class="top"><div><nav class="brand brand-nav" aria-label="Project waterlines"><a href="../">CN · public instrument</a><a class="primary" href="../estates/">Estate Aperture</a><a href="../docs/milestones/estate-aperture-v1.md">Milestone M-01</a></nav><div class="eyebrow" style="margin-top:26px">Publication transitions · as known \${escapeHtml(frontier.as_of)}</div><h1>The report waterline</h1><p class="dek">Cases, reports, judgments, challenges, and bounded searches shown at their current transition. Independent challenge updates confidence; it is not permission to use the receipted evidence already present.</p></div>`);

write('test/report-frontier.test.js', `import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReportFrontier, REPORT_FRONTIER_SCHEMA_VERSION } from '../tools/build-report-frontier.mjs';
import { renderReportFrontier } from '../tools/render-report-frontier.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

const frontier = buildReportFrontier();
const emitted = readJson('build/report-frontier.json');
assert.deepEqual(emitted, frontier, 'the report frontier must be deterministic');
assert.deepEqual(buildReportFrontier(), frontier, 'a second build must not change the frontier');
const rendered = renderReportFrontier();
assert.equal(rendered.html, fs.readFileSync(rendered.output_path, 'utf8'));
assert.deepEqual(rendered.frontier, frontier);
assert.equal(rendered.output_path, 'reports/index.html');
assert.equal(frontier.schema_version, REPORT_FRONTIER_SCHEMA_VERSION);
assert.equal(frontier.graph_effect, 'none');
assert.equal(frontier.conclusion_generated, false);
assert.deepEqual(frontier.transition_order, ['intake_or_projection','case_ledger','structured_report','independent_review','approved_publication']);
assert.equal(frontier.waterline.stage, 'structured_report');
assert.equal(frontier.waterline.next_transition, 'provisional_publication_and_adversarial_challenge');
assert.match(frontier.waterline.definition, /not a quality score or ranking/i);
assert.equal(frontier.totals.cases, frontier.cases.length);
assert.equal(frontier.totals.structured_reports, 2);
assert.equal(frontier.totals.approved_publications, 0);
assert.equal(frontier.totals.reports_open_to_independent_challenge, 2);
assert.equal(frontier.totals.reports_with_bounded_working_judgment, 2);
assert.equal(frontier.totals.provisional_publication_eligible, 2);
assert.equal(frontier.totals.case_trails, 10);
assert.equal(frontier.totals.intake_trails, 18);
assert.equal(frontier.totals.report_linked_trails, 9);
const byCase = new Map(frontier.cases.map(item => [item.case_id, item]));
for (const caseId of ['anduril-access-ownership','arcadia-field-autopsy']) {
  const item = byCase.get(caseId);
  assert.ok(item);
  assert.equal(item.case_state, 'case_ledger');
  assert.equal(item.current_stage, 'structured_report');
  assert.equal(item.next_transition, 'provisional_publication_and_adversarial_challenge');
  assert.equal(item.judgment_state, 'bounded_working_judgment');
  assert.equal(item.provisional_publication_eligible, true);
  assert.equal(item.review_dependency.required_to_decide, false);
  assert.deepEqual(item.blockers, []);
  assert.ok(item.clearance_conditions.includes('independent_reviewer_missing'));
  assert.ok(item.clearance_conditions.includes('review_date_missing'));
}
const anduril = byCase.get('anduril-access-ownership');
assert.equal(anduril.source_trails_linked_to_report, 0);
assert.ok(anduril.scope_limits.includes('9_claims_review_required'));
const arcadia = byCase.get('arcadia-field-autopsy');
assert.equal(arcadia.trails, 10);
assert.equal(arcadia.source_trails_linked_to_report, 9);
assert.ok(arcadia.scope_limits.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.ok(arcadia.scope_limits.some(reason => /unsequenced_case_claims/.test(reason)));
const swarmForge = byCase.get('field-autopsy-03');
assert.equal(swarmForge.current_stage, 'case_ledger');
assert.equal(swarmForge.next_transition, 'evidence_upgrade');
assert.ok(swarmForge.blockers.includes('no_verified_claims'));
const ukAi = byCase.get('uk-ai-policy');
assert.equal(ukAi.case_state, 'legacy_projection');
assert.equal(ukAi.current_stage, 'intake_or_projection');
assert.equal(ukAi.next_transition, 'case_ledger_migration');
assert.ok(ukAi.blockers.includes('canonical_case_ledger_missing'));
const arcadiaTrails = new Map(frontier.trail_programs.map(item => [item.program_id, item])).get('case:arcadia-field-autopsy');
assert.equal(arcadiaTrails.totals.trails, 10);
assert.equal(arcadiaTrails.totals.linked_to_report_workplan, 9);
assert.equal(arcadiaTrails.totals.non_terminal, 10);
assert.ok(arcadiaTrails.trails.find(item => item.trail_id === 'trail-transcript-recovery').linked_to_report_workplan === false);
console.log('report frontier: OK');
`);

const reporterTestReplacements = [
  [
`assert.equal(queue.eligible_for_approval, false);
assert.ok(queue.blocking_reasons.includes('publication_status_review_required'));
assert.ok(queue.blocking_reasons.includes('9_claims_review_required'));
assert.ok(queue.blocking_reasons.includes('independent_reviewer_missing'));
assert.ok(queue.blocking_reasons.includes('review_date_missing'));
assert.ok(!queue.blocking_reasons.some(reason => /qualifications_inherited/.test(reason)));
assert.ok(!queue.blocking_reasons.some(reason => /unsequenced_case_claims/.test(reason)));
`,
`assert.equal(queue.eligible_for_approval, false);
assert.equal(queue.provisional_publication_eligible, true);
assert.equal(queue.judgment_state, 'bounded_working_judgment');
assert.deepEqual(queue.blocking_reasons, []);
assert.ok(queue.scope_limits.includes('publication_status_review_required'));
assert.ok(queue.scope_limits.includes('9_claims_review_required'));
assert.ok(queue.clearance_conditions.includes('independent_reviewer_missing'));
assert.ok(queue.clearance_conditions.includes('review_date_missing'));
assert.equal(queue.review_dependency.required_to_decide, false);
`
  ],
  [
`assert.ok(reportWaterlineQueueEntry(inheritedCompilation.manifest).blocking_reasons.includes('1_qualifications_inherited_from_case_boundary'));
`,
`assert.ok(reportWaterlineQueueEntry(inheritedCompilation.manifest).scope_limits.includes('1_qualifications_inherited_from_case_boundary'));
`
  ],
  [
`assert.ok(arcadiaQueue.blocking_reasons.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.ok(arcadiaQueue.blocking_reasons.includes(\`${arcadiaCompilation.manifest.counts.unsequenced_claims}_unsequenced_case_claims\`));
assert.equal(arcadiaQueue.eligible_for_approval, false);
`,
`assert.ok(arcadiaQueue.scope_limits.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.ok(arcadiaQueue.scope_limits.includes(\`${arcadiaCompilation.manifest.counts.unsequenced_claims}_unsequenced_case_claims\`));
assert.equal(arcadiaQueue.provisional_publication_eligible, true);
assert.equal(arcadiaQueue.eligible_for_approval, false);
`
  ],
  [
`assert.equal(reviewQueue.totals.eligible_for_approval, 0);
assert.ok(reviewQueue.queue.find(item => item.briefing_id === 'anduril-access-ownership').blocking_reasons.includes('9_claims_review_required'));
const emittedArcadiaQueue = reviewQueue.queue.find(item => item.briefing_id === 'arcadia-field-autopsy');
assert.ok(emittedArcadiaQueue.blocking_reasons.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.ok(emittedArcadiaQueue.blocking_reasons.some(reason => /unsequenced_case_claims/.test(reason)));
`,
`assert.equal(reviewQueue.totals.eligible_for_approval, 0);
assert.equal(reviewQueue.totals.provisional_publication_eligible, 2);
assert.equal(reviewQueue.totals.bounded_working_judgments, 2);
assert.ok(reviewQueue.queue.find(item => item.briefing_id === 'anduril-access-ownership').scope_limits.includes('9_claims_review_required'));
const emittedArcadiaQueue = reviewQueue.queue.find(item => item.briefing_id === 'arcadia-field-autopsy');
assert.ok(emittedArcadiaQueue.scope_limits.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));
assert.ok(emittedArcadiaQueue.scope_limits.some(reason => /unsequenced_case_claims/.test(reason)));
assert.deepEqual(emittedArcadiaQueue.blocking_reasons, []);
`
  ]
];
for (const [before, after] of reporterTestReplacements) replaceExact('test/reporter-briefing.test.js', before, after);

replaceExact('docs/reporter-briefings.md',
`The review queue explains why a report is not approval-ready without promoting it, changing its evidence, or impersonating human review. Blockers can include:

- publication status remains \`review_required\`;
- report-referenced claims remain review-required;
- qualifications are inherited from the case boundary;
- report-referenced claims are not attached to canonical events;
- independent reviewer identity is missing; or
- review date is missing.

The report frontier reconciles reports with native cases, legacy projections, case trails, and intake trail programs. It records the next allowed transition without scoring or ranking subjects.
`,
`The review queue separates three different things that must never be collapsed:

- **material blockers** such as no verified claim or no inspectable public receipt;
- **scope limits** such as review-required claims, inherited qualifications, or unsequenced claims; and
- **independent-clearance conditions** such as reviewer identity and review date.

A report with verified claims and public receipts may form a bounded working judgment and publish provisionally with every scope limit attached. Missing independent review can withhold the word *approved* or *independently corroborated*; it cannot erase the judgment or block provisional use of the verified subset.

The report frontier reconciles reports with native cases, legacy projections, case trails, and intake trail programs. It records the next evidence action without scoring or ranking subjects.
`);
replaceExact('docs/adr-reporter-briefing-platform.md',
`- **Letting intake trails feed reports directly:** rejected because search paths must cross the case-ledger evidence and review boundary before publication projection.
- **Treating workflow success as approval:** rejected because integrity automation cannot impersonate independent editorial review.
`,
`- **Letting intake trails feed reports directly:** rejected because search paths must cross the typed case-ledger evidence boundary before they can be represented as claims. Verified subsets may still support a bounded provisional report while unresolved trails remain explicit workplan inputs.
- **Treating workflow success as independent corroboration:** rejected because integrity automation proves reproducibility, not external corroboration. It does not prevent the project from making a bounded judgment from the evidence it has.
`);
replaceExact('docs/adr-reporter-briefing-platform.md',
`The Arcadia Formation is the second proof. It applies the same report law to a different domain: place formation, public infrastructure, planning, assessment governance, parcel ownership, project approvals, and comparative controls. Its candidate-only evidence trails remain workplan inputs, not findings. The report remains \`review_required\` and explicitly exposes inherited qualifications and unsequenced claims as approval blockers.

Together the two reports establish the current project waterline at **structured report**. The next unlocked transition is **independent review**.
`,
`The Arcadia Formation is the second proof. It applies the same report law to a different domain: place formation, public infrastructure, planning, assessment governance, parcel ownership, project approvals, and comparative controls. Its candidate-only evidence trails remain workplan inputs, not findings. The report remains \`review_required\` for independent clearance while its verified subset supports a bounded working judgment; inherited qualifications and unsequenced claims travel as scope limits rather than permission gates.

Together the two reports establish the current project waterline at **structured report plus bounded working judgment**. The next evidence action is **provisional publication and adversarial challenge**. Independent review may raise, lower, or overturn confidence and may satisfy the independently cleared label; it is not permission to judge.
`);

updateJson('data/research/government-to-property-manifest.json', value => {
  value.consumption.publication_status = 'provisional_with_attached_limits';
  value.consumption.review_effect = 'challenge_and_confidence_only_does_not_block_discovery_intake_or_provisional_publication';
  value.consumption.judgment_state = 'bounded_source_scope_judgment';
  value.consumption.review_dependency = {
    required_to_decide: false,
    effect: 'may_challenge_or_clear_but_does_not_create_permission_to_use_the_provisional_query_log'
  };
});
replaceExact('tools/validate-gov-property.mjs',
`  if (manifest?.consumption?.review_effect !== 'labels_clearance_only_does_not_block_discovery_or_intake') e.push('manifest: review must not be described as blocking discovery/intake');
  if (manifest?.consumption?.publication_status !== 'blocked_pending_independent_review') e.push('manifest: publication must remain blocked pending review');
`,
`  if (manifest?.consumption?.review_effect !== 'challenge_and_confidence_only_does_not_block_discovery_intake_or_provisional_publication') e.push('manifest: review must be challenge/confidence metadata, not permission');
  if (manifest?.consumption?.publication_status !== 'provisional_with_attached_limits') e.push('manifest: bounded provisional publication must remain available');
  if (manifest?.consumption?.review_dependency?.required_to_decide !== false) e.push('manifest: review may not be required to decide');
`);

replaceExact('tools/build-evidence-grounded-judgments.mjs',
`      material_gap_count: materialGaps.length,
      review_only_gap_count: reviewOnlyGaps.length
`,
`      material_gap_count: materialGaps.length,
      review_only_gap_count: reviewOnlyGaps.length,
      clearance_state: review?.publication_status ?? 'not_declared'
`);
replaceExact('tools/build-evidence-grounded-judgments.mjs',
`    publicationEffect: review?.publication_status ?? 'not_declared'
`,
`    publicationEffect: privateSupport
      ? 'support_only'
      : lane.replicability?.public_reproducible === true
        ? 'provisional_with_attached_consumption_contract'
        : 'internal_only'
`);

updateJson('data/project/human-permission-gate-audit-policy.json', value => {
  value.historical_context_patterns = [...new Set([...(value.historical_context_patterns ?? []), 'rejected because', 'refused because'])];
  value.external_empirical_state_prefixes = [...new Set([
    ...(value.external_empirical_state_prefixes ?? []),
    'test/m05-adoption-',
    'tools/m05-adoption-',
    'data/project/m05-answerable-power-',
    'data/research/m05-answerable-power-',
    'reports/core-thesis/answerable-power/'
  ])];
  const selectionRule = value.domain_path_rules.find(rule => rule.domain === 'selection_lane');
  selectionRule.prefixes = [...new Set([
    ...selectionRule.prefixes,
    'data/research/government-to-property-manifest.json',
    'tools/validate-gov-property.mjs'
  ])];
});
replaceExact('tools/build-human-permission-gate-audit.mjs',
`    if (relative === policyPath || relative === ledgerPath || relative.startsWith('docs/methods/evidence-grounded-judgment-authority')) {
`,
`    if (relative === policyPath || relative === ledgerPath || relative === 'data/project/evidence-grounded-judgment-authority.json' || relative.startsWith('docs/methods/evidence-grounded-judgment-authority')) {
`);

const manifest = {
  schema_version: 'no-human-gate-migration@1',
  changed_paths: changed.sort()
};
fs.writeFileSync(full('.github/tmp/no-human-gate-migration-paths.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`no-human-gate migration applied to ${changed.length} paths`);
for (const relative of changed.sort()) console.log(`  ${relative}`);
