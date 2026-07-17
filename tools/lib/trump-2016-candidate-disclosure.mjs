import crypto from 'node:crypto';

export const TARGETS = [
  { entity_name: 'TRUMP CPS LLC', asset_page: 18, row_number: '061', reference_number: '269', next_row_number: '064' },
  { entity_name: 'TRUMP PLAZA LLC', asset_page: 21, row_number: '100', reference_number: '424', next_row_number: '101' },
  { entity_name: 'TRUMP TOWER COMMERCIAL LLC', asset_page: 22, row_number: '108', reference_number: '444', next_row_number: '109' },
];

export const sha256 = value => crypto.createHash('sha256').update(
  Buffer.isBuffer(value) || value instanceof Uint8Array ? value : String(value),
).digest('hex');

export function normalizedPageText(items) {
  return items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
}

function excerptForTarget(text, target) {
  const nameIndex = text.indexOf(target.entity_name);
  if (nameIndex < 0) return null;
  const rowNeedle = ` ${target.row_number} `;
  const rowIndex = text.lastIndexOf(rowNeedle, nameIndex);
  const start = rowIndex >= 0 ? rowIndex + 1 : nameIndex;
  const nextNeedle = ` ${target.next_row_number} `;
  const nextIndex = text.indexOf(nextNeedle, nameIndex + target.entity_name.length);
  const end = nextIndex >= 0 ? nextIndex : Math.min(text.length, nameIndex + 500);
  return text.slice(start, end).trim();
}

export function extractDisclosureEvidence(pages, targets = TARGETS) {
  return targets.map(target => {
    const page = pages[target.asset_page - 1];
    const text = page?.text ?? '';
    const excerpt = excerptForTarget(text, target);
    const headerPresent = /Part 2:\s*Filer's Employment Assets and Income/i.test(text);
    const exactNamePresent = text.includes(target.entity_name);
    const rowAndReferencePresent = new RegExp(`\\b${target.row_number}\\s+${target.entity_name.replaceAll(' ', '\\s+')}\\s+N[\\/I]A\\s+${target.reference_number}\\b`, 'i').test(text);
    return {
      schema_version: 'trump-2016-candidate-disclosure-entity-evidence@1',
      entity_name_as_reported: target.entity_name,
      source_page: target.asset_page,
      source_section: "Part 2: Filer's Employment Assets and Income",
      source_row_number: target.row_number,
      attached_schedule_reference_number: target.reference_number,
      filer_name: 'Donald J. Trump',
      holder_scope: 'filer',
      exact_name_present: exactNamePresent,
      section_header_present: headerPresent,
      row_and_reference_pattern_verified: rowAndReferencePresent,
      raw_page_text_sha256: page?.text_sha256 ?? null,
      raw_row_excerpt: excerpt,
      raw_row_excerpt_sha256: excerpt ? sha256(excerpt) : null,
      report_observation_date: '2016-05-16',
      report_observation_date_basis: 'Filer certification date and FEC received stamp rendered on page 1 of the Washington Post-hosted copy.',
      interval_valid_from: null,
      interval_valid_until: null,
      interval_status: 'not_explicitly_reported_per_entity',
      allowed_language: `In the candidate disclosure certified May 16, 2016, Donald J. Trump reported ${target.entity_name} in Part 2, Filer's Employment Assets and Income.`,
      forbidden_inferences: [
        'report_row_establishes_legal_entity_identity_with_same-named_fec_payee',
        'report_observation_date_establishes_continuous_ownership_interval',
        'reported_asset_establishes_control_on_each_fec_itemization_date',
        'reported_itemization_is_unique_payment',
        'wrongdoing_from_name_or_temporal_proximity',
      ],
      verification_status: 'machine_extracted_secondary_copy_unreviewed',
      causal_status: 'not_established',
      graph_effect: 'none',
    };
  });
}

export function summarizeFecWindow(rows, targets = TARGETS) {
  return targets.map(target => {
    const matched = rows.filter(row => row.normalized_payee_name === target.entity_name
      && row.cycle === 2016
      && typeof row.disbursement_date === 'string'
      && row.disbursement_date >= '2015-01-01'
      && row.disbursement_date <= '2016-12-31');
    const dates = matched.map(row => row.disbursement_date).sort();
    const amendments = Object.fromEntries([...matched.reduce((map, row) => {
      const key = row.report_amendment_indicator ?? 'null';
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map())].sort());
    return {
      entity_name: target.entity_name,
      reported_itemization_rows: matched.length,
      observed_date_range: { earliest: dates[0] ?? null, latest: dates.at(-1) ?? null },
      amendment_indicators: amendments,
      disclosure_observation_date_within_observed_fec_range: Boolean(dates.length && dates[0] <= '2016-05-16' && dates.at(-1) >= '2016-05-16'),
    };
  });
}

export function assessInterval(evidence, fecSummary) {
  const explicit = evidence.exact_name_present && evidence.section_header_present && evidence.row_and_reference_pattern_verified;
  return {
    explicit_filer_report: explicit,
    contemporaneous_with_observed_fec_window: Boolean(fecSummary.disclosure_observation_date_within_observed_fec_range),
    supplies_defensible_closed_interval: false,
    reason: explicit
      ? 'The report supplies a dated filer observation but no entity-specific start or end date; it cannot by itself establish continuous holding across the FEC itemization range.'
      : 'The configured legal-name row was not fully verified in the source page text.',
  };
}
