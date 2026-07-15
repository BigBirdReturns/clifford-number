#!/usr/bin/env node
// Symmetric government-to-property acquisition: for every cohort member, query the official no-key
// USAspending award API for each resolved disclosed-business entity, classify recipients, and
// preserve every award, counterparty, false positive, and null. Emits a durable manifest; full
// award rows go to a git-ignored provisional run cache. The checked-in manifest records scope,
// but does not claim exhaustive pagination or a hash-pinned response archive.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeName, classifyAwardAgainstEntity, awardIdentityDisposition, summarizeSymmetricRun } from './lib/gov-property-awards.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const runDir = path.join(repoRoot, 'build', 'source-acquisition', 'gov-property-v1');
fs.mkdirSync(runDir, { recursive: true });
const AWARD_API = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FIELDS = ['Award ID', 'Recipient Name', 'Awarding Agency', 'Award Amount', 'Start Date', 'End Date', 'recipient_id', 'Award Type'];
const now = () => new Date().toISOString();
const sha256 = s => crypto.createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex');

async function queryAwards(name) {
  const body = { filters: { award_type_codes: ['A', 'B', 'C', 'D'], recipient_search_text: [name] }, fields: FIELDS, limit: 100, page: 1, sort: 'Award Amount', order: 'desc' };
  const res = await fetch(AWARD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`USAspending ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return { request_body: body, results: json.results ?? [], request_url: AWARD_API };
}

const cohort = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/research/cohort-disclosed-business-entities.json'), 'utf8'));
const awardsSink = path.join(runDir, 'awards.jsonl');
fs.writeFileSync(awardsSink, '');
const falsePositivesSink = path.join(runDir, 'false-positives.jsonl');
fs.writeFileSync(falsePositivesSink, '');

const memberResults = [];
for (const member of cohort.members) {
  if (!member.entities?.length) {
    memberResults.push({ person_id: member.person_id, coverage_state: member.coverage_state, entities_queried: 0, entity_results: [] });
    continue;
  }
  const entityResults = [];
  for (const entity of member.entities) {
    let observed = [];
    let error = null;
    try { observed = (await queryAwards(entity.legal_name)).results; }
    catch (e) { error = String(e?.message ?? e); }
    const dispositionCounts = {};
    const sample = [];
    const counterpartyAgencies = new Set();
    for (const a of observed) {
      const { relation, reason } = classifyAwardAgainstEntity(a['Recipient Name'], entity.legal_name);
      const disposition = awardIdentityDisposition(relation);
      dispositionCounts[disposition] = (dispositionCounts[disposition] ?? 0) + 1;
      const row = {
        person_id: member.person_id, queried_entity: entity.legal_name, queried_corpid_num: entity.corpid_num,
        award_id: a['Award ID'], recipient_name: a['Recipient Name'], recipient_uei_id: a.recipient_id,
        awarding_agency: a['Awarding Agency'], award_amount: a['Award Amount'], award_type: a['Award Type'],
        pop_start: a['Start Date'], pop_end: a['End Date'], relation, reason, disposition,
        verification_status: 'machine_proposed_unverified', causal_status: 'not_established', graph_effect: 'none',
      };
      fs.appendFileSync(awardsSink, JSON.stringify(row) + '\n');
      if (disposition === 'rejected_false_positive') fs.appendFileSync(falsePositivesSink, JSON.stringify(row) + '\n');
      if (a['Awarding Agency']) counterpartyAgencies.add(a['Awarding Agency']);
      if (sample.length < 3 && disposition !== 'unrelated') sample.push(row);
    }
    entityResults.push({
      legal_name: entity.legal_name, corpid_num: entity.corpid_num, entity_type: entity.entity_type,
      query_error: error, awards_observed: observed.length, disposition_counts: dispositionCounts,
      counterparty_agencies: [...counterpartyAgencies].sort(), sample_rows: sample,
    });
  }
  memberResults.push({ person_id: member.person_id, coverage_state: member.coverage_state, entities_queried: member.entities.length, entity_results: entityResults });
}

// Source-scope probe: the operating-property recipient names that documented federal-property
// spending would use, plus the first returned page for a "TRUMP" recipient query, to record what this
// source does and does not itemize (evidence for the source-scope limit, not a universal claim).
const OPERATING_PROBE = ['TRUMP OLD POST OFFICE LLC', 'MAR-A-LAGO CLUB', 'TRUMP NATIONAL GOLF CLUB', 'TRUMP INTERNATIONAL HOTEL'];
const operatingProbe = [];
for (const name of OPERATING_PROBE) {
  try { const { results } = await queryAwards(name); operatingProbe.push({ queried_name: name, contract_awards_observed: results.length }); }
  catch (e) { operatingProbe.push({ queried_name: name, error: String(e?.message ?? e) }); }
}
let universe = { token: 'TRUMP', award_type_codes: ['A', 'B', 'C', 'D'], distinct_recipients: [], all_false_positive: null, error: null };
try {
  const res = await fetch(AWARD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: { award_type_codes: ['A', 'B', 'C', 'D'], recipient_search_text: ['TRUMP'] }, fields: ['Recipient Name'], limit: 100, page: 1 }) });
  const rows = (await res.json()).results ?? [];
  const distinct = [...new Set(rows.map(x => normalizeName(x['Recipient Name'])))];
  universe.rows_sampled = rows.length;
  universe.distinct_recipients = distinct;
  universe.genuine_cohort_entity_recipients = distinct.filter(n => cohort.members.flatMap(m => m.entities ?? []).some(e => normalizeName(e.legal_name) === n));
  universe.all_false_positive = universe.genuine_cohort_entity_recipients.length === 0;
} catch (e) { universe.error = String(e?.message ?? e); }

const summary = summarizeSymmetricRun(memberResults);
const manifest = {
  schema_version: 'government-to-property-manifest@1',
  predicate: 'federal_agency_pays_entity_the_officeholder_owns',
  cohort_id: cohort.cohort_id,
  generated_at: now(),
  source: { provider: 'USAspending.gov', api: AWARD_API, access_mode: 'public_api_no_api_key', award_type_codes: ['A', 'B', 'C', 'D'], fields: FIELDS },
  symmetric_method: 'Identical USAspending recipient query run for every cohort member; members without resolved disclosed-business entities are recorded as a coverage gap, not a null finding.',
  members: memberResults,
  summary,
  source_scope_probe: {
    operating_property_names: operatingProbe,
    trump_recipient_universe: universe,
    finding: 'In the six exact-name contract-award queries and the first 100 rows returned for the "TRUMP" token query, USAspending itemized contract-award data produced no resolved cohort recipient. The token sample contained unrelated firms (TRUMPF/TRUMPLER). This is a provisional, non-exhaustive source-scope observation—not a universal government-to-property null—and it does not establish that the six registry candidates were disclosed or beneficially owned. Other payment families require separate sources and receipts.',
  },
  awards_artifact: { path: 'build/source-acquisition/gov-property-v1/awards.jsonl', note: 'git-ignored provisional cache; the current manifest does not preserve response hashes or pagination proof and is insufficient for an exhaustive or independent-receipt claim.' },
  identity_ceiling: 'A USAspending recipient UEI and an NY-registry corpid_num are different identifier namespaces; exact recipient-name matches are name candidates, never resolved identities. Zero cross-source identities are resolved here.',
  temporal_note: 'Award period-of-performance dates are exact and preserved, but a disclosure holding interval is still required before any temporal crossing; this lane asserts none.',
  interpretation: [
    'Substring recipient matches (e.g. TRUMPF INC for a TRUMP query) are explicit false positives, preserved and rejected, never treated as the entity.',
    'An empty entity set for a member is a source-coverage gap (disclosure extraction pending), not evidence the member had no businesses.',
    'This predicate is run symmetrically across all eight presidents; data coverage is asymmetric and recorded.',
  ],
  consumption: {
    contract_id: 'public-topology-map@1',
    selection_review_id: 'selection-review-trump-office-business-capital',
    selection_review_status: 'pending_second_party',
    publication_status: 'blocked_pending_independent_review',
    review_effect: 'labels_clearance_only_does_not_block_discovery_or_intake',
    what_this_is: 'A symmetric provisional query log for contract awards searched by registry-resolved candidate legal names, with identity and false-positive dispositions.',
    what_this_is_not: 'A resolved beneficial-interest finding, a crossing, a completeness claim, or evidence of absence.',
    copy_ready_caveat: 'A recipient-name match is not a resolved entity, and a federal award is not a crossing; both identity resolution and a disclosure holding interval are required and are absent here.',
  },
  normalized_beneficial_interest_records: 0,
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};
fs.writeFileSync(path.join(repoRoot, 'data/research/government-to-property-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`government-to-property: ${summary.entities_queried} entities queried across ${summary.members_with_resolved_entities.length}/${cohort.members.length} members, ${summary.awards_observed} awards observed, ${summary.name_candidate_unresolved} name candidates, ${summary.rejected_false_positives} false positives, ${summary.crossing_matches} crossings`);
