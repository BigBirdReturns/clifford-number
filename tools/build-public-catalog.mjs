#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root, writeJson } from './lib/ledger.mjs';
import {
  loadLocalCanonicalResolutionIndex,
  resolveSubjectIdentity,
  summarizeSubjectIdentities
} from './lib/local-canonical-resolution.mjs';

const UK_AI_CASE_ID = 'uk-ai-policy';
const UK_AI_CASE_HREF = `build/cases/${UK_AI_CASE_ID}.json`;

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeReceipt(receipt) {
  const archiveRef = receipt.archive?.ref;
  return {
    receipt_id: receipt.receipt_id ?? receipt.id,
    label: receipt.label ?? receipt.title ?? receipt.receipt_id ?? receipt.id,
    publisher: receipt.publisher,
    source_type: receipt.source_type,
    evidence_class: receipt.evidence_class,
    url: receipt.url ?? receipt.path,
    archive_url: typeof archiveRef === 'string' && /^https?:\/\//.test(archiveRef) ? archiveRef : undefined,
    notes: receipt.notes
  };
}

function claimStatusForEvidence(evidenceClass) {
  return ['official', 'confirmed'].includes(evidenceClass) ? 'verified' : 'review_required';
}

function compileUkAiPolicyCase(subjectIdentityIndex) {
  const legacy = readJson('cases/uk-ai-policy.json');
  const wrapUp = readJson('data/research/clifford-thiel-trump-wrap-up.json');
  const receiptGraph = readJson('build/receipt-graph.json');
  const nodeById = new Map((legacy.nodes ?? []).map(node => [node.id, node]));
  const receiptById = new Map();

  for (const source of legacy.sources ?? []) {
    const receipt = normalizeReceipt(source);
    receiptById.set(receipt.receipt_id, receipt);
  }
  for (const source of receiptGraph.receipts ?? []) {
    const receipt = normalizeReceipt(source);
    if (receipt.receipt_id) receiptById.set(receipt.receipt_id, receipt);
  }

  const leadOutcome = (wrapUp.surviving_outcomes ?? []).find(item => item.outcome_id === 'clifford-starmer-action-plan');
  if (!leadOutcome) throw new Error('UK AI projection requires the Clifford-Starmer action-plan outcome');

  function attachReceipts(receiptIds) {
    return (receiptIds ?? []).map(receiptId => {
      const receipt = receiptById.get(receiptId);
      if (!receipt) throw new Error(`UK AI projection cannot resolve receipt ${receiptId}`);
      return receipt;
    });
  }

  const leadClaim = {
    claim_id: `clm-${leadOutcome.outcome_id}`,
    plain: leadOutcome.outcome,
    subject_id: 'matt-clifford',
    subject_identity: resolveSubjectIdentity(UK_AI_CASE_ID, 'matt-clifford', subjectIdentityIndex),
    predicate: 'commissioned_plan_and_adopted_recommendations',
    object: 'keir-starmer',
    claim_kind: 'external_fact',
    evidence_state: 'corroborated',
    evidence_class: 'official',
    claim_status: 'verified',
    causal_status: 'source_explicit',
    receipt_ids: leadOutcome.receipt_ids,
    qualification: 'This establishes the documented commission, announced policy adoption, and adviser role. It does not establish improper influence, private coordination, or wrongdoing.',
    receipts: attachReceipts(leadOutcome.receipt_ids)
  };
  const leadEvent = {
    event_id: `evt-${leadOutcome.outcome_id}`,
    event_type: 'official_policy_record',
    label: 'The government commissions Clifford, adopts the Action Plan, and names him adviser',
    occurred_at: '2024-07-26 to 2025-01-13',
    claim_ids: [leadClaim.claim_id],
    claims: [leadClaim]
  };

  const edgeEvents = (legacy.edges ?? []).map(edge => {
    const fromLabel = nodeById.get(edge.from)?.label ?? edge.from;
    const toLabel = nodeById.get(edge.to)?.label ?? edge.to;
    const claimStatus = claimStatusForEvidence(edge.evidence_class);
    const claim = {
      claim_id: `clm-${edge.id}`,
      plain: edge.claim,
      subject_id: edge.from,
      subject_identity: resolveSubjectIdentity(UK_AI_CASE_ID, edge.from, subjectIdentityIndex),
      predicate: edge.type,
      object: edge.to,
      claim_kind: 'external_fact',
      evidence_state: claimStatus === 'verified' ? 'corroborated' : edge.evidence_class,
      evidence_class: edge.evidence_class,
      claim_status: claimStatus,
      causal_status: 'not_established',
      receipt_ids: edge.source_ids ?? [],
      qualification: [edge.status ? `Source graph status: ${edge.status}.` : '', edge.notes ?? ''].filter(Boolean).join(' '),
      receipts: attachReceipts(edge.source_ids)
    };
    return {
      event_id: `evt-${edge.id}`,
      event_type: edge.type,
      label: `${fromLabel} → ${toLabel}`,
      occurred_at: edge.date ?? 'Date not recorded in source graph',
      claim_ids: [claim.claim_id],
      claims: [claim]
    };
  });

  const sectionSpecs = [
    {
      id: 'start-here',
      label: 'Start here: the official policy route',
      records: [leadEvent]
    },
    {
      id: 'official-confirmed',
      label: 'Official and confirmed records',
      records: edgeEvents.filter(event => ['official', 'confirmed'].includes(event.claims[0].evidence_class))
    },
    {
      id: 'primary-public',
      label: 'Primary public records requiring review',
      records: edgeEvents.filter(event => event.claims[0].evidence_class === 'primary_public')
    },
    {
      id: 'reported-derived',
      label: 'Reported and derived context',
      records: edgeEvents.filter(event => !['official', 'confirmed', 'primary_public'].includes(event.claims[0].evidence_class))
    }
  ];
  const sections = sectionSpecs.filter(section => section.records.length > 0).map(section => ({
    ...section,
    record_ids: section.records.map(event => event.event_id)
  }));
  const events = sections.flatMap(section => section.records);
  const claims = events.flatMap(event => event.claims);
  const subjectIdentityProjection = summarizeSubjectIdentities(claims, {
    caseId: UK_AI_CASE_ID,
    registryPaths: subjectIdentityIndex.registry_paths
  });
  const usedReceiptIds = new Set(claims.flatMap(claim => claim.receipt_ids));
  const receipts = [...usedReceiptIds].map(receiptId => receiptById.get(receiptId));
  const claimStatusCounts = {
    verified: claims.filter(claim => claim.claim_status === 'verified').length,
    review_required: claims.filter(claim => claim.claim_status === 'review_required').length,
    disputed: 0,
    superseded: 0,
    rejected: 0
  };
  const output = {
    schema_version: 'case-ledger@1',
    projection_version: 'legacy-uk-ai-policy@1',
    case_id: UK_AI_CASE_ID,
    tracking_id: 'CN-UK-AI-2026-0629',
    title: legacy.title,
    subtitle: legacy.subtitle,
    tagline: legacy.tagline,
    as_of: legacy.generated,
    status: 'review_required',
    featured_priority: 100,
    presentation: 'research_graph_projection',
    source_artifact: 'cases/uk-ai-policy.json',
    source_status: legacy.status,
    source_counts: {
      nodes: legacy.nodes?.length ?? 0,
      edges: legacy.edges?.length ?? 0,
      sources: legacy.sources?.length ?? 0
    },
    scope: 'A public-record map of the people, institutions, policy objects, appointments, directories, and reported relationships surrounding the UK AI Opportunities Action Plan. The graph is preserved as research evidence; the official Clifford-to-Starmer policy route is promoted as the plain-language entry point.',
    boundary: 'This is a bounded projection of the legacy UK AI research graph into the public case interface. Official and confirmed records are marked verified; primary-public, reported, and derived graph edges remain review-required. Listed, registered, attended, appointed, published, and reported remain separate states.',
    disclaimer: legacy.disclaimer,
    counts: {
      events: events.length,
      claims: claims.length,
      sequenced_claims: claims.length,
      unsequenced_claims: 0,
      receipts: receipts.length,
      relations: 0,
      beacons: 0,
      trails: 0,
      ...subjectIdentityProjection.counts
    },
    claim_status_counts: claimStatusCounts,
    subject_identity_projection: subjectIdentityProjection,
    sections,
    claims,
    unsequenced_claim_ids: [],
    events,
    relations: [],
    receipts,
    beacons: [],
    trails: []
  };
  writeJson(UK_AI_CASE_HREF, output);
  return {
    case_id: output.case_id,
    tracking_id: output.tracking_id,
    title: output.title,
    subtitle: output.subtitle,
    as_of: output.as_of,
    status: output.status,
    featured_priority: output.featured_priority,
    source_counts: output.source_counts,
    counts: output.counts,
    subject_identity_counts: output.subject_identity_projection.counts,
    claim_status_counts: output.claim_status_counts,
    href: UK_AI_CASE_HREF
  };
}

