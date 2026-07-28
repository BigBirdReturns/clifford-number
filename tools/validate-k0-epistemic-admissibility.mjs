#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeK0ReleaseManifest } from './build-k0-epistemic-admissibility.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const allowedSpecies = new Set(['comprehension_failure','status_protective_reclassification','designed_comprehension_ceiling','strategic_bypass','mixed']);
const requiredPath = ['governing_claim','qualified_contradiction','knower_reclassification','explanation_mutation','institutional_gate_action','material_consequence','feedback_source_removed','correction_substitution_or_exit_blocked'];

export function validateK0({ root = defaultRoot, seedPath = 'data/intake/k0-ceiling-conversion-seed-events.json', wiringPath = 'data/project/k0-existing-ecosystem-wiring.json' } = {}) {
  const failures = [];
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const fail = message => failures.push(message);
  const method = read('data/project/k0-epistemic-admissibility-methodology.json');
  const seeds = read(seedPath);
  const wiring = read(wiringPath);
  const registry = read('data/project/m05-answerable-power-story-registry.json');
  const fanout = read('data/project/m05-answerable-power-fanout.json');
  const selection = read('data/canonical/corpus-selection.json');
  const coverage = read('data/research/corpus-coverage.json');
  const reviews = read('data/research/selection-adversarial-reviews.json');
  const manifest = read('data/project/k0-epistemic-admissibility-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0.json');

  if (method.schema_version !== 'k0-epistemic-admissibility-methodology@1' || method.layer_id !== 'K0') fail('method identity drift');
  if (method.core_path.length !== 8 || method.ceiling_conversion_depth.length !== 8) fail('K0 path or CCD denominator drift');
  if (method.failure_species.length !== 5 || new Set(method.failure_species).size !== 5) fail('failure species denominator drift');
  if (method.boundaries.graph_effect !== 'none' || method.boundaries.project_complete !== false) fail('method boundary drift');
  if (sha256(fs.readFileSync(path.join(root, method.source_path))) !== method.source_sha256) fail('source exact-byte hash drift');

  if (seeds.schema_version !== 'k0-ceiling-conversion-seed-events@1') fail('seed schema drift');
  if (seeds.seed_people_count !== 10 || seeds.events.length !== 13) fail('seed denominator drift');
  if (seeds.source_reference_count !== 25) fail('source reference denominator drift');
  const ids = new Set();
  const people = new Set();
  for (const event of seeds.events) {
    if (!event.event_id || ids.has(event.event_id)) fail(`duplicate or missing event id ${event.event_id}`);
    ids.add(event.event_id); people.add(event.seed_person);
    if (event.graph_effect !== 'none' || event.network_edge_created !== false) fail(`${event.event_id}: graph boundary drift`);
    if (event.evidence_truth_determined !== false || event.receipt_audit_complete !== false) fail(`${event.event_id}: evidence truth laundering`);
    if (event.publication_status !== 'blocked_pending_receipt_audit_and_second_party_selection_review') fail(`${event.event_id}: publication boundary drift`);
    if (!Number.isInteger(event.ccd_depth) || event.ccd_depth < 0 || event.ccd_depth > 7) fail(`${event.event_id}: CCD out of range`);
    if (!Array.isArray(event.counterevidence) || event.counterevidence.length < 1) fail(`${event.event_id}: counterevidence missing`);
    if (!Array.isArray(event.alternative_explanations) || event.alternative_explanations.length < 1) fail(`${event.event_id}: alternative explanations missing`);
    if (!Array.isArray(event.sources) || event.sources.length < 2) fail(`${event.event_id}: sources missing`);
    for (const species of event.failure_species || []) if (!allowedSpecies.has(species)) fail(`${event.event_id}: unknown failure species ${species}`);
    for (const key of requiredPath) if (!event.path?.[key]?.status || !event.path?.[key]?.summary) fail(`${event.event_id}: missing path stage ${key}`);
  }
  if (people.size !== 10) fail(`expected 10 seed people, got ${people.size}`);

  if (wiring.schema_version !== 'k0-existing-ecosystem-wiring@2' || wiring.rows.length !== 10) fail('wiring denominator drift');
  if (wiring.natural_k0_fixture_count !== 10 || wiring.clean_first_class_estate_route_count !== 8) fail('wiring route count drift');
  if (wiring.shared_media_publication_taxonomy_gap_count !== 2) fail('media taxonomy gap drift');
  if (wiring.exact_pairwise_chain_count !== 1 || wiring.justified_common_purpose_network_edges_among_top_ten !== 0) fail('pairwise/network boundary drift');
  if (wiring.graph_effect !== 'none') fail('wiring graph effect drift');
  for (const row of wiring.rows) if (!row.natural_join || !row.do_not_join) fail(`${row.person}: incomplete natural/non-link wiring`);

  const story = registry.stories.find(row => row.story_id === 'M05-S14');
  const lane = fanout.lanes.find(row => row.lane_id === 'A17');
  if (!story || story.mode !== 'constitutional_mechanism') fail('M05-S14 missing or wrong mode');
  if (!lane || lane.story_id !== 'M05-S14') fail('A17 missing or disconnected');
  if (registry.stories.length !== 14 || fanout.lanes.length !== 17) fail('M05 integration counts drift');
  if (registry.counts.constitutional_mechanism !== 4 || registry.counts.stories !== 14) fail('M05 registry counts drift');
  if (fanout.counts.lanes !== 17 || fanout.counts.story_lanes !== 14 || fanout.counts.infrastructure_lanes !== 3) fail('M05 fanout counts drift');

  const selectionLane = selection.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  if (!selectionLane || selectionLane.status !== 'proposed' || selectionLane.graph_effect !== 'none') fail('selection lane boundary drift');
  if (!coverageRow || coverageRow.coverage_state !== 'proposed_fixture_only') fail('coverage row missing');
  if (!review || review.status !== 'pending_second_party' || review.publication_status !== 'blocked' || review.reviewer_id !== null) fail('selection review boundary drift');
  if (selectionLane.consumption.selection_review_id !== review.review_id || coverageRow.consumption.selection_review_id !== review.review_id) fail('selection review linkage drift');

  for (const rel of ['data/ledger/surfaces.jsonl','data/ledger/participation.jsonl','data/ledger/chains.jsonl']) {
    const full = path.join(root, rel);
    if (fs.existsSync(full) && /K0-SEED-|M05-S14|epistemic-admissibility-ceiling-events/.test(fs.readFileSync(full, 'utf8'))) fail(`${rel}: K0 leaked into canonical graph ledger`);
  }

  const expected = computeK0ReleaseManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) fail('exact-byte K0 release manifest drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report release hash drift');
  if (report.counts.top_ten_people !== 10 || report.counts.normalized_seed_events !== 13 || report.counts.common_purpose_network_edges !== 0) fail('report denominator drift');
  if (report.current_result.evidence_truth_determined !== false || report.current_result.graph_effect !== 'none' || report.current_result.project_complete !== false) fail('report result boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateK0();
  if (!result.ok) {
    console.error(`K0 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-epistemic-admissibility: OK');
}
