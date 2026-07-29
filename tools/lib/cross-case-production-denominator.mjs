import crypto from 'node:crypto';
import { entityId } from './axm-id.mjs';

const DISALLOWED_IDENTITY_EVIDENCE = new Set(['judgment', 'open']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

export function normalizeLocalIdentifier(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normalizeKind(kind, registryType) {
  if (registryType === 'actor') return 'actor';
  if (registryType === 'organization') return 'organization';
  return kind ?? null;
}

function locatorOf(receipt) {
  return receipt?.url ?? receipt?.archive_url ?? null;
}

export function receiptSourceFamily(receipt) {
  const locator = locatorOf(receipt);
  if (!locator) return null;
  try {
    const host = new URL(locator).hostname.toLowerCase().replace(/^www\./, '');
    return host ? `host:${host}` : null;
  } catch {
    return `locator:${normalizeLocalIdentifier(locator)}`;
  }
}

export function buildCanonicalIdentityIndex({ actors = [], organizations = [], aliases = [] }) {
  const byCanonicalId = new Map();
  const tokenOwners = new Map();
  const conflicts = [];

  function addToken(token, canonicalId, source) {
    const normalized = normalizeLocalIdentifier(token);
    if (!normalized) return;
    if (!tokenOwners.has(normalized)) tokenOwners.set(normalized, new Map());
    tokenOwners.get(normalized).set(canonicalId, source);
  }

  for (const actor of actors) {
    if (byCanonicalId.has(actor.id)) conflicts.push({ conflict_type: 'duplicate_canonical_id', canonical_id: actor.id });
    const row = {
      canonical_id: actor.id,
      label: actor.label,
      kind: normalizeKind(actor.kind, 'actor'),
      registry_type: 'actor'
    };
    byCanonicalId.set(actor.id, row);
    addToken(actor.id, actor.id, 'canonical_id');
    addToken(actor.label, actor.id, 'canonical_label');
  }
  for (const organization of organizations) {
    if (byCanonicalId.has(organization.id)) conflicts.push({ conflict_type: 'duplicate_canonical_id', canonical_id: organization.id });
    const row = {
      canonical_id: organization.id,
      label: organization.label,
      kind: normalizeKind(organization.kind, 'organization'),
      registry_type: 'organization'
    };
    byCanonicalId.set(organization.id, row);
    addToken(organization.id, organization.id, 'canonical_id');
    addToken(organization.label, organization.id, 'canonical_label');
  }
  for (const alias of aliases) {
    if (!byCanonicalId.has(alias.canonical_id)) {
      conflicts.push({ conflict_type: 'alias_missing_canonical_id', alias: alias.alias, canonical_id: alias.canonical_id });
      continue;
    }
    addToken(alias.alias, alias.canonical_id, 'canonical_alias');
  }

  for (const [token, owners] of tokenOwners) {
    if (owners.size > 1) {
      conflicts.push({
        conflict_type: 'ambiguous_normalized_identity_token',
        normalized_token: token,
        canonical_ids: [...owners.keys()].sort((left, right) => left.localeCompare(right))
      });
    }
  }

  return { byCanonicalId, tokenOwners, conflicts };
}

export function resolveCanonicalIdentity(rawId, canonicalIndex) {
  const raw = String(rawId ?? '').trim();
  if (!raw) return { status: 'unresolved', raw_id: raw, canonical: null, resolution_source: null };
  if (canonicalIndex.byCanonicalId.has(raw)) {
    return { status: 'resolved', raw_id: raw, canonical: canonicalIndex.byCanonicalId.get(raw), resolution_source: 'exact_canonical_id' };
  }
  const normalized = normalizeLocalIdentifier(raw);
  const owners = canonicalIndex.tokenOwners.get(normalized);
  if (!owners || owners.size === 0) return { status: 'unresolved', raw_id: raw, canonical: null, resolution_source: null };
  if (owners.size > 1) {
    return {
      status: 'ambiguous',
      raw_id: raw,
      canonical: null,
      resolution_source: 'ambiguous_normalized_token',
      candidate_canonical_ids: [...owners.keys()].sort((left, right) => left.localeCompare(right))
    };
  }
  const canonicalId = [...owners.keys()][0];
  return {
    status: 'resolved',
    raw_id: raw,
    canonical: canonicalIndex.byCanonicalId.get(canonicalId),
    resolution_source: owners.get(canonicalId)
  };
}

function collectStructuredEntityReferences(value, canonicalIndex, path = 'object', parentKey = '') {
  const rows = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => rows.push(...collectStructuredEntityReferences(item, canonicalIndex, `${path}[${index}]`, parentKey)));
    return rows;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return rows;
    const exact = canonicalIndex.byCanonicalId.has(value);
    const keySuggestsEntity = /(?:^|_)(?:actor|person|organization|organisation|company|entity|subject|recipient|owner|vendor|customer|agency|institution)_?ids?$/.test(parentKey)
      || /(?:^|_)(?:from|to)_id$/.test(parentKey);
    if (exact || keySuggestsEntity) {
      const resolved = resolveCanonicalIdentity(value, canonicalIndex);
      if (resolved.status !== 'unresolved') rows.push({ raw_id: value, reference_path: path, resolved });
    }
    return rows;
  }
  for (const [key, child] of Object.entries(value)) {
    rows.push(...collectStructuredEntityReferences(child, canonicalIndex, `${path}.${key}`, key));
  }
  return rows;
}

