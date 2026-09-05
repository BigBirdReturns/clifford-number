#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadAll, readJson, indexBy, root } from './lib/ledger.mjs';
import { windowOf, intersectAll, UNBOUNDED } from './lib/temporal.mjs';
import { isFieldAutopsyCase, loadFieldAutopsy, validateFieldAutopsy } from './lib/field-autopsy.mjs';
import { buildIdentityLayer } from './lib/axm-identity.mjs';
import { checkReceiptArchival, todayString } from './lib/receipt-archival.mjs';
import { assessHopDensity, validateDensityPolicy } from './lib/density.mjs';
import { receiptSupportsPublishedWindow } from './lib/hops.mjs';
import { validateCorpusSelection } from './validate-corpus-selection.mjs';
import { validateConsumptionContract } from './validate-consumption-contract.mjs';
import { validateOfficeholderCohort } from './validate-officeholder-cohort.mjs';

const data = loadAll();
const scores = readJson('build/scores.json');
const hopGraph = readJson('build/hop-graph.json');
const surfaceGraph = readJson('build/surface-graph.json');
const migration = readJson('build/migration-summary.json');
const surfaceById = indexBy(surfaceGraph.surfaces, 'surface_id');
const surfaceTypeById = indexBy(data.surfaceTypes, 'id');
const actorScore = new Map(scores.actors.map(a => [a.actor_id, a]));
const orgScore = new Map(scores.organizations.map(o => [o.organization_id, o]));
const receiptById = indexBy(data.receipts, 'receipt_id');
const claimById = indexBy(data.claims ?? [], 'claim_id');
const chainById = indexBy(data.chains ?? [], 'chain_id');

const errors = [];
const warnings = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }

// Completed transport must not survive on the canonical release tree. These
// paths were branch-local bootstrap for M-03 and M-05, both of which now have
// permanent builders, validators, reports, and release gates on main. Keeping
// the carriers or self-removing writers after completion creates a second,
// stale authority surface and makes later audits mistake transport for source.
for (const completedTransportPath of [
  '.github/temporary',
  '.github/workflows/temporary-m03-apply.yml',
  '.github/workflows/temporary-m03-source-export.yml',
  '.github/workflows/temporary-materialize-m05-s03-l7.yml',
]) {
  assert(!fs.existsSync(path.join(root, completedTransportPath)),
    `completed transport remains on the release tree: ${completedTransportPath}`);
}
function sameWindow(left, right) {
  return (left?.valid_from ?? null) === (right?.valid_from ?? null)
    && (left?.valid_until ?? null) === (right?.valid_until ?? null)
    && Boolean(left?.dated) === Boolean(right?.dated);
}
function sameIdSet(left = [], right = []) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

// Constitutional selection-layer gate. A release cannot be individually
// careful at the edge while silently choosing asymmetric or unmeasured corpora.
for (const error of validateCorpusSelection({ root: process.cwd() }).errors) {
  errors.push(`selection ${error.code} (${error.file}): ${error.message}`);
}
for (const error of validateConsumptionContract({ root: process.cwd() }).errors) {
  errors.push(`consumption ${error.code} (${error.file}): ${error.message}`);
}
for (const error of validateOfficeholderCohort({ root: process.cwd() }).errors) {
  errors.push(`officeholder ${error.code} (${error.file}): ${error.message}`);
}
function hasSurface(actorId, surfaceId) {
  return actorScore.get(actorId)?.surfaces.includes(surfaceId);
}
function hasType(actorId, typeId) {
  return (actorScore.get(actorId)?.surfaces ?? []).some(sid => surfaceById.get(sid)?.surface_type === typeId);
}
function hasSecondary(actorId, typeId) {
  return (actorScore.get(actorId)?.secondary_surface_types ?? []).includes(typeId);
}

// Ledger integrity.
let densityPolicyValid = true;
try {
  validateDensityPolicy(data.densityPolicy);
} catch (error) {
  densityPolicyValid = false;
  errors.push(error.message);
}

const sourcePartsBySurface = new Map();
for (const p of data.participation) {
  if (!sourcePartsBySurface.has(p.surface_id)) sourcePartsBySurface.set(p.surface_id, []);
  sourcePartsBySurface.get(p.surface_id).push(p);
}

function checkDensity(surface, participants, origin) {
  if (!densityPolicyValid) return;
  const density = assessHopDensity(surface, participants, data.densityPolicy);
  assert(!density.exceeds_limit,
    `${origin} surface ${surface.surface_id} is hop eligible with ${density.actor_count} distinct actors; maximum is ${density.max_hop_actor_count}`);
}

for (const surface of data.surfaces) {
  assert(surface.surface_id && surface.surface_label && surface.surface_type, `surface missing required fields: ${JSON.stringify(surface)}`);
  assert(typeof surface.hop_eligible === 'boolean', `surface ${surface.surface_id} hop_eligible must be boolean`);
  if (surface.hop_refusal_reason !== undefined) {
    assert(surface.hop_eligible === false, `surface ${surface.surface_id} cannot declare hop_refusal_reason while hop eligible`);
    assert(typeof surface.hop_refusal_reason === 'string' && surface.hop_refusal_reason.length > 0,
      `surface ${surface.surface_id} hop_refusal_reason must be a non-empty string`);
  }
  assert(surfaceTypeById.has(surface.surface_type), `surface ${surface.surface_id} uses unknown type ${surface.surface_type}`);
  for (const secondary of surface.secondary_surface_types ?? []) assert(surfaceTypeById.has(secondary), `surface ${surface.surface_id} uses unknown secondary type ${secondary}`);
  checkDensity(surface, sourcePartsBySurface.get(surface.surface_id) ?? [], 'ledger');
}

// Generated surface data must retain the source eligibility decision and the
// same density invariant. This also prevents validate:release from accepting a
// stale hop artifact after a roster has been downgraded to non-hop.
for (const surface of surfaceGraph.surfaces) {
  const source = data.surfaces.find(s => s.surface_id === surface.surface_id);
  assert(source, `compiled surface ${surface.surface_id} is missing from the ledger`);
  assert(surface.hop_eligible === source?.hop_eligible,
    `compiled surface ${surface.surface_id} hop_eligible is stale (${surface.hop_eligible} != ledger ${source?.hop_eligible})`);
  checkDensity(surface, surface.participants ?? [], 'compiled');
}

for (const source of data.surfaces.filter(surface => surface.hop_refusal_reason)) {
  const rejection = (hopGraph.rejected_hop_surfaces ?? []).find(row => row.surface_id === source.surface_id);
  assert(rejection, `surface ${source.surface_id} declares a refusal reason but is missing from rejected_hop_surfaces`);
  assert(rejection?.reason === source.hop_refusal_reason,
    `surface ${source.surface_id} compiled refusal reason is stale (${rejection?.reason} != ${source.hop_refusal_reason})`);
}

// Every hop must carry its surface basis.
for (const edge of hopGraph.edges) {
  assert(edge.actor_a && edge.actor_b, `hop edge missing actor ids: ${JSON.stringify(edge)}`);
  assert(edge.actor_a !== edge.actor_b, `hop edge must connect two distinct actors, got self-hop ${edge.actor_a}`);
  assert(edge.surfaces?.length > 0, `hop ${edge.actor_a}/${edge.actor_b} lacks shared surfaces`);
  for (const basis of edge.surfaces) {
    const surface = surfaceById.get(basis.surface_id);
    assert(surface, `hop basis references missing surface ${basis.surface_id}`);
    assert(surface?.hop_eligible === true, `hop basis ${basis.surface_id} is not hop eligible`);
    const parts = surface?.participants ?? [];
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a), `hop basis ${basis.surface_id} lacks participant ${edge.actor_a}`);
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b), `hop basis ${basis.surface_id} lacks participant ${edge.actor_b}`);
    assert(basis.receipt_ids?.length > 0, `hop basis ${basis.surface_id} lacks receipts`);

    // Temporal integrity: every basis carries a status, and a dated basis
    // must fall within the intersection of the surface and both participation
    // windows — never assert co-presence outside every source's own window.
    assert(typeof basis.temporal_status === 'string', `hop basis ${basis.surface_id} lacks temporal_status`);
    const partsA = (surface?.participants ?? []).filter(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a);
    const partsB = (surface?.participants ?? []).filter(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b);
    const surfaceWindow = windowOf(surface);
    const expectedWindows = [];
    for (const partA of partsA) {
      for (const partB of partsB) {
        const aWindow = windowOf(partA);
        const bWindow = windowOf(partB);
        const expected = intersectAll([
          surfaceWindow.dated ? surfaceWindow : UNBOUNDED,
          aWindow.dated ? aWindow : UNBOUNDED,
          bWindow.dated ? bWindow : UNBOUNDED,
        ]);
        if (expected !== null) expectedWindows.push({
          ...expected,
          temporal_status: aWindow.dated && bWindow.dated ? 'dated'
            : aWindow.dated || bWindow.dated ? 'partially_dated'
            : surfaceWindow.dated ? 'surface_window_only' : 'undated',
        });
      }
    }
    const matchesAStintPair = expectedWindows.some(expected =>
      (basis.valid_from ?? null) === (expected.valid_from ?? null)
      && (basis.valid_until ?? null) === (expected.valid_until ?? null)
      && basis.temporal_status === expected.temporal_status);
    assert(matchesAStintPair,
      `hop basis ${basis.surface_id} window/status does not match any participation-stint pair for ${edge.actor_a}/${edge.actor_b}`);
  }
}

