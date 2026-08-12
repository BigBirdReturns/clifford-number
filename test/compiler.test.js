import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { buildAdjacency, shortestPath } from '../tools/lib/hops.mjs';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 0, `${cmd} ${args.join(' ')} failed`);
  return res;
}

run(process.execPath, ['tools/compile.mjs']);
run(process.execPath, ['tools/validate-release.mjs']);

const hop = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surface = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const migration = JSON.parse(fs.readFileSync('build/migration-summary.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const ledgerReceipts = fs.readFileSync('data/ledger/receipts.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
assert.equal(legacyGraph.subtitle, 'Seven degrees of UK AI policy topology, with receipts.');

const actor = id => scores.actors.find(a => a.actor_id === id);
const org = id => scores.organizations.find(o => o.organization_id === id);
const surf = id => surface.surfaces.find(s => s.surface_id === id);
const receipt = id => ledgerReceipts.find(row => row.receipt_id === id);
const claim = id => receiptGraph.claims.find(row => row.claim_id === id);

assert.ok(!actor('ben-warner').surfaces.includes('electric-twin-newsuk-synthetic-audience'),
  'Ben Warner must not inherit the organization-only News UK deployment');
assert.ok(!actor('ben-warner').secondary_surface_types.includes('democratic_input_replacement'),
  'Ben Warner must not inherit a democratic-input classification from an organization-only category post');
const newsUkDeployment = surf('electric-twin-newsuk-synthetic-audience');
assert.ok(newsUkDeployment, 'the source-native News UK / Electric Twin deployment must compile');
assert.equal(newsUkDeployment.hop_eligible, false);
assert.equal(newsUkDeployment.hop_refusal_reason, 'organization_only_customer_vendor_deployment');
assert.equal(newsUkDeployment.time_start, '2026-04-27');
assert.equal(newsUkDeployment.time_end, '2026-04-27');
assert.deepEqual(newsUkDeployment.secondary_surface_types, ['model_governance_surface']);
assert.deepEqual(newsUkDeployment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), [],
  'the first-party launch records must not manufacture Ben Warner or another actor participant');
assert.deepEqual(newsUkDeployment.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['electric-twin', 'news-uk']);
assert.deepEqual(newsUkDeployment.receipt_ids, ['newsuk-times-exploraition-launch-2026-04-27', 'electric-twin-times-exploraition-launch-2026-04-28']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === newsUkDeployment.surface_id && row.reason === 'organization_only_customer_vendor_deployment'),
  'compiled graph must expose the organization-only News UK refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === newsUkDeployment.surface_id)),
  'organization-only News UK deployment must never become a hop basis');
assert.equal(newsUkDeployment.participants.find(part => part.organization_id === 'news-uk').participation_type, 'client_product_operator_observation');
assert.equal(newsUkDeployment.participants.find(part => part.organization_id === 'electric-twin').participation_type, 'vendor_platform_provider_observation');
assert.equal(receipt('newsuk-times-exploraition-launch-2026-04-27').decision_support_not_replacement_claim, true);
assert.equal(receipt('electric-twin-times-exploraition-launch-2026-04-28').no_personal_data_claim, true);
assert.equal(receipt('sandhu-comment-newsuk-2026-06-29'), undefined,
  'the superseded lost News UK judgment receipt must be retired');
const gartnerCategoryObservation = surf('gartner-synthetic-population-category-2026');
assert.ok(gartnerCategoryObservation, 'the source-native Gartner category observation must compile');
assert.equal(gartnerCategoryObservation.hop_eligible, false);
assert.equal(gartnerCategoryObservation.hop_refusal_reason, 'organization_only_category_observation');
assert.equal(gartnerCategoryObservation.time_start, '2026-06-25');
assert.equal(gartnerCategoryObservation.time_end, '2026-06-25');
assert.deepEqual(gartnerCategoryObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), [],
  'the Electric Twin company post must not manufacture Ben Warner or another actor participant');
assert.deepEqual(gartnerCategoryObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['electric-twin', 'gartner']);
assert.deepEqual(gartnerCategoryObservation.receipt_ids, ['electric-twin-linkedin-gartner-category-2026-06-25']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === gartnerCategoryObservation.surface_id && row.reason === 'organization_only_category_observation'),
  'compiled graph must expose the organization-only Gartner category refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === gartnerCategoryObservation.surface_id)),
  'organization-only Gartner category context must never become a hop basis');
assert.equal(gartnerCategoryObservation.participants.find(part => part.organization_id === 'electric-twin').participation_type, 'company_reported_category_subject_observation');
assert.equal(gartnerCategoryObservation.participants.find(part => part.organization_id === 'gartner').participation_type, 'attributed_category_maker_context');
const gartnerCategoryReceipt = receipt('electric-twin-linkedin-gartner-category-2026-06-25');
assert.ok(gartnerCategoryReceipt, 'the recoverable Electric Twin Gartner-category receipt must exist');
assert.equal(gartnerCategoryReceipt.source_published_at, '2026-06-25');
assert.equal(gartnerCategoryReceipt.event_date, '2026-06-25');
assert.equal(gartnerCategoryReceipt.reported_companies_reviewed, 60);
assert.equal(gartnerCategoryReceipt.reported_companies_selected_to_watch, 33);
assert.equal(gartnerCategoryReceipt.reported_tier, 'scale_up');
assert.equal(gartnerCategoryReceipt.underlying_gartner_research_recovered, false);
assert.equal(gartnerCategoryReceipt.personal_author_identified, false);
assert.equal(receipt('warner-linkedin-gartner-2026-06-29'), undefined,
  'the superseded lost Ben Warner paste receipt must be retired');

const sourceNativeGartnerClaim = claim('electric-twin-reported-gartner-category-2026-06-25');
assert.ok(sourceNativeGartnerClaim,
  'canonical consumer repair must remove personal Gartner attribution');
