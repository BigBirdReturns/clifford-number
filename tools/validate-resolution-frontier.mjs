#!/usr/bin/env node
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const overlap = read('data/research/oge-fec-overlap-manifest.json');
const temporal = read('data/research/oge-fec-temporal-screen-manifest.json');
const interests = read('data/research/oge-beneficial-interest-manifest.json');
const payees = read('data/research/fec-payee-inventory-manifest.json');
const embedded = read('data/research/oge-fec-embedded-name-manifest.json');
const sec = read('data/research/sec-exact-overlap-intake-manifest.json');
const dateRecovery = read('data/research/oge-date-recovery-manifest.json');
const visual = read('data/research/oge-visual-date-correction-manifest.json');
const registry = read('data/research/ny-registry-embedded-entity-manifest.json');
const candidateReport = read('data/research/trump-2016-candidate-disclosure-manifest.json');
const audit = read('test/audits/oge-fec-temporal-frontier-audit.json');

const fail = message => { throw new Error(message); };
for (const [name, artifact] of Object.entries({ overlap, temporal, interests, payees, embedded, sec, dateRecovery, visual, registry, candidateReport, audit })) {
  if (artifact.graph_effect !== 'none' && name !== 'audit') fail(`${name}: graph effect must remain none`);
}
if (embedded.inputs.oge_interests.sha256 !== interests.outputs.interests.sha256
  || embedded.inputs.fec_payee_candidates.sha256 !== payees.outputs.candidates.sha256
  || embedded.coverage.embedded_candidate_pairs_emitted !== 398
  || embedded.coverage.trump_token_candidate_pairs !== 96) fail('embedded-name intake does not reconcile');
if (sec.inputs.oge_fec_overlap_candidates.sha256 !== overlap.outputs.candidates.sha256
  || sec.coverage.identifier_candidate_rows_emitted !== 88
  || sec.coverage.accepted_identity_resolutions !== 0) fail('SEC identifier intake does not reconcile');
if (dateRecovery.inputs.temporal_dispositions.sha256 !== temporal.output.sha256
  || dateRecovery.inputs.interests.sha256 !== interests.outputs.interests.sha256
  || dateRecovery.temporally_unknown_candidates_analyzed !== 1040
  || dateRecovery.dates_recovered !== 0) fail('strict text-layer date recovery does not reconcile');
if (audit.inputs.temporal_dispositions.sha256 !== temporal.output.sha256
  || audit.evidence_causes[0].candidate_pairs !== 995
  || audit.evidence_causes[1].candidate_pairs !== 45) fail('temporal frontier audit does not reconcile');
if (visual.inputs.temporal_dispositions.sha256 !== temporal.output.sha256
  || visual.inputs.oge_interests.sha256 !== interests.outputs.interests.sha256
  || visual.source_rows_corrected !== 23
  || visual.candidate_pairs_reclassified !== 45
  || visual.post_visual_review_dispositions.overlapping !== 0
  || visual.post_visual_review_dispositions.non_overlapping !== 177
  || visual.post_visual_review_dispositions.temporally_unknown !== 995) fail('visual date correction layer does not reconcile');
if (registry.input.sha256 !== embedded.outputs.candidates.sha256
  || registry.names_queried !== 26
  || registry.exact_active_registry_matches !== 6
  || registry.filing_history_records !== 130) fail('New York registry intake does not reconcile');
if (candidateReport.acquisition.sha256 !== '58c604ad776a4bb085bfabb65f8d848b57486e4aa5718d0dafc85aa810450db6'
  || candidateReport.fec_input.sha256 !== payees.outputs.records.sha256
  || candidateReport.target_legal_names_explicitly_reported !== 3
  || candidateReport.target_names_contemporaneous_with_observed_fec_window !== 3
  || candidateReport.target_names_with_defensible_closed_interval !== 0) fail('2016 candidate-report audit does not reconcile');
if (temporal.identity_review_queue !== 0 || candidateReport.graph_effect !== 'none') fail('resolution frontier improperly promoted a crossing');

console.log('validate-resolution-frontier: OK (398 embedded candidates; 6 registry nodes; 3 contemporaneous filer rows; 0 resolved entities; 0 crossings)');
