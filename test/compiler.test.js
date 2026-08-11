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
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const ledgerReceipts = fs.readFileSync('data/ledger/receipts.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
assert.equal(legacyGraph.subtitle, 'Seven degrees of UK AI policy topology, with receipts.');

const actor = id => scores.actors.find(a => a.actor_id === id);
const org = id => scores.organizations.find(o => o.organization_id === id);
const surf = id => surface.surfaces.find(s => s.surface_id === id);
const receipt = id => ledgerReceipts.find(row => row.receipt_id === id);

assert.ok(actor('ben-warner').surfaces.includes('electric-twin-newsuk-synthetic-audience'));
assert.ok(actor('ben-warner').secondary_surface_types.includes('democratic_input_replacement'));
assert.equal(surf('electric-twin-newsuk-synthetic-audience').hop_eligible, false);
assert.equal(surf('gartner-synthetic-population-category-2026').hop_eligible, false);
assert.equal(surf('faculty-investor-employee-2015-2019').hop_eligible, true);
assert.equal(org('electric-twin').surface_factory, true);
assert.ok(actor('simon-case').surfaces.includes('simon-case-cabinet-secretary-2020-2024'));
assert.ok(actor('simon-case').surfaces.includes('electric-twin-ethics-board-2026'));
assert.ok(actor('simon-case').surfaces.includes('team-barrow-public-private-fund-2026'));
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

// Disjoint dated participations on the same surface must NOT hop. Rosenfield
// (No.10, 2021) and Cummings (No.10, 2019-2020) shared the surface in
// different windows, so there is no direct Rosenfield↔Cummings hop.
const directRosenfieldCummings = hop.edges.some(e =>
  (e.actor_a === 'dan-rosenfield' && e.actor_b === 'dominic-cummings') ||
  (e.actor_a === 'dominic-cummings' && e.actor_b === 'dan-rosenfield'));
assert.ok(!directRosenfieldCummings, 'Rosenfield and Cummings must not hop: disjoint windows on the shared surface');
assert.ok((hop.rejected_hop_pairs ?? []).some(p =>
  [p.actor_a, p.actor_b].sort().join('|') === 'dan-rosenfield|dominic-cummings' && p.reason === 'no_temporal_overlap'),
  'the disjoint Rosenfield/Cummings pair must be recorded in rejected_hop_pairs');
const rosenfieldCummingsRejection = hop.rejected_hop_pairs.find(p =>
  p.actor_a === 'dan-rosenfield' && p.actor_b === 'dominic-cummings');
assert.deepEqual(rosenfieldCummingsRejection.actor_a_window, {
  valid_from: '2021-01-01', valid_until: '2021-12-31', dated: true
}, 'Dan Rosenfield must retain his own 2021 participant window after actor IDs are sorted');
assert.deepEqual(rosenfieldCummingsRejection.actor_b_window, {
  valid_from: '2019-01-01', valid_until: '2020-12-31', dated: true
}, 'Dominic Cummings must retain his own 2019-2020 participant window after actor IDs are sorted');
assert.deepEqual(rosenfieldCummingsRejection.actor_a_receipt_ids, ['warner-surface-audit-2026-06-29']);
assert.deepEqual(rosenfieldCummingsRejection.actor_b_receipt_ids, ['warner-surface-audit-2026-06-29']);
assert.deepEqual(rosenfieldCummingsRejection.surface_receipt_ids, ['official-no10-ben-warner', 'warner-surface-audit-2026-06-29']);
assert.deepEqual(rosenfieldCummingsRejection.receipt_ids, ['official-no10-ben-warner', 'warner-surface-audit-2026-06-29']);
assert.equal(rosenfieldCummingsRejection.actor_a_window_reverifiable, false);
assert.equal(rosenfieldCummingsRejection.actor_b_window_reverifiable, false);
assert.equal(rosenfieldCummingsRejection.evidence_class, 'judgment');
assert.equal(rosenfieldCummingsRejection.publication_status, 'review_required');
assert.equal(rosenfieldCummingsRejection.publication_reason, 'actor_window_receipts_not_publicly_reverifiable');
const no10Participants = surf('no10-digital-data-advisory-2019-2021').participants;
assert.equal(no10Participants.find(part => part.actor_id === 'dan-rosenfield').evidence_class, 'judgment');
assert.equal(no10Participants.find(part => part.actor_id === 'dominic-cummings').evidence_class, 'judgment');
// Overlap window is the intersection, not a union: Warner/Cummings on No.10
// overlaps only where both were present (Warner 2019-12→2021-05, Cummings
// 2019→2020) → 2019-12 through 2020-12.
const wc = hop.edges.find(e =>
  [e.actor_a, e.actor_b].sort().join('|') === 'ben-warner|dominic-cummings');
const no10 = wc?.surfaces.find(s => s.surface_id === 'no10-digital-data-advisory-2019-2021');
assert.ok(no10, 'Warner/Cummings must share the No.10 surface');
assert.equal(no10.valid_from, '2019-12-01', 'Warner/Cummings overlap starts at the later of the two start dates');
assert.equal(no10.valid_until, '2020-12-31', 'Warner/Cummings overlap ends at the earlier of the two end dates');

console.log('compiler.test: OK');
