#!/usr/bin/env node
// Validate the government-to-property predicate artifacts: symmetric across all 8 cohort members,
// honest zeros, no name-only identity resolution, reviewer status attached but non-blocking.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MEMBERS = ['barack-obama', 'bill-clinton', 'donald-trump', 'george-h-w-bush', 'george-w-bush', 'jimmy-carter', 'joe-biden', 'ronald-reagan'];

export function validateGovProperty(manifest, cohortEntities, v1) {
  const e = [];
  // symmetric input
  if (cohortEntities?.schema_version !== 'cohort-disclosed-business-entities@1') e.push('cohort input: bad schema');
  if (cohortEntities?.graph_effect !== 'none') e.push('cohort input: graph_effect must be none');
  if (JSON.stringify((cohortEntities?.members ?? []).map(m => m.person_id).sort()) !== JSON.stringify([...MEMBERS].sort())) e.push('cohort input: must cover all 8 members');

  // manifest
  if (manifest?.schema_version !== 'government-to-property-manifest@1') e.push('manifest: bad schema');
  if (manifest?.graph_effect !== 'none') e.push('manifest: graph_effect must be none');
  if (JSON.stringify((manifest?.members ?? []).map(m => m.person_id).sort()) !== JSON.stringify([...MEMBERS].sort())) e.push('manifest: predicate must run symmetrically across all 8 members');
  if (manifest?.summary?.resolved_cross_source_identities !== 0) e.push('manifest: resolved identities must be 0 (no name-only resolution)');
  if (manifest?.summary?.crossing_matches !== 0) e.push('manifest: crossing matches must be 0');
  if (manifest?.summary?.name_candidate_unresolved < 0) e.push('manifest: negative candidate count');
  // reviewer attached but non-blocking
  if (manifest?.consumption?.selection_review_status !== 'pending_second_party') e.push('manifest: review status must be attached');
  if (manifest?.consumption?.review_effect !== 'labels_clearance_only_does_not_block_discovery_or_intake') e.push('manifest: review must not be described as blocking discovery/intake');
  if (manifest?.consumption?.publication_status !== 'blocked_pending_independent_review') e.push('manifest: publication must remain blocked pending review');
  // source-scope honesty (first-page false-positive sample recorded, not overclaimed)
  const probe = manifest?.source_scope_probe;
  if (!probe || probe.trump_recipient_universe?.all_false_positive !== true) e.push('manifest: must record the false-positive contract-recipient sample');
  if ((probe?.trump_recipient_universe?.genuine_cohort_entity_recipients ?? ['x']).length !== 0) e.push('manifest: no genuine cohort recipient expected in contract awards');
  if (!/first 100 rows returned/i.test(probe?.finding ?? '') || !/provisional, non-exhaustive source-scope observation/i.test(probe?.finding ?? '')) {
    e.push('manifest: source-scope finding must identify the first-page sample and remain non-exhaustive');
  }

  // frozen v1
  if (v1?.status !== 'frozen_v1_source_limited') e.push('v1: must be frozen source-limited');
  if (v1?.outcome?.crossing_matches !== 0) e.push('v1: crossings must be 0');
  if (!/limit of the CURRENT OGE evidence, not proof/i.test(JSON.stringify(v1?.why_no_crossing ?? []))) e.push('v1: must scope the limit to current OGE evidence, not a universal');
  if (!v1?.not_a_claim || !/does not assert that no relationship exists/i.test(v1.not_a_claim)) e.push('v1: must state it is not a no-relationship claim');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const rd = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const errs = validateGovProperty(
    rd('data/research/government-to-property-manifest.json'),
    rd('data/research/cohort-disclosed-business-entities.json'),
    rd('data/research/campaign-to-business-v1-result.json'),
  );
  if (errs.length) { console.error('validate-gov-property failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-gov-property: OK (symmetric across 8, 0 identities, 0 crossings, source-scope honest)');
}