function evidenceRank(value) {
  const order = {
    government_record: 7,
    official: 6,
    primary_public: 5,
    public_filing: 5,
    reported: 4,
    derived: 3,
    judgment: 2,
    open: 1
  };
  return order[value] ?? 0;
}

function strongestEvidence(values) {
  return uniqueSorted(values).sort((left, right) => evidenceRank(right) - evidenceRank(left))[0] ?? null;
}

function occurrenceKey(caseId, resolved, rawId) {
  if (resolved.status === 'resolved') return `${caseId}\0canonical:${resolved.canonical.canonical_id}`;
  return `${caseId}\0local:${normalizeLocalIdentifier(rawId)}`;
}

export function buildCaseEntityOccurrences({ caseId, caseTitle, claims = [], receipts = [], canonicalIndex, sharedIdentityNamespace }) {
  const receiptById = new Map(receipts.map(row => [row.receipt_id, row]));
  const occurrenceByKey = new Map();

  function addReference(rawId, claim, referenceRole, referencePath) {
    const resolved = resolveCanonicalIdentity(rawId, canonicalIndex);
    const key = occurrenceKey(caseId, resolved, rawId);
    if (!occurrenceByKey.has(key)) {
      occurrenceByKey.set(key, {
        case_id: caseId,
        case_title: caseTitle,
        shared_identity_namespace: sharedIdentityNamespace,
        canonical_resolution_status: resolved.status,
        canonical_resolution_sources: new Set(),
        candidate_canonical_ids: new Set(resolved.candidate_canonical_ids ?? []),
        canonical_id: resolved.canonical?.canonical_id ?? null,
        canonical_label: resolved.canonical?.label ?? null,
        canonical_kind: resolved.canonical?.kind ?? null,
        local_identifiers: new Set(),
        normalized_local_identifiers: new Set(),
        reference_roles: new Set(),
        reference_paths: new Set(),
        claim_refs: new Map(),
        receipt_refs: new Map()
      });
    }
    const occurrence = occurrenceByKey.get(key);
    occurrence.local_identifiers.add(String(rawId));
    occurrence.normalized_local_identifiers.add(normalizeLocalIdentifier(rawId));
    occurrence.reference_roles.add(referenceRole);
    occurrence.reference_paths.add(referencePath);
    if (resolved.resolution_source) occurrence.canonical_resolution_sources.add(resolved.resolution_source);
    for (const candidate of resolved.candidate_canonical_ids ?? []) occurrence.candidate_canonical_ids.add(candidate);

    const claimReceipts = (claim.receipt_ids ?? []).map(receiptId => receiptById.get(receiptId)).filter(Boolean);
    const publicReceipts = claimReceipts.filter(receipt => Boolean(locatorOf(receipt)));
    const publicReceiptIds = publicReceipts.map(receipt => receipt.receipt_id);
    const publicFamilies = publicReceipts.map(receiptSourceFamily).filter(Boolean);
    const identityEligible = !DISALLOWED_IDENTITY_EVIDENCE.has(claim.evidence_class)
      && publicReceipts.length > 0
      && !['rejected', 'superseded'].includes(claim.claim_status);
    occurrence.claim_refs.set(`${claim.claim_id}\0${referenceRole}\0${referencePath}`, {
      claim_id: claim.claim_id,
      claim_status: claim.claim_status,
      evidence_class: claim.evidence_class,
      predicate: claim.predicate,
      reference_role: referenceRole,
      reference_path: referencePath,
      receipt_ids: uniqueSorted(claim.receipt_ids),
      public_receipt_ids: uniqueSorted(publicReceiptIds),
      public_source_families: uniqueSorted(publicFamilies),
      identity_eligible: identityEligible
    });
    for (const receipt of claimReceipts) {
      occurrence.receipt_refs.set(receipt.receipt_id, {
        receipt_id: receipt.receipt_id,
        label: receipt.label ?? null,
        publisher: receipt.publisher ?? null,
        source_type: receipt.source_type ?? null,
        evidence_class: receipt.evidence_class ?? null,
        url: receipt.url ?? null,
        archive_url: receipt.archive_url ?? null,
        content_sha256: receipt.content_sha256 ?? null,
        public_locator: locatorOf(receipt),
        source_family: receiptSourceFamily(receipt)
      });
    }
  }

  for (const claim of claims) {
    addReference(claim.subject_id, claim, 'subject', 'subject_id');
    for (const reference of collectStructuredEntityReferences(claim.object, canonicalIndex)) {
      addReference(reference.raw_id, claim, 'structured_object', reference.reference_path);
    }
  }

  const rows = [];
  for (const occurrence of occurrenceByKey.values()) {
    const claimRefs = [...occurrence.claim_refs.values()].sort((left, right) => `${left.claim_id}:${left.reference_path}`.localeCompare(`${right.claim_id}:${right.reference_path}`));
    const receiptRefs = [...occurrence.receipt_refs.values()].sort((left, right) => left.receipt_id.localeCompare(right.receipt_id));
    const publicReceiptIds = uniqueSorted(receiptRefs.filter(row => row.public_locator).map(row => row.receipt_id));
    const publicSourceFamilies = uniqueSorted(receiptRefs.map(row => row.source_family));
    const identityEligibleClaims = claimRefs.filter(row => row.identity_eligible);
    const canonicalResolutionSources = uniqueSorted(occurrence.canonical_resolution_sources);
    const localIdentifiers = uniqueSorted(occurrence.local_identifiers);
    const normalizedLocalIdentifiers = uniqueSorted(occurrence.normalized_local_identifiers);
    rows.push({
      schema_version: 'cross-case-production-entity-occurrence@1',
      occurrence_id: `CCENT-${sha256(Buffer.from(`${caseId}\0${occurrence.canonical_id ?? normalizedLocalIdentifiers.join('|')}`)).slice(0, 24)}`,
      case_id: caseId,
      case_title: caseTitle,
      shared_identity_namespace: sharedIdentityNamespace,
      canonical_resolution_status: occurrence.canonical_resolution_status,
      canonical_resolution_sources: canonicalResolutionSources,
      candidate_canonical_ids: uniqueSorted(occurrence.candidate_canonical_ids),
      canonical_id: occurrence.canonical_id,
      canonical_label: occurrence.canonical_label,
      canonical_kind: occurrence.canonical_kind,
      axm_entity_id: occurrence.canonical_label ? entityId(sharedIdentityNamespace, occurrence.canonical_label) : null,
      local_identifiers: localIdentifiers,
      normalized_local_identifiers: normalizedLocalIdentifiers,
      reference_roles: uniqueSorted(occurrence.reference_roles),
      reference_paths: uniqueSorted(occurrence.reference_paths),
      claim_refs: claimRefs,
      claim_count: new Set(claimRefs.map(row => row.claim_id)).size,
      identity_eligible_claim_count: identityEligibleClaims.length,
      strongest_identity_evidence_class: strongestEvidence(identityEligibleClaims.map(row => row.evidence_class)),
      receipt_refs: receiptRefs,
      receipt_count: receiptRefs.length,
      public_receipt_ids: publicReceiptIds,
      public_receipt_count: publicReceiptIds.length,
      public_source_families: publicSourceFamilies,
      public_source_family_count: publicSourceFamilies.length,
      bilateral_identity_custody_eligible: identityEligibleClaims.length > 0 && publicReceiptIds.length > 0,
      graph_effect: 'none'
    });
  }
  rows.sort((left, right) => `${left.case_id}:${left.canonical_id ?? left.normalized_local_identifiers[0]}`.localeCompare(`${right.case_id}:${right.canonical_id ?? right.normalized_local_identifiers[0]}`));
  return rows;
}

