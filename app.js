const state = {};
const $ = sel => document.querySelector(sel);

function initTheme() {
  const stored = localStorage.getItem('theme');
  const dark = stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches);
  setTheme(dark ? 'dark' : 'light');
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('theme', t);
  $('#theme-toggle').textContent = t === 'dark' ? 'Light' : 'Dark';
}

function copyLink() {
  navigator.clipboard.writeText(location.href).then(() => {
    const btn = $('.copy-link');
    if (!btn) return;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy link'; btn.classList.remove('copied'); }, 1800);
  });
}

function entityHeading(label) {
  return `<div class="entity-heading"><h2>${esc(label)}</h2><button class="copy-link" onclick="copyLink()">Copy link</button></div>`;
}

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
  const [surfaceGraph, hopGraph, scores, legacyGraph, scout, receiptGraph] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] }))
  ]);
  state.surfaceGraph = surfaceGraph;
  state.hopGraph = hopGraph;
  state.scores = scores;
  state.legacyGraph = legacyGraph;
  state.scout = scout;
  state.receipts = new Map((receiptGraph.receipts ?? []).map(r => [r.receipt_id, r]));
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

  for (const btn of document.querySelectorAll('.tabs .tab')) {
    btn.addEventListener('click', () => {
      if (btn.dataset.view === 'desk') { if (!location.hash.startsWith('#desk')) location.hash = '#desk'; else showView('desk'); }
      else { location.hash = ''; }
    });
  }
  initDesk();

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !$('#view-desk').hidden) return;
    if (e.key === '/' && document.activeElement !== $('#search')) {
      e.preventDefault();
      $('#search').focus();
      $('#search').select();
    } else if (e.key === 'Escape') {
      $('#search').value = '';
      $('#results').innerHTML = '';
      if (location.hash) { location.hash = ''; } else { renderHome(); }
    }
  });

  initTheme();
  route();
}

