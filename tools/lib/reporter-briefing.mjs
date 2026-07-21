import crypto from 'node:crypto';

export const REPORTER_BRIEFING_SCHEMA_VERSION = 'reporter-briefing@1';
export const COMPILED_REPORTER_BRIEFING_SCHEMA_VERSION = 'compiled-reporter-briefing@1';
export const REPORTER_BRIEFING_INDEX_SCHEMA_VERSION = 'reporter-briefing-index@1';
export const REPORTER_BRIEFING_REVIEW_QUEUE_SCHEMA_VERSION = 'reporter-briefing-review-queue@1';

const CLAIM_STATUSES = new Set(['verified', 'review_required', 'disputed', 'superseded', 'rejected']);
const PUBLICATION_STATUSES = new Set(['review_required', 'approved', 'superseded', 'withdrawn']);
const SAFE_OUTPUT = /^briefs\/[a-z0-9][a-z0-9._/-]*\.html$/i;
const SAFE_CASE_HREF = /^\.\.\/#case\/[a-z0-9][a-z0-9._-]*$/i;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function text(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
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

function claimMap(caseItem) {
  const claims = new Map();
  for (const event of caseItem.events ?? []) {
    for (const claim of event.claims ?? []) claims.set(claim.claim_id, { ...claim, event_id: event.event_id, event_label: event.label, occurred_at: event.occurred_at });
  }
  return claims;
}

