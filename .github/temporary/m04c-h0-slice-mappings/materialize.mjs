#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const readJsonl = (file) => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(JSON.parse);
const writeJsonl = (file, rows) => fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
};

const mappingFile = 'data/project/estate-lens-mappings.jsonl';
const sliceMapFile = 'data/estates/slice-map.jsonl';
const specs = {
  'fulton-county-qoz-centennial-yards': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'district-noho-joint-development': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'tsmc-arizona-chips-cluster': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'new-highmark-stadium-public-finance': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'cortland-chicago-river-tif': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'commerce-pas-oge278-2021-2026': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'nato-diana-2026-cohort': { phases:['P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'fda-senior-leadership-2021-2026': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'us-senate-119th-disclosures': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'new-york-state-authority-land-contracts': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'baltimore-peninsula-public-incentive-stack': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'expo-crenshaw-joint-development': { phases:['P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'micron-clay-chips-cluster': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'nashville-east-bank-stadium-district': { phases:['P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'the-78-chicago-tif': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'doe-edf-leadership-portfolio': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'nato-diana-2025-cohort': { phases:['P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] },
  'ftc-commissioner-router-2021-2026': { phases:['P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'us-house-119th-disclosures': { phases:['P5-reindustrializing-market-maker-state'], stages:['C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A3-selector','A4-public-market-maker','A6-paper-architect','A8-residual-rights-holder','A10-adjudicator'] },
  'california-high-speed-rail-land-contracts': { phases:['P3-innovation-bridge','P4-dual-use-platform-state','P5-reindustrializing-market-maker-state'], stages:['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C6-residual-value','C7-reversibility-and-counterpower'], archetypes:['A1-convener','A2-translator','A3-selector','A4-public-market-maker','A5-personnel-router','A6-paper-architect','A8-residual-rights-holder','A9-legitimizer','A10-adjudicator'] }
};

const sliceMap = readJsonl(sliceMapFile);
const managed = new Set(Object.keys(specs));
const retained = readJsonl(mappingFile).filter((row) => row.object_kind !== 'estate_slice' || !managed.has(row.object_id));
const added = [];
for (const entry of [...sliceMap].sort((a,b) => a.slice_id.localeCompare(b.slice_id))) {
  const spec = specs[entry.slice_id];
  if (!spec) throw new Error(`missing slice mapping specification for ${entry.slice_id}`);
  const basis = entry.source_package === 'next-ten-estates'
    ? [`data/intake/next-ten-estates/raw/${entry.slice_id}.json`, sliceMapFile]
    : ['data/intake/estate-expansion-01/next-ten.json','data/intake/estate-expansion-01/triage.json',sliceMapFile];
  for (const file of basis) if (!fs.existsSync(file)) throw new Error(`missing basis file ${file}`);
  for (const estateId of [entry.primary_estate_id, ...(entry.related_estate_ids ?? [])]) {
    added.push({
      mapping_id: `map-slice-${entry.slice_id}-${estateId.replace(/-estate$/, '')}`,
      estate_id: estateId,
      object_kind: 'estate_slice',
      object_id: entry.slice_id,
      phase_ids: spec.phases,
      conversion_stage_ids: spec.stages,
      archetype_ids: spec.archetypes,
      basis_refs: basis,
      mapping_status: 'explicit_object_mapping',
      graph_effect: 'none',
      conclusion_generated: false
    });
  }
}
if (added.length !== 53) throw new Error(`expected 53 estate-slice mappings, found ${added.length}`);
const rows = [...retained, ...added];
if (new Set(rows.map((row) => row.mapping_id)).size !== rows.length) throw new Error('duplicate mapping_id');
if (new Set(rows.map((row) => `${row.estate_id}|${row.object_kind}|${row.object_id}`)).size !== rows.length) throw new Error('duplicate estate/object key');
writeJsonl(mappingFile, rows);

write('test/estate-lens-audit.test.js', `import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const readJsonl = (path) => fs.readFileSync(path, 'utf8')
  .split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean).map(JSON.parse);

const manifest = readJson('build/core-thesis/estate-lens-audit-manifest.json');
const objects = manifest.estates.flatMap((estate) =>
  readJson(\`build/core-thesis/estate-lens-audit/estates/\${estate.estate_id}.json\`).objects
);
const mappings = readJsonl('data/project/estate-lens-mappings.jsonl');
const trackMap = readJsonl('data/estates/track-map.jsonl');
const sliceMap = readJsonl('data/estates/slice-map.jsonl');

assert.equal(manifest.counts.estates, 24);
assert.equal(manifest.counts.known_object_memberships, 690);
assert.equal(manifest.counts.explicit_mapped, 112);
assert.equal(manifest.counts.known_unmapped, 436);
assert.equal(manifest.counts.unresolved, 142);
assert.equal(objects.filter((x) => x.object_kind === 'estate_root').length, 24);
assert.ok(objects.some((x) => x.object_kind === 'case' && x.object_id === 'anduril-access-ownership' && x.mapping_state === 'explicit_mapped'));
assert.ok(objects.some((x) => x.object_kind === 'source_route' && x.mapping_state === 'known_unmapped'));
assert.ok(objects.some((x) => x.ukraine_war_shock.state !== 'not_reached'));

const expectedTrackKeys = new Set(trackMap.flatMap((row) => [
  \`\${row.primary_estate_id}|\${row.track_id}\`,
  ...(row.related_estate_ids ?? []).map((estateId) => \`\${estateId}|\${row.track_id}\`),
]));
const mappedTrackKeys = new Set(objects
  .filter((x) => x.object_kind === 'research_track' && x.mapping_state === 'explicit_mapped')
  .map((x) => \`\${x.estate_id}|\${x.object_id}\`));
assert.deepEqual([...mappedTrackKeys].sort(), [...expectedTrackKeys].sort(), 'every declared research-track membership must be explicitly mapped');
assert.equal(mappedTrackKeys.size, 29);

const expectedSliceKeys = new Set(sliceMap.flatMap((row) => [
  \`\${row.primary_estate_id}|\${row.slice_id}\`,
  ...(row.related_estate_ids ?? []).map((estateId) => \`\${estateId}|\${row.slice_id}\`),
]));
const mappedSliceKeys = new Set(objects
  .filter((x) => x.object_kind === 'estate_slice' && x.mapping_state === 'explicit_mapped')
  .map((x) => \`\${x.estate_id}|\${x.object_id}\`));
assert.deepEqual([...mappedSliceKeys].sort(), [...expectedSliceKeys].sort(), 'every declared estate-slice membership must be explicitly mapped');
assert.equal(mappedSliceKeys.size, 53);

assert.equal(new Set(mappings.map((x) => x.mapping_id)).size, mappings.length, 'mapping_id values must be unique');
assert.equal(new Set(mappings.map((x) => \`\${x.estate_id}|\${x.object_kind}|\${x.object_id}\`)).size, mappings.length, 'estate/object mapping keys must be unique');
for (const row of mappings.filter((x) => x.object_kind === 'research_track')) {
  assert.deepEqual(row.basis_refs, [\`data/research-tracks/\${row.object_id}/harness.json\`, 'data/estates/track-map.jsonl'], \`\${row.mapping_id}: research-track basis\`);
  assert.equal(fs.existsSync(row.basis_refs[0]), true, \`\${row.mapping_id}: missing harness\`);
}
const sliceById = new Map(sliceMap.map((row) => [row.slice_id, row]));
for (const row of mappings.filter((x) => x.object_kind === 'estate_slice')) {
  const entry = sliceById.get(row.object_id);
  const expectedBasis = entry.source_package === 'next-ten-estates'
    ? [\`data/intake/next-ten-estates/raw/\${row.object_id}.json\`, 'data/estates/slice-map.jsonl']
    : ['data/intake/estate-expansion-01/next-ten.json','data/intake/estate-expansion-01/triage.json','data/estates/slice-map.jsonl'];
  assert.deepEqual(row.basis_refs, expectedBasis, \`\${row.mapping_id}: estate-slice basis\`);
  for (const file of expectedBasis) assert.equal(fs.existsSync(file), true, \`\${row.mapping_id}: missing basis \${file}\`);
}
for (const row of mappings) {
  assert.equal(row.mapping_status, 'explicit_object_mapping', row.mapping_id);
  assert.equal(row.graph_effect, 'none', row.mapping_id);
  assert.equal(row.conclusion_generated, false, row.mapping_id);
}
assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.equal(manifest.estate_completion_claimed, false);
console.log('estate-lens-audit.test: OK');
`);

write('docs/milestones/m04c-h0-estate-slice-mappings.md', `# M-04C.H0 · Explicit estate-slice mappings

The second recurring-object orbit replaces inherited-only routing for every currently declared estate-slice membership with a checked-in object-level mapping.

\`\`\`text
20 estate slices
53 primary or related estate memberships
53 explicit estate-slice mappings
0 declared slice memberships left inherited-only
\`\`\`

## Source discipline

First-cohort mappings cite the exact per-slice raw intake and the checked-in slice map. Second-cohort control mappings cite the source-bounded expansion package, its fog-triage record, and the slice map. Mapping records preserve the slice's own question, time window, program, denominator, acquired records, open layers, control purpose, and null discipline.

A mapping says which conversion questions the existing slice can test. It does not convert an authorization into an executed agreement, a ceiling into an outlay, a roster into a crossing, a designation into causation, an ownership position into improper value capture, or a temporal overlap into influence.

## Pass composition

The mapped slices include paired or longitudinal controls:

- Fulton County / Baltimore Peninsula opportunity-zone and adjacent-instrument formation;
- District NoHo / Expo-Crenshaw same-agency joint development;
- TSMC Arizona / Micron Clay CHIPS awards;
- New Highmark / Nashville East Bank stadium and ancillary-land finance;
- Cortland-Chicago River / The 78 same-city TIF machinery;
- Commerce / DOE Energy Dominance Financing leadership and OGE surfaces;
- NATO DIANA 2025 / 2026 cohorts;
- FDA / FTC regulatory-router cohorts;
- Senate / House 119th Congress disclosure denominators;
- New York state authorities / California high-speed rail land and contract surfaces.

## Resulting audit waterline

\`\`\`text
known object memberships: 690
explicitly mapped:         112
known but unmapped:        436
unresolved:                142
\`\`\`

## Next H0 orbit

Map every existing case and report across its declared primary and related estate memberships. Then map the decisive asset references, fog items, and next-acquisition objects that already encode signed-instrument, identity, transaction, implementation, consequence, and counterpower work.

\`\`\`text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
\`\`\`
`);
console.log(JSON.stringify({ total_mappings: rows.length, estate_slice_mappings: added.length }, null, 2));