assert.deepEqual(sourceNativeGartnerClaim.actor_ids, []);
assert.deepEqual(sourceNativeGartnerClaim.organization_ids.sort(), ['electric-twin', 'gartner']);
assert.deepEqual(sourceNativeGartnerClaim.receipt_ids, ['electric-twin-linkedin-gartner-category-2026-06-25']);
assert.equal(claim('warner-gartner-synthetic-populations-2026-06-29'), undefined,
  'the superseded personal Gartner claim must be retired');

const sourceNativeNewsUkClaim = claim('newsuk-times-exploraition-electric-twin-launch-2026-04-27');
assert.ok(sourceNativeNewsUkClaim, 'the first-party News UK deployment claim must compile');
assert.deepEqual(sourceNativeNewsUkClaim.actor_ids, []);
assert.deepEqual(sourceNativeNewsUkClaim.organization_ids.sort(), ['electric-twin', 'news-uk']);
assert.deepEqual(sourceNativeNewsUkClaim.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]);
assert.equal(claim('electric-twin-newsuk-first-party-data-2026-06-29'), undefined,
  'the superseded user-judgment News UK claim must be retired');

const correctedWarnerChronology = claim('ben-warner-government-commercial-chronology-boundary-2026-08-11');
assert.ok(correctedWarnerChronology, 'the Ben Warner chronology boundary must remain visible');
assert.deepEqual(correctedWarnerChronology.receipt_ids, [
  'uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16',
  'gov-sage-89-ben-warner-no10-2021-05-13',
]);
assert.deepEqual(correctedWarnerChronology.surface_ids, [
  'ben-warner-no10-digital-data-role-observation-2020-2021',
]);
assert.match(correctedWarnerChronology.text, /do not place him on the later News UK deployment or Gartner category surfaces/);

const correctedPolicyDeploymentChain = (scores.chains ?? [])
  .find(row => row.chain_id === 'policy-to-deployment-synthetic-population');
assert.ok(correctedPolicyDeploymentChain, 'the policy-to-deployment chain must remain compiled');
const correctedCommercialDeploymentStage = correctedPolicyDeploymentChain.stages
  .find(stage => stage.order === 4 && stage.stage_category === 'commercial_deployment');
assert.ok(correctedCommercialDeploymentStage, 'the commercial-deployment stage must remain compiled');
assert.equal(correctedCommercialDeploymentStage.organization_id, 'electric-twin');
assert.equal(correctedCommercialDeploymentStage.actor_id, null);
assert.deepEqual(correctedCommercialDeploymentStage.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]);
assert.ok(!JSON.stringify(correctedPolicyDeploymentChain).includes('warner-linkedin-gartner-2026-06-29'));
assert.ok(!JSON.stringify(correctedPolicyDeploymentChain).includes('sandhu-comment-newsuk-2026-06-29'));

assert.ok(!actor('ben-warner').surfaces.includes(gartnerCategoryObservation.surface_id),
  'Ben Warner must not inherit the organization-only Gartner category observation');
assert.equal(surf('faculty-science-officer-employee-overlap-2018-01-24').hop_eligible, true);
assert.equal(surf('faculty-science-director-shareholder-overlap-2024-10-10').hop_eligible, true);
assert.equal(org('electric-twin').surface_factory, true);
assert.ok(actor('simon-case').surfaces.includes('simon-case-cabinet-secretary-2020-2024'));
assert.ok(actor('simon-case').surfaces.includes('electric-twin-ethics-board-2026'));
assert.ok(actor('simon-case').surfaces.includes('team-barrow-public-private-fund-2026'));

const ethicsBoardObservation = surf('electric-twin-ethics-board-2026');
assert.ok(ethicsBoardObservation, 'the source-native Simon Case ethics-board observation must compile');
assert.equal(ethicsBoardObservation.hop_eligible, false);
assert.equal(ethicsBoardObservation.hop_refusal_reason, 'single_actor_advisory_context_only');
assert.equal(ethicsBoardObservation.time_start, '2026-06-11');
assert.equal(ethicsBoardObservation.time_end, '2026-06-11');
assert.deepEqual(ethicsBoardObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the official appointment record must not manufacture another actor participant');
assert.deepEqual(ethicsBoardObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['electric-twin']);
assert.deepEqual(ethicsBoardObservation.receipt_ids, ['civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === ethicsBoardObservation.surface_id && row.reason === 'single_actor_advisory_context_only'), 'compiled graph must expose the single-actor ethics-board refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === ethicsBoardObservation.surface_id)), 'single-actor ethics-board context must never become a hop basis');
const ethicsBoardReceipt = receipt('civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11');
assert.ok(ethicsBoardReceipt, 'the official ethics-board receipt must exist');
assert.equal(ethicsBoardReceipt.source_published_at, '2026-06-11');
assert.equal(ethicsBoardReceipt.event_date, '2026-06-11');
assert.equal(ethicsBoardReceipt.former_service_last_day, '2025-03-31');
assert.equal(ethicsBoardReceipt.role_compensation, 'unpaid');
assert.equal(ethicsBoardReceipt.role_time_commitment, 'part_time');
assert.equal(ethicsBoardReceipt.government_contact_or_lobbying, false);
assert.ok(!ethicsBoardObservation.receipt_ids.includes('times-case-electric-twin-2026'), 'the corrected surface must not inherit the master-only Times reference');