function go(kind, id) {
  const target = `#${kind}/${id}`;
  if (location.hash === target) renderEntity(kind, id);
  else location.hash = target;
  if (window.innerWidth < 820) $('#summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.copyLink = copyLink;

function showView(view) {
  $('#view-map').hidden = view !== 'map';
  $('#view-desk').hidden = view !== 'desk';
  for (const btn of document.querySelectorAll('.tabs .tab')) btn.classList.toggle('active', btn.dataset.view === view);
}

function route() {
  const hash = location.hash.replace(/^#/, '');
  if (hash === 'desk' || hash.startsWith('desk/')) {
    showView('desk');
    if (state.deskSkipRoute) return;
    const [, from, to, asOf] = hash.split('/');
    if (from) {
      $('#desk-from').value = labelActor(decodeURIComponent(from));
      $('#desk-to').value = to ? labelActor(decodeURIComponent(to)) : '';
      $('#desk-asof').value = asOf ? decodeURIComponent(asOf) : '';
      runDeskCheck({ updateHash: false });
    }
    return;
  }
  showView('map');
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
      <div class="panel">${entityHeading(actor.label)}<p>${esc(legacyNode.description || 'Legacy graph node imported for search continuity.')}</p><div class="badge-row">${(legacyNode.tags ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>
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
    <div class="panel">${entityHeading(actor.label)}<div class="badge-row">${(score?.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>
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
    <div class="panel">${entityHeading(c.chain_label)}<div class="badge-row"><span class="badge">${esc(c.pattern)}</span><span class="badge">evidence: ${esc(c.evidence_class)}</span></div></div>
    <div class="panel why-no-hop"><h3>Why this is not a hop</h3><p>${esc(c.why_no_hop)}</p></div>
    <div class="panel"><h3>Chain stages</h3><div class="surface-list">${stages}</div></div>
  `;
}

function hopWindow(basis) {
  if (!basis || basis.temporal_status === 'undated' || (!basis.valid_from && !basis.valid_until)) return '';
  return ` [${basis.valid_from ?? '…'} → ${basis.valid_until ?? 'ongoing'}]`;
}

function renderPath(path) {
  const steps = [];
  for (let i = 0; i < path.actor_path.length; i++) {
    steps.push(`<div class="path-step"><span class="path-node">${esc(labelActor(path.actor_path[i]))}</span></div>`);
    const hop = path.hops[i];
    if (hop) {
      const basis = hop.shared_surfaces[0];
      steps.push(`<div class="path-step path-connector"><span class="path-surface">via ${esc(basis?.surface_label || basis?.surface_id)}${esc(hopWindow(basis))}</span></div>`);
    }
  }
  return `<div class="path-timeline">${steps.join('')}</div>` + path.hops.map(h => `<div class="receipts">${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}: ${h.shared_surfaces.map(s => esc(s.surface_label) + esc(hopWindow(s))).join('; ')}</div>`).join('');
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
    <div class="panel">${entityHeading(org.label)}<p>${score?.surface_factory ? 'This organization behaves as a surface factory. It must be decomposed into bounded surfaces, not used as a generic hop node.' : 'Organization context. It does not create Clifford hops by itself.'}</p></div>
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
    <div class="panel">${entityHeading(candidate.label)}<div class="badge-row"><span class="badge">intake candidate</span><span class="badge">${esc(candidate.kind)}</span></div></div>
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
    <div class="panel">${entityHeading(s.surface_label)}<div class="badge-row"><span class="badge">${esc(s.surface_type)}</span>${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes || '')}</p></div>
    <div class="panel"><h3>Participants</h3><ul>${parts}</ul></div>
    <div class="panel"><h3>Bounded by</h3><p>${(s.bounded_by ?? []).map(esc).join(', ')}</p><p class="meta">Receipts: ${(s.receipt_ids ?? []).map(esc).join(', ')}</p></div>
  `;
}

/* ---------------- Claims Desk ----------------
   Editor-facing verification: two names in, a verdict out — documented or
   not, for which dates, on what class of source — plus copy-ready standards
   language and the map's standing refusals. All checks run client-side on
   the same built artifacts the map uses. */

const EVIDENCE_RANK = { official: 1, primary_public: 2, reported: 3, derived: 4, judgment: 5, open: 6 };
const EVIDENCE_LABEL = {
  official: 'official document', primary_public: 'primary public source', reported: 'news reporting',
  derived: 'derived inference', judgment: 'editorial judgment', open: 'open/unverified',
};

function periodStart(v) { if (!v) return null; v = String(v).trim(); if (/^\d{4}$/.test(v)) return `${v}-01-01`; if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`; return v; }
function periodEnd(v) {
  if (!v) return null; v = String(v).trim();
  if (/^\d{4}$/.test(v)) return `${v}-12-31`;
  if (/^\d{4}-\d{2}$/.test(v)) { const [y, m] = v.split('-').map(Number); return `${v}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; }
  return v;
}
function validAsOf(v) { return /^\d{4}(-\d{2}){0,2}$/.test(String(v).trim()); }
function basisOverlapsPeriod(basis, asOf) {
  const qf = periodStart(asOf), qu = periodEnd(asOf);
  const from = basis.valid_from, until = basis.valid_until;
  if (from !== null && qu !== null && from > qu) return false;
  if (until !== null && qf !== null && until < qf) return false;
  return true;
}
function basisTimeSliceable(basis) { return basis.temporal_status === 'dated'; }

function deskAdjacency() {
  if (state.deskAdj) return state.deskAdj;
  const adj = new Map();
  for (const e of state.hopGraph.edges) {
    if (!adj.has(e.actor_a)) adj.set(e.actor_a, []);
    if (!adj.has(e.actor_b)) adj.set(e.actor_b, []);
    adj.get(e.actor_a).push({ to: e.actor_b, edge: e });
    adj.get(e.actor_b).push({ to: e.actor_a, edge: e });
  }
  state.deskAdj = adj;
  return adj;
}

function deskPath(start, target, asOf) {
  if (start === target) return { number: 0, hops: [] };
  const adj = deskAdjacency();
  const q = [{ actor: start, hops: [] }];
  const seen = new Set([start]);
  while (q.length) {
    const cur = q.shift();
    for (const next of adj.get(cur.actor) ?? []) {
      if (seen.has(next.to)) continue;
      const bases = asOf
        ? next.edge.surfaces.filter(b => basisTimeSliceable(b) && basisOverlapsPeriod(b, asOf))
        : next.edge.surfaces;
      if (!bases.length) continue;
      const hops = [...cur.hops, { from: cur.actor, to: next.to, edge: next.edge, bases }];
      if (next.to === target) return { number: hops.length, hops };
      seen.add(next.to);
      q.push({ actor: next.to, hops });
    }
  }
  return null;
}

function resolveActorInput(text) {
  const q = norm(text).trim();
  if (!q) return null;
  if (state.actors.has(q)) return q;
  for (const a of state.surfaceGraph.actors) if (norm(a.label) === q) return a.id;
  for (const alias of state.surfaceGraph.aliases ?? []) if (alias.kind === 'actor' && norm(alias.alias) === q) return alias.canonical_id;
  const partial = state.surfaceGraph.actors.filter(a => {
    const aliases = state.aliasesByKey.get(`actor:${a.id}`) ?? [];
    return norm(a.label).includes(q) || norm(a.id).includes(q) || aliases.some(al => norm(al).includes(q));
  });
  return partial.length === 1 ? partial[0].id : { ambiguous: partial.slice(0, 5) };
}

function roleOnBasis(basis, edge, actorId) {
  return actorId === edge.actor_a ? basis.actor_a_role : basis.actor_b_role;
}
function deskWindowText(basis) {
  if (basis.temporal_status === 'undated') return 'dates not documented';
  if (basis.temporal_status !== 'dated') return `${basis.valid_from ?? 'start undocumented'} → ${basis.valid_until ?? 'end undocumented'} (partially dated)`;
  return `${basis.valid_from ?? '…'} → ${basis.valid_until ?? 'ongoing'}`;
}
function chainWeakest(hops) {
  let worst = 'official';
  for (const h of hops) {
    const best = h.bases.reduce((acc, b) => (EVIDENCE_RANK[b.evidence_class] ?? 5) < (EVIDENCE_RANK[acc] ?? 5) ? b.evidence_class : acc, h.bases[0]?.evidence_class ?? 'judgment');
    if ((EVIDENCE_RANK[best] ?? 5) > (EVIDENCE_RANK[worst] ?? 5)) worst = best;
  }
  return worst;
}
function receiptRefs(ids) {
  return (ids ?? []).map(id => {
    const r = state.receipts.get(id);
    if (!r) return { label: id, url: null };
    return { label: r.label || id, url: String(r.path || '').startsWith('http') ? r.path : null };
  });
}
function evidenceBadge(cls) { return `<span class="badge ev ev-${esc(cls)}">${esc(EVIDENCE_LABEL[cls] || cls)}</span>`; }

function deskRejectionsFor(a, b) {
  return (state.hopGraph.rejected_hop_pairs ?? []).filter(p =>
    (!a && !b) || ((p.actor_a === a && p.actor_b === b) || (p.actor_a === b && p.actor_b === a)));
}

function copyDeskText(btnId, text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy text'; btn.classList.remove('copied'); }, 1800);
  });
}
window.copyDeskText = copyDeskText;

function buildPrintableText(fromId, toId, asOf, path) {
  const lines = [];
  const when = asOf ? ` during ${asOf}` : '';
  lines.push(`${labelActor(fromId)} is ${path.number} documented step${path.number === 1 ? '' : 's'} from ${labelActor(toId)} in the Clifford Number map${when}.`);
  lines.push('');
  path.hops.forEach((h, i) => {
    const b = h.bases[0];
    const win = b.temporal_status === 'dated' ? ` between ${b.valid_from} and ${b.valid_until ?? 'the present'}` : ' (dates not fully documented)';
    const roles = [`${labelActor(h.from)} as ${roleOnBasis(b, h.edge, h.from) || 'named participant'}`, `${labelActor(h.to)} as ${roleOnBasis(b, h.edge, h.to) || 'named participant'}`].join('; ');
    const refs = receiptRefs(b.receipt_ids).map(r => r.url ? `${r.label} — ${r.url}` : r.label).join(' · ');
    lines.push(`${i + 1}. ${labelActor(h.from)} and ${labelActor(h.to)} were both named participants in ${b.surface_label}${win} (${roles}). Source: ${refs}`);
  });
  lines.push('');
  lines.push(`Sourcing floor for this chain: ${EVIDENCE_LABEL[chainWeakest(path.hops)]}.`);
  lines.push('This asserts documented shared context only. It is not a claim of influence, coordination, or wrongdoing.');
  return lines.join('\n');
}

function renderDeskHop(h) {
  const bases = h.bases.map(b => `
    <div class="surface-card">
      <h4>${esc(b.surface_label)}</h4>
      <div class="meta">${esc(deskWindowText(b))}</div>
      <div class="badge-row">${evidenceBadge(b.evidence_class)}${b.temporal_status !== 'dated' ? '<span class="badge">not time-sliceable</span>' : ''}</div>
      <p class="meta">${esc(labelActor(h.from))}: ${esc(roleOnBasis(b, h.edge, h.from) || 'named participant')}<br>${esc(labelActor(h.to))}: ${esc(roleOnBasis(b, h.edge, h.to) || 'named participant')}</p>
      <p class="meta">${receiptRefs(b.receipt_ids).map(r => r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.label)}</a>` : esc(r.label)).join('<br>')}</p>
    </div>`).join('');
  return `<div class="panel"><h3>${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}</h3><p class="meta">Both named in:</p><div class="surface-list">${bases}</div></div>`;
}

function renderStandingRefusals() {
  const rejected = state.hopGraph.rejected_hop_pairs ?? [];
  const items = rejected.map(p => `
    <div class="receipts">${esc(labelActor(p.actor_a))} × ${esc(labelActor(p.actor_b))} — both touched ${esc(surface(p.surface_id)?.surface_label || p.surface_id)}, but in non-overlapping documented windows (${esc(p.actor_a_window?.valid_from ?? '?')} → ${esc(p.actor_a_window?.valid_until ?? 'ongoing')} vs ${esc(p.actor_b_window?.valid_from ?? '?')} → ${esc(p.actor_b_window?.valid_until ?? 'ongoing')}). No connection asserted.</div>`).join('');
  return `<div class="panel why-no-hop"><h3>What this map declines to say</h3>
    <p>Connections the compiler rejected because the documents do not support co-presence. A refusal here is a checked fact, not an omission.</p>
    ${items || '<p class="meta">No standing rejections.</p>'}
    <p class="meta">Undated participation is never placed in time: a person whose stint carries no documented dates can appear in all-time results but never in an "as of" answer.</p></div>`;
}

function initDesk() {
  $('#desk-actors').innerHTML = state.surfaceGraph.actors
    .filter(a => state.actorScores.has(a.id))
    .map(a => `<option value="${esc(a.label)}"></option>`).join('');
  const examples = [
    { from: 'fiona-hill', to: '', asOf: '', label: 'Fiona Hill × Clifford' },
    { from: 'dominic-cummings', to: '', asOf: '2020', label: 'Cummings × Clifford, as of 2020' },
  ];
  const rej = (state.hopGraph.rejected_hop_pairs ?? [])[0];
  if (rej) examples.push({ from: rej.actor_a, to: rej.actor_b, asOf: '', label: `${labelActor(rej.actor_a)} × ${labelActor(rej.actor_b)} (a refusal)` });
  $('#desk-examples').innerHTML = examples.map((x, i) => `<button data-i="${i}">${esc(x.label)}</button>`).join('');
  for (const btn of $('#desk-examples').querySelectorAll('button')) {
    btn.addEventListener('click', () => {
      const x = examples[Number(btn.dataset.i)];
      $('#desk-from').value = labelActor(x.from);
      $('#desk-to').value = x.to ? labelActor(x.to) : '';
      $('#desk-asof').value = x.asOf;
      runDeskCheck({ updateHash: true });
    });
  }
  $('#desk-check').addEventListener('click', () => runDeskCheck({ updateHash: true }));
  for (const id of ['desk-from', 'desk-to', 'desk-asof']) {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') runDeskCheck({ updateHash: true }); });
  }
  $('#desk-out').innerHTML = renderStandingRefusals();
}

function deskVerdict(kind, title, body) {
  return `<div class="panel verdict verdict-${kind}"><h2>${esc(title)}</h2>${body}</div>`;
}

function runDeskCheck({ updateHash }) {
  const out = $('#desk-out');
  const fromText = $('#desk-from').value;
  const toText = $('#desk-to').value;
  const asOfRaw = $('#desk-asof').value.trim();
  if (!fromText.trim()) { out.innerHTML = renderStandingRefusals(); return; }
  const fromRes = resolveActorInput(fromText);
  const toRes = toText.trim() ? resolveActorInput(toText) : state.hopGraph.anchor_actor_id;
  const problems = [];
  for (const [text, res] of [[fromText, fromRes], [toText, toRes]]) {
    if (res && res.ambiguous) problems.push(`"${esc(text)}" matches several people: ${res.ambiguous.map(a => esc(a.label)).join(', ')}. Use a full name.`);
    else if (res === null || res === undefined) problems.push(`"${esc(text)}" is not in the map. Names only enter the map through receipted surfaces — absence here is absence of documentation, not a claim about the person.`);
  }
  if (asOfRaw && !validAsOf(asOfRaw)) problems.push(`"${esc(asOfRaw)}" is not a date. Use a year (2020), month (2020-03), or day (2020-03-14).`);
  if (problems.length) { out.innerHTML = deskVerdict('warn', 'Cannot check yet', problems.map(p => `<p>${p}</p>`).join('')); return; }
  const fromId = fromRes, toId = toRes;
  const asOf = asOfRaw || null;
  if (updateHash) {
    const target = `#desk/${encodeURIComponent(fromId)}/${encodeURIComponent(toId)}${asOf ? '/' + encodeURIComponent(asOf) : ''}`;
    if (location.hash !== target) { state.deskSkipRoute = true; location.hash = target; setTimeout(() => { state.deskSkipRoute = false; }, 0); }
  }

  const allTime = deskPath(fromId, toId, null);
  const sliced = asOf ? deskPath(fromId, toId, asOf) : null;
  const path = asOf ? sliced : allTime;
  const directRejections = deskRejectionsFor(fromId, toId);
  const parts = [];

  if (fromId === toId) {
    parts.push(deskVerdict('warn', 'Same person', '<p>Both names resolve to the same entry.</p>'));
  } else if (path) {
    const floor = chainWeakest(path.hops);
    parts.push(deskVerdict('ok', `Documented: ${path.number} step${path.number === 1 ? '' : 's'}${asOf ? ` as of ${asOf}` : ''}`,
      `<p>${esc(labelActor(fromId))} connects to ${esc(labelActor(toId))} through ${path.number === 1 ? 'a shared bounded surface' : `${path.number} shared bounded surfaces`}${asOf ? `, with every link's documented window overlapping ${esc(asOf)}` : ''}.</p>
       <div class="badge-row"><span class="badge">sourcing floor:</span>${evidenceBadge(floor)}</div>
       ${floor !== 'official' ? `<p class="meta">At least one link rests on ${esc(EVIDENCE_LABEL[floor])} rather than an official document. Flag before print.</p>` : '<p class="meta">Every link in this chain carries official-class sourcing.</p>'}`));
    parts.push(...path.hops.map(renderDeskHop));
    const printable = buildPrintableText(fromId, toId, asOf, path);
    parts.push(`<div class="panel"><div class="entity-heading"><h3>What you can print</h3><button id="desk-copy-btn" class="copy-link" onclick="copyDeskText('desk-copy-btn', this.dataset.text)" data-text="${esc(printable)}">Copy text</button></div><pre class="printable">${esc(printable)}</pre></div>`);
  } else if (asOf && allTime) {
    parts.push(deskVerdict('warn', `Not documented for ${asOf}`,
      `<p>A documented all-time connection exists (${allTime.number} step${allTime.number === 1 ? '' : 's'}), but it cannot be placed at ${esc(asOf)}: either the documented windows do not overlap that period, or a link in the chain involves a stint with no documented dates — and this map never asserts co-presence it cannot date.</p>
       <p class="meta">You can report the connection without the date, or find a document that dates the undated stint. Clear the "as of" field to see the all-time chain.</p>`));
  } else {
    parts.push(deskVerdict('no', 'No documented connection',
      `<p>No chain of shared bounded surfaces connects ${esc(labelActor(fromId))} and ${esc(labelActor(toId))}${asOf ? ` during ${esc(asOf)}` : ''} in this corpus. That is a statement about the documentation gathered here, not proof of absence.</p>`));
  }

  if (directRejections.length) {
    parts.push(`<div class="panel why-no-hop"><h3>Checked and declined</h3>${directRejections.map(p => `
      <p>These two both touched <strong>${esc(surface(p.surface_id)?.surface_label || p.surface_id)}</strong>, but their documented windows do not overlap (${esc(labelActor(p.actor_a))}: ${esc(p.actor_a_window?.valid_from ?? '?')} → ${esc(p.actor_a_window?.valid_until ?? 'ongoing')}; ${esc(labelActor(p.actor_b))}: ${esc(p.actor_b_window?.valid_from ?? '?')} → ${esc(p.actor_b_window?.valid_until ?? 'ongoing')}). The compiler refused to connect them through it.</p>`).join('')}</div>`);
  }
  parts.push(renderStandingRefusals());
  out.innerHTML = parts.join('');
}

init().catch(err => {
  console.error(err);
  $('#detail').innerHTML = `<div class="panel"><h2>Load error</h2><p>${esc(err.message)}</p></div>`;
});
