import assert from 'node:assert/strict';
import { loadAll } from '../tools/lib/ledger.mjs';
import { deriveHopEdges } from '../tools/lib/hops.mjs';

const ORIGINAL = 'electric-twin-seed-round-2026-02-11';
const INSTITUTIONAL = 'electric-twin-seed-round-institutional-investors-2026-02-11';
const ANGELS = ['cal-henderson', 'eric-salama', 'louis-mosley', 'marc-andreessen', 'tom-shinner'];
const INSTITUTIONS = ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos'];

const data = loadAll();
const original = data.surfaces.find(surface => surface.surface_id === ORIGINAL);
const institutional = data.surfaces.find(surface => surface.surface_id === INSTITUTIONAL);
assert.ok(original, 'named-angel seed-round surface must remain present');
assert.ok(institutional, 'institutional seed-round refusal surface must be present');
assert.equal(original.hop_eligible, true);
assert.equal(institutional.hop_eligible, false);
assert.equal(institutional.hop_refusal_reason, 'organization_only_evidence');
assert.deepEqual(
  data.participation
    .filter(row => row.surface_id === ORIGINAL && row.participant_type === 'actor')
    .map(row => row.actor_id)
    .sort(),
  ANGELS,
  'the hop-eligible surface must contain only the five named natural-person investors',
);
assert.deepEqual(
  data.participation
    .filter(row => row.surface_id === INSTITUTIONAL && row.participant_type === 'organization')
    .map(row => row.organization_id)
    .sort(),
  INSTITUTIONS,
  'the refusal surface must preserve the issuer and four named institutional investors',
);
assert.equal(
  data.participation.filter(
    row => row.surface_id === INSTITUTIONAL && row.participant_type === 'actor',
  ).length,
  0,
  'organization-only evidence must not be rewritten as actor participation',
);
assert.equal(
  data.participation.some(
    row => [ORIGINAL, INSTITUTIONAL].includes(row.surface_id) && row.actor_id === 'saul-klein',
  ),
  false,
  'Saul Klein must not be substituted for LocalGlobe',
);

const facultySaulSurfaces = data.participation
  .filter(row => row.actor_id === 'saul-klein' && row.surface_id.startsWith('faculty-science-'))
  .map(row => row.surface_id)
  .sort();
assert.deepEqual(facultySaulSurfaces, [
  'faculty-science-director-shareholder-overlap-2024-10-10',
  'faculty-science-officer-employee-overlap-2018-01-24',
], 'the two independently receipted Faculty surfaces must remain intact');

const participationBySurface = new Map();
for (const row of data.participation) {
  if (!participationBySurface.has(row.surface_id)) participationBySurface.set(row.surface_id, []);
  participationBySurface.get(row.surface_id).push(row);
}
const receiptById = new Map(data.receipts.map(receipt => [receipt.receipt_id, receipt]));
const broadOrgIds = new Set(
  data.organizations.filter(org => org.broad_institution).map(org => org.id),
);
const result = deriveHopEdges({
  surfaces: data.surfaces,
  participationBySurface,
  broadOrgIds,
  densityPolicy: data.densityPolicy,
  receiptById,
});
assert.ok(
  result.rejectedHopSurfaces.some(
    row => row.surface_id === INSTITUTIONAL && row.reason === 'organization_only_evidence',
  ),
  'the institutional surface must appear in the compiler refusal ledger',
);
assert.equal(
  result.edges.flatMap(edge => edge.surfaces).some(basis => basis.surface_id === INSTITUTIONAL),
  false,
  'the institutional surface must never become a hop basis',
);
assert.equal(
  result.edges
    .flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === ORIGINAL).length,
  10,
  'five named angel investors must retain exactly ten pairwise hop bases',
);

const refusal = data.claims.find(
  claim => claim.claim_id === 'electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12',
);
assert.ok(refusal, 'the person-substitution refusal must be public and graph-inert');
assert.deepEqual(refusal.surface_ids, [INSTITUTIONAL]);
console.log('localglobe-actor-boundary.test: OK');
