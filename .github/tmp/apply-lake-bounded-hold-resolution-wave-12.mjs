#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const policyPath = 'data/project/lake-bounded-hold-resolution-wave-12-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const mutationPlan = JSON.parse(fs.readFileSync(policy.mutation_plan_path, 'utf8'));
const changedPaths = new Set();

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function verifyBaseline(file) {
  const row = mutationPlan.input_manifest.find(item => item.path === file);
  assert.ok(row, `${file}: baseline manifest row missing`);
  assert.equal(sha256File(file), row.sha256, `${file}: changed after Wave 12 resolution was built`);
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  changedPaths.add(file);
}

const publicInterestMapPath = 'data/research/clifford-cross-corpus-public-interest-map.json';
for (const file of ['data/canonical/actors.json', 'data/canonical/organizations.json', 'data/canonical/aliases.json', publicInterestMapPath]) verifyBaseline(file);
const actorsDoc = JSON.parse(fs.readFileSync('data/canonical/actors.json', 'utf8'));
const organizationsDoc = JSON.parse(fs.readFileSync('data/canonical/organizations.json', 'utf8'));
const aliasesDoc = JSON.parse(fs.readFileSync('data/canonical/aliases.json', 'utf8'));
const publicInterestMap = JSON.parse(fs.readFileSync(publicInterestMapPath, 'utf8'));
assert.equal(actorsDoc.actors.length, mutationPlan.before.actor_rows);
assert.equal(organizationsDoc.organizations.length, mutationPlan.before.organization_rows);
assert.equal(aliasesDoc.aliases.length, mutationPlan.before.alias_rows);
assert.equal(publicInterestMap.inventory.canonical.actors, mutationPlan.before.public_interest_actor_count);
assert.equal(publicInterestMap.inventory.canonical.organizations, mutationPlan.before.public_interest_organization_count);

const allIds = new Set([...actorsDoc.actors.map(row => row.id), ...organizationsDoc.organizations.map(row => row.id)]);
for (const row of mutationPlan.mutations.actor_additions) {
  assert.ok(!allIds.has(row.id), `${row.id}: canonical ID already exists`);
  allIds.add(row.id);
  actorsDoc.actors.push(row);
}
for (const row of mutationPlan.mutations.organization_additions) {
  assert.ok(!allIds.has(row.id), `${row.id}: canonical ID already exists`);
  allIds.add(row.id);
  organizationsDoc.organizations.push(row);
}

const aliasKeys = new Set(aliasesDoc.aliases.map(row => `${row.kind}:${row.canonical_id}:${String(row.alias).toLowerCase()}`));
const globalAliasTerms = new Map();
for (const row of aliasesDoc.aliases) {
  const term = `${row.kind}:${String(row.alias).toLowerCase()}`;
  if (!globalAliasTerms.has(term)) globalAliasTerms.set(term, row.canonical_id);
  else assert.equal(globalAliasTerms.get(term), row.canonical_id, `${row.alias}: existing alias term is ambiguous`);
}
for (const row of mutationPlan.mutations.alias_additions) {
  const key = `${row.kind}:${row.canonical_id}:${String(row.alias).toLowerCase()}`;
  assert.ok(!aliasKeys.has(key), `${row.alias}: alias already exists on target`);
  const term = `${row.kind}:${String(row.alias).toLowerCase()}`;
  if (globalAliasTerms.has(term)) assert.equal(globalAliasTerms.get(term), row.canonical_id, `${row.alias}: alias collides with another canonical target`);
  globalAliasTerms.set(term, row.canonical_id);
  aliasKeys.add(key);
  aliasesDoc.aliases.push(row);
}

