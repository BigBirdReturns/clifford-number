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
  const [surfaceGraph, hopGraph, scores, legacyGraph, scout] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] }))
  ]);
  state.surfaceGraph = surfaceGraph;
  state.hopGraph = hopGraph;
  state.scores = scores;
  state.legacyGraph = legacyGraph;
  state.scout = scout;
  state.actors = new Map(surfaceGraph.actors.map(a => [a.id, a]));
  state.orgs = new Map(surfaceGraph.organizations.map(o => [o.id, o]));
  state.surfaces = new Map(surfaceGraph.surfaces.map(s => [s.surface_id, s]));
  state.candidates = new Map((surfaceGraph.candidates ?? []).map(c => [c.id, c]));
  state.aliasesByKey = new Map();
  for (const alias of surfaceGraph.aliases ?? []) {
    const key = `${alias.kind}:${alias.canonical_id}`;
    if (!state.aliasesByKey.has(key)) state.aliasesByKey.set(key, []);
    state.aliasesByKey.get(key).push(alias.alias);
  }
  state.actorScores = new Map(scores.actors.map(a => [a.actor_id, a]));
  state.orgScores = new Map(scores.organizations.map(o => [o.organization_id, o]));
  state.legacyNodes = new Map((legacyGraph.nodes ?? []).map(n => [n.id, n]));
  state.chains = new Map((scores.chains ?? []).map(c => [c.chain_id, c]));
  const examples = ['ben-warner', 'simon-case', 'matt-clifford'].filter(id => state.actors.has(id));
  $('#try-examples').innerHTML = examples.map(id => `<button data-kind="actor" data-id="${id}">${esc(labelActor(id))}</button>`).join('');
  for (const btn of $('#try-examples').querySelectorAll('button')) btn.addEventListener('click', () => go(btn.dataset.kind, btn.dataset.id));

  $('#search').addEventListener('input', onSearch);
  window.addEventListener('hashchange', route);
  route();
}

function go(kind, id) {
  const target = `#${kind}/${id}`;
  if (location.hash === target) renderEntity(kind, id);
  else location.hash = target;
}

