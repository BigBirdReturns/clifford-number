import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  aggregatesOnProtected,
  checkConstitutionGates,
  groupWarnings,
  protectedCue,
  scanValue,
} from '../tools/lib/constitution-gates.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const validator = path.join(repoRoot, 'tools/validate-constitution-gates.mjs');

// ---------------------------------------------------------------- unit rules (1.6)
const rules = (value, ctx) => scanValue(value, ctx).map(f => `${f.severity}:${f.rule}:${f.field}`);

// Protected-attribute field names, at any depth.
for (const field of ['ethnicity', 'nationality', 'national_origin', 'religion', 'ancestry', 'military_unit', 'unit_affiliation', 'idf', 'idf_veteran', 'cohort_by_origin', 'rollup_by_nationality']) {
  assert.deepEqual(rules({ id: 'x', [field]: 'anything' }), [`error:1.6/protected-field:${field}`], field);
  assert.deepEqual(rules({ id: 'x', nested: [{ [field]: 1 }] }), [`error:1.6/protected-field:${field}`], `${field} nested`);
}
// Neutral country / institution facts are not flagged (1.6: recorded neutrally, never suspicious in themselves).
assert.deepEqual(rules({ id: 'x', label: 'Israel Innovation Authority grant list', hq_country: 'Israel', country: 'UK', counts_by_origin: 3 }), []);
assert.deepEqual(rules({ id: 'x', surface_label: 'U.S. Army Detachment 201 commissioning roster', bounded_by: ['Army press release 2025-06-13'] }), []);

// A surface whose stated basis is a protected attribute.
{
  const f = scanValue({ surface_id: 's-1', bounded_by: ['Founders who served in the IDF'] });
  assert.equal(f.length, 1);
  assert.equal(f[0].rule, '1.6/protected-basis');
  assert.equal(f[0].row_id, 's-1');
}
assert.deepEqual(rules({ surface_id: 's-2', bounded_by: ['Companies House officer register', 'Israeli military service records'] }), ['error:1.6/protected-basis:bounded_by']);
assert.deepEqual(rules({ id: 'm', linkage_basis: 'Founders self/press-identified: Katz (Israeli military tunnel-detection unit), Soffer (moved to US from Israel)' }), ['error:1.6/protected-basis:linkage_basis']);
assert.deepEqual(rules({ id: 'm', israel_linkage_basis: 'explicit: Israeli-born, ex-IDF' }).sort(),
  ['error:1.6/protected-basis:israel_linkage_basis', 'warning:1.6/review-origin-linkage-field:israel_linkage_basis']);
assert.deepEqual(rules({ id: 'm', israel_linkage_basis: null }), [], 'an empty linkage field implements nothing');
assert.deepEqual(rules({ id: 'm', cohort_definition: { rule: 'religious affiliation of the founders' } }), ['error:1.6/protected-basis:rule']);
// Surface types.
assert.deepEqual(rules({ surface_id: 's', surface_type: 'religious_cohort_surface' }), ['error:1.6/protected-surface-type:surface_type']);
assert.deepEqual(rules({ surface_id: 's', secondary_surface_types: ['board', 'national_origin_roster'] }), ['error:1.6/protected-surface-type:secondary_surface_types']);
assert.deepEqual(rules({ surface_id: 's', surface_type: 'government_advisory_surface' }), []);
// Text that builds a rollup on a protected attribute.
assert.deepEqual(rules({ claim_id: 'c', text: 'The cohort is grouped by the religion of its founders.' }), ['error:1.6/protected-aggregation-text:text']);
assert.deepEqual(rules({ claim_id: 'c', notes: ['Scored by ethnicity of the board members.'] }), ['error:1.6/protected-aggregation-text:notes']);
assert.deepEqual(rules({ claim_id: 'c', text: 'The tally counts founders who are ex-IDF per fund.' }), ['error:1.6/protected-aggregation-text:text']);
// Guardrail sentences that forbid aggregation are not implementations.
assert.deepEqual(rules({ id: 'd', disclaimer: 'Nothing in this case may be aggregated into a score on ethnicity or religion.' }), []);
// A protected word without any group-building cue is just a mention.
assert.equal(aggregatesOnProtected('The company page lists the founder religion as private.'), null);
assert.ok(aggregatesOnProtected('Membership is defined by national origin.'));
assert.equal(protectedCue('Chief Technology Officer of Meta'), null);
assert.equal(protectedCue('Establish military role, cohort, mission'), null, 'verbs ending in -ish are not nationalities');
assert.ok(protectedCue('former Israeli military advisor'));