const cabinetSecretaryTenure = surf('simon-case-cabinet-secretary-2020-2024');
assert.ok(cabinetSecretaryTenure, 'the source-native Simon Case Cabinet Secretary tenure must compile');
assert.equal(cabinetSecretaryTenure.hop_eligible, false);
assert.equal(cabinetSecretaryTenure.hop_refusal_reason, 'single_actor_government_role_context_only');
assert.equal(cabinetSecretaryTenure.time_start, '2020-09-09');
assert.equal(cabinetSecretaryTenure.time_end, '2024-12-15');
assert.deepEqual(cabinetSecretaryTenure.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the official tenure records must not manufacture another actor participant');
assert.deepEqual(cabinetSecretaryTenure.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['cabinet-office']);
assert.deepEqual(cabinetSecretaryTenure.receipt_ids, ['gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01', 'gov-simon-case-cabinet-secretary-tenure-end-2024-12-15']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === cabinetSecretaryTenure.surface_id && row.reason === 'single_actor_government_role_context_only'), 'compiled graph must expose the single-actor Cabinet Secretary refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === cabinetSecretaryTenure.surface_id)), 'single-actor Cabinet Secretary tenure must never become a hop basis');
const cabinetAppointmentReceipt = receipt('gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01');
assert.ok(cabinetAppointmentReceipt, 'the official Cabinet Secretary appointment receipt must exist');
assert.equal(cabinetAppointmentReceipt.source_published_at, '2020-09-01');
assert.equal(cabinetAppointmentReceipt.event_date, '2020-09-09');
assert.equal(cabinetAppointmentReceipt.appointment_effective_at, '2020-09-09');
const cabinetTenureEndReceipt = receipt('gov-simon-case-cabinet-secretary-tenure-end-2024-12-15');
assert.ok(cabinetTenureEndReceipt, 'the official Cabinet Secretary tenure-end receipt must exist');
assert.equal(cabinetTenureEndReceipt.tenure_end, '2024-12-15');
assert.equal(cabinetTenureEndReceipt.successor_effective_at, '2024-12-16');
assert.ok(!cabinetSecretaryTenure.receipt_ids.includes('master-doc-v3'), 'the corrected tenure must not inherit the master proxy');

const teamBarrowObservation = surf('team-barrow-public-private-fund-2026');
assert.ok(teamBarrowObservation, 'the source-native Team Barrow governance observation must compile');
assert.equal(teamBarrowObservation.hop_eligible, false);
assert.equal(teamBarrowObservation.hop_refusal_reason, 'single_actor_partnership_governance_context_only');
assert.equal(teamBarrowObservation.time_start, '2025-02-10');
assert.equal(teamBarrowObservation.time_end, '2026-07-02');
assert.deepEqual(teamBarrowObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the organization-level partnership must not manufacture another actor participant');
assert.deepEqual(teamBarrowObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['bae-systems', 'local-council', 'uk-government']);
assert.deepEqual(teamBarrowObservation.receipt_ids, ['gov-mhclg-simon-case-barrow-chair-2025-02-10', 'uk-parliament-plan-for-barrow-statement-2025-02-10', 'westmorland-team-barrow-chair-partnership-2025-02-10', 'civil-service-commission-simon-case-barrow-role-2026-07-02']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === teamBarrowObservation.surface_id && row.reason === 'single_actor_partnership_governance_context_only'), 'compiled graph must expose the Team Barrow partnership-governance refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === teamBarrowObservation.surface_id)), 'single-actor Team Barrow context must never become a hop basis');
const teamBarrowGovernment = teamBarrowObservation.participants.find(part => part.organization_id === 'uk-government');
assert.equal(teamBarrowGovernment.participation_type, 'public_funder_and_appointing_authority_observation');
assert.equal(teamBarrowGovernment.funding_amount_gbp, 200000000);
assert.equal(teamBarrowObservation.participants.find(part => part.organization_id === 'bae-systems').participation_type, 'industry_partner_observation');
assert.equal(teamBarrowObservation.participants.find(part => part.organization_id === 'local-council').participation_type, 'local_government_partner_observation');
assert.equal(receipt('gov-mhclg-simon-case-barrow-chair-2025-02-10').public_funding_amount_gbp, 200000000);
assert.equal(receipt('uk-parliament-plan-for-barrow-statement-2025-02-10').commons_statement_id, 'HCWS428');
assert.equal(receipt('uk-parliament-plan-for-barrow-statement-2025-02-10').lords_statement_id, 'HLWS424');
assert.deepEqual(receipt('westmorland-team-barrow-chair-partnership-2025-02-10').partnership_organizations, ['UK Government', 'Westmorland and Furness Council', 'BAE Systems']);
assert.equal(receipt('civil-service-commission-simon-case-barrow-role-2026-07-02').observed_active_through, '2026-07-02');
assert.equal(receipt('civil-service-commission-simon-case-barrow-role-2026-07-02').continues_to_represent_government, true);
assert.ok(!teamBarrowObservation.receipt_ids.includes('master-doc-v3'), 'the corrected Team Barrow observation must not inherit the master proxy');

const surfaceActorIds = new Set(surface.actors.map(a => a.id));
for (const node of legacyGraph.nodes.filter(n => n.type === 'person')) {
  assert.ok(surfaceActorIds.has(node.id), `${node.label} must be present in the surface app actor index`);
}
assert.ok(surfaceActorIds.has('alex-karp'), 'Alex Karp must be present through the legacy graph bridge, not a one-off ledger patch');
assert.match(surface.actors.find(a => a.id === 'alex-karp')?.description ?? '', /Palantir/, 'legacy bridged actors must carry descriptions for UI context');
const candidates = new Set((surface.candidates ?? []).map(c => c.id));
for (const id of ['candidate-palmer-luckey', 'candidate-jackson-moses', 'candidate-alex-miller', 'candidate-silicon-valley-defense-group']) {
  assert.ok(candidates.has(id), `${id} must be visible as a defense-industrial intake candidate`);
}

for (const edge of hop.edges) {
  for (const basis of edge.surfaces) {
    assert.ok(basis.surface_id, 'hop basis must name surface');
    assert.ok(basis.receipt_ids.length > 0, 'hop basis must carry receipts');
  }
}
assert.ok(migration.total_rows > 200, 'full master doc must be classified');

// Laundering-chain dimension: scored, high, and provably NOT a hop.
const chain = id => (scores.chains ?? []).find(c => c.chain_id === id);
const synthChain = chain('policy-to-deployment-synthetic-population');
assert.ok(synthChain, 'synthetic-population laundering chain must be scored');
assert.equal(synthChain.clifford_number, null, 'a laundering chain must not carry a Clifford Number');
assert.ok(synthChain.laundering_chain_score >= 4, 'synthetic-population chain must span >= 4 stage categories');
assert.equal(synthChain.connector_surfaces_all_non_hop, true, 'chain connector surfaces must be non-hop');
// The Detachment 201 connector surface exists, is non-hop, and never becomes a hop basis.
assert.equal(surf('detachment-201-commissioning-2025').hop_eligible, false, 'Detachment 201 surface must be non-hop');
assert.ok(!hop.edges.some(e => e.surfaces.some(b => b.surface_id === 'detachment-201-commissioning-2025')), 'Detachment 201 must never be a hop basis');
// machine_score and surface_type_recurrence are real, separate dimensions.
assert.ok(actor('ben-warner').machine_score > 0, 'Ben Warner must have a machine_score');
assert.ok(Object.keys(actor('ben-warner').surface_type_recurrence).length > 0, 'Ben Warner must show surface-type recurrence');
assert.ok(actor('matt-clifford').laundering_chain_score >= 4, 'Matt Clifford must anchor the laundering chain');

// Temporal hop regression.
// Every dated hop basis carries a window; the graph declares a temporal rule.
assert.ok(hop.temporal_rule, 'hop graph must declare its temporal rule');
for (const edge of hop.edges) {
  assert.ok(typeof edge.temporal_status === 'string', 'edge must carry temporal_status');
  for (const basis of edge.surfaces) {
    assert.ok(typeof basis.temporal_status === 'string', 'basis must carry temporal_status');
    if (basis.temporal_status === 'dated') {
      // A dated basis has a concrete start; the end may be open (ongoing).
      assert.ok(basis.valid_from || basis.valid_until, `dated basis ${basis.surface_id} must have at least one concrete bound`);
    }
  }
}

// The Action Plan lifecycle is split so development cannot manufacture a Prime Minister hop.
const actionPlanDevelopment = surf('ai-opportunities-action-plan-development-2024-2025');
assert.ok(actionPlanDevelopment, 'the commission and development predecessor surface must be compiled');
assert.equal(actionPlanDevelopment.hop_eligible, false, 'development lifecycle must remain context only');
assert.deepEqual(actionPlanDevelopment.receipt_ids, [
  'gov-ai-opportunities-action-plan-terms-2024-07-26',
  'gov-ai-opportunities-action-plan'
]);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === actionPlanDevelopment.surface_id)),
  'the development predecessor must never create an actor hop');
