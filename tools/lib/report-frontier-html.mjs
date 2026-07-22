const LABELS = {
  intake_or_projection: 'Intake or legacy projection',
  case_ledger: 'Typed case ledger',
  structured_report: 'Structured report',
  independent_review: 'Independent review',
  approved_publication: 'Approved publication',
  correction_and_version_maintenance: 'Correction and version maintenance',
  case_ledger_migration: 'Case-ledger migration',
  evidence_upgrade: 'Evidence upgrade',
  structured_report_specification: 'Structured-report specification',
  bounded_search_and_claim_review: 'Bounded search and claim review',
  case_ledger_promotion: 'Case-ledger promotion'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const label = value => LABELS[value] ?? String(value ?? '').replaceAll('_', ' ');
const blockers = values => values?.length
  ? `<ul>${values.map(value => `<li>${escapeHtml(String(value).replaceAll('_', ' '))}</li>`).join('')}</ul>`
  : '<span class="clear">No recorded blocker</span>';

function caseRows(frontier) {
  return frontier.cases.map(item => `
<tr data-case-id="${escapeHtml(item.case_id)}" data-current-stage="${escapeHtml(item.current_stage)}">
<th><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.case_id)}</small><div class="links">${item.report_id ? `<a class="primary" href="../briefs/${escapeHtml(item.report_id)}.html">Open report</a>` : ''}<a href="../#case/${escapeHtml(item.case_id)}">Open case</a></div></th>
<td>${escapeHtml(item.case_state === 'case_ledger' ? 'Case ledger' : 'Legacy projection')}</td>
<td><strong>${escapeHtml(label(item.current_stage))}</strong><small>${escapeHtml(item.report_state === 'not_declared' ? 'No report declared' : `${item.report_state} · v${item.report_version}`)}</small></td>
<td><strong>${escapeHtml(label(item.next_transition))}</strong></td>
<td><b>${item.claims.total}</b><small>${item.claims.verified} verified · ${item.claims.review_required} review required</small></td>
<td><b>${item.receipts}</b><small>${item.trails} case trails · ${item.source_trails_linked_to_report} report-linked</small></td>
<td>${blockers(item.blockers)}</td>
</tr>`).join('');
}

function trailPrograms(frontier) {
  return frontier.trail_programs.map(program => `
<article data-program-id="${escapeHtml(program.program_id)}">
<header><div><span class="eyebrow">${program.kind === 'case_trails' ? 'Case trails' : 'Intake trails'}</span><h3>${escapeHtml(program.case_id ?? program.program_id.replace(/^intake:/, ''))}</h3></div><strong>${escapeHtml(label(program.current_stage))} → ${escapeHtml(label(program.next_transition))}</strong></header>
<div class="metrics"><span><b>${program.totals.trails ?? 0}</b> trails</span><span><b>${program.totals.terminal ?? program.totals.frontier_terminal ?? 0}</b> terminal</span><span><b>${program.totals.non_terminal ?? program.totals.frontier_non_terminal ?? 0}</b> open</span><span><b>${program.totals.linked_to_report_workplan ?? 0}</b> report-linked</span></div>
<p>${escapeHtml(program.boundary)}</p>${blockers(program.blockers)}
${program.trails?.length ? `<details><summary>Open case trails</summary><ul class="trail-list">${program.trails.map(trail => `<li data-trail-id="${escapeHtml(trail.trail_id)}"><strong>${escapeHtml(trail.label)}</strong><span>${escapeHtml(label(trail.status))}</span><span>${trail.linked_to_report_workplan ? 'Linked to workplan' : 'Not report-linked'}</span><span>${escapeHtml(label(trail.next_transition))}</span></li>`).join('')}</ul></details>` : ''}
</article>`).join('');
}

export function renderReportFrontierHtml(frontier) {
  const stageCards = frontier.transition_order.map((stage, index) => `<div class="stage ${stage === frontier.waterline.stage ? 'active' : ''}" data-stage="${escapeHtml(stage)}"><small>${String(index + 1).padStart(2, '0')}</small><strong>${escapeHtml(label(stage))}</strong><b>${frontier.cases.filter(item => item.current_stage === stage).length}</b><span>cases</span></div>`).join('');
  const boundaries = frontier.boundaries.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clifford Number report waterline</title><style>
:root{--paper:#f5f0e5;--panel:#fffdf7;--ink:#181714;--muted:#5b574f;--line:#c9bea5;--accent:#9a6a12;--navy:#152739;--red:#8b3f38;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--sans:Arial,Helvetica,sans-serif;--serif:Georgia,"Times New Roman",serif}*{box-sizing:border-box}html{background:#d8d1c4}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 var(--serif)}a{color:inherit}.page{width:min(1500px,100%);margin:auto;padding:32px}.top,.section-head,article header{display:flex;justify-content:space-between;gap:20px}.brand,.eyebrow{font:800 10px var(--mono);letter-spacing:.12em;text-transform:uppercase}.eyebrow{color:var(--accent)}h1{max-width:14ch;margin:20px 0 12px;font:800 clamp(42px,7vw,84px)/.93 var(--sans);letter-spacing:-.05em}.dek{max-width:88ch;color:var(--muted);font-size:19px}.waterline{min-width:300px;border:2px solid var(--navy);background:var(--panel);padding:16px}.waterline strong,.waterline b,.waterline small{display:block}.waterline strong{font:800 24px var(--sans)}.waterline b{margin:8px 0;color:var(--accent);font:800 16px var(--mono)}.section-head{align-items:end;margin:30px 0 12px;border-bottom:2px solid var(--ink)}.section-head h2{margin:3px 0 9px;font:800 26px var(--sans)}.section-head p{max-width:64ch;color:var(--muted)}.pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.stage{border:1px solid var(--line);background:var(--panel);padding:14px}.stage.active{border:3px solid var(--navy)}.stage small,.stage strong,.stage b,.stage span{display:block}.stage strong{min-height:48px;margin-top:12px;font:800 16px var(--sans)}.stage b{font:800 32px var(--mono)}.table-wrap{overflow:auto;border:1px solid var(--line)}table{width:100%;border-collapse:collapse;background:var(--panel)}th,td{border:1px solid var(--line);padding:10px;text-align:left;vertical-align:top}thead th{background:#eee5d4;font:800 9px var(--mono);text-transform:uppercase}tbody th{min-width:245px}th strong,td strong{display:block;font:800 13px var(--sans)}small{display:block;color:var(--muted)}td b{font:800 19px var(--mono)}.links{display:flex;gap:6px;margin-top:8px}.links a{border:1px solid var(--navy);padding:4px 6px;text-decoration:none;font:800 9px var(--mono);text-transform:uppercase}.links .primary{background:var(--navy);color:#fff}td ul,article>ul{margin:0;padding-left:18px;color:var(--red);font:10px/1.5 var(--mono)}.clear{font:800 10px var(--mono)}.programs{display:grid;grid-template-columns:1fr 1fr;gap:12px}.programs article{border:1px solid var(--line);background:var(--panel);padding:15px}.programs h3{margin:3px 0;font:800 19px var(--sans)}.programs header>strong{font:800 10px var(--mono);text-align:right}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0}.metrics span{border:1px solid var(--line);padding:7px;font:10px var(--mono)}.metrics b{display:block;font-size:20px}.programs p{border-left:4px solid var(--navy);padding-left:9px;color:var(--muted);font-size:13px}summary{cursor:pointer;font:800 10px var(--mono);text-transform:uppercase}.trail-list{margin:8px 0 0;padding:0;list-style:none}.trail-list li{display:grid;grid-template-columns:1.5fr .7fr .8fr 1fr;gap:7px;border-top:1px solid var(--line);padding:8px 0;font-size:11px}.boundaries{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0;list-style:none}.boundaries li{border:1px solid var(--line);background:var(--panel);padding:11px}.foot{margin-top:22px;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font:10px var(--mono)}@media(max-width:900px){.page{padding:20px 12px}.top,.section-head,article header{display:block}.waterline{min-width:0;margin-top:18px}.pipeline,.programs,.boundaries{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.trail-list li{grid-template-columns:1fr}}
</style></head><body data-report-frontier-schema="${escapeHtml(frontier.schema_version)}" data-graph-effect="none" data-conclusion-generated="false"><main class="page">
<div class="top"><div><a class="brand" href="../">CN · public instrument</a><div class="eyebrow" style="margin-top:26px">Publication transitions · as known ${escapeHtml(frontier.as_of)}</div><h1>The report waterline</h1><p class="dek">Cases, reports, reviews, and bounded searches shown at their current transition. This surface exposes what the project can do next without scoring subjects or generating a narrative conclusion.</p></div><aside class="waterline"><span class="eyebrow">Highest demonstrated transition</span><strong>${escapeHtml(label(frontier.waterline.stage))}</strong><b>→ ${escapeHtml(label(frontier.waterline.next_transition))}</b><small>${escapeHtml(frontier.waterline.definition)}</small></aside></div>
<div class="section-head"><div><span class="eyebrow">Transition order</span><h2>No case skips a custody boundary</h2></div><p>The highlighted stage is the project capability waterline. Counts describe artifact state, not relative merit.</p></div><section class="pipeline">${stageCards}</section>
<div class="section-head"><div><span class="eyebrow">Case frontier</span><h2>Current state and next allowed transition</h2></div><p>Blockers are refusal reasons. They do not imply that a stronger theory is true.</p></div><div class="table-wrap"><table><thead><tr><th>Case</th><th>Custody</th><th>Current</th><th>Next</th><th>Claims</th><th>Receipts / trails</th><th>Blockers</th></tr></thead><tbody>${caseRows(frontier)}</tbody></table></div>
<div class="section-head"><div><span class="eyebrow">Bounded searches</span><h2>Trails below and across the waterline</h2></div><p>Case trails may feed a report workplan. Intake trails must first enter a typed, receipted case.</p></div><section class="programs">${trailPrograms(frontier)}</section>
<div class="section-head"><div><span class="eyebrow">Boundaries</span><h2>What this surface cannot mean</h2></div><p>The frontier organizes transitions. It does not score evidence, subjects, importance, or outcome.</p></div><ul class="boundaries">${boundaries}</ul>
<p class="foot">Schema ${escapeHtml(frontier.schema_version)} · graph effect none · conclusion generated false · waterline ${escapeHtml(frontier.waterline.stage)} · next ${escapeHtml(frontier.waterline.next_transition)}.</p>
</main></body></html>`;
}
