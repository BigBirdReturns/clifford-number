import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const CANONICAL_PARENT_COMMIT = '170cffa6c2a0c1e6fcd5124d713f054d228b4979';
const CANONICAL_PARENT_TREE = 'a991c88abe08aeb11687a22de1cb584431dfb99b';

const BASELINE_RUN_ID = 31030908630;
const BASELINE_ARTIFACT_ID = 8940650245;
const BASELINE_ARTIFACT_DIGEST = 'sha256:dc499ff1899811f84be3873df2787835dd70f95a73a64d7652ede4d51f48f7da';
const BASELINE_HEAD = '558a980ae0b0cf4380105acfd45ee2a5cce3dde6';
const BASELINE_SELECTED_SHA256 = '38ea9b016f9b9b302efaa97bc456abde3bdb22a80943ebae7b3f0ec94b66d632';
const BASELINE_ROUTE_RESULTS_SHA256 = 'e951990ff347b4ad08f6edfeb52189244b7d58d8a852251a1cb2bbe4f13c83b6';
const BASELINE_SIGNALS_SHA256 = 'ee430e5d06a16bf59bc316e5dd3ca9dbfec2a09bf8807cc7c47ceb58aec87264';
const BASELINE_LINKS_SHA256 = 'dda8a3a0f9bfe95a200b7665b00a1dc809d83a66af914e20eb38312320f34a07';
const BASELINE_SUMMARY_SHA256 = '7ecc6d382540763ebf30442a209727a2346d644e73650f35be1971214c3cfc0c';
const BASELINE_POLICY_SHA256 = '8c5f3a0d79c8f057aa4fca1adedd354c70ab9b5391f60656ea0fa875299d37c0';
const BASELINE_MANIFEST_SHA256 = '8928e052a320befb7e7d3c1d7b4f8c94df69ab0b1674663f589a69496e6a5491';

const REPLAY_RUN_ID = 31032164683;
const REPLAY_ARTIFACT_ID = 8941112372;
const REPLAY_ARTIFACT_DIGEST = 'sha256:ae34561d531c077e56473553b09fc2fe834c32d23f03d7eef3f422c700daf831';
const REPLAY_HEAD = 'f77272e17278eeecf815b210b7aa52c055cd360c';
const REPLAY_ROUTE_RESULTS_SHA256 = '38355d7ed95c3aec373c0eb9174d71b158318b6068a258abd76a70cd1f5667d2';
const REPLAY_RETRY_INPUT_SHA256 = 'cbd1dcfb811a7a4e7f1d0d440ea9ccc1b76500ff56523b3a03359a314a1c2bec';
const REPLAY_SUMMARY_SHA256 = '91627c3259ccaa28bad38f7df6a8e8163d1bcc37538efb2fa077168e6a79ca9c';
const REPLAY_POLICY_SHA256 = '634431bb4962e5428a987856cfa509bdf94f56c1e70bc35151db7aaed7cd6da0';
const REPLAY_MANIFEST_SHA256 = 'c487dc96cdb4f132a7f64a0feb807ba7e07482461c75cb403300e35a84da4456';

const PREDECESSOR_FILE_SHA256 = {
  'README.md': '2062a952891e0b4f3cd37861417e3c72bc1bb8f4fa698cb332f642e0154bc4be',
  'acquisition-frontier.json': 'fd2701050fab6439d0580426fd8a79306a5ac9c397bdbe432fdb233f873fa90d',
  'coverage-matrix.json': '5386031e30b12f5002b51c09a83b6f91bf37464349bb1eb1eb69e2f96fe849f0',
  'manifest.json': '0f222ca42cfd53e1c2da5fb1e5928f53260692d0a96277e80214a59d17144922',
  'schoolhouse.json': '5bc779882c712bb0de59b34a20c3006caaeac82f8b07a61301ce29443c6d2b7a',
  'schoolhouse-launch-era-archive-content-attempt-results.jsonl': '8f90f1e6f4bb4a84df8963d158fef3effde8238de2c4613510235fc111184f3c',
  'schoolhouse-launch-era-archive-content-custody.json': '81cae32f7d8b20be56ecb1c9a6997e8b79d5422284cd00ba1bd205ac68ae986f',
  'schoolhouse-launch-era-archive-content-route-results.jsonl': '2860b0bfe16c0cb8e3401f3d140279671ec71ebb3b8f8f11e930ebf3999331a9',
  'source-inventory-15.jsonl': 'cbdfef9d6f72d51aaee973d4ecb3c98fc541df9485d181ecc728b7e7f9cb8c88',
};
const PREDECESSOR_VALIDATOR_SHA256 = '2213def8c7e36944d8f4e0058bd49aeb4ed05c15e878df537f8e06a9dcdc9ed9';

const PREDECESSOR_SOURCE_ROWS = 418;
const PREDECESSOR_COVERAGE_ROWS = 25;
const PREDECESSOR_GAP_ROWS = 16;
const EXPECTED_SOURCE_ROWS = 425;
const EXPECTED_COVERAGE_ROWS = 26;
const EXPECTED_GAP_ROWS = 16;

const ATTEMPT_FILE = 'schoolhouse-archive-minimum-legal-surface-attempt-results.jsonl';
const ROUTE_FILE = 'schoolhouse-archive-minimum-legal-surface-route-reconciliation.jsonl';
const SIGNAL_FILE = 'schoolhouse-archive-minimum-legal-surface-legal-signals.jsonl';
const LINK_FILE = 'schoolhouse-archive-minimum-legal-surface-link-inventory.jsonl';
const CUSTODY_FILE = 'schoolhouse-archive-minimum-legal-surface-reconciliation-custody.json';
const SOURCE_FILE = 'source-inventory-16.jsonl';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const sha256Text = value => sha256Buffer(Buffer.from(value, 'utf8'));
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonicalJsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const writeJsonl = (file, rows) => fs.writeFileSync(file, canonicalJsonl(rows));
const unique = values => new Set(values).size === values.length;
const sum = values => values.reduce((total, value) => total + value, 0);
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};
const countOccurrences = (value, needle) => value.split(needle).length - 1;
const replaceOnce = (value, from, to, label) => {
  assert.equal(countOccurrences(value, from), 1, `${label}: expected one occurrence`);
  return value.replace(from, to);
};
const insertBefore = (value, marker, addition, label) => {
  const index = value.lastIndexOf(marker);
  assert(index >= 0, `${label}: marker missing`);
  return value.slice(0, index) + addition + value.slice(index);
};
const routeKey = row => `${row.timestamp}\u0000${row.original_url}`;
const locatorSuffix = locatorId => locatorId.replace(/^schoolhouse-archive-locator-/, '');
const fixedTermHits = row => sum(Object.values(row.fixed_legal_term_counts ?? {}));
const stateClass = row => row.status === 200 && row.archived_html_body_custody === true
  ? 'captured_archived_html_surface_privacy_minimized'
  : 'archive_content_provider_error_not_absence';

function verifyChecksums(dir) {
  const file = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(file), `${dir}: missing SHA256SUMS`);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `${dir}: malformed checksum row`);
    const target = path.join(dir, match[2]);
    assert(fs.existsSync(target), `${dir}: missing ${match[2]}`);
    assert.equal(sha256File(target), match[1], `${dir}: checksum drift for ${match[2]}`);
  }
}