const developmentActors = actionPlanDevelopment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert.deepEqual(developmentActors, ['matt-clifford']);

const termsReceipt = receipt('gov-ai-opportunities-action-plan-terms-2024-07-26');
assert.ok(termsReceipt, 'the exact dated commission receipt must exist');
assert.equal(termsReceipt.path, 'receipts/topology/gov-ai-opportunities-action-plan-terms-2024-07-26.md');
assert.equal(termsReceipt.source_published_at, '2024-07-26');
assert.equal(termsReceipt.event_date, '2024-07-26');
assert.equal(receipt('gov-ai-opportunities-action-plan').source_published_at, '2025-01-13');
assert.equal(receipt('gov-pm-ai-blueprint-2025').source_published_at, '2025-01-12');
assert.equal(receipt('gov-pm-ai-blueprint-2025').source_updated_at, '2025-01-13');
assert.equal(receipt('gov-pm-ai-blueprint-2025').event_date, '2025-01-13');

// The actor-to-actor answer rests only on the one-day publication and response surface.
const starmerClifford = hop.edges.find(e =>
  [e.actor_a, e.actor_b].sort().join('|') === 'keir-starmer|matt-clifford');
assert.ok(starmerClifford, 'Keir Starmer and Matt Clifford must connect through the dated Action Plan response');
const actionPlanBasis = starmerClifford.surfaces.find(s => s.surface_id === 'ai-opportunities-action-plan-2025');
assert.ok(actionPlanBasis, 'Starmer/Clifford must name the publication and response surface as the hop basis');
assert.equal(actionPlanBasis.surface_label, 'AI Opportunities Action Plan publication and government response, 13 January 2025');
assert.equal(actionPlanBasis.evidence_class, 'official');
assert.equal(actionPlanBasis.valid_from, '2025-01-13');
assert.equal(actionPlanBasis.valid_until, '2025-01-13');
assert.deepEqual(actionPlanBasis.receipt_ids, ['gov-ai-opportunities-action-plan', 'gov-pm-ai-blueprint-2025']);
const topology = buildAdjacency(hop.edges);

// The former multi-year Faculty aggregation depended on a lost scratch audit
// and an undated investor inference. It is replaced by two source-native,
// exact-date company surfaces: one repairs the Warner/Klein company basis and
// the other admits the previously blocked Clifford shareholding bridge.
assert.equal(surf('faculty-investor-employee-2015-2019'), undefined,
  'the unrecoverable 2015-2019 Faculty aggregation must be retired');
const faculty2018 = surf('faculty-science-officer-employee-overlap-2018-01-24');
assert.ok(faculty2018, 'the exact 2018 Faculty officer/employee surface must compile');
assert.equal(faculty2018.surface_label,
  'Faculty Science officer / employee overlap, 24 January 2018');
assert.equal(faculty2018.time_start, '2018-01-24');
assert.equal(faculty2018.time_end, '2018-01-24');
assert.equal(faculty2018.evidence_class, 'primary_public');
assert.deepEqual(faculty2018.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
  'companies-house-faculty-science-officers-08873131',
]);
assert.deepEqual(
  faculty2018.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['ben-warner', 'marc-warner', 'saul-klein'],
);
const benFacultyParticipation = faculty2018.participants.find(part => part.actor_id === 'ben-warner');
assert.deepEqual(benFacultyParticipation?.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
], 'Ben Warner participation must carry both the dated role observation and the explicit brand-to-company join');
assert.ok(!faculty2018.receipt_ids.includes('warner-surface-audit-2026-06-29'),
  'the repaired Faculty surface must carry no lost scratch receipt');
assert.ok(!faculty2018.participants.some(part => part.actor_id === 'matt-clifford'),
  'the 2024 Clifford shareholding must not be backdated onto the 2018 company surface');
