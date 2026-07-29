#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-subject-ontology-routing-wave-10-policy.json';
const full = relative => path.join(root, relative);
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}

function readJsonl(relative) {
  try {
    return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`line ${index + 1}: ${error.message}`); }
    });
  } catch (error) {
    fail(`${relative}: ${error.message}`);
    return [];
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function sortObject(object) {
  return Object.fromEntries(Object.entries(object ?? {}).sort(([left], [right]) => left.localeCompare(right)));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const projection = readJson(policy.projection_path);
const routingRows = readJsonl(policy.routing_registry_path);
const canonicalRows = readJsonl(policy.canonical_acquisition_queue_path);
const noncanonicalRows = readJsonl(policy.noncanonical_routing_registry_path);
const actors = readJson('data/canonical/actors.json')?.actors ?? [];
const organizations = readJson('data/canonical/organizations.json')?.organizations ?? [];
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const hopGraph = readJson('build/hop-graph.json');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path))
  ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';

if (policy.schema_version !== 'lake-subject-ontology-routing-wave-10-policy@1') fail('unexpected Wave 10 policy schema');
if (plan?.schema_version !== 'lake-subject-ontology-routing-wave-10-plan@1') fail('unexpected Wave 10 plan schema');
if (receipt?.schema_version !== 'lake-subject-ontology-routing-wave-10@1') fail('unexpected Wave 10 receipt schema');
if (reconciliation?.schema_version !== 'lake-subject-ontology-routing-wave-10-reconciliation@1') fail('unexpected Wave 10 reconciliation schema');
if (projection?.schema_version !== 'subject-ontology-routing-index-wave-10@1') fail('unexpected Wave 10 projection schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key
  || reconciliation?.program_key !== policy.program_key || projection?.program_key !== policy.program_key) fail('Wave 10 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 10 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 10 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 10 reconciliation fingerprint mismatch');

if (routingRows.length !== policy.expected.target_rows) fail(`Wave 10 routing denominator drift: ${routingRows.length}`);
if (canonicalRows.length + noncanonicalRows.length !== routingRows.length) fail('Wave 10 canonical/noncanonical partition is incomplete');
if (new Set(routingRows.map(row => row.routing_id)).size !== routingRows.length) fail('duplicate Wave 10 routing ID');
if (new Set(canonicalRows.map(row => row.acquisition_id)).size !== canonicalRows.length) fail('duplicate Wave 10 acquisition ID');
if (new Set(noncanonicalRows.map(row => row.route_id)).size !== noncanonicalRows.length) fail('duplicate Wave 10 noncanonical route ID');

const orderedRouting = [...routingRows].sort((left, right) => (right.priority_score - left.priority_score)
  || `${left.case_id}\0${left.identity_value}`.localeCompare(`${right.case_id}\0${right.identity_value}`));
const orderedCanonical = [...canonicalRows].sort((left, right) => (right.priority_score - left.priority_score)
  || left.acquisition_id.localeCompare(right.acquisition_id));
const orderedNoncanonical = [...noncanonicalRows].sort((left, right) => (right.priority_score - left.priority_score)
  || left.route_id.localeCompare(right.route_id));
try { assert.deepEqual(projection?.routing_rows, orderedRouting); } catch { fail('Wave 10 routing projection disagrees with source registry'); }
try { assert.deepEqual(projection?.canonical_acquisition_queue, orderedCanonical); } catch { fail('Wave 10 canonical projection disagrees with source registry'); }
try { assert.deepEqual(projection?.noncanonical_routing_rows, orderedNoncanonical); } catch { fail('Wave 10 noncanonical projection disagrees with source registry'); }
if (projection?.source_paths?.routing_registry !== policy.routing_registry_path) fail('Wave 10 projected routing source path drift');
if (projection?.source_paths?.canonical_acquisition_queue !== policy.canonical_acquisition_queue_path) fail('Wave 10 projected acquisition source path drift');
if (projection?.source_paths?.noncanonical_routing_registry !== policy.noncanonical_routing_registry_path) fail('Wave 10 projected noncanonical source path drift');

