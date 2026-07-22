import { reporterBriefingQueueEntry } from './reporter-briefing.mjs';

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
    const insertAt = entry.blocking_reasons.findIndex(reason => reason === 'independent_reviewer_missing');
    entry.blocking_reasons.splice(insertAt >= 0 ? insertAt : entry.blocking_reasons.length, 0, `${count}_unsequenced_case_claims`);
    entry.eligible_for_approval = false;
  }
  return entry;
}