for (const pair of [
  ['ben-warner', 'marc-warner'],
  ['ben-warner', 'saul-klein'],
  ['marc-warner', 'saul-klein'],
]) {
  const edge = hop.edges.find(row => [row.actor_a, row.actor_b].sort().join('|') === [...pair].sort().join('|'));
  const basis = edge?.surfaces.find(row => row.surface_id === faculty2018.surface_id);
  assert.ok(basis, `${pair.join('/')} must carry the exact 2018 Faculty basis`);
  assert.equal(basis.valid_from, '2018-01-24');
  assert.equal(basis.valid_until, '2018-01-24');
  assert.equal(basis.temporal_status, 'dated');
  assert.equal(basis.evidence_class, 'primary_public');
  assert.deepEqual(basis.receipt_ids, faculty2018.receipt_ids);
}

const faculty2024 = surf('faculty-science-director-shareholder-overlap-2024-10-10');
assert.ok(faculty2024, 'the official Clifford-to-Faculty bridge must compile');
assert.equal(faculty2024.surface_label,
  'Faculty Science director / shareholder overlap, 10 October 2024');
assert.equal(faculty2024.time_start, '2024-10-10');
assert.equal(faculty2024.time_end, '2024-10-10');
assert.equal(faculty2024.evidence_class, 'official');
assert.deepEqual(faculty2024.receipt_ids, [
  'gov-dsit-matt-clifford-faculty-shareholding-2024-10-10',
  'companies-house-faculty-science-officers-08873131',
]);
assert.deepEqual(
  faculty2024.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['marc-warner', 'matt-clifford', 'saul-klein'],
);
for (const actorId of ['marc-warner', 'saul-klein']) {
  const edge = hop.edges.find(row => [row.actor_a, row.actor_b].sort().join('|') === [actorId, 'matt-clifford'].sort().join('|'));
  const basis = edge?.surfaces.find(row => row.surface_id === faculty2024.surface_id);
  assert.ok(basis, `Matt Clifford and ${actorId} must carry the official Faculty bridge`);
  assert.equal(basis.valid_from, '2024-10-10');
  assert.equal(basis.valid_until, '2024-10-10');
  assert.equal(basis.temporal_status, 'dated');
  assert.equal(basis.evidence_class, 'official');
  assert.deepEqual(basis.receipt_ids, faculty2024.receipt_ids);
}
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-09' }).number, null,
  'the shareholding declaration must not backdate the company hop');
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-10' }).number, 1);
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-11' }).number, null,
  'the one-day declaration observation must not become an open-ended shareholding interval');
assert.equal(shortestPath(topology, 'saul-klein', 'matt-clifford', { asOf: '2024-10-10' }).number, 1);
assert.equal(shortestPath(topology, 'ben-warner', 'matt-clifford').number, 2,
  'the all-time topology must now join Ben Warner to Clifford through a receipted Faculty director');
assert.equal(shortestPath(topology, 'ben-warner', 'matt-clifford', { asOf: '2024-10-10' }).number, null,
  'the all-time two-hop route must not masquerade as contemporaneous in 2024');

const facultyOfficerReceipt = receipt('companies-house-faculty-science-officers-08873131');
assert.equal(facultyOfficerReceipt.company_number, '08873131');
assert.equal(facultyOfficerReceipt.marc_warner_appointed_at, '2014-02-03');
assert.equal(facultyOfficerReceipt.saul_klein_appointed_at, '2016-04-21');
assert.equal(facultyOfficerReceipt.saul_klein_resigned_at, '2026-03-12');
const benFacultyReceipt = receipt('zebra-ben-warner-asi-commercial-principal-2018-01-24');
assert.equal(benFacultyReceipt.event_date, '2018-01-24');
assert.match(benFacultyReceipt.notes, /one-day role observation/i);
const facultyIdentityReceipt = receipt('faculty-asi-data-science-legal-identity-08873131');
assert.equal(facultyIdentityReceipt.brand_name, 'ASI Data Science');
assert.equal(facultyIdentityReceipt.successor_brand, 'Faculty');
assert.equal(facultyIdentityReceipt.legal_entity, 'Faculty Science Limited');
assert.equal(facultyIdentityReceipt.company_number, '08873131');
assert.equal(facultyIdentityReceipt.previous_legal_name, 'Advanced Skills Initiative Limited');
assert.match(facultyIdentityReceipt.notes, /without relying on a canonical alias/i);
const cliffordFacultyReceipt = receipt('gov-dsit-matt-clifford-faculty-shareholding-2024-10-10');
assert.equal(cliffordFacultyReceipt.event_date, '2024-10-10');
assert.equal(cliffordFacultyReceipt.divestment_confirmed_at, '2025-02-24');
assert.match(cliffordFacultyReceipt.notes, /one-day shareholding observation/i);


// Electric Twin legal formation is a one-day co-participation event, not an open-ended founder relationship.
assert.equal(surf('electric-twin-founder-2023'), undefined,
  'the legacy open-ended founder surface must be retired');
const electricTwinIncorporation = surf('electric-twin-incorporation-2023-09-28');
assert.ok(electricTwinIncorporation, 'the exact Electric Twin incorporation surface must compile');
assert.equal(electricTwinIncorporation.surface_label,
  'Electric Twin incorporation and initial-director surface, 28 September 2023');
assert.equal(electricTwinIncorporation.hop_eligible, true);
assert.equal(electricTwinIncorporation.time_start, '2023-09-28');
assert.equal(electricTwinIncorporation.time_end, '2023-09-28');
assert.deepEqual(electricTwinIncorporation.receipt_ids,
  ['companies-house-electric-twin-incorporation-2023-09-28']);
assert.deepEqual(
  electricTwinIncorporation.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['alex-cooper', 'ben-warner']
);
const benAlexElectricTwin = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'alex-cooper|ben-warner');
assert.ok(benAlexElectricTwin, 'the two initial directors must share the dated incorporation surface');
const incorporationHopBasis = benAlexElectricTwin.surfaces.find(basis =>
  basis.surface_id === 'electric-twin-incorporation-2023-09-28');