function verifyArtifactManifest(dir, schema, expectedManifestSha) {
  const file = path.join(dir, 'artifact-manifest.json');
  assert.equal(sha256File(file), expectedManifestSha, `${dir}: artifact-manifest SHA drift`);
  const manifest = readJson(file);
  assert.equal(manifest.schema_version, schema, `${dir}: artifact schema drift`);
  for (const [filename, receipt] of Object.entries(manifest.files)) {
    const target = path.join(dir, filename);
    assert(fs.existsSync(target), `${dir}: missing ${filename}`);
    assert.equal(fs.statSync(target).size, receipt.bytes, `${dir}: byte drift ${filename}`);
    assert.equal(sha256File(target), receipt.sha256, `${dir}: SHA drift ${filename}`);
  }
  assert.equal(manifest.raw_source_retained, false, `${dir}: raw source retention drift`);
  assert.equal(manifest.archived_visible_text_retained, false, `${dir}: visible text retention drift`);
  assert.equal(manifest.street_address_rows_retained, 0, `${dir}: street address retention drift`);
  assert.equal(manifest.contact_detail_rows_retained, 0, `${dir}: contact retention drift`);
  assert.equal(manifest.private_support_rows, 0, `${dir}: private support drift`);
  assert.equal(manifest.identity_admitted, false, `${dir}: identity authority drift`);
  assert.equal(manifest.negative_existence_claim_created, false, `${dir}: absence authority drift`);
  assert.equal(manifest.outside_human_dependency, false, `${dir}: outside-human drift`);
  assert.equal(manifest.publication_effect, 'none', `${dir}: publication drift`);
  assert.equal(manifest.adoption_effect, 'none', `${dir}: adoption drift`);
  assert.equal(manifest.graph_effect, 'none', `${dir}: graph drift`);
  assert.equal(manifest.promotes_to, 'candidate_only', `${dir}: promotion drift`);
  return manifest;
}

function verifyPredecessor() {
  for (const [filename, expected] of Object.entries(PREDECESSOR_FILE_SHA256)) {
    const file = path.join(DATA_DIR, filename);
    assert(fs.existsSync(file), `predecessor missing ${filename}`);
    assert.equal(sha256File(file), expected, `predecessor SHA drift ${filename}`);
  }
  const validator = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  assert.equal(sha256File(validator), PREDECESSOR_VALIDATOR_SHA256, 'predecessor validator SHA drift');

  const manifest = readJson(path.join(DATA_DIR, 'manifest.json'));
  const coverage = readJson(path.join(DATA_DIR, 'coverage-matrix.json'));
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS, 'predecessor source count drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage count drift');
  assert.equal(manifest.counts.explicit_gap_rows, PREDECESSOR_GAP_ROWS, 'predecessor gap count drift');
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage rows drift');
  assert.equal(coverage.explicit_nulls_and_gaps.length, PREDECESSOR_GAP_ROWS, 'predecessor gap rows drift');
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-15.jsonl', 'predecessor source inventory tail drift');
  assert(!manifest.files[SOURCE_FILE], 'reconciliation package already materialized');
}

function attemptReceiptId(phase, locatorId) {
  return `r-schoolhouse-archive-minimum-legal-surface-${phase}-${locatorSuffix(locatorId)}-${AS_OF}`;
}

