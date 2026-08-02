#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
};
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const digest = value => sha256(JSON.stringify(stable(value)));
const stableDecisionId = (programId, idKey, idValue) =>
  `LAKEW18TOPO-${sha256(Buffer.from([programId, idKey, idValue].join('\0'))).slice(0, 24)}`;
const deepClone = value => JSON.parse(JSON.stringify(value));

function countClassifications(records, field) {
  const counts = new Map();
  for (const record of records) {
    const classification = record[field]?.final_classification;
    if (classification) counts.set(classification, (counts.get(classification) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

const plan = readJson('data/project/lake-allocator-war-public-acquisition-wave-36-plan.json');
const sourceSpec = plan.source_specs.find(row => row.source_ref === 'LAW36-S050');
if (!sourceSpec) throw new Error('LAW36-S050 USAspending source specification is missing');
const snapshotPath = sourceSpec.storage_path;
if (!fs.existsSync(full(snapshotPath))) throw new Error(`${snapshotPath}: frozen USAspending snapshot is missing`);
const snapshot = readJson(snapshotPath);
if (!Array.isArray(snapshot.results)) throw new Error(`${snapshotPath}: results array is missing`);

const values = snapshot.results.map((row, index) => {
  const value = row?.generated_internal_id;
  if (typeof value !== 'string' || !value.startsWith('CONT_AWD_') || value.length > 240) {
    throw new Error(`${snapshotPath} /results/${index}/generated_internal_id: invalid USAspending award identifier`);
  }
  return value;
}).sort();
if (values.length !== 100) throw new Error(`${snapshotPath}: expected 100 generated_internal_id rows, observed ${values.length}`);
if (new Set(values).size !== values.length) throw new Error(`${snapshotPath}: duplicate generated_internal_id values`);

const topologyPolicy = readJson('data/project/lake-identifier-topology-wave-18-policy.json');
const registryPath = topologyPolicy.paths.registry;
const projectionPath = topologyPolicy.paths.projection;
const registry = readJson(registryPath);
const projection = readJson(projectionPath);
if (registry.schema_version !== 'lake-identifier-topology-registry-wave-18@1') throw new Error('Wave 18 topology registry schema mismatch');
if (projection.schema_version !== 'lake-identifier-topology-wave-18@1') throw new Error('Wave 18 topology projection schema mismatch');
if (!Array.isArray(registry.records) || !Array.isArray(projection.topology_decisions)) throw new Error('Wave 18 topology records are missing');

const sourceOnlyTemplate = registry.records.find(row =>
  row.source_only?.final_classification === 'external_or_domain_identifier_source_only'
)?.source_only;
if (!sourceOnlyTemplate) throw new Error('Wave 18 external-domain source-only template is missing');

const byCompound = new Map(registry.records.map(row => [`${row.id_key}:${row.id_value}`, row]));
const additions = [];
for (const idValue of values) {
  const compound = `generated_internal_id:${idValue}`;
  const decisionId = stableDecisionId(topologyPolicy.program_id, 'generated_internal_id', idValue);
  const existing = byCompound.get(compound);
  if (existing) {
    if (existing.topology_decision_id !== decisionId) throw new Error(`${compound}: topology decision ID drift`);
    if (existing.indexing?.final_disposition !== 'index_in_wave_18_topology_registry_without_asserting_identity_or_truth') {
      throw new Error(`${compound}: indexing disposition drift`);
    }
    if (existing.source_only?.final_classification !== 'external_or_domain_identifier_source_only') {
      throw new Error(`${compound}: source-only classification drift`);
    }
    if (existing.review_required_to_decide !== false || existing.cross_key_join_authorized !== false || existing.graph_effect !== 'none') {
      throw new Error(`${compound}: unsafe topology boundary`);
    }
    continue;
  }
  const record = {
    topology_decision_id: decisionId,
    id_key: 'generated_internal_id',
    id_value: idValue,
    topology_source_object: { generated_internal_id: idValue },
    baseline_states: ['unindexed', 'source_without_projection'],
    indexing: {
      baseline_indexed: false,
      final_disposition: 'index_in_wave_18_topology_registry_without_asserting_identity_or_truth'
    },
    source_only: deepClone(sourceOnlyTemplate),
    review_required_to_decide: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  };
  registry.records.push(record);
  byCompound.set(compound, record);
  additions.push(record);
}

if (new Set(registry.records.map(row => `${row.id_key}:${row.id_value}`)).size !== registry.records.length) {
  throw new Error('Wave 18 topology target duplication after Wave 36 extension');
}
if (new Set(registry.records.map(row => row.topology_decision_id)).size !== registry.records.length) {
  throw new Error('Wave 18 topology decision duplication after Wave 36 extension');
}

const records = registry.records;
registry.counts = {
  ...registry.counts,
  records: records.length,
  source_only_classifications: countClassifications(records, 'source_only'),
  divergence_classifications: countClassifications(records, 'divergence'),
  generator_contract_actions: records.filter(row => row.divergence?.generator_contract_action_open === true).length,
  same_path_contextual_repetitions: records.filter(row => row.divergence?.final_classification === 'same_path_contextual_projection_repetition').length,
  unclassified_source_only_rows: records.filter(row => row.source_only?.final_classification === 'source_only_family_adjudication_required').length,
  unadjudicated_divergence_rows: records.filter(row => row.baseline_states?.includes('divergent_projections') && !row.divergence).length,
  decisions_requiring_human_permission: records.filter(row => row.review_required_to_decide === true).length,
  post_freeze_records: records.length - 10371
};
if (registry.counts.records !== 10713) throw new Error(`Wave 18 extended record denominator mismatch: ${registry.counts.records}`);
if (registry.counts.post_freeze_records !== 342) throw new Error(`Wave 18 extended post-freeze denominator mismatch: ${registry.counts.post_freeze_records}`);
if (registry.counts.unclassified_source_only_rows !== 0 || registry.counts.unadjudicated_divergence_rows !== 0 || registry.counts.decisions_requiring_human_permission !== 0) {
  throw new Error('Wave 18 extension reopened an adjudication or permission dependency');
}

projection.topology_decisions = records.map(record => ({
  topology_decision_id: record.topology_decision_id,
  id_key: record.id_key,
  id_value: record.id_value,
  index_disposition: record.indexing?.final_disposition ?? null,
  source_only_disposition: record.source_only?.final_disposition ?? null,
  divergence_disposition: record.divergence?.final_disposition ?? null,
  generator_contract_action_open: record.divergence?.generator_contract_action_open ?? false,
  graph_effect: 'none'
}));
projection.counts = deepClone(registry.counts);
projection.registry_sha256 = digest(registry);

writeJson(registryPath, registry);
writeJson(projectionPath, projection);

const observed = registry.records.filter(row => row.id_key === 'generated_internal_id' && values.includes(row.id_value));
if (observed.length !== 100) throw new Error(`Wave 36 topology observation denominator mismatch: ${observed.length}`);
console.log(`Wave 36 extended Wave 18 topology: ${observed.length} award identifiers, ${additions.length} new decisions`);
console.log(`  registry records / post-freeze: ${registry.counts.records} / ${registry.counts.post_freeze_records}`);
console.log('  identity / truth / cross-key join / graph effects: 0 / 0 / 0 / 0');