assert.ok(incorporationHopBasis);
assert.equal(incorporationHopBasis.evidence_class, 'official');
assert.equal(incorporationHopBasis.valid_from, '2023-09-28');
assert.equal(incorporationHopBasis.valid_until, '2023-09-28');
assert.deepEqual(incorporationHopBasis.receipt_ids,
  ['companies-house-electric-twin-incorporation-2023-09-28']);
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-27' }).number, null,
  'the incorporation record must not backdate initial-director adjacency');
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-28' }).number, 1);
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-29' }).number, null,
  'the incorporation event must not become an ongoing relationship');
for (const [surfaceId, actorId] of [
  ['electric-twin-ben-warner-director-tenure-2023-09-28', 'ben-warner'],
  ['electric-twin-alex-cooper-director-tenure-2023-09-28', 'alex-cooper'],
]) {
  const tenure = surf(surfaceId);
  assert.ok(tenure, `${surfaceId} must compile`);
  assert.equal(tenure.hop_eligible, false, `${surfaceId} must remain non-hop`);
  assert.equal(tenure.time_start, '2023-09-28');
  assert.equal(tenure.time_end, '2026-08-11');
  assert.deepEqual(tenure.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
    [actorId]);
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)),
    `${surfaceId} must never manufacture pairwise adjacency`);
}
const electricTwinIncorporationReceipt = receipt('companies-house-electric-twin-incorporation-2023-09-28');
assert.equal(electricTwinIncorporationReceipt.path,
  'receipts/topology/companies-house-electric-twin-incorporation-2023-09-28.md');
assert.equal(electricTwinIncorporationReceipt.evidence_class, 'official');
assert.equal(electricTwinIncorporationReceipt.event_date, '2023-09-28');
assert.equal(electricTwinIncorporationReceipt.retrieved_at, '2026-08-11');
assert.ok(actor('ben-warner').surfaces.includes('electric-twin-ben-warner-director-tenure-2023-09-28'));
assert.ok(actor('alex-cooper').surfaces.includes('electric-twin-alex-cooper-director-tenure-2023-09-28'));
assert.equal(shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025-01-13' }).number, 1);
assert.equal(shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025' }).number, 1);
assert.equal(
  shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025-01-12' }).number,
  null,
  'the source publication date is not the event date and must not create a 12 January path'
);
assert.equal(
  shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2024' }).number,
  null,
  'the commission and development surface must not manufacture Starmer participation'
);

// The Electric Twin capital layer is a dated financing-announcement surface, not a 2023-2026 relationship span.
assert.equal(surf('electric-twin-funding-surface-2023-2026'), undefined,
  'the legacy multi-year funding surface must be retired');
const electricTwinSeed = surf('electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinSeed, 'the source-native Electric Twin seed-round surface must compile');
assert.equal(electricTwinSeed.surface_label, 'Electric Twin $10m seed round announcement, 11 February 2026');
assert.equal(electricTwinSeed.hop_eligible, true);
assert.deepEqual(electricTwinSeed.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'tech-eu-electric-twin-seed-round-2026-02-12'
]);
assert.ok(!electricTwinSeed.receipt_ids.includes('master-doc-v3'),
  'the funding surface must no longer rest on the master-summary receipt');

const electricTwinSeedActors = electricTwinSeed.participants
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)
  .sort();
assert.deepEqual(electricTwinSeedActors, [
  'cal-henderson',
  'eric-salama',
  'louis-mosley',
  'marc-andreessen',
  'tom-shinner'
]);
const electricTwinSeedOrgs = electricTwinSeed.participants
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)
  .sort();
assert.deepEqual(electricTwinSeedOrgs, ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos']);
const seedParticipant = id => electricTwinSeed.participants.find(part =>
  part.actor_id === id || part.organization_id === id);
for (const id of ['electric-twin', 'atomico', 'localglobe', 'mercuri', 'marc-andreessen']) {
  assert.equal(seedParticipant(id).evidence_class, 'primary_public', `${id} must retain company-source evidence`);
}
for (const id of ['samos', 'cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley']) {
  assert.equal(seedParticipant(id).evidence_class, 'reported', `${id} must remain reported`);
}

const electricTwinAnnouncementReceipt = receipt('electric-twin-seed-round-announcement-2026-02-11');
const techEuFundingReceipt = receipt('tech-eu-electric-twin-seed-round-2026-02-12');
assert.equal(electricTwinAnnouncementReceipt.path,
  'receipts/topology/electric-twin-seed-round-announcement-2026-02-11.md');
assert.equal(electricTwinAnnouncementReceipt.source_published_at, '2026-02-11');
assert.equal(electricTwinAnnouncementReceipt.event_date, '2026-02-11');
assert.equal(techEuFundingReceipt.source_published_at, '2026-02-12');
assert.equal(techEuFundingReceipt.event_date, '2026-02-11',
  'the reporting date must remain separate from the announcement event date');

const andreessenSalama = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'eric-salama|marc-andreessen');
assert.ok(andreessenSalama, 'the reported angels must share the bounded announced round');
const electricTwinFundingBasis = andreessenSalama.surfaces.find(basis =>
  basis.surface_id === 'electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinFundingBasis);
assert.equal(electricTwinFundingBasis.evidence_class, 'reported');
assert.equal(electricTwinFundingBasis.valid_from, '2026-02-11');
assert.equal(electricTwinFundingBasis.valid_until, '2026-02-11');
assert.deepEqual(electricTwinFundingBasis.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'tech-eu-electric-twin-seed-round-2026-02-12'
]);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-10' }).number, null,
  'the funding announcement must not backdate investor adjacency');
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-11' }).number, 1);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-12' }).number, null,
  'a one-day announcement surface must not become an ongoing relationship');

const benBlumeAppointment = surf('electric-twin-ben-blume-director-appointment-2025-09-12');
assert.ok(benBlumeAppointment, 'the official Ben Blume officer appointment must compile separately');
assert.equal(benBlumeAppointment.hop_eligible, false);
assert.deepEqual(
  benBlumeAppointment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['ben-blume']
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === benBlumeAppointment.surface_id)),
  'a single-actor officer appointment must never manufacture pairwise adjacency');
