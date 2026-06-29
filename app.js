const state = {};
const $ = sel => document.querySelector(sel);

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`failed to load ${path}`);
  return res.json();
}

function norm(s) { return String(s || '').toLowerCase(); }
function labelActor(id) { return state.actors.get(id)?.label || id; }
function labelOrg(id) { return state.orgs.get(id)?.label || id; }
function surface(id) { return state.surfaces.get(id); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function init() {
  const [surfaceGraph, hopGraph, scores, scout] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] }))
  ]);
  state.surfaceGraph = surfaceGraph;
  state.hopGraph = hopGraph;
  state.scores = scores;
  state.scout = scout;
  state.actors = new Map(surfaceGraph.actors.map(a => [a.id, a]));
  state.orgs = new Map(surfaceGraph.organizations.map(o => [o.id, o]));
  state.surfaces = new Map(surfaceGraph.surfaces.map(s => [s.surface_id, s]));
  state.aliasesByKey = new Map();
  for (const alias of surfaceGraph.aliases ?? []) {
    const key = `${alias.kind}:${alias.canonical_id}`;
    if (!state.aliasesByKey.has(key)) state.aliasesByKey.set(key, []);
    state.aliasesByKey.get(key).push(alias.alias);
  }
  state.actorScores = new Map(scores.actors.map(a => [a.actor_id, a]));
  state.orgScores = new Map(scores.organizations.map(o => [o.organization_id, o]));
  state.chains = new Map((scores.chains ?? []).map(c => [c.chain_id, c]));
  renderHome();
  $('#search').addEventListener('input', onSearch);
}

function renderHome() {
  $('#summary').innerHTML = `
    <div class="panel"><div class="metric">${state.surfaceGraph.surfaces.length}</div><div class="metric-label">bounded surfaces</div></div>
    <div class="panel"><div class="metric">${state.hopGraph.edges.length}</div><div class="metric-label">surface-derived actor hops</div></div>
    <div class="panel"><div class="metric">${state.scores.actors.length}</div><div class="metric-label">actors scored</div></div>
    <div class="panel"><div class="metric">${state.chains.size}</div><div class="metric-label">laundering chains</div></div>
  `;
  const chainList = [...state.chains.values()]
    .sort((a, b) => b.machine_score - a.machine_score)
    .map(c => `<button class="result" data-kind="chain" data-id="${c.chain_id}">${esc(c.chain_label)}<small>chain · score ${c.laundering_chain_score}/${c.laundering_chain_max}</small></button>`)
    .join('');
  $('#detail').innerHTML = `
    <div class="panel"><h2>Two readings, both true</h2>
      <p><strong>The Clifford Number</strong> is computed only from Actor ↔ Actor co-participation on bounded surfaces. Broad institutions, offices, agencies, policy areas, directory listings, and generic organizations do not create hops by themselves.</p>
      <p><strong>Laundering chains and surface-type recurrence</strong> capture what the hop cannot: outcomes that flow from policy creation to procurement to personnel to commercialization without any two people sharing a surface. A high chain or machine score with <em>no</em> Clifford hop is structural position, not guilt by association.</p>
    </div>
    <div class="panel"><h3>Laundering chains</h3><div class="results">${chainList || '<p>None.</p>'}</div></div>`;
  bindResults();
}

function onSearch(e) {
  const q = norm(e.target.value).trim();
  const results = [];
  if (q.length >= 2) {
    for (const a of state.surfaceGraph.actors) {
      const aliases = state.aliasesByKey.get(`actor:${a.id}`) ?? [];
      if (norm(a.label).includes(q) || norm(a.id).includes(q) || aliases.some(alias => norm(alias).includes(q))) {
        results.push({ kind: 'actor', id: a.id, label: a.label });
      }
    }
    for (const o of state.surfaceGraph.organizations) {
      const aliases = state.aliasesByKey.get(`organization:${o.id}`) ?? [];
      if (norm(o.label).includes(q) || norm(o.id).includes(q) || aliases.some(alias => norm(alias).includes(q))) {
        results.push({ kind: 'organization', id: o.id, label: o.label });
      }
    }
    for (const s of state.surfaceGraph.surfaces) if (norm(s.surface_label).includes(q) || norm(s.surface_id).includes(q)) results.push({ kind: 'surface', id: s.surface_id, label: s.surface_label });
    for (const c of state.chains.values()) if (norm(c.chain_label).includes(q) || norm(c.chain_id).includes(q)) results.push({ kind: 'chain', id: c.chain_id, label: c.chain_label });
  }
  $('#results').innerHTML = results.slice(0, 12).map(r => `<button class="result" data-kind="${r.kind}" data-id="${r.id}">${esc(r.label)}<small>${r.kind}</small></button>`).join('');
  for (const btn of document.querySelectorAll('.result')) btn.addEventListener('click', () => renderEntity(btn.dataset.kind, btn.dataset.id));
}