// ---------------------------------------------------------------- unit rules (1.9)
assert.deepEqual(rules({ id: 'a', paid_placement: true }), ['error:1.9/paid-placement:paid_placement']);
assert.deepEqual(rules({ id: 'a', featured: 'homepage' }), ['error:1.9/paid-placement:featured']);
assert.deepEqual(rules({ id: 'a', placement_fee: 5000 }), ['error:1.9/paid-placement:placement_fee']);
assert.deepEqual(rules({ id: 'a', featured: false }), [], 'a false flag implements no placement');
assert.deepEqual(rules({ id: 'a', sponsored_by: 'Acme' }), [], 'sponsor fields only gate canonical registries');
assert.deepEqual(rules({ id: 'a', sponsored_by: 'Acme' }, { canonicalRegistry: true }), ['error:1.9/undisclosed-sponsor:sponsored_by']);
assert.deepEqual(rules({ id: 'a', sponsored_by: 'Acme', sponsor_disclosure: 'Disclosed in docs/sponsors.md' }, { canonicalRegistry: true }), []);
assert.deepEqual(rules({ id: 'a', sponsor: 'Acme', sponsor_disclosure: '' }, { canonicalRegistry: true }), ['error:1.9/undisclosed-sponsor:sponsor']);

// ---------------------------------------------------------------- fixture repository
function makeRoot(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-gates-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}
const jsonl = rows => `${rows.map(r => JSON.stringify(r)).join('\n')}\n`;
const allowlist = (paths, extra = {}) => ({
  schema_version: 'clifford-publication-allowlist@1',
  paths,
  held_exact_paths: [],
  held_rules: [{ kind: 'prefix', value: 'data/intake/', state: 'repository_only', reason: 'intake is not canonical publication truth' }],
  ...extra,
});

const cleanFiles = {
  'data/ledger/surfaces.jsonl': jsonl([{ surface_id: 'board-2025', surface_type: 'government_advisory_surface', bounded_by: ['Official appointment record'], notes: 'Single appointment surface.' }]),
  'data/ledger/claims.jsonl': jsonl([{ claim_id: 'c1', text: 'Jane Doe was appointed on 2025-01-01.', limits: 'Appointment only.' }]),
  'data/canonical/actors.json': { actors: [{ id: 'jane-doe', label: 'Jane Doe', kind: 'person' }] },
  'cases/demo/claims.jsonl': jsonl([{ claim_id: 'k1', text: 'A dated observation.' }]),
  'data/research/map.json': { counts: { actors: 3 } },
  'data/intake/lane/actors.jsonl': jsonl([{ actor_id: 'a1', label: 'Someone', israel_linkage_basis: null }]),
  'data/project/publication-allowlist.json': allowlist(['data/research/map.json', 'data/ledger/surfaces.jsonl']),
};

{
  const root = makeRoot(cleanFiles);
  const result = checkConstitutionGates({ root });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.stats.blocking_files, 5);
  assert.equal(result.stats.intake_files, 1);
  fs.rmSync(root, { recursive: true, force: true });
}

// Each blocking scope fails, naming the offending row.
const violations = [
  ['data/ledger/surfaces.jsonl', jsonl([{ surface_id: 'bad-surface', surface_type: 'x', bounded_by: ['Founders who served in the IDF'] }]), /1\.6\/protected-basis/, 'bad-surface'],
  ['data/ledger/claims.jsonl', jsonl([{ claim_id: 'bad-claim', text: 'ok', ethnicity: 'x' }]), /1\.6\/protected-field/, 'bad-claim'],
  ['data/canonical/actors.json', { actors: [{ id: 'bad-actor', nationality: 'x' }] }, /1\.6\/protected-field/, 'bad-actor'],
  ['cases/demo/claims.jsonl', jsonl([{ claim_id: 'bad-case-claim', military_unit: 'x' }]), /1\.6\/protected-field/, 'bad-case-claim'],
  ['data/research/map.json', { id: 'bad-published', cohort_by_origin: { x: 1 } }, /1\.6\/protected-field/, 'bad-published'],
  ['data/canonical/orgs.json', { organizations: [{ id: 'bad-org', paid_placement: true }] }, /1\.9\/paid-placement/, 'bad-org'],
  ['data/canonical/orgs.json', { organizations: [{ id: 'sponsored-org', sponsored_by: 'Acme' }] }, /1\.9\/undisclosed-sponsor/, 'sponsored-org'],
  ['data/ledger/surfaces.jsonl', jsonl([{ surface_id: 'text-surface', notes: 'Cohort grouped by the religion of the founders.' }]), /1\.6\/protected-aggregation-text/, 'text-surface'],
];
for (const [rel, content, rule, rowId] of violations) {
  const root = makeRoot({ ...cleanFiles, [rel]: content });
  const result = checkConstitutionGates({ root });
  assert.equal(result.errors.length, 1, `${rel}: ${JSON.stringify(result.errors)}`);
  assert.match(`[${result.errors[0].rule}]`, rule);
  assert.equal(result.errors[0].row_id, rowId);
  assert.equal(result.errors[0].file, rel);
  if (rel.endsWith('.jsonl')) assert.equal(result.errors[0].line, 1);
  const cli = spawnSync(process.execPath, [validator, '--root', root], { encoding: 'utf8' });
  assert.equal(cli.status, 1, `${rel} must fail the CLI`);
  assert.match(cli.stderr, new RegExp(rowId));
  fs.rmSync(root, { recursive: true, force: true });
}