function route() {
  const hash = location.hash.replace(/^#/, '');
  const [kind, id] = hash.split('/');
  if (kind && id) renderEntity(kind, id);
  else renderHome();
}

function renderHome() {
  $('#summary').innerHTML = `
    <div class="panel"><div class="metric">${state.surfaceGraph.surfaces.length}</div><div class="metric-label">bounded surfaces</div></div>
    <div class="panel"><div class="metric">${state.hopGraph.edges.length}</div><div class="metric-label">surface-derived actor hops</div></div>
    <div class="panel"><div class="metric">${state.scores.actors.length}</div><div class="metric-label">actors scored</div></div>
    <div class="panel"><div class="metric">${state.chains.size}</div><div class="metric-label">laundering chains</div></div>
  `;
  const topActors = [...state.actorScores.values()]
    .sort((a, b) => b.machine_score - a.machine_score)
    .slice(0, 8)
    .map(s => `<button class="result" data-kind="actor" data-id="${s.actor_id}"><span class="kind-glyph">A</span><span class="result-label">${esc(labelActor(s.actor_id))}<small>machine score ${Math.round(s.machine_score * 100)}%</small></span></button>`)
    .join('');
  const chainList = [...state.chains.values()]
    .sort((a, b) => b.machine_score - a.machine_score)
    .map(c => `<button class="result" data-kind="chain" data-id="${c.chain_id}"><span class="kind-glyph">C</span><span class="result-label">${esc(c.chain_label)}<small>chain · score ${c.laundering_chain_score}/${c.laundering_chain_max}</small></span></button>`)
    .join('');
  $('#detail').innerHTML = `
    <div class="panel"><h2>Two readings, both true</h2>
      <p><strong>The Clifford Number</strong> is computed only from Actor ↔ Actor co-participation on bounded surfaces. Broad institutions, offices, agencies, policy areas, directory listings, and generic organizations do not create hops by themselves.</p>
      <p><strong>Laundering chains and surface-type recurrence</strong> capture what the hop cannot: outcomes that flow from policy creation to procurement to personnel to commercialization without any two people sharing a surface. A high chain or machine score with <em>no</em> Clifford hop is structural position, not guilt by association.</p>
    </div>
    <div class="panel"><h3>Most structurally embedded actors</h3><div class="results">${topActors || '<p>None.</p>'}</div></div>
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
    for (const c of state.candidates.values()) {
      if (norm(c.label).includes(q) || norm(c.id).includes(q) || (c.aliases ?? []).some(alias => norm(alias).includes(q))) {
        results.push({ kind: 'candidate', id: c.id, label: c.label });
      }
    }
  }
  $('#results').innerHTML = results.slice(0, 12).map(r => `<button class="result" data-kind="${r.kind}" data-id="${r.id}"><span class="kind-glyph">${kindGlyph(r.kind)}</span><span class="result-label">${esc(r.label)}<small>${r.kind}</small></span></button>`).join('');
  for (const btn of $('#results').querySelectorAll('.result')) btn.addEventListener('click', () => go(btn.dataset.kind, btn.dataset.id));
}

function kindGlyph(kind) {
  return { actor: 'A', organization: 'O', surface: 'S', chain: 'C', candidate: '?' }[kind] || '•';
}

function renderEntity(kind, id) {
  if (kind === 'actor') renderActor(id);
  else if (kind === 'organization') renderOrg(id);
  else if (kind === 'chain') renderChain(id);
  else if (kind === 'candidate') renderCandidate(id);
  else renderSurface(id);
}

function metricPanel(label, value) { return `<div class="panel"><div class="metric">${esc(value ?? '—')}</div><div class="metric-label">${esc(label)}</div></div>`; }

function metricPanelRatio(label, value, max) {
  if (value == null) return metricPanel(label, 'N/A');
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `<div class="panel"><div class="metric">${pct}%</div><div class="metric-bar"><div class="metric-bar-fill" style="width:${pct}%"></div></div><div class="metric-label">${esc(label)} · relative to most embedded entity</div></div>`;
}

function legacyIsTopology(edge) {
  return edge?.topology === true
    || edge?.topology_only === true
    || edge?.type === 'topology'
    || edge?.type === 'umbrella-membership'
    || edge?.status === 'topology'
    || edge?.status === 'topology-membership';
}

function legacyShortestPath(startId, targetId = state.legacyGraph?.target_node_id) {
  if (!startId || !targetId || startId === targetId) return null;
  const nodes = state.legacyNodes;
  if (!nodes?.has(startId) || !nodes.has(targetId)) return null;
  const adjacency = new Map();
  for (const edge of state.legacyGraph.edges ?? []) {
    if (legacyIsTopology(edge)) continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from).push({ from: edge.from, to: edge.to, edge, reversed: false });
    adjacency.get(edge.to).push({ from: edge.to, to: edge.from, edge, reversed: true });
  }
  const queue = [{ id: startId, hops: [] }];
  const seen = new Set([startId]);
  while (queue.length) {
    const current = queue.shift();
    if (current.hops.length >= 12) continue;
    for (const hop of adjacency.get(current.id) ?? []) {
      if (seen.has(hop.to)) continue;
      const hops = [...current.hops, hop];
      if (hop.to === targetId) return { number: hops.length, hops, node_ids: [startId, ...hops.map(h => h.to)] };
      seen.add(hop.to);
      queue.push({ id: hop.to, hops });
    }
  }
  return null;
}

function renderLegacyPath(path) {
  if (!path) return '<p class="why-no-hop"><strong>Legacy edge graph: no path found.</strong></p>';
  const steps = [`<div class="path-step"><span class="path-node">${esc(state.legacyNodes.get(path.node_ids[0])?.label ?? path.node_ids[0])}</span></div>`];
  for (const h of path.hops) {
    steps.push(`<div class="path-step path-connector"><span class="path-surface">${esc(h.edge.type || 'edge')} · ${esc(h.edge.evidence_class || 'unknown')}</span></div>`);
    steps.push(`<div class="path-step"><span class="path-node">${esc(state.legacyNodes.get(h.to)?.label ?? h.to)}</span></div>`);
  }
  return `<div class="path-timeline">${steps.join('')}</div>`
    + path.hops.map(h => `<div class="receipts">${esc(state.legacyNodes.get(h.from)?.label ?? h.from)} ↔ ${esc(state.legacyNodes.get(h.to)?.label ?? h.to)}: ${esc(h.edge.type || 'edge')} · ${esc(h.edge.evidence_class || 'unknown')}</div>`).join('');
}

function renderActor(id) {
  const actor = state.actors.get(id);
  const score = state.actorScores.get(id);
  const path = state.hopGraph.shortest_paths[id];
  const legacyNode = state.legacyNodes.get(id);
  const legacyPath = !score && legacyNode ? legacyShortestPath(id) : null;
  if (!score && legacyNode) {
    const related = (state.legacyGraph.edges ?? []).filter(edge => edge.from === id || edge.to === id).slice(0, 10);
    $('#summary').innerHTML = [
      metricPanel('Legacy Edge Number', legacyPath?.number ?? 'N/A'),
      metricPanel('Surface-Hop Number', 'N/A'),
      metricPanelRatio('Machine Score', 0, 1),
      metricPanel('Source', 'legacy graph'),
    ].join('');
    $('#detail').innerHTML = `
      <div class="panel"><h2>${esc(actor.label)}</h2><p>${esc(legacyNode.description || 'Legacy graph node imported for search continuity.')}</p><div class="badge-row">${(legacyNode.tags ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>
      <div class="panel why-no-hop"><h3>Surface-hop status</h3><p>This actor is search-visible through the legacy edge graph bridge, but has not yet been promoted into bounded surface-hop ledgers. The path below is legacy edge-graph context, not a newly manufactured surface hop.</p></div>
      <div class="panel"><h3>Legacy edge-graph path</h3>${renderLegacyPath(legacyPath)}</div>
      <div class="panel"><h3>Legacy public edges</h3>${related.length ? related.map(edge => `<div class="receipts">${esc(state.legacyNodes.get(edge.from)?.label ?? edge.from)} → ${esc(state.legacyNodes.get(edge.to)?.label ?? edge.to)}: ${esc(edge.claim || edge.type || edge.id)}</div>`).join('') : '<p>None.</p>'}</div>
    `;
    return;
  }
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', score?.clifford_number ?? 'N/A'),
    metricPanel('Laundering Chain', `${score?.laundering_chain_score ?? 0}/${score?.laundering_chain_max ?? 5}`),
    metricPanelRatio('Machine Score', score?.machine_score ?? 0, 1),
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
    ? `<div class="panel"><h3>Laundering chains</h3><div class="results">${(score.chains).map(cid => { const c = state.chains.get(cid); return `<button class="result" data-kind="chain" data-id="${cid}"><span class="kind-glyph">C</span><span class="result-label">${esc(c?.chain_label || cid)}<small>chain · score ${c?.laundering_chain_score}/${c?.laundering_chain_max}</small></span></button>`; }).join('')}</div></div>`
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
  for (const btn of document.querySelectorAll('#detail .result')) btn.addEventListener('click', () => go(btn.dataset.kind, btn.dataset.id));
}

function renderChain(id) {
  const c = state.chains.get(id);
  if (!c) return;
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', 'N/A'),
    metricPanel('Laundering Chain', `${c.laundering_chain_score}/${c.laundering_chain_max}`),
    metricPanelRatio('Machine Score', c.machine_score, 1),
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
  const steps = [];
  for (let i = 0; i < path.actor_path.length; i++) {
    steps.push(`<div class="path-step"><span class="path-node">${esc(labelActor(path.actor_path[i]))}</span></div>`);
    const hop = path.hops[i];
    if (hop) steps.push(`<div class="path-step path-connector"><span class="path-surface">via ${esc(hop.shared_surfaces[0]?.surface_label || hop.shared_surfaces[0]?.surface_id)}</span></div>`);
  }
  return `<div class="path-timeline">${steps.join('')}</div>` + path.hops.map(h => `<div class="receipts">${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}: ${h.shared_surfaces.map(s => esc(s.surface_label)).join('; ')}</div>`).join('');
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

function humanLabel(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function renderCandidate(id) {
  const candidate = state.candidates.get(id);
  if (!candidate) return;
  $('#summary').innerHTML = [
    metricPanel('Status', humanLabel(candidate.status ?? 'intake only')),
    metricPanel('Kind', humanLabel(candidate.kind ?? 'candidate')),
    metricPanel('Clifford Number', 'N/A'),
    metricPanel('Graph Effect', 'None'),
  ].join('');
  $('#detail').innerHTML = `
    <div class="panel"><h2>${esc(candidate.label)}</h2><div class="badge-row"><span class="badge">intake candidate</span><span class="badge">${esc(candidate.kind)}</span></div></div>
    <div class="panel why-no-hop"><h3>Not a graph claim yet</h3><p>${esc(candidate.why_visible || 'Visible for intake only. This is not a Clifford hop, score, or relationship claim.')}</p></div>
    <div class="panel"><h3>Promotion path</h3><p>${esc(candidate.next_step || 'Promote only after a bounded public surface and receipt are available.')}</p><p class="meta">Source to review: ${candidate.source_url ? `<a href="${esc(candidate.source_url)}" target="_blank" rel="noreferrer">${esc(candidate.source_url)}</a>` : 'none'}</p></div>
    ${(candidate.aliases ?? []).length ? `<div class="panel"><h3>Search aliases</h3><p>${candidate.aliases.map(esc).join(', ')}</p></div>` : ''}
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
