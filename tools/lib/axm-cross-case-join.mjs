import crypto from 'node:crypto';
import { claimId, entityId } from './axm-id.mjs';
import { deriveHopEdges } from './hops.mjs';

const AUTHORIZED_SCOPE = 'explicit_source_custodied_graph_inert_identity_resolution_only';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

function sourceCustodyPresent(rows) {
  return Array.isArray(rows)
    && rows.length > 0
    && rows.every(row => typeof row?.source_key === 'string' && row.source_key.length > 0
      && typeof row?.source_path === 'string' && row.source_path.length > 0);
}

function interval(window) {
  return {
    start: window?.valid_from ?? '',
    end: window?.valid_until ?? '\uffff'
  };
}

export function windowsOverlap(leftWindows = [], rightWindows = []) {
  for (const left of leftWindows) {
    const a = interval(left);
    for (const right of rightWindows) {
      const b = interval(right);
      if (a.start <= b.end && b.start <= a.end) return true;
    }
  }
  return false;
}

export function buildFixtureCase(caseSpec) {
  const namespace = caseSpec.identity_namespace;
  if (!namespace) throw new Error(`${caseSpec.case_id}: identity_namespace is required`);

  const entities = (caseSpec.entities ?? []).map(entity => {
    const canonicalToken = entityId(namespace, entity.label);
    const aliasTokens = uniqueSorted((entity.aliases ?? []).map(alias => entityId(namespace, alias)).filter(token => token !== canonicalToken));
    return {
      case_id: caseSpec.case_id,
      identity_namespace: namespace,
      entity_key: entity.entity_key,
      kind: entity.kind,
      label: entity.label,
      aliases: uniqueSorted(entity.aliases),
      axm_entity_id: canonicalToken,
      alias_axm_ids: aliasTokens,
      identity_tokens: uniqueSorted([canonicalToken, ...aliasTokens]),
      source_custody: entity.source_custody ?? []
    };
  }).sort((left, right) => left.entity_key.localeCompare(right.entity_key));

  const entityByKey = new Map();
  const tokenOwners = new Map();
  for (const entity of entities) {
    if (!entity.entity_key) throw new Error(`${caseSpec.case_id}: entity missing entity_key`);
    if (entityByKey.has(entity.entity_key)) throw new Error(`${caseSpec.case_id}: duplicate entity_key ${entity.entity_key}`);
    entityByKey.set(entity.entity_key, entity);
    for (const token of entity.identity_tokens) {
      if (!tokenOwners.has(token)) tokenOwners.set(token, new Set());
      tokenOwners.get(token).add(entity.entity_key);
    }
  }

  const claims = (caseSpec.claims ?? []).map(row => {
    const subject = entityByKey.get(row.subject_entity_key);
    const object = entityByKey.get(row.object_entity_key);
    if (!subject) throw new Error(`${caseSpec.case_id}/${row.claim_key}: missing subject ${row.subject_entity_key}`);
    if (!object) throw new Error(`${caseSpec.case_id}/${row.claim_key}: missing object ${row.object_entity_key}`);
    return {
      case_id: caseSpec.case_id,
      identity_namespace: namespace,
      claim_key: row.claim_key,
      claim_id: claimId(subject.axm_entity_id, row.predicate, object.axm_entity_id, row.object_type),
      subject_entity_key: row.subject_entity_key,
      subject_axm_entity_id: subject.axm_entity_id,
      predicate: row.predicate,
      object_entity_key: row.object_entity_key,
      object_axm_entity_id: object.axm_entity_id,
      object_type: row.object_type,
      windows: row.windows ?? []
    };
  }).sort((left, right) => left.claim_key.localeCompare(right.claim_key));
  const claimByKey = new Map();
  for (const claim of claims) {
    if (!claim.claim_key) throw new Error(`${caseSpec.case_id}: claim missing claim_key`);
    if (claimByKey.has(claim.claim_key)) throw new Error(`${caseSpec.case_id}: duplicate claim_key ${claim.claim_key}`);
    claimByKey.set(claim.claim_key, claim);
  }

  return {
    case_id: caseSpec.case_id,
    identity_namespace: namespace,
    entities,
    claims,
    entityByKey,
    claimByKey,
    tokenOwners
  };
}

function intersectTokens(left, right) {
  const rightTokens = new Set(right.identity_tokens);
  return left.identity_tokens.filter(token => rightTokens.has(token)).sort((a, b) => a.localeCompare(b));
}

