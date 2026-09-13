#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, writeJson } from './lib/ledger.mjs';

const graph = readJson('graph.json');
const surfaces = readJson('build/surface-graph.json');
const hops = readJson('build/hop-graph.json');
const receipts = readJson('build/receipt-graph.json');
const clock = readJson('data/project/build-clock.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function requireTimestamp(label, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must declare a generated boundary`);
  return value;
}

const researchGenerated = requireTimestamp('graph.json', graph.generated);
const researchCorpusAsOf = requireTimestamp('graph.json corpus_as_of', graph.corpus_as_of);
const surfaceGenerated = requireTimestamp('build/surface-graph.json', surfaces.generated);
const hopGenerated = requireTimestamp('build/hop-graph.json', hops.generated);
const receiptGenerated = requireTimestamp('build/receipt-graph.json', receipts.generated);
const boundedClocks = [surfaceGenerated, hopGenerated, receiptGenerated];
if (new Set(boundedClocks).size !== 1) {
  throw new Error(`bounded projections do not share one clock: ${boundedClocks.join(', ')}`);
}
if (boundedClocks[0] !== clock.timestamp) {
  throw new Error(`bounded projection clock ${boundedClocks[0]} does not match admitted build clock ${clock.timestamp}`);
}

const boundary = {
  schema_version: 'clifford-public-data-boundary@1',
  product: 'Clifford Number',
  release_version: packageJson.version,
  admitted_build_clock: {
    timestamp: clock.timestamp,
    source_date_epoch: clock.source_date_epoch,
    not_evidence_date: clock.not_evidence_date === true
  },
  views: {
    research_network: {
      label: 'Research network',
      source_artifact: 'graph.json',
      projection_inputs: ['data/research/research-context-base.json'],
      projection_generated: researchGenerated,
      projection_kind: 'legacy_context_graph',
      corpus_as_of: researchCorpusAsOf,
      canonical_for_clifford_number: false,
      node_count: graph.nodes?.length ?? 0,
      edge_count: graph.edges?.length ?? 0
    },
    bounded_surfaces: {
      label: 'Bounded surfaces',
      source_artifact: 'build/surface-graph.json',
      projection_generated: surfaceGenerated,
      projection_kind: 'compiled_surface_ledger',
      canonical_for_clifford_number: true,
      actor_count: surfaces.actors?.length ?? 0,
      surface_count: surfaces.surfaces?.length ?? 0
    },
    verified_hops: {
      label: 'Verified surface hops',
      source_artifact: 'build/hop-graph.json',
      projection_generated: hopGenerated,
      projection_kind: 'compiled_hop_graph',
      canonical_for_clifford_number: true,
      edge_count: hops.edges?.length ?? 0,
      anchor_actor_id: hops.anchor_actor_id ?? null
    },
    receipt_graph: {
      label: 'Receipt graph',
      source_artifact: 'build/receipt-graph.json',
      projection_generated: receiptGenerated,
      projection_kind: 'compiled_receipt_graph',
      canonical_for_clifford_number: true,
      receipt_count: receipts.receipts?.length ?? 0
    }
  },
  alignment: {
    bounded_projections_share_clock: true,
    projection_clocks_aligned: researchGenerated === surfaceGenerated,
    mixed_projection_boundaries: researchGenerated !== surfaceGenerated,
    research_projection_generated: researchGenerated,
    bounded_projection_generated: surfaceGenerated,
    research_corpus_as_of: researchCorpusAsOf
  },
  interpretation_contract: {
    projection_generated_is_not_source_freshness: true,
    source_dates_live_in_receipts: true,
    research_corpus_as_of_is_distinct_from_projection_clock: true,
    research_network_is_context_projection: true,
    bounded_surfaces_and_hops_govern_clifford_number: true,
    statement: 'Projection timestamps identify deterministic artifacts. The Research network separately declares its admitted corpus cutoff; neither value asserts that every underlying source was current on the projection date. Source publication, retrieval, verification, and event dates remain in their owning receipts.'
  }
};

writeJson('build/public-data-boundary.json', boundary);
console.log(`build-public-data-boundary: research ${researchGenerated}; bounded ${surfaceGenerated}; mixed=${boundary.alignment.mixed_projection_boundaries}`);
