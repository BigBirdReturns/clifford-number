#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { readCsvObjects } from './lib/csv-records.mjs';
import { resolveIdentity } from './lib/entity-resolution.mjs';
import { evaluateGenericCrossing } from './lib/generic-crossing.mjs';

const root = process.cwd();
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const archivePath = path.resolve(root, arg('archive', 'build/source-acquisition/icij-offshoreleaks/full-oldb.LATEST.zip'));
const extractedDir = path.resolve(root, arg('extracted-dir', 'build/source-acquisition/icij-offshoreleaks/extracted'));
const outputDir = path.resolve(root, arg('output-dir', 'build/icij-panama-import'));
const durableOutput = path.resolve(root, arg('durable-output', 'data/research/icij-panama-import-manifest.json'));
const sourceUrl = 'https://offshoreleaks-data.icij.org/offshoreleaks/csv/full-oldb.LATEST.zip';
const sourcePage = 'https://offshoreleaks.icij.org/pages/database';
const files = {
  entity: 'nodes-entities.csv', officer: 'nodes-officers.csv', address: 'nodes-addresses.csv',
  intermediary: 'nodes-intermediaries.csv', other: 'nodes-others.csv', relationship: 'relationships.csv',
};
const sha256File = async file => {
  const hash = crypto.createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest('hex') };
};
const write = async (stream, row) => { if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, 'drain'); };
const finish = async stream => { stream.end(); await once(stream, 'finish'); };
const month = new Map(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map((value, index) => [value, index + 1]));
function icijDate(value) {
  if (!value) return null;
  const match = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(value.toUpperCase());
  if (!match || !month.has(match[2])) return null;
  return `${match[3]}-${String(month.get(match[2])).padStart(2, '0')}-${match[1]}`;
}
function receipt(hash, file, line, role) {
  return {
    role, content_sha256: hash, locator_url: `${sourceUrl}#${file}:record=${line}`,
    provenance_chain_id: `icij-offshoreleaks-20250331:${file}`, evidence_class: 'reported', locator_status: 'public',
  };
}
function resolution(node, type, rawHash, file) {
  return resolveIdentity({
    source_text: node.name,
    candidates: [{
      candidate_entity_id: `icij:${node.node_id}`, node_type: type === 'officer' ? 'person' : 'legal_entity',
      rule: 'icij_source_native_node_id',
      anchors: [{
        kind: 'official_identifier', value: node.node_id, issuer: 'ICIJ Offshore Leaks Database',
        source: { content_sha256: rawHash, locator: `${sourceUrl}#${file}:record=${node.record_number}`, provenance_chain_id: `icij-offshoreleaks-20250331:${file}` },
      }],
    }],
  });
}

for (const file of [archivePath, ...Object.values(files).map(file => path.join(extractedDir, file))]) {
  if (!fs.existsSync(file)) throw new Error(`missing ICIJ source input: ${file}`);
}
fs.mkdirSync(outputDir, { recursive: true });
const raw = { archive: await sha256File(archivePath) };
for (const [kind, file] of Object.entries(files)) raw[kind] = await sha256File(path.join(extractedDir, file));

const relationshipOutPath = path.join(outputDir, 'panama-relationships.jsonl');
const relationshipOut = fs.createWriteStream(relationshipOutPath);
const relationCounts = {};
let relationshipRowsScanned = 0;
let relationshipRowsRetained = 0;
let selectedRelationship = null;
for await (const { row, record_number } of readCsvObjects(path.join(extractedDir, files.relationship))) {
  relationshipRowsScanned += 1;
  if (row.sourceID !== 'Panama Papers') continue;
  relationshipRowsRetained += 1;
  relationCounts[row.rel_type] = (relationCounts[row.rel_type] ?? 0) + 1;
  const normalized = {
    schema_version: 'icij-panama-relationship@1', source_record_number: record_number,
    subject_node_id: row.node_id_start, object_node_id: row.node_id_end,
    relationship_type: row.rel_type, relationship_label_as_reported: row.link || null,
    status_as_reported: row.status || null, valid_from: icijDate(row.start_date), valid_until: icijDate(row.end_date),
    source_id: row.sourceID, evidence_state: 'reported_by_icij_from_leaked_records', graph_effect: 'none',
  };
  await write(relationshipOut, normalized);
  if (!selectedRelationship && row.rel_type === 'officer_of' && normalized.valid_from && normalized.valid_until) {
    selectedRelationship = { ...normalized, raw_start_date: row.start_date, raw_end_date: row.end_date };
  }
}
await finish(relationshipOut);
if (!selectedRelationship) throw new Error('no deterministic dated Panama Papers officer_of relationship found');

const selectedIds = new Set([selectedRelationship.subject_node_id, selectedRelationship.object_node_id]);
const selectedNodes = new Map();
const nodeCounts = {};
let nodeRowsScanned = 0;
let nodeRowsRetained = 0;
const nodeOutPath = path.join(outputDir, 'panama-nodes.jsonl');
const nodeOut = fs.createWriteStream(nodeOutPath);
for (const [nodeType, file] of Object.entries(files).filter(([kind]) => kind !== 'relationship')) {
  let typeRetained = 0;
  for await (const { row, record_number } of readCsvObjects(path.join(extractedDir, file))) {
    nodeRowsScanned += 1;
    if (row.sourceID !== 'Panama Papers') continue;
    nodeRowsRetained += 1; typeRetained += 1;
    const normalized = {
      schema_version: 'icij-panama-node@1', node_id: row.node_id, node_type: nodeType,
      name_as_reported: nodeType === 'address' ? null : (row.name || null),
      address_text_retained: nodeType === 'address' ? false : undefined,
      jurisdiction_as_reported: row.jurisdiction || null, countries_as_reported: row.countries || null,
      incorporation_date: icijDate(row.incorporation_date), inactivation_date: icijDate(row.inactivation_date),
      source_id: row.sourceID, source_record_number: record_number,
      evidence_state: 'reported_by_icij_from_leaked_records', graph_effect: 'none',
    };
    await write(nodeOut, normalized);
    if (selectedIds.has(row.node_id)) selectedNodes.set(row.node_id, { ...row, node_type: nodeType, record_number });
  }
  nodeCounts[nodeType] = typeRetained;
}
await finish(nodeOut);

