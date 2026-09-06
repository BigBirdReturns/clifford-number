const SCHEMA_VERSION = 'reported-hop-evidence-upgrades@1';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_CONTRACT_KEYS = [
  'allowed_results', 'dispositions', 'governing_section', 'government_record_mapping',
  'schema_version', 'scope', 'stronger_evidence_classes', 'weak_evidence_class',
];
const REQUIRED_SCOPE = {
  anchor_observation: 'components_containing_anchor_true_actors',
  governed_population: 'all_accepted_hop_bases',
  non_hop_boundary: 'reported_ledger_evidence_without_accepted_basis_excluded',
};
const REQUIRED_SCOPE_KEYS = Object.keys(REQUIRED_SCOPE);
const REQUIRED_DISPOSITION_KEYS = [
  'actor_a',
  'actor_b',
  'attempted_at',
  'basis_key',
  'basis_receipt_ids',
  'note',
  'result',
  'searched_routes',
  'surface_id',
  'temporal_status',
  'valid_from',
  'valid_until',
];
const REQUIRED_ROUTE_KEYS = ['locator', 'outcome', 'venue'];

function sortedUnique(values = []) {
  return [...new Set(values.map(value => String(value)))].sort();
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value ?? {}).sort()) === JSON.stringify([...expected].sort());
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function reportedHopBasisKey(edge, basis) {
  return [
    edge.actor_a,
    edge.actor_b,
    basis.surface_id,
    basis.valid_from ?? '',
    basis.valid_until ?? '',
    basis.temporal_status ?? '',
  ].join('|');
}

function basisRecords(hopGraph) {
  const records = [];
  for (const edge of hopGraph?.edges ?? []) {
    for (const basis of edge.surfaces ?? []) {
      records.push({
        actor_a: edge.actor_a,
        actor_b: edge.actor_b,
        basis_key: reportedHopBasisKey(edge, basis),
        evidence_class: basis.evidence_class,
        receipt_ids: sortedUnique(basis.receipt_ids ?? []),
        surface_id: basis.surface_id,
        temporal_status: basis.temporal_status ?? null,
        valid_from: basis.valid_from ?? null,
        valid_until: basis.valid_until ?? null,
      });
    }
  }
  return records;
}

function evidenceCounts(records) {
  const counts = {};
  for (const record of records) {
    const key = record.evidence_class ?? 'missing';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function anchorComponent(hopGraph, actors) {
  const anchorIds = actors.filter(actor => actor.anchor === true).map(actor => actor.id).sort();
  const adjacency = new Map();
  for (const edge of hopGraph?.edges ?? []) {
    if (!adjacency.has(edge.actor_a)) adjacency.set(edge.actor_a, new Set());
    if (!adjacency.has(edge.actor_b)) adjacency.set(edge.actor_b, new Set());
    adjacency.get(edge.actor_a).add(edge.actor_b);
    adjacency.get(edge.actor_b).add(edge.actor_a);
  }
  const actorIds = new Set(anchorIds);
  const queue = [...anchorIds];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const neighbor of adjacency.get(current) ?? []) {
      if (actorIds.has(neighbor)) continue;
      actorIds.add(neighbor);
      queue.push(neighbor);
    }
  }
  return { actorIds, anchorIds };
}

function reportedLedgerBoundary({ records, surfaces, participation, weakEvidenceClass }) {
  const acceptedSurfaceIds = new Set(records.map(record => record.surface_id));
  const reportedParticipation = participation.filter(row => row.evidence_class === weakEvidenceClass);
  const reportedSurfaceRows = surfaces.filter(row => row.evidence_class === weakEvidenceClass);
  const reportedSurfaceIds = sortedUnique(reportedSurfaceRows.map(row => row.surface_id));
  const reportedEvidenceSurfaceIds = sortedUnique([
    ...reportedParticipation.map(row => row.surface_id),
    ...reportedSurfaceIds,
  ]);
  return {
    accepted_reported_surface_ids: sortedUnique(
      records.filter(record => record.evidence_class === weakEvidenceClass).map(record => record.surface_id),
    ),
    non_hop_surface_ids: reportedEvidenceSurfaceIds.filter(id => !acceptedSurfaceIds.has(id)),
    reported_participation_rows: reportedParticipation.length,
    reported_evidence_surface_ids: reportedEvidenceSurfaceIds,
    reported_participation_surface_ids: sortedUnique(reportedParticipation.map(row => row.surface_id)),
    reported_surface_rows: reportedSurfaceRows.length,
    reported_surface_ids: reportedSurfaceIds,
  };
}

function sameStringSet(left, right) {
  return JSON.stringify(sortedUnique(left)) === JSON.stringify(sortedUnique(right));
}

function addError(errors, code, detail) {
  errors.push({ code, detail });
}

