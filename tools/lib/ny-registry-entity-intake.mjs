const ACTIVE_ENDPOINT = 'https://data.ny.gov/resource/n9v6-gdp6.json';
const FILINGS_ENDPOINT = 'https://data.ny.gov/resource/63wc-4exh.json';

export function quoteSoql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function activeEntityUrl(names) {
  const url = new URL(ACTIVE_ENDPOINT);
  url.searchParams.set('$select', 'dos_id,current_entity_name,initial_dos_filing_date,entity_type,jurisdiction,county');
  url.searchParams.set('$where', `upper(current_entity_name) in(${names.map(quoteSoql).join(',')})`);
  url.searchParams.set('$order', 'current_entity_name');
  url.searchParams.set('$limit', '5000');
  return url;
}

export function filingHistoryUrl(ids) {
  const url = new URL(FILINGS_ENDPOINT);
  url.searchParams.set('$select', 'corpid_num,film_num,date_filed,eff_date,documenttype,corp_name,entitytype,juris');
  url.searchParams.set('$where', `corpid_num in(${ids.join(',')})`);
  url.searchParams.set('$order', 'corpid_num,date_filed');
  url.searchParams.set('$limit', '50000');
  return url;
}

export function buildRegistryIntake(activeRows, filingRows, embeddedCandidates) {
  const nameFor = row => row?.match?.normalized_fec_payee_name ?? null;
  const candidateNames = new Set(embeddedCandidates.map(nameFor).filter(Boolean));
  const candidatesByName = new Map();
  for (const candidate of embeddedCandidates) {
    const name = nameFor(candidate);
    if (!name) continue;
    if (!candidatesByName.has(name)) candidatesByName.set(name, []);
    candidatesByName.get(name).push(candidate.embedded_candidate_id);
  }
  const filingsById = new Map();
  for (const filing of filingRows) {
    const id = String(filing.corpid_num ?? '');
    if (!filingsById.has(id)) filingsById.set(id, []);
    filingsById.get(id).push(filing);
  }
  return activeRows
    .filter(row => candidateNames.has(row.current_entity_name))
    .map(row => {
      const id = String(row.dos_id);
      const filings = filingsById.get(id) ?? [];
      const terminal = filings.filter(filing => /DISSOLUTION|CANCELLATION|SURRENDER|ANNULMENT|TERMINATION/i.test(filing.documenttype ?? ''));
      return {
        schema_version: 'ny-registry-embedded-entity-intake@1',
        registry_node_id: `ny-dos:${id}`,
        official_identifier: { issuer: 'New York State Department of State', kind: 'ny_dos_id', value: id },
        current_entity_name: row.current_entity_name,
        initial_dos_filing_date: row.initial_dos_filing_date ?? null,
        entity_type: row.entity_type ?? null,
        jurisdiction: row.jurisdiction ?? null,
        county: row.county ?? null,
        active_dataset_membership_observed: true,
        filing_history_records_observed: filings.length,
        terminal_status_filings_observed: terminal.length,
        linked_embedded_candidate_ids: candidatesByName.get(row.current_entity_name) ?? [],
        registry_entity_status: 'official_identifier_observed',
        fec_payee_link_status: 'provisional_exact_legal_name_missing_source_native_identifier',
        ownership_status: 'not_established_by_registry',
        allowed_language: 'The New York Department of State active-entity dataset assigns this DOS ID to this exact current legal name.',
        forbidden_inferences: [
          'active_registry_row_proves_continuous_activity_without_gap',
          'registry_row_proves_beneficial_ownership_or_control',
          'exact_name_alone_proves_the_fec_payee_is_this_registry_entity',
          'registry_row_proves_payment_semantics_or_wrongdoing',
        ],
        verification_status: 'official_identifier_observed_identity_link_unresolved',
        graph_effect: 'none',
      };
    })
    .sort((a, b) => a.current_entity_name.localeCompare(b.current_entity_name));
}