function rejectAssertion(assertion, leftCase, leftEntity, rightCase, rightEntity, reason, overlap = []) {
  return {
    schema_version: 'axm-cross-case-join-decision@1',
    row_type: 'join_assertion',
    decision_id: assertion.assertion_id,
    status: 'rejected',
    reason,
    left_case_id: assertion.left_case_id,
    left_entity_key: assertion.left_entity_key,
    left_identity_namespace: leftCase?.identity_namespace ?? null,
    left_axm_entity_id: leftEntity?.axm_entity_id ?? null,
    right_case_id: assertion.right_case_id,
    right_entity_key: assertion.right_entity_key,
    right_identity_namespace: rightCase?.identity_namespace ?? null,
    right_axm_entity_id: rightEntity?.axm_entity_id ?? null,
    overlapping_identity_tokens: overlap,
    assertion_custody: assertion.assertion_custody ?? [],
    explicit_cross_case_identity_resolution_authorized: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}

export function evaluateJoinAssertion(assertion, caseById) {
  const leftCase = caseById.get(assertion.left_case_id);
  const rightCase = caseById.get(assertion.right_case_id);
  if (!leftCase || !rightCase) return rejectAssertion(assertion, leftCase, null, rightCase, null, 'case_not_found');
  const left = leftCase.entityByKey.get(assertion.left_entity_key);
  const right = rightCase.entityByKey.get(assertion.right_entity_key);
  if (!left || !right) return rejectAssertion(assertion, leftCase, left, rightCase, right, 'entity_not_found');
  if (assertion.asserted_same_entity !== true) return rejectAssertion(assertion, leftCase, left, rightCase, right, 'explicit_same_entity_assertion_missing');
  if (!sourceCustodyPresent(left.source_custody) || !sourceCustodyPresent(right.source_custody)) {
    return rejectAssertion(assertion, leftCase, left, rightCase, right, 'missing_entity_source_custody');
  }
  if (!sourceCustodyPresent(assertion.assertion_custody)) {
    return rejectAssertion(assertion, leftCase, left, rightCase, right, 'missing_assertion_custody');
  }
  if (leftCase.identity_namespace !== rightCase.identity_namespace) {
    return rejectAssertion(assertion, leftCase, left, rightCase, right, 'identity_namespace_mismatch');
  }
  const overlap = intersectTokens(left, right);
  if (overlap.length === 0) return rejectAssertion(assertion, leftCase, left, rightCase, right, 'no_declared_token_overlap');

  const ambiguous = overlap.some(token => (leftCase.tokenOwners.get(token)?.size ?? 0) !== 1
    || (rightCase.tokenOwners.get(token)?.size ?? 0) !== 1
    || !leftCase.tokenOwners.get(token)?.has(left.entity_key)
    || !rightCase.tokenOwners.get(token)?.has(right.entity_key));
  if (ambiguous) return rejectAssertion(assertion, leftCase, left, rightCase, right, 'ambiguous_token_overlap', overlap);

  const bridgePreimage = [
    leftCase.identity_namespace,
    ...[`${leftCase.case_id}:${left.entity_key}`, `${rightCase.case_id}:${right.entity_key}`].sort(),
    ...overlap
  ].join('\0');
  return {
    schema_version: 'axm-cross-case-join-decision@1',
    row_type: 'join_assertion',
    decision_id: assertion.assertion_id,
    status: 'accepted',
    reason: 'explicit_unambiguous_token_overlap',
    identity_bridge_key: `AXMBRIDGE-${sha256(Buffer.from(bridgePreimage)).slice(0, 24)}`,
    authorized_scope: AUTHORIZED_SCOPE,
    left_case_id: leftCase.case_id,
    left_entity_key: left.entity_key,
    left_identity_namespace: leftCase.identity_namespace,
    left_axm_entity_id: left.axm_entity_id,
    left_source_custody: left.source_custody,
    right_case_id: rightCase.case_id,
    right_entity_key: right.entity_key,
    right_identity_namespace: rightCase.identity_namespace,
    right_axm_entity_id: right.axm_entity_id,
    right_source_custody: right.source_custody,
    overlapping_identity_tokens: overlap,
    assertion_custody: assertion.assertion_custody,
    entities_merged: false,
    explicit_cross_case_identity_resolution_authorized: true,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    correction_mode: 'append_preserving_supersession',
    graph_effect: 'none'
  };
}

export function evaluateUnassertedControl(control, caseById) {
  const leftCase = caseById.get(control.left_case_id);
  const rightCase = caseById.get(control.right_case_id);
  const left = leftCase?.entityByKey.get(control.left_entity_key);
  const right = rightCase?.entityByKey.get(control.right_entity_key);
  if (!leftCase || !rightCase || !left || !right) throw new Error(`${control.control_id}: unasserted control references missing case or entity`);
  const overlap = leftCase.identity_namespace === rightCase.identity_namespace ? intersectTokens(left, right) : [];
  return {
    schema_version: 'axm-cross-case-join-decision@1',
    row_type: 'unasserted_overlap_control',
    decision_id: control.control_id,
    status: 'rejected',
    reason: 'explicit_assertion_missing',
    left_case_id: leftCase.case_id,
    left_entity_key: left.entity_key,
    right_case_id: rightCase.case_id,
    right_entity_key: right.entity_key,
    same_identity_namespace: leftCase.identity_namespace === rightCase.identity_namespace,
    overlapping_identity_tokens: overlap,
    token_overlap_observed: overlap.length > 0,
    explicit_cross_case_identity_resolution_authorized: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}

export function evaluateTemporalControl(control, caseById) {
  const leftCase = caseById.get(control.left_case_id);
  const rightCase = caseById.get(control.right_case_id);
  const left = leftCase?.claimByKey.get(control.left_claim_key);
  const right = rightCase?.claimByKey.get(control.right_claim_key);
  if (!leftCase || !rightCase || !left || !right) throw new Error(`${control.control_id}: temporal control references missing case or claim`);
  const claimIdentityEqual = left.claim_id === right.claim_id;
  const temporalOverlap = windowsOverlap(left.windows, right.windows);
  return {
    schema_version: 'axm-cross-case-join-decision@1',
    row_type: 'temporal_claim_control',
    decision_id: control.control_id,
    status: 'control_passed',
    left_case_id: leftCase.case_id,
    left_claim_key: left.claim_key,
    left_claim_id: left.claim_id,
    left_windows: left.windows,
    right_case_id: rightCase.case_id,
    right_claim_key: right.claim_key,
    right_claim_id: right.claim_id,
    right_windows: right.windows,
    claim_identity_equal: claimIdentityEqual,
    temporal_overlap: temporalOverlap,
    hop_basis_candidate: claimIdentityEqual && temporalOverlap,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}

export function evaluateHopControls(hopControls) {
  const participationBySurface = new Map();
  for (const row of hopControls.participation ?? []) {
    if (!participationBySurface.has(row.surface_id)) participationBySurface.set(row.surface_id, []);
    participationBySurface.get(row.surface_id).push(row);
  }
  const result = deriveHopEdges({
    surfaces: hopControls.surfaces ?? [],
    participationBySurface,
    broadOrgIds: new Set(hopControls.broad_organization_ids ?? []),
    densityPolicy: hopControls.density_policy,
    receiptById: new Map()
  });
  return jsonSafe({
    schema_version: 'axm-cross-case-hop-controls@1',
    row_type: 'hop_control_summary',
    decision_id: 'fixture-hop-controls',
    status: 'control_passed',
    edges: result.edges,
    rejected_surfaces: result.rejectedHopSurfaces,
    rejected_pairs: result.rejectedHopPairs,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  });
}

export function compileCrossCaseAcceptance(fixture) {
  if (fixture.schema_version !== 'axm-cross-case-acceptance-fixture@1') throw new Error('unsupported cross-case fixture schema');
  const cases = (fixture.cases ?? []).map(buildFixtureCase);
  const caseById = new Map();
  for (const item of cases) {
    if (caseById.has(item.case_id)) throw new Error(`duplicate fixture case_id ${item.case_id}`);
    caseById.set(item.case_id, item);
  }

  const assertionDecisions = (fixture.join_assertions ?? []).map(assertion => evaluateJoinAssertion(assertion, caseById));
  const unassertedDecisions = (fixture.unasserted_overlap_controls ?? []).map(control => evaluateUnassertedControl(control, caseById));
  const temporalDecisions = (fixture.temporal_claim_controls ?? []).map(control => evaluateTemporalControl(control, caseById));
  const hopDecision = evaluateHopControls(fixture.hop_controls ?? {});
  const accepted = assertionDecisions.filter(row => row.status === 'accepted');
  const rejected = assertionDecisions.filter(row => row.status === 'rejected');

  return {
    schema_version: 'axm-cross-case-acceptance-result@1',
    fixture_key: fixture.fixture_key,
    authorized_scope: AUTHORIZED_SCOPE,
    counts: {
      cases: cases.length,
      join_assertions: assertionDecisions.length,
      accepted_join_assertions: accepted.length,
      rejected_join_assertions: rejected.length,
      unasserted_overlap_controls: unassertedDecisions.length,
      temporal_claim_controls: temporalDecisions.length,
      hop_control_edges: hopDecision.edges.length,
      hop_control_rejected_surfaces: hopDecision.rejected_surfaces.length,
      hop_control_rejected_pairs: hopDecision.rejected_pairs.length,
      decision_registry_rows: assertionDecisions.length + unassertedDecisions.length + temporalDecisions.length + 1
    },
    cases: cases.map(item => ({
      case_id: item.case_id,
      identity_namespace: item.identity_namespace,
      entities: item.entities,
      claims: item.claims
    })),
    assertion_decisions: assertionDecisions,
    unasserted_decisions: unassertedDecisions,
    temporal_decisions: temporalDecisions,
    hop_decision: hopDecision,
    explicit_cross_case_identity_resolution_authorized: accepted.length > 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}

export const CROSS_CASE_AUTHORIZED_SCOPE = AUTHORIZED_SCOPE;