const benBlumeReceipt = receipt('companies-house-electric-twin-ben-blume-director-2025-09-12');
assert.equal(benBlumeReceipt.event_date, '2025-09-12');
assert.equal(benBlumeReceipt.evidence_class, 'official');

// September 2025 corporate filings preserve governance rights and capital mechanics without inventing allottees.
const electricTwinGovernance = surf('electric-twin-seed2-governance-instrument-2025-09-12');
assert.ok(electricTwinGovernance, 'the September governance instrument must compile');
assert.equal(electricTwinGovernance.hop_eligible, false);
assert.equal(electricTwinGovernance.time_start, '2025-09-12');
assert.equal(electricTwinGovernance.time_end, '2025-09-12');
assert.deepEqual(
  electricTwinGovernance.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
  ['alex-cooper', 'ben-warner']
);
assert.deepEqual(
  electricTwinGovernance.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(),
  ['atomico', 'electric-twin', 'localglobe']
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === electricTwinGovernance.surface_id)),
  'the governance instrument must never create actor adjacency');

const electricTwinCapitalActions = surf('electric-twin-seed2-capital-actions-2025-09-16-2025-09-26');
assert.ok(electricTwinCapitalActions, 'the September capital-action sequence must compile');
assert.equal(electricTwinCapitalActions.hop_eligible, false);
assert.deepEqual(
  electricTwinCapitalActions.participants.map(part => part.organization_id ?? part.actor_id),
  ['electric-twin'],
  'unidentified allottees must not be manufactured as participants'
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === electricTwinCapitalActions.surface_id)),
  'issuer-only capital actions must never create actor adjacency');

const articlesReceipt = receipt('companies-house-electric-twin-articles-2025-09-12');
const resolutionsReceipt = receipt('companies-house-electric-twin-written-resolutions-2025-09-12');
const sh01Seed2Sixteen = receipt('companies-house-electric-twin-sh01-seed2-2025-09-16');
const sh01Seed2Seventeen = receipt('companies-house-electric-twin-sh01-seed2-2025-09-17');
const sh01Seed2TwentySix = receipt('companies-house-electric-twin-sh01-seed2-2025-09-26');
const sh08Seed1 = receipt('companies-house-electric-twin-sh08-seed1-2025-09-16');
const sh10Rights = receipt('companies-house-electric-twin-sh10-rights-2025-09-12');
for (const row of [articlesReceipt, resolutionsReceipt, sh01Seed2Sixteen, sh01Seed2Seventeen, sh01Seed2TwentySix, sh08Seed1, sh10Rights]) {
  assert.ok(row, 'every September filing must have a canonical receipt');
  assert.equal(row.evidence_class, 'official');
  assert.match(row.source_pdf_sha256, /^[0-9a-f]{64}$/);
  assert.equal(row.publisher, 'Companies House');
}
assert.equal(articlesReceipt.event_date, '2025-09-12');
assert.equal(articlesReceipt.source_published_at, '2025-09-23');
assert.equal(resolutionsReceipt.event_date, '2025-09-12');
assert.equal(sh01Seed2Sixteen.source_filing_code, 'XEBSKAZE');
assert.equal(sh01Seed2Seventeen.source_filing_code, 'XEBVCAMW');
assert.equal(sh01Seed2TwentySix.source_filing_code, 'XEC3EZXL');
assert.equal(sh08Seed1.event_date, '2025-09-16');
assert.equal(sh10Rights.event_date, '2025-09-12');

assert.ok(claim('electric-twin-seed2-board-rights-2025-09-12'));
assert.ok(claim('electric-twin-seed2-investor-rights-2025-09-12'));
assert.ok(claim('electric-twin-seed2-allotment-sequence-2025-09'));
const unidentifiedAllottees = claim('electric-twin-seed2-allottees-unidentified-2025-09');
assert.ok(unidentifiedAllottees);
assert.deepEqual(unidentifiedAllottees.actor_ids, []);
assert.deepEqual(unidentifiedAllottees.organization_ids, ['electric-twin']);
assert.ok(!unidentifiedAllottees.text.match(/Atomico|LocalGlobe|Mercuri|Samos|Andreessen|Henderson|Salama|Shinner|Mosley/),
  'the SH01 non-identification claim must not smuggle the announced roster into the filed allotments');

const benBlumeGovernanceParticipant = electricTwinGovernance.participants.find(part => part.actor_id === 'ben-blume');
assert.equal(benBlumeGovernanceParticipant, undefined,
  'the articles do not identify Ben Blume as an Atomico or LocalGlobe appointee');

// The previously undisclosed $4m pre-seed remains undated and has no promoted participant surface.
assert.ok(!surface.surfaces.some(row => /pre.?seed/i.test(row.surface_id)),
  'the undated pre-seed disclosure must not be promoted into a dated surface');

// The Strategic Defence Review lifecycle is split so commissioning authority cannot become year-long co-work.
const sdrDevelopment = surf('strategic-defence-review-development-2024-2025');
assert.ok(sdrDevelopment, 'the external-reviewer workstream must be compiled');
assert.equal(sdrDevelopment.hop_eligible, false, 'the review workstream must remain context only');
assert.deepEqual(sdrDevelopment.receipt_ids, ['gov-sdr-terms-of-reference', 'gov-sdr-2025-publication']);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === sdrDevelopment.surface_id)),
  'the review workstream must never create actor adjacency');
assert.deepEqual(
  sdrDevelopment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
  ['fiona-hill', 'george-robertson', 'john-healey', 'richard-barrons']
);

const sdrTermsReceipt = receipt('gov-sdr-terms-of-reference');
const sdrPublicationReceipt = receipt('gov-sdr-2025-publication');
assert.equal(sdrTermsReceipt.source_published_at, '2024-07-17');
assert.equal(sdrTermsReceipt.event_date, '2024-07-17');
assert.equal(sdrPublicationReceipt.source_published_at, '2025-06-02');
assert.equal(sdrPublicationReceipt.source_updated_at, '2025-07-08');
assert.equal(sdrPublicationReceipt.event_date, '2025-06-02');

