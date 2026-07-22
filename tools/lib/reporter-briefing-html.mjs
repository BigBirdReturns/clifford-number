import fs from 'node:fs';

const STYLES = fs.readFileSync(new URL('./reporter-briefing.css', import.meta.url), 'utf8').trim();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function statusLabel(status) {
  return ({
    verified: 'Verified',
    review_required: 'Review required',
    disputed: 'Disputed',
    superseded: 'Superseded',
    rejected: 'Rejected',
    mixed: 'Mixed record',
    open: 'Open record',
    not_applicable: 'Not applicable'
  })[status] ?? String(status).replaceAll('_', ' ');
}

function badgeMarkup(status) {
  return `<span class="badge badge--${escapeAttribute(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

function claimChips(claims, claimRefs) {
  return claims
    .map(claim => `<a class="claim-chip" href="#claim-${escapeAttribute(claim.claim_id)}">${escapeHtml(claimRefs.get(claim.claim_id))}</a>`)
    .join('');
}

function sourceIndexMarkup(receipts, sourceRefs) {
  return receipts
    .filter(receipt => receipt.url)
    .map(receipt => [
      '<tr>',
      `<td>${escapeHtml(sourceRefs.get(receipt.receipt_id))}</td>`,
      `<td>${escapeHtml(receipt.publisher || 'Source')}</td>`,
      `<td><a href="${escapeAttribute(receipt.url)}" target="_blank" rel="noreferrer">${escapeHtml(receipt.label || receipt.receipt_id)}</a></td>`,
      `<td>${escapeHtml(receipt.notes || '')}</td>`,
      '</tr>'
    ].join(''))
    .join('');
}

function claimSourceRefs(claim, sourceRefs) {
  const refs = (claim.receipt_ids ?? []).map(receiptId => sourceRefs.get(receiptId)).filter(Boolean);
  const privateCount = (claim.receipt_ids ?? []).length - refs.length;
  const publicMarkup = refs.map(ref => `<span class="source-ref">${escapeHtml(ref)}</span>`).join('');
  const privateMarkup = privateCount > 0
    ? '<span class="source-ref source-ref--custody">private provenance in custody</span>'
    : '';
  return publicMarkup || privateMarkup
    ? `${publicMarkup}${privateMarkup}`
    : '<span class="source-ref">no public link</span>';
}

export function renderReporterBriefingHtml(view) {
  const {
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
    xLevelById,
    yLevelById,
    schemaVersion
  } = view;

  const orientationHeader = spec.orientation.x.levels
    .map(level => `<th scope="col">${escapeHtml(level.label)}</th>`)
    .join('');

  const orientationRows = [...spec.orientation.y.levels].reverse().map(yLevel => {
    const cells = spec.orientation.x.levels.map(xLevel => {
      const pins = threadRecords
        .filter(thread => thread.placement.x_level === xLevel.id && thread.placement.y_level === yLevel.id)
        .map(thread => [
          `<a class="thread-pin" href="#thread-${escapeAttribute(thread.id)}"`,
          ` data-x-level="${escapeAttribute(xLevel.id)}" data-y-level="${escapeAttribute(yLevel.id)}">`,
          `<b>${escapeHtml(thread.number)}</b><span>${escapeHtml(thread.title)}</span></a>`
        ].join(''))
        .join('');
      return `<td><div class="orientation-cell">${pins || '<span class="note">No selected thread</span>'}</div></td>`;
    }).join('');
    return `<tr><th scope="row">${escapeHtml(yLevel.label)}</th>${cells}</tr>`;
  }).join('');

  const orientationKey = threadRecords.map(thread => [
    '<li>',
    `<span>${escapeHtml(thread.number)}</span>`,
    `<b>${escapeHtml(thread.title)}</b>`,
    `<small>${escapeHtml(thread.subtitle)}</small>`,
    '</li>'
  ].join('')).join('');

  const sequenceHeader = spec.sequence.lanes
    .map(lane => `<th scope="col">${escapeHtml(lane.label)}</th>`)
    .join('');

  const sequenceRows = sequenceRecords.map(record => {
    const laneCells = spec.sequence.lanes.map(lane => {
      if (lane.id !== record.lane) return '<td class="empty"></td>';
      return [
        '<td>',
        `<article class="event-card event-card--${escapeAttribute(lane.id)}">`,
        `<div class="event-type">${escapeHtml(record.event.event_type.replaceAll('_', ' '))}</div>`,
        `<h3>${escapeHtml(record.event.label)}</h3>`,
        `${badgeMarkup(record.status)} ${claimChips(record.claims, claimRefs)}`,
        '</article>',
        '</td>'
      ].join('');
    }).join('');
    return `<tr data-event-id="${escapeAttribute(record.event.event_id)}"><td class="date">${escapeHtml(record.event.occurred_at)}</td>${laneCells}</tr>`;
  }).join('');

  const matrixHeader = spec.matrix.columns
    .map(column => `<th scope="col">${escapeHtml(column.label)}</th>`)
    .join('');

  const matrixRows = threadRecords.map(thread => {
    const cells = spec.matrix.columns.map(column => {
      const cell = thread.cells.find(item => item.column_id === column.id);
      let body;
      if (cell.claims.length > 0) {
        const claimLines = cell.claims.map(claim => [
          '<p class="claim-line">',
          `<a href="#claim-${escapeAttribute(claim.claim_id)}">`,
          `<strong>${escapeHtml(claimRefs.get(claim.claim_id))}</strong> · ${escapeHtml(claim.event_label)}`,
          '</a>',
          '</p>'
        ].join('')).join('');
        body = `${badgeMarkup(cell.status)}${claimLines}`;
      } else if (cell.record_target) {
        body = `${badgeMarkup('open')}<p class="open-target">${escapeHtml(cell.record_target)}</p>`;
      } else {
        body = `${badgeMarkup('not_applicable')}<p class="na">${escapeHtml(spec.matrix.empty_state_label)}</p>`;
      }
      return `<td><div class="matrix-cell">${body}</div></td>`;
    }).join('');
    const xLabel = xLevelById.get(thread.placement.x_level)?.label ?? thread.placement.x_level;
    const yLabel = yLevelById.get(thread.placement.y_level)?.label ?? thread.placement.y_level;
    return [
      `<tr id="thread-${escapeAttribute(thread.id)}" data-thread-id="${escapeAttribute(thread.id)}">`,
      '<th class="thread-head" scope="row">',
      `<span class="number">${escapeHtml(thread.number)}</span>`,
      `<h3>${escapeHtml(thread.title)}</h3>`,
      `<small>${escapeHtml(thread.subtitle)}</small>`,
      `<div class="placement"><span>${escapeHtml(xLabel)}</span><span>${escapeHtml(yLabel)}</span></div>`,
      '</th>',
      cells,
      '</tr>'
    ].join('');
  }).join('');

  const controls = controlRecords.map(control => [
    `<article class="control" data-control-id="${escapeAttribute(control.id)}">`,
    '<div class="label">Counterweight</div>',
    `<h3>${escapeHtml(control.title)}</h3>`,
    `<p>${badgeMarkup(control.status)} ${claimChips(control.claims, claimRefs)}</p>`,
    '<ul>',
    control.claims.map(claim => [
      '<li>',
      `<strong>${escapeHtml(claim.plain)}</strong>`,
      `<div class="qualification">${escapeHtml(claim.qualification)}</div>`,
      '</li>'
    ].join('')).join(''),
    '</ul>',
    '</article>'
  ].join('')).join('');

  const workplan = [...spec.workplan].sort((a, b) => a.priority - b.priority).map(item => {
    const tags = item.thread_ids
      .map(id => `<span>${escapeHtml(threadById.get(id)?.number ?? id)} · ${escapeHtml(threadById.get(id)?.title ?? id)}</span>`)
      .join('');
    const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
    return [
      `<article class="work-item" data-work-id="${escapeAttribute(item.id)}">`,
      '<div class="work-head">',
      `<span class="priority">${escapeHtml(String(item.priority).padStart(2, '0'))}</span>`,
      '<div><div class="label">Reporting queue</div>',
      `<h3>${escapeHtml(item.title)}</h3>`,
      `<p class="note">${escapeHtml(item.date_window)}</p></div>`,
      '</div>',
      `<div class="thread-tags">${tags}</div>`,
      '<div class="work-grid">',
      `<div><h4>Custodians</h4>${list(item.custodians)}</div>`,
      `<div><h4>Records</h4>${list(item.records)}</div>`,
      `<div><h4>Routes</h4>${list(item.routes)}</div>`,
      `<div><h4>Decision test</h4><p>${escapeHtml(item.decision_test)}</p></div>`,
      '</div>',
      '</article>'
    ].join('');
  }).join('');

  const translations = (spec.translations ?? [])
    .map(item => `<div><dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.question)}</dd></div>`)
    .join('');

  const claimRegisterRows = claims.map(claim => [
    `<tr id="claim-${escapeAttribute(claim.claim_id)}">`,
    `<td class="ref">${escapeHtml(claimRefs.get(claim.claim_id))}</td>`,
    `<td class="status">${badgeMarkup(claim.claim_status)}</td>`,
    `<td class="event"><strong>${escapeHtml(claim.occurred_at)}</strong><br>${escapeHtml(claim.event_label)}</td>`,
    `<td class="claim-text">${escapeHtml(claim.plain)}</td>`,
    `<td class="qualification">${escapeHtml(claim.qualification)}</td>`,
    `<td class="sources-cell">${claimSourceRefs(claim, sourceRefs)}</td>`,
    '</tr>'
  ].join('')).join('');

  const sourceRows = sourceIndexMarkup(receipts, sourceRefs);
  const publicationBoundary = `${caseItem.boundary} ${caseItem.disclaimer}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="clifford-briefing-schema" content="${schemaVersion}">
