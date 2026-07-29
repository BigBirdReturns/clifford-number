import crypto from 'node:crypto';
import { renderReporterBriefingHtml } from './reporter-briefing-html.mjs';

export const REPORTER_BRIEFING_SCHEMA_VERSION = 'reporter-briefing@2';
export const COMPILED_REPORTER_BRIEFING_SCHEMA_VERSION = 'compiled-reporter-briefing@2';
export const REPORTER_BRIEFING_INDEX_SCHEMA_VERSION = 'reporter-briefing-index@1';
export const REPORTER_BRIEFING_REVIEW_QUEUE_SCHEMA_VERSION = 'reporter-briefing-review-queue@1';

const CLAIM_STATUSES = new Set(['verified', 'review_required', 'disputed', 'superseded', 'rejected']);
const PUBLICATION_STATUSES = new Set(['review_required', 'approved', 'superseded', 'withdrawn']);
const SAFE_OUTPUT = /^briefs\/[a-z0-9][a-z0-9._\/-]*\.html$/i;
const SAFE_CASE_HREF = /^\.\.\/#case\/[a-z0-9][a-z0-9._-]*$/i;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function text(value) {
  return String(value ?? '').trim();
}

function safeHttpUrl(value) {
  try {
    const url = new URL(text(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function qualificationForClaim(claim, caseItem) {
  if (text(claim?.qualification)) return { qualification: text(claim.qualification), qualification_source: 'claim' };
  if (text(caseItem?.boundary)) return { qualification: text(caseItem.boundary), qualification_source: 'case_boundary' };
  if (text(caseItem?.disclaimer)) return { qualification: text(caseItem.disclaimer), qualification_source: 'case_disclaimer' };
  return { qualification: '', qualification_source: 'missing' };
}

function unsequencedDate(claim) {
  if (text(claim?.valid_from) && text(claim?.valid_until) && claim.valid_from !== claim.valid_until) {
    return `${claim.valid_from} to ${claim.valid_until}`;
  }
  return text(claim?.valid_from) || text(claim?.valid_until) || 'Not assigned to a dated event';
}

function claimMap(caseItem) {
  const claims = new Map();
  for (const claim of caseItem.claims ?? []) {
    claims.set(claim.claim_id, {
      ...claim,
      ...qualificationForClaim(claim, caseItem),
      event_id: null,
      event_type: 'unsequenced_case_claim',
      event_label: 'Unsequenced case claim',
      occurred_at: unsequencedDate(claim)
    });
  }
  for (const event of caseItem.events ?? []) {
    for (const claim of event.claims ?? []) {
      claims.set(claim.claim_id, {
        ...claim,
        ...qualificationForClaim(claim, caseItem),
        event_id: event.event_id,
        event_type: event.event_type,
        event_label: event.label,
        occurred_at: event.occurred_at
      });
    }
  }
  return claims;
}

function eventMap(caseItem) {
  return new Map((caseItem.events ?? []).map(event => [event.event_id, event]));
}

function receiptMap(caseItem) {
  return new Map((caseItem.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
}

function trailMap(caseItem) {
  return new Map((caseItem.trails ?? []).map(trail => [trail.trail_id, trail]));
}

function statusSummary(claims) {
  const counts = Object.fromEntries([...CLAIM_STATUSES].map(status => [status, 0]));
  for (const claim of claims) counts[claim.claim_status] = (counts[claim.claim_status] ?? 0) + 1;
  const statuses = unique(claims.map(claim => claim.claim_status));
  const status = statuses.length === 0 ? 'open' : statuses.length === 1 ? statuses[0] : 'mixed';
  return { status, counts };
}

function eventClaimIds(event) {
  return (event?.claims ?? []).map(claim => claim.claim_id);
}

function allBriefingClaimIds(spec, eventsById) {
  return unique([
    spec.working_proposition?.claim_id,
    spec.boundary?.claim_id,
    ...(spec.sequence?.items ?? []).flatMap(item => eventClaimIds(eventsById.get(item.event_id))),
    ...(spec.threads ?? []).flatMap(thread => (thread.cells ?? []).flatMap(cell => cell.claim_ids ?? [])),
    ...(spec.controls ?? []).flatMap(control => control.claim_ids ?? []),
    spec.records_target?.claim_id
  ]);
}

function receiptsForClaims(claims, receiptsById) {
  const ids = unique(claims.flatMap(claim => claim.receipt_ids ?? []));
  return ids.map(id => receiptsById.get(id)).filter(Boolean).map(receipt => ({
    receipt_id: receipt.receipt_id,
    label: receipt.label,
    publisher: receipt.publisher,
    source_type: receipt.source_type,
    evidence_class: receipt.evidence_class,
    url: safeHttpUrl(receipt.url || receipt.archive_url),
    notes: receipt.notes
  }));
}

function validateHistory(publication, errors) {
  if (!PUBLICATION_STATUSES.has(publication?.status)) errors.push(`publication.status must be one of ${[...PUBLICATION_STATUSES].join(', ')}`);
  if (!SEMVER.test(publication?.version ?? '')) errors.push('publication.version must be semantic version x.y.z');
  if (!Array.isArray(publication?.history) || publication.history.length === 0) {
    errors.push('publication.history must contain at least one release entry');
    return;
  }
  const versions = new Set();
  let previousDate = '';
  for (const [index, item] of publication.history.entries()) {
    if (!SEMVER.test(item?.version ?? '')) errors.push(`publication.history[${index}].version must be semantic version x.y.z`);
    if (versions.has(item?.version)) errors.push(`publication.history contains duplicate version ${item?.version}`);
    versions.add(item?.version);
    if (!ISO_DAY.test(item?.published_at ?? '')) errors.push(`publication.history[${index}].published_at must be an ISO day`);
    if (previousDate && item.published_at < previousDate) errors.push('publication.history must be chronological');
    previousDate = item.published_at;
    if (!PUBLICATION_STATUSES.has(item?.status)) errors.push(`publication.history[${index}].status is invalid`);
    if (!text(item?.change)) errors.push(`publication.history[${index}].change is required`);
  }
  const latest = publication.history.at(-1);
  if (latest?.version !== publication.version) errors.push('publication.version must match the latest history entry');
  if (latest?.status !== publication.status) errors.push('publication.status must match the latest history entry');
  if (publication.status === 'approved') {
    if (!text(publication.reviewer)) errors.push('approved publication requires publication.reviewer');
    if (!ISO_DAY.test(publication.reviewed_at ?? '')) errors.push('approved publication requires publication.reviewed_at');
  }
}

function validateDimension(dimension, name, errors) {
  if (!text(dimension?.id) || !text(dimension?.label)) errors.push(`orientation.${name} requires id and label`);
  if (!Array.isArray(dimension?.levels) || dimension.levels.length !== 3) {
    errors.push(`orientation.${name}.levels must contain exactly three categorical levels`);
    return new Set();
  }
  const ids = new Set();
  for (const [index, level] of dimension.levels.entries()) {
    if (!text(level?.id) || !text(level?.label)) errors.push(`orientation.${name}.levels[${index}] requires id and label`);
    if (ids.has(level?.id)) errors.push(`orientation.${name} contains duplicate level ${level?.id}`);
    ids.add(level?.id);
  }
  return ids;
}

function validateRecordsTarget(recordsTarget, claims, errors) {
  const hasClaim = Boolean(recordsTarget?.claim_id);
  const hasEditorial = Boolean(text(recordsTarget?.text) || text(recordsTarget?.qualification));
  if (hasClaim === hasEditorial) {
    errors.push('records_target must contain either claim_id or editorial text and qualification');
    return;
  }
  if (hasClaim && !claims.has(recordsTarget.claim_id)) errors.push('records_target.claim_id must reference a case claim');
  if (hasEditorial && (!text(recordsTarget?.text) || !text(recordsTarget?.qualification))) {
    errors.push('editorial records_target requires text and qualification');
  }
}

export function validateReporterBriefing(spec, caseItem) {
  const errors = [];
  const claims = claimMap(caseItem);
  const events = eventMap(caseItem);
  const receipts = receiptMap(caseItem);
  const trails = trailMap(caseItem);

  if (spec?.schema_version !== REPORTER_BRIEFING_SCHEMA_VERSION) errors.push(`schema_version must be ${REPORTER_BRIEFING_SCHEMA_VERSION}`);
  if (spec?.case_id !== caseItem?.case_id) errors.push('briefing case_id must match compiled case');
  if (spec?.briefing_id !== caseItem?.case_id) errors.push('briefing_id must equal case_id for stable routing');
  if (!SAFE_OUTPUT.test(spec?.output_path ?? '')) errors.push('output_path must be a safe briefs/*.html path');
  if (!SAFE_CASE_HREF.test(spec?.case_href ?? '')) errors.push('case_href must be ../#case/<case-id>');
  if (spec?.case_href !== `../#case/${caseItem.case_id}`) errors.push('case_href must target the matching compiled case');
  if (spec?.graph_effect !== 'none') errors.push('graph_effect must be none');
  if (spec?.conclusion_generated !== false) errors.push('conclusion_generated must be false');
  if (!ISO_DAY.test(spec?.as_of ?? '')) errors.push('as_of must be an ISO day');
  if (spec?.as_of !== caseItem?.as_of) errors.push('as_of must match compiled case as_of');
  if (!ISO_DAY.test(spec?.published_at ?? '')) errors.push('published_at must be an ISO day');
  if (!text(spec?.title) || !text(spec?.dek)) errors.push('title and dek are required');
  if (caseItem?.presentation !== 'reporter_briefing') errors.push('compiled case presentation must be reporter_briefing');
  if (caseItem?.briefing?.source !== `cases/${caseItem.case_id}/briefing.json`) errors.push('case briefing.source must point to the briefing specification');
  if (caseItem?.briefing?.href !== spec?.output_path) errors.push('case briefing.href must match output_path');
  if (caseItem?.briefing?.schema_version !== REPORTER_BRIEFING_SCHEMA_VERSION) errors.push(`case briefing.schema_version must match ${REPORTER_BRIEFING_SCHEMA_VERSION}`);
  if (caseItem?.briefing?.version !== spec?.publication?.version) errors.push('case briefing.version must match publication.version');

  validateHistory(spec?.publication, errors);
  if (spec?.publication?.status !== caseItem?.status) errors.push('publication.status must match case status');

  const xLevels = validateDimension(spec?.orientation?.x, 'x', errors);
  const yLevels = validateDimension(spec?.orientation?.y, 'y', errors);

  const columnIds = new Set();
  if (!Array.isArray(spec?.matrix?.columns) || spec.matrix.columns.length < 4) {
    errors.push('matrix.columns must contain at least four evidence columns');
  }
  for (const [index, column] of (spec?.matrix?.columns ?? []).entries()) {
    if (!text(column?.id) || !text(column?.label)) errors.push(`matrix column ${index + 1} requires id and label`);
    if (columnIds.has(column?.id)) errors.push(`duplicate matrix column ${column?.id}`);
    columnIds.add(column?.id);
  }
  if (!text(spec?.matrix?.empty_state_label)) errors.push('matrix.empty_state_label is required');

  const threadIds = new Set();
  for (const [index, thread] of (spec?.threads ?? []).entries()) {
    const threadLabel = thread?.id ?? index + 1;
    if (!text(thread?.id) || !text(thread?.title) || !text(thread?.subtitle)) errors.push(`thread ${index + 1} lacks id, title, or subtitle`);
    if (threadIds.has(thread?.id)) errors.push(`duplicate thread id ${thread?.id}`);
    threadIds.add(thread?.id);
    if (!xLevels.has(thread?.placement?.x_level)) errors.push(`thread ${threadLabel}.placement.x_level must use an orientation.x level`);
    if (!yLevels.has(thread?.placement?.y_level)) errors.push(`thread ${threadLabel}.placement.y_level must use an orientation.y level`);

    const seenCells = new Set();
    for (const cell of thread?.cells ?? []) {
      if (!columnIds.has(cell?.column_id)) errors.push(`thread ${threadLabel} references unknown matrix column ${cell?.column_id}`);
      if (seenCells.has(cell?.column_id)) errors.push(`thread ${threadLabel} repeats matrix column ${cell?.column_id}`);
      seenCells.add(cell?.column_id);
      const hasClaims = Array.isArray(cell?.claim_ids) && cell.claim_ids.length > 0;
      const hasTarget = Boolean(text(cell?.record_target));
      const isNA = cell?.not_applicable === true;
      if ([hasClaims, hasTarget, isNA].filter(Boolean).length !== 1) errors.push(`thread ${threadLabel} cell ${cell?.column_id} must contain claim_ids, record_target, or not_applicable`);
      for (const claimId of cell?.claim_ids ?? []) if (!claims.has(claimId)) errors.push(`thread ${threadLabel} references missing claim ${claimId}`);
    }
    for (const columnId of columnIds) if (!seenCells.has(columnId)) errors.push(`thread ${threadLabel} is missing matrix column ${columnId}`);
    if ((thread?.cells ?? []).length !== columnIds.size) errors.push(`thread ${threadLabel} must contain exactly one cell for every matrix column`);
  }
  if ((spec?.threads ?? []).length < 2) errors.push('at least two briefing threads are required');

  const laneIds = new Set();
  if (!Array.isArray(spec?.sequence?.lanes) || spec.sequence.lanes.length < 3) errors.push('sequence.lanes must contain at least three lanes');
  for (const [index, lane] of (spec?.sequence?.lanes ?? []).entries()) {
    if (!text(lane?.id) || !text(lane?.label)) errors.push(`sequence lane ${index + 1} requires id and label`);
    if (laneIds.has(lane?.id)) errors.push(`duplicate sequence lane ${lane?.id}`);
    laneIds.add(lane?.id);
  }
  const sequenceEvents = new Set();
  for (const [index, item] of (spec?.sequence?.items ?? []).entries()) {
    if (!events.has(item?.event_id)) errors.push(`sequence item ${index + 1} references missing event ${item?.event_id}`);
    if (!laneIds.has(item?.lane)) errors.push(`sequence item ${item?.event_id ?? index + 1} references unknown lane ${item?.lane}`);
    if (sequenceEvents.has(item?.event_id)) errors.push(`sequence contains duplicate event ${item?.event_id}`);
    sequenceEvents.add(item?.event_id);
  }
  if ((spec?.sequence?.items ?? []).length === 0) errors.push('sequence.items must contain at least one event');

  const controlIds = new Set();
  for (const [index, control] of (spec?.controls ?? []).entries()) {
    if (!text(control?.id) || !text(control?.title)) errors.push(`control ${index + 1} requires id and title`);
    if (controlIds.has(control?.id)) errors.push(`duplicate control id ${control?.id}`);
    controlIds.add(control?.id);
    if (!Array.isArray(control?.claim_ids) || control.claim_ids.length === 0) errors.push(`control ${control?.id ?? index + 1} must reference at least one claim`);
    for (const claimId of control?.claim_ids ?? []) if (!claims.has(claimId)) errors.push(`control ${control?.id ?? index + 1} references missing claim ${claimId}`);
  }
  if ((spec?.controls ?? []).length < 2) errors.push('at least two counterweight groups are required');

  const workIds = new Set();
  const priorities = new Set();
  for (const [index, item] of (spec?.workplan ?? []).entries()) {
    const label = item?.id ?? index + 1;
    if (!text(item?.id) || !text(item?.title)) errors.push(`workplan item ${index + 1} requires id and title`);
    if (workIds.has(item?.id)) errors.push(`duplicate workplan id ${item?.id}`);
    workIds.add(item?.id);
    if (!Number.isInteger(item?.priority) || item.priority < 1) errors.push(`workplan ${label}.priority must be a positive integer`);
    if (priorities.has(item?.priority)) errors.push(`workplan priority ${item?.priority} is duplicated`);
    priorities.add(item?.priority);
    if (!Array.isArray(item?.thread_ids) || item.thread_ids.length === 0) errors.push(`workplan ${label} must target at least one thread`);
    for (const threadId of item?.thread_ids ?? []) if (!threadIds.has(threadId)) errors.push(`workplan ${label} references unknown thread ${threadId}`);
    for (const trailId of item?.trail_ids ?? []) {
      const trail = trails.get(trailId);
      if (!trail) errors.push(`workplan ${label} references unknown case trail ${trailId}`);
      else {
        if (trail.graph_effect !== 'none') errors.push(`workplan ${label} references graph-active trail ${trailId}`);
        if (trail.promotes_to && trail.promotes_to !== 'candidate_only') errors.push(`workplan ${label} references trail ${trailId} that promotes beyond candidate_only`);
      }
    }
    for (const field of ['custodians', 'records', 'routes']) {
      if (!Array.isArray(item?.[field]) || item[field].length === 0 || item[field].some(value => !text(value))) errors.push(`workplan ${label}.${field} must contain nonempty text entries`);
    }
    if (!text(item?.date_window)) errors.push(`workplan ${label}.date_window is required`);
    if (!text(item?.decision_test)) errors.push(`workplan ${label}.decision_test is required`);
  }
  if ((spec?.workplan ?? []).length === 0) errors.push('workplan must contain at least one sequenced reporting item');

  for (const [name, ref] of [['working_proposition', spec?.working_proposition], ['boundary', spec?.boundary]]) {
    if (!ref?.claim_id || !claims.has(ref.claim_id)) errors.push(`${name}.claim_id must reference a case claim`);
  }
  validateRecordsTarget(spec?.records_target, claims, errors);

  for (const [index, item] of (spec?.translations ?? []).entries()) {
    if (!text(item?.term) || !text(item?.question)) errors.push(`translation ${index + 1} requires term and question`);
  }

  for (const claimId of allBriefingClaimIds(spec, events)) {
    const claim = claims.get(claimId);
    if (!claim) continue;
    if (!CLAIM_STATUSES.has(claim.claim_status)) errors.push(`briefing claim ${claimId} has invalid status ${claim.claim_status}`);
    if (!text(claim.plain)) errors.push(`briefing claim ${claimId} lacks plain text`);
    if (!text(claim.qualification)) errors.push(`briefing claim ${claimId} lacks a claim qualification or case-wide boundary`);
    if (!(claim.receipt_ids?.length > 0)) errors.push(`briefing claim ${claimId} has no receipts`);
    for (const receiptId of claim.receipt_ids ?? []) if (!receipts.has(receiptId)) errors.push(`briefing claim ${claimId} references missing receipt ${receiptId}`);
  }

  return errors;
}

export function compileReporterBriefing(spec, caseItem) {
  const errors = validateReporterBriefing(spec, caseItem);
  if (errors.length) throw new Error(errors.join('\n'));

  const claimsById = claimMap(caseItem);
  const eventsById = eventMap(caseItem);
  const receiptsById = receiptMap(caseItem);
  const trailsById = trailMap(caseItem);
  const claimIds = allBriefingClaimIds(spec, eventsById);
  const claims = claimIds.map(id => claimsById.get(id));
  const receipts = receiptsForClaims(claims, receiptsById);
  const publicReceipts = receipts.filter(receipt => receipt.url);
  const claimRefs = new Map(claimIds.map((id, index) => [id, `C${String(index + 1).padStart(2, '0')}`]));
  const sourceRefs = new Map(publicReceipts.map((receipt, index) => [receipt.receipt_id, `S${String(index + 1).padStart(2, '0')}`]));

  const proposition = claimsById.get(spec.working_proposition.claim_id);
  const boundary = claimsById.get(spec.boundary.claim_id);
  const recordsTarget = spec.records_target.claim_id
    ? { ...claimsById.get(spec.records_target.claim_id), source: 'claim' }
    : {
        plain: text(spec.records_target.text),
        qualification: text(spec.records_target.qualification),
        qualification_source: 'editorial',
        claim_status: 'review_required',
        source: 'editorial'
      };

  const columnsById = new Map(spec.matrix.columns.map(column => [column.id, column]));
  const threadRecords = spec.threads.map((thread, index) => {
    const cells = thread.cells.map(cell => {
      const cellClaims = (cell.claim_ids ?? []).map(id => claimsById.get(id));
      const summary = statusSummary(cellClaims);
      const state = cell.not_applicable ? 'not_applicable' : cell.record_target ? 'open' : summary.status;
      return {
        ...cell,
        column: columnsById.get(cell.column_id),
        claims: cellClaims,
        status: state,
        status_counts: summary.counts
      };
    });
    const threadClaims = unique(cells.flatMap(cell => cell.claims.map(claim => claim.claim_id))).map(id => claimsById.get(id));
    return {
      ...thread,
      number: thread.number || String(index + 1).padStart(2, '0'),
      cells,
      claims: threadClaims,
      ...statusSummary(threadClaims)
    };
  });
  const threadById = new Map(threadRecords.map(thread => [thread.id, thread]));

  const sequenceRecords = spec.sequence.items.map(item => {
    const event = eventsById.get(item.event_id);
    const eventClaims = (event.claims ?? []).map(claim => claimsById.get(claim.claim_id));
    return { ...item, event, claims: eventClaims, ...statusSummary(eventClaims) };
  });

  const controlRecords = spec.controls.map(control => {
    const controlClaims = control.claim_ids.map(id => claimsById.get(id));
    return { ...control, claims: controlClaims, ...statusSummary(controlClaims) };
  });

  const workplanRecords = [...spec.workplan].sort((a, b) => a.priority - b.priority).map(item => ({
    ...item,
    trails: (item.trail_ids ?? []).map(id => trailsById.get(id))
  }));
  const sourceTrailIds = unique(workplanRecords.flatMap(item => item.trail_ids ?? []));
  const inheritedQualificationClaimIds = claims
    .filter(claim => claim.qualification_source !== 'claim')
    .map(claim => claim.claim_id);

  const caseSummary = statusSummary(claims);
  const xLevelById = new Map(spec.orientation.x.levels.map(level => [level.id, level]));
  const yLevelById = new Map(spec.orientation.y.levels.map(level => [level.id, level]));

  const html = renderReporterBriefingHtml({
    spec,
    caseItem,
    claims,
    receipts,
    publicReceipts,
    claimRefs,
    sourceRefs,
    proposition,
    boundary,
    recordsTarget,
    threadRecords,
    threadById,
    sequenceRecords,
    controlRecords,
    workplanRecords,
    xLevelById,
    yLevelById,
    schemaVersion: REPORTER_BRIEFING_SCHEMA_VERSION
  });

  const manifest = {
    schema_version: COMPILED_REPORTER_BRIEFING_SCHEMA_VERSION,
    briefing_id: spec.briefing_id,
    case_id: spec.case_id,
    title: spec.title,
    as_of: spec.as_of,
    published_at: spec.published_at,
    output_path: spec.output_path,
    case_href: spec.case_href,
    audience: spec.audience,
    presentation: caseItem.presentation,
    publication: spec.publication,
    graph_effect: 'none',
    conclusion_generated: false,
    records_target: {
      source: recordsTarget.source,
      claim_id: spec.records_target.claim_id ?? null
    },
    counts: {
      threads: threadRecords.length,
      matrix_cells: threadRecords.reduce((total, thread) => total + thread.cells.length, 0),
      sequence_events: sequenceRecords.length,
      controls: controlRecords.length,
      workplan_items: workplanRecords.length,
      source_trails: sourceTrailIds.length,
      claims: claims.length,
      verified_claims: caseSummary.counts.verified,
      review_required_claims: caseSummary.counts.review_required,
      inherited_qualifications: inheritedQualificationClaimIds.length,
      receipts: receipts.length,
      public_receipts: publicReceipts.length,
      translations: spec.translations?.length ?? 0
    },
    claim_ids: claimIds,
    verified_claim_ids: claims.filter(claim => claim.claim_status === 'verified').map(claim => claim.claim_id),
    review_required_claim_ids: claims.filter(claim => claim.claim_status === 'review_required').map(claim => claim.claim_id),
    inherited_qualification_claim_ids: inheritedQualificationClaimIds,
    receipt_ids: receipts.map(receipt => receipt.receipt_id),
    public_receipt_ids: publicReceipts.map(receipt => receipt.receipt_id),
    source_trail_ids: sourceTrailIds,
    orientation: {
      x: spec.orientation.x,
      y: spec.orientation.y,
      placements: threadRecords.map(thread => ({ id: thread.id, x_level: thread.placement.x_level, y_level: thread.placement.y_level }))
    },
    sequence: sequenceRecords.map(record => ({
      event_id: record.event.event_id,
      lane: record.lane,
      occurred_at: record.event.occurred_at,
      claim_ids: record.claims.map(claim => claim.claim_id),
      status: record.status
    })),
    threads: threadRecords.map(thread => ({
      id: thread.id,
      number: thread.number,
      title: thread.title,
      placement: thread.placement,
      claim_ids: thread.claims.map(claim => claim.claim_id),
      cells: thread.cells.map(cell => ({
        column_id: cell.column_id,
        state: cell.status,
        claim_ids: cell.claims.map(claim => claim.claim_id),
        record_target: cell.record_target ?? null
      })),
      status: thread.status,
      status_counts: thread.counts,
      graph_effect: 'none'
    })),
    controls: controlRecords.map(control => ({
      id: control.id,
      title: control.title,
      claim_ids: control.claim_ids,
      status: control.status,
      graph_effect: 'none'
    })),
    workplan: workplanRecords.map(item => ({
      id: item.id,
      priority: item.priority,
      title: item.title,
      thread_ids: item.thread_ids,
      trail_ids: item.trail_ids ?? [],
      graph_effect: 'none'
    })),
    integrity: {
      source_sha256: sha256(`${JSON.stringify(spec, null, 2)}\n`),
      case_sha256: sha256(`${JSON.stringify(caseItem, null, 2)}\n`),
      html_sha256: sha256(html)
    }
  };

  return { html, manifest };
}

export function reporterBriefingQueueEntry(manifest) {
  const scopeLimits = [];
  if (manifest.publication.status !== 'approved') scopeLimits.push(`publication_status_${manifest.publication.status}`);
  if (manifest.counts.review_required_claims > 0) scopeLimits.push(`${manifest.counts.review_required_claims}_claims_review_required`);
  if (manifest.counts.inherited_qualifications > 0) scopeLimits.push(`${manifest.counts.inherited_qualifications}_qualifications_inherited_from_case_boundary`);
  const clearanceConditions = [];
  if (!manifest.publication.reviewer) clearanceConditions.push('independent_reviewer_missing');
  if (!manifest.publication.reviewed_at) clearanceConditions.push('review_date_missing');
  const blockers = [];
  if (!(manifest.counts.verified_claims > 0)) blockers.push('no_verified_claims');
  if (!(manifest.counts.public_receipts > 0)) blockers.push('no_public_receipts');
  const provisionalPublicationEligible = blockers.length === 0;
  return {
    briefing_id: manifest.briefing_id,
    case_id: manifest.case_id,
    title: manifest.title,
    version: manifest.publication.version,
    publication_status: manifest.publication.status,
    reviewer: manifest.publication.reviewer ?? null,
    reviewed_at: manifest.publication.reviewed_at ?? null,
    judgment_state: provisionalPublicationEligible ? 'bounded_working_judgment' : 'observation_only',
    blocking_reasons: blockers,
    scope_limits: scopeLimits,
    clearance_conditions: clearanceConditions,
    provisional_publication_eligible: provisionalPublicationEligible,
    eligible_for_approval: provisionalPublicationEligible && scopeLimits.length === 0 && clearanceConditions.length === 0,
    review_dependency: {
      required_to_decide: false,
      effect: 'challenge_or_clearance_only_not_permission_to_form_a_bounded_judgment'
    },
    graph_effect: 'none'
  };
}
