#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

const policy = readJson('data/project/lake-residual-frontier-wave-17-policy.json');
const projection = readJson(policy.paths.projection);
const receipt = readJson(policy.paths.receipt);
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const graphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
projection.graph_digests = graphDigests;
receipt.graph_digests = graphDigests;
writeJson(policy.paths.projection, projection);
writeJson(policy.paths.receipt, receipt);
console.log('Wave 17 baseline graph invariants captured');