function renderEntity(kind, id) {
  if (kind === 'actor') renderActor(id);
  else if (kind === 'organization') renderOrg(id);
  else if (kind === 'chain') renderChain(id);
  else renderSurface(id);
}

function metricPanel(label, value) { return `<div class="panel"><div class="metric">${esc(value ?? '—')}</div><div class="metric-label">${esc(label)}</div></div>`; }

function renderActor(id) {
  const actor = state.actors.get(id);
  const score = state.actorScores.get(id);
  const path = state.hopGraph.shortest_paths[id];
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', score?.clifford_number ?? 'N/A'),
    metricPanel('Laundering Chain', `${score?.laundering_chain_score ?? 0}/${score?.laundering_chain_max ?? 5}`),
    metricPanel('Machine Score', score?.machine_score ?? 0),
    metricPanel('Surface-Type Recurrence', score?.surface_type_recurrence_score ?? 0),
  ].join('');

  const noHop = path?.number === null || path?.number === undefined;
  const pathHtml = noHop
    ? `<p class="why-no-hop"><strong>Clifford Number: N/A.</strong> ${esc(score?.why_no_hop || 'No valid surface-hop path to Matt Clifford.')}</p>`
    : renderPath(path);

  const recur = score?.surface_type_recurrence ?? {};
  const recurHtml = Object.keys(recur).length
    ? `<div class="panel"><h3>Surface-type recurrence</h3><p class="meta">The same surface logic appearing across unrelated venues. This is a pattern signal, not a hop.</p>${Object.entries(recur).map(([t, sids]) => `<div class="receipts"><span class="badge">${esc(t)}</span> across ${sids.length}: ${sids.map(s => esc(surface(s)?.surface_label || s)).join('; ')}</div>`).join('')}</div>`
    : '';

  const chainsHtml = (score?.chains ?? []).length
    ? `<div class="panel"><h3>Laundering chains</h3><div class="results">${(score.chains).map(cid => { const c = state.chains.get(cid); return `<button class="result" data-kind="chain" data-id="${cid}">${esc(c?.chain_label || cid)}<small>chain · score ${c?.laundering_chain_score}/${c?.laundering_chain_max}</small></button>`; }).join('')}</div></div>`
    : '';

  $('#detail').innerHTML = `
    <div class="panel"><h2>${esc(actor.label)}</h2><div class="badge-row">${(score?.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>
    <div class="panel"><h3>Shortest surface path</h3>${pathHtml}</div>
    ${chainsHtml}
    ${recurHtml}
    <div class="panel"><h3>Bounded surfaces</h3><div class="surface-list">${(score?.surfaces ?? []).map(renderSurfaceCard).join('')}</div></div>
  `;
  bindResults();
}

function bindResults() {
  for (const btn of document.querySelectorAll('#detail .result')) btn.addEventListener('click', () => renderEntity(btn.dataset.kind, btn.dataset.id));
}