// The Austin-Israel corridor shape: intake cohort defined by founders' origin and service.
// Intake violations warn but never block; the data is preserved.
const corridorIntake = {
  'data/intake/corridor/austin-israel-cohort.jsonl': jsonl([{
    member_id: 'cohort-x', org_id: 'org-x',
    linkage_basis: 'Founders self/press-identified: Soffer (moved to US from Israel), Katz (Israeli military tunnel-detection unit). NOT inferred from any name.',
  }]),
  'data/intake/corridor/actors.jsonl': jsonl([
    { actor_id: 'act-1', israel_linkage_basis: 'explicit: Israeli Air Force veteran (self-represented)' },
    { actor_id: 'act-2', israel_linkage_basis: null },
  ]),
  'data/intake/corridor/manifest.json': { counts: { austin_israel_cohort_members: 2 } },
};
{
  const root = makeRoot({ ...cleanFiles, ...corridorIntake });
  const result = checkConstitutionGates({ root });
  assert.deepEqual(result.errors, [], 'intake findings must not block');
  const rulesSeen = new Set(result.warnings.map(w => `${w.rule}@${w.file}`));
  assert.ok(rulesSeen.has('1.6/protected-basis@data/intake/corridor/austin-israel-cohort.jsonl'));
  assert.ok(rulesSeen.has('1.6/protected-basis@data/intake/corridor/actors.jsonl'));
  assert.ok(rulesSeen.has('1.6/review-origin-linkage-field@data/intake/corridor/manifest.json'));
  assert.ok(result.warnings.every(w => w.severity === 'warning' && w.scope === 'intake'));
  const protectedBasisRows = result.warnings.filter(w => w.rule === '1.6/protected-basis' && w.file.endsWith('actors.jsonl'));
  assert.deepEqual(protectedBasisRows.map(w => w.line), [1], 'the null linkage row is not reported');
  assert.equal(groupWarnings(result.warnings).length, 4);

  const cli = spawnSync(process.execPath, [validator, '--root', root], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /non-blocking warning/);
  assert.match(cli.stdout, /austin-israel-cohort\.jsonl/);
  const strict = spawnSync(process.execPath, [validator, '--root', root, '--strict'], { encoding: 'utf8' });
  assert.equal(strict.status, 1, '--strict turns the warnings into failures once the owner has decided');

  // Intake that is not held back from publication is a blocking error.
  const leaked = makeRoot({
    ...cleanFiles,
    ...corridorIntake,
    'data/project/publication-allowlist.json': allowlist(['data/intake/corridor/austin-israel-cohort.jsonl'], { held_rules: [] }),
  });
  const leakedResult = checkConstitutionGates({ root: leaked });
  assert.ok(leakedResult.errors.some(e => e.rule === '1.6/intake-publishable' && e.file === 'data/intake/corridor/austin-israel-cohort.jsonl'));
  fs.rmSync(leaked, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
}

// A published derivative of the corridor cohort is a review warning, not a block.
{
  const root = makeRoot({
    ...cleanFiles,
    'data/research/map.json': { lanes: [{ counts: { austin_israel_source_explicit_members: 2 } }] },
  });
  const result = checkConstitutionGates({ root });
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].scope, 'published');
  assert.equal(result.warnings[0].rule, '1.6/review-origin-linkage-field');
  fs.rmSync(root, { recursive: true, force: true });
}

// Invalid JSON in a scanned file fails closed.
{
  const root = makeRoot({ ...cleanFiles, 'data/ledger/claims.jsonl': '{"claim_id": \n' });
  assert.ok(checkConstitutionGates({ root }).errors.some(e => e.rule === 'parse'));
  fs.rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------- the live repository
{
  const live = checkConstitutionGates({ root: repoRoot });
  assert.deepEqual(live.errors.map(e => `${e.rule} ${e.file}:${e.line ?? ''} ${e.row_id ?? ''} ${e.pointer}`), [],
    'canonical ledger, cases and the publication allowlist must pass the 1.6/1.9 gates');
  assert.ok(live.warnings.every(w => w.severity === 'warning' && ['intake', 'published'].includes(w.scope)),
    'live findings may only be non-blocking intake or published-derivative warnings');
  assert.ok(live.stats.blocking_files > 50, 'the blocking scope must not silently shrink to nothing');
  assert.ok(live.scopes.core.includes('data/ledger/receipts.jsonl'));
  assert.ok(live.scopes.core.some(rel => rel.startsWith('data/canonical/')));
  assert.ok(live.scopes.core.some(rel => rel.startsWith('cases/')));
  assert.ok(live.scopes.published.length > 100, 'publication allowlist data files must be in scope');
  assert.ok(live.scopes.intake.some(rel => rel.endsWith('/actors.jsonl')));
}

console.log('constitution-gates.test: OK');