<meta name="clifford-briefing-version" content="${escapeAttribute(spec.publication.version)}">
<title>${escapeHtml(spec.title)}</title>
<style>
${STYLES}
</style>
</head>
<body data-briefing-id="${escapeAttribute(spec.briefing_id)}" data-briefing-schema="${schemaVersion}" data-graph-effect="none">
<main class="page">
<div class="kicker">Reporter briefing · public records · as known ${escapeHtml(spec.as_of)}</div>
<h1>${escapeHtml(spec.title)}</h1>
<p class="dek">${escapeHtml(spec.dek)}</p>
<section class="thesis">
<div class="panel question"><div class="label">Working proposition · ${escapeHtml(statusLabel(proposition.claim_status))}</div><p><strong>${escapeHtml(proposition.plain)}</strong></p><p class="note">${escapeHtml(proposition.qualification)}</p></div>
<div class="panel boundary"><div class="label">Evidence boundary</div><p>${escapeHtml(boundary.plain)}</p><p class="note">${escapeHtml(boundary.qualification)}</p></div>
</section>
<section class="metrics" aria-label="Briefing counts"><div class="metric"><strong>${sequenceRecords.length}</strong><span>dated sequence events</span></div><div class="metric"><strong>${threadRecords.length}</strong><span>decision threads</span></div><div class="metric"><strong>${claims.length}</strong><span>canonical claims</span></div><div class="metric"><strong>${publicReceipts.length}</strong><span>public source links</span></div><div class="metric"><strong>${spec.workplan.length}</strong><span>reporting actions</span></div></section>
<div class="section-head"><div><div class="eyebrow">Categorical orientation</div><h2>Where the selected decision threads sit</h2></div><p>Three-by-three placement only. No interval score, probability, influence rating, or causal finding is generated.</p></div>
<section class="orientation-shell"><div class="table-wrap"><table class="orientation-grid"><thead><tr><th>${escapeHtml(spec.orientation.y.label)} ↓ / ${escapeHtml(spec.orientation.x.label)} →</th>${orientationHeader}</tr></thead><tbody>${orientationRows}</tbody></table></div><div class="panel"><div class="label">Thread key</div><ol class="orientation-key">${orientationKey}</ol><p class="note">Placement is editorial orientation. The evidence matrix and claim register carry the record.</p></div></section>
<div class="section-head"><div><div class="eyebrow">Story spine</div><h2>Decision sequence</h2></div><p>Opened records are ordered across capability, access, formal gates, and counterweights. Sequence is not causation.</p></div>
<div class="table-wrap"><table class="sequence"><thead><tr><th scope="col">Date / period</th>${sequenceHeader}</tr></thead><tbody>${sequenceRows}</tbody></table></div>
<div class="section-head"><div><div class="eyebrow">Evidence distribution</div><h2>What is established, and where the paper gap remains</h2></div><p>An open cell means the decisive record is not established in the opened case. It is not proof that the record or event does not exist.</p></div>
<div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Decision thread</th>${matrixHeader}</tr></thead><tbody>${matrixRows}</tbody></table></div>
<div class="section-head"><div><div class="eyebrow">Alternative explanations</div><h2>Counterweights the report must carry</h2></div><p>These records prevent a one-directional reading of access, award size, or vendor position.</p></div>
<section class="controls">${controls}</section>
<div class="section-head"><div><div class="eyebrow">Acquisition plan</div><h2>Reporting queue</h2></div><p>Work proceeds from formal decision records to communications, technical control, performance, money, comparators, and right of reply.</p></div>
<section class="workplan">${workplan}</section>
<section class="translate"><div class="panel"><div class="label">Bypass the jargon</div><h2>Translate the claim into an ordinary records question.</h2><dl>${translations}</dl></div><div class="panel"><div class="label">Records roadmap</div><h2>What would prove or defeat the stronger theory?</h2><p>${escapeHtml(recordsTarget.plain)}</p><p class="note">${escapeHtml(recordsTarget.qualification)}</p></div></section>
<div class="section-head"><div><div class="eyebrow">Canonical record</div><h2>Claim register</h2></div><p>Every factual statement below is copied from the case ledger with its status, date, qualification, and receipt references.</p></div>
<div class="table-wrap"><table class="claim-register"><thead><tr><th>Ref</th><th>Status</th><th>Date / event</th><th>Canonical claim</th><th>Qualification</th><th>Sources</th></tr></thead><tbody>${claimRegisterRows}</tbody></table></div>
<section class="cta"><div><div class="label">Claim-level evidence</div><h2>Open the full case.</h2><p>Inspect event structure, evidence class, causal status, receipts, and publication history.</p></div><a href="${escapeAttribute(spec.case_href)}">Open evidence case</a></section>
<div class="section-head"><div><div class="eyebrow">Receipts</div><h2>Public source index</h2></div><p>Private editorial provenance remains in custody and is never presented as independent public support.</p></div>
<div class="table-wrap"><table class="sources"><thead><tr><th>ID</th><th>Publisher</th><th>Receipt</th><th>Boundary</th></tr></thead><tbody>${sourceRows}</tbody></table></div>
<p class="foot">${escapeHtml(publicationBoundary)} Publication state: ${escapeHtml(spec.publication.status)} · version ${escapeHtml(spec.publication.version)} · ${publicReceipts.length} public source links · graph effect: none · conclusion generated: false. Corrections: ${escapeHtml(spec.publication.correction_route)}</p>
</main>
</body>
</html>
`;
}
