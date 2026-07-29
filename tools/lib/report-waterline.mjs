import { reporterBriefingQueueEntry } from './reporter-briefing.mjs';

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function briefingSubjectProjection(manifest, caseItem) {
  const claimById = new Map((caseItem?.claims ?? []).map(claim => [claim.claim_id, claim]));
  const selectedClaims = (manifest.claim_ids ?? []).map(claimId => {
    const claim = claimById.get(claimId);
    if (!claim) throw new Error(`briefing subject projection cannot resolve claim ${claimId}`);
    if (!claim.subject_identity) throw new Error(`briefing claim ${claimId} lacks subject_identity projection`);
    return claim;
  });
  const subjectsByKey = new Map();
  for (const claim of selectedClaims) {
    const identity = claim.subject_identity;
    const key = identity.canonical_subject_id
      ? `canonical:${identity.canonical_subject_id}`
      : `local:${identity.case_id}::${identity.local_subject_id}`;
    const existing = subjectsByKey.get(key) ?? {
      key,
      canonical_subject_id: identity.canonical_subject_id,
      canonical_kind: identity.canonical_kind,
      canonical_label: identity.canonical_label,
      resolution_status: identity.resolution_status,
      local_subjects: [],
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
    const localKey = `${identity.case_id}\0${identity.local_subject_id}`;
    if (!existing.local_subjects.some(item => `${item.case_id}\0${item.local_subject_id}` === localKey)) {
      existing.local_subjects.push({
        case_id: identity.case_id,
        local_subject_id: identity.local_subject_id,
        resolution_id: identity.resolution_id,
        resolution_status: identity.resolution_status
      });
    }
    existing.claim_ids = uniqueSorted([...existing.claim_ids, claim.claim_id]);
    existing.search_keys = uniqueSorted([...existing.search_keys, ...(identity.search_keys ?? []), identity.local_subject_id]);
    existing.local_subjects.sort((left, right) => `${left.case_id}\0${left.local_subject_id}`.localeCompare(`${right.case_id}\0${right.local_subject_id}`));
    subjectsByKey.set(key, existing);
  }
  const subjects = [...subjectsByKey.values()].sort((left, right) => left.key.localeCompare(right.key));
  const resolved = selectedClaims.filter(claim => claim.subject_identity.resolution_status === 'resolved_local_to_canonical').length;
  return {
    schema_version: 'reporter-briefing-subject-identity@1',
    scope: 'selected_claim_subjects_only',
    graph_effect: 'none',
    counts: {
      subject_references: selectedClaims.length,
      resolved_subject_references: resolved,
      unresolved_subject_references: selectedClaims.length - resolved,
      subjects: subjects.length,
      canonical_subjects: subjects.filter(subject => subject.canonical_subject_id).length
    },
    subjects,
    boundaries: {
      subject_id_preserved: true,
      claim_text_mutated: false,
      source_records_mutated: false,
      source_records_merged: false,
      object_identity_inferred: false,
      relationship_created: false,
      participation_created: false,
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      graph_effect: 'none'
    }
  };
}

export function applyReportWaterline(manifest, caseItem) {
  const caseUnsequenced = new Set(caseItem?.unsequenced_claim_ids ?? []);
  const unsequencedClaimIds = (manifest.claim_ids ?? []).filter(claimId => caseUnsequenced.has(claimId));
  const subjectIdentityProjection = briefingSubjectProjection(manifest, caseItem);
  return {
    ...manifest,
    counts: {
      ...manifest.counts,
      unsequenced_claims: unsequencedClaimIds.length,
      ...subjectIdentityProjection.counts
    },
    subject_identity_projection: subjectIdentityProjection,
    subjects: subjectIdentityProjection.subjects,
    unsequenced_claim_ids: unsequencedClaimIds
  };
}

export function reportWaterlineQueueEntry(manifest) {
  const entry = reporterBriefingQueueEntry(manifest);
  const count = manifest.counts?.unsequenced_claims ?? 0;
  if (count > 0) {
    const insertAt = entry.blocking_reasons.findIndex(reason => reason === 'independent_reviewer_missing');
    entry.blocking_reasons.splice(insertAt >= 0 ? insertAt : entry.blocking_reasons.length, 0, `${count}_unsequenced_case_claims`);
    entry.eligible_for_approval = false;
  }
  return entry;
}
