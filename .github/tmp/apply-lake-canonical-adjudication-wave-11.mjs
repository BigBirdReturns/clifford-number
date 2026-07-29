#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const policyPath = 'data/project/lake-canonical-adjudication-wave-11-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const mutationPlan = JSON.parse(fs.readFileSync(policy.mutation_plan_path, 'utf8'));
const changedPaths = new Set();

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function verifyBaseline(file) {
  const row = mutationPlan.input_manifest.find(item => item.path === file);
  assert.ok(row, `${file}: baseline manifest row missing`);
  assert.equal(sha256File(file), row.sha256, `${file}: changed after Wave 11 adjudication was built`);
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
assert.equal(publicInterestMap.inventory.canonical.actors, mutationPlan.before.actor_rows);
assert.equal(publicInterestMap.inventory.canonical.organizations, mutationPlan.before.organization_rows);

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

const aliasKeys = new Set(aliasesDoc.aliases.map(row => `${row.kind}:${row.canonical_id}:${row.alias.toLowerCase()}`));
const globalAliasTerms = new Map();
for (const row of aliasesDoc.aliases) {
  const term = `${row.kind}:${row.alias.toLowerCase()}`;
  if (!globalAliasTerms.has(term)) globalAliasTerms.set(term, row.canonical_id);
  else assert.equal(globalAliasTerms.get(term), row.canonical_id, `${row.alias}: existing alias term is ambiguous`);
}
for (const row of mutationPlan.mutations.alias_additions) {
  const key = `${row.kind}:${row.canonical_id}:${row.alias.toLowerCase()}`;
  assert.ok(!aliasKeys.has(key), `${row.alias}: alias already exists on target`);
  const term = `${row.kind}:${row.alias.toLowerCase()}`;
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
  policy.decision_registry_path,
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
  '.github/tmp/lake-canonical-adjudication-wave-11-trigger.json',
  '.github/tmp/apply-lake-canonical-adjudication-wave-11.mjs',
  '.github/tmp/lake-canonical-adjudication-wave-11-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
lakePolicy.boundaries.canonical_record_proves_case_claims = false;
lakePolicy.boundaries.canonical_record_is_identity_bridge = false;
lakePolicy.boundaries.canonical_mutation_creates_participation = false;
lakePolicy.boundaries.canonical_mutation_creates_graph_relation = false;
lakePolicy.boundaries.canonical_mutation_creates_hop = false;
writeJson(lakePolicyPath, lakePolicy);

function appendSection(file, marker, section) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  fs.writeFileSync(file, `${source.trimEnd()}\n\n${section.trim()}\n`);
  changedPaths.add(file);
}

appendSection('BUILD-INSTRUCTIONS.md', '3.11 **Canonical acquisition adjudication', `3.11 **Canonical acquisition adjudication — Wave 11.**
Every canonical-acquisition candidate must receive a named decision against existing
IDs, labels, aliases, candidate collisions, custody, semantic type, and source
context. The evidence-sufficient, publicly inspectable, unambiguous subset may be
materialized immediately as reversible canonical records or aliases. Acronym-only,
contextual, conflicting, private-only, and nonidentity rows remain explicit holds
or typed reroutes; they do not wait for unspecified human permission.

Canonical expansion does not create participation, a relationship, a graph edge,
a hop, or a cross-case identity bridge. New active AXM identities are recorded in
\`data/project/lake-canonical-identity-extension-registry-wave-11.jsonl\` while the
Wave 06 migration registry remains an immutable 176-entity / 164-claim baseline.`);

appendSection('README.md', '## Canonical acquisition adjudication', `## Canonical acquisition adjudication

Wave 11 converts the typed acquisition queue into explicit canonical decisions.
Each candidate is classified as a new record, alias, duplicate, collision, bounded
hold, or nonidentity reroute. Only the source-custodied, publicly inspectable,
unambiguous subset is appended to the actor, organization, and alias registries.
Every refusal remains queryable with its blocker and correction route.

The expansion is identity-only and graph-inert: it creates no participation,
relationship, edge, hop, or automatic cross-case join. The original AXM Genesis
migration remains the historical baseline; later entities and aliases are carried
by a separate append-preserving extension registry.`);

const sourcePathFile = '.github/tmp/lake-canonical-adjudication-wave-11-source-paths.json';
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-canonical-adjudication-wave-11-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 11 canonical mutations, documentation, and lake policy applied: ${changedPaths.size} paths`);
console.log(`  actors / organizations / aliases added: ${mutationPlan.mutations.actor_additions.length} / ${mutationPlan.mutations.organization_additions.length} / ${mutationPlan.mutations.alias_additions.length}`);
console.log(`  cross-corpus canonical inventory: ${publicInterestMap.inventory.canonical.actors} actors / ${publicInterestMap.inventory.canonical.organizations} organizations`);
