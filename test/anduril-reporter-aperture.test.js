import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileCaseLedger, loadCaseLedger, validateCaseLedger } from '../tools/lib/case-ledger.mjs';
import { root } from '../tools/lib/ledger.mjs';

const caseDirectory = path.join(root, 'cases', 'anduril-access-ownership');
const source = loadCaseLedger(caseDirectory);
assert.deepEqual(validateCaseLedger(source), [], 'the Anduril case source must satisfy the case-ledger contract');
const compiled = compileCaseLedger(source);

assert.equal(compiled.case_id, 'anduril-access-ownership');
assert.equal(compiled.presentation, 'reporter_briefing');
assert.equal(compiled.status, 'review_required');
assert.equal(compiled.briefing?.href, 'briefs/anduril-access-ownership.html');
assert.deepEqual(compiled.counts, { events: 21, claims: 24, receipts: 22, relations: 6, beacons: 1 });
assert.equal(compiled.claim_status_counts.verified, 15);
assert.equal(compiled.claim_status_counts.review_required, 9);

const claims = compiled.events.flatMap(event => event.claims ?? []);
const verified = claims.filter(claim => claim.claim_status === 'verified');
assert.equal(verified.length, 15);
assert.ok(verified.every(claim => claim.evidence_class === 'official'), 'verified claims must remain official-source claims');
assert.ok(verified.every(claim => claim.receipts.every(receipt => /^https:\/\//.test(receipt.url ?? ''))), 'verified claims must open public receipts');
assert.ok(claims.filter(claim => claim.evidence_class === 'judgment').every(claim => claim.claim_status === 'review_required'), 'editorial axis placement must never become verified fact');

const lobbyingRelation = compiled.relations.find(relation => relation.relation_id === 'rel-lobbying-to-cbp-gate');
assert.equal(lobbyingRelation?.causal_status, 'not_established');
assert.match(lobbyingRelation?.notes ?? '', /no opened record establishes authorship or causal influence/i);
const acquisitionRelations = compiled.relations.filter(relation => relation.relation_type.includes('precedes'));
assert.ok(acquisitionRelations.length >= 3);
assert.ok(acquisitionRelations.every(relation => relation.causal_status !== 'source_explicit'));

const beacon = compiled.beacons[0];
assert.equal(beacon.version, 'anduril-reporter-aperture@1');
for (const prohibited of ['capture', 'corruption', 'guilt', 'influence', 'motive', 'risk', 'probability score']) {
  assert.match(beacon.prohibited_interpretation, new RegExp(prohibited, 'i'), `${prohibited} must remain explicitly prohibited`);
}
assert.equal(beacon.evidence_coverage.verified, 9);
assert.equal(beacon.evidence_coverage.total, 15);

const brief = fs.readFileSync(path.join(root, 'briefs', 'anduril-access-ownership.html'), 'utf8');
assert.match(brief, /Anduril: access, ownership, and the government gate/i);
assert.match(brief, /\.\.\/#case\/anduril-access-ownership/);
assert.match(brief, /Placement is editorial orientation, not a score or finding/i);
for (const id of ['E03', 'G01', 'G02', 'G04', 'G18', 'G16', 'B12', 'B13', 'E16', 'G05', 'G10', 'E01', 'G11']) {
  assert.match(brief, new RegExp(`>${id}<`), `${id} must remain visible in the reporter brief`);
}

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const pagesBuilder = fs.readFileSync(path.join(root, 'tools', 'build-pages.mjs'), 'utf8');
assert.match(app, /function caseBriefingHref/);
assert.match(app, /item\.briefing\?\.label \|\| 'Open reporter brief'/);
assert.match(app, /document\.body\.dataset\.portableRelease === 'true'/, 'standalone must not link to a missing external brief');
assert.match(pagesBuilder, /'briefs'/, 'Pages build must publish the reporter brief');

console.log('anduril-reporter-aperture.test.js: OK');