// No hop basis may assert co-presence across disjoint dated windows: every
// rejected pair the builder recorded must genuinely have an empty intersection.
for (const pair of hopGraph.rejected_hop_pairs ?? []) {
  assert(pair.reason?.startsWith('no_temporal_overlap'), `rejected pair ${pair.surface_id} has unexpected reason ${pair.reason}`);
  assert(pair.actor_a !== pair.actor_b, `rejected hop pair must name distinct actors, got ${pair.actor_a}/${pair.actor_b}`);
  const sourceSurface = surfaceById.get(pair.surface_id);
  assert(sourceSurface, `rejected pair references missing surface ${pair.surface_id}`);
  const actorAParts = (sourceSurface?.participants ?? []).filter(part => part.participant_type === 'actor' && part.actor_id === pair.actor_a);
  const actorBParts = (sourceSurface?.participants ?? []).filter(part => part.participant_type === 'actor' && part.actor_id === pair.actor_b);
  const sourceSurfaceWindow = sourceSurface ? windowOf(sourceSurface) : null;
  const matchingSource = actorAParts.flatMap(actorAPart => actorBParts.map(actorBPart => ({ actorAPart, actorBPart }))).find(({ actorAPart, actorBPart }) => {
    const actorAWindow = windowOf(actorAPart);
    const actorBWindow = windowOf(actorBPart);
    const overlap = intersectAll([
      sourceSurfaceWindow?.dated ? sourceSurfaceWindow : UNBOUNDED,
      actorAWindow.dated ? actorAWindow : UNBOUNDED,
      actorBWindow.dated ? actorBWindow : UNBOUNDED,
    ]);
    return overlap === null
      && sameWindow(pair.actor_a_window, actorAWindow)
      && sameWindow(pair.actor_b_window, actorBWindow)
      && sameWindow(pair.surface_window, sourceSurfaceWindow);
  });
  assert(matchingSource,
    `rejected pair ${pair.actor_a}/${pair.actor_b} on ${pair.surface_id} disagrees with its source participant windows`);
  if (matchingSource) {
    assert(sameIdSet(pair.actor_a_receipt_ids, matchingSource.actorAPart.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_a receipts disagree with source participant ${pair.actor_a}`);
    assert(sameIdSet(pair.actor_b_receipt_ids, matchingSource.actorBPart.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_b receipts disagree with source participant ${pair.actor_b}`);
    assert(sameIdSet(pair.surface_receipt_ids, sourceSurface.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} surface receipts disagree with ${pair.surface_id}`);
    assert(sameIdSet(pair.receipt_ids, [
      ...(sourceSurface.receipt_ids ?? []),
      ...(matchingSource.actorAPart.receipt_ids ?? []),
      ...(matchingSource.actorBPart.receipt_ids ?? []),
    ]), `rejected pair ${pair.actor_a}/${pair.actor_b} combined receipts are incomplete`);
    const actorAWindowReverifiable = (matchingSource.actorAPart.receipt_ids ?? [])
      .some(receiptId => receiptSupportsPublishedWindow(receiptById.get(receiptId)));
    const actorBWindowReverifiable = (matchingSource.actorBPart.receipt_ids ?? [])
      .some(receiptId => receiptSupportsPublishedWindow(receiptById.get(receiptId)));
    const expectedPublicationStatus = actorAWindowReverifiable && actorBWindowReverifiable ? 'verified' : 'review_required';
    assert(pair.actor_a_window_reverifiable === actorAWindowReverifiable,
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_a reverifiability is stale`);
    assert(pair.actor_b_window_reverifiable === actorBWindowReverifiable,
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_b reverifiability is stale`);
    assert(pair.publication_status === expectedPublicationStatus,
      `rejected pair ${pair.actor_a}/${pair.actor_b} publication status must be ${expectedPublicationStatus}`);
    if (pair.publication_status === 'verified') {
      assert(actorAWindowReverifiable && actorBWindowReverifiable,
        `verified rejected pair ${pair.actor_a}/${pair.actor_b} lacks direct re-verifiable actor-window receipts`);
    }
  }
}

// Detachment 201 source-native split: broad program context is graph-inert,
// while the exact four-officer commissioning event is a dated official hop surface.
const detachmentProgramContext = surfaceById.get('detachment-201-program-context-2025');
assert(detachmentProgramContext, 'Detachment 201 program context is missing');
assert(detachmentProgramContext?.hop_eligible === false,
  'Detachment 201 program context must remain non-hop');
assert(detachmentProgramContext?.hop_refusal_reason === 'organization_only_program_context',
  'Detachment 201 program context must expose the organization-only refusal');
assert(detachmentProgramContext?.time_start === '2025-06-13',
  'Detachment 201 program context must preserve the official launch date');
const detachmentProgramParts = sourcePartsBySurface.get(detachmentProgramContext?.surface_id) ?? [];
assert(detachmentProgramParts.filter(part => part.participant_type === 'actor').length === 0,
  'Detachment 201 program context must not manufacture actor participants');
assert(JSON.stringify(detachmentProgramParts.filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)) === JSON.stringify(['us-army']),
  'Detachment 201 program context must preserve the Army as the sole program institution');
assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === detachmentProgramContext?.surface_id
    && row.reason === 'organization_only_program_context'),
  'Detachment 201 program-context refusal must remain public');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === detachmentProgramContext?.surface_id,
)), 'Detachment 201 program context must never create actor adjacency');

const detachmentCommissioning = surfaceById.get('detachment-201-commissioning-2025');
const detachmentCommissionedActorIds = [
  'andrew-bosworth',
  'bob-mcgrew',
  'kevin-weil',
  'shyam-sankar',
];
assert(detachmentCommissioning, 'Detachment 201 exact commissioning surface is missing');
assert(detachmentCommissioning?.hop_eligible === true,
  'Detachment 201 exact commissioning surface must remain hop eligible');
assert(detachmentCommissioning?.surface_type === 'government_advisory_surface',
  'Detachment 201 exact commissioning surface has the wrong type');
assert(detachmentCommissioning?.evidence_class === 'official',
  'Detachment 201 exact commissioning surface must remain official');
assert(detachmentCommissioning?.time_start === '2025-06-13'
  && detachmentCommissioning?.time_end === '2025-06-13',
  'Detachment 201 exact commissioning surface must remain one-day bounded');
const detachmentCommissioningParts = sourcePartsBySurface.get(detachmentCommissioning?.surface_id) ?? [];
assert(sameIdSet(detachmentCommissioningParts
  .filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  detachmentCommissionedActorIds),
  'Detachment 201 exact commissioning actor denominator is stale');
assert(JSON.stringify(detachmentCommissioningParts
  .filter(part => part.participant_type === 'organization').map(part => part.organization_id))
  === JSON.stringify(['us-army']),
  'Detachment 201 exact commissioning institution is stale');
assert(hopGraph.edges.flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === detachmentCommissioning?.surface_id).length === 6,
  'four Detachment 201 officers must compile exactly six formal bases');
const detachmentSankarWeilEdge = hopGraph.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'kevin-weil|shyam-sankar');
const detachmentSankarWeilBasis = detachmentSankarWeilEdge?.surfaces.find(
  basis => basis.surface_id === detachmentCommissioning?.surface_id,
);
assert(detachmentSankarWeilBasis?.evidence_class === 'official',
  'Shyam Sankar/Kevin Weil Detachment basis must remain official');
assert(detachmentSankarWeilBasis?.valid_from === '2025-06-13'
  && detachmentSankarWeilBasis?.valid_until === '2025-06-13',
  'Shyam Sankar/Kevin Weil Detachment basis must remain exact-date bounded');
for (const actorId of detachmentCommissionedActorIds) {
  assert(hasSurface(actorId, detachmentCommissioning?.surface_id),
    `${actorId} is missing the exact Detachment 201 commissioning surface`);
}
const detachmentReceipt = receiptById.get('army-detachment-201');
assert(detachmentReceipt?.path
  === 'receipts/topology/us-army-detachment-201-inaugural-commissioning-2025-06-13.md',
  'Detachment 201 exact source extract path is stale');
assert(detachmentReceipt?.event_date === '2025-06-13'
  && detachmentReceipt?.named_cohort_size === 4,
  'Detachment 201 receipt date or cohort denominator is stale');
assert(sameIdSet(detachmentReceipt?.commissioned_actor_ids, detachmentCommissionedActorIds),
  'Detachment 201 receipt actor denominator is stale');
assert(detachmentReceipt?.procurement_award_established === false,
  'Detachment 201 receipt must refuse procurement-award inference');
assert(detachmentReceipt?.continuous_joint_work_established === false,
  'Detachment 201 receipt must refuse continuing-joint-work inference');
assert(detachmentReceipt?.archive?.ref
  === 'sha256:4744b11929e9fc0e3a280bf43830d6bb337a6cc342664824a6c69239dd87a0fe',
  'Detachment 201 receipt digest is stale');
const detachmentClaim = claimById.get(
  'detachment-201-inaugural-four-officer-commissioning-2025-06-13',
);
assert(detachmentClaim, 'Detachment 201 exact commissioning claim is missing');
assert(sameIdSet(detachmentClaim?.actor_ids, detachmentCommissionedActorIds),
  'Detachment 201 claim actor denominator is stale');
assert(sameIdSet(detachmentClaim?.surface_ids, [detachmentCommissioning?.surface_id]),
  'Detachment 201 claim surface binding is stale');
assert(!receiptById.has('reuters-defense-procurement'),
  'generic Reuters homepage proxy must remain retired after the official Detachment 201 repair');
const syntheticPopulationChain = chainById.get('policy-to-deployment-synthetic-population');
const detachmentChainStage = syntheticPopulationChain?.stages.find(stage =>
  stage.stage_category === 'military_advisory_integration');
assert(detachmentChainStage?.surface_id === detachmentProgramContext?.surface_id,
  'policy-to-deployment chain must use the graph-inert Detachment program context');
assert(sameIdSet(detachmentChainStage?.receipt_ids, ['army-detachment-201']),
  'Detachment chain stage must use only the exact official Army receipt');

// Detachment 201 Cohort 2 is a separate exact commissioning act. Directly
// named roles are preserved without conflating the oath administrator with the
// three-person commissioned cohort.
const detachmentSecondCohort = surfaceById.get(
  'detachment-201-second-cohort-commissioning-2026-06-10',
);
const detachmentSecondCohortCommissionedActorIds = [
  'dane-knecht',
  'sam-pullara',
  'serkan-piantino',
];
const detachmentSecondCohortEventActorIds = [
  'dan-driscoll',
  ...detachmentSecondCohortCommissionedActorIds,
].sort();
const detachmentSecondCohortExpectedPairs = [
  'dan-driscoll|dane-knecht',
  'dan-driscoll|sam-pullara',
  'dan-driscoll|serkan-piantino',
  'dane-knecht|sam-pullara',
  'dane-knecht|serkan-piantino',
  'sam-pullara|serkan-piantino',
];
assert(detachmentSecondCohort, 'Detachment 201 Cohort 2 commissioning surface is missing');
assert(detachmentSecondCohort?.hop_eligible === true,
  'Detachment 201 Cohort 2 commissioning surface must remain hop eligible');
assert(detachmentSecondCohort?.surface_type === 'government_advisory_surface',
  'Detachment 201 Cohort 2 commissioning surface has the wrong type');
assert(detachmentSecondCohort?.evidence_class === 'official',
  'Detachment 201 Cohort 2 commissioning surface must remain official');
assert(detachmentSecondCohort?.time_start === '2026-06-10'
  && detachmentSecondCohort?.time_end === '2026-06-10',
  'Detachment 201 Cohort 2 commissioning surface must remain one-day bounded');
const detachmentSecondCohortParts = sourcePartsBySurface.get(
  detachmentSecondCohort?.surface_id,
) ?? [];
assert(sameIdSet(detachmentSecondCohortParts
  .filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  detachmentSecondCohortEventActorIds),
  'Detachment 201 Cohort 2 event actor denominator is stale');
assert(sameIdSet(detachmentSecondCohortParts
  .filter(part => part.participation_type === 'commissioned_officer').map(part => part.actor_id),
  detachmentSecondCohortCommissionedActorIds),
  'Detachment 201 Cohort 2 commissioned-officer denominator is stale');
assert(detachmentSecondCohortParts.find(part => part.actor_id === 'dan-driscoll')
  ?.participation_type === 'oath_administrator',
  'Daniel P. Driscoll must remain the role-discriminated oath administrator');
assert(JSON.stringify(detachmentSecondCohortParts
  .filter(part => part.participant_type === 'organization').map(part => part.organization_id))
  === JSON.stringify(['us-army']),
  'Detachment 201 Cohort 2 institution denominator is stale');
const detachmentSecondCohortBases = hopGraph.edges.flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === detachmentSecondCohort?.surface_id);
assert(detachmentSecondCohortBases.length === 6,
  'four directly named Cohort 2 event actors must compile exactly six formal bases');
const detachmentSecondCohortActualPairs = hopGraph.edges
  .filter(edge => edge.surfaces.some(basis => basis.surface_id === detachmentSecondCohort?.surface_id))
  .map(edge => [edge.actor_a, edge.actor_b].sort().join('|'))
  .sort();
assert(JSON.stringify(detachmentSecondCohortActualPairs)
  === JSON.stringify(detachmentSecondCohortExpectedPairs),
  'Detachment 201 Cohort 2 pair set is stale');
for (const basis of detachmentSecondCohortBases) {
  assert(basis.evidence_class === 'official',
    'every Cohort 2 basis must remain official');
  assert(basis.valid_from === '2026-06-10' && basis.valid_until === '2026-06-10',
    'every Cohort 2 basis must remain exact-date bounded');
}
for (const actorId of detachmentSecondCohortEventActorIds) {
  assert(hasSurface(actorId, detachmentSecondCohort?.surface_id),
    `${actorId} is missing the exact Detachment 201 Cohort 2 surface`);
}
for (const actorId of detachmentCommissionedActorIds) {
  assert(!hasSurface(actorId, detachmentSecondCohort?.surface_id),
    `${actorId} must remain on the separate inaugural commissioning event`);
}
for (const actorId of detachmentSecondCohortCommissionedActorIds) {
  assert(!hasSurface(actorId, detachmentCommissioning?.surface_id),
    `${actorId} must not be projected onto the inaugural commissioning event`);
}
const detachmentSecondCohortReceipt = receiptById.get(
  'army-detachment-201-second-cohort-2026-06-10',
);
assert(detachmentSecondCohortReceipt?.path
  === 'receipts/topology/us-army-detachment-201-second-cohort-commissioning-2026-06-10.md',
  'Detachment 201 Cohort 2 source extract path is stale');
assert(detachmentSecondCohortReceipt?.event_date === '2026-06-10'
  && detachmentSecondCohortReceipt?.named_cohort_size === 3
  && detachmentSecondCohortReceipt?.named_event_actor_size === 4,
  'Detachment 201 Cohort 2 receipt date or role denominators are stale');
assert(sameIdSet(
  detachmentSecondCohortReceipt?.commissioned_actor_ids,
  detachmentSecondCohortCommissionedActorIds,
), 'Detachment 201 Cohort 2 receipt commissioned-officer set is stale');
assert(sameIdSet(
  detachmentSecondCohortReceipt?.ceremony_actor_ids,
  detachmentSecondCohortEventActorIds,
), 'Detachment 201 Cohort 2 receipt event actor set is stale');
assert(detachmentSecondCohortReceipt?.oath_administrator_actor_id === 'dan-driscoll'
  && detachmentSecondCohortReceipt?.oath_administrator_in_event_actor_set === true
  && detachmentSecondCohortReceipt?.oath_administrator_in_commissioned_cohort === false,
  'Detachment 201 Cohort 2 receipt must preserve the oath-administrator role boundary');
assert(detachmentSecondCohortReceipt?.first_cohort_project_allocation_established === false,
  'Detachment 201 Cohort 2 receipt must refuse allocation of program work to named Cohort 1 officers');
assert(detachmentSecondCohortReceipt?.second_cohort_specific_project_assignment_established === false,
  'Detachment 201 Cohort 2 receipt must refuse specific-project assignment inference');
assert(detachmentSecondCohortReceipt?.procurement_award_established === false,
  'Detachment 201 Cohort 2 receipt must refuse procurement-award inference');
assert(detachmentSecondCohortReceipt?.continuous_joint_work_established === false,
  'Detachment 201 Cohort 2 receipt must refuse continuing-joint-work inference');
assert(detachmentSecondCohortReceipt?.archive?.ref
  === 'sha256:030425b612ff083e35ef03bd05abba72670769c25f19664de38578dcf21de81d',
  'Detachment 201 Cohort 2 receipt digest is stale');
const detachmentSecondCohortClaim = claimById.get(
  'detachment-201-cohort-2-commissioning-ceremony-2026-06-10',
);
assert(detachmentSecondCohortClaim,
  'Detachment 201 Cohort 2 exact commissioning claim is missing');
assert(sameIdSet(detachmentSecondCohortClaim?.actor_ids, detachmentSecondCohortEventActorIds),
  'Detachment 201 Cohort 2 claim actor denominator is stale');
assert(sameIdSet(detachmentSecondCohortClaim?.surface_ids, [detachmentSecondCohort?.surface_id]),
  'Detachment 201 Cohort 2 claim surface binding is stale');

// Dialog directory, role, and invitation boundary.
assert(!surfaceById.has('dialog-society-membership'),
  'the mixed open-ended Dialog composite must be retired');
const dialogDirectory = surfaceById.get('dialog-public-directory-exposure-2026-06-16');
const dialogLeadership = surfaceById.get('dialog-leadership-role-observations-2026-06-16');
const dialogInvitation = surfaceById.get('dialog-matt-clifford-invitation-nonattendance-2026-06-16');
assert(dialogDirectory && dialogLeadership && dialogInvitation,
  'all three bounded Dialog propositions must compile');
assert(dialogDirectory?.hop_eligible === false
  && dialogDirectory?.hop_refusal_reason === 'dense_directory_listing_not_shared_participation',
  'Dialog directory must expose its dense listing refusal');
assert(dialogDirectory?.time_start === '2026-06-16' && dialogDirectory?.time_end === '2026-06-16',
  'Dialog directory must be an exact-date observation');
assert((dialogDirectory?.participants ?? []).filter(part => part.participant_type === 'actor').length === 112,
  'Dialog directory listing denominator must remain 112');
assert((dialogDirectory?.participants ?? []).some(part => part.actor_id === 'matt-clifford'),
  'Matt Clifford directory listing must remain visible');
assert(sameIdSet(
  (dialogLeadership?.participants ?? []).filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  ['auren-hoffman', 'peter-thiel', 'raffi-grinberg'],
), 'Dialog leadership observation must retain exactly the three reported roles');
assert(dialogLeadership?.hop_eligible === false
  && dialogLeadership?.hop_refusal_reason === 'reported_role_observations_not_shared_event',
  'reported Dialog roles must not become a shared-event hop');
assert(sameIdSet(
  (dialogInvitation?.participants ?? []).filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  ['matt-clifford'],
), 'Dialog invitation/non-attendance surface must contain only Matt Clifford');
assert(dialogInvitation?.hop_eligible === false
  && dialogInvitation?.hop_refusal_reason === 'invitation_without_attendance_or_membership',
  'Dialog invitation must preserve the non-attendance refusal');
for (const dialogSurface of [dialogDirectory, dialogLeadership, dialogInvitation]) {
  assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
    row.surface_id === dialogSurface?.surface_id
      && row.reason === dialogSurface?.hop_refusal_reason),
    `Dialog refusal ${dialogSurface?.surface_id} must remain public`);
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis =>
    basis.surface_id === dialogSurface?.surface_id)),
    `Dialog surface ${dialogSurface?.surface_id} must never become a hop basis`);
}
const dialogBoundaryClaim = claimById.get('dialog-matt-clifford-peter-thiel-boundary-2026-06-16');
assert(dialogBoundaryClaim,
  'the Clifford/Thiel Dialog boundary claim must remain canonical');
assert(sameIdSet(dialogBoundaryClaim?.actor_ids, ['matt-clifford', 'peter-thiel']),
  'Dialog boundary claim actor set is stale');
assert(!receiptById.has('dialog-human-layer'),
  'local Dialog analysis note must not remain a live canonical receipt');
assert(receiptById.get('wired-dialog-leak')?.archive?.ref === 'sha256:5648e648af1db7c30a679adb918f5f2c5122e832ca57b3c612f219c380c652a6',
  'WIRED Dialog extract hash is stale');
assert(receiptById.get('dialog-directory-extract')?.archive?.ref === 'sha256:02bb38b250f66b6cc355176fd3d4d375bcb695b1a351bbc88ca0e37ac5200956',
  'Dialog directory extract hash is stale');

// Regression fixture 1: Ben Warner.
const warnerSurfaces = [
  'ben-warner-no10-digital-data-role-observation-2020-2021',
  'faculty-science-officer-employee-overlap-2018-01-24',
  'electric-twin-incorporation-2023-09-28',
  'electric-twin-ben-warner-director-tenure-2023-09-28',
];
for (const sid of warnerSurfaces) assert(hasSurface('ben-warner', sid), `Ben Warner missing surface ${sid}`);
for (const type of ['government_advisory_surface', 'employment_investment_surface', 'founder_officer_surface']) {
  assert(hasType('ben-warner', type), `Ben Warner missing surface type ${type}`);
}
assert(!hasSurface('ben-warner', 'electric-twin-newsuk-synthetic-audience'),
  'Ben Warner must not inherit an organization-only News UK deployment');
assert(!hasSecondary('ben-warner', 'democratic_input_replacement'),
  'Ben Warner must not inherit democratic_input_replacement from organization-only category context');
assert(actorScore.get('ben-warner')?.governance_replacement_score === 0,
  'Ben Warner governance replacement score must remain zero without an actor-supported replacement surface');

const newsUkDeployment = surfaceById.get('electric-twin-newsuk-synthetic-audience');
assert(newsUkDeployment, 'source-native News UK / Electric Twin deployment must compile');
assert(newsUkDeployment?.hop_eligible === false, 'organization-only News UK deployment must remain non-hop');
assert(newsUkDeployment?.hop_refusal_reason === 'organization_only_customer_vendor_deployment',
  'News UK deployment must expose the organization-only customer-vendor refusal');
assert(newsUkDeployment?.time_start === '2026-04-27' && newsUkDeployment?.time_end === '2026-04-27',
  'News UK deployment must remain a one-day launch observation');
assert(JSON.stringify(newsUkDeployment?.secondary_surface_types) === JSON.stringify(['model_governance_surface']),
  'News UK deployment must not classify first-party decision support as proven replacement of real-world research');
assert(sameIdSet(newsUkDeployment?.receipt_ids, ['newsuk-times-exploraition-launch-2026-04-27', 'electric-twin-times-exploraition-launch-2026-04-28']),
  'News UK deployment must use the two first-party launch receipts');
const newsUkActors = (newsUkDeployment?.participants ?? []).filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert(newsUkActors.length === 0, 'organization-only News UK deployment must contain no actor participants');
const newsUkOrganizations = (newsUkDeployment?.participants ?? []).filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort();
assert(JSON.stringify(newsUkOrganizations) === JSON.stringify(['electric-twin', 'news-uk']),
  'News UK deployment must contain exactly the client and vendor organizations');
const newsUkClient = (newsUkDeployment?.participants ?? []).find(part => part.organization_id === 'news-uk');
assert(newsUkClient?.participation_type === 'client_product_operator_observation',
  'News UK must retain the client product-operator role');
const newsUkVendor = (newsUkDeployment?.participants ?? []).find(part => part.organization_id === 'electric-twin');
assert(newsUkVendor?.participation_type === 'vendor_platform_provider_observation',
  'Electric Twin must retain the vendor platform-provider role');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === newsUkDeployment?.surface_id)),
  'organization-only News UK deployment must never become a hop basis');
assert(!newsUkDeployment?.receipt_ids.includes('warner-linkedin-gartner-2026-06-29'),
  'News UK deployment must not inherit the unrelated lost Gartner post');
assert(!receiptById.has('sandhu-comment-newsuk-2026-06-29'),
  'the superseded lost News UK judgment receipt must be retired');
const newsUkReceipt = receiptById.get('newsuk-times-exploraition-launch-2026-04-27');
assert(newsUkReceipt?.event_date === '2026-04-27', 'News UK launch receipt must preserve the launch date');
assert(newsUkReceipt?.decision_support_not_replacement_claim === true,
  'News UK launch receipt must preserve the client non-replacement representation');
const electricTwinNewsUkReceipt = receiptById.get('electric-twin-times-exploraition-launch-2026-04-28');
assert(electricTwinNewsUkReceipt?.client_launch_date === '2026-04-27',
  'Electric Twin launch receipt must preserve the client launch date');
assert(electricTwinNewsUkReceipt?.no_personal_data_claim === true,
  'Electric Twin launch receipt must preserve the vendor no-personal-data representation');

const gartnerCategoryObservation = surfaceById.get('gartner-synthetic-population-category-2026');
assert(gartnerCategoryObservation, 'source-native Gartner category observation must compile');
assert(gartnerCategoryObservation?.hop_eligible === false,
  'organization-only Gartner category observation must remain non-hop');
assert(gartnerCategoryObservation?.hop_refusal_reason === 'organization_only_category_observation',
  'Gartner category observation must expose the organization-only refusal');
assert(gartnerCategoryObservation?.time_start === '2026-06-25'
  && gartnerCategoryObservation?.time_end === '2026-06-25',
  'Gartner category observation must remain bounded to the company post date');
const gartnerActorIds = (gartnerCategoryObservation?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort();
const gartnerOrganizationIds = (gartnerCategoryObservation?.participants ?? [])
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id).sort();
assert(JSON.stringify(gartnerActorIds) === JSON.stringify([]),
  'Gartner category company post must not manufacture an actor participant');
assert(JSON.stringify(gartnerOrganizationIds) === JSON.stringify(['electric-twin', 'gartner']),
  'Gartner category observation must retain exactly Electric Twin and Gartner organization context');
assert(sameIdSet(gartnerCategoryObservation?.receipt_ids,
  ['electric-twin-linkedin-gartner-category-2026-06-25']),
  'Gartner category observation must carry only the recoverable company-post receipt');
assert(!hasSurface('ben-warner', 'gartner-synthetic-population-category-2026'),
  'Ben Warner must not inherit an organization-only Gartner category observation');
assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === 'gartner-synthetic-population-category-2026'
  && row.reason === 'organization_only_category_observation'),
  'Gartner category refusal must remain publicly visible');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis =>
  basis.surface_id === 'gartner-synthetic-population-category-2026')),
  'Gartner category observation must never appear in an actor-hop basis');
const gartnerCategoryReceipt = receiptById.get('electric-twin-linkedin-gartner-category-2026-06-25');
assert(gartnerCategoryReceipt, 'recoverable Electric Twin Gartner-category receipt must exist');
assert(gartnerCategoryReceipt?.source_published_at === '2026-06-25',
  'Gartner category receipt publication date must be exact');
assert(gartnerCategoryReceipt?.event_date === '2026-06-25',
  'Gartner category receipt event date must be exact');
assert(gartnerCategoryReceipt?.reported_companies_reviewed === 60,
  'Gartner category receipt must preserve the company-reported review denominator');
assert(gartnerCategoryReceipt?.reported_companies_selected_to_watch === 33,
  'Gartner category receipt must preserve the company-reported selection count');
assert(gartnerCategoryReceipt?.reported_tier === 'scale_up',
  'Gartner category receipt must preserve Electric Twin’s reported tier');
assert(gartnerCategoryReceipt?.underlying_gartner_research_recovered === false,
  'Gartner category receipt must preserve the unrecovered-research limitation');
assert(gartnerCategoryReceipt?.personal_author_identified === false,
  'company-account post must not be rewritten as personal authorship');
assert(!receiptById.has('warner-linkedin-gartner-2026-06-29'),
  'superseded lost Ben Warner paste receipt must be retired');


const sourceNativeGartnerClaim = claimById.get('electric-twin-reported-gartner-category-2026-06-25');
assert(sourceNativeGartnerClaim,
  'canonical claims must use the recoverable organization-level Gartner receipt');
assert(JSON.stringify(sourceNativeGartnerClaim?.actor_ids) === JSON.stringify([]),
  'Gartner category claim must contain no actor attribution');
assert(sameIdSet(sourceNativeGartnerClaim?.receipt_ids, ['electric-twin-linkedin-gartner-category-2026-06-25']),
  'Gartner category claim must use the recoverable company receipt');
assert(!claimById.has('warner-gartner-synthetic-populations-2026-06-29'),
  'superseded personal Gartner claim must be retired');

const sourceNativeNewsUkClaim = claimById.get('newsuk-times-exploraition-electric-twin-launch-2026-04-27');
assert(sourceNativeNewsUkClaim, 'first-party News UK deployment claim must exist');
assert(JSON.stringify(sourceNativeNewsUkClaim?.actor_ids) === JSON.stringify([]),
  'News UK deployment claim must contain no actor attribution');
assert(sameIdSet(sourceNativeNewsUkClaim?.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]), 'News UK deployment claim must use both first-party launch receipts');
assert(!claimById.has('electric-twin-newsuk-first-party-data-2026-06-29'),
  'superseded user-judgment News UK claim must be retired');

// News UK Times ExplorAItion source-native launch-publication principals.
const newsUkLaunchPrincipals = surfaceById.get('newsuk-times-exploraition-launch-publication-principals-2026-04-27');
const newsUkLaunchReceipt = receiptById.get('newsuk-times-exploraition-launch-publication-principals-2026-04-27');
const newsUkLaunchActorIds = ['alex-cooper', 'caroline-tredget-news-uk', 'luke-costello-news-uk'].sort();
const newsUkLaunchOrganizationIds = ['electric-twin', 'news-uk'].sort();
const newsUkLaunchExpectedPairs = [
  'alex-cooper|caroline-tredget-news-uk',
  'alex-cooper|luke-costello-news-uk',
  'caroline-tredget-news-uk|luke-costello-news-uk',
].sort();
assert(newsUkLaunchPrincipals,
  'Times ExplorAItion named launch-publication principals surface is missing');
assert(newsUkLaunchPrincipals?.surface_type === 'customer_vendor_surface',
  'Times ExplorAItion launch principals must remain a customer/vendor publication surface');
assert(newsUkLaunchPrincipals?.hop_eligible === true,
  'three named Times ExplorAItion launch principals must remain hop eligible');
assert(newsUkLaunchPrincipals?.time_start === '2026-04-27'
  && newsUkLaunchPrincipals?.time_end === '2026-04-27',
  'Times ExplorAItion launch-principals surface must remain exact-date bounded');
assert(newsUkLaunchPrincipals?.evidence_class === 'primary_public',
  'Times ExplorAItion launch-principals surface must retain first-party client evidence');
assert(JSON.stringify(newsUkLaunchPrincipals?.secondary_surface_types)
  === JSON.stringify(['model_governance_surface']),
  'Times ExplorAItion launch-principals secondary type is stale');
assert(sameIdSet(newsUkLaunchPrincipals?.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']),
  'Times ExplorAItion launch-principals receipt binding is stale');
const newsUkLaunchParts = sourcePartsBySurface.get('newsuk-times-exploraition-launch-publication-principals-2026-04-27') ?? [];
assert(sameIdSet(
  newsUkLaunchParts
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  newsUkLaunchActorIds,
), 'Times ExplorAItion launch publication must retain exactly three named actors');
assert(sameIdSet(
  newsUkLaunchParts
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  newsUkLaunchOrganizationIds,
), 'Times ExplorAItion launch publication must retain the client and vendor organizations');
assert(newsUkLaunchParts.find(part => part.actor_id === 'caroline-tredget-news-uk')
  ?.participation_type === 'client_launch_publication_spokesperson',
  'Caroline Tredget must retain the client launch-publication role');
assert(newsUkLaunchParts.find(part => part.actor_id === 'luke-costello-news-uk')
  ?.participation_type === 'client_launch_publication_spokesperson',
  'Luke Costello must retain the client launch-publication role');
assert(newsUkLaunchParts.find(part => part.actor_id === 'alex-cooper')
  ?.participation_type === 'vendor_launch_publication_spokesperson',
  'Alex Cooper must retain the vendor launch-publication role');
const newsUkLaunchEdges = hopGraph.edges.filter(edge =>
  edge.surfaces.some(basis => basis.surface_id === 'newsuk-times-exploraition-launch-publication-principals-2026-04-27'));
const newsUkLaunchBases = newsUkLaunchEdges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === 'newsuk-times-exploraition-launch-publication-principals-2026-04-27');
assert(newsUkLaunchEdges.length === 3,
  'three Times ExplorAItion launch principals must compile exactly three edges');
assert(newsUkLaunchBases.length === 3,
  'three Times ExplorAItion launch principals must compile exactly three bases');
assert(JSON.stringify(newsUkLaunchEdges.map(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|')).sort())
  === JSON.stringify(newsUkLaunchExpectedPairs),
  'Times ExplorAItion launch-principals pair set drifted');
for (const edge of newsUkLaunchEdges) {
  assert(edge.evidence_weight === 1.25,
    'Times ExplorAItion launch-principals edge evidence weight is stale');
}
for (const basis of newsUkLaunchBases) {
  assert(basis.evidence_class === 'primary_public',
    'Times ExplorAItion launch-principals basis must retain first-party evidence');
  assert(sameIdSet(basis.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']),
    'Times ExplorAItion launch-principals basis receipt is stale');
  assert(basis.valid_from === '2026-04-27'
    && basis.valid_until === '2026-04-27'
    && basis.temporal_status === 'dated',
    'Times ExplorAItion launch-principals basis must remain exact-date bounded');
}
const newsUkDeploymentParts =
  sourcePartsBySurface.get('electric-twin-newsuk-synthetic-audience') ?? [];
assert(newsUkDeploymentParts.filter(part =>
  part.participant_type === 'actor').length === 0,
  'the organization-only News UK deployment must remain actor-free');
assert(newsUkLaunchReceipt,
  'Times ExplorAItion launch-principals receipt is missing');
assert(newsUkLaunchReceipt?.source_published_at === '2026-04-27'
  && newsUkLaunchReceipt?.event_date === '2026-04-27',
  'Times ExplorAItion launch-principals receipt date is stale');
assert(sameIdSet(newsUkLaunchReceipt?.named_actor_ids, newsUkLaunchActorIds),
  'Times ExplorAItion launch-principals receipt actor denominator is stale');
assert(newsUkLaunchReceipt?.attributed_statement_count === 3,
  'Times ExplorAItion launch-principals receipt must preserve three attributed statements');
assert(newsUkLaunchReceipt?.publication_coappearance_only === true,
  'Times ExplorAItion launch-principals receipt must preserve publication-only scope');
assert(newsUkLaunchReceipt?.physical_coattendance_established === false
  && newsUkLaunchReceipt?.shared_meeting_established === false,
  'Times ExplorAItion launch-principals receipt must not manufacture attendance or a meeting');
assert(newsUkLaunchReceipt?.complete_project_roster_established === false
  && newsUkLaunchReceipt?.contract_terms_established === false
  && newsUkLaunchReceipt?.continuing_joint_work_established === false,
  'Times ExplorAItion launch-principals receipt boundary is stale');
assert(newsUkLaunchReceipt?.archive?.ref === 'sha256:302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87',
  'Times ExplorAItion launch-principals receipt digest is stale');
const newsUkLaunchClaim = claimById.get('newsuk-times-exploraition-three-principal-launch-publication-2026-04-27');
const newsUkLaunchBoundaryClaim = claimById.get('newsuk-times-exploraition-launch-publication-boundary-2026-04-27');
assert(newsUkLaunchClaim && newsUkLaunchBoundaryClaim,
  'Times ExplorAItion launch-principals claims must remain canonical');
for (const claim of [newsUkLaunchClaim, newsUkLaunchBoundaryClaim]) {
  assert(sameIdSet(claim?.actor_ids, newsUkLaunchActorIds),
    'Times ExplorAItion launch-principals claim actor set is stale');
  assert(sameIdSet(claim?.organization_ids, newsUkLaunchOrganizationIds),
    'Times ExplorAItion launch-principals claim organization set is stale');
  assert(JSON.stringify(claim?.surface_ids) === JSON.stringify(['newsuk-times-exploraition-launch-publication-principals-2026-04-27']),
    'Times ExplorAItion launch-principals claim surface binding is stale');
  assert(sameIdSet(claim?.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']),
    'Times ExplorAItion launch-principals claim receipt binding is stale');
}
for (const actorId of ['caroline-tredget-news-uk', 'luke-costello-news-uk']) {
  assert(sameIdSet(
    data.participation
      .filter(part => part.participant_type === 'actor' && part.actor_id === actorId)
      .map(part => part.surface_id),
    ['newsuk-times-exploraition-launch-publication-principals-2026-04-27'],
  ), `${actorId} must not inherit any surface beyond the exact launch publication`);
  assert(!hopGraph.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|')
      === [actorId, 'matt-clifford'].sort().join('|')),
    `${actorId} must not receive a direct Matt Clifford edge`);
}

const lebaraDeployment = surfaceById.get('electric-twin-lebara-customer-use-2026-03-11');
assert(lebaraDeployment, 'first-party Electric Twin / Lebara customer-use observation must compile');
assert(lebaraDeployment?.hop_eligible === false,
  'organization-only Lebara customer-use observation must remain non-hop');
assert(lebaraDeployment?.hop_refusal_reason === 'organization_only_customer_vendor_deployment',
  'Lebara customer-use observation must expose the organization-only customer-vendor refusal');
assert(lebaraDeployment?.time_start === '2026-03-11'
  && lebaraDeployment?.time_end === '2026-03-11',
  'Lebara customer-use observation must remain a one-day public observation');
assert(lebaraDeployment?.evidence_class === 'primary_public',
  'Lebara customer-use observation must retain first-party evidence');
assert(JSON.stringify(lebaraDeployment?.secondary_surface_types)
  === JSON.stringify(['model_governance_surface']),
  'Lebara customer use must not be classified as proven replacement of real-world research');
assert(sameIdSet(lebaraDeployment?.receipt_ids, ['electric-twin-lebara-customer-use-2026-03-11']),
  'Lebara customer-use observation must use the first-party Electric Twin receipt');
const lebaraActors = (lebaraDeployment?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id);
assert(lebaraActors.length === 0,
  'organization-only Lebara customer use must contain no actor participants');
const lebaraOrganizations = (lebaraDeployment?.participants ?? [])
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id).sort();
assert(JSON.stringify(lebaraOrganizations) === JSON.stringify(['electric-twin', 'lebara']),
  'Lebara customer-use observation must retain exactly the vendor and source-name client');
const lebaraVendor = (lebaraDeployment?.participants ?? [])
  .find(part => part.organization_id === 'electric-twin');
assert(lebaraVendor?.participation_type === 'vendor_platform_provider_observation',
  'Electric Twin must retain the vendor platform-provider role');
const lebaraClient = (lebaraDeployment?.participants ?? [])
  .find(part => part.organization_id === 'lebara');
assert(lebaraClient?.participation_type === 'vendor_reported_client_user_observation',
  'Lebara must remain a vendor-reported client user');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === lebaraDeployment?.surface_id
)), 'organization-only Lebara customer use must never become a hop basis');
assert(!hasSurface('ben-warner', lebaraDeployment?.surface_id),
  'Ben Warner must not inherit the organization-only Lebara customer-use observation');
const lebaraReceiptRow = receiptById.get('electric-twin-lebara-customer-use-2026-03-11');
assert(lebaraReceiptRow, 'Lebara first-party customer-use receipt must exist');
assert(lebaraReceiptRow?.source_published_at === '2026-03-11',
  'Lebara receipt must preserve the publication date');
assert(lebaraReceiptRow?.event_date === '2026-03-11',
  'Lebara receipt must preserve the public observation date');
assert(lebaraReceiptRow?.client_side_confirmation_recovered === false,
  'Lebara receipt must preserve the absent client-side confirmation');
assert(lebaraReceiptRow?.precise_legal_entity_resolved === false,
  'Lebara receipt must preserve the unresolved legal-entity boundary');
assert(JSON.stringify(lebaraReceiptRow?.named_client_actor_ids) === JSON.stringify([]),
  'Lebara receipt must contain no named client actors');
assert(lebaraReceiptRow?.archive?.ref === 'sha256:1fbffa9e72d9842f37bfd7bd9eb3c37f1432cf000bc3f04eb5cd579622cec09a',
  'Lebara receipt digest is stale');
const lebaraSourceClaim = claimById.get('electric-twin-lebara-customer-use-2026-03-11');
assert(lebaraSourceClaim, 'Lebara first-party customer-use claim must exist');
assert(JSON.stringify(lebaraSourceClaim?.actor_ids) === JSON.stringify([]),
  'Lebara customer-use claim must contain no actor attribution');
assert(sameIdSet(lebaraSourceClaim?.organization_ids, ['electric-twin', 'lebara']),
  'Lebara customer-use claim must bind the vendor and source-name client');
assert(sameIdSet(lebaraSourceClaim?.receipt_ids, ['electric-twin-lebara-customer-use-2026-03-11']),
  'Lebara customer-use claim must use the first-party receipt');

const capitalFilingSequence = surfaceById.get('electric-twin-capital-allotment-observations-2026-01-13-2026-07-09');
assert(capitalFilingSequence, 'Electric Twin 2026 capital filing-history sequence must compile');
assert(capitalFilingSequence?.hop_eligible === false,
  'Electric Twin 2026 capital filing-history sequence must remain non-hop');
assert(capitalFilingSequence?.hop_refusal_reason === 'issuer_only_capital_filing_sequence',
  'Electric Twin 2026 capital sequence must expose the issuer-only refusal');
assert(capitalFilingSequence?.surface_type === 'employment_investment_surface',
  'Electric Twin 2026 capital sequence must retain the capital surface type');
assert(JSON.stringify(capitalFilingSequence?.secondary_surface_types)
  === JSON.stringify(['surface_factory_capital_layer']),
  'Electric Twin 2026 capital sequence secondary classification drift');
assert(capitalFilingSequence?.time_start === '2026-01-13'
  && capitalFilingSequence?.time_end === '2026-07-09',
  'Electric Twin 2026 capital sequence date bounds drift');
assert(capitalFilingSequence?.evidence_class === 'official',
  'Electric Twin 2026 capital sequence must remain official');
assert(sameIdSet(capitalFilingSequence?.receipt_ids, ['companies-house-electric-twin-2026-capital-allotment-filing-history']),
  'Electric Twin 2026 capital sequence receipt binding drift');
const capitalActors = (capitalFilingSequence?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id);
assert(capitalActors.length === 0,
  'issuer-only Electric Twin 2026 capital sequence must contain no actors');
const capitalOrganizations = (capitalFilingSequence?.participants ?? [])
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id);
assert(JSON.stringify(capitalOrganizations) === JSON.stringify(['electric-twin']),
  'Electric Twin must be the sole organization on the 2026 capital sequence');
const capitalIssuer = (capitalFilingSequence?.participants ?? [])
  .find(part => part.organization_id === 'electric-twin');
assert(capitalIssuer?.participation_type === 'issuer_capital_filing_sequence_observation',
  'Electric Twin 2026 capital issuer role drift');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === capitalFilingSequence?.surface_id
)), 'Electric Twin 2026 capital filing history must never become a hop basis');
assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === capitalFilingSequence?.surface_id
    && row.reason === 'issuer_only_capital_filing_sequence'),
  'Electric Twin 2026 capital refusal must remain public');
const capitalReceiptRow = receiptById.get('companies-house-electric-twin-2026-capital-allotment-filing-history');
assert(capitalReceiptRow, 'Electric Twin 2026 capital filing-history receipt must exist');
assert(capitalReceiptRow?.company_number === '15173006',
  'Electric Twin 2026 capital receipt company number drift');
assert(JSON.stringify(capitalReceiptRow?.filing_observations) === JSON.stringify([
  { allotment_date: '2026-01-13', filed_at: '2026-01-27', resulting_total_nominal_capital_gbp: 3.658437 },
  { allotment_date: '2026-03-06', filed_at: '2026-04-14', resulting_total_nominal_capital_gbp: 3.661921 },
  { allotment_date: '2026-04-02', filed_at: '2026-04-14', resulting_total_nominal_capital_gbp: 3.667047 },
  { allotment_date: '2026-07-09', filed_at: '2026-07-15', resulting_total_nominal_capital_gbp: 3.672047 },
]), 'Electric Twin 2026 capital receipt filing observations drift');
assert(capitalReceiptRow?.sh01_forms_recovered === true
  && capitalReceiptRow?.sh01_forms_reproduced === false
  && capitalReceiptRow?.source_pdf_custody_recovered === true
  && capitalReceiptRow?.form_fields_extracted === true,
  'Electric Twin 2026 SH01 source-recovery boundary drift');
assert(capitalReceiptRow?.share_classes_recovered === true
  && capitalReceiptRow?.share_quantities_recovered === true
  && capitalReceiptRow?.paid_unpaid_fields_recovered === true
  && capitalReceiptRow?.consideration_terms_recovered === true,
  'Electric Twin 2026 SH01 issuer-side form fields must remain recovered');
assert(capitalReceiptRow?.aggregate_paid_amounts_are_derived === true,
  'Electric Twin 2026 aggregate paid amounts must remain marked as arithmetic derivations');
assert(capitalReceiptRow?.class_rights_promoted === false,
  'Electric Twin 2026 SH01 forms must not duplicate class-rights promotion');
assert(capitalReceiptRow?.allottees_identified === false
  && capitalReceiptRow?.beneficial_owners_identified === false
  && capitalReceiptRow?.investor_identities_identified === false,
  'Electric Twin 2026 SH01 forms must preserve the unidentified-recipient boundary');
assert(JSON.stringify(capitalReceiptRow?.named_actor_ids) === JSON.stringify([]),
  'Electric Twin 2026 SH01 receipt must contain no named actor attribution');
const capitalFormObservations = capitalReceiptRow?.form_observations ?? [];
assert(capitalFormObservations.length === 4,
  'Electric Twin 2026 SH01 receipt must preserve four recovered forms');
assert(JSON.stringify(capitalFormObservations.map(row => [
  row.allotment_period_start,
  row.allotment_period_end,
  row.source_filing_code,
  row.allotted_share_class,
  row.shares_allotted,
  row.nominal_value_per_share_gbp,
  row.amount_paid_per_share_gbp,
  row.amount_unpaid_per_share_gbp,
  row.consideration_basis,
  row.derived_aggregate_amount_paid_gbp,
  row.resulting_statement_of_capital?.total_shares,
])) === JSON.stringify([
  ['2025-11-21', '2026-01-13', 'XEULYX00', 'SEED 2 PREFERRED', 70138, '0.000001', '9.27', '0', 'cash_only_as_filed', '650179.26', 3658437],
  ['2026-03-06', '2026-03-06', 'XEZZWEZC', 'ORDINARY', 3484, '0.000001', '1.425', '0', 'cash_only_as_filed', '4964.700', 3661921],
  ['2026-04-02', '2026-04-02', 'XEZZWKLD', 'ORDINARY', 5126, '0.000001', '1.425', '0', 'cash_only_as_filed', '7304.550', 3667047],
  ['2026-07-09', '2026-07-09', 'XF6CYCQQ', 'ORDINARY', 5000, '0.000001', '1.425', '0', 'cash_only_as_filed', '7125.000', 3672047],
]), 'Electric Twin 2026 SH01 form-level observations drift');
assert(capitalFormObservations.every(row =>
  /^[0-9a-f]{64}$/.test(row.source_pdf_sha256)
    && row.source_pdf_pages === 4
    && !Object.hasOwn(row, 'allottee')
    && !Object.hasOwn(row, 'investor_id')
), 'Electric Twin 2026 SH01 custody or recipient boundary drift');
assert(capitalReceiptRow?.archive?.ref === 'sha256:82969688e8654a4cf48892e48d7a65155a8f927119499648325e219059da0964',
  'Electric Twin 2026 SH01 adjudication receipt hash drift');
const capitalClaimRow = claimById.get('electric-twin-2026-capital-allotment-filing-history');
assert(capitalClaimRow, 'Electric Twin 2026 capital filing-history claim must exist');
assert(JSON.stringify(capitalClaimRow?.actor_ids) === JSON.stringify([]),
  'Electric Twin 2026 capital claim must contain no actor attribution');
assert(sameIdSet(capitalClaimRow?.organization_ids, ['electric-twin']),
  'Electric Twin 2026 capital claim organization binding drift');
assert(sameIdSet(capitalClaimRow?.receipt_ids, ['companies-house-electric-twin-2026-capital-allotment-filing-history']),
  'Electric Twin 2026 capital claim receipt binding drift');
assert(capitalClaimRow?.limits?.includes('arithmetic derivations')
  && capitalClaimRow?.limits?.includes('do not identify allottees'),
  'Electric Twin 2026 capital claim must preserve derivation and recipient boundaries');

const correctedWarnerChronology = claimById.get('ben-warner-government-commercial-chronology-boundary-2026-08-11');
assert(correctedWarnerChronology, 'Ben Warner chronology boundary must remain visible');
assert(sameIdSet(correctedWarnerChronology?.receipt_ids, [
  'uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16',
  'gov-sage-89-ben-warner-no10-2021-05-13',
]), 'Ben Warner chronology must be bounded to the official No. 10 receipts');
assert(JSON.stringify(correctedWarnerChronology?.surface_ids) === JSON.stringify([
  'ben-warner-no10-digital-data-role-observation-2020-2021',
]), 'Ben Warner chronology must not attach him to later organization-only surfaces');

const correctedPolicyDeploymentChain = chainById.get('policy-to-deployment-synthetic-population');
assert(correctedPolicyDeploymentChain, 'policy-to-deployment chain must remain canonical');
const correctedCommercialDeploymentStage = correctedPolicyDeploymentChain?.stages?.find(
  stage => stage.order === 4 && stage.stage_category === 'commercial_deployment'
);
assert(correctedCommercialDeploymentStage, 'commercial-deployment chain stage must remain canonical');
assert(correctedCommercialDeploymentStage?.organization_id === 'electric-twin',
  'commercial-deployment stage must remain organization-level');
assert(!correctedCommercialDeploymentStage?.actor_id,
  'commercial-deployment stage must not manufacture an actor participant');
assert(sameIdSet(correctedCommercialDeploymentStage?.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]), 'commercial-deployment stage must use the first-party News UK launch receipts');

for (const retiredReceiptId of [
  'warner-linkedin-gartner-2026-06-29',
  'sandhu-comment-newsuk-2026-06-29',
]) {
  assert(!data.claims.some(row => (row.receipt_ids ?? []).includes(retiredReceiptId)),
    `retired receipt remains in a canonical claim: ${retiredReceiptId}`);
  assert(!data.chains.some(row => (row.stages ?? []).some(
    stage => (stage.receipt_ids ?? []).includes(retiredReceiptId)
  )), `retired receipt remains in a canonical chain: ${retiredReceiptId}`);
}

// Electric Twin split seed-round evidence must rest on first-party records
// while institutional participation remains organization-only and graph-inert.
const electricTwinSeedSurface = surfaceById.get('electric-twin-seed-round-2026-02-11');
const electricTwinInstitutionalSurface = surfaceById.get(
  'electric-twin-seed-round-institutional-investors-2026-02-11',
);
const electricTwinSeedReceiptIds = [
  'electric-twin-seed-round-announcement-2026-02-11',
  'alex-cooper-linkedin-electric-twin-funding-2026-02-12',
];
assert(electricTwinSeedSurface, 'Electric Twin named-angel seed-round surface is missing');
assert(electricTwinSeedSurface?.hop_eligible === true,
  'Electric Twin named-angel seed-round surface must remain hop eligible');
assert(electricTwinSeedSurface?.evidence_class === 'primary_public',
  'Electric Twin named-angel seed-round surface must carry first-party evidence');
assert(sameIdSet(electricTwinSeedSurface?.receipt_ids, electricTwinSeedReceiptIds),
  'Electric Twin named-angel seed-round receipts are stale');
assert(electricTwinInstitutionalSurface,
  'Electric Twin institutional seed-round refusal surface is missing');
assert(electricTwinInstitutionalSurface?.hop_eligible === false,
  'Electric Twin institutional seed-round surface must remain non-hop');
assert(electricTwinInstitutionalSurface?.hop_refusal_reason === 'organization_only_evidence',
  'Electric Twin institutional seed-round surface must expose the organization-only refusal');
assert(electricTwinInstitutionalSurface?.evidence_class === 'primary_public',
  'Electric Twin institutional seed-round surface must carry first-party evidence');
assert(sameIdSet(electricTwinInstitutionalSurface?.receipt_ids, electricTwinSeedReceiptIds),
  'Electric Twin institutional seed-round receipts are stale');

const electricTwinSeedParts =
  sourcePartsBySurface.get('electric-twin-seed-round-2026-02-11') ?? [];
const electricTwinInstitutionalParts =
  sourcePartsBySurface.get('electric-twin-seed-round-institutional-investors-2026-02-11') ?? [];
const electricTwinActorIds = electricTwinSeedParts
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort();
assert(JSON.stringify(electricTwinActorIds) === JSON.stringify([
  'cal-henderson',
  'eric-salama',
  'louis-mosley',
  'marc-andreessen',
  'tom-shinner',
]), 'Electric Twin named-angel surface must retain exactly five actors');
for (const participantId of electricTwinActorIds) {
  const participant = electricTwinSeedParts.find(part => part.actor_id === participantId);
  assert(participant?.evidence_class === 'primary_public',
    `Electric Twin angel ${participantId} must carry first-party evidence`);
}
for (const participantId of ['cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley']) {
  const participant = electricTwinSeedParts.find(part => part.actor_id === participantId);
  assert(sameIdSet(participant?.receipt_ids,
    ['alex-cooper-linkedin-electric-twin-funding-2026-02-12']),
    `Electric Twin angel ${participantId} receipts are stale`);
}
const institutionalActorIds = electricTwinInstitutionalParts
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort();
const institutionalOrganizationIds = electricTwinInstitutionalParts
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id).sort();
assert(JSON.stringify(institutionalActorIds) === JSON.stringify([]),
  'Electric Twin institutional seed-round evidence must not manufacture actors');
assert(JSON.stringify(institutionalOrganizationIds) === JSON.stringify([
  'atomico',
  'electric-twin',
  'localglobe',
  'mercuri',
  'samos',
]), 'Electric Twin institutional seed-round surface must retain exactly five organizations');
for (const organizationId of institutionalOrganizationIds) {
  const participant = electricTwinInstitutionalParts.find(
    part => part.organization_id === organizationId
  );
  assert(participant?.evidence_class === 'primary_public',
    `Electric Twin institution ${organizationId} must carry first-party evidence`);
}
const samosInstitution = electricTwinInstitutionalParts.find(
  part => part.organization_id === 'samos'
);
assert(sameIdSet(samosInstitution?.receipt_ids,
  ['alex-cooper-linkedin-electric-twin-funding-2026-02-12']),
  'Samos institutional participation must use the first-party founder receipt');
assert(!hasSurface('saul-klein', 'electric-twin-seed-round-2026-02-11'),
  'Saul Klein must not be substituted for LocalGlobe on the named-angel surface');
assert(!hasSurface('saul-klein',
  'electric-twin-seed-round-institutional-investors-2026-02-11'),
  'Saul Klein must not be projected onto the institutional refusal surface');
assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === 'electric-twin-seed-round-institutional-investors-2026-02-11'
  && row.reason === 'organization_only_evidence'),
  'Electric Twin institutional refusal must remain publicly visible');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis =>
  basis.surface_id === 'electric-twin-seed-round-institutional-investors-2026-02-11')),
  'Electric Twin institutional surface must never become an actor-hop basis');

const electricTwinFounderFundingReceipt =
  receiptById.get('alex-cooper-linkedin-electric-twin-funding-2026-02-12');
assert(electricTwinFounderFundingReceipt,
  'Electric Twin first-party complete participant-list receipt is missing');
assert(electricTwinFounderFundingReceipt?.evidence_class === 'primary_public',
  'Electric Twin founder funding receipt must be primary public');
assert(electricTwinFounderFundingReceipt?.path
  === 'receipts/topology/alex-cooper-linkedin-electric-twin-funding-2026-02-12.md',
  'Electric Twin founder funding receipt path is stale');
assert(electricTwinFounderFundingReceipt?.source_published_at === '2026-02-12',
  'Electric Twin founder funding source date is stale');
assert(electricTwinFounderFundingReceipt?.event_date === '2026-02-11',
  'Electric Twin founder funding event date is stale');
assert(electricTwinFounderFundingReceipt?.linkedin_activity_id === '7427643696898158594',
  'Electric Twin founder funding activity ID is stale');
assert(electricTwinFounderFundingReceipt?.archive?.ref
  === 'sha256:19d476ed9874693e3e8573d6fe5f5809920c7914b0024c14fc7e54c827ff2eab',
  'Electric Twin founder funding receipt digest is stale');
assert(!receiptById.has('tech-eu-electric-twin-seed-round-2026-02-12'),
  'superseded Tech.eu funding receipt remains canonical');

// Centre for Human Progress is admitted as one complete, exact-date formal
// officer surface. The separate Electric Twin science-adviser chronology remains
// single-actor and cannot inherit Ben Warner or any validation-study participant.
const centreFormationSurface = surfaceById.get(
  'centre-human-progress-director-appointments-2025-08-05',
);
const centreActorIds = [
  'ben-warner',
  'dennis-snower',
  'michael-muthukrishna',
  'sonja-vogt',
  'stephanie-salgado-muthukrishna',
];
assert(centreFormationSurface,
  'Centre for Human Progress same-day director surface is missing');
assert(centreFormationSurface?.hop_eligible === true,
  'Centre for Human Progress director surface must remain hop eligible');
assert(centreFormationSurface?.evidence_class === 'official',
  'Centre for Human Progress director surface must remain official');
assert(centreFormationSurface?.time_start === '2025-08-05'
  && centreFormationSurface?.time_end === '2025-08-05',
  'Centre for Human Progress director surface must remain one day');
assert(sameIdSet(centreFormationSurface?.receipt_ids,
  ['companies-house-centre-human-progress-directors-16630851']),
  'Centre for Human Progress director receipt is stale');
const centreParts = sourcePartsBySurface.get(
  'centre-human-progress-director-appointments-2025-08-05',
) ?? [];
assert(JSON.stringify(centreParts.filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort()) === JSON.stringify(centreActorIds),
  'Centre for Human Progress must preserve the complete five-person official roster');
assert(JSON.stringify(centreParts.filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)) === JSON.stringify(['centre-for-human-progress']),
  'Centre for Human Progress surface must preserve its exact company context');
assert(hopGraph.edges.flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === centreFormationSurface?.surface_id).length === 10,
  'five Centre directors must compile exactly ten formal officer bases');
const centreBenMichaelEdge = hopGraph.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'ben-warner|michael-muthukrishna');
const centreBenMichaelBasis = centreBenMichaelEdge?.surfaces.find(
  basis => basis.surface_id === centreFormationSurface?.surface_id,
);
assert(centreBenMichaelBasis?.evidence_class === 'official',
  'Ben Warner/Michael Muthukrishna Centre basis must remain official');
assert(centreBenMichaelBasis?.valid_from === '2025-08-05'
  && centreBenMichaelBasis?.valid_until === '2025-08-05',
  'Ben Warner/Michael Muthukrishna Centre basis must remain exact-date bounded');
for (const actorId of centreActorIds) {
  assert(hasSurface(actorId, centreFormationSurface?.surface_id),
    `${actorId} is missing the formal Centre officer surface`);
}
for (const actorId of ['dennis-snower', 'sonja-vogt', 'stephanie-salgado-muthukrishna']) {
  assert(JSON.stringify(actorScore.get(actorId)?.surfaces) === JSON.stringify([
    centreFormationSurface?.surface_id,
  ]), `${actorId} must not inherit an Electric Twin or validation surface`);
}

const adviserSurface = surfaceById.get(
  'electric-twin-muthukrishna-science-adviser-observations-2024-2026',
);
assert(adviserSurface, 'Michael Muthukrishna adviser chronology is missing');
assert(adviserSurface?.hop_eligible === false,
  'Michael Muthukrishna adviser chronology must remain non-hop');
assert(adviserSurface?.hop_refusal_reason === 'single_actor_advisory_context_only',
  'Michael Muthukrishna adviser chronology must expose the single-actor refusal');
assert(adviserSurface?.time_start === '2024-11-03'
  && adviserSurface?.time_end === '2026-08-12',
  'Michael Muthukrishna adviser chronology must preserve first and last observations');
const adviserParts = sourcePartsBySurface.get(adviserSurface?.surface_id) ?? [];
assert(JSON.stringify(adviserParts.filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)) === JSON.stringify(['michael-muthukrishna']),
  'adviser-role observations must not manufacture a second actor');
assert(JSON.stringify(adviserParts.filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)) === JSON.stringify(['electric-twin']),
  'adviser-role observations must preserve Electric Twin as company context');
assert(!adviserParts.some(part => part.actor_id === 'ben-warner'),
  'Centre co-directorship must not leak Ben Warner onto the adviser chronology');
assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === adviserSurface?.surface_id
    && row.reason === 'single_actor_advisory_context_only'),
  'Michael Muthukrishna adviser refusal must remain publicly visible');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === adviserSurface?.surface_id,
)), 'Michael Muthukrishna adviser chronology must never create actor adjacency');

const centreOfficerReceipt = receiptById.get(
  'companies-house-centre-human-progress-directors-16630851',
);
assert(centreOfficerReceipt?.company_number === '16630851',
  'Centre officer receipt must preserve the company number');
assert(centreOfficerReceipt?.event_date === '2025-08-05',
  'Centre officer receipt must preserve the appointment date');
assert(centreOfficerReceipt?.active_officers_at_retrieval === 5
  && centreOfficerReceipt?.resigned_officers_at_retrieval === 0,
  'Centre officer receipt must preserve the complete official denominator');
assert(sameIdSet(centreOfficerReceipt?.director_actor_ids, centreActorIds),
  'Centre officer receipt actor denominator is stale');
assert(centreOfficerReceipt?.archive?.ref
  === 'sha256:ca9783a742f55e58492546ca0d02be4bc8e9ac2a1fbb479d98cbf719688751f8',
  'Centre officer receipt digest is stale');
const adviserReceipt = receiptById.get(
  'electric-twin-lse-muthukrishna-adviser-observations-2024-2026',
);
assert(adviserReceipt?.first_observed_at === '2024-11-03'
  && adviserReceipt?.last_retrieved_at === '2026-08-12',
  'adviser receipt observation bounds are stale');
assert(adviserReceipt?.continuous_tenure_asserted === false,
  'adviser receipt must refuse continuous-tenure inference');
assert(adviserReceipt?.validation_protocol_recovered === false,
  'adviser receipt must preserve the unrecovered validation protocol');
assert(adviserReceipt?.archive?.ref
  === 'sha256:26c4cde9ad87ea498b49068605bb63a6878b827c1a8c386bf7185c9950bf32b4',
  'adviser receipt digest is stale');

const centreOfficerClaim = claimById.get(
  'centre-human-progress-five-director-appointments-2025-08-05',
);
assert(centreOfficerClaim, 'Centre five-director official claim must remain canonical');
assert(sameIdSet(centreOfficerClaim?.actor_ids, centreActorIds),
  'Centre five-director claim actor denominator is stale');
assert(JSON.stringify(centreOfficerClaim?.surface_ids) === JSON.stringify([
  centreFormationSurface?.surface_id,
]), 'Centre five-director claim surface binding is stale');
const adviserClaim = claimById.get(
  'electric-twin-muthukrishna-adviser-role-observations-2024-2026',
);
assert(adviserClaim, 'Michael Muthukrishna adviser claim must remain canonical');
assert(JSON.stringify(adviserClaim?.actor_ids) === JSON.stringify(['michael-muthukrishna']),
  'Michael Muthukrishna adviser claim must contain one actor');
assert(JSON.stringify(adviserClaim?.surface_ids) === JSON.stringify([
  adviserSurface?.surface_id,
]), 'Michael Muthukrishna adviser claim surface binding is stale');

const electricTwinSeedEdges = hopGraph.edges
  .filter(edge => edge.surfaces.some(
    basis => basis.surface_id === 'electric-twin-seed-round-2026-02-11'
  ));
const electricTwinSeedBases = electricTwinSeedEdges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === 'electric-twin-seed-round-2026-02-11');
assert(electricTwinSeedEdges.length === 10,
  'Electric Twin seed round must compile exactly ten actor-pair edges');
assert(electricTwinSeedBases.length === 10,
  'Electric Twin seed round must compile exactly ten actor-pair bases');
for (const edge of electricTwinSeedEdges) {
  assert(edge.evidence_weight === 1.25,
    'Electric Twin seed-round actor edge has stale evidence weight');
}
for (const basis of electricTwinSeedBases) {
  assert(basis.evidence_class === 'primary_public',
    'Electric Twin seed-round hop basis remains below first-party evidence');
  assert(sameIdSet(basis.receipt_ids, electricTwinSeedReceiptIds),
    'Electric Twin seed-round hop basis receipts are stale');
}

const localGlobeBoundaryClaim =
  claimById.get('electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12');
assert(localGlobeBoundaryClaim,
  'Electric Twin LocalGlobe actor-boundary claim must remain canonical');
assert(sameIdSet(localGlobeBoundaryClaim?.receipt_ids, electricTwinSeedReceiptIds),
  'Electric Twin LocalGlobe actor-boundary claim receipts are stale');

const voteLeaveSurface = surfaceById.get('vote-leave-data-science-2016');
assert(voteLeaveSurface, 'Vote Leave / ASI organization-only surface must compile');
assert(voteLeaveSurface?.hop_eligible === false,
  'Vote Leave / ASI organization-only surface must remain non-hop');
assert(voteLeaveSurface?.hop_refusal_reason === 'organization_only_evidence',
  'Vote Leave / ASI surface must expose the organization-only refusal');
const voteLeaveActorIds = (voteLeaveSurface?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort();
assert(JSON.stringify(voteLeaveActorIds) === JSON.stringify(['dominic-cummings']),
  'Vote Leave / ASI source may retain Dominic Cummings campaign context but must not infer Warner participation');
assert(!hasSurface('ben-warner', 'vote-leave-data-science-2016'),
  'Ben Warner must not inherit the organization-only Vote Leave source');
assert(!hasSurface('marc-warner', 'vote-leave-data-science-2016'),
  'Marc Warner must not inherit the organization-only Vote Leave source');

// Regression fixture 2: Electric Twin surface factory.
const et = orgScore.get('electric-twin');
assert(et?.surface_factory === true, 'Electric Twin must be a surface factory');
for (const sid of ['electric-twin-incorporation-2023-09-28', 'electric-twin-ben-warner-director-tenure-2023-09-28', 'electric-twin-alex-cooper-director-tenure-2023-09-28', 'electric-twin-ethics-board-2026', 'electric-twin-seed-round-2026-02-11', 'electric-twin-ben-blume-director-appointment-2025-09-12', 'electric-twin-seed2-governance-instrument-2025-09-12', 'electric-twin-seed2-capital-actions-2025-09-16-2025-09-26', 'electric-twin-capital-allotment-observations-2026-01-13-2026-07-09', 'electric-twin-newsuk-synthetic-audience', 'newsuk-times-exploraition-launch-publication-principals-2026-04-27', 'electric-twin-lebara-customer-use-2026-03-11', 'gartner-synthetic-population-category-2026']) {
  assert(et?.surfaces.includes(sid), `Electric Twin missing factory surface ${sid}`);
}

const ethicsBoardObservation = surfaceById.get('electric-twin-ethics-board-2026');
assert(ethicsBoardObservation, 'source-native Simon Case ethics-board observation must compile');
assert(ethicsBoardObservation?.hop_eligible === false, 'single-actor ethics-board observation must remain non-hop');
assert(ethicsBoardObservation?.hop_refusal_reason === 'single_actor_advisory_context_only', 'ethics-board observation must expose the single-actor refusal');
assert(ethicsBoardObservation?.time_start === '2026-06-11' && ethicsBoardObservation?.time_end === '2026-06-11', 'ethics-board appointment must remain a one-day public observation');
assert(sameIdSet(ethicsBoardObservation?.receipt_ids, ['civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11']), 'ethics-board observation must use the official Civil Service Commission receipt');
const ethicsBoardActors = (ethicsBoardObservation?.participants ?? []).filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert(JSON.stringify(ethicsBoardActors) === JSON.stringify(['simon-case']), 'ethics-board appointment must contain exactly Simon Case as an actor');
const ethicsBoardOrganizations = (ethicsBoardObservation?.participants ?? []).filter(part => part.participant_type === 'organization').map(part => part.organization_id);
assert(JSON.stringify(ethicsBoardOrganizations) === JSON.stringify(['electric-twin']), 'ethics-board appointment must retain Electric Twin as company context');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === ethicsBoardObservation?.surface_id)), 'single-actor ethics-board context must never become a hop basis');
assert(!ethicsBoardObservation?.receipt_ids.includes('times-case-electric-twin-2026'), 'source-native ethics-board observation must not rely on the master-only Times reference');
const ethicsBoardReceipt = receiptById.get('civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11');
assert(ethicsBoardReceipt?.evidence_class === 'official', 'ethics-board receipt must remain official');
assert(ethicsBoardReceipt?.event_date === '2026-06-11', 'ethics-board receipt must preserve the public observation date');
assert(ethicsBoardReceipt?.former_service_last_day === '2025-03-31', 'ethics-board receipt must preserve the recorded Civil Service departure date');
assert(ethicsBoardReceipt?.government_contact_or_lobbying === false, 'ethics-board receipt must preserve the no-government-contact condition');

const cabinetSecretaryTenure = surfaceById.get('simon-case-cabinet-secretary-2020-2024');
assert(cabinetSecretaryTenure, 'source-native Simon Case Cabinet Secretary tenure must compile');
assert(cabinetSecretaryTenure?.hop_eligible === false, 'single-actor Cabinet Secretary tenure must remain non-hop');
assert(cabinetSecretaryTenure?.hop_refusal_reason === 'single_actor_government_role_context_only', 'Cabinet Secretary tenure must expose the single-actor government-role refusal');
assert(cabinetSecretaryTenure?.time_start === '2020-09-09' && cabinetSecretaryTenure?.time_end === '2024-12-15', 'Cabinet Secretary tenure must preserve the exact official interval');
assert(sameIdSet(cabinetSecretaryTenure?.receipt_ids, ['gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01', 'gov-simon-case-cabinet-secretary-tenure-end-2024-12-15']), 'Cabinet Secretary tenure must use both official boundary receipts');
const cabinetSecretaryActors = (cabinetSecretaryTenure?.participants ?? []).filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert(JSON.stringify(cabinetSecretaryActors) === JSON.stringify(['simon-case']), 'Cabinet Secretary tenure must contain exactly Simon Case as an actor');
const cabinetSecretaryOrganizations = (cabinetSecretaryTenure?.participants ?? []).filter(part => part.participant_type === 'organization').map(part => part.organization_id);
assert(JSON.stringify(cabinetSecretaryOrganizations) === JSON.stringify(['cabinet-office']), 'Cabinet Secretary tenure must retain the Cabinet Office as institutional context');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === cabinetSecretaryTenure?.surface_id)), 'single-actor Cabinet Secretary tenure must never become a hop basis');
assert(!cabinetSecretaryTenure?.receipt_ids.includes('master-doc-v3'), 'source-native Cabinet Secretary tenure must not rely on the master proxy');
const cabinetAppointmentReceipt = receiptById.get('gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01');
assert(cabinetAppointmentReceipt?.evidence_class === 'official', 'Cabinet Secretary appointment receipt must remain official');
assert(cabinetAppointmentReceipt?.appointment_effective_at === '2020-09-09', 'Cabinet Secretary appointment receipt must preserve the exact start date');
const cabinetTenureEndReceipt = receiptById.get('gov-simon-case-cabinet-secretary-tenure-end-2024-12-15');
assert(cabinetTenureEndReceipt?.evidence_class === 'official', 'Cabinet Secretary tenure-end receipt must remain official');
assert(cabinetTenureEndReceipt?.tenure_end === '2024-12-15', 'Cabinet Secretary tenure-end receipt must preserve the exact end date');
assert(cabinetTenureEndReceipt?.successor_effective_at === '2024-12-16', 'Cabinet Secretary tenure-end receipt must preserve the successor start date');

const teamBarrowObservation = surfaceById.get('team-barrow-public-private-fund-2026');
assert(teamBarrowObservation, 'source-native Team Barrow governance observation must compile');
assert(teamBarrowObservation?.hop_eligible === false, 'single-actor Team Barrow governance observation must remain non-hop');
assert(teamBarrowObservation?.hop_refusal_reason === 'single_actor_partnership_governance_context_only', 'Team Barrow must expose the partnership-governance refusal');
assert(teamBarrowObservation?.time_start === '2025-02-10' && teamBarrowObservation?.time_end === '2026-07-02', 'Team Barrow must preserve the appointment and current-observation bounds');
assert(sameIdSet(teamBarrowObservation?.receipt_ids, ['gov-mhclg-simon-case-barrow-chair-2025-02-10', 'uk-parliament-plan-for-barrow-statement-2025-02-10', 'westmorland-team-barrow-chair-partnership-2025-02-10', 'civil-service-commission-simon-case-barrow-role-2026-07-02']), 'Team Barrow must carry all four official source receipts');
const teamBarrowActors = (teamBarrowObservation?.participants ?? []).filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert(JSON.stringify(teamBarrowActors) === JSON.stringify(['simon-case']), 'Team Barrow must contain exactly Simon Case as an actor');
const teamBarrowOrganizations = (teamBarrowObservation?.participants ?? []).filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort();
assert(JSON.stringify(teamBarrowOrganizations) === JSON.stringify(['bae-systems', 'local-council', 'uk-government']), 'Team Barrow must retain exactly the three source-supported organization contexts');
const teamBarrowGovernment = (teamBarrowObservation?.participants ?? []).find(part => part.organization_id === 'uk-government');
assert(teamBarrowGovernment?.participation_type === 'public_funder_and_appointing_authority_observation', 'UK Government must retain the public-funder and appointing-authority role');
assert(teamBarrowGovernment?.funding_amount_gbp === 200000000, 'Team Barrow government participation must preserve the £200 million amount');
const teamBarrowBae = (teamBarrowObservation?.participants ?? []).find(part => part.organization_id === 'bae-systems');
assert(teamBarrowBae?.participation_type === 'industry_partner_observation', 'BAE Systems must remain an industry partner rather than an inferred funder');
const teamBarrowCouncil = (teamBarrowObservation?.participants ?? []).find(part => part.organization_id === 'local-council');
assert(teamBarrowCouncil?.participation_type === 'local_government_partner_observation', 'the council must remain a local-government partner rather than an inferred funder');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === teamBarrowObservation?.surface_id)), 'single-actor Team Barrow context must never become a hop basis');
assert(!teamBarrowObservation?.receipt_ids.includes('master-doc-v3'), 'source-native Team Barrow observation must not rely on the master proxy');
const teamBarrowGovReceipt = receiptById.get('gov-mhclg-simon-case-barrow-chair-2025-02-10');
assert(teamBarrowGovReceipt?.appointment_effective_at === '2025-02-10', 'Team Barrow appointment receipt must preserve the exact appointment date');
assert(teamBarrowGovReceipt?.public_funding_amount_gbp === 200000000, 'Team Barrow appointment receipt must preserve the government funding amount');
const teamBarrowParliamentReceipt = receiptById.get('uk-parliament-plan-for-barrow-statement-2025-02-10');
assert(teamBarrowParliamentReceipt?.commons_statement_id === 'HCWS428' && teamBarrowParliamentReceipt?.lords_statement_id === 'HLWS424', 'Team Barrow parliamentary receipt must preserve both statement identifiers');
const teamBarrowCouncilReceipt = receiptById.get('westmorland-team-barrow-chair-partnership-2025-02-10');
assert(JSON.stringify(teamBarrowCouncilReceipt?.partnership_organizations) === JSON.stringify(['UK Government', 'Westmorland and Furness Council', 'BAE Systems']), 'Team Barrow council receipt must preserve the exact organization-level partnership');
const teamBarrowCurrentReceipt = receiptById.get('civil-service-commission-simon-case-barrow-role-2026-07-02');
assert(teamBarrowCurrentReceipt?.observed_active_through === '2026-07-02', 'Team Barrow current-role receipt must preserve the observation endpoint');
assert(teamBarrowCurrentReceipt?.continues_to_represent_government === true, 'Team Barrow current-role receipt must preserve the government-representation finding');

// Electric Twin legal formation is one dated hop; continuing officer tenures are non-hop observations.
assert(!surfaceById.has('electric-twin-founder-2023'), 'legacy open-ended Electric Twin founder surface must be retired');
const etIncorporation = surfaceById.get('electric-twin-incorporation-2023-09-28');
assert(etIncorporation, 'Electric Twin incorporation surface must compile');
assert(etIncorporation?.hop_eligible === true, 'Electric Twin incorporation surface must be hop eligible');
assert(etIncorporation?.time_start === '2023-09-28' && etIncorporation?.time_end === '2023-09-28',
  'Electric Twin incorporation surface must remain one day');
assert(sameIdSet(etIncorporation?.receipt_ids, ['companies-house-electric-twin-incorporation-2023-09-28']),
  'Electric Twin incorporation surface must use the exact Companies House receipt');
const incorporationActors = (etIncorporation?.participants ?? [])
  .filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort();
assert(JSON.stringify(incorporationActors) === JSON.stringify(['alex-cooper', 'ben-warner']),
  'Electric Twin incorporation must contain exactly the two initial directors');
const founderEdge = hopGraph.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'alex-cooper|ben-warner');
const incorporationBasis = founderEdge?.surfaces.find(basis => basis.surface_id === 'electric-twin-incorporation-2023-09-28');
assert(incorporationBasis, 'Ben Warner and Alex Cooper must connect through the incorporation record');
assert(incorporationBasis?.valid_from === '2023-09-28' && incorporationBasis?.valid_until === '2023-09-28',
  'the initial-director hop must not extend beyond the incorporation date');
for (const [surfaceId, actorId] of [
  ['electric-twin-ben-warner-director-tenure-2023-09-28', 'ben-warner'],
  ['electric-twin-alex-cooper-director-tenure-2023-09-28', 'alex-cooper'],
]) {
  const tenure = surfaceById.get(surfaceId);
  assert(tenure, `missing director-tenure surface ${surfaceId}`);
  assert(tenure?.hop_eligible === false, `${surfaceId} must remain non-hop`);
  assert(tenure?.time_start === '2023-09-28' && tenure?.time_end === '2026-08-11',
    `${surfaceId} must be bounded to the retrieval date`);
  const actors = (tenure?.participants ?? []).filter(part => part.participant_type === 'actor').map(part => part.actor_id);
  assert(JSON.stringify(actors) === JSON.stringify([actorId]), `${surfaceId} must contain exactly ${actorId}`);
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)),
    `${surfaceId} must never create pairwise adjacency`);
}
const incorporationReceipt = receiptById.get('companies-house-electric-twin-incorporation-2023-09-28');
assert(incorporationReceipt?.evidence_class === 'official', 'incorporation receipt must remain official');
assert(incorporationReceipt?.event_date === '2023-09-28', 'incorporation receipt must preserve the event date');
assert(incorporationReceipt?.retrieved_at === '2026-08-11', 'incorporation receipt must preserve the retrieval boundary');
assert(incorporationReceipt?.path === 'receipts/topology/companies-house-electric-twin-incorporation-2023-09-28.md',
  'incorporation receipt must resolve to the in-repo extract');

assert(surfaceById.get('electric-twin-seed2-governance-instrument-2025-09-12')?.hop_eligible === false,
  'Electric Twin September governance instrument must remain non-hop');
assert(surfaceById.get('electric-twin-seed2-capital-actions-2025-09-16-2025-09-26')?.hop_eligible === false,
  'Electric Twin September capital actions must remain non-hop');
for (const sid of ['electric-twin-seed2-governance-instrument-2025-09-12', 'electric-twin-seed2-capital-actions-2025-09-16-2025-09-26']) {
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === sid)),
    `Electric Twin filing surface ${sid} must never create a hop`);
}
const septemberCapitalParts = sourcePartsBySurface.get('electric-twin-seed2-capital-actions-2025-09-16-2025-09-26') ?? [];
assert(septemberCapitalParts.length === 1 && septemberCapitalParts[0].organization_id === 'electric-twin',
  'unidentified September allottees must not become canonical participants');

// Regression fixture 3: Simon Case governance continuity.
assert(hasSurface('simon-case', 'simon-case-cabinet-secretary-2020-2024'), 'Simon Case missing Cabinet Secretary surface');
assert(hasSurface('simon-case', 'electric-twin-ethics-board-2026'), 'Simon Case missing Electric Twin ethics board surface');
assert(hasSurface('simon-case', 'team-barrow-public-private-fund-2026'), 'Simon Case missing Team Barrow public-private fund surface');
assert(hasSecondary('simon-case', 'governance_continuity_surface'), 'Simon Case missing governance continuity surface type');

// Regression fixture 4: surface discrimination.
assert(surfaceById.get('electric-twin-newsuk-synthetic-audience')?.hop_eligible === false, 'News UK synthetic audience surface must be non-hop scorable context');
assert(surfaceById.get('gartner-synthetic-population-category-2026')?.hop_eligible === false, 'Gartner category formation surface must be non-hop scorable context');
assert(!surfaceById.has('faculty-investor-employee-2015-2019'), 'unrecoverable Faculty aggregation must be retired');
assert(surfaceById.get('faculty-science-officer-employee-overlap-2018-01-24')?.hop_eligible === true, 'repaired Faculty officer/employee surface must be hop eligible');
assert(surfaceById.get('faculty-science-director-shareholder-overlap-2024-10-10')?.hop_eligible === true, 'official Clifford Faculty bridge must be hop eligible');

// Faculty source repair and official Clifford bridge.
const faculty2018 = surfaceById.get('faculty-science-officer-employee-overlap-2018-01-24');
assert(faculty2018?.time_start === '2018-01-24' && faculty2018?.time_end === '2018-01-24',
  'repaired Faculty company surface must remain one day');
assert(sameIdSet(faculty2018?.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
  'companies-house-faculty-science-officers-08873131',
]), 'repaired Faculty company surface must use the dated role, explicit identity-join, and official company receipts');
assert(JSON.stringify((faculty2018?.participants ?? []).filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort()) === JSON.stringify(['ben-warner', 'marc-warner', 'saul-klein']),
  'repaired Faculty company surface must contain exactly Ben Warner, Marc Warner, and Saul Klein');
const benFaculty2018 = (faculty2018?.participants ?? []).find(part => part.actor_id === 'ben-warner');
assert(sameIdSet(benFaculty2018?.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
]), 'Ben Warner Faculty participation must carry both the dated role observation and the explicit legal-entity join');
assert(!(faculty2018?.participants ?? []).some(part => part.actor_id === 'matt-clifford'),
  'Matt Clifford cannot be backdated onto the 2018 Faculty surface');
assert(!(faculty2018?.receipt_ids ?? []).includes('warner-surface-audit-2026-06-29'),
  'repaired Faculty company surface must not depend on the lost scratch audit');

const faculty2024 = surfaceById.get('faculty-science-director-shareholder-overlap-2024-10-10');
assert(faculty2024?.time_start === '2024-10-10' && faculty2024?.time_end === '2024-10-10',
  'official Clifford Faculty bridge must remain one day');
assert(sameIdSet(faculty2024?.receipt_ids, [
  'gov-dsit-matt-clifford-faculty-shareholding-2024-10-10',
  'companies-house-faculty-science-officers-08873131',
]), 'official Clifford Faculty bridge must use the exact DSIT and Companies House receipts');
assert(JSON.stringify((faculty2024?.participants ?? []).filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id).sort()) === JSON.stringify(['marc-warner', 'matt-clifford', 'saul-klein']),
  'official Clifford Faculty bridge must contain exactly Clifford, Marc Warner, and Saul Klein');
for (const actorId of ['marc-warner', 'saul-klein']) {
  const edge = hopGraph.edges.find(row => [row.actor_a, row.actor_b].sort().join('|') === [actorId, 'matt-clifford'].sort().join('|'));
  const basis = edge?.surfaces.find(row => row.surface_id === faculty2024?.surface_id);
  assert(basis?.evidence_class === 'official', `Clifford/${actorId} Faculty basis must remain official`);
  assert(basis?.valid_from === '2024-10-10' && basis?.valid_until === '2024-10-10',
    `Clifford/${actorId} Faculty basis must remain bounded to 10 October 2024`);
}
const benPath = actorScore.get('ben-warner')?.shortest_path;
assert(benPath?.number === 2, 'Ben Warner must now have a two-hop all-time route to Clifford');
assert(benPath?.actor_path?.[0] === 'ben-warner' && benPath?.actor_path?.at(-1) === 'matt-clifford',
  'Ben Warner shortest path must terminate at the Clifford anchor');
const facultyOfficerReceipt = receiptById.get('companies-house-faculty-science-officers-08873131');
assert(facultyOfficerReceipt?.company_number === '08873131', 'Faculty officer receipt must preserve the company number');
assert(facultyOfficerReceipt?.marc_warner_appointed_at === '2014-02-03', 'Faculty officer receipt must preserve Marc Warner appointment');
assert(facultyOfficerReceipt?.saul_klein_appointed_at === '2016-04-21', 'Faculty officer receipt must preserve Saul Klein appointment');
assert(facultyOfficerReceipt?.saul_klein_resigned_at === '2026-03-12', 'Faculty officer receipt must preserve Saul Klein resignation');
const facultyIdentityReceipt = receiptById.get('faculty-asi-data-science-legal-identity-08873131');
assert(facultyIdentityReceipt?.brand_name === 'ASI Data Science', 'Faculty identity receipt must preserve the former brand');
assert(facultyIdentityReceipt?.successor_brand === 'Faculty', 'Faculty identity receipt must preserve the successor brand');
assert(facultyIdentityReceipt?.legal_entity === 'Faculty Science Limited', 'Faculty identity receipt must preserve the legal entity');
assert(facultyIdentityReceipt?.company_number === '08873131', 'Faculty identity receipt must preserve the company number');
assert(facultyIdentityReceipt?.previous_legal_name === 'Advanced Skills Initiative Limited',
  'Faculty identity receipt must preserve the previous registered name');
assert(receiptById.get('gov-dsit-matt-clifford-faculty-shareholding-2024-10-10')?.divestment_confirmed_at === '2025-02-24',
  'Clifford Faculty receipt must preserve the later divestment boundary');

// Regression fixture 5: no broad institution hops.
const broadOrgIds = new Set(data.organizations.filter(o => o.broad_institution).map(o => o.id));
for (const edge of hopGraph.edges) {
  for (const basis of edge.surfaces) {
    const surface = surfaceById.get(basis.surface_id);
    const orgParts = (surface?.participants ?? []).filter(p => p.participant_type === 'organization');
    for (const orgPart of orgParts) {
      if (broadOrgIds.has(orgPart.organization_id)) {
        // Broad institutions may be present in a surface, but the hop itself must still be actor co-participation in that named bounded surface.
        const actorParts = (surface?.participants ?? []).filter(p => p.participant_type === 'actor');
        assert(actorParts.length >= 2, `surface ${surface.surface_id} has broad institution but fewer than two actor participants`);
      }
    }
  }
}

// Laundering-chain / machine-score dimension: must be present, must NOT create hops.
const hopEdgeKeys = new Set(hopGraph.edges.flatMap(e => [`${e.actor_a}||${e.actor_b}`, `${e.actor_b}||${e.actor_a}`]));
for (const chain of (scores.chains ?? [])) {
  assert(chain.clifford_number === null, `chain ${chain.chain_id} must not carry a Clifford Number`);
  assert(typeof chain.why_no_hop === 'string' && chain.why_no_hop.length > 0, `chain ${chain.chain_id} must explain why_no_hop`);
  assert(chain.connector_surfaces_all_non_hop === true, `chain ${chain.chain_id} connector surfaces must be non-hop`);
  assert(chain.laundering_chain_score >= 1 && chain.laundering_chain_score <= chain.laundering_chain_max, `chain ${chain.chain_id} laundering_chain_score out of range`);
  for (const sid of chain.surfaces) assert(surfaceById.has(sid), `chain ${chain.chain_id} references missing surface ${sid}`);
  // The chain's dedicated connector surfaces must never appear as a hop basis.
  for (const sid of chain.surfaces) {
    const surface = surfaceById.get(sid);
    if (surface?.surface_type === 'laundering_chain_connector') {
      const isHopBasis = hopGraph.edges.some(e => e.surfaces.some(b => b.surface_id === sid));
      assert(!isHopBasis, `laundering_chain_connector ${sid} must never be a hop basis`);
    }
  }
}
// machine_score must be a normalized 0..1 figure on every scored entity.
for (const a of scores.actors) assert(a.machine_score >= 0 && a.machine_score <= 1, `actor ${a.actor_id} machine_score out of range`);
for (const c of (scores.chains ?? [])) assert(c.machine_score >= 0 && c.machine_score <= 1, `chain ${c.chain_id} machine_score out of range`);
// A high chain score must be expressible without a hop: at least one entity with chain score >= 3
// and no Clifford hop, OR the chain itself (which never hops). This is the whole point of the dimension.
assert((scores.chains ?? []).some(c => c.laundering_chain_score >= 3), 'expected at least one laundering chain with score >= 3');

// Temporal identity layer (reconciled AXM ids). The artifact must be a
// deterministic function of the ledger — recompute it and require exact
// agreement — and must carry its pinned reconciliation state, so a stale or hand-edited
// artifact, or one silently stripped of the caveat, fails the release.
{
  const identity = readJson('build/axm-identity.json');
  assert(identity.scheme?.status === 'reconciled', 'axm-identity scheme.status must be reconciled against the pinned axm-genesis shared fixture');
  assert(identity.scheme?.namespace === readJson('cases.json').default_case_id, `axm-identity namespace ${identity.scheme?.namespace} does not match the default case id`);
  const recomputed = buildIdentityLayer({
    namespace: readJson('cases.json').default_case_id,
    actors: data.actors,
    organizations: data.organizations,
    surfaces: data.surfaces,
    participation: data.participation,
    aliases: data.aliases,
  });
  assert(JSON.stringify({ scheme: identity.scheme, entities: identity.entities, claims: identity.claims }) === JSON.stringify(recomputed),
    'build/axm-identity.json does not match the identity layer recomputed from the ledger — rebuild (npm run build:hops)');
  const idRe = /^e1_[a-z2-7]{52}$/;
  for (const e of identity.entities) assert(idRe.test(e.axm_entity_id), `entity ${e.local_id} has malformed axm id ${e.axm_entity_id}`);
  for (const c of identity.claims) {
    assert(/^c1_[a-z2-7]{52}$/.test(c.claim_id), `claim ${c.claim_id} is malformed`);
    assert(c.windows.length > 0, `claim ${c.claim_id} carries no temporal windows`);
    for (const w of c.windows) {
      assert(w.dated === Boolean(w.valid_from || w.valid_until), `claim ${c.claim_id} window dated flag disagrees with its bounds`);
    }
  }
  // Identity is time-stable: one claim per (subj, obj), stints as windows.
  const pairs = new Set(identity.claims.map(c => `${c.subj}||${c.obj}`));
  assert(pairs.size === identity.claims.length, 'duplicate (subj, obj) participates_in claims — stints must be windows on one claim');
}

// Full-database migration is required, not optional.
assert(migration.total_rows > 200, `migration parsed too few master rows: ${migration.total_rows}`);
assert(migration.bucket_counts?.participation_claim > 50, 'migration did not classify enough participation claims from master doc');



// Electric Twin accuracy-methodology article: exact authorship is admissible;
// a validation attribution cannot add an unnamed external participant or
// substitute an adviser title for a dated study row.
const accuracyMethodologySurface = surfaceById.get(
  'electric-twin-accuracy-methodology-publication-2026-02-11',
);
assert(accuracyMethodologySurface,
  'Electric Twin accuracy-methodology publication surface is missing');
assert(accuracyMethodologySurface?.hop_eligible === true,
  'the exact two-author publication surface must remain hop eligible');
assert(accuracyMethodologySurface?.evidence_class === 'primary_public',
  'the publication surface must retain first-party evidence');
assert(accuracyMethodologySurface?.time_start === '2026-02-11'
  && accuracyMethodologySurface?.time_end === '2026-02-11',
  'the publication surface must remain bounded to 11 February 2026');
const accuracyMethodologyActors = (accuracyMethodologySurface?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)
  .sort();
assert(sameIdSet(accuracyMethodologyActors, [
  'andrew-bailey-electric-twin',
  'ben-warner',
]), 'the publication surface must contain exactly the two named authors');
assert(!(accuracyMethodologySurface?.participants ?? []).some(
  part => part.actor_id === 'michael-muthukrishna',
), 'LSE attribution or an adviser title must not manufacture Muthukrishna participation');
assert(sameIdSet(
  (accuracyMethodologySurface?.participants ?? [])
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['electric-twin'],
), 'Electric Twin must remain the sole organization on the publication surface');
const accuracyMethodologyBases = hopGraph.edges.flatMap(edge =>
  edge.surfaces
    .filter(basis => basis.surface_id === accuracyMethodologySurface?.surface_id)
    .map(basis => ({ edge, basis }))
);
assert(accuracyMethodologyBases.length === 1,
  'the exact two-author publication must create one and only one hop basis');
const accuracyMethodologyBase = accuracyMethodologyBases[0];
assert(sameIdSet([
  accuracyMethodologyBase?.edge.actor_a,
  accuracyMethodologyBase?.edge.actor_b,
], ['andrew-bailey-electric-twin', 'ben-warner']),
  'the accuracy-publication basis must connect only Ben Warner and Andrew Bailey');
assert(accuracyMethodologyBase?.basis.evidence_class === 'primary_public',
  'the accuracy-publication basis must retain first-party evidence');
assert(accuracyMethodologyBase?.basis.valid_from === '2026-02-11'
  && accuracyMethodologyBase?.basis.valid_until === '2026-02-11',
  'the accuracy-publication basis must remain one day');
assert(actorScore.get('andrew-bailey-electric-twin')?.surfaces.length === 1
  && actorScore.get('andrew-bailey-electric-twin')?.surfaces[0]
    === accuracyMethodologySurface?.surface_id,
  'the disambiguated Andrew Bailey actor must not inherit unrelated surfaces');

const accuracyMethodologyReceipt = receiptById.get(
  'electric-twin-accuracy-methodology-2026-02-11',
);
assert(accuracyMethodologyReceipt,
  'Electric Twin accuracy-methodology receipt is missing');
assert(sameIdSet(accuracyMethodologyReceipt?.author_actor_ids, [
  'andrew-bailey-electric-twin',
  'ben-warner',
]), 'the accuracy receipt must preserve the two named authors');
assert(accuracyMethodologyReceipt?.reported_one_minus_mae === 0.955,
  'the receipt must preserve the vendor-reported 1-MAE result');
assert(accuracyMethodologyReceipt?.reported_ndam === 0.92,
  'the receipt must preserve the vendor-reported NDAM result');
assert(accuracyMethodologyReceipt?.reported_persona_count === 11000,
  'the receipt must preserve the vendor-reported persona denominator');
assert(accuracyMethodologyReceipt?.external_validator_named_in_article === false,
  'the receipt must preserve that the article names no external validator');
assert(accuracyMethodologyReceipt?.independent_study_object_recovered === false,
  'the receipt must preserve the missing independent study object');
assert(accuracyMethodologyReceipt?.archive?.ref
  === 'sha256:0aeb99e82338eb5846182fecd804e6b73e6274c942b01aa49369221f028ad0f5',
  'the accuracy-methodology extract hash must remain exact');
const accuracyMethodologyClaim = claimById.get(
  'electric-twin-accuracy-methodology-authors-2026-02-11',
);
assert(accuracyMethodologyClaim,
  'accuracy-methodology authorship claim is missing');
assert(sameIdSet(accuracyMethodologyClaim?.actor_ids, [
  'andrew-bailey-electric-twin',
  'ben-warner',
]), 'the authorship claim must retain the exact author set');
const independentValidationBoundaryClaim = claimById.get(
  'electric-twin-independent-validation-publication-boundary-2026-02-11',
);
assert(independentValidationBoundaryClaim,
  'independent-validation participation boundary is missing');
assert(sameIdSet(independentValidationBoundaryClaim?.actor_ids, ['michael-muthukrishna']),
  'the boundary claim must identify the proposed but unsupported actor endpoint');
assert(sameIdSet(independentValidationBoundaryClaim?.surface_ids, [
  'electric-twin-accuracy-methodology-publication-2026-02-11',
]), 'the boundary claim must remain tied to the article surface');


// Anduril UK deep-and-wide official topology release gate.
{
  const company = data.organizations.find(row => row.id === 'anduril-industries-uk-ltd');
  assert(company, 'exact Anduril UK legal entity is missing');
  assert(company?.company_number === '12316056', 'Anduril UK company number is stale');
  const officerSurface = surfaceById.get('anduril-uk-co-director-appointments-2024-07-31');
  const talosNamed = surfaceById.get('anduril-talos-phase-3-named-principals-2023-11-02');
  const ukraineNamed = surfaceById.get('anduril-ukraine-drone-deal-named-principals-2025-03-06');
  for (const sourceSurface of [officerSurface, talosNamed, ukraineNamed]) {
    assert(sourceSurface?.hop_eligible === true, `named Anduril surface ${sourceSurface?.surface_id} must be hop eligible`);
    assert(sourceSurface?.time_start === sourceSurface?.time_end, `named Anduril surface ${sourceSurface?.surface_id} must remain one day`);
    assert(sourceSurface?.evidence_class === 'official', `named Anduril surface ${sourceSurface?.surface_id} must retain official evidence`);
  }
  const hasBasis = (left, right, surfaceId) => hopGraph.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|') === [left, right].sort().join('|')
      && edge.surfaces.some(basis => basis.surface_id === surfaceId));
  assert(hasBasis('rich-drake', 'maury-shenk', 'anduril-uk-co-director-appointments-2024-07-31'),
    'Drake/Shenk same-day officer basis is missing');
  assert(hasBasis('dan-sawyers', 'greg-kausner', 'anduril-talos-phase-3-named-principals-2023-11-02'),
    'Sawyers/Kausner TALOS announcement basis is missing');
  assert(hasBasis('john-healey', 'rich-drake', 'anduril-ukraine-drone-deal-named-principals-2025-03-06'),
    'Healey/Drake Ukraine deal announcement basis is missing');
  assert(hasBasis('john-healey', 'keir-starmer', 'strategic-defence-review-2024-2025'),
    'existing Healey/Starmer official bridge is missing');
  assert(hasBasis('keir-starmer', 'matt-clifford', 'ai-opportunities-action-plan-2025'),
    'existing Starmer/Clifford official bridge is missing');
  assert(!hopGraph.edges.some(edge => [edge.actor_a, edge.actor_b].sort().join('|') === 'matt-clifford|rich-drake'),
    'Anduril widening must not create a direct Clifford/Drake edge');
  for (const [surfaceId, reason] of [
    ['anduril-ai-fight-tonight-award-2021-07-31', 'organization_only_procurement_instrument'],
    ['anduril-talos-phase-2-award-2021-08-02', 'organization_only_procurement_instrument'],
    ['anduril-copci-border-force-contract-2022-06-21', 'organization_only_procurement_instrument'],
    ['anduril-project-entrelezar-award-2023-10-09', 'supplier_identity_reference_conflict'],
    ['anduril-ddad-framework-2026-01-09', 'organization_only_multi_supplier_framework'],
    ['anduril-project-nyx-seven-supplier-shortlist-2026-01-24', 'organization_only_competitive_shortlist'],
    ['anduril-project-nyx-four-supplier-downselect-2026-05-15', 'organization_only_competitive_shortlist'],
  ]) {
    const sourceSurface = surfaceById.get(surfaceId);
    assert(sourceSurface?.hop_eligible === false, `${surfaceId} must remain non-hop`);
    assert(sourceSurface?.hop_refusal_reason === reason, `${surfaceId} refusal reason is stale`);
    assert((hopGraph.rejected_hop_surfaces ?? []).some(row => row.surface_id === surfaceId && row.reason === reason),
      `${surfaceId} refusal is missing from the public graph`);
    assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)),
      `${surfaceId} must not manufacture actor adjacency`);
  }
  const companyReceipt = receiptById.get('companies-house-anduril-industries-uk-12316056');
  assert(companyReceipt?.archive?.ref === 'sha256:6d2a1b4cdf9b7453d922756a92fb93e8fb8e1ae6ac2da656c8cb318669085eea', 'Anduril UK company extract hash is stale');
  const talosReceipt = receiptById.get('gov-mod-anduril-talos-phase-3-contract-2023-11-02');
  assert(sameIdSet(talosReceipt?.named_actor_ids, ['dan-sawyers', 'greg-kausner']), 'TALOS named principals are stale');
  assert(talosReceipt?.archive?.ref === 'sha256:6660b2890c6756ad9016bf2d4b90d4a132a32f01c22a9ea1b55cc1c436da876a', 'TALOS Phase 3 extract hash is stale');
  const droneReceipt = receiptById.get('gov-mod-anduril-ukraine-drone-deal-2025-03-06');
  assert(sameIdSet(droneReceipt?.named_actor_ids, ['john-healey', 'rich-drake']), 'Ukraine deal named principals are stale');
  assert(droneReceipt?.rich_drake_present_at_healey_visit_established === false, 'receipt must not invent Drake attendance at the Healey visit');
  assert(droneReceipt?.archive?.ref === 'sha256:3665b9dfa78010a228068df32fae92a3c710e536d554ae2871b2b334f2fa86ca', 'Ukraine deal extract hash is stale');
  const conflictReceipt = receiptById.get('contracts-finder-anduril-project-entrelezar-2023-10-09');
  assert(conflictReceipt?.supplier_identity_resolved === false, 'ENTRELEZAR supplier conflict must remain unresolved');
  assert(conflictReceipt?.archive?.ref === 'sha256:79d95a713860977a55c76363b3b06abfe0e2f4c9f6139c5a1b3d923533ecf338', 'ENTRELEZAR extract hash is stale');
  assert(claimById.get('rich-drake-to-matt-clifford-three-hop-all-time-route-2026-08-12'),
    'public Rich Drake to Matt Clifford route claim is missing');
  assert(claimById.get('anduril-uk-official-procurement-chronology-2021-2026'),
    'public Anduril UK procurement chronology claim is missing');
}


// Atlantic Bastion official launch-publication release gate.
{
  const launch = surfaceById.get('atlantic-bastion-launch-publication-2025-12-08');
  assert(launch?.hop_eligible === true, 'Atlantic Bastion named launch surface must remain hop eligible');
  assert(launch?.time_start === '2025-12-08' && launch?.time_end === '2025-12-08',
    'Atlantic Bastion named launch surface must remain one day');
  assert(launch?.evidence_class === 'official', 'Atlantic Bastion named launch surface must retain official evidence');
  const launchActorIds = data.participation
    .filter(row => row.surface_id === 'atlantic-bastion-launch-publication-2025-12-08' && row.participant_type === 'actor')
    .map(row => row.actor_id)
    .sort();
  assert(sameIdSet(launchActorIds, [
    'john-healey',
    'gwyn-jenkins',
    'rich-drake',
    'scott-jamieson-bae',
    'amelia-gould-helsing',
  ]), 'Atlantic Bastion named participant denominator is stale');
  const pairKey = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const launchEdges = hopGraph.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'atlantic-bastion-launch-publication-2025-12-08'));
  assert(launchEdges.length === 10, 'Atlantic Bastion five-person publication must compile ten exact bases');
  assert(launchEdges.every(edge =>
    edge.surfaces.some(basis =>
      basis.surface_id === 'atlantic-bastion-launch-publication-2025-12-08'
        && basis.valid_from === '2025-12-08'
        && basis.valid_until === '2025-12-08')),
    'Atlantic Bastion bases must remain one-day official publication bases');
  for (const actorId of ['gwyn-jenkins', 'scott-jamieson-bae', 'amelia-gould-helsing']) {
    assert(data.actors.some(row => row.id === actorId), `missing Atlantic Bastion actor ${actorId}`);
    assert(!hopGraph.edges.some(edge => pairKey(edge) === [actorId, 'matt-clifford'].sort().join('|')),
      `${actorId} must not receive a direct Matt Clifford edge`);
  }
  const context = surfaceById.get('atlantic-bastion-industry-program-context-2025-12-08');
  assert(context?.hop_eligible === false, 'Atlantic Bastion wider programme context must remain non-hop');
  assert(context?.hop_refusal_reason === 'organization_only_multi_party_program_context',
    'Atlantic Bastion wider programme refusal reason is stale');
  assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
    row.surface_id === 'atlantic-bastion-industry-program-context-2025-12-08'
      && row.reason === 'organization_only_multi_party_program_context'),
    'Atlantic Bastion wider programme refusal is missing from the public graph');
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'atlantic-bastion-industry-program-context-2025-12-08')),
    'Atlantic Bastion wider programme context must not manufacture actor adjacency');
  const sourceReceipt = receiptById.get('gov-mod-atlantic-bastion-launch-2025-12-08');
  assert(sourceReceipt?.archive?.ref === 'sha256:fbdc504cf86258811277a259578e9e217108bd5fc0033b82c0c5d242f93db059',
    'Atlantic Bastion receipt digest is stale');
  assert(sameIdSet(sourceReceipt?.named_actor_ids, launchActorIds),
    'Atlantic Bastion receipt actor denominator is stale');
  assert(sourceReceipt?.all_named_actors_same_physical_event_established === false,
    'Atlantic Bastion receipt must not invent universal physical co-attendance');
  assert(sourceReceipt?.matt_clifford_named === false,
    'Atlantic Bastion receipt must not name Matt Clifford');
  assert(data.organizations.some(row => row.id === 'helsing'),
    'Helsing source-name organization is missing');
  assert(claimById.get('atlantic-bastion-named-launch-publication-cohort-2025-12-08'),
    'Atlantic Bastion launch cohort claim is missing');
  assert(claimById.get('atlantic-bastion-industry-denominator-boundary-2025-12-08'),
    'Atlantic Bastion wider denominator boundary claim is missing');
  assert(claimById.get('matt-clifford-atlantic-bastion-boundary-2025-12-08'),
    'Atlantic Bastion Matt Clifford boundary claim is missing');
}


// Entrepreneur First official cofounder observation release gate.
{
  const efSurface = surfaceById.get('entrepreneur-first-cofounder-observation-2018-07-05');
  assert(efSurface?.surface_type === 'founder_officer_surface',
    'Entrepreneur First cofounder surface type is stale');
  assert(efSurface?.hop_eligible === true,
    'Entrepreneur First cofounder observation must remain hop eligible');
  assert(efSurface?.evidence_class === 'official',
    'Entrepreneur First cofounder observation must retain official evidence');
  assert(efSurface?.time_start === '2018-07-05' && efSurface?.time_end === '2018-07-05',
    'Entrepreneur First cofounder observation must remain one day');
  const efParts = data.participation.filter(row => row.surface_id === 'entrepreneur-first-cofounder-observation-2018-07-05');
  assert(sameIdSet(
    efParts.filter(row => row.participant_type === 'actor').map(row => row.actor_id),
    ['alice-bentinck', 'matt-clifford'],
  ), 'Entrepreneur First actor denominator must remain Alice Bentinck and Matt Clifford');
  assert(sameIdSet(
    efParts.filter(row => row.participant_type === 'organization').map(row => row.organization_id),
    ['entrepreneur-first'],
  ), 'Entrepreneur First organization denominator is stale');
  const efPairKey = ['alice-bentinck', 'matt-clifford'].sort().join('|');
  const efEdge = hopGraph.edges.find(edge => [edge.actor_a, edge.actor_b].sort().join('|') === efPairKey);
  assert(efEdge, 'Entrepreneur First cofounder edge is missing');
  const efBases = efEdge.surfaces.filter(basis => basis.surface_id === 'entrepreneur-first-cofounder-observation-2018-07-05');
  assert(efBases.length === 1, 'Entrepreneur First surface must retain exactly one pair basis');
  assert(efBases[0]?.valid_from === '2018-07-05' && efBases[0]?.valid_until === '2018-07-05',
    'Entrepreneur First pair basis must remain exact-date bounded');
  assert(efBases[0]?.evidence_class === 'official',
    'Entrepreneur First pair basis must retain official evidence');
  assert(data.actors.some(row => row.id === 'alice-bentinck'),
    'Alice Bentinck canonical actor is missing');
  assert(data.organizations.some(row => row.id === 'entrepreneur-first'),
    'Entrepreneur First canonical organization is missing');
  const efReceipt = receiptById.get('gov-uk-france-ai-data-entrepreneur-first-cofounders-2018-07-05');
  assert(efReceipt?.archive?.ref === 'sha256:61b789474e442854b3613ba017f05e5e6d46f417916ec35b75e05ee40165111e',
    'Entrepreneur First cofounder receipt digest is stale');
  assert(sameIdSet(efReceipt?.named_actor_ids, ['alice-bentinck', 'matt-clifford']),
    'Entrepreneur First receipt actor denominator is stale');
  assert(efReceipt?.reported_foundation_year === 2011,
    'Entrepreneur First source-reported foundation year is stale');
  assert(efReceipt?.exact_foundation_date_established === false,
    'Entrepreneur First receipt must not invent an exact founding date');
  assert(efReceipt?.continuous_shared_management_established === false,
    'Entrepreneur First receipt must not invent continuous shared management');
  assert(efReceipt?.current_ownership_established === false,
    'Entrepreneur First receipt must not invent current ownership');
  assert(claimById.get('entrepreneur-first-cofounders-official-observation-2018-07-05'),
    'Entrepreneur First official cofounder claim is missing');
}


// Ben Warner / Dominic Cummings exact email-routing release gate.
{
  const emailSurface = surfaceById.get('ben-warner-cummings-shafi-contain-delay-email-2020-03-08');
  assert(emailSurface?.hop_eligible === true, 'contain-to-delay email surface must remain hop eligible');
  assert(emailSurface?.time_start === '2020-03-08' && emailSurface?.time_end === '2020-03-08',
    'contain-to-delay email surface must remain exact-date bounded');
  assert(emailSurface?.evidence_class === 'official',
    'contain-to-delay email surface must retain official evidence');
  const emailParts = sourcePartsBySurface.get('ben-warner-cummings-shafi-contain-delay-email-2020-03-08') ?? [];
  assert(sameIdSet(
    emailParts.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
    ['ben-warner', 'dominic-cummings', 'imran-shafi'],
  ), 'contain-to-delay email actor denominator is stale');
  assert(sameIdSet(
    emailParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
    ['no-10'],
  ), 'contain-to-delay email institutional context is stale');
  const pairKey = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const emailEdges = hopGraph.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'ben-warner-cummings-shafi-contain-delay-email-2020-03-08'));
  assert(emailEdges.length === 3, 'contain-to-delay email must compile three exact actor bases');
  assert(sameIdSet(emailEdges.map(pairKey), [
    'ben-warner|dominic-cummings',
    'ben-warner|imran-shafi',
    'dominic-cummings|imran-shafi',
  ]), 'contain-to-delay email edge denominator is stale');
  assert(emailEdges.every(edge => edge.surfaces.some(basis =>
    basis.surface_id === 'ben-warner-cummings-shafi-contain-delay-email-2020-03-08'
      && basis.valid_from === '2020-03-08'
      && basis.valid_until === '2020-03-08'
      && basis.evidence_class === 'official')),
    'contain-to-delay email bases must remain one-day and official');
  assert(data.actors.some(row => row.id === 'imran-shafi'), 'Imran Shafi actor is missing');
  const sourceReceipt = receiptById.get('uk-covid-inquiry-ben-warner-cummings-shafi-email-2020-03-08');
  assert(sourceReceipt?.document_id === 'INQ000195879', 'contain-to-delay Inquiry document id is stale');
  assert(sourceReceipt?.sender_actor_id === 'ben-warner', 'contain-to-delay sender is stale');
  assert(sameIdSet(sourceReceipt?.recipient_actor_ids, ['dominic-cummings', 'imran-shafi']),
    'contain-to-delay recipients are stale');
  assert(sourceReceipt?.archive?.ref === 'sha256:698acebeb0b95b957d518eba7569215062568040a70575e9203ddaff89683b77',
    'contain-to-delay receipt digest is stale');
  assert(sourceReceipt?.catalogue_metadata_only === true && sourceReceipt?.email_body_used_for_claims === false,
    'contain-to-delay claim must remain catalogue-metadata bounded');
  assert(sourceReceipt?.policy_agreement_established === false,
    'contain-to-delay receipt must not invent policy agreement');
  const voteLeave = surfaceById.get('vote-leave-data-science-2016');
  assert(voteLeave?.hop_eligible === false && voteLeave?.hop_refusal_reason === 'organization_only_evidence',
    'Vote Leave organization-only refusal is stale');
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'vote-leave-data-science-2016')),
    'later No. 10 email must not reactivate the Vote Leave campaign surface');
  assert(claimById.get('ben-warner-cummings-shafi-contain-delay-email-2020-03-08'),
    'contain-to-delay email claim is missing');
  assert(claimById.get('vote-leave-campaign-to-covid-email-boundary-2020-03-08'),
    'campaign-to-email boundary claim is missing');
}

// Session-local scratch is transport, not durable evidence. A canonical
// receipt must never depend on an AI-session filesystem path or preserve an
// unrecoverable local paste as if it were still a live evidentiary object.
for (const receipt of data.receipts) {
  const receiptPath = String(receipt.path ?? '');
  assert(!receiptPath.startsWith('/mnt/data/'),
    `receipt ${receipt.receipt_id} points at ephemeral session storage: ${receiptPath}`);
  assert(receipt.archive?.method !== 'unrecoverable_local_paste',
    `receipt ${receipt.receipt_id} uses unrecoverable_local_paste; recover, rebind, or retire it`);
}

// Receipt archival gate (BUILD-INSTRUCTIONS 2.5). Missing archive references
// warn before the cutoff and fail on/after it; a stale in-repo content hash
// fails immediately.
{
  const { errors: archivalErrors, warnings: archivalWarnings } = checkReceiptArchival(data.receipts, { today: todayString() });
  for (const err of archivalErrors) errors.push(err);
  for (const warn of archivalWarnings) warnings.push(warn);
}

// Place-centered field-autopsy bundles preserve untrusted intake as expression
// only, keep hypotheses graph-inert, and require provenance for searched states.
{
  const caseRoot = path.join(root, 'cases');
  for (const entry of fs.readdirSync(caseRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(caseRoot, entry.name);
    if (!isFieldAutopsyCase(dir)) continue;
    for (const err of validateFieldAutopsy(loadFieldAutopsy(dir))) {
      errors.push(`field-autopsy ${entry.name}: ${err}`);
    }
  }
}

// Electric Twin × Virgin source-native MAD//Fest stage-session boundary.
const madfestSession = surfaceById.get('electric-twin-virgin-madfest-session-2026-07-08');
const madfestReceipt = receiptById.get('madfest-electric-twin-virgin-session-2026-07-08');
const madfestActorIds = ['ben-warner', 'james-tyrrell', 'michael-barber-virgin'].sort();
assert(madfestSession, 'Electric Twin / Virgin MAD//Fest session is missing');
assert(madfestSession?.surface_type === 'customer_vendor_surface',
  'MAD//Fest session must remain a bounded customer/vendor event surface');
assert(madfestSession?.hop_eligible === true,
  'confirmed three-speaker MAD//Fest session must remain hop eligible');
assert(madfestSession?.evidence_class === 'primary_public',
  'MAD//Fest session must retain primary-public evidence');
assert(madfestSession?.time_start === '2026-07-08' && madfestSession?.time_end === '2026-07-08',
  'MAD//Fest session must remain exact-date bounded');
const madfestParts = sourcePartsBySurface.get(madfestSession?.surface_id) ?? [];
assert(sameIdSet(
  madfestParts.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  madfestActorIds,
), 'MAD//Fest actor denominator must remain exactly Ben Warner, James Tyrrell, and Michael Barber');
assert(sameIdSet(
  madfestParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
  ['electric-twin', 'virgin'],
), 'MAD//Fest organization denominator must remain Electric Twin and source-name Virgin');
assert(madfestParts.every(part =>
  part.time_start === '2026-07-08'
    && part.time_end === '2026-07-08'
    && part.evidence_class === 'primary_public'
    && sameIdSet(part.receipt_ids, ['madfest-electric-twin-virgin-session-2026-07-08'])),
  'every MAD//Fest participant must retain the exact date, evidence class, and receipt');
const madfestBases = hopGraph.edges.filter(edge =>
  edge.surfaces.some(basis => basis.surface_id === madfestSession?.surface_id));
assert(madfestBases.length === 3,
  'three MAD//Fest speakers must produce exactly three pairwise bases');
assert(sameIdSet(
  madfestBases.map(edge => [edge.actor_a, edge.actor_b].sort().join('|')),
  [
    'ben-warner|james-tyrrell',
    'ben-warner|michael-barber-virgin',
    'james-tyrrell|michael-barber-virgin',
  ],
), 'MAD//Fest pair set drifted');
for (const edge of madfestBases) {
  const basis = edge.surfaces.find(row => row.surface_id === madfestSession?.surface_id);
  assert(basis?.valid_from === '2026-07-08' && basis?.valid_until === '2026-07-08',
    'every MAD//Fest basis must remain one-day');
  assert(basis?.evidence_class === 'primary_public',
    'every MAD//Fest basis must remain primary-public');
}
assert(madfestReceipt?.shared_stage_confirmed === true,
  'post-event Electric Twin shared-stage confirmation must remain explicit');
assert(madfestReceipt?.agenda_listing_alone_treated_as_attendance === false,
  'advance agenda listing must not be represented as attendance by itself');
assert(madfestReceipt?.virgin_identity_scope === 'source_name_only'
  && madfestReceipt?.virgin_legal_entity_resolved === false,
  'Virgin must remain source-name scoped without a manufactured legal-entity join');
assert(madfestReceipt?.contract_terms_established === false
  && madfestReceipt?.private_contact_established === false
  && madfestReceipt?.continuous_joint_work_established === false,
  'MAD//Fest receipt must preserve the contract, private-contact, and continuing-work refusals');
assert(madfestReceipt?.archive?.ref ===
  'sha256:5cbbcb8f7fa18c0c29e2f97dea26ebb1608b02a28463c1af5e48a7b6e5451c13',
  'MAD//Fest receipt digest drift');
for (const actorId of ['james-tyrrell', 'michael-barber-virgin']) {
  assert(sameIdSet(
    data.participation
      .filter(part => part.participant_type === 'actor' && part.actor_id === actorId)
      .map(part => part.surface_id),
    ['electric-twin-virgin-madfest-session-2026-07-08'],
  ), `${actorId} must not inherit any surface beyond the exact MAD//Fest session`);
  assert(!hopGraph.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|') === [actorId, 'matt-clifford'].sort().join('|')),
    `${actorId} must not receive a direct Matt Clifford edge`);
}
assert(claimById.has('electric-twin-virgin-madfest-shared-stage-2026-07-08'),
  'MAD//Fest shared-stage claim is missing');
assert(claimById.has('electric-twin-virgin-madfest-identity-and-contract-boundary-2026-07-08'),
  'MAD//Fest identity and contract boundary claim is missing');

if (errors.length) {
  console.error('validate-release failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`validate-release: ${warnings.length} warning(s):`);
  for (const warn of warnings) console.warn(`- ${warn}`);
}

console.log('validate-release: OK');
console.log(`  surfaces: ${data.surfaces.length}`);
console.log(`  hop edges: ${hopGraph.edges.length}`);
console.log(`  master rows classified: ${migration.total_rows}`);


// Matt Clifford × Anduril exact-event and procurement-boundary release contract.
const andurilOrganization = orgScore.get('anduril-industries');
assert(andurilOrganization, 'Anduril Industries source-scoped organization is missing');
const cliffordSummitAppointment = surfaceById.get('ai-safety-summit-representative-appointment-2023-08-10');
const andurilSummitRoundtable = surfaceById.get('dsit-techuk-anduril-ai-safety-roundtable-2023-10-17');
const cliffordInvestorRoundtable = surfaceById.get('dsit-matt-clifford-ai-investor-roundtable-2023-10-25');
const andurilTalosObservation = surfaceById.get('anduril-talos-phase-3-contract-observation-2023-11-02');
for (const row of [cliffordSummitAppointment, andurilSummitRoundtable, cliffordInvestorRoundtable, andurilTalosObservation]) {
  assert(row, 'Clifford-Anduril boundary surface is missing');
  assert(row?.hop_eligible === false, `${row?.surface_id} must remain non-hop`);
  assert((hopGraph.rejected_hop_surfaces ?? []).some(rejection => rejection.surface_id === row?.surface_id),
    `${row?.surface_id} refusal must remain public`);
  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === row?.surface_id)),
    `${row?.surface_id} must never become a hop basis`);
}
assert(cliffordSummitAppointment?.hop_refusal_reason === 'single_actor_appointment_context',
  'Clifford summit appointment refusal reason drift');
assert(andurilSummitRoundtable?.hop_refusal_reason === 'organization_only_multi_party_roundtable',
  'Anduril summit roundtable refusal reason drift');
assert(andurilSummitRoundtable?.time_start === '2023-10-17' && andurilSummitRoundtable?.time_end === '2023-10-17',
  'Anduril summit roundtable must remain one-day bounded');
assert(andurilSummitRoundtable?.roster_entry_count === 16,
  'Anduril summit roundtable source roster denominator drift');
const andurilRoundtableParts = sourcePartsBySurface.get(andurilSummitRoundtable?.surface_id) ?? [];
assert(andurilRoundtableParts.filter(part => part.participant_type === 'actor').length === 0,
  'Anduril summit roundtable must not manufacture a natural-person endpoint');
assert(sameIdSet(andurilRoundtableParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['anduril-industries','dsit']),
  'Anduril summit roundtable scoped organization set drift');
assert(cliffordInvestorRoundtable?.hop_refusal_reason === 'single_actor_multi_party_roundtable',
  'Clifford investor roundtable refusal reason drift');
const cliffordRoundtableParts = sourcePartsBySurface.get(cliffordInvestorRoundtable?.surface_id) ?? [];
assert(sameIdSet(cliffordRoundtableParts.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['matt-clifford']),
  'Clifford investor roundtable actor set drift');
assert(!cliffordRoundtableParts.some(part => part.organization_id === 'anduril-industries'),
  'Anduril must not be projected into Clifford’s separate roundtable');
assert(andurilTalosObservation?.hop_refusal_reason === 'organization_only_procurement_instrument',
  'TALOS organization-only refusal reason drift');
const andurilTalosParts = sourcePartsBySurface.get(andurilTalosObservation?.surface_id) ?? [];
assert(andurilTalosParts.filter(part => part.participant_type === 'actor').length === 0,
  'TALOS observation must not manufacture actor participation');
assert(sameIdSet(andurilTalosParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['anduril-industries','mod']),
  'TALOS organization set drift');
const andurilMeetingReceipt = receiptById.get('gov-dsit-clifford-anduril-separate-summit-roundtables-2023-10-17-25');
const cliffordAppointmentReceipt = receiptById.get('gov-matt-clifford-ai-safety-summit-representative-2023-08-10');
const andurilTalosReceipt = receiptById.get('gov-mod-anduril-talos-phase-3-contract-2023-11-02');
assert(andurilMeetingReceipt?.same_recorded_event === false, 'separate DSIT event boundary drift');
assert(andurilMeetingReceipt?.archive?.ref === 'sha256:6319116d831d2edd8356e3f9b73acb49399acddc5ff79632917429896fa04203', 'DSIT meeting-register receipt digest drift');
assert(cliffordAppointmentReceipt?.anduril_named === false, 'Clifford appointment receipt must not name Anduril');
assert(cliffordAppointmentReceipt?.archive?.ref === 'sha256:3f49abb5313850e2e79477225c38ce34956c42ddec30519147e0a8fde331cfd2', 'Clifford appointment receipt digest drift');
assert(andurilTalosReceipt?.matt_clifford_named === false, 'TALOS receipt must not name Matt Clifford');
assert(andurilTalosReceipt?.archive?.ref === 'sha256:6660b2890c6756ad9016bf2d4b90d4a132a32f01c22a9ea1b55cc1c436da876a', 'TALOS receipt digest drift');
const cliffordAndurilMeetingBoundary = claimById.get('matt-clifford-anduril-separate-summit-events-boundary-2026-08-12');
const cliffordAndurilTalosBoundary = claimById.get('matt-clifford-anduril-talos-procurement-boundary-2026-08-12');
assert(cliffordAndurilMeetingBoundary, 'separate Clifford-Anduril summit-event boundary claim is missing');
assert(cliffordAndurilTalosBoundary, 'Clifford-Anduril TALOS boundary claim is missing');
assert(sameIdSet(cliffordAndurilMeetingBoundary?.actor_ids, ['matt-clifford']),
  'Clifford-Anduril summit boundary actor set drift');
assert((cliffordAndurilMeetingBoundary?.organization_ids ?? []).includes('anduril-industries'),
  'Clifford-Anduril summit boundary must identify Anduril organization context');
assert(!hopGraph.edges.some(edge => [edge.actor_a, edge.actor_b].includes('matt-clifford')
  && edge.surfaces.some(basis => basis.surface_id.includes('anduril'))),
  'Anduril organization context must not manufacture a Matt Clifford actor edge');


// Frontier AI Taskforce External Advisory Board exact appointment release contract.
{
  const frontierBoard = surfaceById.get('frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07');
  const frontierBoardActors = ["matt-clifford","yoshua-bengio","anne-keast-butler","alex-van-someren","matt-collins-national-security","paul-christiano","helen-stokes-lampard"].sort();
  assert(frontierBoard?.hop_eligible === true,
    'Frontier AI Taskforce board appointment surface must remain hop eligible');
  assert(frontierBoard?.surface_type === 'board_advisory_surface',
    'Frontier AI Taskforce board appointment surface type drift');
  assert(frontierBoard?.evidence_class === 'official',
    'Frontier AI Taskforce board appointment evidence drift');
  assert(frontierBoard?.time_start === '2023-09-07' && frontierBoard?.time_end === '2023-09-07',
    'Frontier AI Taskforce board appointment must remain one day');
  assert(frontierBoard?.roster_entry_count === 7,
    'Frontier AI Taskforce board roster denominator drift');
  const frontierBoardParts = sourcePartsBySurface.get('frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07') ?? [];
  assert(sameIdSet(
    frontierBoardParts.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
    frontierBoardActors,
  ), 'Frontier AI Taskforce board actor denominator drift');
  assert(sameIdSet(
    frontierBoardParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
    ['aisi', 'dsit'],
  ), 'Frontier AI Taskforce board organization denominator drift');
  assert(frontierBoardParts.find(part => part.actor_id === 'matt-clifford')?.participation_type
    === 'external_advisory_board_vice_chair_appointment',
    'Matt Clifford board vice-chair role drift');
  const frontierBoardEdges = hopGraph.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07'));
  assert(frontierBoardEdges.length === 21,
    'seven Frontier AI Taskforce board appointees must compile twenty-one bases');
  assert(frontierBoardEdges.every(edge => edge.surfaces.some(basis =>
    basis.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07'
      && basis.valid_from === '2023-09-07'
      && basis.valid_until === '2023-09-07'
      && basis.evidence_class === 'official')),
    'every Frontier AI Taskforce board basis must remain exact-date and official');
  for (const actorId of frontierBoardActors.filter(id => id !== 'matt-clifford')) {
    assert(data.actors.some(row => row.id === actorId), 'missing Frontier AI Taskforce actor ' + actorId);
    assert(hopGraph.edges.some(edge =>
      [edge.actor_a, edge.actor_b].sort().join('|') === [actorId, 'matt-clifford'].sort().join('|')
        && edge.surfaces.some(basis => basis.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07')),
      actorId + ' must retain a direct board-appointment basis to Matt Clifford');
  }
  assert(!frontierBoardParts.some(part => ['ian-hogarth', 'yarin-gal', 'david-kreuger'].includes(part.actor_id)),
    'non-board roles must remain outside the seven-person board cohort');
  const frontierBoardReceipt = receiptById.get('gov-frontier-ai-taskforce-external-advisory-board-2023-09-07');
  assert(frontierBoardReceipt?.archive?.ref
    === 'sha256:be863ec337a09a6f695bc5905a44cd811022ca3b15931bcaed74fbeec943576e',
    'Frontier AI Taskforce board receipt digest drift');
  assert(sameIdSet(frontierBoardReceipt?.board_member_actor_ids, frontierBoardActors),
    'Frontier AI Taskforce board receipt actor denominator drift');
  assert(frontierBoardReceipt?.board_member_count === 7,
    'Frontier AI Taskforce board receipt count drift');
  assert(frontierBoardReceipt?.vice_chair_actor_id === 'matt-clifford',
    'Frontier AI Taskforce vice-chair identity drift');
  assert(frontierBoardReceipt?.members_join_as_individuals === true,
    'Frontier AI Taskforce board must remain individual rather than employer representation');
  assert(frontierBoardReceipt?.active_contribution_to_all_meetings_stated === true,
    'Frontier AI Taskforce board terms contribution field drift');
  assert(frontierBoardReceipt?.first_meeting_date_established === false,
    'Frontier AI Taskforce receipt must not invent a first meeting date');
  assert(frontierBoardReceipt?.continuous_tenure_established === false,
    'Frontier AI Taskforce receipt must not invent continuous tenure');
  assert(frontierBoardReceipt?.employer_representation_established === false,
    'Frontier AI Taskforce receipt must not convert employers into board participants');
  assert(frontierBoardReceipt?.procurement_participation_established === false,
    'Frontier AI Taskforce receipt must not invent procurement participation');
  const frontierBoardClaim = claimById.get('frontier-ai-taskforce-external-advisory-board-cohort-2023-09-07');
  assert(frontierBoardClaim, 'Frontier AI Taskforce board cohort claim is missing');
  assert(sameIdSet(frontierBoardClaim?.actor_ids, frontierBoardActors),
    'Frontier AI Taskforce claim actor denominator drift');
  assert(sameIdSet(frontierBoardClaim?.organization_ids, ['aisi', 'dsit']),
    'Frontier AI Taskforce claim organization denominator drift');
}