function allCaseClaims(caseItem) {
  if (Array.isArray(caseItem.claims) && caseItem.claims.length > 0) return caseItem.claims;
  return (caseItem.events ?? []).flatMap(event => event.claims ?? []);
}

function eventContextByClaimId(caseItem) {
  const contexts = new Map();
  for (const event of caseItem.events ?? []) {
    for (const claim of event.claims ?? []) {
      contexts.set(claim.claim_id, { label: event.label, occurred_at: event.occurred_at });
    }
  }
  return contexts;
}

function unsequencedOccurredAt(claim) {
  if (claim.valid_from && claim.valid_until && claim.valid_from !== claim.valid_until) return `${claim.valid_from} to ${claim.valid_until}`;
  return claim.valid_from || claim.valid_until || 'Not assigned to a dated event';
}

function firstVerifiedClaim(caseItem) {
  for (const section of caseItem.sections ?? []) {
    for (const event of section.records ?? []) {
      const claim = (event.claims ?? []).find(item => item.claim_status === 'verified');
      if (claim) return { claim, event };
    }
  }
  const claim = allCaseClaims(caseItem).find(item => item.claim_status === 'verified');
  return claim ? { claim, event: null } : null;
}

function subjectCatalogKey(caseItem, identity) {
  return identity.canonical_subject_id
    ? `canonical:${identity.canonical_subject_id}`
    : `local:${caseItem.case_id}::${identity.local_subject_id}`;
}