const allowedTypes = new Set(policy.semantic_types);
const allowedConfidences = new Set(['high', 'medium', 'low']);
const allowedPriorities = new Set(['P0', 'P1', 'P2', 'P3']);
const routingById = new Map(routingRows.map(row => [row.routing_id, row]));
const typeCounts = {};
const confidenceCounts = {};
const routeCounts = {};
const priorityCounts = {};
for (const row of routingRows) {
  if (!row.routing_id) fail('Wave 10 routing row missing ID');
  if (!allowedTypes.has(row.semantic_type)) fail(`${row.routing_id}: unknown semantic type ${row.semantic_type}`);
  if (row.destination_registry !== policy.routes[row.semantic_type]) fail(`${row.routing_id}: destination does not match policy`);
  if (!allowedConfidences.has(row.typing_confidence)) fail(`${row.routing_id}: invalid confidence ${row.typing_confidence}`);
  if (!row.typing_rule_id || !row.typing_rationale) fail(`${row.routing_id}: typing rule or rationale missing`);
  if (!(Number.isInteger(row.priority_score) && row.priority_score > 0)) fail(`${row.routing_id}: priority score missing`);
  if (!allowedPriorities.has(row.priority_band)) fail(`${row.routing_id}: invalid priority band ${row.priority_band}`);
  if (row.canonical_acquisition_eligible !== (['actor_candidate', 'organization_candidate'].includes(row.semantic_type) && row.source_custody_present === true)) {
    fail(`${row.routing_id}: canonical acquisition eligibility drift`);
  }
  if (row.canonical_mutation_applied !== false || row.accepted_identity_bridge !== false) fail(`${row.routing_id}: mutation or identity bridge overclaimed`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.routing_id}: human-permission dependency remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.routing_id}: correction route missing`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false) fail(`${row.routing_id}: join boundary drift`);
  if (row.graph_effect !== 'none') fail(`${row.routing_id}: graph effect created`);
  typeCounts[row.semantic_type] = (typeCounts[row.semantic_type] ?? 0) + 1;
  confidenceCounts[row.typing_confidence] = (confidenceCounts[row.typing_confidence] ?? 0) + 1;
  routeCounts[row.destination_registry] = (routeCounts[row.destination_registry] ?? 0) + 1;
  priorityCounts[row.priority_band] = (priorityCounts[row.priority_band] ?? 0) + 1;
}

const actorIds = new Set(actors.map(row => row.id));
const organizationIds = new Set(organizations.map(row => row.id));
const canonicalRoutingIds = new Set();
for (const row of canonicalRows) {
  const source = routingById.get(row.source_routing_id);
  if (!source) { fail(`${row.acquisition_id}: source routing row missing`); continue; }
  canonicalRoutingIds.add(row.source_routing_id);
  if (!['actor_candidate', 'organization_candidate'].includes(source.semantic_type)) fail(`${row.acquisition_id}: non-identity type entered canonical acquisition`);
  if (source.canonical_acquisition_eligible !== true || source.source_custody_present !== true) fail(`${row.acquisition_id}: source route is not custodied and canonical-eligible`);
  const expectedKind = source.semantic_type === 'actor_candidate' ? 'actor' : 'organization';
  if (row.candidate_kind !== expectedKind) fail(`${row.acquisition_id}: candidate kind drift`);
  if (row.source_custody_present !== true) fail(`${row.acquisition_id}: source custody missing`);
  if (row.status !== 'acquisition_candidate_only') fail(`${row.acquisition_id}: acquisition status drift`);
  if (row.canonical_mutation_applied !== false || row.accepted_identity_bridge !== false) fail(`${row.acquisition_id}: mutation or bridge overclaimed`);
  if (actorIds.has(row.identity_value) || organizationIds.has(row.identity_value)) fail(`${row.acquisition_id}: candidate already exists in canonical registry`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.acquisition_id}: decision or correction contract drift`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false || row.graph_effect !== 'none') fail(`${row.acquisition_id}: graph/join boundary drift`);
}