function renderChain(id) {
  const c = state.chains.get(id);
  if (!c) return;
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', 'N/A'),
    metricPanel('Laundering Chain', `${c.laundering_chain_score}/${c.laundering_chain_max}`),
    metricPanel('Machine Score', c.machine_score),
    metricPanel('Stages', c.chain_length),
  ].join('');
  const stages = (c.stages ?? []).map(s => `
    <div class="surface-card">
      <h4>${esc(s.order)}. ${esc(s.stage_category.replace(/_/g, ' '))}</h4>
      <div class="meta">${esc(s.surface_label)}${s.actor_id ? ' · ' + esc(labelActor(s.actor_id)) : ''}${s.organization_id ? ' · ' + esc(labelOrg(s.organization_id)) : ''}</div>
      <p>${esc(s.note)}</p>
      <p class="meta">Receipts: ${(s.receipt_ids ?? []).map(esc).join(', ')}</p>
    </div>`).join('<div class="chain-arrow">↓</div>');
  $('#detail').innerHTML = `
    <div class="panel"><h2>${esc(c.chain_label)}</h2><div class="badge-row"><span class="badge">${esc(c.pattern)}</span><span class="badge">evidence: ${esc(c.evidence_class)}</span></div></div>
    <div class="panel why-no-hop"><h3>Why this is not a hop</h3><p>${esc(c.why_no_hop)}</p></div>
    <div class="panel"><h3>Chain stages</h3><div class="surface-list">${stages}</div></div>
  `;
}

function renderPath(path) {
  const chunks = [];
  for (let i = 0; i < path.actor_path.length; i++) {
    chunks.push(`<span class="path-node">${esc(labelActor(path.actor_path[i]))}</span>`);
    const hop = path.hops[i];
    if (hop) chunks.push(`<span class="path-surface">via ${esc(hop.shared_surfaces[0]?.surface_label || hop.shared_surfaces[0]?.surface_id)}</span>`);
  }
  return `<div class="path-chain">${chunks.join('')}</div>` + path.hops.map(h => `<div class="receipts">${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}: ${h.shared_surfaces.map(s => esc(s.surface_label)).join('; ')}</div>`).join('');
}

function renderSurfaceCard(id) {
  const s = surface(id);
  if (!s) return '';
  return `<div class="surface-card"><h4>${esc(s.surface_label)}</h4><div class="meta">${esc(s.surface_type)} · ${s.hop_eligible ? 'hop-eligible' : 'non-hop'} · ${s.status}</div><div class="badge-row">${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes || '')}</p></div>`;
}

function renderOrg(id) {
  const org = state.orgs.get(id);
  const score = state.orgScores.get(id);
  $('#summary').innerHTML = [
    metricPanel('Surface Count', score?.surface_count),
    metricPanel('Factory Score', score?.factory_score),
    metricPanel('Surface Factory', score?.surface_factory ? 'yes' : 'no'),
    metricPanel('Types', score?.surface_types?.length ?? 0),
  ].join('');
  $('#detail').innerHTML = `
    <div class="panel"><h2>${esc(org.label)}</h2><p>${score?.surface_factory ? 'This organization behaves as a surface factory. It must be decomposed into bounded surfaces, not used as a generic hop node.' : 'Organization context. It does not create Clifford hops by itself.'}</p></div>
    <div class="panel"><h3>Surfaces</h3><div class="surface-list">${(score?.surfaces ?? []).map(renderSurfaceCard).join('')}</div></div>
  `;
}

function renderSurface(id) {
  const s = surface(id);
  $('#summary').innerHTML = [
    metricPanel('Hop Eligible', s.hop_eligible ? 'yes' : 'no'),
    metricPanel('Scorable', s.scorable ? 'yes' : 'no'),
    metricPanel('Participants', s.participants?.length ?? 0),
    metricPanel('Type', s.surface_type),
  ].join('');
  const parts = (s.participants ?? []).map(p => `<li>${p.participant_type === 'actor' ? esc(labelActor(p.actor_id)) : esc(labelOrg(p.organization_id))}: ${esc(p.role)} <span class="meta">${esc(p.participation_type)}</span></li>`).join('');
  $('#detail').innerHTML = `
    <div class="panel"><h2>${esc(s.surface_label)}</h2><div class="badge-row"><span class="badge">${esc(s.surface_type)}</span>${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes || '')}</p></div>
    <div class="panel"><h3>Participants</h3><ul>${parts}</ul></div>
    <div class="panel"><h3>Bounded by</h3><p>${(s.bounded_by ?? []).map(esc).join(', ')}</p><p class="meta">Receipts: ${(s.receipt_ids ?? []).map(esc).join(', ')}</p></div>
  `;
}

init().catch(err => {
  console.error(err);
  $('#detail').innerHTML = `<div class="panel"><h2>Load error</h2><p>${esc(err.message)}</p></div>`;
});