function intersection(left, right) {
  const rightSet = new Set(right ?? []);
  return uniqueSorted((left ?? []).filter(value => rightSet.has(value)));
}

function candidateRules(left, right) {
  const rules = [];
  if (left.canonical_id && left.canonical_id === right.canonical_id) rules.push('same_canonical_id');
  if (left.axm_entity_id && left.axm_entity_id === right.axm_entity_id) rules.push('same_shared_namespace_axm_token');
  if (intersection(left.local_identifiers, right.local_identifiers).length > 0) rules.push('same_exact_local_identifier');
  if (intersection(left.normalized_local_identifiers, right.normalized_local_identifiers).length > 0) rules.push('same_normalized_local_identifier');
  return uniqueSorted(rules);
}

function missingCustodyReason(left, right) {
  const leftOk = left.bilateral_identity_custody_eligible;
  const rightOk = right.bilateral_identity_custody_eligible;
  if (!leftOk && !rightOk) return 'missing_bilateral_public_identity_custody';
  if (!leftOk) return 'missing_left_public_identity_custody';
  if (!rightOk) return 'missing_right_public_identity_custody';
  return null;
}

function buildDecision(left, right, rules, policy) {
  const caseOrder = [left.case_id, right.case_id].sort((a, b) => a.localeCompare(b));
  const ordered = left.case_id === caseOrder[0] ? [left, right] : [right, left];
  const [a, b] = ordered;
  const normalizedOverlap = intersection(a.normalized_local_identifiers, b.normalized_local_identifiers);
  const exactOverlap = intersection(a.local_identifiers, b.local_identifiers);
  const sourceFamilies = uniqueSorted([...a.public_source_families, ...b.public_source_families]);
  const publicReceiptIds = uniqueSorted([...a.public_receipt_ids, ...b.public_receipt_ids]);
  const decisionId = `CCJOIN-${sha256(Buffer.from(`${a.case_id}\0${a.occurrence_id}\0${b.case_id}\0${b.occurrence_id}`)).slice(0, 24)}`;

  let status = 'unresolved';
  let reason = 'candidate_requires_bounded_identity_judgment';
  let confidence = 'candidate_only';
  let identityBridgeKey = null;
  let assertedSameEntity = false;

  const canonicalConflict = a.canonical_id && b.canonical_id && a.canonical_id !== b.canonical_id;
  const kindConflict = a.canonical_kind && b.canonical_kind && a.canonical_kind !== b.canonical_kind;
  const sameCanonical = a.canonical_id && a.canonical_id === b.canonical_id;
  const sameAxm = a.axm_entity_id && a.axm_entity_id === b.axm_entity_id;

  if (canonicalConflict) {
    status = 'rejected';
    reason = sameAxm ? 'shared_axm_token_maps_to_conflicting_canonical_ids' : 'candidate_maps_to_conflicting_canonical_ids';
    confidence = 'rejected_identity_conflict';
  } else if (kindConflict) {
    status = 'rejected';
    reason = 'canonical_kind_conflict';
    confidence = 'rejected_kind_conflict';
  } else if (sameCanonical) {
    const custodyFailure = missingCustodyReason(a, b);
    if (custodyFailure) {
      status = 'unresolved';
      reason = custodyFailure;
      confidence = 'canonical_match_missing_public_custody';
    } else {
      status = 'accepted';
      reason = 'same_canonical_id_with_bilateral_public_identity_custody';
      confidence = sourceFamilies.length >= policy.source_custody.minimum_distinct_source_families_for_independent_corroboration
        ? 'independent_source_family_corroboration'
        : 'bounded_shared_source_family';
      assertedSameEntity = true;
      identityBridgeKey = `AXMPROD-${sha256(Buffer.from(`${policy.shared_identity_namespace}\0${a.canonical_id}\0${a.case_id}\0${b.case_id}`)).slice(0, 24)}`;
    }
  } else if (sameAxm) {
    status = 'unresolved';
    reason = 'shared_axm_token_without_common_canonical_identity';
    confidence = 'label_token_only';
  } else if (exactOverlap.length > 0 || normalizedOverlap.length > 0) {
    status = 'unresolved';
    reason = 'matching_local_identifier_without_canonical_identity';
    confidence = exactOverlap.length > 0 ? 'exact_local_identifier_only' : 'normalized_local_identifier_only';
  }

  return {
    schema_version: 'cross-case-production-join-decision@1',
    decision_id: decisionId,
    status,
    reason,
    confidence,
    asserted_same_entity: assertedSameEntity,
    identity_bridge_key: identityBridgeKey,
    authorized_scope: status === 'accepted' ? 'explicit_source_custodied_graph_inert_identity_resolution_only' : null,
    matching_rules: rules,
    left_case_id: a.case_id,
    left_occurrence_id: a.occurrence_id,
    left_canonical_id: a.canonical_id,
    left_canonical_label: a.canonical_label,
    left_canonical_kind: a.canonical_kind,
    left_axm_entity_id: a.axm_entity_id,
    left_local_identifiers: a.local_identifiers,
    left_public_receipt_ids: a.public_receipt_ids,
    left_public_source_families: a.public_source_families,
    left_identity_eligible_claim_count: a.identity_eligible_claim_count,
    right_case_id: b.case_id,
    right_occurrence_id: b.occurrence_id,
    right_canonical_id: b.canonical_id,
    right_canonical_label: b.canonical_label,
    right_canonical_kind: b.canonical_kind,
    right_axm_entity_id: b.axm_entity_id,
    right_local_identifiers: b.local_identifiers,
    right_public_receipt_ids: b.public_receipt_ids,
    right_public_source_families: b.public_source_families,
    right_identity_eligible_claim_count: b.identity_eligible_claim_count,
    exact_local_identifier_overlap: exactOverlap,
    normalized_local_identifier_overlap: normalizedOverlap,
    combined_public_receipt_ids: publicReceiptIds,
    combined_public_source_families: sourceFamilies,
    distinct_public_source_family_count: sourceFamilies.length,
    independent_source_family_corroboration: sourceFamilies.length >= policy.source_custody.minimum_distinct_source_families_for_independent_corroboration,
    entities_merged: false,
    relationship_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    review_dependency: {
      required_to_decide: false,
      effect: 'later evidence may supersede this bounded judgment but no unspecified reviewer is permission to decide'
    },
    correction_mode: 'append_preserving_supersession',
    graph_effect: 'none'
  };
}

