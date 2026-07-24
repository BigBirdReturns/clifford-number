import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const readJsonl = (path) => fs.readFileSync(path, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map(JSON.parse);

const manifest = readJson('build/core-thesis/estate-lens-audit-manifest.json');
const objects = manifest.estates.flatMap((estate) =>
  readJson(`build/core-thesis/estate-lens-audit/estates/${estate.estate_id}.json`).objects
);
const mappings = readJsonl('data/project/estate-lens-mappings.jsonl');
const trackMap = readJsonl('data/estates/track-map.jsonl');

assert.equal(manifest.counts.estates, 24);
assert.equal(objects.filter((x) => x.object_kind === 'estate_root').length, 24);
assert.ok(objects.some((x) =>
  x.object_kind === 'case'
  && x.object_id === 'anduril-access-ownership'
  && x.mapping_state === 'explicit_mapped'
));
assert.ok(objects.some((x) => x.object_kind === 'source_route' && x.mapping_state === 'known_unmapped'));
assert.ok(objects.some((x) => x.ukraine_war_shock.state !== 'not_reached'));

const expectedTrackKeys = new Set(trackMap.flatMap((row) => [
  `${row.primary_estate_id}|${row.track_id}`,
  ...(row.related_estate_ids ?? []).map((estateId) => `${estateId}|${row.track_id}`),
]));
const mappedTrackKeys = new Set(objects
  .filter((x) => x.object_kind === 'research_track' && x.mapping_state === 'explicit_mapped')
  .map((x) => `${x.estate_id}|${x.object_id}`));

assert.deepEqual(
  [...mappedTrackKeys].sort(),
  [...expectedTrackKeys].sort(),
  'every declared research-track membership must have an explicit object mapping'
);
assert.equal(mappedTrackKeys.size, 29);

assert.equal(new Set(mappings.map((x) => x.mapping_id)).size, mappings.length, 'mapping_id values must be unique');
assert.equal(
  new Set(mappings.map((x) => `${x.estate_id}|${x.object_kind}|${x.object_id}`)).size,
  mappings.length,
  'estate/object mapping keys must be unique'
);
for (const row of mappings.filter((x) => x.object_kind === 'research_track')) {
  assert.deepEqual(
    row.basis_refs,
    [`data/research-tracks/${row.object_id}/harness.json`, 'data/estates/track-map.jsonl'],
    `${row.mapping_id}: research-track mapping basis`
  );
  assert.equal(fs.existsSync(row.basis_refs[0]), true, `${row.mapping_id}: missing harness`);
  assert.equal(row.mapping_status, 'explicit_object_mapping', row.mapping_id);
  assert.equal(row.graph_effect, 'none', row.mapping_id);
  assert.equal(row.conclusion_generated, false, row.mapping_id);
}

assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.equal(manifest.estate_completion_claimed, false);

console.log('estate-lens-audit.test: OK');