function receiptMap(caseItem) {
  return new Map((caseItem.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
}

function statusSummary(claims) {
  const counts = Object.fromEntries([...CLAIM_STATUSES].map(status => [status, 0]));
  for (const claim of claims) counts[claim.claim_status] = (counts[claim.claim_status] ?? 0) + 1;
  const statuses = unique(claims.map(claim => claim.claim_status));
  const status = statuses.length === 1 ? statuses[0] : 'mixed';
  return { status, counts };
}

function allBriefingClaimIds(spec) {
  return unique([
    spec.working_proposition?.claim_id,
    spec.boundary?.claim_id,
    spec.records_target?.claim_id,
    ...(spec.threads ?? []).flatMap(thread => thread.claim_ids ?? [])
  ]);
}

function publicReceiptsForClaims(claims, receiptsById) {
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

export function validateReporterBriefing(spec, caseItem) {
  const errors = [];
  const claims = claimMap(caseItem);
  const receipts = receiptMap(caseItem);
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
  if (caseItem?.briefing?.schema_version !== REPORTER_BRIEFING_SCHEMA_VERSION) errors.push('case briefing.schema_version must match reporter-briefing@1');
  if (caseItem?.briefing?.version !== spec?.publication?.version) errors.push('case briefing.version must match publication.version');

  validateHistory(spec?.publication, errors);
  if (spec?.publication?.status !== caseItem?.status) errors.push('publication.status must match case status');

  const axes = spec?.axes ?? [];
  if (axes.length !== 2) errors.push('exactly two axes are required');
  const axisIds = new Set();
  for (const [index, axis] of axes.entries()) {
    if (!text(axis?.id) || !text(axis?.label) || !text(axis?.low_label) || !text(axis?.high_label)) errors.push(`axis ${index + 1} lacks id or labels`);
    if (axisIds.has(axis?.id)) errors.push(`duplicate axis id ${axis?.id}`);
    axisIds.add(axis?.id);
  }

  for (const [name, ref] of [['working_proposition', spec?.working_proposition], ['boundary', spec?.boundary], ['records_target', spec?.records_target]]) {
    if (!ref?.claim_id || !claims.has(ref.claim_id)) errors.push(`${name}.claim_id must reference a case claim`);
  }

  const threadIds = new Set();
  for (const [index, thread] of (spec?.threads ?? []).entries()) {
    if (!text(thread?.id) || !text(thread?.title) || !text(thread?.subtitle)) errors.push(`thread ${index + 1} lacks id, title, or subtitle`);
    if (threadIds.has(thread?.id)) errors.push(`duplicate thread id ${thread?.id}`);
    threadIds.add(thread?.id);
    if (!Array.isArray(thread?.claim_ids) || thread.claim_ids.length === 0) errors.push(`thread ${thread?.id ?? index + 1} must reference at least one claim`);
    for (const claimId of thread?.claim_ids ?? []) if (!claims.has(claimId)) errors.push(`thread ${thread?.id ?? index + 1} references missing claim ${claimId}`);
    for (const coordinate of ['x', 'y']) if (!Number.isFinite(thread?.[coordinate]) || thread[coordinate] < 0 || thread[coordinate] > 100) errors.push(`thread ${thread?.id ?? index + 1}.${coordinate} must be between 0 and 100`);
    if (!text(thread?.decisive_record)) errors.push(`thread ${thread?.id ?? index + 1} requires decisive_record`);
  }
  if ((spec?.threads ?? []).length < 2) errors.push('at least two briefing threads are required');

  for (const [index, item] of (spec?.translations ?? []).entries()) {
    if (!text(item?.term) || !text(item?.question)) errors.push(`translation ${index + 1} requires term and question`);
  }

  for (const claimId of allBriefingClaimIds(spec)) {
    const claim = claims.get(claimId);
    if (!claim) continue;
    if (!CLAIM_STATUSES.has(claim.claim_status)) errors.push(`briefing claim ${claimId} has invalid status ${claim.claim_status}`);
    if (!text(claim.plain)) errors.push(`briefing claim ${claimId} lacks plain text`);
    if (!text(claim.qualification)) errors.push(`briefing claim ${claimId} lacks a qualification`);
    if (!(claim.receipt_ids?.length > 0)) errors.push(`briefing claim ${claimId} has no receipts`);
    for (const receiptId of claim.receipt_ids ?? []) if (!receipts.has(receiptId)) errors.push(`briefing claim ${claimId} references missing receipt ${receiptId}`);
  }

  return errors;
}

function claimMarkup(claim) {
  const status = claim.claim_status === 'verified' ? 'Verified' : claim.claim_status === 'review_required' ? 'Review required' : claim.claim_status;
  return `<li class="claim claim--${escapeAttribute(claim.claim_status)}"><span class="badge">${escapeHtml(status)}</span><p>${escapeHtml(claim.plain)}</p></li>`;
}

function limitsMarkup(claims) {
  const limits = unique(claims.map(claim => claim.qualification));
  return limits.map(limit => `<li>${escapeHtml(limit)}</li>`).join('');
}

function sourceIndexMarkup(receipts) {
  const publicReceipts = receipts.filter(receipt => receipt.url);
  return publicReceipts.map((receipt, index) => `<tr><td>S${String(index + 1).padStart(2, '0')}</td><td>${escapeHtml(receipt.publisher || 'Source')}</td><td><a href="${escapeAttribute(receipt.url)}" target="_blank" rel="noreferrer">${escapeHtml(receipt.label || receipt.receipt_id)}</a></td><td>${escapeHtml(receipt.notes || '')}</td></tr>`).join('');
}

function renderStyles() {
  return `:root{--paper:#f5f0e5;--panel:#fffdf7;--ink:#181714;--muted:#5b574f;--line:#c9bea5;--amber:#9a6a12;--navy:#152739;--green:#2e6545;--red:#8b3f38;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--sans:Arial,Helvetica,sans-serif;--serif:Georgia,"Times New Roman",serif}*{box-sizing:border-box}html{background:#d8d1c4}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.52 var(--serif)}a{color:inherit}.page{width:min(1320px,100%);margin:auto;padding:36px}.kicker,.label{font:700 10px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--amber)}h1{max-width:15ch;margin:8px 0 14px;font:800 clamp(40px,6vw,78px)/.94 var(--sans);letter-spacing:-.05em}.dek{max-width:86ch;color:var(--muted);font-size:19px}.panel{border:1px solid var(--line);background:var(--panel);padding:18px}.thesis{display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin:24px 0}.thesis .question{border-left:6px solid var(--amber);font-size:18px}.thesis .boundary{border-left:6px solid var(--navy)}h2{margin:0 0 10px;font:800 22px/1.05 var(--sans)}.axis-shell{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,.8fr);gap:14px}.axis{position:relative;min-height:420px;border:1px solid var(--line);background:linear-gradient(90deg,#e8eee5 0 50%,#efe1bf 50%),linear-gradient(#e8eee5 0 50%,#ede6dc 50%);overflow:hidden}.axis:before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed var(--line)}.axis:after{content:"";position:absolute;top:50%;left:0;right:0;border-top:1px dashed var(--line)}.xlab,.ylab{position:absolute;z-index:2;font:700 10px var(--mono)}.xlab{left:50%;bottom:8px;transform:translateX(-50%);white-space:nowrap}.ylab{left:8px;top:50%;transform:rotate(-90deg) translateX(-50%);transform-origin:left top;white-space:nowrap}.pin{position:absolute;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--navy);color:white;border:2px solid white;font:800 12px var(--mono);box-shadow:0 3px 10px #0004;transform:translate(-50%,-50%)}.legend{margin:0;padding:0;list-style:none}.legend li{display:grid;grid-template-columns:30px 1fr;gap:5px 8px;padding:10px 0;border-bottom:1px solid var(--line)}.legend li:last-child{border:0}.legend b{font:800 13px var(--sans)}.legend small{color:var(--muted)}.legend span{grid-row:1/3;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--navy);color:#fff;font:800 10px var(--mono)}.note{color:var(--muted);font:10px/1.4 var(--mono)}.section-head{margin:30px 0 12px;padding-bottom:8px;border-bottom:2px solid var(--ink)}.section-head h2{margin:0}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{display:flex;flex-direction:column;border:1px solid var(--line);background:var(--panel)}.card header{display:grid;grid-template-columns:34px 1fr;gap:8px;padding:12px;background:#eee5d4;border-bottom:1px solid var(--line)}.card header>span{color:var(--amber);font:800 17px var(--mono)}.card h3{margin:0;font:800 15px/1.15 var(--sans)}.card header p{margin:4px 0 0;color:var(--muted);font:10px var(--mono)}.claims,.limits{margin:0;padding:10px 26px}.claim{margin:0 0 10px}.claim p{margin:4px 0}.badge{display:inline-block;border:1px solid var(--line);padding:2px 6px;font:800 9px var(--mono);text-transform:uppercase}.limits{border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.card footer{margin-top:auto;padding:10px 12px;border-top:1px solid var(--line)}.decisive{font-size:12px}.translate{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.translate dl{margin:0}.translate div{padding:8px 0;border-bottom:1px solid var(--line)}.translate dt{font:800 11px var(--mono)}.translate dd{margin:3px 0;color:var(--muted)}.cta{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:22px;border:2px solid var(--navy);background:var(--panel);padding:16px}.cta p{margin:4px 0 0;color:var(--muted)}.cta a{flex:0 0 auto;background:var(--navy);color:#fff;padding:10px 13px;text-decoration:none;font:800 10px var(--mono);letter-spacing:.08em;text-transform:uppercase}.sources{width:100%;border-collapse:collapse;background:var(--panel);font:10px/1.4 var(--mono)}.sources th,.sources td{border:1px solid var(--line);padding:7px;text-align:left;vertical-align:top}.sources th{background:#eee5d4;text-transform:uppercase}.sources td:first-child{font-weight:800}.foot{margin-top:18px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);font:9px/1.45 var(--mono)}@media(max-width:900px){.page{padding:22px 15px}.thesis,.axis-shell,.translate{grid-template-columns:1fr}.cards{grid-template-columns:1fr}.axis{min-height:360px}.cta{align-items:flex-start;flex-direction:column}}@media print{@page{size:A4 landscape;margin:8mm}html,body{background:#fff}.page{padding:0}.cta{display:none}h1{font-size:34pt}.cards{gap:7px}.sources{font-size:6.8pt}.axis{min-height:330px}}`;
}

export function compileReporterBriefing(spec, caseItem) {
  const errors = validateReporterBriefing(spec, caseItem);
  if (errors.length) throw new Error(errors.join('\n'));
  const claimsById = claimMap(caseItem);
  const receiptsById = receiptMap(caseItem);
  const claimIds = allBriefingClaimIds(spec);
  const claims = claimIds.map(id => claimsById.get(id));
  const receipts = publicReceiptsForClaims(claims, receiptsById);
  const publicReceipts = receipts.filter(receipt => receipt.url);
  const proposition = claimsById.get(spec.working_proposition.claim_id);
  const boundary = claimsById.get(spec.boundary.claim_id);
  const recordsTarget = claimsById.get(spec.records_target.claim_id);
  const threadRecords = spec.threads.map((thread, index) => {
    const threadClaims = thread.claim_ids.map(id => claimsById.get(id));
    const threadReceipts = publicReceiptsForClaims(threadClaims, receiptsById);
    return {
      ...thread,
      number: thread.number || String(index + 1).padStart(2, '0'),
      claims: threadClaims,
      receipts: threadReceipts,
      limits: unique(threadClaims.map(claim => claim.qualification)),
      ...statusSummary(threadClaims)
    };
  });
  const caseSummary = statusSummary(claims);
  const sourceRows = sourceIndexMarkup(receipts);
  const axisPins = threadRecords.map(thread => `<span class="pin" style="left:${thread.x}%;top:${100 - thread.y}%" title="${escapeAttribute(thread.title)}">${escapeHtml(thread.number)}</span>`).join('');
  const legend = threadRecords.map(thread => `<li><span>${escapeHtml(thread.number)}</span><b>${escapeHtml(thread.title)}</b><small>${escapeHtml(thread.subtitle)}</small></li>`).join('');
  const cards = threadRecords.map(thread => `<article class="card" id="thread-${escapeAttribute(thread.id)}"><header><span>${escapeHtml(thread.number)}</span><div><h3>${escapeHtml(thread.title)}</h3><p>${escapeHtml(thread.subtitle)}</p></div></header><ol class="claims">${thread.claims.map(claimMarkup).join('')}</ol><div class="limits"><strong>What this does not prove</strong><ul>${limitsMarkup(thread.claims)}</ul></div><footer><div class="label">Document that decides the stronger question</div><p class="decisive">${escapeHtml(thread.decisive_record)}</p></footer></article>`).join('');
  const translations = (spec.translations ?? []).map(item => `<div><dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.question)}</dd></div>`).join('');
  const publicationBoundary = `${caseItem.boundary} ${caseItem.disclaimer}`;
  const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="color-scheme" content="light dark">\n<meta name="clifford-briefing-schema" content="${REPORTER_BRIEFING_SCHEMA_VERSION}">\n<meta name="clifford-briefing-version" content="${escapeAttribute(spec.publication.version)}">\n<title>${escapeHtml(spec.title)}</title>\n<style>\n${renderStyles()}\n</style>\n</head>\n<body data-briefing-id="${escapeAttribute(spec.briefing_id)}" data-graph-effect="none">\n<main class="page">\n<div class="kicker">Reporter briefing · public records · as known ${escapeHtml(spec.as_of)}</div>\n<h1>${escapeHtml(spec.title)}</h1>\n<p class="dek">${escapeHtml(spec.dek)}</p>\n<section class="thesis">\n<div class="panel question"><div class="label">Working proposition · ${escapeHtml(proposition.claim_status.replaceAll('_', ' '))}</div><p><strong>${escapeHtml(proposition.plain)}</strong></p><p class="note">${escapeHtml(proposition.qualification)}</p></div>\n<div class="panel boundary"><div class="label">Evidence boundary</div><p>${escapeHtml(boundary.plain)}</p><p class="note">${escapeHtml(boundary.qualification)}</p></div>\n</section>\n<section class="axis-shell">\n<div class="axis" role="img" aria-label="${escapeAttribute(spec.axis_alt)}">\n<div class="xlab">${escapeHtml(spec.axes[0].low_label)} ← ${escapeHtml(spec.axes[0].label)} → ${escapeHtml(spec.axes[0].high_label)}</div>\n<div class="ylab">${escapeHtml(spec.axes[1].low_label)} ← ${escapeHtml(spec.axes[1].label)} → ${escapeHtml(spec.axes[1].high_label)}</div>\n${axisPins}\n</div>\n<div class="panel"><div class="label">Case key</div><ol class="legend">${legend}</ol><p class="note">Placement is editorial orientation, not a score or finding. The evidence case carries the exact claims, dates, receipts, and typed limits.</p></div>\n</section>\n<div class="section-head"><h2>${threadRecords.length} records threads</h2></div>\n<section class="cards">${cards}</section>\n<section class="translate">\n<div class="panel"><div class="label">Bypass the jargon</div><h2>Translate the claim into an ordinary records question.</h2><dl>${translations}</dl></div>\n<div class="panel"><div class="label">Records roadmap</div><h2>What would prove or defeat the stronger theory?</h2><p>${escapeHtml(recordsTarget.plain)}</p><p class="note">${escapeHtml(recordsTarget.qualification)}</p></div>\n</section>\n<section class="cta"><div><div class="label">Claim-level evidence</div><h2>Open the full case.</h2><p>Every factual sentence resolves to its claim status, date, qualification, and public receipt.</p></div><a href="${escapeAttribute(spec.case_href)}">Open evidence case</a></section>\n<div class="section-head"><h2>Public source index</h2></div>\n<table class="sources"><thead><tr><th>ID</th><th>Publisher</th><th>Receipt</th><th>Boundary</th></tr></thead><tbody>${sourceRows}</tbody></table>\n<p class="foot">${escapeHtml(publicationBoundary)} Publication state: ${escapeHtml(spec.publication.status)} · version ${escapeHtml(spec.publication.version)} · ${publicReceipts.length} public source links · graph effect: none. Corrections: ${escapeHtml(spec.publication.correction_route)}</p>\n</main>\n</body>\n</html>\n`;
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
    counts: {
      threads: threadRecords.length,
      claims: claims.length,
      verified_claims: caseSummary.counts.verified,
      review_required_claims: caseSummary.counts.review_required,
      receipts: receipts.length,
      public_receipts: publicReceipts.length,
      translations: spec.translations?.length ?? 0
    },
    claim_ids: claimIds,
    verified_claim_ids: claims.filter(claim => claim.claim_status === 'verified').map(claim => claim.claim_id),
    review_required_claim_ids: claims.filter(claim => claim.claim_status === 'review_required').map(claim => claim.claim_id),
    receipt_ids: receipts.map(receipt => receipt.receipt_id),
    public_receipt_ids: publicReceipts.map(receipt => receipt.receipt_id),
    threads: threadRecords.map(thread => ({
      id: thread.id,
      number: thread.number,
      title: thread.title,
      claim_ids: thread.claim_ids,
      receipt_ids: thread.receipts.map(receipt => receipt.receipt_id),
      status: thread.status,
      status_counts: thread.counts,
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
  const reasons = [];
  if (manifest.publication.status !== 'approved') reasons.push(`publication_status_${manifest.publication.status}`);
  if (manifest.counts.review_required_claims > 0) reasons.push(`${manifest.counts.review_required_claims}_claims_review_required`);
  if (!manifest.publication.reviewer) reasons.push('independent_reviewer_missing');
  if (!manifest.publication.reviewed_at) reasons.push('review_date_missing');
  return {
    briefing_id: manifest.briefing_id,
    case_id: manifest.case_id,
    title: manifest.title,
    version: manifest.publication.version,
    publication_status: manifest.publication.status,
    reviewer: manifest.publication.reviewer ?? null,
    reviewed_at: manifest.publication.reviewed_at ?? null,
    blocking_reasons: reasons,
    eligible_for_approval: reasons.length === 0,
    graph_effect: 'none'
  };
}