export function compileProductionCrossCaseDenominator({ policy, cases, canonicalActors, canonicalOrganizations, canonicalAliases }) {
  const canonicalIndex = buildCanonicalIdentityIndex({
    actors: canonicalActors,
    organizations: canonicalOrganizations,
    aliases: canonicalAliases
  });
  const caseRows = cases.map(caseItem => {
    const occurrences = buildCaseEntityOccurrences({
      caseId: caseItem.case_id,
      caseTitle: caseItem.title,
      claims: caseItem.claims,
      receipts: caseItem.receipts,
      canonicalIndex,
      sharedIdentityNamespace: policy.shared_identity_namespace
    });
    return { ...caseItem, occurrences };
  }).sort((left, right) => left.case_id.localeCompare(right.case_id));

  const decisions = [];
  const pairDenominator = [];
  for (let i = 0; i < caseRows.length; i++) {
    for (let j = i + 1; j < caseRows.length; j++) {
      const left = caseRows[i];
      const right = caseRows[j];
      const pairDecisions = [];
      for (const leftOccurrence of left.occurrences) {
        for (const rightOccurrence of right.occurrences) {
          const rules = candidateRules(leftOccurrence, rightOccurrence);
          if (!rules.length) continue;
          const decision = buildDecision(leftOccurrence, rightOccurrence, rules, policy);
          pairDecisions.push(decision);
          decisions.push(decision);
        }
      }
      const ruleCounts = Object.fromEntries(policy.candidate_rules.map(rule => [rule, pairDecisions.filter(row => row.matching_rules.includes(rule)).length]));
      pairDenominator.push({
        schema_version: 'cross-case-production-pair-denominator@1',
        pair_id: `CCPAIR-${sha256(Buffer.from(`${left.case_id}\0${right.case_id}`)).slice(0, 20)}`,
        left_case_id: left.case_id,
        left_entity_occurrences: left.occurrences.length,
        right_case_id: right.case_id,
        right_entity_occurrences: right.occurrences.length,
        cartesian_entity_pairs: left.occurrences.length * right.occurrences.length,
        candidate_pairs: pairDecisions.length,
        noncandidate_pairs: left.occurrences.length * right.occurrences.length - pairDecisions.length,
        accepted_decisions: pairDecisions.filter(row => row.status === 'accepted').length,
        accepted_independent_decisions: pairDecisions.filter(row => row.status === 'accepted' && row.independent_source_family_corroboration).length,
        accepted_shared_source_family_decisions: pairDecisions.filter(row => row.status === 'accepted' && !row.independent_source_family_corroboration).length,
        unresolved_decisions: pairDecisions.filter(row => row.status === 'unresolved').length,
        rejected_decisions: pairDecisions.filter(row => row.status === 'rejected').length,
        candidate_rule_counts: ruleCounts,
        denominator_complete_for_current_extraction_rules: true,
        review_dependency: { required_to_decide: false },
        graph_effect: 'none'
      });
    }
  }

  decisions.sort((left, right) => left.decision_id.localeCompare(right.decision_id));
  pairDenominator.sort((left, right) => `${left.left_case_id}:${left.right_case_id}`.localeCompare(`${right.left_case_id}:${right.right_case_id}`));
  const entityRegistry = caseRows.flatMap(row => row.occurrences).sort((left, right) => `${left.case_id}:${left.occurrence_id}`.localeCompare(`${right.case_id}:${right.occurrence_id}`));
  const accepted = decisions.filter(row => row.status === 'accepted');
  const unresolved = decisions.filter(row => row.status === 'unresolved');
  const rejected = decisions.filter(row => row.status === 'rejected');

  return {
    schema_version: 'cross-case-production-denominator-result@1',
    case_ids: caseRows.map(row => row.case_id),
    counts: {
      native_cases: caseRows.length,
      case_pairs: pairDenominator.length,
      entity_occurrences: entityRegistry.length,
      canonical_resolved_occurrences: entityRegistry.filter(row => row.canonical_id).length,
      unresolved_occurrences: entityRegistry.filter(row => !row.canonical_id).length,
      candidate_decisions: decisions.length,
      accepted_decisions: accepted.length,
      accepted_independent_decisions: accepted.filter(row => row.independent_source_family_corroboration).length,
      accepted_shared_source_family_decisions: accepted.filter(row => !row.independent_source_family_corroboration).length,
      unresolved_decisions: unresolved.length,
      rejected_decisions: rejected.length,
      cartesian_entity_pairs: pairDenominator.reduce((total, row) => total + row.cartesian_entity_pairs, 0),
      noncandidate_pairs: pairDenominator.reduce((total, row) => total + row.noncandidate_pairs, 0),
      canonical_index_conflicts: canonicalIndex.conflicts.length
    },
    canonical_index_conflicts: canonicalIndex.conflicts,
    entity_registry: entityRegistry,
    pair_denominator: pairDenominator,
    decisions,
    boundaries: policy.boundaries
  };
}
