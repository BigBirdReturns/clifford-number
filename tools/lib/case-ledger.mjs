import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root, writeJson } from './ledger.mjs';

export const CLAIM_STATUSES = new Set(['verified', 'review_required', 'disputed', 'superseded', 'rejected']);
export const CAUSAL_STATUSES = new Set(['source_explicit', 'institutionally_attributed', 'temporal_association', 'not_established']);
export const AMOUNT_KINDS = new Set(['requested', 'authorized', 'appropriated', 'allocated', 'obligated', 'outlaid', 'paid', 'ceiling']);
export const REPORTER_BRIEFING_SCHEMA_VERSIONS = new Set(['reporter-briefing@2']);

function index(rows, key, errors) {
  const out = new Map();
  for (const row of rows) {
    if (!row[key]) errors.push(`record missing ${key}`);
    else if (out.has(row[key])) errors.push(`duplicate ${key}: ${row[key]}`);
    else out.set(row[key], row);
  }
  return out;
}

function reference(ids, records, owner, field, errors) {
  for (const id of ids ?? []) if (!records.has(id)) errors.push(`${owner} references missing ${field} ${id}`);
}

function validateBriefingMetadata(caseItem, errors) {
  if (caseItem.presentation !== 'reporter_briefing') return;
  const briefing = caseItem.briefing;
  if (!briefing) {
    errors.push('reporter_briefing case requires briefing metadata');
    return;
  }
  if (!REPORTER_BRIEFING_SCHEMA_VERSIONS.has(briefing.schema_version)) {
    errors.push(`reporter briefing schema_version must be one of ${[...REPORTER_BRIEFING_SCHEMA_VERSIONS].join(', ')}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(briefing.version ?? '')) errors.push('reporter briefing version must be semantic version x.y.z');
  if (briefing.source !== `cases/${caseItem.case_id}/briefing.json`) errors.push('reporter briefing source must be cases/<case-id>/briefing.json');
  if (briefing.href !== `briefs/${caseItem.case_id}.html`) errors.push('reporter briefing href must be briefs/<case-id>.html');
  if (briefing.format !== 'compiled_static_html') errors.push('reporter briefing format must be compiled_static_html');
  if (!briefing.audience || !briefing.label || !briefing.description) errors.push('reporter briefing metadata requires audience, label, and description');
}

export function validateCaseLedger(data) {
  const errors = [];
  const receipts = index(data.receipts, 'receipt_id', errors);
  const claims = index(data.claims, 'claim_id', errors);
  const events = index(data.events, 'event_id', errors);
  index(data.relations, 'relation_id', errors);
  index(data.beacons, 'beacon_id', errors);

  if (data.case.schema_version !== 'case-ledger@1') errors.push('case schema_version must be case-ledger@1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.case.as_of ?? '')) errors.push('case as_of must be an ISO day');
  if (!data.case.boundary || !data.case.disclaimer) errors.push('case must carry boundary and disclaimer text');
  validateBriefingMetadata(data.case, errors);

  for (const receipt of data.receipts) {
    if (!receipt.label || !receipt.source_type || !receipt.evidence_class) errors.push(`receipt ${receipt.receipt_id} lacks source metadata`);
    if (!receipt.url && !receipt.archive_url && !receipt.content_sha256) errors.push(`receipt ${receipt.receipt_id} has no checkable locator or content hash`);
    if (receipt.content_sha256 && !/^[a-f0-9]{64}$/.test(receipt.content_sha256)) errors.push(`receipt ${receipt.receipt_id} has malformed content_sha256`);
  }

  for (const claim of data.claims) {
    if (!claim.plain || !claim.subject_id || !claim.predicate) errors.push(`claim ${claim.claim_id} lacks required semantics`);
    if (!CLAIM_STATUSES.has(claim.claim_status)) errors.push(`claim ${claim.claim_id} has invalid claim_status ${claim.claim_status}`);
    if (!CAUSAL_STATUSES.has(claim.causal_status)) errors.push(`claim ${claim.claim_id} has invalid causal_status ${claim.causal_status}`);
    if (!(claim.receipt_ids?.length > 0)) errors.push(`claim ${claim.claim_id} has no receipts`);
    reference(claim.receipt_ids, receipts, `claim ${claim.claim_id}`, 'receipt', errors);
    const amountKind = claim.object?.amount_kind;
    if (amountKind && !AMOUNT_KINDS.has(amountKind)) errors.push(`claim ${claim.claim_id} has invalid amount_kind ${amountKind}`);
    if (claim.claim_status === 'verified') {
      for (const id of claim.receipt_ids ?? []) {
        const receipt = receipts.get(id);
        if (receipt && !receipt.url && !receipt.archive_url) errors.push(`verified claim ${claim.claim_id} relies on non-public receipt ${id}`);
      }
    }
  }

  for (const event of data.events) {
    if (!event.event_type || !event.label || !event.occurred_at) errors.push(`event ${event.event_id} lacks required fields`);
    if (!(event.claim_ids?.length > 0)) errors.push(`event ${event.event_id} has no claims`);
    reference(event.claim_ids, claims, `event ${event.event_id}`, 'claim', errors);
  }

  for (const relation of data.relations) {
    reference([relation.from_event_id, relation.to_event_id], events, `relation ${relation.relation_id}`, 'event', errors);
    reference(relation.claim_ids, claims, `relation ${relation.relation_id}`, 'claim', errors);
    if (!CAUSAL_STATUSES.has(relation.causal_status)) errors.push(`relation ${relation.relation_id} has invalid causal_status ${relation.causal_status}`);
  }

  for (const beacon of data.beacons) {
    if (/(guilt|corruption|motive|influence)_score/i.test(JSON.stringify(beacon))) errors.push(`beacon ${beacon.beacon_id} contains a prohibited person-judgment score`);
    if (!beacon.version || !beacon.prohibited_interpretation) errors.push(`beacon ${beacon.beacon_id} lacks version or interpretation boundary`);
    reference(beacon.input_event_ids, events, `beacon ${beacon.beacon_id}`, 'event', errors);
    for (const dimension of beacon.dimensions ?? []) reference(dimension.claim_ids, claims, `beacon ${beacon.beacon_id}/${dimension.id}`, 'claim', errors);
  }

  for (const section of data.case.sections ?? []) reference(section.record_ids, events, `section ${section.id}`, 'event', errors);
  return errors;
}

function claimValue(claim) {
  if (typeof claim.object === 'number' || typeof claim.object === 'string') return claim.object;
  return claim.object ?? null;
}

export function compileCaseLedger(data) {
  const errors = validateCaseLedger(data);
  if (errors.length) throw new Error(errors.join('\n'));
  const claims = new Map(data.claims.map(row => [row.claim_id, row]));
  const receipts = new Map(data.receipts.map(row => [row.receipt_id, row]));
  const events = new Map(data.events.map(row => [row.event_id, row]));
  const hydratedEvents = data.events.map(event => ({
    ...event,
    claims: event.claim_ids.map(id => {
      const claim = claims.get(id);
      return { ...claim, value: claimValue(claim), receipts: claim.receipt_ids.map(receiptId => receipts.get(receiptId)) };
    })
  }));
  const hydratedById = new Map(hydratedEvents.map(row => [row.event_id, row]));
  const statusCounts = Object.fromEntries([...CLAIM_STATUSES].map(status => [status, data.claims.filter(row => row.claim_status === status).length]));
  const beacons = data.beacons.map(beacon => {
    const inputClaims = [...new Set((beacon.dimensions ?? []).flatMap(dimension => dimension.claim_ids ?? []))].map(id => claims.get(id));
    const verified = inputClaims.filter(claim => claim?.claim_status === 'verified').length;
    return {
      ...beacon,
      evidence_coverage: { verified, total: inputClaims.length, ratio: inputClaims.length ? verified / inputClaims.length : 0 },
      inputs: beacon.input_event_ids.map(id => hydratedById.get(id))
    };
  });
  return {
    ...data.case,
    counts: { events: data.events.length, claims: data.claims.length, receipts: data.receipts.length, relations: data.relations.length, beacons: data.beacons.length },
    claim_status_counts: statusCounts,
    sections: data.case.sections.map(section => ({ ...section, records: section.record_ids.map(id => hydratedById.get(id)) })),
    events: hydratedEvents,
    relations: data.relations,
    receipts: data.receipts,
    beacons
  };
}

export function loadCaseLedger(caseDirectory) {
  const rel = path.relative(root, caseDirectory).replaceAll('\\', '/');
  return {
    case: readJson(`${rel}/case.json`),
    receipts: readJsonl(`${rel}/receipts.jsonl`),
    claims: readJsonl(`${rel}/claims.jsonl`),
    events: readJsonl(`${rel}/events.jsonl`),
    relations: readJsonl(`${rel}/relations.jsonl`),
    beacons: readJsonl(`${rel}/beacons.jsonl`)
  };
}

export function compileAllCases() {
  const caseRoot = path.join(root, 'cases');
  const directories = fs.readdirSync(caseRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'case.json')))
    .map(entry => path.join(caseRoot, entry.name));
  const compiled = directories.map(directory => compileCaseLedger(loadCaseLedger(directory)));
  for (const item of compiled) writeJson(`build/cases/${item.case_id}.json`, item);
  writeJson('build/cases/index.json', {
    schema_version: 'compiled-case-index@1',
    cases: compiled.map(item => ({
      case_id: item.case_id,
      tracking_id: item.tracking_id,
      title: item.title,
      subtitle: item.subtitle,
      as_of: item.as_of,
      published_at: item.published_at,
      status: item.status,
      presentation: item.presentation,
      featured_priority: item.featured_priority,
      briefing: item.briefing,
      counts: item.counts,
      claim_status_counts: item.claim_status_counts,
      href: `build/cases/${item.case_id}.json`
    }))
  });
  return compiled;
}
