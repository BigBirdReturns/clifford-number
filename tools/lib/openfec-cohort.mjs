import crypto from 'node:crypto';

export const OPENFEC_BASE_URL = 'https://api.open.fec.gov/v1/candidates/search/';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stable(value));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

export function publicCandidateSearchUrl(name, { baseUrl = OPENFEC_BASE_URL, perPage = 100 } = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set('name', name);
  url.searchParams.set('office', 'P');
  url.searchParams.set('per_page', String(perPage));
  return url;
}

export function authenticatedCandidateSearchUrl(name, apiKey, options = {}) {
  const url = publicCandidateSearchUrl(name, options);
  url.searchParams.set('api_key', apiKey);
  return url;
}

function cleanCandidate(candidate) {
  return {
    candidate_id: candidate.candidate_id ?? null,
    name: candidate.name ?? null,
    office: candidate.office ?? null,
    party: candidate.party ?? null,
    party_full: candidate.party_full ?? null,
    state: candidate.state ?? null,
    district: candidate.district ?? null,
    candidate_status: candidate.candidate_status ?? null,
    active_through: candidate.active_through ?? null,
    cycles: Array.isArray(candidate.cycles) ? candidate.cycles : [],
    election_years: Array.isArray(candidate.election_years) ? candidate.election_years : [],
  };
}

export function normalizeCandidateSearchResponse(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results
    .map(cleanCandidate)
    .filter(candidate => candidate.candidate_id && candidate.office === 'P')
    .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
}

export async function resolveOpenFecCohort({
  cohort,
  fetchJson,
  retrievedAt = new Date().toISOString(),
  consumptionContract,
  credentialMode,
  delay = async () => {},
  onRow = async () => {},
} = {}) {
  if (!Array.isArray(cohort?.members) || cohort.members.length === 0) throw new Error('cohort members are required');
  if (typeof fetchJson !== 'function') throw new Error('fetchJson is required');
  const rows = [];
  for (let index = 0; index < cohort.members.length; index += 1) {
    const member = cohort.members[index];
    const publicUrl = publicCandidateSearchUrl(member.name);
    let row;
    try {
      const payload = await fetchJson(member, publicUrl);
      const candidateRecords = normalizeCandidateSearchResponse(payload);
      row = {
        schema_version: 'openfec-cohort-resolution@1',
        cohort_id: cohort.cohort_id,
        person_id: member.person_id,
        person_name: member.name,
        query_scope: 'presidential_candidates_by_name',
        query_url: publicUrl.toString(),
        retrieved_at: retrievedAt,
        credential_mode: credentialMode,
        query_status: candidateRecords.length ? 'records_observed' : 'null_observed',
        identity_status: candidateRecords.length ? 'unresolved_candidate_records' : 'no_candidate_record_observed',
        candidate_records: candidateRecords,
        raw_response_sha256: sha256(payload),
        evidence_state: 'observed',
        allowed_language: candidateRecords.length
          ? 'OpenFEC returned the listed presidential candidate record or records for this name query; canonical person identity remains unresolved.'
          : 'OpenFEC returned no presidential candidate records for this name query at the retrieval time; this is not evidence that no candidacy or filing exists.',
        consumption: consumptionContract,
        graph_effect: 'none',
      };
    } catch (error) {
      row = {
        schema_version: 'openfec-cohort-resolution@1',
        cohort_id: cohort.cohort_id,
        person_id: member.person_id,
        person_name: member.name,
        query_scope: 'presidential_candidates_by_name',
        query_url: publicUrl.toString(),
        retrieved_at: retrievedAt,
        credential_mode: credentialMode,
        query_status: 'source_failure',
        identity_status: 'unresolved_source_failure',
        candidate_records: [],
        source_error: String(error?.message ?? error),
        evidence_state: 'unavailable',
        allowed_language: 'The query failed at the source or transport layer; no absence or candidate-identity conclusion is permitted.',
        consumption: consumptionContract,
        graph_effect: 'none',
      };
    }
    rows.push(row);
    await onRow(row, rows);
    if (index < cohort.members.length - 1) await delay();
  }
  return rows;
}

export function summarizeOpenFecRows(rows) {
  const counts = { records_observed: 0, null_observed: 0, source_failure: 0 };
  let candidateRecords = 0;
  for (const row of rows) {
    counts[row.query_status] = (counts[row.query_status] ?? 0) + 1;
    candidateRecords += row.candidate_records?.length ?? 0;
  }
  return {
    cohort_members: rows.length,
    queries_completed: counts.records_observed + counts.null_observed,
    candidate_records_observed: candidateRecords,
    by_query_status: counts,
    canonical_identities_resolved: 0,
  };
}
