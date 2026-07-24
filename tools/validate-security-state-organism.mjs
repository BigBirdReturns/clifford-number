#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const fail = (message) => { throw new Error(message); };
const unique = (rows, key, label) => {
  const set = new Set();
  for (const row of rows) {
    const value = row[key];
    if (!value || set.has(value)) fail(`${label} duplicate or missing ${key}: ${value}`);
    set.add(value);
  }
  return set;
};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const fingerprint = (value) => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const exactCounts = (rows, key) => Object.fromEntries([...rows.reduce((m, row) => m.set(row[key], (m.get(row[key]) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const program = read('data/project/security-state-organism-program.json');
const registry = read('data/project/security-state-entity-registry.json');
const routes = read('data/intake/security-state-organism-source-routes.json');
const alignment = read('data/project/security-state-estate-alignment.json');
const work = read('data/project/security-state-work-packages.json');
const evidence = read('data/intake/security-state-organism-evidence-intake.json');
const manifest = read('build/core-thesis/security-state-organism/manifest.json');
const issuePlan = read('build/core-thesis/security-state-organism/issue-plan.json');
const publicData = read('reports/core-thesis/security-state-organism/data.json');

if (program.schema_version !== 'security-state-organism-program@2') fail('program schema');
if (registry.schema_version !== 'security-state-entity-registry@2') fail('registry schema');
if (routes.schema_version !== 'security-state-organism-source-routes@2') fail('routes schema');
if (alignment.schema_version !== 'security-state-estate-alignment@2') fail('alignment schema');
if (work.schema_version !== 'security-state-work-packages@2') fail('work package schema');
if (evidence.schema_version !== 'security-state-organism-evidence-intake@1') fail('evidence schema');

if (program.lineage_stages.length !== 8) fail('8 lineage stages required');
if (program.organ_types.length !== 15) fail('15 organs required');
if (program.organism_tests.length !== 8) fail('8 organism tests required');
if (program.theaters.length !== 7) fail('7 theaters required');
if (registry.entities.length !== 41) fail('41 entities required');
if (routes.routes.length !== 82) fail('82 routes required');
if (alignment.estates.length !== 24) fail('24 estates required');
if (work.packages.length !== 121) fail('121 packages required');
if (evidence.records.length !== 17) fail('17 source-bounded evidence records required');
if (issuePlan.issues.length !== 61) fail('61 issue groups required');
if (issuePlan.estate_handoffs.length !== 24) fail('24 estate handoffs required');

const expectedClassCounts = { cross_estate_bridge: 18, entity: 41, estate: 24, lineage_stage: 8, organ: 15, organism_test: 8, theater: 7 };
if (!same(exactCounts(work.packages, 'package_class'), expectedClassCounts)) fail('package class counts');
const expectedRouting = { derived_from_explicit_registry: 39, methodological_scope: 8, source_explicit_candidate: 41, title_explicit_candidate_targets: 18, unresolved_target_selection: 15 };
if (!same(exactCounts(work.packages.map((x) => ({ status: x.routing.status })), 'status'), expectedRouting)) fail('routing status counts');

const requiredBoundary = {
  promotes_to: 'candidate_only',
  graph_effect: 'none',
  conclusion_generated: false,
  estate_completion_claimed: false,
  shared_investor_proves_common_design: false,
  shared_personnel_proves_coordination: false,
  deployment_in_one_theater_proves_transfer: false,
  founder_ideology_proves_operational_effect: false,
  profit_proves_self_dealing: false,
  national_security_need_proves_abuse: false,
  route_presence_proves_relationship: false,
  deterministic_generation_proves_evidence: false,
  packet_count_proves_coverage: false,
  synthetic_routing_allowed: false,
};
const assertBoundary = (b, where) => {
  if (!b || typeof b !== 'object') fail(`${where}: missing boundary`);
  for (const [key, value] of Object.entries(requiredBoundary)) if (b[key] !== value) fail(`${where}: boundary drift ${key}`);
};
for (const [where, b] of [
  ['program', program.boundaries], ['registry', registry.boundaries], ['routes', routes.boundaries],
  ['alignment', alignment.boundaries], ['work', work.boundaries], ['evidence', evidence.boundaries], ['manifest', manifest.boundaries],
]) assertBoundary(b, where);
for (const p of work.packages) assertBoundary(p.boundaries, p.package_id);
for (const r of evidence.records) assertBoundary(r.boundaries, r.evidence_id);
for (const e of alignment.estates) assertBoundary(e.boundaries, e.estate_id);

const stageIds = unique(program.lineage_stages, 'stage_id', 'stage');
const organIds = unique(program.organ_types, 'organ_id', 'organ');
const testIds = unique(program.organism_tests, 'test_id', 'test');
const theaterIds = unique(program.theaters, 'theater_id', 'theater');
const entityIds = unique(registry.entities, 'entity_id', 'entity');
const routeIds = unique(routes.routes, 'route_id', 'route');
const estateIds = unique(alignment.estates, 'estate_id', 'estate');
const packageIds = unique(work.packages, 'package_id', 'package');
const evidenceIds = unique(evidence.records, 'evidence_id', 'evidence');

for (const entity of registry.entities) {
  if ('candidate_organs' in entity || 'candidate_estates' in entity) fail(`${entity.entity_id}: legacy candidate key`);
  if (!Array.isArray(entity.candidate_organ_ids) || !Array.isArray(entity.candidate_estate_ids)) fail(`${entity.entity_id}: candidate arrays`);
  if (entity.routing?.synthetic_assignment !== false || entity.routing?.status !== 'source_explicit_candidate') fail(`${entity.entity_id}: entity routing`);
  for (const id of entity.candidate_organ_ids) if (!organIds.has(id)) fail(`${entity.entity_id}: unknown organ ${id}`);
  for (const id of entity.candidate_estate_ids) if (!estateIds.has(id)) fail(`${entity.entity_id}: unknown estate ${id}`);
  for (const id of entity.primary_source_routes) if (!routeIds.has(id)) fail(`${entity.entity_id}: unknown route ${id}`);
}
for (const id of ['alias-bvc', 'alias-a17']) if (registry.entities.find((x) => x.entity_id === id)?.resolution_state !== 'alias_unresolved') fail(`${id}: must remain unresolved`);
for (const id of ['traysar-industries-ltd', 'silent-capital']) if (!['legal_entity_pending', 'alias_unresolved', 'umbrella_resolved_vehicle_pending'].includes(registry.entities.find((x) => x.entity_id === id)?.resolution_state)) fail(`${id}: identity boundary`);

const prohibitedUrls = new Set(['https://www.usa.gov/', 'https://www.usa.gov']);
const allowedLocatorStates = new Set(['source_bounded_locator', 'candidate_system_locator', 'candidate_first_party_locator', 'unresolved_locator']);
for (const route of routes.routes) {
  if (!allowedLocatorStates.has(route.locator_status)) fail(`${route.route_id}: locator status`);
  if (route.url && (!route.url.startsWith('https://') || prohibitedUrls.has(route.url))) fail(`${route.route_id}: invalid or generic URL`);
  if (route.locator_status === 'unresolved_locator' && (route.url !== null || !route.acquisition_query)) fail(`${route.route_id}: unresolved route must remain null with acquisition query`);
  if (route.locator_status !== 'unresolved_locator' && !route.url) fail(`${route.route_id}: locator missing URL`);
  for (const locator of route.locators) if (!locator.url?.startsWith('https://') || prohibitedUrls.has(locator.url)) fail(`${route.route_id}: bad locator`);
}
if (routes.routes.filter((x) => x.locator_status === 'unresolved_locator').length < 1) fail('unresolved locators must be preserved');

const evidenceById = new Map(evidence.records.map((x) => [x.evidence_id, x]));
const packageById = new Map(work.packages.map((x) => [x.package_id, x]));
for (const record of evidence.records) {
  if (!routeIds.has(record.source_route_id)) fail(`${record.evidence_id}: unknown route`);
  if (!record.source_url.startsWith('https://') || prohibitedUrls.has(record.source_url)) fail(`${record.evidence_id}: source URL`);
  const route = routes.routes.find((x) => x.route_id === record.source_route_id);
  if (!route.locators.some((x) => x.url === record.source_url)) fail(`${record.evidence_id}: source URL absent from route locator ledger`);
  if (!record.observation || !record.supports.length || !record.does_not_support.length || !record.next_acquisition) fail(`${record.evidence_id}: incomplete evidence boundary`);
  for (const id of record.subject_ids) if (!entityIds.has(id)) fail(`${record.evidence_id}: unknown subject ${id}`);
  for (const id of record.packet_ids) {
    if (!packageIds.has(id)) fail(`${record.evidence_id}: unknown packet ${id}`);
    if (!packageById.get(id).evidence_record_ids.includes(record.evidence_id)) fail(`${record.evidence_id}: packet backlink missing ${id}`);
  }
}

for (const packet of work.packages) {
  if (!packet.priority_basis || !packet.proof_question || !packet.falsifier) fail(`${packet.package_id}: incomplete proof contract`);
  if (packet.routing?.synthetic_assignment !== false) fail(`${packet.package_id}: synthetic assignment`);
  if (!packet.routing.status || !Array.isArray(packet.routing.basis_records) || !packet.routing.basis_records.length) fail(`${packet.package_id}: routing basis`);
  if (!packet.required_records.length || !packet.required_outputs.length || !packet.terminal_states.includes('falsified')) fail(`${packet.package_id}: incomplete outputs or terminals`);
  for (const id of packet.estate_ids) if (!estateIds.has(id)) fail(`${packet.package_id}: unknown estate ${id}`);
  for (const id of packet.entity_ids) if (!entityIds.has(id)) fail(`${packet.package_id}: unknown entity ${id}`);
  for (const id of packet.organ_ids) if (!organIds.has(id)) fail(`${packet.package_id}: unknown organ ${id}`);
  for (const id of packet.lineage_stage_ids) if (!stageIds.has(id)) fail(`${packet.package_id}: unknown stage ${id}`);
  for (const id of packet.theater_ids) if (!theaterIds.has(id)) fail(`${packet.package_id}: unknown theater ${id}`);
  for (const id of packet.test_ids) if (!testIds.has(id)) fail(`${packet.package_id}: unknown test ${id}`);
  for (const id of packet.source_route_ids) if (!routeIds.has(id)) fail(`${packet.package_id}: unknown route ${id}`);
  for (const id of packet.evidence_record_ids) {
    if (!evidenceIds.has(id)) fail(`${packet.package_id}: unknown evidence ${id}`);
    if (!evidenceById.get(id).packet_ids.includes(packet.package_id)) fail(`${packet.package_id}: evidence backlink missing ${id}`);
  }
  if (packet.routing.status === 'unresolved_target_selection' && [...packet.estate_ids, ...packet.entity_ids, ...packet.organ_ids, ...packet.source_route_ids].length) fail(`${packet.package_id}: unresolved target selection contains unsupported target assignment`);
}

for (const estate of alignment.estates) {
  if (estate.priority !== 'unranked') fail(`${estate.estate_id}: synthetic priority prohibited`);
  if (estate.routing?.synthetic_assignment !== false || estate.routing?.status !== 'derived_from_explicit_registry') fail(`${estate.estate_id}: estate routing`);
  const packet = packageById.get(`EST-${estate.estate_id}`);
  if (!packet) fail(`${estate.estate_id}: missing estate packet`);
  if (!same(estate.candidate_entity_ids, packet.entity_ids) || !same(estate.candidate_organ_ids, packet.organ_ids) || !same(estate.lineage_stage_ids, packet.lineage_stage_ids) || !same(estate.theater_ids, packet.theater_ids) || !same(estate.source_route_ids, packet.source_route_ids)) fail(`${estate.estate_id}: alignment drift`);
}

unique(issuePlan.issues, 'issue_id', 'issue');
for (const issue of issuePlan.issues) {
  if (!issue.issue_id || !issue.issue_class || !issue.title || !issue.purpose || !issue.package_ids.length) fail(`issue plan incomplete ${issue.issue_id}`);
  for (const id of issue.package_ids) if (!packageIds.has(id)) fail(`${issue.issue_id}: unknown packet ${id}`);
}
if (issuePlan.issues.filter((x) => x.issue_class === 'cluster_index').length !== 12) fail('cluster issue count');
for (const handoff of issuePlan.estate_handoffs) {
  if (!estateIds.has(handoff.estate_id) || !packageIds.has(handoff.package_id)) fail(`handoff drift ${handoff.estate_id}`);
  if (handoff.package_id !== `EST-${handoff.estate_id}`) fail(`handoff mismatch ${handoff.estate_id}`);
}

const expectedFingerprint = fingerprint({ program, registry, routes, alignment, work, evidence });
if (manifest.source_fingerprint !== expectedFingerprint || issuePlan.source_fingerprint !== expectedFingerprint || publicData.source_fingerprint !== expectedFingerprint) fail('source fingerprint drift');
if (manifest.counts.packages !== 121 || manifest.counts.evidence_records !== 17 || manifest.counts.issue_groups !== 61 || manifest.counts.estate_handoffs !== 24) fail('manifest count drift');
if (publicData.packages.length !== 121 || publicData.evidence.length !== 17 || publicData.routes.length !== 82) fail('public data drift');
for (const packet of work.packages) if (!fs.existsSync(path.join(root, 'build/core-thesis/security-state-organism/packets', `${packet.package_id}.md`))) fail(`missing packet projection ${packet.package_id}`);
if (!fs.existsSync(path.join(root, 'reports/core-thesis/security-state-organism/index.html'))) fail('missing atlas');

const builderSource = fs.readFileSync(path.join(root, 'tools/build-security-state-organism.mjs'), 'utf8');
const dispatcherSource = fs.readFileSync(path.join(root, 'tools/dispatch-security-state-organism.mjs'), 'utf8');
for (const [label, source] of [['builder', builderSource]]) {
  if (source.includes('https://www.usa.gov/')) fail(`${label}: generic placeholder embedded`);
  if (/\b(?:round.?robin|count.?balanc|synthetic.?coverage)\b/i.test(source)) fail(`${label}: synthetic routing vocabulary`);
}
for (const required of ["GITHUB_ACTIONS === 'true'", "GITHUB_EVENT_NAME === 'push'", "GITHUB_REF === 'refs/heads/main'", "group.issue_class === 'cluster_index'", "`ENTITY-${group.issue_id.replace('CLUSTER-', '')}`", 'multiple current or legacy issue lanes found', 'multiple current or legacy estate handoffs found']) {
  if (!dispatcherSource.includes(required)) fail(`dispatcher integrity guard missing: ${required}`);
}
for (const p of [
  '.github/temporary/m04b-organism',
  '.github/temporary/m04b-organism-v2',
  '.github/temporary/m04b-integrity-repair',
  '.github/temporary/security-state-lineage',
  '.github/temporary/security-state-lineage-v2',
  '.github/workflows/temporary-m04b-organism-materialize.yml',
  '.github/workflows/temporary-m04b-organism-materialize-v2.yml',
  '.github/workflows/temporary-m04b-integrity-repair.yml',
  '.github/workflows/temporary-security-state-lineage-materialize.yml',
]) if (fs.existsSync(path.join(root, p))) fail(`transport remains ${p}`);

console.log(JSON.stringify({
  ok: true,
  source_fingerprint: expectedFingerprint,
  packages: work.packages.length,
  evidence_records: evidence.records.length,
  routes: routes.routes.length,
  unresolved_locators: routes.routes.filter((x) => x.locator_status === 'unresolved_locator').length,
  estates: alignment.estates.length,
  issue_groups: issuePlan.issues.length,
  estate_handoffs: issuePlan.estate_handoffs.length,
}, null, 2));
