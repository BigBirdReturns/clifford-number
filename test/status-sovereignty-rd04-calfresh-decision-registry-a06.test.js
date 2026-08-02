import { loadCorpus, validateCorpus, ROOT } from '../tools/validate-status-sovereignty-rd04-calfresh-decision-registry-a06.mjs';

const base = loadCorpus(ROOT);
const positive = validateCorpus(base, { checkFiles: true });
if (positive.length) throw new Error(`positive A06 corpus failed:\n${positive.join('\n')}`);

const cases = [
  ['contract schema version', (c) => { c.contract.schema_version = 'bad'; }, 'contract schema version'],
  ['contract execution identity', (c) => { c.contract.execution_id = 'OTHER'; }, 'contract execution identity'],
  ['contract issue', (c) => { c.contract.issue = 0; }, 'contract issue'],
  ['parent main commit', (c) => { c.contract.parent.main_commit = '0'.repeat(40); }, 'parent main commit'],
  ['parent A05 release', (c) => { c.contract.parent.a05_release_sha256 = '0'.repeat(64); }, 'parent A05 release'],
  ['query endpoint', (c) => { c.contract.query.endpoint = 'https://example.invalid/'; }, 'query endpoint'],
  ['query ordered parameters', (c) => { c.contract.query.ordered_parameters[1][1] = '06/02/2026'; }, 'query ordered parameters'],
  ['query date semantics', (c) => { c.contract.query.date_boundary_semantics = 'inclusive'; }, 'query date semantics'],
  ['query retry ceiling', (c) => { c.contract.query.max_attempts = 3; }, 'query retry ceiling'],
  ['selection cap', (c) => { c.contract.pdf_selection.cap = 25; }, 'selection cap'],
  ['selection before content', (c) => { c.contract.pdf_selection.selection_before_pdf_content = false; }, 'selection before content'],
  ['result-shopping replacements', (c) => { c.contract.pdf_selection.replacement_after_content_inspection = true; }, 'no result shopping replacements'],
  ['outside human dependency', (c) => { c.contract.authority.outside_human_dependency = true; }, 'outside human dependency'],
  ['exact registry URL', (c) => { c.denominator.query.exact_request_url += '&disposition=1'; }, 'exact registry request URL'],
  ['denominator query parameters', (c) => { c.denominator.query.ordered_parameters.pop(); }, 'denominator query parameters'],
  ['denominator date semantics', (c) => { c.denominator.query.date_boundary_semantics = 'inclusive'; }, 'denominator date semantics'],
  ['complete response flag', (c) => { c.denominator.complete_ordered_response_preserved = false; }, 'complete returned response preserved'],
  ['returned set scope', (c) => { c.denominator.registry_returned_set_is_all_calfresh_decisions = true; }, 'returned set scope boundary'],
  ['positive returned count', (c) => { c.denominator.returned_count = 0; }, 'positive returned count'],
  ['returned row count', (c) => { c.denominator.rows.pop(); }, 'returned row count'],
  ['registry position', (c) => { c.denominator.rows[0].ordered_position = 2; }, 'registry position'],
  ['CalFresh program', (c) => { c.denominator.rows[0].program = 'CalWORKs'; }, 'CalFresh program'],
  ['row identity presence', (c) => { c.denominator.rows[0].row_identity = ''; }, 'identity'],
  ['duplicate row identity', (c) => { c.denominator.rows[1].row_identity = c.denominator.rows[0].row_identity; }, 'duplicate identity'],
  ['identity field consistency', (c) => { c.denominator.rows[0].decision_id += '-changed'; }, 'identity fields'],
  ['download URL custody', (c) => { c.denominator.rows[0].download_url = 'https://example.invalid/decision.pdf'; }, 'download URL'],
  ['canonical row hash', (c) => { c.denominator.rows[0].canonical_row_sha256 = '0'.repeat(64); }, 'canonical row hash'],
  ['parsed issue codes', (c) => { c.denominator.rows[0].parsed_issue_codes = ['9999']; }, 'parsed issue codes'],
  ['sample schema version', (c) => { c.sample.schema_version = 'bad'; }, 'sample schema version'],
  ['sample denominator count', (c) => { c.sample.registry_returned_count += 1; }, 'sample registry denominator'],
  ['sample frozen before content', (c) => { c.sample.selected_before_pdf_content = false; }, 'sample frozen before content'],
  ['sample replacement count', (c) => { c.sample.replacements_after_content_inspection = 1; }, 'sample replacements'],
  ['sample selected count', (c) => { c.sample.selected_count -= 1; }, 'sample selected count'],
  ['sample row count', (c) => { c.sample.rows.pop(); }, 'sample row count'],
  ['sample position', (c) => { c.sample.rows[0].selection_position = 2; }, 'sample position'],
  ['hash-ranked identity', (c) => { c.sample.rows[0].row_identity = c.sample.rows[1].row_identity; }, 'hash-ranked identity'],
  ['sample hash', (c) => { c.sample.rows[0].canonical_row_sha256 = 'f'.repeat(64); }, 'sample row 1: hash'],
  ['precontent row flag', (c) => { c.sample.rows[0].selected_before_pdf_content = false; }, 'precontent flag'],
  ['fetch terminal vocabulary', (c) => { c.sample.rows[0].fetch.terminal_state = 'success'; }, 'fetch terminal state'],
  ['bounded attempts', (c) => { c.sample.rows[0].fetch.attempts.push({}, {}); }, 'bounded attempts'],
  ['fetch row hash', (c) => { c.sample.rows[0].fetch.canonical_row_sha256 = '0'.repeat(64); }, 'fetch row hash'],
  ['fetch URL', (c) => { c.sample.rows[0].fetch.exact_download_url = 'https://example.invalid/'; }, 'fetch URL'],
  ['decision row count', (c) => { c.decisions.rows.pop(); }, 'decision ledger row count'],
  ['compliance receipt aggregate', (c) => { c.compliance.separate_public_compliance_receipts_recovered = 1; }, 'separate compliance receipt count'],
  ['decision identity', (c) => { c.decisions.rows[0].row_identity = 'other'; }, 'decision row 1: identity'],
  ['precedential inflation', (c) => { c.decisions.rows[0].decision_is_precedential_authority = true; }, 'nonprecedential boundary'],
  ['decision implementation inflation', (c) => { c.decisions.rows[0].decision_proves_implementation = true; }, 'decision implementation boundary'],
  ['marker line custody', (c) => { c.decisions.rows[0].lexical_order_markers = [{ marker: 'order', line_number: 0, line_sha256: '0'.repeat(64), line_bytes: 1 }]; }, 'marker line'],
  ['compliance identity', (c) => { c.compliance.rows[0].row_identity = 'other'; }, 'compliance row 1: identity'],
  ['invented compliance receipt', (c) => { c.compliance.rows[0].separate_public_compliance_receipt_ids = ['invented']; }, 'no separate compliance receipt'],
  ['false compliance observation', (c) => { c.compliance.rows[0].implementation_state = 'separate_public_compliance_receipt_observed'; }, 'false compliance observation'],
  ['order as implementation', (c) => { c.compliance.rows[0].order_is_implementation = true; }, 'order is not implementation'],
  ['absence as noncompliance', (c) => { c.compliance.rows[0].absence_of_compliance_receipt_is_noncompliance = true; }, 'absence semantics'],
  ['restoration amount invention', (c) => { c.compliance.rows[0].restoration_amount = 1; }, 'restoration amount'],
  ['restoration date invention', (c) => { c.compliance.rows[0].restoration_date = '2026-06-30'; }, 'restoration date'],
  ['compliance date invention', (c) => { c.compliance.rows[0].compliance_date = '2026-06-30'; }, 'compliance date'],
  ['registry distribution mutation', (c) => { c.core.registry_distributions.disposition = {}; }, 'registry distributions'],
  ['selected distribution mutation', (c) => { c.core.selected_distributions.implementation_state = {}; }, 'selected distributions'],
  ['core registry count', (c) => { c.core.counts.registry_rows += 1; }, 'core registry count'],
  ['case-level join inflation', (c) => { c.core.counts.case_level_implementation_joins = 1; }, 'core implementation joins'],
  ['residual closure inflation', (c) => { c.core.counts.residual_classes_closed = 1; }, 'core residual closure'],
  ['reviewed disposition inflation', (c) => { c.core.counts.reviewed_disposition_changes = 1; }, 'core disposition change'],
  ['external contact inflation', (c) => { c.core.counts.external_contacts = 1; }, 'core external contacts'],
  ['external review inflation', (c) => { c.core.counts.external_reviews = 1; }, 'core external reviews'],
  ['effect count inflation', (c) => { c.core.counts.graph_effects = 1; }, 'core authority counts'],
  ['terminal receipt mutation', (c) => { c.core.current_result.terminal_state = 'partial_public_compliance_join'; }, 'terminal receipt'],
  ['program completeness inflation', (c) => { c.core.current_result.returned_set_is_all_calfresh_decisions = true; }, 'program completeness boundary'],
  ['date inclusivity inflation', (c) => { c.core.current_result.submitted_dates_prove_inclusive_month = true; }, 'date inclusivity boundary'],
  ['compliance join inflation', (c) => { c.core.current_result.separate_compliance_join_supported = true; }, 'compliance join boundary'],
  ['restoration inflation', (c) => { c.core.current_result.complete_restoration_supported = true; }, 'restoration boundary'],
  ['timeliness inflation', (c) => { c.core.current_result.remedy_timeliness_supported = true; }, 'timeliness boundary'],
  ['prevalence inflation', (c) => { c.core.current_result.prevalence_supported = true; }, 'prevalence boundary'],
  ['closure result inflation', (c) => { c.core.current_result.residual_class_closed = true; }, 'closure boundary'],
  ['graph effect inflation', (c) => { c.core.current_result.graph_effect = 'add'; }, 'effect boundary'],
  ['next acquisition mutation', (c) => { c.core.next_handoff.acquisition_id = 'OTHER'; }, 'next acquisition'],
  ['next handoff blocking', (c) => { c.core.next_handoff.project_blocking = true; }, 'next handoff nonblocking'],
  ['authority prevalence inflation', (c) => { c.core.authority.prevalence_findings = 1; }, 'authority prevalence_findings'],
  ['boundary reversal', (c) => { c.core.boundaries.order_to_restore_proves_restoration = true; }, 'boundary order_to_restore_proves_restoration'],
  ['schema weakening', (c) => { c.schema.additionalProperties = true; }, 'closed schema top level'],
  ['core extra property', (c) => { c.core.unreviewed_authority = true; }, 'core top-level closed shape']
];

for (const [name, mutate, expected] of cases) {
  const candidate = structuredClone(base);
  mutate(candidate);
  const errors = validateCorpus(candidate, { checkFiles: false });
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors)}`);
  }
}

console.log(`status-sovereignty-rd04-calfresh-decision-registry-a06.test: 1 positive + ${cases.length} adversarial mutations PASS`);