function validIsoDay(value) {
  if (!DATE_RE.test(String(value ?? ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateContract(contract, errors) {
  if (!exactKeys(contract, REQUIRED_CONTRACT_KEYS)) {
    addError(errors, 'CONTRACT_KEYS', 'contract must use the complete canonical shape');
  }
  if (contract?.schema_version !== SCHEMA_VERSION) {
    addError(errors, 'CONTRACT_SCHEMA', `expected ${SCHEMA_VERSION}, got ${contract?.schema_version ?? 'missing'}`);
  }
  if (!exactKeys(contract?.scope, REQUIRED_SCOPE_KEYS)) {
    addError(errors, 'SCOPE_KEYS', 'scope must use the complete canonical shape');
  }
  if (contract?.government_record_mapping !== 'government_record_to_official') {
    addError(errors, 'GOVERNMENT_RECORD_MAPPING', 'government_record_mapping must map government records to official');
  }
  if (contract?.weak_evidence_class !== 'reported') {
    addError(errors, 'WEAK_CLASS', 'weak_evidence_class must remain reported');
  }
  if (!Array.isArray(contract?.stronger_evidence_classes)
      || contract.stronger_evidence_classes.length !== 2
      || !sameStringSet(contract.stronger_evidence_classes, ['official', 'primary_public'])) {
    addError(errors, 'STRONGER_CLASSES', 'stronger_evidence_classes must be official and primary_public');
  }
  if (!Array.isArray(contract?.allowed_results)
      || contract.allowed_results.length !== 1
      || !sameStringSet(contract.allowed_results, ['attempted_no_stronger_public_source_found'])) {
    addError(errors, 'RESULT_VOCABULARY', 'allowed_results has drifted');
  }
  if (!text(contract?.governing_section) || !contract.governing_section.includes('§2.4')) {
    addError(errors, 'GOVERNING_SECTION', 'governing_section must name BUILD-INSTRUCTIONS.md §2.4');
  }
  for (const [field, expected] of Object.entries(REQUIRED_SCOPE)) {
    if (contract?.scope?.[field] !== expected) {
      addError(errors, 'SCOPE', `scope.${field} must remain ${expected}`);
    }
  }
  if (!Array.isArray(contract?.dispositions)) {
    addError(errors, 'DISPOSITIONS', 'dispositions must be an array');
  }
}

function validateDispositionShape(disposition, contract, errors) {
  const key = disposition?.basis_key ?? 'missing-basis-key';
  if (!exactKeys(disposition, REQUIRED_DISPOSITION_KEYS)) {
    addError(errors, 'DISPOSITION_KEYS', `${key} must use the complete disposition shape`);
  }
  for (const field of ['actor_a', 'actor_b', 'basis_key', 'note', 'result', 'surface_id', 'temporal_status']) {
    if (!text(disposition?.[field])) addError(errors, 'DISPOSITION_TEXT', `${key} has empty ${field}`);
  }
  if (!validIsoDay(disposition?.attempted_at)) {
    addError(errors, 'ATTEMPT_DATE', `${key} attempted_at must be YYYY-MM-DD`);
  }
  if (text(disposition?.note) && disposition.note.trim().length < 40) {
    addError(errors, 'DISPOSITION_NOTE', `${key} note must state a substantive bounded result`);
  }
  if (!contract.allowed_results?.includes(disposition?.result)) {
    addError(errors, 'DISPOSITION_RESULT', `${key} uses unsupported result ${disposition?.result ?? 'missing'}`);
  }
  if (!Array.isArray(disposition?.basis_receipt_ids) || disposition.basis_receipt_ids.length === 0) {
    addError(errors, 'DISPOSITION_RECEIPTS', `${key} must retain the current basis receipts`);
  }
  if (Array.isArray(disposition?.basis_receipt_ids)
      && sortedUnique(disposition.basis_receipt_ids).length !== disposition.basis_receipt_ids.length) {
    addError(errors, 'DUPLICATE_DISPOSITION_RECEIPT', `${key} contains a duplicate basis receipt`);
  }
  if (!Array.isArray(disposition?.searched_routes) || disposition.searched_routes.length === 0) {
    addError(errors, 'SEARCH_ROUTES', `${key} must record at least one searched route`);
  }
  const routeKeys = (disposition?.searched_routes ?? []).map(route =>
    JSON.stringify(REQUIRED_ROUTE_KEYS.map(field => route?.[field] ?? null)));
  if (new Set(routeKeys).size !== routeKeys.length) {
    addError(errors, 'DUPLICATE_SEARCH_ROUTE', `${key} contains a duplicate searched route`);
  }
  for (const route of disposition?.searched_routes ?? []) {
    if (!exactKeys(route, REQUIRED_ROUTE_KEYS)) {
      addError(errors, 'SEARCH_ROUTE_KEYS', `${key} search routes must use locator, outcome, and venue`);
    }
    for (const field of REQUIRED_ROUTE_KEYS) {
      if (!text(route?.[field])) addError(errors, 'SEARCH_ROUTE_TEXT', `${key} search route has empty ${field}`);
    }
  }
}

export function evaluateReportedHopEvidenceUpgrades({
  actors = [],
  contract = {},
  hopGraph = {},
  participation = [],
  surfaces = [],
} = {}) {
  const errors = [];
  validateContract(contract, errors);

  const records = basisRecords(hopGraph);
  const weakEvidenceClass = contract.weak_evidence_class ?? 'reported';
  const basisKeys = records.map(record => record.basis_key);
  if (new Set(basisKeys).size !== basisKeys.length) {
    addError(errors, 'DUPLICATE_BASIS_KEY', 'the accepted hop graph contains duplicate basis identities');
  }
  const reportedBases = records.filter(record => record.evidence_class === weakEvidenceClass);
  const reportedByKey = new Map(reportedBases.map(record => [record.basis_key, record]));
  const dispositions = Array.isArray(contract.dispositions) ? contract.dispositions : [];
  const dispositionByKey = new Map();

  for (const disposition of dispositions) {
    validateDispositionShape(disposition, contract, errors);
    if (dispositionByKey.has(disposition?.basis_key)) {
      addError(errors, 'DUPLICATE_DISPOSITION', `${disposition.basis_key} has more than one disposition`);
    } else {
      dispositionByKey.set(disposition?.basis_key, disposition);
    }
  }

  for (const record of reportedBases) {
    if (!dispositionByKey.has(record.basis_key)) {
      addError(errors, 'MISSING_DISPOSITION', `${record.basis_key} has reported evidence without an upgrade attempt`);
    }
  }
  for (const disposition of dispositions) {
    const record = reportedByKey.get(disposition?.basis_key);
    if (!record) {
      addError(errors, 'STALE_DISPOSITION', `${disposition?.basis_key ?? 'missing-basis-key'} is not a current reported hop basis`);
      continue;
    }
    for (const field of ['actor_a', 'actor_b', 'surface_id', 'temporal_status']) {
      if (disposition[field] !== record[field]) {
        addError(errors, 'DISPOSITION_MISMATCH', `${record.basis_key} ${field} does not match the current basis`);
      }
    }
    for (const field of ['valid_from', 'valid_until']) {
      if ((disposition[field] ?? null) !== record[field]) {
        addError(errors, 'DISPOSITION_MISMATCH', `${record.basis_key} ${field} does not match the current basis`);
      }
    }
    if (!sameStringSet(disposition.basis_receipt_ids, record.receipt_ids)) {
      addError(errors, 'DISPOSITION_RECEIPT_MISMATCH', `${record.basis_key} receipt set does not match the current basis`);
    }
  }

  const actorIds = new Set(actors.map(actor => actor.id));
  const { actorIds: anchorActorIds, anchorIds } = anchorComponent(hopGraph, actors);
  if (anchorIds.length === 0) addError(errors, 'NO_ANCHOR', 'canonical actors contain no anchor=true record');
  if (!actorIds.has(hopGraph?.anchor_actor_id)) {
    addError(errors, 'PRIMARY_ANCHOR_MISSING', `hop graph anchor ${hopGraph?.anchor_actor_id ?? 'missing'} is not canonical`);
  } else if (!anchorIds.includes(hopGraph.anchor_actor_id)) {
    addError(errors, 'PRIMARY_ANCHOR_FLAG', `hop graph anchor ${hopGraph.anchor_actor_id} is not marked anchor=true`);
  }
  const anchorEdges = (hopGraph?.edges ?? []).filter(
    edge => anchorActorIds.has(edge.actor_a) && anchorActorIds.has(edge.actor_b),
  );
  const anchorRecords = basisRecords({ edges: anchorEdges });
  const allEdgeActorIds = sortedUnique(
    (hopGraph?.edges ?? []).flatMap(edge => [edge.actor_a, edge.actor_b]),
  );
  const boundary = reportedLedgerBoundary({
    records,
    surfaces,
    participation,
    weakEvidenceClass,
  });

  return {
    schema_version: SCHEMA_VERSION,
    governing_section: contract.governing_section ?? null,
    primary_anchor_actor_id: hopGraph?.anchor_actor_id ?? null,
    anchor_actor_ids: anchorIds,
    global: {
      accepted_edge_actor_count: allEdgeActorIds.length,
      canonical_actor_count: actors.length,
      basis_count: records.length,
      disposition_count: dispositions.length,
      edge_count: hopGraph?.edges?.length ?? 0,
      evidence_counts: evidenceCounts(records),
      reported_basis_count: reportedBases.length,
    },
    anchor_components: {
      actor_count: anchorActorIds.size,
      basis_count: anchorRecords.length,
      edge_count: anchorEdges.length,
      evidence_counts: evidenceCounts(anchorRecords),
      reported_basis_count: anchorRecords.filter(record => record.evidence_class === weakEvidenceClass).length,
    },
    reported_ledger_boundary: boundary,
    errors,
  };
}