const noncanonicalRoutingIds = new Set();
for (const row of noncanonicalRows) {
  const source = routingById.get(row.source_routing_id);
  if (!source) { fail(`${row.route_id}: source routing row missing`); continue; }
  noncanonicalRoutingIds.add(row.source_routing_id);
  if (source.canonical_acquisition_eligible !== false) fail(`${row.route_id}: canonical-eligible row routed noncanonically`);
  if (row.semantic_type !== source.semantic_type || row.destination_registry !== source.destination_registry) fail(`${row.route_id}: source type or destination drift`);
  const expectedStatus = row.semantic_type === 'unresolved_name_like' ? 'bounded_acquisition_required' : 'typed_routing_decision';
  if (row.status !== expectedStatus) fail(`${row.route_id}: noncanonical status drift`);
  if (row.canonical_mutation_applied !== false || row.accepted_identity_bridge !== false) fail(`${row.route_id}: mutation or bridge overclaimed`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.route_id}: decision or correction contract drift`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false || row.graph_effect !== 'none') fail(`${row.route_id}: graph/join boundary drift`);
}
if (new Set([...canonicalRoutingIds, ...noncanonicalRoutingIds]).size !== routingRows.length) fail('Wave 10 routing partition lost or duplicated rows');

const sortedTypeCounts = sortObject(typeCounts);
const sortedConfidenceCounts = sortObject(confidenceCounts);
const sortedRouteCounts = sortObject(routeCounts);
const sortedPriorityCounts = sortObject(priorityCounts);
try { assert.deepEqual(projection?.semantic_type_counts, sortedTypeCounts); } catch { fail('Wave 10 projected semantic-type counts drift'); }
try { assert.deepEqual(projection?.confidence_counts, sortedConfidenceCounts); } catch { fail('Wave 10 projected confidence counts drift'); }
try { assert.deepEqual(projection?.route_counts, sortedRouteCounts); } catch { fail('Wave 10 projected route counts drift'); }
try { assert.deepEqual(projection?.priority_counts, sortedPriorityCounts); } catch { fail('Wave 10 projected priority counts drift'); }
if (projection?.counts?.routing_rows !== routingRows.length || projection?.counts?.canonical_acquisition_rows !== canonicalRows.length
  || projection?.counts?.noncanonical_routing_rows !== noncanonicalRows.length) fail('Wave 10 projected partition counts drift');
if (projection?.counts?.canonical_mutations_applied !== 0 || projection?.counts?.accepted_identity_bridges !== 0) fail('Wave 10 projection overclaims mutation or bridge');

try { assert.deepEqual(receipt?.semantic_type_counts, sortedTypeCounts); } catch { fail('Wave 10 receipt type counts drift'); }
try { assert.deepEqual(receipt?.confidence_counts, sortedConfidenceCounts); } catch { fail('Wave 10 receipt confidence counts drift'); }
try { assert.deepEqual(receipt?.route_counts, sortedRouteCounts); } catch { fail('Wave 10 receipt route counts drift'); }
try { assert.deepEqual(receipt?.priority_counts, sortedPriorityCounts); } catch { fail('Wave 10 receipt priority counts drift'); }
if (receipt?.counts?.target_rows !== routingRows.length || receipt?.counts?.canonical_acquisition_rows !== canonicalRows.length
  || receipt?.counts?.noncanonical_routing_rows !== noncanonicalRows.length) fail('Wave 10 receipt partition counts drift');
if (receipt?.counts?.canonical_mutations_applied !== 0 || receipt?.counts?.accepted_identity_bridges !== 0
  || receipt?.counts?.graph_effects_created !== 0) fail('Wave 10 receipt overclaims effect');
if (receipt?.decisions_requiring_human_permission !== 0) fail('Wave 10 receipt human-permission count drift');

if (plan?.routing?.routing_registry_path !== policy.routing_registry_path
  || plan?.routing?.canonical_acquisition_queue_path !== policy.canonical_acquisition_queue_path
  || plan?.routing?.noncanonical_routing_registry_path !== policy.noncanonical_routing_registry_path
  || plan?.routing?.projection_path !== policy.projection_path) fail('Wave 10 plan source paths drift');
if (plan?.completion?.every_target_row_typed_and_routed !== true || plan?.completion?.canonical_acquisition_queue_present !== true
  || plan?.completion?.noncanonical_routing_registry_present !== true || plan?.completion?.unresolved_rows_preserved !== true) fail('Wave 10 plan completion flags missing');
if (plan?.completion?.canonical_mutations_applied !== 0 || plan?.completion?.accepted_identity_bridges !== 0
  || plan?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 10 plan effect or permission counts drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.routing_registry_path, policy.canonical_acquisition_queue_path, policy.noncanonical_routing_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
for (const relative of [policy.routing_registry_path, policy.canonical_acquisition_queue_path, policy.noncanonical_routing_registry_path]) {
  if (fileByPath.get(relative)?.index_file !== true) fail(`${relative}: source registry is not an index surface`);
}
const projectionFile = fileByPath.get(policy.projection_path);
if (!projectionFile) fail('Wave 10 generated projection lake row missing');
else {
  if (projectionFile.generated !== true) fail('Wave 10 projection not marked generated');
  if (projectionFile.index_file !== true) fail('Wave 10 projection is not an index surface');
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function verifyRows(rows, idKey, idField, sourcePath) {
  let observed = 0;
  for (const row of rows) {
    const value = row[idField];
    const object = objectByKey.get(`${idKey}:${value}`);
    if (!object) { fail(`${value}: lake object missing`); continue; }
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${value}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === sourcePath && item.generated === false)) fail(`${value}: source registry occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.projection_path && item.generated === true)) fail(`${value}: generated projection occurrence missing`);
    observed += 1;
  }
  return observed;
}
const routingObserved = verifyRows(routingRows, 'routing_id', 'routing_id', policy.routing_registry_path);
const acquisitionObserved = verifyRows(canonicalRows, 'acquisition_id', 'acquisition_id', policy.canonical_acquisition_queue_path);
const noncanonicalObserved = verifyRows(noncanonicalRows, 'route_id', 'route_id', policy.noncanonical_routing_registry_path);

if (/SUBJROUTE-|CANACQ-|NONCANON-|subject-ontology-routing/i.test(JSON.stringify(hopGraph))) fail('Wave 10 routing identifiers leaked into active topology');

