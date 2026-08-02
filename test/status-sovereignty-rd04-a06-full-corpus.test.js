import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePermanent } from '../tools/ssc-rd04-a06-full-corpus.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const PRODUCT = 'data/intake/status-sovereignty-rd04-calfresh-decision-corpus-a06';
const MANIFEST = 'data/project/status-sovereignty-rd04-calfresh-decision-corpus-a06-release-manifest.json';
const SCHEMA = 'schemas/status-sovereignty-rd04-a06-full-corpus.schema.json';

const positive = validatePermanent(ROOT, { checkFiles: true });
if (positive.length) throw new Error(`positive A06 full corpus failed:\n${positive.join('\n')}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd04-a06-test-'));
fs.mkdirSync(path.join(temp, path.dirname(MANIFEST)), { recursive: true });
fs.mkdirSync(path.join(temp, path.dirname(SCHEMA)), { recursive: true });
fs.cpSync(path.join(ROOT, PRODUCT), path.join(temp, PRODUCT), { recursive: true });
fs.copyFileSync(path.join(ROOT, MANIFEST), path.join(temp, MANIFEST));
fs.copyFileSync(path.join(ROOT, SCHEMA), path.join(temp, SCHEMA));

const jsonPath = (rel) => path.join(temp, rel);
const read = (rel) => JSON.parse(fs.readFileSync(jsonPath(rel), 'utf8'));
const write = (rel, value) => fs.writeFileSync(jsonPath(rel), `${JSON.stringify(value, null, 2)}\n`);

const CORE = `${PRODUCT}/core.json`;
const PLAN = `${PRODUCT}/plan.json`;
const ASSETS = `${PRODUCT}/release-assets.json`;
const COMPLIANCE = `${PRODUCT}/compliance-ledger.json`;
const MISSING = `${PRODUCT}/missing-ledger.json`;
const DENOMINATOR_00 = `${PRODUCT}/denominator-shards/00.json`;
const ACQUISITION_00 = `${PRODUCT}/acquisition-shards/00.json`;

const cases = [
  ['core schema version', CORE, (d) => { d.schema_version = 'bad'; }, 'core schema version'],
  ['core identity', CORE, (d) => { d.execution_id = 'OTHER'; }, 'core identity'],
  ['parent custody', CORE, (d) => { d.parent.main_commit = '0'.repeat(40); }, 'parent custody'],
  ['registry row count', CORE, (d) => { d.counts.registry_rows = 1; }, 'registry row count'],
  ['document count', CORE, (d) => { d.counts.unique_documents = 1; }, 'document count'],
  ['shared document groups', CORE, (d) => { d.counts.shared_document_groups = 0; }, 'shared document groups'],
  ['shared row excess', CORE, (d) => { d.counts.shared_document_excess_registry_rows = 0; }, 'shared document excess'],
  ['maximum multiplicity', CORE, (d) => { d.counts.maximum_registry_rows_per_document = 1; }, 'maximum multiplicity'],
  ['terminal receipts', CORE, (d) => { d.counts.terminal_document_receipts = 11671; }, 'terminal document receipts'],
  ['document arithmetic', CORE, (d) => { d.counts.exact_pdf_documents = 0; d.counts.missing_or_non_pdf_documents = 0; }, 'document terminal arithmetic'],
  ['compliance receipt inflation', CORE, (d) => { d.counts.separate_public_compliance_receipts = 1; }, 'compliance receipt count'],
  ['case join inflation', CORE, (d) => { d.counts.case_level_implementation_joins = 1; }, 'case-level join count'],
  ['restoration inflation', CORE, (d) => { d.counts.complete_restorations_observed = 1; }, 'complete restoration count'],
  ['timeliness inflation', CORE, (d) => { d.counts.remedy_timeliness_observed = 1; }, 'remedy timeliness count'],
  ['residual closure inflation', CORE, (d) => { d.counts.residual_classes_closed = 1; }, 'authority closure counts'],
  ['external contact inflation', CORE, (d) => { d.counts.external_contacts = 1; }, 'outside-human counts'],
  ['graph effect count', CORE, (d) => { d.counts.graph_effects = 1; }, 'effect counts'],
  ['A05 aggregate mutation', CORE, (d) => { d.counts.a05_decisions_released = 12282; }, 'A05 aggregate custody'],
  ['registry A05 delta mutation', CORE, (d) => { d.counts.registry_rows_minus_a05_aggregate = 0; }, 'registry/A05 delta'],
  ['document A05 delta mutation', CORE, (d) => { d.counts.download_documents_minus_a05_aggregate = 0; }, 'document/A05 delta'],
  ['sharding count mutation', CORE, (d) => { d.sharding.shard_count = 32; }, 'sharding contract'],
  ['mechanical denominator reversal', CORE, (d) => { d.current_result.complete_mechanical_registry_denominator = false; }, 'mechanical denominator complete'],
  ['administrative universe inflation', CORE, (d) => { d.current_result.complete_fy_administrative_universe = true; }, 'administrative-universe boundary'],
  ['row-document map reversal', CORE, (d) => { d.current_result.complete_row_to_document_map = false; }, 'row-document map'],
  ['case truth inflation', CORE, (d) => { d.current_result.decision_text_is_case_truth = true; }, 'case-truth boundary'],
  ['precedent inflation', CORE, (d) => { d.current_result.decision_is_precedential_authority = true; }, 'precedent boundary'],
  ['disposition implementation inflation', CORE, (d) => { d.current_result.registry_disposition_is_implementation = true; }, 'disposition implementation boundary'],
  ['compliance support inflation', CORE, (d) => { d.current_result.separate_compliance_join_supported = true; }, 'compliance boundary'],
  ['complete restoration support inflation', CORE, (d) => { d.current_result.complete_restoration_supported = true; }, 'restoration boundary'],
  ['remedy timeliness support inflation', CORE, (d) => { d.current_result.remedy_timeliness_supported = true; }, 'timeliness boundary'],
  ['prevalence inflation', CORE, (d) => { d.current_result.prevalence_supported = true; }, 'prevalence boundary'],
  ['residual result inflation', CORE, (d) => { d.current_result.residual_class_closed = true; }, 'residual closure boundary'],
  ['draft release publication inflation', CORE, (d) => { d.current_result.draft_release_is_publication = true; }, 'draft release boundary'],
  ['effect inflation', CORE, (d) => { d.current_result.graph_effect = 'add'; }, 'effect boundary'],
  ['terminal receipt mutation', CORE, (d) => { d.current_result.terminal_state = 'complete'; }, 'terminal receipt vocabulary'],
  ['next handoff mutation', CORE, (d) => { d.next_handoff.acquisition_id = 'OTHER'; }, 'next handoff'],
  ['boundary reversal', CORE, (d) => { d.boundaries.order_to_restore_proves_restoration = true; }, 'boundary order_to_restore_proves_restoration'],
  ['core extra property', CORE, (d) => { d.unreviewed_authority = true; }, 'core top-level closed shape'],
  ['plan count mutation', PLAN, (d) => { d.counts.registry_rows = 1; }, 'plan denominator counts'],
  ['plan shard mutation', PLAN, (d) => { d.shard_count = 32; }, 'plan shard contract'],
  ['release draft reversal', ASSETS, (d) => { d.draft = false; }, 'draft release state'],
  ['release publication effect', ASSETS, (d) => { d.publication_effect = 'public'; }, 'release publication effect'],
  ['release asset count', ASSETS, (d) => { d.observed_assets = 1; }, 'release asset count'],
  ['compliance ledger inflation', COMPLIANCE, (d) => { d.separate_public_compliance_receipts = 1; }, 'compliance ledger authority'],
  ['order is implementation', COMPLIANCE, (d) => { d.order_is_implementation = true; }, 'compliance ledger boundaries'],
  ['missing ledger count', MISSING, (d) => { d.missing_or_non_pdf_documents += 1; }, 'missing ledger count'],
  ['denominator shard identity', DENOMINATOR_00, (d) => { d.shard = '63'; }, 'shard identity 00'],
  ['denominator assignment', DENOMINATOR_00, (d) => { d.assignment = 'disposition_rank'; }, 'shard assignment 00'],
  ['document reassignment', DENOMINATOR_00, (d) => { d.documents[0].document_identity = 'current-decision:mutated'; }, 'document shard assignment'],
  ['acquisition receipt removal', ACQUISITION_00, (d) => { d.documents.shift(); }, 'shard document count 00'],
  ['order implementation at document', ACQUISITION_00, (d) => { d.documents[0].order_is_observed_implementation = true; }, 'order implementation'],
  ['invented compliance state', ACQUISITION_00, (d) => { d.documents[0].compliance_state = 'observed'; }, 'compliance state'],
  ['invented restoration', ACQUISITION_00, (d) => { d.documents[0].restoration_date = '2026-01-01'; }, 'restoration invention'],
  ['attempt inflation', ACQUISITION_00, (d) => { d.documents[0].attempts.push({}, {}); }, 'bounded attempts'],
  ['schema weakening', SCHEMA, (d) => { d.additionalProperties = true; }, 'closed schema top level']
];

for (const [name, relPath, mutate, expected] of cases) {
  const original = read(relPath);
  const changed = structuredClone(original);
  mutate(changed);
  write(relPath, changed);
  const errors = validatePermanent(temp, { checkFiles: false });
  write(relPath, original);
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors.slice(0, 20))}`);
  }
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(`status-sovereignty-rd04-a06-full-corpus.test: 1 positive + ${cases.length} adversarial mutations PASS`);