function normalizeAttempt(row, phase, artifact) {
  const suffix = locatorSuffix(row.locator_id);
  return {
    ...row,
    schema_version: 'schoolhouse-archive-minimum-legal-surface-attempt@1',
    attempt_id: `schoolhouse-archive-minimum-legal-surface-attempt-${phase}-${suffix}`,
    attempt_receipt_id: attemptReceiptId(phase, row.locator_id),
    acquisition_phase: phase === 'baseline' ? 'minimum_legal_surface_baseline' : 'bounded_transport_replay',
    attempt_number_for_locator: phase === 'baseline' ? 1 : 2,
    workflow_run_id: artifact.workflow_run_id,
    artifact_id: artifact.artifact_id,
    artifact_digest: artifact.artifact_digest,
    acquisition_head: artifact.acquisition_head,
    state_class: stateClass(row),
    raw_source_retained: false,
    visible_text_retained: false,
    form_values_retained: false,
    jsonld_raw_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function build(baselineDir, replayDir) {
  verifyPredecessor();
  verifyChecksums(baselineDir);
  verifyChecksums(replayDir);
  verifyArtifactManifest(baselineDir, 'schoolhouse-archive-minimum-legal-surface-artifact@1', BASELINE_MANIFEST_SHA256);
  verifyArtifactManifest(replayDir, 'schoolhouse-archive-minimum-legal-surface-replay-artifact@1', REPLAY_MANIFEST_SHA256);

  for (const [file, expected] of [
    ['selected-locators.jsonl', BASELINE_SELECTED_SHA256],
    ['archived-content-route-results.jsonl', BASELINE_ROUTE_RESULTS_SHA256],
    ['archived-content-legal-signals.jsonl', BASELINE_SIGNALS_SHA256],
    ['archived-content-discovered-legal-links.jsonl', BASELINE_LINKS_SHA256],
    ['summary.json', BASELINE_SUMMARY_SHA256],
    ['route-policy.json', BASELINE_POLICY_SHA256],
  ]) assert.equal(sha256File(path.join(baselineDir, file)), expected, `baseline ${file} SHA drift`);
  for (const [file, expected] of [
    ['replay-route-results.jsonl', REPLAY_ROUTE_RESULTS_SHA256],
    ['retry-input.json', REPLAY_RETRY_INPUT_SHA256],
    ['summary.json', REPLAY_SUMMARY_SHA256],
    ['route-policy.json', REPLAY_POLICY_SHA256],
  ]) assert.equal(sha256File(path.join(replayDir, file)), expected, `replay ${file} SHA drift`);

  const baselineSummary = readJson(path.join(baselineDir, 'summary.json'));
  const replaySummary = readJson(path.join(replayDir, 'summary.json'));
  const baselinePolicy = readJson(path.join(baselineDir, 'route-policy.json'));
  const replayPolicy = readJson(path.join(replayDir, 'route-policy.json'));
  const selected = readJsonl(path.join(baselineDir, 'selected-locators.jsonl'));
  const baselineRoutes = readJsonl(path.join(baselineDir, 'archived-content-route-results.jsonl'));
  const replayRoutes = readJsonl(path.join(replayDir, 'replay-route-results.jsonl'));
  const signals = readJsonl(path.join(baselineDir, 'archived-content-legal-signals.jsonl'));
  const links = readJsonl(path.join(baselineDir, 'archived-content-discovered-legal-links.jsonl'));
  const retryInput = readJson(path.join(replayDir, 'retry-input.json'));

  assert.equal(selected.length, 5, 'selected locator denominator drift');
  assert.equal(baselineRoutes.length, 5, 'baseline route denominator drift');
  assert.equal(replayRoutes.length, 2, 'replay route denominator drift');
  assert.equal(signals.length, 3, 'legal signal denominator drift');
  assert.equal(links.length, 2, 'legal link denominator drift');
  assert.equal(baselineSummary.provider_error_routes, 2, 'baseline provider-error denominator drift');
  assert.equal(replaySummary.archived_html_body_custody_rows, 2, 'replay success denominator drift');
  assert.equal(replaySummary.provider_error_routes, 0, 'replay residual-error denominator drift');
  assert.equal(baselinePolicy.selection_contract.selected_locators, 5, 'baseline policy selection drift');
  assert.equal(replayPolicy.source_denominator.replayed_provider_error_routes, 2, 'replay policy denominator drift');
  assert.equal(retryInput.routes.length, 2, 'retry-input route denominator drift');
  assert(unique(selected.map(row => row.locator_id)), 'selected locator IDs must be unique');
  assert.deepEqual(new Set(selected.map(row => row.locator_id)), new Set(baselineRoutes.map(row => row.locator_id)), 'selected/baseline locator drift');
  assert.deepEqual(new Set(retryInput.routes.map(row => row.locator_id)), new Set(replayRoutes.map(row => row.locator_id)), 'retry/replay locator drift');

  const baselineArtifact = {
    workflow_run_id: BASELINE_RUN_ID,
    artifact_id: BASELINE_ARTIFACT_ID,
    artifact_digest: BASELINE_ARTIFACT_DIGEST,
    acquisition_head: BASELINE_HEAD,
  };
  const replayArtifact = {
    workflow_run_id: REPLAY_RUN_ID,
    artifact_id: REPLAY_ARTIFACT_ID,
    artifact_digest: REPLAY_ARTIFACT_DIGEST,
    acquisition_head: REPLAY_HEAD,
  };

  const baselineAttempts = baselineRoutes.map(row => normalizeAttempt(row, 'baseline', baselineArtifact));
  const replayAttempts = replayRoutes.map(row => normalizeAttempt(row, 'replay', replayArtifact));
  const attempts = [...baselineAttempts, ...replayAttempts].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp) || a.attempt_number_for_locator - b.attempt_number_for_locator
  );
  assert(unique(attempts.map(row => row.attempt_id)), 'attempt IDs must be unique');
  assert(unique(attempts.map(row => row.attempt_receipt_id)), 'attempt receipts must be unique');

  const baselineByLocator = new Map(baselineAttempts.map(row => [row.locator_id, row]));
  const replayByLocator = new Map(replayAttempts.map(row => [row.locator_id, row]));
  const selectedByLocator = new Map(selected.map(row => [row.locator_id, row]));

  const priorRoutes = readJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-route-results.jsonl'));
  const priorCustody = readJson(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-custody.json'));
  assert.equal(priorRoutes.length, 7, 'prior launch-era route denominator drift');
  assert.equal(priorCustody.counts.successful_archived_html_routes, 6, 'prior launch-era success drift');
  assert.equal(priorCustody.counts.residual_provider_error_routes, 1, 'prior launch-era error drift');
  const priorByKey = new Map(priorRoutes.map(row => [routeKey(row), row]));

  const routeRows = selected.map(selection => {
    const baseline = baselineByLocator.get(selection.locator_id);
    const replay = replayByLocator.get(selection.locator_id) ?? null;
    assert(baseline, `${selection.locator_id}: missing baseline attempt`);
    const effective = replay ?? baseline;
    assert.equal(effective.status, 200, `${selection.locator_id}: effective route must be successful HTML`);
    assert.equal(effective.archived_html_body_custody, true, `${selection.locator_id}: effective HTML custody drift`);
    const prior = priorByKey.get(routeKey(selection)) ?? null;
    let priorRelation;
    if (!prior) priorRelation = 'novel_locator_not_in_prior_seven_snapshot_denominator';
    else if (prior.effective_state_class === 'archive_content_provider_error_not_absence') {
      priorRelation = 'prior_provider_error_recovered_as_privacy_minimized_html';
    } else {
      assert.equal(effective.content_sha256, prior.response_sha256, `${selection.locator_id}: overlapping content SHA drift`);
      priorRelation = 'exact_content_match_overlap_with_prior_launch_era_custody';
    }
    return {
      schema_version: 'schoolhouse-archive-minimum-legal-surface-route-reconciliation@1',
      route_reconciliation_id: `schoolhouse-archive-minimum-legal-surface-reconciliation-${locatorSuffix(selection.locator_id)}`,
      locator_id: selection.locator_id,
      timestamp: selection.timestamp,
      original_url: selection.original_url,
      queried_url: selection.queried_url,
      replay_locator: selection.replay_locator,
      archive_digest_metadata: selection.archive_digest,
      archived_length_metadata: selection.archived_length_metadata,
      selection_reason: selection.selection_reason,
      source_route_id: selection.source_route_id,
      source_receipt_id: selection.source_receipt_id,
      baseline_attempt_receipt_id: baseline.attempt_receipt_id,
      replay_attempt_receipt_id: replay?.attempt_receipt_id ?? null,
      total_attempts: replay ? 2 : 1,
      baseline_state: baseline.state,
      replay_state: replay?.state ?? null,
      effective_acquisition_phase: effective.acquisition_phase,
      effective_state: effective.state,
      effective_state_class: effective.state_class,
      status: effective.status,
      content_type: effective.content_type,
      response_bytes: effective.response_bytes,
      content_sha256: effective.content_sha256,
      screened_visible_text_chars: effective.screened_visible_text_chars,
      fixed_legal_term_counts: effective.fixed_legal_term_counts,
      fixed_legal_term_total_hits: fixedTermHits(effective),
      legal_signal_rows: effective.legal_signal_rows,
      discovered_legal_link_rows: effective.discovered_legal_link_rows,
      form_rows_observed: effective.form_rows_observed,
      form_control_rows_observed: effective.form_control_rows_observed,
      prior_launch_era_relation: priorRelation,
      prior_launch_era_route_id: prior?.route_id ?? null,
      prior_launch_era_effective_state_class: prior?.effective_state_class ?? null,
      prior_launch_era_content_sha256: prior?.response_sha256 ?? null,
      exact_content_match_to_prior: priorRelation === 'exact_content_match_overlap_with_prior_launch_era_custody',
      prior_provider_error_recovered: priorRelation === 'prior_provider_error_recovered_as_privacy_minimized_html',
      novel_unique_snapshot: priorRelation === 'novel_locator_not_in_prior_seven_snapshot_denominator',
      raw_source_retained: false,
      visible_text_retained: false,
      form_values_retained: false,
      jsonld_raw_retained: false,
      embedded_resources_fetched: 0,
      external_links_fetched: 0,
      forms_submitted: 0,
      interactive_search_submissions: 0,
      organization_name_submissions: 0,
      identifier_submissions: 0,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
      source_rows_acquired: 0,
      identity_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
    };
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const relationCounts = {
    exact_content_match_overlap_rows: routeRows.filter(row => row.exact_content_match_to_prior).length,
    prior_provider_error_recovered_rows: routeRows.filter(row => row.prior_provider_error_recovered).length,
    novel_locator_rows: routeRows.filter(row => row.novel_unique_snapshot).length,
  };
  assert.deepEqual(relationCounts, {
    exact_content_match_overlap_rows: 3,
    prior_provider_error_recovered_rows: 1,
    novel_locator_rows: 1,
  }, 'overlap reconciliation drift');

  const attemptByLocatorPhase = new Map(attempts.map(row => [`${row.locator_id}\u0000${row.acquisition_phase}`, row]));
  const signalRows = signals.map(row => {
    const attempt = attemptByLocatorPhase.get(`${row.source_locator_id}\u0000minimum_legal_surface_baseline`);
    assert(attempt, `${row.signal_id}: missing source attempt`);
    return {
      ...row,
      schema_version: 'schoolhouse-archive-minimum-legal-surface-legal-signal@1',
      attempt_receipt_id: attempt.attempt_receipt_id,
      workflow_run_id: BASELINE_RUN_ID,
      artifact_id: BASELINE_ARTIFACT_ID,
      artifact_digest: BASELINE_ARTIFACT_DIGEST,
      acquisition_head: BASELINE_HEAD,
      acquisition_phase: 'minimum_legal_surface_baseline',
      prior_launch_era_relation: 'corroborates_prior_third_party_domain_marketplace_surface',
      adjudication_state: 'third_party_domain_marketplace_signal_not_schoolhouse_legal_identity',
      registry_grade: false,
      identifier_grade: false,
      identity_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
    };
  }).sort((a, b) => a.signal_id.localeCompare(b.signal_id));

  const linkRows = links.map(row => {
    const attempt = attemptByLocatorPhase.get(`${row.source_locator_id}\u0000minimum_legal_surface_baseline`);
    assert(attempt, `${row.link_id}: missing source attempt`);
    return {
      ...row,
      schema_version: 'schoolhouse-archive-minimum-legal-surface-link-observation@1',
      attempt_receipt_id: attempt.attempt_receipt_id,
      workflow_run_id: BASELINE_RUN_ID,
      artifact_id: BASELINE_ARTIFACT_ID,
      artifact_digest: BASELINE_ARTIFACT_DIGEST,
      acquisition_head: BASELINE_HEAD,
      acquisition_phase: 'minimum_legal_surface_baseline',
      prior_launch_era_relation: 'corroborates_prior_third_party_domain_marketplace_surface',
      adjudication_state: 'third_party_domain_marketplace_legal_link_not_schoolhouse_governance_or_identity',
      fetched: false,
      query_value_retained: false,
      identity_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
    };
  }).sort((a, b) => a.link_id.localeCompare(b.link_id));

  const sourceRows = attempts.map(attempt => {
    const route = routeRows.find(row => row.locator_id === attempt.locator_id);
    assert(route, `${attempt.attempt_id}: missing reconciled route`);
    return {
      receipt_id: attempt.attempt_receipt_id,
      source_id: `schoolhouse-archive-minimum-legal-surface-${attempt.acquisition_phase}-${locatorSuffix(attempt.locator_id)}`,
      locator_url: attempt.replay_locator,
      queried_url: attempt.original_url,
      source_type: 'public_archive_replay_content_request',
      evidence_class: 'primary_public_archive_content_replay_reconciliation_custody',
      source_state: attempt.state_class,
      retrieved_at: attempt.completed_at,
      content_sha256: attempt.content_sha256 ?? null,
      route_result_sha256: sha256Text(JSON.stringify(attempt)),
      workflow_run_id: attempt.workflow_run_id,
      artifact_id: attempt.artifact_id,
      artifact_digest: attempt.artifact_digest,
      acquisition_head: attempt.acquisition_head,
      locator_id: attempt.locator_id,
      source_route_id: attempt.source_route_id,
      source_receipt_id: attempt.source_receipt_id,
      archive_timestamp: attempt.timestamp,
      original_url: attempt.original_url,
      archive_digest_metadata: attempt.archive_digest_metadata,
      request_method: 'GET',
      request_attempts: 1,
      attempt_number_for_locator: attempt.attempt_number_for_locator,
      error_class: attempt.error_class ?? null,
      error_message_sha256: attempt.error_message_sha256 ?? null,
      prior_launch_era_relation: route.prior_launch_era_relation,
      embedded_resources_fetched: 0,
      followup_links_fetched: 0,
      forms_submitted: 0,
      query_submitted: false,
      organization_name_submitted: false,
      identifier_submitted: false,
      source_rows_acquired: 0,
      raw_source_retained: false,
      full_visible_text_retained: false,
      street_address_retained: false,
      contact_details_retained: false,
      private_support_rows: 0,
      identity_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
      note: `${attempt.acquisition_phase} exact Archive replay request; ${attempt.state}; archived body processed ephemerally and discarded when present.`,
    };
  });

  const screenedChars = sum(routeRows.map(row => row.screened_visible_text_chars));
  const fixedHits = sum(routeRows.map(row => row.fixed_legal_term_total_hits));
  const formRows = sum(routeRows.map(row => row.form_rows_observed));
  const formControls = sum(routeRows.map(row => row.form_control_rows_observed));
  assert.equal(screenedChars, 40799, 'screened visible-text denominator drift');
  assert.equal(fixedHits, 5, 'fixed legal-term denominator drift');
  assert.equal(formRows, 2, 'form-row denominator drift');
  assert.equal(formControls, 6, 'form-control denominator drift');
  assert(routeRows.every(row => row.status === 200 && row.effective_state_class === 'captured_archived_html_surface_privacy_minimized'), 'effective route state drift');
  assert.equal(routeRows.filter(row => row.timestamp === '20240418064153')[0].fixed_legal_term_total_hits, 3, 'April 18 self-description term drift');
  assert.equal(routeRows.filter(row => row.timestamp === '20240725192225')[0].fixed_legal_term_total_hits, 0, 'July 25 fixed-term drift');

  writeJsonl(path.join(DATA_DIR, ATTEMPT_FILE), attempts);
  writeJsonl(path.join(DATA_DIR, ROUTE_FILE), routeRows);
  writeJsonl(path.join(DATA_DIR, SIGNAL_FILE), signalRows);
  writeJsonl(path.join(DATA_DIR, LINK_FILE), linkRows);
  writeJsonl(path.join(DATA_DIR, SOURCE_FILE), sourceRows);

  const builderSha256 = sha256File(fileURLToPath(import.meta.url));
  const custody = {
    schema_version: 'schoolhouse-archive-minimum-legal-surface-reconciliation-custody@1',
    as_of: AS_OF,
    canonical_parent: {
      commit: CANONICAL_PARENT_COMMIT,
      tree: CANONICAL_PARENT_TREE,
      prior_custody_file: 'schoolhouse-launch-era-archive-content-custody.json',
    },
    acquisitions: {
      minimum_surface_baseline: {
        workflow_run_id: BASELINE_RUN_ID,
        artifact_id: BASELINE_ARTIFACT_ID,
        artifact_digest: BASELINE_ARTIFACT_DIGEST,
        acquisition_head: BASELINE_HEAD,
        selected_locators_sha256: BASELINE_SELECTED_SHA256,
        route_results_sha256: BASELINE_ROUTE_RESULTS_SHA256,
        legal_signals_sha256: BASELINE_SIGNALS_SHA256,
        legal_links_sha256: BASELINE_LINKS_SHA256,
        route_policy_sha256: BASELINE_POLICY_SHA256,
        summary_sha256: BASELINE_SUMMARY_SHA256,
        artifact_manifest_sha256: BASELINE_MANIFEST_SHA256,
        selected_locator_rows: 5,
        successful_html_routes: 3,
        provider_error_routes: 2,
      },
      bounded_transport_replay: {
        workflow_run_id: REPLAY_RUN_ID,
        artifact_id: REPLAY_ARTIFACT_ID,
        artifact_digest: REPLAY_ARTIFACT_DIGEST,
        acquisition_head: REPLAY_HEAD,
        retry_input_sha256: REPLAY_RETRY_INPUT_SHA256,
        route_results_sha256: REPLAY_ROUTE_RESULTS_SHA256,
        route_policy_sha256: REPLAY_POLICY_SHA256,
        summary_sha256: REPLAY_SUMMARY_SHA256,
        artifact_manifest_sha256: REPLAY_MANIFEST_SHA256,
        replay_attempt_rows: 2,
        successful_html_routes: 2,
        residual_provider_error_routes: 0,
        maximum_parallel_workers: 1,
        inter_request_delay_seconds: 3,
      },
    },
    relationship_to_prior_launch_era_custody: {
      prior_declared_snapshots: 7,
      selected_locator_rows: 5,
      overlapping_locator_rows: 4,
      exact_content_match_overlap_rows: 3,
      prior_provider_error_recovered_rows: 1,
      novel_locator_rows: 1,
      cumulative_unique_archive_snapshots: 8,
      cumulative_successful_archive_snapshots: 8,
      cumulative_residual_provider_error_routes: 0,
      denominator_inflation_prohibited: true,
    },
    counts: {
      selected_locator_rows: 5,
      baseline_attempt_rows: 5,
      replay_attempt_rows: 2,
      total_attempt_rows: 7,
      effective_route_rows: 5,
      successful_archived_html_routes: 5,
      residual_provider_error_routes: 0,
      overlap_locator_rows: 4,
      exact_content_match_overlap_rows: 3,
      prior_provider_error_recovered_rows: 1,
      novel_locator_rows: 1,
      legal_signal_rows: 3,
      legal_link_rows: 2,
      privacy_minimized_form_rows: formRows,
      privacy_minimized_form_control_rows: formControls,
      screened_visible_text_chars: screenedChars,
      fixed_legal_term_hits: fixedHits,
      april_18_tax_status_self_description_term_hits: 3,
      july_25_fixed_legal_term_hits: 0,
      exact_legal_name_candidate_rows: 0,
      ein_candidate_rows: 0,
      fiscal_sponsor_candidate_rows: 0,
      source_rows_acquired: 0,
      admitted_identity_rows: 0,
      negative_existence_claims_created: 0,
      cumulative_unique_archive_snapshots: 8,
      cumulative_successful_archive_snapshots: 8,
      cumulative_residual_provider_error_routes: 0,
    },
    findings: {
      overlap_state: 'Three overlapping snapshots reproduce the exact archived content SHA-256 already preserved in the seven-snapshot launch-era custody.',
      recovered_april_18_state: 'The April 18, 2024 BVVC-connect snapshot was recovered as privacy-minimized HTML on the later bounded replay. It contains fixed 501(c)(3), nonprofit, and public-charity term hits but no registry-grade legal name, EIN, exemption record, fiscal sponsor, formation, officer, board, governance, funding, control, or related-party candidate.',
      novel_july_25_state: 'The July 25, 2024 School.House home snapshot is the one novel locator. Its 23,430 screened visible-text characters contain zero fixed legal-identity term hits and yield no legal signal, legal-link, or form row; this bounded zero is not absence evidence.',
      third_party_marketplace_state: 'The three legal signals and two unfetched legal links are Dan.com marketplace observations on the overlapping June 2023 domain-sale surface and are not School.House identity or governance evidence.',
    },
    interpretation: {
      overlap_rows_do_not_inflate_unique_snapshot_denominator: true,
      exact_content_match_is_reproducibility_custody_not_new_evidence: true,
      recovered_archived_first_party_tax_status_language_is_self_description_not_registry_identity: true,
      bounded_zero_fixed_term_result_is_not_absence: true,
      third_party_marketplace_signal_is_not_schoolhouse_legal_identity: true,
      linked_legal_surface_is_unfetched_lead_only: true,
      no_identity_may_be_admitted_by_this_reconciliation: true,
    },
    privacy: {
      raw_archive_bodies_retained: false,
      full_visible_text_retained: false,
      raw_jsonld_retained: false,
      form_values_retained: false,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    terminal_frontier: {
      prior_seven_snapshot_denominator_must_not_be_repeated: true,
      minimum_five_locator_denominator_must_not_be_repeated: true,
      two_route_replay_denominator_must_not_be_repeated: true,
      cumulative_archive_snapshot_reconciliation_terminal: true,
      registry_grade_legal_identity_open: true,
      remaining_registry_grade_fields: [
        'exact legal name', 'EIN', 'exemption record', 'formation documents', 'officers', 'board',
        'governance', 'funding', 'fiscal sponsor', 'related parties', 'differently named corporation',
        'state-only registration',
      ],
      outside_human_dependency: false,
    },
    builder_sha256: builderSha256,
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_exemption_record: null,
    admitted_fiscal_sponsor: null,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
  writeJson(path.join(DATA_DIR, CUSTODY_FILE), custody);

  const schoolhousePath = path.join(DATA_DIR, 'schoolhouse.json');
  const schoolhouse = readJson(schoolhousePath);
  assert(!schoolhouse.state_registry_identity_census.archive_minimum_legal_surface_reconciliation, 'School.House reconciliation projection already exists');
  schoolhouse.state_registry_identity_census.archive_minimum_legal_surface_reconciliation = {
    as_of: AS_OF,
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    selected_locator_rows: 5,
    overlap_locator_rows: 4,
    exact_content_match_overlap_rows: 3,
    prior_provider_error_recovered_rows: 1,
    novel_locator_rows: 1,
    total_attempt_rows: 7,
    successful_archived_html_routes: 5,
    residual_provider_error_routes: 0,
    screened_visible_text_chars: screenedChars,
    fixed_legal_term_hits: fixedHits,
    april_18_tax_status_self_description_term_hits: 3,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    cumulative_unique_archive_snapshots: 8,
    cumulative_successful_archive_snapshots: 8,
    cumulative_residual_provider_error_routes: 0,
    identity_state: 'unresolved_after_cumulative_eight_snapshot_archive_reconciliation_no_registry_identity_admitted',
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_fiscal_sponsor: null,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: CUSTODY_FILE,
  };
  writeJson(schoolhousePath, schoolhouse);

  const frontierPath = path.join(DATA_DIR, 'acquisition-frontier.json');
  const frontier = readJson(frontierPath);
  const schoolhouseTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(schoolhouseTask, 'School.House frontier task missing');
  assert(!schoolhouseTask.prior_archive_minimum_legal_surface_reconciliation, 'frontier reconciliation projection already exists');
  schoolhouseTask.prior_archive_minimum_legal_surface_reconciliation = {
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    baseline_artifact_digest: BASELINE_ARTIFACT_DIGEST,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    replay_artifact_digest: REPLAY_ARTIFACT_DIGEST,
    selected_locator_rows: 5,
    overlap_locator_rows: 4,
    exact_content_match_overlap_rows: 3,
    prior_provider_error_recovered_rows: 1,
    novel_locator_rows: 1,
    total_attempt_rows: 7,
    successful_archived_html_routes: 5,
    residual_provider_error_routes: 0,
    screened_visible_text_chars: screenedChars,
    fixed_legal_term_hits: fixedHits,
    cumulative_unique_archive_snapshots: 8,
    cumulative_successful_archive_snapshots: 8,
    cumulative_residual_provider_error_routes: 0,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    admitted_identities: 0,
    state: 'terminal_cumulative_eight_snapshot_archive_reconciliation_no_registry_identity_admitted',
    custody_file: CUSTODY_FILE,
  };
  schoolhouseTask.next_transition = 'Do not repeat the frozen North Carolina route/PDF denominators, the forty-six-route live first-party census, the Archive locator metadata protocol, the seven-snapshot launch-era archived-content denominator, the five-locator minimum-surface lane, or its two-route replay. The cumulative archive plane now preserves eight unique snapshots with privacy-minimized HTML custody and zero residual provider-error routes. Treat every nonprofit, public-charity, and 501(c)(3) phrase as historical first-party self-description only. Continue registry-grade legal-name, EIN, exemption, formation, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence.';
  writeJson(frontierPath, frontier);

  const coveragePath = path.join(DATA_DIR, 'coverage-matrix.json');
  const coverage = readJson(coveragePath);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'coverage predecessor denominator drift');
  assert.equal(coverage.explicit_nulls_and_gaps.length, PREDECESSOR_GAP_ROWS, 'coverage predecessor gap drift');
  coverage.denominators.push({
    surface: 'School.House archived legal-surface minimum-lane reconciliation custody',
    declared_total: 5,
    enumerated_total: 5,
    baseline_attempt_rows: 5,
    bounded_replay_attempt_rows: 2,
    total_attempt_rows: 7,
    overlap_locator_rows: 4,
    exact_content_match_overlap_rows: 3,
    prior_provider_error_recovered_rows: 1,
    novel_locator_rows: 1,
    successful_archived_html_routes: 5,
    residual_provider_error_routes: 0,
    legal_signal_rows: 3,
    legal_link_rows: 2,
    privacy_minimized_form_rows: formRows,
    privacy_minimized_form_control_rows: formControls,
    screened_visible_text_chars: screenedChars,
    fixed_legal_term_hits: fixedHits,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    cumulative_unique_archive_snapshots: 8,
    cumulative_successful_archive_snapshots: 8,
    cumulative_residual_provider_error_routes: 0,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_cumulative_eight_snapshot_archive_reconciliation_no_registry_identity_admitted',
  });
  const priorGap = coverage.explicit_nulls_and_gaps.at(-1);
  assert(priorGap.includes('One April 18 connect snapshot remains provider-error custody after one replay.'), 'prior School.House archive gap marker drift');
  coverage.explicit_nulls_and_gaps[coverage.explicit_nulls_and_gaps.length - 1] = 'School.House public identity remains unresolved after the complete first-party live-surface census, the Archive metadata protocol, the seven-snapshot launch-era pass, and the late five-locator reconciliation. Four selected late-lane locators overlap the prior denominator: three reproduce the exact archived content SHA-256 and the former April 18 provider-error route is recovered as privacy-minimized HTML. The novel July 25 home snapshot contributes 23,430 screened visible-text characters with zero fixed legal-identity term hits. The recovered April 18 connect surface contains fixed 501(c)(3), nonprofit, and public-charity term hits but no registry-grade legal name, EIN, exemption record, fiscal sponsor, formation, officer, board, governance, funding, control, or related-party candidate. The cumulative plane contains eight unique archived snapshots, all eight with privacy-minimized HTML custody, and zero residual provider-error routes. These bounded results are not absence evidence.';
  writeJson(coveragePath, coverage);

  const readmePath = path.join(DATA_DIR, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = replaceOnce(readme, 'public-source receipts                        418', 'public-source receipts                        425', 'README source count');
  readme = replaceOnce(readme, '`source-inventory-01.jsonl` through `source-inventory-15.jsonl`', '`source-inventory-01.jsonl` through `source-inventory-16.jsonl`', 'README source inventory range');
  const countMarker = 'launch-era archived public identities admitted               0\n';
  const countAddition = `archive minimum reconciliation selected locators        5 / 5\narchive minimum reconciliation baseline/replay attempts 5 / 2\narchive minimum reconciliation overlap/novel locators   4 / 1\narchive minimum reconciliation exact-match/recovered    3 / 1\narchive minimum reconciliation successful/error routes 5 / 0\narchive minimum reconciliation signal/link/form rows    3 / 2 / 2\narchive minimum reconciliation form-control rows             6\narchive minimum reconciliation screened text chars      40,799\narchive minimum reconciliation fixed legal-term hits         5\narchive cumulative unique/successful snapshots           8 / 8\narchive cumulative residual provider-error routes            0\narchive reconciliation exact legal-name/EIN candidates     0 / 0\narchive reconciliation public identities admitted             0\n`;
  readme = replaceOnce(readme, countMarker, countMarker + countAddition, 'README reconciliation counts');
  const fileMarker = '- `schoolhouse-launch-era-archive-content-custody.json`, the ten-attempt, seven-route, privacy-minimized surface, candidate, and link ledgers, and `source-inventory-15.jsonl` preserve six successful archived HTML surfaces and one repeated provider error. The four prelaunch successes are one parked-domain and three domain-marketplace surfaces; two 2024 successes are early first-party School.House surfaces. Two tax-status phrases remain historical self-description rather than registry identity, and zero legal names, EINs, exemption records, or fiscal sponsors are admitted.\n';
  const fileAddition = `- \`${CUSTODY_FILE}\`, the seven-attempt, five-route overlap ledger, the three marketplace-signal rows, the two unfetched legal-link rows, and \`${SOURCE_FILE}\` reconcile the later minimum-surface acquisition without inflating the unique snapshot denominator. Three overlaps reproduce exact content hashes, the prior April 18 provider error is recovered, and the July 25 home snapshot is novel. The cumulative plane contains eight unique successful snapshots and still admits no legal name, EIN, exemption record, fiscal sponsor, or public identity.\n`;
  readme = replaceOnce(readme, fileMarker, fileMarker + fileAddition, 'README reconciliation file');
  const narrativeMarker = 'The launch-era archived-content successor then selected seven exact change-point snapshots from the terminal Archive locator plane and replayed only the three initial transport failures once. The effective result preserves six privacy-minimized archived HTML surfaces and one repeated provider error across ten attempts. November 2022 was a parked-domain surface; June, September, and December 2023 were Dan.com marketplace pages. The recovered March 5, 2024 connect surface contains nonprofit and public-charity self-description, while the March 24 home surface supplies no identity candidate. No archived surface supplies a registry-grade legal name, EIN, exemption record, fiscal sponsor, formation, officer, board, governance, funding, control, or related-party record.\n';
  const narrativeAddition = '\nThe late minimum-surface reconciliation then compared five separately acquired Archive locators against that sealed seven-snapshot product. Four locators overlap: three reproduce exact archived content hashes and the April 18, 2024 connect route converts from repeated provider-error custody to privacy-minimized HTML. The July 25, 2024 home snapshot is the sole novel locator. April 18 repeats 501(c)(3), nonprofit, and public-charity terminology without a registry-grade identity candidate; July 25 contains zero fixed legal-identity term hits across 23,430 screened visible-text characters. The cumulative union is eight unique snapshots, all eight successfully screened, with zero residual provider errors and zero identity admissions.\n';
  readme = replaceOnce(readme, narrativeMarker, narrativeMarker + narrativeAddition, 'README reconciliation narrative');
  fs.writeFileSync(readmePath, readme);

  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const manifest = readJson(manifestPath);
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS, 'manifest predecessor source count drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'manifest predecessor coverage count drift');
  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_archive_minimum_legal_surface_selected_locator_rows: 5,
    schoolhouse_archive_minimum_legal_surface_baseline_attempt_rows: 5,
    schoolhouse_archive_minimum_legal_surface_replay_attempt_rows: 2,
    schoolhouse_archive_minimum_legal_surface_total_attempt_rows: 7,
    schoolhouse_archive_minimum_legal_surface_effective_route_rows: 5,
    schoolhouse_archive_minimum_legal_surface_overlap_locator_rows: 4,
    schoolhouse_archive_minimum_legal_surface_exact_content_match_overlap_rows: 3,
    schoolhouse_archive_minimum_legal_surface_prior_provider_error_recovered_rows: 1,
    schoolhouse_archive_minimum_legal_surface_novel_locator_rows: 1,
    schoolhouse_archive_minimum_legal_surface_successful_html_routes: 5,
    schoolhouse_archive_minimum_legal_surface_residual_provider_error_routes: 0,
    schoolhouse_archive_minimum_legal_surface_legal_signal_rows: 3,
    schoolhouse_archive_minimum_legal_surface_legal_link_rows: 2,
    schoolhouse_archive_minimum_legal_surface_form_rows: formRows,
    schoolhouse_archive_minimum_legal_surface_form_control_rows: formControls,
    schoolhouse_archive_minimum_legal_surface_screened_visible_text_chars: screenedChars,
    schoolhouse_archive_minimum_legal_surface_fixed_legal_term_hits: fixedHits,
    schoolhouse_archive_minimum_legal_surface_exact_legal_name_candidate_rows: 0,
    schoolhouse_archive_minimum_legal_surface_ein_candidate_rows: 0,
    schoolhouse_archive_minimum_legal_surface_fiscal_sponsor_candidate_rows: 0,
    schoolhouse_archive_minimum_legal_surface_source_rows_acquired: 0,
    schoolhouse_archive_minimum_legal_surface_admitted_identity_rows: 0,
    schoolhouse_archive_cumulative_unique_snapshot_rows: 8,
    schoolhouse_archive_cumulative_successful_snapshot_rows: 8,
    schoolhouse_archive_cumulative_residual_provider_error_routes: 0,
  });
  manifest.storage_contract.source_inventory_parts.push(SOURCE_FILE);
  Object.assign(manifest.storage_contract, {
    schoolhouse_archive_minimum_legal_surface_reconciliation_custody: CUSTODY_FILE,
    schoolhouse_archive_minimum_legal_surface_attempt_results: ATTEMPT_FILE,
    schoolhouse_archive_minimum_legal_surface_route_reconciliation: ROUTE_FILE,
    schoolhouse_archive_minimum_legal_surface_legal_signals: SIGNAL_FILE,
    schoolhouse_archive_minimum_legal_surface_link_inventory: LINK_FILE,
  });
  for (const filename of [
    'acquisition-frontier.json', 'coverage-matrix.json', 'schoolhouse.json',
    SOURCE_FILE, CUSTODY_FILE, ATTEMPT_FILE, ROUTE_FILE, SIGNAL_FILE, LINK_FILE,
  ]) manifest.files[filename] = fileReceipt(filename);
  writeJson(manifestPath, manifest);

  const validatorPath = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  let validator = fs.readFileSync(validatorPath, 'utf8');
  const oldSource = 'manifest.counts.source_inventory_rows === 418';
  const oldCoverage = 'manifest.counts.coverage_denominator_rows === 25';
  assert.equal(countOccurrences(validator, oldSource), 6, 'validator source count occurrence drift');
  assert.equal(countOccurrences(validator, oldCoverage), 6, 'validator coverage count occurrence drift');
  validator = validator.split(oldSource).join('manifest.counts.source_inventory_rows === 425');
  validator = validator.split(oldCoverage).join('manifest.counts.coverage_denominator_rows === 26');

  const validatorBlock = `\n\n  {\n    const reconciliationCustody = readJson(path.join(dir, '${CUSTODY_FILE}'));\n    const reconciliationAttempts = readJsonl(path.join(dir, '${ATTEMPT_FILE}'));\n    const reconciliationRoutes = readJsonl(path.join(dir, '${ROUTE_FILE}'));\n    const reconciliationSignals = readJsonl(path.join(dir, '${SIGNAL_FILE}'));\n    const reconciliationLinks = readJsonl(path.join(dir, '${LINK_FILE}'));\n    const priorLaunchRoutes = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-route-results.jsonl'));\n    const receiptIds = new Set(sourceInventory.map(row => row.receipt_id));\n    const baselineAttempts = reconciliationAttempts.filter(row => row.acquisition_phase === 'minimum_legal_surface_baseline');\n    const replayAttempts = reconciliationAttempts.filter(row => row.acquisition_phase === 'bounded_transport_replay');\n    const exactMatches = reconciliationRoutes.filter(row => row.exact_content_match_to_prior);\n    const recoveredErrors = reconciliationRoutes.filter(row => row.prior_provider_error_recovered);\n    const novelRoutes = reconciliationRoutes.filter(row => row.novel_unique_snapshot);\n    const uniqueUnion = new Set([...priorLaunchRoutes, ...reconciliationRoutes].map(row => row.timestamp + '\\u0000' + row.original_url));\n\n    check(manifest.counts.source_inventory_rows === 425, 'archive reconciliation source denominator drift');\n    check(manifest.counts.coverage_denominator_rows === 26, 'archive reconciliation coverage denominator drift');\n    check(manifest.counts.explicit_gap_rows === 16, 'archive reconciliation gap denominator drift');\n    check(reconciliationAttempts.length === 7 && baselineAttempts.length === 5 && replayAttempts.length === 2, 'archive reconciliation attempt denominator drift');\n    check(reconciliationRoutes.length === 5 && reconciliationRoutes.every(row => row.status === 200 && row.effective_state_class === 'captured_archived_html_surface_privacy_minimized'), 'archive reconciliation route denominator drift');\n    check(exactMatches.length === 3 && recoveredErrors.length === 1 && novelRoutes.length === 1 && uniqueUnion.size === 8, 'archive reconciliation overlap/union drift');\n    check(reconciliationSignals.length === 3 && reconciliationLinks.length === 2, 'archive reconciliation evidence denominator drift');\n    check(reconciliationRoutes.reduce((total, row) => total + row.form_rows_observed, 0) === 2 && reconciliationRoutes.reduce((total, row) => total + row.form_control_rows_observed, 0) === 6, 'archive reconciliation form denominator drift');\n    check(reconciliationRoutes.reduce((total, row) => total + row.screened_visible_text_chars, 0) === 40799, 'archive reconciliation screened-text denominator drift');\n    check(reconciliationRoutes.reduce((total, row) => total + row.fixed_legal_term_total_hits, 0) === 5, 'archive reconciliation fixed-term denominator drift');\n    check(reconciliationRoutes.find(row => row.timestamp === '20240418064153')?.fixed_legal_term_total_hits === 3, 'archive reconciliation April 18 self-description drift');\n    check(reconciliationRoutes.find(row => row.timestamp === '20240725192225')?.fixed_legal_term_total_hits === 0, 'archive reconciliation July 25 fixed-term drift');\n\n    check(unique(reconciliationAttempts.map(row => row.attempt_id)) && unique(reconciliationAttempts.map(row => row.attempt_receipt_id)), 'archive reconciliation attempt IDs must be unique');\n    check(unique(reconciliationRoutes.map(row => row.route_reconciliation_id)) && unique(reconciliationRoutes.map(row => row.locator_id)), 'archive reconciliation route IDs must be unique');\n    check(reconciliationAttempts.every(row => receiptIds.has(row.attempt_receipt_id) && row.request_attempts === 1 && row.request_method === 'GET'), 'archive reconciliation attempt receipt/request drift');\n    check(reconciliationAttempts.every(row => row.raw_source_retained === false && row.visible_text_retained === false && row.form_values_retained === false && row.jsonld_raw_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'archive reconciliation attempt privacy drift');\n    check(reconciliationAttempts.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'archive reconciliation attempt authority drift');\n    check(reconciliationRoutes.every(row => receiptIds.has(row.baseline_attempt_receipt_id) && (row.replay_attempt_receipt_id === null || receiptIds.has(row.replay_attempt_receipt_id))), 'archive reconciliation route receipt linkage drift');\n    check(reconciliationRoutes.every(row => row.raw_source_retained === false && row.visible_text_retained === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'archive reconciliation route authority drift');\n    check(reconciliationSignals.every(row => receiptIds.has(row.attempt_receipt_id) && row.registry_grade === false && row.identifier_grade === false && row.identity_admitted === false && row.adjudication_state === 'third_party_domain_marketplace_signal_not_schoolhouse_legal_identity' && row.graph_effect === 'none'), 'archive reconciliation signal authority drift');\n    check(reconciliationLinks.every(row => receiptIds.has(row.attempt_receipt_id) && row.fetched === false && row.query_value_retained === false && row.identity_admitted === false && row.adjudication_state === 'third_party_domain_marketplace_legal_link_not_schoolhouse_governance_or_identity' && row.graph_effect === 'none'), 'archive reconciliation link authority drift');\n\n    check(reconciliationCustody.canonical_parent.commit === '${CANONICAL_PARENT_COMMIT}' && reconciliationCustody.canonical_parent.tree === '${CANONICAL_PARENT_TREE}', 'archive reconciliation parent custody drift');\n    check(reconciliationCustody.acquisitions.minimum_surface_baseline.workflow_run_id === ${BASELINE_RUN_ID} && reconciliationCustody.acquisitions.minimum_surface_baseline.artifact_id === ${BASELINE_ARTIFACT_ID} && reconciliationCustody.acquisitions.minimum_surface_baseline.artifact_digest === '${BASELINE_ARTIFACT_DIGEST}' && reconciliationCustody.acquisitions.minimum_surface_baseline.route_results_sha256 === '${BASELINE_ROUTE_RESULTS_SHA256}', 'archive reconciliation baseline acquisition drift');\n    check(reconciliationCustody.acquisitions.bounded_transport_replay.workflow_run_id === ${REPLAY_RUN_ID} && reconciliationCustody.acquisitions.bounded_transport_replay.artifact_id === ${REPLAY_ARTIFACT_ID} && reconciliationCustody.acquisitions.bounded_transport_replay.artifact_digest === '${REPLAY_ARTIFACT_DIGEST}' && reconciliationCustody.acquisitions.bounded_transport_replay.route_results_sha256 === '${REPLAY_ROUTE_RESULTS_SHA256}', 'archive reconciliation replay acquisition drift');\n    check(reconciliationCustody.counts.selected_locator_rows === 5 && reconciliationCustody.counts.total_attempt_rows === 7 && reconciliationCustody.counts.successful_archived_html_routes === 5 && reconciliationCustody.counts.residual_provider_error_routes === 0 && reconciliationCustody.counts.cumulative_unique_archive_snapshots === 8 && reconciliationCustody.counts.cumulative_successful_archive_snapshots === 8, 'archive reconciliation custody denominator drift');\n    check(reconciliationCustody.relationship_to_prior_launch_era_custody.overlapping_locator_rows === 4 && reconciliationCustody.relationship_to_prior_launch_era_custody.exact_content_match_overlap_rows === 3 && reconciliationCustody.relationship_to_prior_launch_era_custody.prior_provider_error_recovered_rows === 1 && reconciliationCustody.relationship_to_prior_launch_era_custody.novel_locator_rows === 1 && reconciliationCustody.relationship_to_prior_launch_era_custody.denominator_inflation_prohibited === true, 'archive reconciliation relationship drift');\n    check(reconciliationCustody.interpretation.overlap_rows_do_not_inflate_unique_snapshot_denominator === true && reconciliationCustody.interpretation.recovered_archived_first_party_tax_status_language_is_self_description_not_registry_identity === true && reconciliationCustody.interpretation.bounded_zero_fixed_term_result_is_not_absence === true, 'archive reconciliation interpretation drift');\n    check(reconciliationCustody.privacy.raw_archive_bodies_retained === false && reconciliationCustody.privacy.full_visible_text_retained === false && reconciliationCustody.privacy.raw_jsonld_retained === false && reconciliationCustody.privacy.form_values_retained === false && reconciliationCustody.privacy.street_address_rows_retained === 0 && reconciliationCustody.privacy.contact_detail_rows_retained === 0 && reconciliationCustody.privacy.private_support_rows === 0, 'archive reconciliation privacy drift');\n    check(reconciliationCustody.public_schoolhouse_identity_admitted === false && reconciliationCustody.admitted_legal_name === null && reconciliationCustody.admitted_ein === null && reconciliationCustody.admitted_exemption_record === null && reconciliationCustody.admitted_fiscal_sponsor === null && reconciliationCustody.negative_existence_claim_created === false && reconciliationCustody.outside_human_dependency === false && reconciliationCustody.graph_effect === 'none', 'archive reconciliation identity authority drift');\n\n    const projection = schoolhouse.state_registry_identity_census?.archive_minimum_legal_surface_reconciliation;\n    check(projection?.selected_locator_rows === 5 && projection?.overlap_locator_rows === 4 && projection?.novel_locator_rows === 1 && projection?.prior_provider_error_recovered_rows === 1 && projection?.cumulative_unique_archive_snapshots === 8 && projection?.cumulative_successful_archive_snapshots === 8 && projection?.cumulative_residual_provider_error_routes === 0 && projection?.public_schoolhouse_identity_admitted === false, 'archive reconciliation School.House projection drift');\n    const frontierProjection = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_archive_minimum_legal_surface_reconciliation;\n    check(frontierProjection?.selected_locator_rows === 5 && frontierProjection?.overlap_locator_rows === 4 && frontierProjection?.novel_locator_rows === 1 && frontierProjection?.cumulative_unique_archive_snapshots === 8 && frontierProjection?.admitted_identities === 0, 'archive reconciliation frontier projection drift');\n    check(coverage.denominators.some(row => row.surface === 'School.House archived legal-surface minimum-lane reconciliation custody' && row.enumerated_total === 5 && row.overlap_locator_rows === 4 && row.novel_locator_rows === 1 && row.successful_archived_html_routes === 5 && row.residual_provider_error_routes === 0 && row.cumulative_unique_archive_snapshots === 8 && row.admitted_identities === 0), 'archive reconciliation coverage denominator missing');\n  }\n`;
  validator = insertBefore(validator, '\n  return errors;\n}', validatorBlock, 'validator reconciliation block');
  fs.writeFileSync(validatorPath, validator);

  console.log(JSON.stringify({
    schema_version: 'schoolhouse-archive-minimum-legal-surface-reconciliation-build@1',
    canonical_parent_commit: CANONICAL_PARENT_COMMIT,
    canonical_parent_tree: CANONICAL_PARENT_TREE,
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    explicit_gap_rows: EXPECTED_GAP_ROWS,
    selected_locator_rows: 5,
    baseline_attempt_rows: 5,
    replay_attempt_rows: 2,
    total_attempt_rows: 7,
    overlap_locator_rows: 4,
    exact_content_match_overlap_rows: 3,
    prior_provider_error_recovered_rows: 1,
    novel_locator_rows: 1,
    successful_archived_html_routes: 5,
    residual_provider_error_routes: 0,
    legal_signal_rows: 3,
    legal_link_rows: 2,
    privacy_minimized_form_rows: formRows,
    privacy_minimized_form_control_rows: formControls,
    screened_visible_text_chars: screenedChars,
    fixed_legal_term_hits: fixedHits,
    cumulative_unique_archive_snapshots: 8,
    cumulative_successful_archive_snapshots: 8,
    cumulative_residual_provider_error_routes: 0,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    admitted_identity_rows: 0,
    outside_human_dependency: false,
    graph_effect: 'none',
  }, null, 2));
}

const baselineDir = process.argv[2];
const replayDir = process.argv[3];
assert(baselineDir && replayDir, 'usage: node build-schoolhouse-archive-minimum-legal-surface-reconciliation-custody.mjs <baseline-artifact-dir> <replay-artifact-dir>');
build(path.resolve(baselineDir), path.resolve(replayDir));
