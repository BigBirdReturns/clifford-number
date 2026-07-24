#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const writeJsonl = (p, rows) => fs.writeFileSync(p, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
const unique = (xs) => [...new Set(xs.filter(Boolean))];
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const mappingsPath = 'data/project/estate-lens-mappings.jsonl';
const caseMapPath = 'data/estates/case-map.jsonl';
const mappings = readJsonl(mappingsPath);
const caseMap = readJsonl(caseMapPath);

const key = (row) => `${row.object_kind}\u0000${row.object_id}\u0000${row.estate_id}`;
const keys = new Set(mappings.map(key));
const ids = new Set(mappings.map((row) => row.mapping_id));
const added = [];

const primaryEstate = (row) => row.primary_estate_id ?? row.primary_estate;
const relatedEstates = (row) => row.related_estate_ids ?? row.related_estates ?? [];

for (const caseRow of caseMap) {
  const caseId = caseRow.case_id;
  const primary = primaryEstate(caseRow);
  const source = mappings.find((row) => row.object_kind === 'case' && row.object_id === caseId && row.estate_id === primary);
  if (!source) throw new Error(`missing primary case mapping ${caseId}:${primary}`);
  for (const estateId of relatedEstates(caseRow)) {
    const candidate = {
      ...source,
      mapping_id: `map-case-${slug(caseId)}-${slug(estateId)}`,
      estate_id: estateId,
      rationale: `${source.rationale} This related-estate membership is explicitly declared in ${caseMapPath}; the case keeps its object-specific conversion stages rather than inheriting the estate root by proximity.`,
      basis_refs: unique([...(source.basis_refs ?? []), caseMapPath]),
    };
    if (!keys.has(key(candidate))) {
      if (ids.has(candidate.mapping_id)) throw new Error(`duplicate mapping id ${candidate.mapping_id}`);
      mappings.push(candidate); added.push(candidate); keys.add(key(candidate)); ids.add(candidate.mapping_id);
    }
  }
}

const primaryReportMappings = mappings.filter((row) => row.object_kind === 'report');
for (const source of primaryReportMappings) {
  const caseRow = caseMap.find((row) => {
    const refs = source.basis_refs ?? [];
    return source.object_id.includes(row.case_id) || refs.some((ref) => String(ref).includes(row.case_id));
  });
  if (!caseRow) throw new Error(`cannot resolve report ${source.object_id} to a case-map row`);
  const primary = primaryEstate(caseRow);
  if (source.estate_id !== primary) continue;
  for (const estateId of relatedEstates(caseRow)) {
    const candidate = {
      ...source,
      mapping_id: `map-report-${slug(source.object_id)}-${slug(estateId)}`,
      estate_id: estateId,
      rationale: `${source.rationale} The report belongs to this related estate through the report-bearing case declared in ${caseMapPath}; the report keeps its own analytical contract and does not create a new claim.`,
      basis_refs: unique([...(source.basis_refs ?? []), caseMapPath, 'build/report-frontier.json']),
    };
    if (!keys.has(key(candidate))) {
      if (ids.has(candidate.mapping_id)) throw new Error(`duplicate mapping id ${candidate.mapping_id}`);
      mappings.push(candidate); added.push(candidate); keys.add(key(candidate)); ids.add(candidate.mapping_id);
    }
  }
}

const addedCases = added.filter((row) => row.object_kind === 'case');
const addedReports = added.filter((row) => row.object_kind === 'report');
if (addedCases.length !== 8) throw new Error(`expected 8 case mappings, added ${addedCases.length}`);
if (addedReports.length !== 4) throw new Error(`expected 4 report mappings, added ${addedReports.length}`);
writeJsonl(mappingsPath, mappings);