const starmerBarrons = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'keir-starmer|richard-barrons');
assert.ok(starmerBarrons, 'Keir Starmer and Richard Barrons must connect on the bounded terms record');
const sdrTermsBasis = starmerBarrons.surfaces.find(basis => basis.surface_id === 'strategic-defence-review-2024-2025');
assert.ok(sdrTermsBasis, 'the Starmer/Barrons edge must name the terms-and-commission surface');
assert.equal(sdrTermsBasis.surface_label, 'Strategic Defence Review terms and commission, 17 July 2024');
assert.equal(sdrTermsBasis.evidence_class, 'official');
assert.equal(sdrTermsBasis.valid_from, '2024-07-17');
assert.equal(sdrTermsBasis.valid_until, '2024-07-17');
assert.deepEqual(sdrTermsBasis.receipt_ids, ['gov-sdr-terms-of-reference']);
const activeSdrTermsBasis = date => starmerBarrons.surfaces.filter(basis =>
  basis.surface_id === 'strategic-defence-review-2024-2025'
    && basis.valid_from <= date
    && basis.valid_until >= date);
assert.equal(activeSdrTermsBasis('2024-07-16').length, 0, 'the terms record must not backdate a direct hop to the launch date');
assert.equal(activeSdrTermsBasis('2024-07-17').length, 1, 'the terms record supports the direct hop only on its publication date');
assert.equal(activeSdrTermsBasis('2025-06-02').length, 0, 'final-report publication must not manufacture a later Prime Minister hop');
assert.equal(shortestPath(topology, 'keir-starmer', 'richard-barrons', { asOf: '2024-07-17' }).number, 1);

// Broad institutions are context, not actor-hop surfaces. The former No. 10
// office aggregation manufactured pairwise edges from reporting-line and
// roster inferences. It is replaced by a single-actor, source-native role
// observation with an explicit broad-institution refusal reason.
assert.equal(surf('no10-digital-data-advisory-2019-2021'), undefined, 'legacy broad No. 10 aggregation must be retired');
const no10Observation = surf('ben-warner-no10-digital-data-role-observation-2020-2021');
assert.ok(no10Observation, 'source-native Ben Warner No. 10 role observation must compile');
assert.equal(no10Observation.hop_eligible, false);
assert.equal(no10Observation.hop_refusal_reason, 'broad_institution_context_only');
assert.deepEqual(
  no10Observation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['ben-warner'],
  'No. 10 role observation must not import inferred colleagues as actor participants',
);
assert.deepEqual(
  no10Observation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
  ['no-10'],
  'No. 10 may remain as broad institutional context only',
);
assert.deepEqual(no10Observation.receipt_ids, ['uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16', 'gov-sage-89-ben-warner-no10-2021-05-13']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021' && row.reason === 'broad_institution_context_only'),
  'compiled graph must expose the constitutional broad-institution refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021')),
  'single-actor No. 10 context must never become a hop basis');
for (const actorId of ['dominic-cummings', 'dan-rosenfield', 'laura-gilbert', 'ben-henshall']) {
  assert.ok(!no10Observation.participants.some(part => part.actor_id === actorId),
    `${actorId} must not survive as an inferred participant on the corrected No. 10 observation`);
}
const inquiryRoleReceipt = receipt('uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16');
assert.equal(inquiryRoleReceipt.source_document_id, 'INQ000272142');
assert.equal(inquiryRoleReceipt.event_date_start, '2020-03-13');
assert.equal(inquiryRoleReceipt.event_date_end, '2020-03-16');
const sage89Receipt = receipt('gov-sage-89-ben-warner-no10-2021-05-13');
assert.equal(sage89Receipt.event_date, '2021-05-13');
assert.match(sage89Receipt.notes, /eighty-seven recorded attendees/i);
assert.equal(receipt('official-no10-ben-warner'), undefined,
  'master-document proxy receipt must be retired after source-native capture');
const voteLeave = surf('vote-leave-data-science-2016');
assert.ok(voteLeave, 'the Vote Leave / ASI organization-only surface must compile');
assert.equal(voteLeave.hop_eligible, false);
assert.equal(voteLeave.hop_refusal_reason, 'organization_only_evidence');
assert.deepEqual(
  voteLeave.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['dominic-cummings'],
  'the parliamentary transcript must not manufacture Warner actor participation',
);
assert.deepEqual(
  voteLeave.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
  ['vote-leave'],
);
assert.deepEqual(voteLeave.receipt_ids, ['uk-parliament-wylie-vote-leave-asi-2018-03-27']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === voteLeave.surface_id && row.reason === 'organization_only_evidence'),
  'compiled graph must expose the organization-only refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === voteLeave.surface_id)),
  'organization-only Vote Leave evidence must never become a hop basis');
for (const actorId of ['ben-warner', 'marc-warner']) {
  assert.ok(!voteLeave.participants.some(part => part.actor_id === actorId),
    `${actorId} must not survive as an inferred Vote Leave participant`);
  assert.ok(!actor(actorId).surfaces.includes(voteLeave.surface_id),
    `${actorId} score must not inherit the organization-only Vote Leave surface`);
}
for (const pair of [
  ['ben-warner', 'dominic-cummings'],
  ['marc-warner', 'dominic-cummings'],
]) {
  assert.ok(!hop.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|') === [...pair].sort().join('|')),
    `${pair.join('/')} must have no direct edge after the organization-only correction`);
}
const voteLeaveReceipt = receipt('uk-parliament-wylie-vote-leave-asi-2018-03-27');
assert.ok(voteLeaveReceipt, 'the official Parliament transcript receipt must exist');
assert.equal(voteLeaveReceipt.source_document_id, 'HC 363');
assert.equal(voteLeaveReceipt.event_date, '2018-03-27');
assert.match(voteLeaveReceipt.notes, /organization-level service relationship/i);
assert.ok(!voteLeave.receipt_ids.includes('warner-surface-audit-2026-06-29'),
  'the corrected Vote Leave surface must carry no lost scratch receipt');

console.log('compiler.test: OK');
