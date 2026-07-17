// Government-to-property predicate: classify USAspending federal award recipients against a cohort
// member's resolved disclosed-business entities. Discipline mirrors the FEC payee lane:
//  - A USAspending recipient UEI and an NY-registry corpid_num are DIFFERENT identifier namespaces,
//    so an exact recipient-name match is a CANDIDATE, never a resolved identity.
//  - Substring/fuzzy recipient matches (e.g. "TRUMPF INC" for "TRUMP") are explicit false positives,
//    not silently dropped and never treated as the entity.
//  - Award period-of-performance dates are exact and preserved; the disclosure holding interval is
//    still required before any temporal crossing — this lane does not assert one.

export function normalizeName(value) {
  return String(value ?? '').toUpperCase().replace(/[.,'"()\-/&]/g, ' ').replace(/\s+/g, ' ').trim();
}

const ENTITY_SUFFIXES = /\b(LLC|L L C|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LP|LLP|LTD)\b/g;
const LEAD_STOPWORDS = new Set(['THE', 'A', 'AN']);
function coreName(value) {
  return normalizeName(value).replace(ENTITY_SUFFIXES, '').replace(/\s+/g, ' ').trim();
}
// First distinctive token, skipping leading articles ("THE TRUMP CORPORATION" -> "TRUMP").
function leadToken(normalized) {
  return normalized.split(' ').find(t => t && !LEAD_STOPWORDS.has(t)) ?? '';
}

// Classify one award recipient against one disclosed entity.
export function classifyAwardAgainstEntity(recipientName, entityLegalName) {
  const rn = normalizeName(recipientName);
  const en = normalizeName(entityLegalName);
  if (!rn || !en) return { relation: 'unrelated', reason: 'empty_name' };
  if (rn === en) return { relation: 'exact_normalized_name_candidate', reason: 'exact_normalized_name' };
  const rCore = coreName(recipientName);
  const eCore = coreName(entityLegalName);
  if (rCore && rCore === eCore) return { relation: 'core_name_candidate', reason: 'core_name_after_suffix_strip' };
  // lead-token prefix collision without name equality => the "TRUMPF for TRUMP" trap
  const rLead = leadToken(rn);
  const eLead = leadToken(en);
  if (rLead && eLead && rLead !== eLead && (rLead.startsWith(eLead) || eLead.startsWith(rLead))) {
    return { relation: 'substring_only_false_positive', reason: 'lead_token_prefix_collision_without_name_equality' };
  }
  return { relation: 'unrelated', reason: 'no_name_equality' };
}

// A USAspending recipient match is at most a CANDIDATE for a disclosed entity; it can never be
// "accepted" here because no shared official identifier links UEI to the registry corpid_num.
export function awardIdentityDisposition(relation) {
  if (relation === 'exact_normalized_name_candidate' || relation === 'core_name_candidate') return 'name_candidate_unresolved';
  if (relation === 'substring_only_false_positive') return 'rejected_false_positive';
  return 'unrelated';
}

export function summarizeSymmetricRun(members) {
  const dispositionTotals = {};
  let awardsObserved = 0, entitiesQueried = 0, nameCandidates = 0, falsePositives = 0;
  for (const m of members) {
    entitiesQueried += m.entities_queried ?? 0;
    for (const e of m.entity_results ?? []) {
      awardsObserved += e.awards_observed ?? 0;
      for (const d of Object.keys(e.disposition_counts ?? {})) {
        dispositionTotals[d] = (dispositionTotals[d] ?? 0) + e.disposition_counts[d];
        if (d === 'name_candidate_unresolved') nameCandidates += e.disposition_counts[d];
        if (d === 'rejected_false_positive') falsePositives += e.disposition_counts[d];
      }
    }
  }
  return {
    cohort_members: members.length,
    members_with_resolved_entities: members.filter(m => (m.entities_queried ?? 0) > 0).map(m => m.person_id),
    members_without_resolved_entities: members.filter(m => (m.entities_queried ?? 0) === 0).map(m => m.person_id),
    entities_queried: entitiesQueried,
    awards_observed: awardsObserved,
    name_candidate_unresolved: nameCandidates,
    rejected_false_positives: falsePositives,
    resolved_cross_source_identities: 0,
    crossing_matches: 0,
    disposition_totals: dispositionTotals,
  };
}