const test = `#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const jsonl = (p) => fs.readFileSync(p, 'utf8').split(/\\r?\\n/).filter(Boolean).map((line) => JSON.parse(line));
const manifest = json('build/core-thesis/estate-lens-audit-manifest.json');
const audit = jsonl('build/core-thesis/estate-lens-audit.jsonl');
const mappings = jsonl('data/project/estate-lens-mappings.jsonl');
const caseMap = jsonl('data/estates/case-map.jsonl');
const trackMap = jsonl('data/estates/track-map.jsonl');
const sliceMap = jsonl('data/estates/slice-map.jsonl');

assert.equal(manifest.counts.estates, 24);
assert.equal(manifest.counts.known_object_memberships, 690);
assert.equal(manifest.counts.explicit_mapped, 124);
assert.equal(manifest.counts.known_unmapped, 424);
assert.equal(manifest.counts.unresolved, 142);
assert.equal(audit.length, 690);
assert.equal(new Set(mappings.map((row) => row.mapping_id)).size, mappings.length);
assert.equal(new Set(mappings.map((row) => [row.object_kind, row.object_id, row.estate_id].join('\\u0000'))).size, mappings.length);

for (const row of audit) {
  assert.equal(row.boundaries.promotes_to, 'candidate_only');
  assert.equal(row.boundaries.graph_effect, 'none');
  assert.equal(row.boundaries.conclusion_generated, false);
  assert.equal(row.boundaries.estate_completion_claimed, false);
}

const mapped = new Set(mappings.map((row) => [row.object_kind, row.object_id, row.estate_id].join('\\u0000')));
const primaryEstate = (row) => row.primary_estate_id ?? row.primary_estate;
const relatedEstates = (row) => row.related_estate_ids ?? row.related_estates ?? [];

const expectedCases = new Set();
for (const row of caseMap) for (const estateId of [primaryEstate(row), ...relatedEstates(row)]) expectedCases.add(['case', row.case_id, estateId].join('\\u0000'));
const mappedCases = new Set([...mapped].filter((value) => value.startsWith('case\\u0000')));
assert.deepEqual(mappedCases, expectedCases);
assert.equal(expectedCases.size, 12);

const reportRows = mappings.filter((row) => row.object_kind === 'report');
assert.equal(reportRows.length, 6);
for (const row of reportRows) {
  assert.ok(row.basis_refs.some((ref) => ref === 'build/report-frontier.json' || ref.includes('brief')));
  const auditRow = audit.find((x) => x.object_kind === 'report' && x.object_id === row.object_id && x.estate_id === row.estate_id);
  assert.equal(auditRow?.mapping_state, 'explicit_mapped');
}
for (const row of mappings.filter((x) => x.object_kind === 'case')) {
  assert.ok(row.basis_refs.some((ref) => ref.includes('case')));
  const auditRow = audit.find((x) => x.object_kind === 'case' && x.object_id === row.object_id && x.estate_id === row.estate_id);
  assert.equal(auditRow?.mapping_state, 'explicit_mapped');
}

const expectedTracks = new Set();
for (const row of trackMap) for (const estateId of [row.primary_estate_id, ...(row.related_estate_ids ?? [])]) expectedTracks.add(['research_track', row.track_id, estateId].join('\\u0000'));
const mappedTracks = new Set([...mapped].filter((value) => value.startsWith('research_track\\u0000')));
assert.deepEqual(mappedTracks, expectedTracks);
assert.equal(expectedTracks.size, 29);

const expectedSlices = new Set(sliceMap.map((row) => ['estate_slice', row.slice_id, row.estate_id].join('\\u0000')));
const mappedSlices = new Set([...mapped].filter((value) => value.startsWith('estate_slice\\u0000')));
assert.deepEqual(mappedSlices, expectedSlices);
assert.equal(expectedSlices.size, 53);

for (const row of mappings) {
  assert.ok(row.conversion_stage_ids?.length, row.mapping_id);
  assert.ok(row.rationale, row.mapping_id);
  assert.ok(row.decisive_records?.length, row.mapping_id);
  assert.ok(row.falsifiers?.length, row.mapping_id);
  assert.ok(row.basis_refs?.length, row.mapping_id);
}

console.log(JSON.stringify({
  ok: true,
  audit_rows: audit.length,
  mappings: mappings.length,
  cases: expectedCases.size,
  reports: reportRows.length,
  research_tracks: expectedTracks.size,
  estate_slices: expectedSlices.size,
  explicit_mapped: manifest.counts.explicit_mapped,
  known_unmapped: manifest.counts.known_unmapped,
  unresolved: manifest.counts.unresolved,
}, null, 2));
`;
fs.writeFileSync('test/estate-lens-audit.test.js', test);

fs.mkdirSync('docs/milestones', { recursive: true });
fs.writeFileSync('docs/milestones/m04c-h0-case-report-mappings.md', `# M-04C H0 · Case and report membership mappings\n\nThis orbital pass makes every declared case membership and every report-bearing case membership explicit across the twenty-four estates.\n\n\`\`\`text\n8 related-case mappings added\n4 related-report mappings added\n12 total case memberships explicit\n6 total report memberships explicit\n124 explicit object mappings expected\n424 known-but-unmapped objects expected\n142 unresolved objects expected\n\`\`\`\n\nThe same case or report keeps the same object-specific conversion stages across its declared related estates. Related-estate membership does not manufacture a new factual claim or inherit the estate root by proximity.\n\n\`\`\`text\npromotes_to: candidate_only\ngraph_effect: none\nconclusion_generated: false\nestate_completion_claimed: false\n\`\`\`\n`);

console.log(JSON.stringify({ added: added.length, cases: addedCases.length, reports: addedReports.length }, null, 2));
