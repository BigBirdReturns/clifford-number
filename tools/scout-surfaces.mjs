#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, loadAll, uniq } from './lib/ledger.mjs';

const data = loadAll();
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const scores = readJson('build/scores.json');
const migration = fs.existsSync(path.join(root, 'build/migration-summary.json')) ? readJson('build/migration-summary.json') : null;
const broadInstitutionReviews = readJson('data/research/broad-institution-surface-reviews.json');

function sorted(values) {
  return [...values].sort();
}

function assertExactIds(actual, expected, label) {
  const actualIds = sorted(actual);
  const expectedIds = sorted(expected);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`${label}: expected ${expectedIds.join(', ')}, found ${actualIds.join(', ')}`);
  }
}

function validateBroadInstitutionReviews(registry) {
  if (registry.schema_version !== 'broad-institution-surface-reviews@1') {
    throw new Error(`unsupported broad-institution review schema: ${registry.schema_version}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(registry.registry_created_at ?? '')) {
    throw new Error('broad-institution review registry requires registry_created_at as YYYY-MM-DD');
  }
  if (registry.graph_effect !== 'none') {
    throw new Error('broad-institution review registry must carry graph_effect none');
  }
  if (!Array.isArray(registry.reviews) || !registry.reviews.length) {
    throw new Error('broad-institution review registry must contain reviews');
  }

  const surfaceById = new Map(surfaceGraph.surfaces.map(surface => [surface.surface_id, surface]));
  const canonicalBroadOrgIds = new Set(data.organizations
    .filter(organization => organization.broad_institution)
    .map(organization => organization.id));
  const reviewedSurfaceIds = new Set();

  for (const review of registry.reviews) {
    const label = `broad-institution review ${review.surface_id}`;
    if (!review.surface_id || reviewedSurfaceIds.has(review.surface_id)) {
      throw new Error(`${label}: missing or duplicate surface_id`);
    }
    if (!Number.isInteger(review.source_issue) || review.source_issue < 1) {
      throw new Error(`${label}: source_issue must be a positive issue number`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewed_at ?? '')) {
      throw new Error(`${label}: reviewed_at must use YYYY-MM-DD`);
    }
    if (review.graph_effect !== 'none') {
      throw new Error(`${label}: graph_effect must be none`);
    }
    if (review.status !== 'verified_named_actor_surface') {
      throw new Error(`${label}: unsupported status ${review.status}`);
    }
    if (review.decision !== 'retain_hop_eligible') {
      throw new Error(`${label}: unsupported decision ${review.decision}`);
    }
    if (review.required_bounds !== 'exact_one_day') {
      throw new Error(`${label}: required_bounds must be exact_one_day`);
    }
    if (review.required_actor_receipt_scope !== 'direct_source_named') {
      throw new Error(`${label}: required_actor_receipt_scope must be direct_source_named`);
    }
    if (!/^[a-f0-9]{20}$/.test(review.finding_fingerprint ?? '')) {
      throw new Error(`${label}: finding_fingerprint must be a 20-character lowercase hex digest`);
    }
    if (!Array.isArray(review.expected_actor_ids) || review.expected_actor_ids.length < 2) {
      throw new Error(`${label}: expected_actor_ids must contain at least two actors`);
    }
    if (uniq(review.expected_actor_ids).length !== review.expected_actor_ids.length) {
      throw new Error(`${label}: expected_actor_ids contains duplicates`);
    }
    if (!Array.isArray(review.expected_broad_organization_ids)
      || !review.expected_broad_organization_ids.length) {
      throw new Error(`${label}: expected_broad_organization_ids must not be empty`);
    }
    if (uniq(review.expected_broad_organization_ids).length
      !== review.expected_broad_organization_ids.length) {
      throw new Error(`${label}: expected_broad_organization_ids contains duplicates`);
    }

    const surface = surfaceById.get(review.surface_id);
    if (!surface) throw new Error(`${label}: surface does not exist`);
    if (!surface.hop_eligible) throw new Error(`${label}: reviewed surface is no longer hop eligible`);
    if (!surface.time_start || surface.time_start !== surface.time_end) {
      throw new Error(`${label}: reviewed surface must remain an exact one-day object`);
    }
    if (!(surface.receipt_ids ?? []).length) {
      throw new Error(`${label}: reviewed surface lacks direct receipt coverage`);
    }

    const actorParticipants = (surface.participants ?? [])
      .filter(participant => participant.participant_type === 'actor');
    const broadOrganizationParticipants = (surface.participants ?? [])
      .filter(participant => participant.participant_type === 'organization')
      .filter(participant => canonicalBroadOrgIds.has(participant.organization_id));

    assertExactIds(
      actorParticipants.map(participant => participant.actor_id),
      review.expected_actor_ids,
      `${label} actor roster`,
    );
    assertExactIds(
      broadOrganizationParticipants.map(participant => participant.organization_id),
      review.expected_broad_organization_ids,
      `${label} broad-organization roster`,
    );

    const surfaceReceiptIds = new Set(surface.receipt_ids ?? []);
    for (const participant of actorParticipants) {
      const participantReceiptIds = participant.receipt_ids ?? [];
      if (!participantReceiptIds.length) {
        throw new Error(`${label}: actor ${participant.actor_id} lacks a direct receipt`);
      }
      if (!participantReceiptIds.some(receiptId => surfaceReceiptIds.has(receiptId))) {
        throw new Error(`${label}: actor ${participant.actor_id} has no receipt on the reviewed surface object`);
      }
      if (participant.evidence_class !== 'official') {
        throw new Error(`${label}: actor ${participant.actor_id} is not supported by official evidence`);
      }
      if (participant.time_start !== surface.time_start || participant.time_end !== surface.time_end) {
        throw new Error(`${label}: actor ${participant.actor_id} is not bounded to the reviewed one-day object`);
      }
    }

    reviewedSurfaceIds.add(review.surface_id);
  }

  return reviewedSurfaceIds;
}

const reviewedBroadInstitutionSurfaceIds = validateBroadInstitutionReviews(broadInstitutionReviews);
const findings = [];
function add(type, priority, title, observed, action, refs = []) {
  findings.push({ id: `finding-${String(findings.length + 1).padStart(3, '0')}`, type, priority, title, observed, action, graph_effect: 'none', refs });
}

for (const org of scores.organizations.filter(o => o.surface_factory || o.surface_count >= 3)) {
  const hasSurfaces = org.surface_count > 0;
  add(
    'surface_factory',
    org.organization_id === 'electric-twin' ? 'high' : 'medium',
    hasSurfaces ? `${org.label} behaves as a surface factory` : `${org.label} is marked as a surface factory but has not been decomposed yet`,
    hasSurfaces
      ? `${org.label} appears across ${org.surface_count} surface(s): ${org.surfaces.join(', ')}. Secondary types: ${org.secondary_surface_types.join(', ') || 'none'}.`
      : `${org.label} is a known factory candidate in canonical data, but no bounded surfaces have been added to the ledger yet.`,
    'Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.',
    org.surfaces,
  );
}

for (const actor of scores.actors.filter(a => a.governance_replacement_score > 0 || a.recurrence_score > 0)) {
  add(
    'surface_type_recurrence',
    actor.actor_id === 'ben-warner' ? 'high' : 'medium',
    `${actor.label} shows recurring surface logic`,
    `${actor.label} has ${actor.surface_density} surfaces and secondary types ${actor.secondary_surface_types.join(', ')}. Governance replacement score: ${actor.governance_replacement_score}.`,
    'Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.',
    actor.surfaces,
  );
}

for (const [actorId, pathObj] of Object.entries(hopGraph.shortest_paths)) {
  if (actorId === 'matt-clifford') continue;
  if (pathObj.number === null) {
    const actor = data.actors.find(a => a.id === actorId);
    const actorScore = scores.actors.find(a => a.actor_id === actorId);
    if (actorScore?.surface_density > 0) {
      add(
        'island_with_surfaces',
        'medium',
        `${actor?.label ?? actorId} has surfaces but no Clifford path`,
        `${actor?.label ?? actorId} participates in ${actorScore.surface_density} surface(s), but no valid shared-surface path to Matt Clifford exists.`,
        'Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.',
        actorScore.surfaces,
      );
    }
  }
}

for (const surface of surfaceGraph.surfaces) {
  const broadParticipants = (surface.participants ?? [])
    .filter(participant => participant.participant_type === 'organization')
    .map(participant => data.organizations.find(organization => organization.id === participant.organization_id))
    .filter(organization => organization?.broad_institution);
  if (broadParticipants.length
    && surface.hop_eligible
    && !reviewedBroadInstitutionSurfaceIds.has(surface.surface_id)) {
    add(
      'broad_institution_guard',
      'high',
      `${surface.surface_label} contains broad institution context`,
      `Broad venues present: ${broadParticipants.map(organization => organization.label).join(', ')}. This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.`,
      'Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.',
      [surface.surface_id],
    );
  }
}

for (const chain of (scores.chains ?? [])) {
  add(
    'laundering_chain',
    'high',
    `${chain.chain_label} is a scored laundering chain with no Clifford hop`,
    `Chain spans ${chain.laundering_chain_score}/${chain.laundering_chain_max} stage categories (${chain.stage_categories.join(', ')}); machine_score ${chain.machine_score}; weakest evidence ${chain.evidence_class}. It does not create a Clifford hop.`,
    'Strengthen the weakest stage receipts (e.g. confirm procurement award IDs/amounts/dates) before any UI weight upgrade. Never convert a chain into a hop without a bounded shared-participation surface.',
    chain.surfaces,
  );
}

if (migration) {
  add(
    'migration_queue',
    'high',
    'Full master doc has been classified, not blindly migrated',
    `ingest-master classified ${migration.total_rows} typed rows. Buckets: ${JSON.stringify(migration.bucket_counts)}.`,
    'Review build/migration-review.md and promote rows into surfaces/participation ledgers only when boundedness is explicit.',
    ['build/migration-review.md'],
  );
}

const generated = new Date().toISOString();
const broadInstitutionReviewSummary = {
  schema_version: broadInstitutionReviews.schema_version,
  registry_created_at: broadInstitutionReviews.registry_created_at,
  source_issues: [...new Set(broadInstitutionReviews.reviews.map(review => review.source_issue))]
    .sort((a, b) => a - b),
  review_dates: sorted(uniq(broadInstitutionReviews.reviews.map(review => review.reviewed_at))),
  registry_path: 'data/research/broad-institution-surface-reviews.json',
  reviewed_surface_count: reviewedBroadInstitutionSurfaceIds.size,
  reviewed_surface_ids: sorted(reviewedBroadInstitutionSurfaceIds),
  graph_effect: 'none',
};
const md = [
  '# Scout Report',
  '',
  `Generated: ${generated}`,
  '',
  '> graph_effect: none. This is a research queue, not graph data.',
  '',
  `Broad-institution reviews: ${reviewedBroadInstitutionSurfaceIds.size}`,
  '',
  `Findings: ${findings.length}`,
  '',
  ...findings.map(f => [
    `## ${f.id}: ${f.title}`,
    '',
    `- Type: ${f.type}`,
    `- Priority: ${f.priority}`,
    `- graph_effect: ${f.graph_effect}`,
    '',
    '**Observed**',
    '',
    f.observed,
    '',
    '**Required action**',
    '',
    f.action,
    '',
    f.refs?.length ? `Refs: ${f.refs.map(r => `\`${r}\``).join(', ')}` : '',
    '',
    '---',
    '',
  ].join('\n'))
].join('\n');

fs.writeFileSync(path.join(root, 'build/scout-report.md'), md + '\n');
fs.writeFileSync(path.join(root, 'build/scout-report.json'), JSON.stringify({
  generated,
  graph_effect: 'none',
  broad_institution_reviews: broadInstitutionReviewSummary,
  findings,
}, null, 2) + '\n');
console.log(`scout-surfaces: ${findings.length} findings; ${reviewedBroadInstitutionSurfaceIds.size} reviewed broad-institution surfaces.`);
