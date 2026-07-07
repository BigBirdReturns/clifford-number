import assert from 'node:assert/strict';
import { computeJoins, checkJoins, deriveMatches } from '../tools/build-joins.mjs';
import { buildIdentityLayer } from '../tools/lib/axm-identity.mjs';
import { entityId } from '../tools/lib/axm-id.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

// Two mini identity layers built from synthetic registries. Case A has the org
// "Globex Corp" by its canonical label; case B has the same org by a DIFFERENT
// canonical label ("Globex Corporation") but an alias "Globex Corp", so the two
// join only through the alias. Case A also has an org "Initech" that case B has
// by its exact canonical label, so that pair joins on the canonical label.
function layer(caseId, { organizations }) {
  return {
    case_id: caseId,
    entities: buildIdentityLayer({
      caseId,
      actors: [],
      organizations,
      surfaces: [],
      participation: [],
      aliases: [],
    }).entities,
  };
}

const caseA = layer('case-a', {
  organizations: [
    { id: 'globex', label: 'Globex Corp' },
    { id: 'initech', label: 'Initech' },
    { id: 'a-only', label: 'Case A Only Org' },
  ],
});
const caseB = layer('case-b', {
  organizations: [
    { id: 'globex', label: 'Globex Corporation', aliases: ['Globex Corp'] },
    { id: 'initech', label: 'Initech' },
    { id: 'b-only', label: 'Case B Only Org' },
  ],
});

const caseIdentities = [caseA, caseB];

const idGlobex = entityId('organization', 'Globex Corp');       // A canonical, B alias
const idInitech = entityId('organization', 'Initech');          // both canonical

// (a) Canonical-label join detected.
{
  const { joins } = computeJoins(caseIdentities, []);
  const initech = joins.find(j => j.axm_entity_id === idInitech);
  assert.ok(initech, 'Initech must be detected as a cross-case join');
  assert.equal(initech.via, 'canonical_label', 'Initech joins on identical canonical labels');
  assert.equal(initech.kind, 'organization');
  assert.deepEqual(
    initech.members.map(m => `${m.case_id}:${m.local_id}`),
    ['case-a:initech', 'case-b:initech'],
  );
  assert.ok(initech.members.every(m => !('alias_matched' in m)), 'a canonical-label join carries no alias_matched');
  // Single-case-only orgs never join.
  assert.ok(!joins.some(j => j.members.some(m => m.local_id === 'a-only' || m.local_id === 'b-only')),
    'entities present in only one case must not join');
}

// (b) Alias-derived join detected with via "alias".
{
  const { joins } = computeJoins(caseIdentities, []);
  const globex = joins.find(j => j.axm_entity_id === idGlobex);
  assert.ok(globex, 'Globex must be detected as a cross-case join via its alias');
  assert.equal(globex.via, 'alias', 'Globex joins only through case B\'s alias');
  const bMember = globex.members.find(m => m.case_id === 'case-b');
  const aMember = globex.members.find(m => m.case_id === 'case-a');
  assert.equal(bMember.alias_matched, idGlobex, 'the alias-matched member records the matching id');
  assert.ok(!('alias_matched' in aMember), 'the member whose canonical label matched carries no alias_matched');
}

// (c) An exclusion moves a match to `excluded` WITH its reason and members,
// never silently dropping it.
{
  const exclusions = [{
    axm_entity_id: idInitech,
    reason: 'Two unrelated companies that happen to share the name Initech',
    decided_by: 'driver',
    date: '2026-07-07',
  }];
  const { joins, excluded } = computeJoins(caseIdentities, exclusions);
  assert.ok(!joins.some(j => j.axm_entity_id === idInitech), 'an excluded match must not appear in joins');
  const ex = excluded.find(e => e.axm_entity_id === idInitech);
  assert.ok(ex, 'the excluded match must appear in excluded');
  assert.equal(ex.reason, exclusions[0].reason);
  assert.equal(ex.decided_by, 'driver');
  assert.equal(ex.date, '2026-07-07');
  assert.deepEqual(
    ex.members.map(m => `${m.case_id}:${m.local_id}`),
    ['case-a:initech', 'case-b:initech'],
    'the denial keeps the members it denies visible',
  );
  // Globex is untouched and still an active join.
  assert.ok(joins.some(j => j.axm_entity_id === idGlobex));
}

// (d) A dangling exclusion (id with no multi-case match) is an error by the
// validate logic (checkJoins), exercised directly.
{
  const built = (() => {
    const { joins, excluded } = computeJoins(caseIdentities, []);
    return { rule: 'x', joins, excluded };
  })();
  const dangling = [{
    axm_entity_id: 'e1_' + 'a'.repeat(52), // no entity derives this
    reason: 'stale denial',
    decided_by: 'driver',
    date: '2026-07-07',
  }];
  const { errors } = checkJoins({ built, caseIdentities, exclusions: dangling });
  assert.ok(errors.some(e => /dangling/.test(e)), 'a dangling exclusion must be reported as an error');

  // And with no exclusions, a faithfully built artifact drifts not at all.
  const { errors: clean } = checkJoins({ built, caseIdentities, exclusions: [] });
  assert.deepEqual(clean, [], 'a faithfully recomputed artifact must not drift');

  // Drift is caught: mutate the built joins and expect an error.
  const drifted = { rule: 'x', joins: [], excluded: [] };
  const { errors: driftErrors } = checkJoins({ built: drifted, caseIdentities, exclusions: [] });
  assert.ok(driftErrors.some(e => /drift/.test(e)), 'join drift must be caught');
}

// deriveMatches is order-independent and deterministic.
{
  const forward = deriveMatches(caseIdentities);
  const reversed = deriveMatches([caseB, caseA]);
  assert.equal(JSON.stringify(forward), JSON.stringify(reversed), 'matches must be independent of case order');
}

// (e) REAL-DATA assertion: the built join layer contains the organic Andreessen
// Horowitz join across the two real cases, kind organization.
{
  const built = readJson('build/joins.json');
  const a16zId = entityId('organization', 'Andreessen Horowitz');
  const a16z = built.joins.find(j => j.axm_entity_id === a16zId);
  assert.ok(a16z, 'build/joins.json must contain the Andreessen Horowitz join');
  assert.equal(a16z.kind, 'organization');
  const members = a16z.members.map(m => `${m.case_id}:${m.local_id}`);
  assert.ok(members.includes('uk-ai-policy:andreessen-horowitz'), 'a16z join must include the UK member');
  assert.ok(members.includes('us-defense-natsec100:andreessen-horowitz'), 'a16z join must include the natsec member');
}

console.log('joins.test: OK');