assert.equal(actorsDoc.actors.length, mutationPlan.expected_after.actor_rows);
assert.equal(organizationsDoc.organizations.length, mutationPlan.expected_after.organization_rows);
assert.equal(aliasesDoc.aliases.length, mutationPlan.expected_after.alias_rows);
publicInterestMap.inventory.canonical.actors = mutationPlan.expected_after.actor_rows;
publicInterestMap.inventory.canonical.organizations = mutationPlan.expected_after.organization_rows;
writeJson('data/canonical/actors.json', actorsDoc);
writeJson('data/canonical/organizations.json', organizationsDoc);
writeJson('data/canonical/aliases.json', aliasesDoc);
writeJson(publicInterestMapPath, publicInterestMap);

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  policyPath,
  policy.source_registry_path,
  policy.decision_registry_path,
  policy.local_resolution_registry_path,
  policy.mutation_plan_path,
  policy.extension_registry_path,
  policy.receipt_path,
  policy.projection_path
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  policy.plan_path,
  policy.reconciliation_path,
  policy.report_path,
  policy.reconciliation_report_path,
  '.github/tmp/lake-bounded-hold-resolution-wave-12-trigger.json',
  '.github/tmp/apply-lake-bounded-hold-resolution-wave-12.mjs',
  '.github/tmp/lake-bounded-hold-resolution-wave-12-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
lakePolicy.boundaries.public_source_proves_every_case_claim = false;
lakePolicy.boundaries.local_canonical_resolution_is_cross_case_bridge = false;
lakePolicy.boundaries.local_canonical_resolution_merges_source_records = false;
lakePolicy.boundaries.local_canonical_resolution_creates_relationship = false;
lakePolicy.boundaries.local_canonical_resolution_creates_participation = false;
lakePolicy.boundaries.local_canonical_resolution_creates_hop = false;
lakePolicy.boundaries.cdao_selection_proves_performance_or_acceptance = false;
writeJson(lakePolicyPath, lakePolicy);

function appendSection(file, marker, section) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  fs.writeFileSync(file, `${source.trimEnd()}\n\n${section.trim()}\n`);
  changedPaths.add(file);
}
appendSection('BUILD-INSTRUCTIONS.md', '3.12 **Bounded-hold resolution', `3.12 **Bounded-hold resolution — Wave 12.**
A bounded hold is an acquisition target, not a permission gate. The complete hold
denominator must be attacked with repository-preserved or publicly inspectable
source custody. An explicit local-to-canonical assertion may be executed when the
local record, canonical reference, shared identity namespace, and unique target are
all present. Every accepted resolution remains reversible and source records are
not merged.

Local-to-canonical resolution is graph-inert. It does not create participation, a
relationship, a graph edge, a hop, or a cross-case identity bridge. Selection or
invitation to a program does not prove performance, acceptance, deployment, or a
particular award. New identities and aliases travel in a separate append-preserving
AXM extension registry.`);
appendSection('README.md', '## Bounded-hold resolution', `## Bounded-hold resolution

Wave 12 attacks the prior bounded holds directly. Acronyms, contextual local IDs,
municipal duplicates, and private-only company references receive explicit public
or repository-preserved source custody, local-to-canonical assertions, and named
correction routes. The two Arcadia municipal IDs resolve to one City of Arcadia
record; public company and CDAO sources replace private-only identity custody.

These are identity-resolution decisions only. They do not merge source records,
validate every case claim, establish program performance, create participation or
relationships, or enter the hop graph.`);

const sourcePathFile = '.github/tmp/lake-bounded-hold-resolution-wave-12-source-paths.json';
changedPaths.add(sourcePathFile);
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-bounded-hold-resolution-wave-12-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);
console.log(`Wave 12 bounded-hold mutations, documentation, and lake policy applied: ${changedPaths.size} paths`);
console.log(`  actors / organizations / aliases added: ${mutationPlan.mutations.actor_additions.length} / ${mutationPlan.mutations.organization_additions.length} / ${mutationPlan.mutations.alias_additions.length}`);
console.log(`  cross-corpus canonical inventory: ${publicInterestMap.inventory.canonical.actors} actors / ${publicInterestMap.inventory.canonical.organizations} organizations`);
