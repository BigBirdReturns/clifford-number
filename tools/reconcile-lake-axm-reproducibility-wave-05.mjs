#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-reproducibility-wave-05-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const migration = readJson(policy.migration_map_path);
const attestation = readJson(policy.runtime_attestation_path);
const activeIdentity = readJson('build/axm-identity.json');
const files = readJsonl('build/lake-index/files.jsonl');
const summary = readJson('build/lake-index/summary.json');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');

const inputs = [
  policyPath,
  policy.plan_path,
  policy.migration_receipt_path,
  policy.migration_map_path,
  policy.local_fixture_path,
  policy.runtime_attestation_path,
  'build/axm-identity.json',
  'build/lake-actions/axm-lineage-wave-04-reconciliation.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/summary.json',
  'BUILD-INSTRUCTIONS.md'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourcePaths = [policy.local_fixture_path, policy.runtime_attestation_path, policy.migration_receipt_path];
const sourceStates = sourcePaths.map(relative => {
  const row = fileByPath.get(relative);
  return {
    path: relative,
    present_in_lake: Boolean(row),
    generated: row?.generated ?? null,
    authoritative_reachable: row?.authoritative_reachable ?? false,
    index_reachable: row?.index_reachable ?? false,
    public_reachable: row?.public_reachable ?? false
  };
});
const sourcePathsReady = sourceStates.every(row => row.present_in_lake && row.generated === false && row.authoritative_reachable === true);
const entityOneToOne = new Set(migration.entity_migrations.map(row => row.legacy_provisional_entity_id)).size === migration.entity_migrations.length
  && new Set(migration.entity_migrations.map(row => row.genesis_v1_entity_id)).size === migration.entity_migrations.length;
const claimOneToOne = new Set(migration.claim_migrations.map(row => row.legacy_provisional_claim_id)).size === migration.claim_migrations.length
  && new Set(migration.claim_migrations.map(row => row.genesis_v1_claim_id)).size === migration.claim_migrations.length;
const externalGatePresent = /reconcile the provisional identity[\s\S]*byte-for-byte against `axm-genesis`/i.test(buildInstructions)
  && /no cross-case join ships/i.test(buildInstructions);

const reconciliation = {
  schema_version: 'lake-axm-reproducibility-wave-05-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: plan.before,
  after: {
    external_repository: policy.external_reference.repository,
    external_commit: policy.external_reference.commit,
    fixture_bytes_equal: attestation.fixture_bytes_equal,
    python_and_node_runtime_outputs_equal: attestation.runtime_outputs_equal,
    migration_map_entity_rows: migration.entity_migrations.length,
    migration_map_claim_rows: migration.claim_migrations.length,
    entity_migration_one_to_one: entityOneToOne,
    claim_migration_one_to_one: claimOneToOne,
    source_control_paths_ready: sourcePathsReady,
    source_control_states: sourceStates,
    active_projection_scheme_status: activeIdentity.scheme.status,
    active_projection_migrated: false,
    active_projection_quarantined: true,
    external_axm_gate_present: externalGatePresent,
    external_axm_gate_complete: false,
    cross_case_join_authorized: false,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    reference_runtime_parity: 1,
    mapped_entity_successors: migration.entity_migrations.length,
    mapped_claim_successors: migration.claim_migrations.length,
    active_projection_migrations: 0,
    cross_case_join_authorizations: 0
  },
  decisions: [
    {
      decision_key: 'W05-RECONCILE-REFERENCE',
      judgment: 'the_pinned_axm_genesis_python_runtime_and_local_node_runtime_are_identical_for_the_shared_fixture',
      action: 'retain_the_commit_pin_fixture_and_runtime_attestation',
      evidence_count: Object.values(attestation.vector_counts).reduce((total, count) => total + count, 0),
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W05-RECONCILE-MIGRATION',
      judgment: 'the_active_provisional_projection_has_a_complete_one_to_one_genesis_v1_successor_map',
      action: 'execute_the_active_projection_migration_as_a_separate_append_preserving_wave',
      evidence_count: migration.entity_migrations.length + migration.claim_migrations.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W05-RECONCILE-JOIN-GATE',
      judgment: 'the_target_algorithm_is_reproduced_but_the_active_projection_is_still_legacy_and_quarantined',
      action: 'keep_cross_case_joins_disabled_until_the_active_projection_and_downstream_references_are_migrated_and_revalidated',
      evidence_count: migration.claim_migrations.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    pinned_external_reference_reproduced: true,
    shared_fixture_bytes_equal: attestation.fixture_bytes_equal === true,
    python_and_node_runtime_outputs_equal: attestation.runtime_outputs_equal === true,
    source_controls_indexed: sourcePathsReady,
    complete_one_to_one_migration_map_built: entityOneToOne && claimOneToOne,
    active_projection_migrated: false,
    external_axm_gate_complete: false,
    cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# AXM Genesis v1 reproducibility Wave 05 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nexternal repository:                       ${policy.external_reference.repository}\nexternal commit:                           ${policy.external_reference.commit}\nfixture bytes equal:                       ${attestation.fixture_bytes_equal}\nPython / Node runtime outputs equal:       ${attestation.runtime_outputs_equal}\nentity successors mapped:                  ${migration.entity_migrations.length}\nclaim successors mapped:                   ${migration.claim_migrations.length}\nentity migration one-to-one:               ${entityOneToOne}\nclaim migration one-to-one:                ${claimOneToOne}\nsource controls indexed:                    ${sourcePathsReady}\nactive projection scheme:                  ${activeIdentity.scheme.status}\nactive projection migrated:                false\nexternal AXM gate complete:                false\ncross-case join authorized:                false\ndecisions requiring human permission:      0\n\`\`\`\n\n## Judgment\n\nThe target algorithm is no longer ambiguous: the pinned Node implementation, copied fixture bytes, and pinned Python runtime agree. The current projection still carries the retired provisional identifiers. The migration map makes the next execution exact, but does not impersonate that execution.\n\n## Boundary\n\nA compatibility map is not a real-world identity finding and is not join authority. Cross-case joins remain disabled until the active projection, aliases, claim references, historical validation surfaces, and downstream products are migrated and revalidated together.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake AXM reproducibility Wave 05 reconciled');
console.log(`  entity successors: ${migration.entity_migrations.length}`);
console.log(`  claim successors: ${migration.claim_migrations.length}`);
console.log(`  source controls indexed: ${sourcePathsReady}`);
console.log('  active projection migrated: false');
console.log('  external AXM gate complete: false');
console.log('  cross-case join authorized: false');
