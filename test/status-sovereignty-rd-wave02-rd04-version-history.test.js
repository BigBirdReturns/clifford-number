#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  CLASS_SCHEMA_PATH,
  PROGRESS_SCHEMA_PATH,
  readBundle,
  validateProductData
} from '../tools/validate-status-sovereignty-rd-wave02-rd04-version-history.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = readBundle(ROOT);
const classSchema = read(CLASS_SCHEMA_PATH);
const progressSchema = read(PROGRESS_SCHEMA_PATH);
const fail = (message) => { throw new Error(message); };

validateProductData(base, classSchema, progressSchema);

const cases = [
  ['terminal receipt state', (b) => { b.receipt.current_result.terminal_state = 'evidence_complete'; }, /terminal class state/],
  ['terminal candidate denominator', (b) => { b.receipt.counts.candidate_records_terminal = 682; }, /candidate terminality/],
  ['terminal atlas state', (b) => { b.receipt.current_result.residual_atlas_open_after_promotion = 40; }, /atlas effect/],
  ['constitution class label', (b) => { b.constitution.lane_attempts.find((r) => r.class_id === 'RD-04-C01').exact_label = 'all SNAP chronology'; }, /class label/],
  ['Wave 01 historical closure', (b) => { b.wave01.counts.closed_residual_classes = 1; }, /historical state/],
  ['seed input denominator', (b) => { b.seed.input_manifest.entry_count = 1348; }, /seed input denominator/],
  ['relationship event missing', (b) => { b.relationship.events.pop(); }, /eight relationship/],
  ['relationship duplicate id', (b) => { b.relationship.events[1].event_id = b.relationship.events[0].event_id; }, /duplicate relationship/],
  ['version edge count', (b) => { b.relationship.events[0].version_edge_observed = false; }, /seven version-edge/],
  ['relationship implementation', (b) => { b.relationship.events[0].implementation_observed = true; }, /relationship authority/],
  ['relationship class effect', (b) => { b.relationship.events[0].class_effect = 'added'; }, /relationship authority/],
  ['bounded predecessor ids', (b) => { b.relationship.events.find((r) => r.event_id === 'RD04-EVT-HANDBOOK-V2-SUPERSEDES-V1').source_gap_unit_ids.pop(); }, /bounded predecessor/],
  ['partial supersession inflation', (b) => { b.relationship.events.find((r) => r.event_id === 'RD04-EVT-ACL-26-43-VUR-PARTIAL-SUPERSESSION').terminal_state = 'total_supersession'; }, /partial supersession/],
  ['compilation promoted', (b) => { b.relationship.events.find((r) => r.event_id === 'RD04-EVT-FNA-CURRENT-THROUGH-PL119-21').version_edge_observed = true; }, /seven version-edge|compilation currency/],
  ['interval event missing', (b) => { b.intervals.events.pop(); }, /six interval/],
  ['interval record padding', (b) => { b.intervals.events[0].interval_records.push(structuredClone(b.intervals.events[0].interval_records[0])); }, /seven operative/],
  ['interval implementation', (b) => { b.intervals.events[0].implementation_observed = true; }, /interval authority/],
  ['source gap missing', (b) => { b.gaps.source_gaps.pop(); }, /two bounded source gaps/],
  ['source gap identity', (b) => { b.gaps.source_gaps[0].execution_unit_id = 'AUTH-CA-OTHER'; }, /source-gap identities/],
  ['source gap status', (b) => { b.gaps.source_gaps[0].http_statuses[0] = 200; }, /retry custody/],
  ['source gap body', (b) => { b.gaps.source_gaps[0].body_bytes[0] = 10; }, /retry custody/],
  ['record absence laundering', (b) => { b.gaps.source_gaps[0].record_absence_inferred = true; }, /source gap laundered/],
  ['noncompliance laundering', (b) => { b.gaps.source_gaps[0].noncompliance_inferred = true; }, /source gap laundered/],
  ['edge erasure', (b) => { b.gaps.source_gaps[0].version_edge_erased = true; }, /source gap laundered/],
  ['date denominator', (b) => { delete b.dates.exact_seed_dates['CA-ACL-26-43']; }, /fourteen seed dates/],
  ['date boundary', (b) => { b.dates.boundary = 'publication_is_implementation'; }, /date boundary/],
  ['class terminal state', (b) => { b.classReceipt.terminal_state = 'evidence_complete'; }, /class receipt terminal/],
  ['class closure', (b) => { b.classReceipt.class_closed = false; }, /class receipt terminal/],
  ['closure basis', (b) => { b.classReceipt.closure_basis.pop(); }, /closure basis/],
  ['class source gap order', (b) => { b.classReceipt.bounded_source_gaps.reverse(); }, /class receipt source gaps/],
  ['class candidate count', (b) => { b.classReceipt.counts.candidate_records_terminal = 682; }, /class receipt counts/],
  ['class authority', (b) => { b.classReceipt.authority.prevalence_finding = true; }, /class receipt authority/],
  ['class atlas effect', (b) => { b.classReceipt.residual_atlas_effect_if_promoted.open_after = 40; }, /atlas effect/],
  ['summary terminal state', (b) => { b.summary.current_result.terminal_state = 'still_open'; }, /summary terminal state/],
  ['summary closure', (b) => { b.summary.current_result.class_closed = false; }, /version history not terminal/],
  ['summary graph effect', (b) => { b.summary.current_result.graph_effect = 'added'; }, /summary effect authority/],
  ['manifest path', (b) => { b.manifest.entries[0].path = 'other.json'; }, /manifest paths/],
  ['manifest combined digest', (b) => { b.manifest.combined_sha256 = '0'.repeat(64); }, /manifest combined/],
  ['closure PR custody', (b) => { b.closureReference.source_pr = 999; }, /closure reference custody/],
  ['closure artifact custody', (b) => { b.closureReference.terminal_execution.artifact_zip_sha256 = '0'.repeat(64); }, /closure execution artifact/],
  ['progress promoted receipt', (b) => { b.progress.promoted_class_receipts = []; }, /one promoted/],
  ['progress cross-lane denominator', (b) => { b.progress.selected_classes_not_adjudicated_by_this_receipt.pop(); }, /five cross-lane/],
  ['progress class accounting', (b) => { b.progress.counts.closed_residual_classes = 2; }, /progress class accounting/],
  ['progress wave overclosure', (b) => { b.progress.current_result.wave_complete = true; }, /wave overclosed/],
  ['progress boundary weakening', (b) => { b.progress.boundaries.source_unavailability_is_noncompliance = true; }, /source_unavailability_is_noncompliance/],
  ['provenance receipt denominator', (b) => { b.provenance.receipts.pop(); }, /eighteen provenance/],
  ['provenance duplicate blob', (b) => { b.provenance.receipts[1].git_blob_sha = b.provenance.receipts[0].git_blob_sha; }, /duplicate provenance blob/],
  ['provenance transport retained', (b) => { b.provenance.transport_carriers_retained = 1; }, /transport retained/],
  ['class schema opened', (b, cs) => { cs.additionalProperties = true; }, /schema root is not closed/],
  ['progress schema atlas', (b, cs, ps) => { ps.properties.counts.properties.open_residual_classes.const = 40; }, /progress schema open count/]
];

for (const [name, mutate, pattern] of cases) {
  const bundle = structuredClone(base);
  const cs = structuredClone(classSchema);
  const ps = structuredClone(progressSchema);
  mutate(bundle, cs, ps);
  try {
    validateProductData(bundle, cs, ps);
    fail(`${name}: mutation unexpectedly passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error ${error.message}`);
  }
}

console.log(`status-sovereignty-rd-wave02-rd04-version-history.test: positive plus ${cases.length} adversarial mutations passed`);