function addSubjectReference(subjects, caseItem, claim, claimKey) {
  const identity = claim.subject_identity;
  if (!identity) throw new Error(`${claimKey}: compiled claim lacks subject_identity`);
  const key = subjectCatalogKey(caseItem, identity);
  const existing = subjects.get(key) ?? {
    key,
    canonical_subject_id: identity.canonical_subject_id,
    canonical_kind: identity.canonical_kind,
    canonical_label: identity.canonical_label,
    resolution_status: identity.resolution_status,
    local_subjects: [],
    case_ids: [],
    claim_ids: [],
    search_keys: [],
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
  if (existing.canonical_subject_id !== identity.canonical_subject_id || existing.canonical_kind !== identity.canonical_kind) {
    throw new Error(`${key}: inconsistent catalog subject identity`);
  }
  const localKey = `${caseItem.case_id}\0${identity.local_subject_id}`;
  if (!existing.local_subjects.some(item => `${item.case_id}\0${item.local_subject_id}` === localKey)) {
    existing.local_subjects.push({
      case_id: caseItem.case_id,
      local_subject_id: identity.local_subject_id,
      resolution_id: identity.resolution_id,
      resolution_status: identity.resolution_status
    });
  }
  existing.case_ids = uniqueSorted([...existing.case_ids, caseItem.case_id]);
  existing.claim_ids = uniqueSorted([...existing.claim_ids, claimKey]);
  existing.search_keys = uniqueSorted([...existing.search_keys, ...(identity.search_keys ?? []), identity.local_subject_id]);
  existing.local_subjects.sort((left, right) => `${left.case_id}\0${left.local_subject_id}`.localeCompare(`${right.case_id}\0${right.local_subject_id}`));
  subjects.set(key, existing);
}

function compilePublicCatalog() {
  const caseIndex = readJson('build/cases/index.json');
  const trackIndex = readJson('data/research-tracks/index.json');
  const subjectIdentityIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
  const claims = new Map();
  const receipts = new Map();
  const subjects = new Map();

  const nativeUkAiCase = (caseIndex.cases ?? []).find(entry => entry.case_id === UK_AI_CASE_ID);
  const projectedUkAiCase = nativeUkAiCase ?? compileUkAiPolicyCase(subjectIdentityIndex);

  const cases = [projectedUkAiCase, ...(caseIndex.cases ?? []).filter(entry => entry.case_id !== UK_AI_CASE_ID)].map(entry => {
    const caseItem = readJson(entry.href);
    const eventContexts = eventContextByClaimId(caseItem);
    for (const claim of allCaseClaims(caseItem)) {
      const key = `${caseItem.case_id}::${claim.claim_id}`;
      const event = eventContexts.get(claim.claim_id);
      addSubjectReference(subjects, caseItem, claim, key);
      if (!claims.has(key)) {
        claims.set(key, {
          key,
          case_id: caseItem.case_id,
          case_title: caseItem.title,
          claim_id: claim.claim_id,
          plain: claim.plain,
          subject_id: claim.subject_id,
          subject_identity: claim.subject_identity,
          canonical_subject_id: claim.subject_identity?.canonical_subject_id ?? null,
          subject_search_keys: uniqueSorted(claim.subject_identity?.search_keys ?? [claim.subject_id]),
          claim_status: claim.claim_status,
          evidence_class: claim.evidence_class,
          evidence_state: claim.evidence_state,
          causal_status: claim.causal_status,
          event_label: event?.label ?? 'Unsequenced case claim',
          occurred_at: event?.occurred_at ?? unsequencedOccurredAt(claim),
          receipt_count: claim.receipts?.length ?? 0
        });
      }
      for (const receipt of claim.receipts ?? []) {
        const receiptKey = receipt.receipt_id;
        const existing = receipts.get(receiptKey);
        const claimKeys = new Set(existing?.claim_ids ?? []);
        const caseIds = new Set(existing?.case_ids ?? []);
        claimKeys.add(key);
        caseIds.add(caseItem.case_id);
        receipts.set(receiptKey, {
          key: receiptKey,
          case_id: existing?.case_id ?? caseItem.case_id,
          case_ids: [...caseIds].sort(),
          receipt_id: receipt.receipt_id,
          label: existing?.label || receipt.label || receipt.title || receipt.source_title || receipt.receipt_id,
          publisher: existing?.publisher || receipt.publisher,
          source_type: existing?.source_type || receipt.source_type,
          claim_ids: [...claimKeys].sort()
        });
      }
    }
    const featured = firstVerifiedClaim(caseItem);
    return {
      ...entry,
      source_counts: entry.source_counts ?? caseItem.source_counts,
      subject_identity_counts: entry.subject_identity_counts ?? caseItem.subject_identity_projection?.counts,
      featured_claim: featured ? {
        key: `${caseItem.case_id}::${featured.claim.claim_id}`,
        claim_id: featured.claim.claim_id,
        plain: featured.claim.plain,
        subject_id: featured.claim.subject_id,
        subject_identity: featured.claim.subject_identity,
        claim_status: featured.claim.claim_status,
        evidence_class: featured.claim.evidence_class,
        evidence_state: featured.claim.evidence_state,
        receipt_count: featured.claim.receipts?.length ?? 0
      } : null
    };
  });

  const tracks = (trackIndex.tracks ?? []).map(entry => {
    const href = `data/research-tracks/${entry.track_id}/harness.json`;
    const harness = readJson(href);
    return {
      ...entry,
      question: harness.question,
      coverage_gap_count: (harness.coverage_seed ?? []).filter(item => item.state !== 'complete').length,
      href
    };
  });

  const subjectRows = [...subjects.values()].sort((left, right) => left.key.localeCompare(right.key));
  const claimRows = [...claims.values()];
  const catalog = {
    schema_version: 'public-catalog@1',
    built_by: 'tools/build-public-catalog.mjs',
    subject_identity_projection: {
      schema_version: 'public-catalog-subject-identity@1',
      registry_paths: subjectIdentityIndex.registry_paths,
      scope: 'claim_subject_only',
      graph_effect: 'none'
    },
    counts: {
      tracks: tracks.length,
      cases: cases.length,
      claims: claims.size,
      declared_claims: cases.reduce((total, item) => total + (item.counts?.claims ?? 0), 0),
      receipts: receipts.size,
      subject_references: claimRows.length,
      resolved_subject_references: claimRows.filter(item => item.subject_identity?.resolution_status === 'resolved_local_to_canonical').length,
      unresolved_subject_references: claimRows.filter(item => item.subject_identity?.resolution_status !== 'resolved_local_to_canonical').length,
      subjects: subjectRows.length,
      canonical_subjects: subjectRows.filter(item => item.canonical_subject_id).length
    },
    tracks,
    cases,
    subjects: subjectRows,
    claims: claimRows,
    receipts: [...receipts.values()]
  };
  writeJson('build/public-catalog.json', catalog);
  return catalog;
}

const catalog = compilePublicCatalog();
const fullBytes = [...catalog.cases.map(item => item.href), ...catalog.tracks.map(item => item.href)]
  .reduce((total, file) => total + fs.statSync(path.join(root, file)).size, 0);
const catalogBytes = fs.statSync(path.join(root, 'build/public-catalog.json')).size;
console.log(`public catalog: ${catalog.counts.tracks} tracks, ${catalog.counts.cases} cases, ${catalog.counts.claims} claims, ${catalog.counts.subjects} subjects, ${catalog.counts.receipts} receipts (${catalogBytes} bytes vs ${fullBytes} eager bytes)`);