if (reconciliation?.after?.routing_rows !== routingRows.length || reconciliation?.after?.canonical_acquisition_rows !== canonicalRows.length
  || reconciliation?.after?.noncanonical_routing_rows !== noncanonicalRows.length) fail('Wave 10 reconciliation partition counts drift');
try { assert.deepEqual(reconciliation?.after?.semantic_type_counts, sortedTypeCounts); } catch { fail('Wave 10 reconciliation type counts drift'); }
try { assert.deepEqual(reconciliation?.after?.confidence_counts, sortedConfidenceCounts); } catch { fail('Wave 10 reconciliation confidence counts drift'); }
try { assert.deepEqual(reconciliation?.after?.route_counts, sortedRouteCounts); } catch { fail('Wave 10 reconciliation route counts drift'); }
try { assert.deepEqual(reconciliation?.after?.priority_counts, sortedPriorityCounts); } catch { fail('Wave 10 reconciliation priority counts drift'); }
if (reconciliation?.after?.routing_ids_source_projection_and_index_observed !== routingRows.length
  || reconciliation?.after?.acquisition_ids_source_projection_and_index_observed !== canonicalRows.length
  || reconciliation?.after?.noncanonical_route_ids_source_projection_and_index_observed !== noncanonicalRows.length) fail('Wave 10 reconciliation observation counts drift');
if (reconciliation?.after?.canonical_mutations_applied !== 0 || reconciliation?.after?.accepted_identity_bridges !== 0
  || reconciliation?.after?.routing_tokens_in_active_hop_graph !== 0) fail('Wave 10 reconciliation overclaims effects');
if (reconciliation?.after?.automatic_cross_case_join_authorized !== false
  || reconciliation?.after?.cross_case_graph_join_authorized !== false
  || reconciliation?.after?.cross_case_hop_creation_authorized !== false) fail('Wave 10 reconciliation overclaims join authority');

for (const field of [
  'every_target_row_typed_and_routed',
  'source_and_projection_registries_agree',
  'every_routing_id_source_projection_and_index_observed',
  'every_acquisition_id_source_projection_and_index_observed',
  'every_noncanonical_route_id_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'canonical_acquisition_queue_present',
  'noncanonical_routing_registry_present',
  'unresolved_rows_preserved',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 10 completion ${field} missing`);
if (reconciliation?.completion?.canonical_mutations_applied !== 0 || reconciliation?.completion?.accepted_identity_bridges !== 0
  || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 10 completion effect or permission counts drift');
if (reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('Wave 10 completion overclaims truth or publication');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.semantic_type_proves_real_world_identity !== false) fail(`${name}: semantic-type identity boundary missing`);
  if (boundaries?.actor_candidate_is_canonical_actor !== false) fail(`${name}: actor-candidate boundary missing`);
  if (boundaries?.organization_candidate_is_canonical_organization !== false) fail(`${name}: organization-candidate boundary missing`);
  if (boundaries?.routing_destination_creates_relationship !== false || boundaries?.routing_destination_creates_hop !== false) fail(`${name}: relationship/hop boundary missing`);
  if (boundaries?.canonical_mutation_applied !== false || boundaries?.accepted_identity_bridge !== false) fail(`${name}: mutation/bridge boundary drift`);
  if (boundaries?.automatic_cross_case_join_authorized !== false || boundaries?.cross_case_graph_join_authorized !== false
    || boundaries?.cross_case_hop_creation_authorized !== false) fail(`${name}: join boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph effect boundary drift`);
}

if (!report.includes('canonical mutations applied:                 0')) fail('Wave 10 report lacks zero-mutation result');
if (!report.includes('accepted identity bridges:                   0')) fail('Wave 10 report lacks zero-bridge result');
if (!reconciliationReport.includes(`routing IDs source/projection/indexed:      ${routingRows.length}`)) fail('Wave 10 reconciliation report lacks routing observation count');
if (!reconciliationReport.includes('canonical mutations applied:                0')) fail('Wave 10 reconciliation report lacks mutation boundary');

if (errors.length) {
  console.error(`subject ontology routing Wave 10 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('subject ontology routing Wave 10 validation: OK');
console.log(`  routing / canonical / noncanonical: ${routingRows.length} / ${canonicalRows.length} / ${noncanonicalRows.length}`);
console.log(`  routing / acquisition / noncanonical observed: ${routingObserved}/${routingRows.length} / ${acquisitionObserved}/${canonicalRows.length} / ${noncanonicalObserved}/${noncanonicalRows.length}`);
console.log(`  type counts: ${JSON.stringify(sortedTypeCounts)}`);
console.log('  canonical mutations / identity bridges / graph effects: 0 / 0 / 0');