const officer = selectedNodes.get(selectedRelationship.subject_node_id);
const entity = selectedNodes.get(selectedRelationship.object_node_id);
if (!officer || officer.node_type !== 'officer' || !entity || entity.node_type !== 'entity') {
  throw new Error('selected relationship endpoints did not resolve to officer/entity source nodes');
}
const manifestHashes = [raw.relationship.sha256, raw.officer.sha256, raw.entity.sha256];
const positive = evaluateGenericCrossing({
  predicate: 'reported_officer_of', allowed_predicates: ['reported_officer_of'],
  endpoints: [
    { role: 'officer', resolution: resolution(officer, 'officer', raw.officer.sha256, files.officer) },
    { role: 'entity', resolution: resolution(entity, 'entity', raw.entity.sha256, files.entity) },
  ],
  receipts: [
    receipt(raw.relationship.sha256, files.relationship, selectedRelationship.source_record_number, 'relationship'),
    receipt(raw.officer.sha256, files.officer, officer.record_number, 'officer_node'),
    receipt(raw.entity.sha256, files.entity, entity.record_number, 'entity_node'),
  ],
  required_receipt_roles: ['relationship', 'officer_node', 'entity_node'], manifest_hashes: manifestHashes,
  interval_a: { valid_from: selectedRelationship.valid_from, valid_until: selectedRelationship.valid_until },
  interval_b: { valid_from: icijDate(entity.incorporation_date), valid_until: icijDate(entity.inactivation_date) ?? icijDate(entity.struck_off_date) },
});
if (positive.gate !== 'pass') throw new Error(`real ICIJ positive control held: ${positive.failures.join(', ')}`);

const outputs = { nodes: await sha256File(nodeOutPath), relationships: await sha256File(relationshipOutPath) };
const manifest = {
  schema_version: 'icij-panama-import-manifest@1',
  source: {
    provider: 'International Consortium of Investigative Journalists', source_page: sourcePage, archive_url: sourceUrl,
    archive_last_modified: '2025-03-31T09:28:02Z', archive_etag: '529434ea34b8dab98debc51200978f35-9',
    generated_marker: 'GENERATED_ON_20250331.txt', license: 'ODbL; contents CC BY-SA',
    scope: 'Panama Papers rows only from the multi-investigation Offshore Leaks archive',
    limitations: [
      'ICIJ says inclusion does not imply illegal or improper conduct.',
      'Source-native node IDs identify database records, not necessarily unique real-world people or entities across duplicates.',
      'The public database is a structured subset of leaked records and is current through 2015 for Panama Papers data.',
    ],
  },
  inputs: { archive: raw.archive, extracted_files: Object.fromEntries(Object.entries(files).map(([kind, file]) => [kind, { path: file, ...raw[kind] }])) },
  coverage: {
    node_rows_scanned: nodeRowsScanned, panama_nodes_retained: nodeRowsRetained, node_counts_by_type: nodeCounts,
    relationship_rows_scanned: relationshipRowsScanned, panama_relationships_retained: relationshipRowsRetained,
    relationship_counts_by_type: Object.fromEntries(Object.entries(relationCounts).sort()),
  },
  outputs: {
    nodes: { path: path.relative(root, nodeOutPath).replaceAll('\\', '/'), ...outputs.nodes },
    relationships: { path: path.relative(root, relationshipOutPath).replaceAll('\\', '/'), ...outputs.relationships },
  },
  real_positive_control: {
    selection_rule: 'First source-order Panama Papers officer_of relationship with both start_date and end_date; no name or target filter.',
    relationship: selectedRelationship,
    officer: { node_id: officer.node_id, name_as_reported: officer.name, source_record_number: officer.record_number },
    entity: {
      node_id: entity.node_id, name_as_reported: entity.name, source_record_number: entity.record_number,
      incorporation_date: icijDate(entity.incorporation_date), inactivation_date: icijDate(entity.inactivation_date),
    },
    gate: positive,
    establishes: 'The hash-pinned public ICIJ dataset reports the typed officer_of relationship for the dated interval between two source-native node IDs.',
    does_not_establish: ['independent verification of the underlying leaked record', 'current role', 'illegality', 'wrongdoing'],
  },
  privacy_projection: 'Street-address text is not retained in normalized nodes; address node IDs and country metadata remain available for later source-addressed resolution.',
  verification_status: 'machine_reproduced_from_hash_pinned_public_dataset', causal_status: 'not_established', graph_effect: 'none',
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
fs.mkdirSync(path.dirname(durableOutput), { recursive: true });
fs.writeFileSync(durableOutput, manifestText);
fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestText);
console.log(`icij-panama-import: ${nodeRowsRetained} nodes; ${relationshipRowsRetained} relationships; real positive ${positive.gate}`);
