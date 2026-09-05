import { decodeHashPart, formatCitation, safeExternalUrl, safeLocalReceiptPath, validAsOf, partitionParticipantRows } from './src/ui-utils.js';
import { applyTranslations, normalizeLocale, translate } from './src/i18n.js';

const PREFERENCES_KEY = 'clifford-preferences';
const state = {
  searchResults: [], searchActiveIndex: -1, locale: 'en', preferences: {}, citation: null,
  tracks: new Map(), trackHarnesses: new Map(), cases: new Map(), caseIndex: new Map(),
  claims: new Map(), caseReceipts: new Map(), claimCatalog: new Map(), receiptCatalog: new Map(), claimKeyById: new Map(), catalogCounts: {},
  networkMode: 'research', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null
};
const $ = sel => document.querySelector(sel);

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    const legacyTheme = localStorage.getItem('theme');
    return {
      theme: ['system', 'light', 'dark'].includes(saved.theme) ? saved.theme : (['light', 'dark'].includes(legacyTheme) ? legacyTheme : 'light'),
      language: normalizeLocale(saved.language || navigator.language),
      reading: saved.reading === 'large' ? 'large' : 'standard',
      density: saved.density === 'compact' ? 'compact' : 'comfortable',
      contrast: saved.contrast === 'high' ? 'high' : 'standard'
    };
  } catch {
    return { theme: 'light', language: 'en', reading: 'standard', density: 'comfortable', contrast: 'standard' };
  }
}

function savePreferences() {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state.preferences));
}

function applyThemeChoice(choice) {
  const actual = choice === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : choice;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.theme = actual;
  localStorage.setItem('theme', actual);
  const next = actual === 'dark' ? 'light' : 'dark';
  const label = $('#theme-toggle .theme-label');
  if (label) label.textContent = translate(state.locale, next === 'dark' ? 'themeDark' : 'themeLight');
  const icon = $('#theme-toggle .theme-icon');
  if (icon) icon.textContent = next === 'dark' ? '☾' : '☀';
  $('#theme-toggle').setAttribute('aria-label', translate(state.locale, next === 'dark' ? 'themeToDark' : 'themeToLight'));
  $('#theme-toggle').setAttribute('aria-pressed', String(actual === 'dark'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', actual === 'dark' ? '#030d1d' : '#e9e1d0');
  if ($('#theme-select')) $('#theme-select').value = choice;
}

function applyPreferenceState({ rerender = false } = {}) {
  const prefs = state.preferences;
  state.locale = applyTranslations(document, prefs.language);
  document.documentElement.dataset.reading = prefs.reading;
  document.documentElement.dataset.density = prefs.density;
  document.documentElement.dataset.contrast = prefs.contrast;
  applyThemeChoice(prefs.theme);
  $('#language-select').value = prefs.language;
  $('#reading-select').value = prefs.reading;
  $('#density-select').value = prefs.density;
  $('#contrast-toggle').checked = prefs.contrast === 'high';
  if (rerender && state.surfaceGraph) route();
}

function initPreferences() {
  state.preferences = readPreferences();
  applyPreferenceState();
  $('#theme-toggle').addEventListener('click', () => {
    state.preferences.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    savePreferences();
    applyPreferenceState();
  });
  $('#theme-select').addEventListener('change', event => {
    state.preferences.theme = event.target.value;
    savePreferences();
    applyPreferenceState();
  });
  $('#language-select').addEventListener('change', event => {
    state.preferences.language = normalizeLocale(event.target.value);
    savePreferences();
    applyPreferenceState({ rerender: true });
  });
  $('#reading-select').addEventListener('change', event => {
    state.preferences.reading = event.target.value === 'large' ? 'large' : 'standard';
    savePreferences();
    applyPreferenceState();
  });
  $('#density-select').addEventListener('change', event => {
    state.preferences.density = event.target.value === 'compact' ? 'compact' : 'comfortable';
    savePreferences();
    applyPreferenceState();
  });
  $('#contrast-toggle').addEventListener('change', event => {
    state.preferences.contrast = event.target.checked ? 'high' : 'standard';
    savePreferences();
    applyPreferenceState();
  });
  $('#preferences-reset').addEventListener('click', () => {
    state.preferences = { theme: 'system', language: 'en', reading: 'standard', density: 'comfortable', contrast: 'standard' };
    savePreferences();
    applyPreferenceState({ rerender: true });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (state.preferences.theme === 'system') applyThemeChoice('system');
  });
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Browser copy command was rejected');
}

async function copyFeedback(button, text) {
  await writeClipboard(text);
  if (!button) return;
  const original = button.textContent;
  button.textContent = translate(state.locale, 'copied');
  button.classList.add('copied');
  setTimeout(() => { button.textContent = original; button.classList.remove('copied'); }, 1800);
}

async function copyLink(button) {
  try {
    await copyFeedback(button || $('.copy-link'), location.href);
  } catch (err) {
    console.warn('Could not copy link', err);
  }
}

async function copyCitation(button, format) {
  const text = state.citation ? formatCitation(state.citation, format) : '';
  const previewWrap = button?.closest('.citation-menu')?.querySelector('.citation-preview-wrap');
  const preview = previewWrap?.querySelector('textarea');
  if (previewWrap && preview) {
    preview.value = text;
    previewWrap.hidden = false;
    preview.focus();
    preview.select();
  }
  try {
    if (!text) return;
    await copyFeedback(button, text);
  } catch (err) {
    console.warn('Could not copy citation', err);
  }
}

async function shareCitation() {
  if (!state.citation || !navigator.share) return;
  try {
    await navigator.share({
      title: state.citation.title,
      text: formatCitation(state.citation, 'plain'),
      url: state.citation.url
    });
  } catch (err) {
    if (err?.name !== 'AbortError') console.warn('Could not share citation', err);
  }
}

function citationActions() {
  const share = navigator.share ? `<button type="button" onclick="shareCitation()">${esc(translate(state.locale, 'shareCitation'))}</button>` : '';
  return `<button class="copy-link" type="button" onclick="copyLink(this)">${esc(translate(state.locale, 'copyLink'))}</button><details class="citation-menu"><summary>${esc(translate(state.locale, 'copyCite'))}</summary><div class="citation-actions"><button type="button" onclick="copyCitation(this, 'plain')">${esc(translate(state.locale, 'copyCitation'))}</button><button type="button" onclick="copyCitation(this, 'markdown')">${esc(translate(state.locale, 'copyMarkdown'))}</button><button type="button" onclick="copyCitation(this, 'bibtex')">${esc(translate(state.locale, 'copyBibtex'))}</button><button type="button" onclick="copyCitation(this, 'json')">${esc(translate(state.locale, 'copyJson'))}</button>${share}<label class="citation-preview-wrap" hidden><span>${esc(translate(state.locale, 'generatedCitation'))}</span><textarea class="citation-preview" readonly rows="7"></textarea></label></div></details>`;
}

function entityHeading(label, receiptIds = []) {
  state.citation = citationContext(label, receiptIds);
  return `<div class="entity-heading"><h2>${esc(label)}</h2><div class="entity-actions">${citationActions()}</div></div>`;
}

function entityReceiptIds(kind, id) {
  if (kind === 'surface') return state.surfaces.get(id)?.receipt_ids ?? [];
  if (kind === 'chain') return state.chains.get(id)?.receipt_ids ?? [];
  if (kind === 'candidate') return state.candidates.get(id)?.receipt_ids ?? [];
  const ids = new Set();
  for (const item of state.surfaceGraph?.surfaces ?? []) {
    const participates = (item.participants ?? []).some(participant =>
      kind === 'actor' ? participant.actor_id === id : participant.organization_id === id);
    if (!participates) continue;
    for (const receiptId of item.receipt_ids ?? []) ids.add(receiptId);
    for (const participant of item.participants ?? []) {
      const matches = kind === 'actor' ? participant.actor_id === id : participant.organization_id === id;
      if (matches) for (const receiptId of participant.receipt_ids ?? []) ids.add(receiptId);
    }
  }
  return [...ids];
}

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`failed to load ${path}`);
  return res.json();
}

function registerCaseEvidence(caseFiles) {
  for (const caseItem of caseFiles) {
    for (const section of caseItem.sections ?? []) {
      for (const event of section.records ?? []) {
        for (const claim of event.claims ?? []) {
          const claimRecord = {
            ...claim,
            case_id: caseItem.case_id,
            case_title: caseItem.title,
            event_id: event.event_id,
            event_label: event.label,
            occurred_at: event.occurred_at
          };
          const claimKey = `${caseItem.case_id}::${claim.claim_id}`;
          state.claims.set(claimKey, { ...claimRecord, key: claimKey });
          for (const receipt of claim.receipts ?? []) {
            const receiptKey = receipt.receipt_id;
            const existing = state.caseReceipts.get(receiptKey);
            const claimIds = new Set(existing?.claim_ids ?? []);
            claimIds.add(claimKey);
            state.caseReceipts.set(receiptKey, {
              ...(existing ?? {}), ...receipt,
              key: receiptKey,
              claim_ids: [...claimIds],
              case_ids: [...new Set([...(existing?.case_ids ?? []), caseItem.case_id])]
            });
          }
        }
      }
    }
  }
}

async function loadCase(id) {
  if (state.cases.has(id)) return state.cases.get(id);
  const entry = state.caseIndex.get(id);
  if (!entry?.href) return null;
  const item = await loadJson(entry.href);
  state.cases.set(id, item);
  registerCaseEvidence([item]);
  return item;
}

async function loadTrackHarness(id) {
  if (state.trackHarnesses.has(id)) return state.trackHarnesses.get(id);
  const track = state.tracks.get(id);
  if (!track?.href) return null;
  const harness = await loadJson(track.href);
  state.trackHarnesses.set(id, harness);
  return harness;
}

function initEvidenceDialog() {
  const dialog = $('#evidence-dialog');
  $('#evidence-dialog-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('click', event => {
    const claimButton = event.target.closest?.('[data-open-claim]');
    if (claimButton) { event.preventDefault(); openClaimDialog(claimButton.dataset.openClaim); return; }
    const receiptButton = event.target.closest?.('[data-open-receipt]');
    if (receiptButton) { event.preventDefault(); openReceiptDialog(receiptButton.dataset.openReceipt); }
  });
}

function receiptTitle(receipt) {
  return receipt?.label || receipt?.title || receipt?.source_title || receipt?.receipt_id || 'Untitled receipt';
}

function mergeReceiptRecords(...records) {
  const present = records.filter(Boolean);
  if (!present.length) return null;
  const merged = {};
  for (const record of present) {
    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined && value !== null && value !== '') merged[key] = value;
    }
  }
  merged.receipt_id = present.find(record => record.receipt_id)?.receipt_id;
  merged.key = merged.receipt_id;
  merged.claim_ids = [...new Set(present.flatMap(record => record.claim_ids ?? []))];
  merged.case_ids = [...new Set(present.flatMap(record => record.case_ids ?? (record.case_id ? [record.case_id] : [])))];
  return merged;
}

function publicReceiptRecords() {
  const ids = new Set([...state.receiptCatalog.keys(), ...state.receipts.keys()]);
  return new Map([...ids].map(id => [id, mergeReceiptRecords(state.receiptCatalog.get(id), state.receipts.get(id))]));
}

function publicReceiptCount() {
  return new Set([...state.receiptCatalog.keys(), ...state.receipts.keys()]).size;
}

function receiptInspector(receipt) {
  if (!receipt) return '<p class="evidence-note">This receipt is not present in the current public release.</p>';
  const sourceUrl = safeExternalUrl(receipt.url || receipt.source_url || receipt.path || '');
  const archiveUrl = safeExternalUrl(receipt.archive_url || receipt.archive?.url || receipt.archive?.ref || '');
  const localReceiptPath = safeLocalReceiptPath(receipt.path);
  const links = [
    sourceUrl ? `<a class="receipt-link" href="${esc(sourceUrl)}" target="_blank" rel="noreferrer">Open original source ↗</a>` : '',
    localReceiptPath ? `<a class="receipt-link" href="${esc(localReceiptPath)}">Open preserved extract →</a>` : '',
    archiveUrl ? `<a class="receipt-link" href="${esc(archiveUrl)}" target="_blank" rel="noreferrer">Open archived copy ↗</a>` : ''
  ].filter(Boolean).join('');
  const claimLinks = (receipt.claim_ids ?? []).map(id => {
    const claim = state.claims.get(id) ?? state.claimCatalog.get(id);
    return claim ? `<button class="evidence-related" type="button" data-open-claim="${esc(id)}">${esc(shortLabel(claim.plain, 120))}</button>` : '';
  }).join('');
  return `<article class="receipt-inspector">
    <div class="receipt-inspector-head"><div><span class="panel-label">Receipt · ${esc(receipt.receipt_id || receipt.id || '')}</span><h3>${esc(receiptTitle(receipt))}</h3></div><span class="badge">${esc(humanLabel(receipt.locator_status || receipt.availability || receipt.source_type || 'source'))}</span></div>
    <dl class="evidence-facts">
      ${receipt.publisher ? `<div><dt>Publisher</dt><dd>${esc(receipt.publisher)}</dd></div>` : ''}
      ${receipt.source_type ? `<div><dt>Source type</dt><dd>${esc(humanLabel(receipt.source_type))}</dd></div>` : ''}
      ${receipt.source_published_at ? `<div><dt>Source published</dt><dd>${esc(receipt.source_published_at)}</dd></div>` : receipt.published_at ? `<div><dt>Published</dt><dd>${esc(receipt.published_at)}</dd></div>` : ''}
      ${receipt.source_updated_at ? `<div><dt>Source updated</dt><dd>${esc(receipt.source_updated_at)}</dd></div>` : ''}
      ${receipt.event_date ? `<div><dt>Event date</dt><dd>${esc(receipt.event_date)}</dd></div>` : ''}
      ${receipt.retrieved_at ? `<div><dt>Retrieved</dt><dd>${esc(receipt.retrieved_at)}</dd></div>` : ''}
    </dl>
    ${receipt.extract ? `<div class="receipt-locator"><strong>Relevant locator or excerpt</strong><p>${esc(receipt.extract)}</p></div>` : receipt.notes ? `<div class="receipt-locator"><strong>What this receipt supports</strong><p>${esc(receipt.notes)}</p></div>` : '<p class="meta">The public record has source metadata but no stored excerpt.</p>'}
    ${receipt.extract && receipt.notes ? `<p class="evidence-note"><strong>Qualification.</strong> ${esc(receipt.notes)}</p>` : ''}
    ${links ? `<div class="receipt-actions">${links}</div>` : '<p class="evidence-note">No safe public URL is available for this receipt.</p>'}
    ${claimLinks ? `<div class="related-claims"><strong>Claims using this receipt</strong>${claimLinks}</div>` : ''}
  </article>`;
}

async function openClaimDialog(id) {
  const catalogItem = state.claimCatalog.get(id);
  if (catalogItem && !state.claims.has(id)) await loadCase(catalogItem.case_id);
  const claim = state.claims.get(id) ?? catalogItem;
  const dialog = $('#evidence-dialog');
  const content = $('#evidence-dialog-content');
  if (!claim || !dialog || !content) return;
  content.innerHTML = `<article class="claim-inspector">
    <span class="panel-label">Claim · ${esc(claim.claim_id)}</span>
    <h2 id="evidence-dialog-title">${esc(claim.plain)}</h2>
    <div class="claim-status-line"><span class="badge">${esc(humanLabel(claim.claim_status))}</span><span>${esc(humanLabel(claim.evidence_class || claim.evidence_state))} evidence</span><span>Causality: ${esc(humanLabel(claim.causal_status))}</span></div>
    <dl class="evidence-facts">
      <div><dt>Case</dt><dd>${esc(claim.case_title)}</dd></div>
      <div><dt>Observed or asserted</dt><dd>${esc(claim.occurred_at || 'Date not recorded')}</dd></div>
      <div><dt>Context</dt><dd>${esc(claim.event_label)}</dd></div>
    </dl>
    ${claim.qualification ? `<p class="evidence-note"><strong>Qualification.</strong> ${esc(claim.qualification)}</p>` : ''}
    <p class="claim-boundary"><strong>What this establishes:</strong> only the exact assertion above, at its displayed evidence and review status. Sequence, proximity, or shared context does not establish intent, coordination, influence, benefit, wrongdoing, or causation.</p>
    <div class="claim-receipts"><h3>Supporting receipts</h3>${(claim.receipts ?? []).map(receipt => receiptInspector({ ...receipt, claim_ids: [id], case_ids: [claim.case_id] })).join('') || '<p class="evidence-note">No receipt record is available.</p>'}</div>
  </article>`;
  bindEvidenceActions(content);
  if (!dialog.open) dialog.showModal();
}

async function openReceiptDialog(id) {
  const receiptId = id.includes('::') ? id.split('::').at(-1) : id;
  const catalogItem = state.receiptCatalog.get(receiptId);
  if (catalogItem && !state.caseReceipts.has(receiptId)) await loadCase(catalogItem.case_id);
  const raw = state.caseReceipts.get(receiptId);
  const graphReceipt = state.receipts.get(receiptId);
  const dialog = $('#evidence-dialog');
  const content = $('#evidence-dialog-content');
  const receipt = mergeReceiptRecords(catalogItem, graphReceipt, raw);
  if (!dialog || !content || !receipt) return;
  content.innerHTML = `<div><h2 id="evidence-dialog-title">Evidence receipt</h2>${receiptInspector(receipt)}</div>`;
  bindEvidenceActions(content);
  if (!dialog.open) dialog.showModal();
}

function bindEvidenceActions(root = document) {
  return root;
}

function activateResult(kind, id) {
  if (kind === 'claim') openClaimDialog(id);
  else if (kind === 'receipt') openReceiptDialog(id);
  else go(kind, id);
}

function trackStatus(track) {
  return track?.custody_status === 'declared_not_wired' ? 'Exploratory' : humanLabel(track?.custody_status || 'Incomplete');
}

function trackAxisLabel(axis) {
  return ({ 'place-formation': 'Place and value formation', 'person-router': 'Public-to-private role pathways', 'disclosure-crossing': 'Disclosure and money crossings' })[axis] || humanLabel(axis);
}

function renderTrackDirectory() {
  const list = $('#track-directory-list');
  if (!list) return;
  list.innerHTML = [...state.tracks.values()].map(track => {
    const gaps = track.coverage_gap_count ?? 0;
    return `<article class="track-card">
      <div class="track-card-status"><span class="badge badge--exploratory">${esc(trackStatus(track))}</span><span>${esc(trackAxisLabel(track.axis))}</span></div>
      <h3>${esc(track.label)}</h3>
      <p>${esc(track.question || 'The public question for this track has not yet been promoted.')}</p>
      <div class="track-card-foot"><span>${gaps} visible coverage gap${gaps === 1 ? '' : 's'}</span><button class="track-open" type="button" data-kind="track" data-id="${esc(track.track_id)}">Open track →</button></div>
    </article>`;
  }).join('');
  for (const button of list.querySelectorAll('.track-open')) button.addEventListener('click', () => go('track', button.dataset.id));
}

function norm(s) { return String(s || '').toLowerCase(); }
function labelActor(id) { return state.actors.get(id)?.label || id; }
function labelOrg(id) { return state.orgs.get(id)?.label || id; }
function surface(id) { return state.surfaces.get(id); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function shortLabel(s, max = 26) { const value = String(s ?? ''); return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'The Clifford Number — map the machine, open every receipt'; }
function announce(message) { const status = $('#view-status'); if (status) status.textContent = message; }

async function init() {
  initPreferences();
  const [surfaceGraph, hopGraph, scores, legacyGraph, scout, receiptGraph, publicCatalog] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] }))
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
  state.catalogCounts = publicCatalog.counts ?? {};
  state.caseIndex = new Map((publicCatalog.cases ?? []).map(item => [item.case_id, item]));
  state.tracks = new Map((publicCatalog.tracks ?? []).map(item => [item.track_id, item]));
  state.claimCatalog = new Map((publicCatalog.claims ?? []).map(item => [item.key, item]));
  state.receiptCatalog = new Map((publicCatalog.receipts ?? []).map(item => [item.receipt_id, item]));
  state.claimKeyById = new Map((publicCatalog.claims ?? []).map(item => [item.claim_id, item.key]));
  state.hopEdgeByPair = new Map();
  for (const edge of hopGraph.edges ?? []) {
    state.hopEdgeByPair.set(`${edge.actor_a}||${edge.actor_b}`, edge);
    state.hopEdgeByPair.set(`${edge.actor_b}||${edge.actor_a}`, edge);
  }
  const flagshipCase = [...state.caseIndex.values()].sort((a, b) => (b.featured_priority ?? 0) - (a.featured_priority ?? 0))[0];
  $('#try-examples').innerHTML = `
    <button data-network-focus="dialog">Dialog · 124 edges</button>
    ${flagshipCase ? `<button data-kind="case" data-id="${esc(flagshipCase.case_id)}">Clifford → Starmer · official</button>` : ''}
    ${state.actors.has('ben-warner') ? '<button data-kind="actor" data-id="ben-warner">Ben Warner → Clifford · hops</button>' : ''}`;
  for (const btn of $('#try-examples').querySelectorAll('[data-kind]')) btn.addEventListener('click', () => go(btn.dataset.kind, btn.dataset.id));

  $('#search').addEventListener('input', onSearch);
  $('#search').addEventListener('keydown', onSearchKeydown);
  $('#browse-all').addEventListener('click', browseAll);
  initEvidenceDialog();
  window.addEventListener('hashchange', route);

  const tabs = [...document.querySelectorAll('.tabs .tab')];
  for (const btn of tabs) {
    btn.addEventListener('click', () => {
      if (btn.dataset.view === 'desk') { if (!location.hash.startsWith('#desk')) location.hash = '#desk'; else showView('desk'); }
      else { location.hash = ''; }
    });
    btn.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const current = tabs.indexOf(btn);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  }
  $('#hero-check').addEventListener('click', () => {
    if (!location.hash.startsWith('#desk')) location.hash = '#desk';
    else showView('desk');
    $('#explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#desk-from').focus(), 350);
  });
  initDesk();

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !$('#view-desk').hidden) return;
    if (e.key === '/' && document.activeElement !== $('#search')) {
      e.preventDefault();
      $('#search').focus();
      $('#search').select();
    } else if (e.key === 'Escape') {
      if (e.defaultPrevented || !$('#view-desk').hidden) return;
      const searchEngaged = document.activeElement === $('#search') || state.searchResults.length > 0;
      if (searchEngaged) {
        $('#search').value = '';
        clearSearchResults();
        return;
      }
      if (document.activeElement?.matches('input, textarea, select')) return;
      if (location.hash) location.hash = '';
    }
  });

  renderHeroNetwork();
  initNetworkAtlas();
  renderTrackDirectory();
  const nonHop = state.surfaceGraph.surfaces.filter(s => !s.hop_eligible).length;
  $('#footer-corpus-meta').textContent = `${state.surfaceGraph.surfaces.length} surfaces · ${state.receipts.size} receipts · ${nonHop} context-only surfaces`;
  $('#release-strip').textContent = `${state.catalogCounts.tracks ?? state.tracks.size} research tracks · ${state.catalogCounts.cases ?? state.caseIndex.size} compiled cases · ${state.catalogCounts.claims ?? state.claimCatalog.size} public-indexed claims · ${publicReceiptCount()} unique receipt records`;
  await route();
  $('#app-status').classList.add('is-ready');
}

function go(kind, id) {
  const target = `#${kind}/${encodeURIComponent(id)}`;
  if (location.hash === target) renderEntity(kind, id);
  else location.hash = target;
  clearSearchResults();
  setTimeout(() => $('#explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

window.copyLink = copyLink;
window.copyCitation = copyCitation;
window.shareCitation = shareCitation;

function showView(view) {
  $('#view-map').hidden = view !== 'map';
  $('#view-desk').hidden = view !== 'desk';
  for (const btn of document.querySelectorAll('.tabs .tab')) {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
  }
}

async function route() {
  const hash = location.hash.replace(/^#/, '');
  if (hash === 'desk' || hash.startsWith('desk/')) {
    document.body.dataset.page = 'desk';
    showView('desk');
    if (state.deskSkipRoute) return;
    const [, from, to, asOf] = hash.split('/');
    if (from) {
      const decodedFrom = decodeHashPart(from);
      const decodedTo = to ? decodeHashPart(to) : undefined;
      const decodedAsOf = asOf ? decodeHashPart(asOf) : undefined;
      if (decodedFrom === null || decodedTo === null || decodedAsOf === null) {
        $('#desk-out').innerHTML = deskVerdict('warn', 'Invalid shared link', '<p>This URL contains malformed encoded text. Start a new check below.</p>');
        return;
      }
      $('#desk-from').value = labelActor(decodedFrom);
      $('#desk-to').value = decodedTo ? labelActor(decodedTo) : '';
      $('#desk-asof').value = decodedAsOf ?? '';
      runDeskCheck({ updateHash: false });
    }
    return;
  }
  showView('map');
  const [kind, rawId] = hash.split('/');
  if (kind && rawId) {
    document.body.dataset.page = 'detail';
    const id = decodeHashPart(rawId);
    if (id === null) renderNotFound(kind, rawId);
    else await renderEntity(kind, id);
  }
  else {
    document.body.dataset.page = 'home';
    renderHomeV2();
  }
}

function renderHeroNetwork() {
  if (!$('#topology-edge-count') || !$('#hero-network-content')) return;
  const sampleId = ['ben-warner', 'fiona-hill', 'simon-case'].find(id => state.hopGraph.shortest_paths[id]?.number > 0)
    ?? Object.keys(state.hopGraph.shortest_paths).find(id => state.hopGraph.shortest_paths[id]?.number > 0);
  const path = sampleId ? state.hopGraph.shortest_paths[sampleId] : null;
  $('#topology-edge-count').textContent = `${state.hopGraph.edges.length.toLocaleString()} ${translate(state.locale, 'validHops')} · ${state.receipts.size} ${translate(state.locale, 'releaseReceipts')}`;
  if (!path?.actor_path?.length) return;
  const items = [];
  path.actor_path.forEach((actorId, i) => {
    items.push({ kind: actorId === state.hopGraph.anchor_actor_id ? 'anchor' : 'actor', label: labelActor(actorId) });
    const basis = path.hops[i]?.shared_surfaces?.[0];
    if (basis) items.push({ kind: 'surface', label: basis.surface_label });
  });
  const startX = 78;
  const endX = 542;
  const points = items.map((item, i) => {
    const ratio = items.length === 1 ? 0 : i / (items.length - 1);
    return { ...item, x: startX + (endX - startX) * ratio, y: 290 - 165 * ratio + (item.kind === 'surface' ? -42 : 28) };
  });
  const route = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  $('#hero-network-content').innerHTML = `
    <path class="network-line" d="${route}"/>
    ${points.map(p => {
      if (p.kind === 'surface') return `<rect class="network-node network-node--surface" x="${p.x - 13}" y="${p.y - 13}" width="26" height="26" rx="3" transform="rotate(45 ${p.x} ${p.y})"/><text class="network-sublabel" x="${p.x}" y="${p.y + 38}" text-anchor="middle">${esc(shortLabel(p.label, 31))}</text>`;
      const cls = p.kind === 'anchor' ? 'network-node--anchor' : 'network-node--actor';
      return `<circle class="network-node ${cls}" cx="${p.x}" cy="${p.y}" r="${p.kind === 'anchor' ? 20 : 16}"/><text class="network-label" x="${p.x}" y="${p.y - 28}" text-anchor="middle">${esc(shortLabel(p.label, 22))}</text>`;
    }).join('')}`;
}

function renderHome() {
  state.citation = null;
  setDocumentTitle();
  const rejected = state.hopGraph.rejected_hop_pairs?.length ?? 0;
  const denseContext = state.surfaceGraph.surfaces.filter(s => !s.hop_eligible && (s.participants ?? []).filter(p => p.participant_type === 'actor').length >= 20).length;
  $('#summary').innerHTML = `
    <div class="panel"><div class="metric">${state.surfaceGraph.surfaces.length}</div><div class="metric-label">${esc(translate(state.locale, 'boundedSurfaces'))}</div></div>
    <div class="panel"><div class="metric">${state.hopGraph.edges.length.toLocaleString()}</div><div class="metric-label">${esc(translate(state.locale, 'validHops'))}</div></div>
    <div class="panel"><div class="metric">${state.receipts.size}</div><div class="metric-label">${esc(translate(state.locale, 'releaseReceipts'))}</div></div>
    <div class="panel"><div class="metric">${rejected}</div><div class="metric-label">${esc(translate(state.locale, 'refusedConnections'))}</div></div>
  `;
  const preferred = ['fiona-hill', 'ben-warner', 'simon-case', 'dominic-cummings', 'keir-starmer'];
  const fallback = [...state.actorScores.values()]
    .filter(s => Number.isInteger(s.clifford_number) && s.clifford_number > 0)
    .sort((a, b) => a.clifford_number - b.clifford_number || b.surface_density - a.surface_density)
    .map(s => s.actor_id);
  const routeIds = [...new Set([...preferred, ...fallback])]
    .filter(id => Number.isInteger(state.actorScores.get(id)?.clifford_number) && state.actorScores.get(id).clifford_number > 0)
    .slice(0, 5);
  const routeList = routeIds.map(id => {
    const score = state.actorScores.get(id);
    return `<button class="result" data-kind="actor" data-id="${esc(id)}"><span class="kind-glyph">A</span><span class="result-label">${esc(labelActor(id))}<small>Clifford Number ${score.clifford_number} · ${score.surfaces.length} documented surface${score.surfaces.length === 1 ? '' : 's'}</small></span></button>`;
  }).join('');
  const chainList = [...state.chains.values()]
    .sort((a, b) => b.machine_score - a.machine_score)
    .map(c => `<button class="result" data-kind="chain" data-id="${esc(c.chain_id)}"><span class="kind-glyph">C</span><span class="result-label">${esc(c.chain_label)}<small>${c.chain_length} documented stages · context only, never a hop</small></span></button>`)
    .join('');
  const caseList = [...state.cases.values()].map(item => `<button class="result" data-kind="case" data-id="${esc(item.case_id)}"><span class="kind-glyph">F</span><span class="result-label">${esc(item.title)}<small>${esc(item.tracking_id)} · ${item.counts.events} typed events · ${item.claim_status_counts.verified} verified claims</small></span></button>`).join('');
  const sampleId = routeIds[0];
  const samplePath = sampleId ? state.hopGraph.shortest_paths[sampleId] : null;
  $('#detail').innerHTML = `
    <div class="home-grid">
      <div class="panel">
        <span class="panel-label">${esc(translate(state.locale, 'compilerRule'))}</span>
        <h2>${esc(translate(state.locale, 'whatCounts'))}</h2>
        <p>A Clifford Number moves from one public actor to another only when both are documented on the same named, bounded surface. Every basis carries roles, dates, an evidence class, and receipt IDs.</p>
        <div class="home-principles">
          <div class="principle"><span class="principle-index">01</span><p><strong>Bounded, not broad.</strong> A taskforce, board, policy authorship, or small named cohort can qualify. “Same institution” cannot.</p></div>
          <div class="principle"><span class="principle-index">02</span><p><strong>Overlapping, not timeless.</strong> Dated roles must overlap. Undated records never support an “as of” claim.</p></div>
          <div class="principle"><span class="principle-index">03</span><p><strong>Receipted, not inferred.</strong> A shared surface documents context. It does not establish contact, influence, coordination, or wrongdoing.</p></div>
        </div>
      </div>
      <div class="panel">
        <span class="panel-label">Start with a documented route</span>
        <h3>Explore the current release</h3>
        <div class="results">${routeList || '<p class="meta">No routes are available in this release.</p>'}</div>
      </div>
    </div>
    ${samplePath ? `<div class="panel"><span class="panel-label">A route, rendered honestly</span><h3>${esc(labelActor(sampleId))} → ${esc(labelActor(state.hopGraph.anchor_actor_id))}</h3>${renderTopologyMap(samplePath)}<p class="evidence-note">Circles are public actors. Diamonds are the shared bounded surfaces that permit a hop. Open the actor to inspect roles, time windows, and receipts.</p></div>` : ''}
    <div class="home-grid">
      <div class="panel why-no-hop"><span class="panel-label">Refusal is a feature</span><h3>What the graph declines to connect</h3><p>${rejected} compiler rejection${rejected === 1 ? ' is' : 's are'} preserved with an explicit publication status; review-required records are not presented as checked findings. ${denseContext} large roster surface${denseContext === 1 ? ' is' : 's are'} preserved as context without manufacturing thousands of person-to-person hops.</p></div>
      <div class="panel"><span class="panel-label">Structural context, not adjacency</span><h3>Multi-stage pathways</h3><div class="results">${chainList || '<p class="meta">None in this release.</p>'}</div></div>
    </div>
    <div class="panel case-entry"><span class="panel-label">Compiled case files</span><h3>From topology to outcomes</h3><p>Case files join program events, typed money, public-role transitions, capability observations, and reported outcomes without converting sequence into causation.</p><div class="results">${caseList || '<p class="meta">No compiled case files in this release.</p>'}</div></div>`;
  bindResults();
  announce(`Explorer loaded: ${state.surfaceGraph.surfaces.length} surfaces, ${state.hopGraph.edges.length} valid hops, and ${state.receipts.size} receipts.`);
}

function renderHomeV2() {
  state.citation = null;
  setDocumentTitle();
  const rejectionRecords = state.hopGraph.rejected_hop_pairs ?? [];
  const verifiedRefusals = rejectionRecords.filter(item => item.publication_status === 'verified').length;
  const reviewRefusals = rejectionRecords.length - verifiedRefusals;
  const rejected = rejectionRecords.length;
  const denseContext = state.surfaceGraph.surfaces.filter(surfaceItem => !surfaceItem.hop_eligible && (surfaceItem.participants ?? []).filter(participant => participant.participant_type === 'actor').length >= 20).length;
  $('#summary').innerHTML = `
    <div class="panel"><div class="metric">${state.tracks.size}</div><div class="metric-label">research tracks · exploratory labeled</div></div>
    <div class="panel"><div class="metric">${state.catalogCounts.cases ?? state.caseIndex.size}</div><div class="metric-label">compiled case files</div></div>
    <div class="panel"><div class="metric">${state.catalogCounts.claims ?? state.claimCatalog.size}</div><div class="metric-label">public-indexed claims</div></div>
    <div class="panel"><div class="metric">${rejected}</div><div class="metric-label">${verifiedRefusals} verified · ${reviewRefusals} review-required refusals</div></div>`;
  const preferred = ['fiona-hill', 'ben-warner', 'simon-case', 'dominic-cummings', 'keir-starmer'];
  const fallback = [...state.actorScores.values()]
    .filter(score => Number.isInteger(score.clifford_number) && score.clifford_number > 0)
    .sort((a, b) => a.clifford_number - b.clifford_number || b.surface_density - a.surface_density)
    .map(score => score.actor_id);
  const routeIds = [...new Set([...preferred, ...fallback])]
    .filter(id => Number.isInteger(state.actorScores.get(id)?.clifford_number) && state.actorScores.get(id).clifford_number > 0)
    .slice(0, 5);
  const routeList = routeIds.map(id => {
    const score = state.actorScores.get(id);
    return `<button class="result" data-kind="actor" data-id="${esc(id)}"><span class="kind-glyph">A</span><span class="result-label">${esc(labelActor(id))}<small>Clifford Number ${score.clifford_number} · ${score.surfaces.length} documented surface${score.surfaces.length === 1 ? '' : 's'}</small></span></button>`;
  }).join('');
  const caseList = [...state.caseIndex.values()].map(item => `<button class="result" data-kind="case" data-id="${esc(item.case_id)}"><span class="kind-glyph">F</span><span class="result-label">${esc(item.title)}<small>${esc(item.tracking_id)} · ${esc(humanLabel(item.status))} · ${item.counts.events} typed events · ${item.claim_status_counts.verified} verified claims</small></span></button>`).join('');
  const sampleId = routeIds[0];
  const samplePath = sampleId ? state.hopGraph.shortest_paths[sampleId] : null;
  const featuredCase = [...state.caseIndex.values()].sort((a, b) =>
    (b.featured_priority ?? 0) - (a.featured_priority ?? 0)
    || (b.claim_status_counts.verified ?? 0) - (a.claim_status_counts.verified ?? 0)
  )[0];
  const featuredClaim = featuredCase?.featured_claim ?? null;
  $('#detail').innerHTML = `
    <div class="home-grid home-grid--evidence">
      <article class="panel featured-case">
        <span class="panel-label">Representative compiled case · ${esc(humanLabel(featuredCase?.status || 'unavailable'))}</span>
        <h2>${esc(featuredCase?.title || 'No compiled case is available')}</h2>
        <p>${esc(featuredCase?.subtitle || 'This release does not yet contain a compiled case.')}</p>
        ${featuredClaim ? `<div class="featured-claim"><div class="claim-status-line"><span class="badge">Verified</span><span>${esc(humanLabel(featuredClaim.evidence_class || featuredClaim.evidence_state))} evidence</span></div><p>${esc(featuredClaim.plain)}</p><button class="claim-open" type="button" data-open-claim="${esc(featuredClaim.key)}">Open the claim and ${featuredClaim.receipt_count ?? 0} supporting receipt${featuredClaim.receipt_count === 1 ? '' : 's'} →</button></div>` : '<p class="evidence-note">No verified claim has been promoted in this case.</p>'}
        ${featuredCase ? `<button class="result result--case" data-kind="case" data-id="${esc(featuredCase.case_id)}"><span class="kind-glyph">F</span><span class="result-label">Read the case ladder<small>${featuredCase.counts.events} typed events · ${featuredCase.counts.claims} claims</small></span></button>` : ''}
      </article>
      <aside class="panel evidence-standard">
        <span class="panel-label">How Clifford Number decides</span>
        <h2>Records first. Limits in plain language.</h2>
        <div class="home-principles">
          <div class="principle"><span class="principle-index">01</span><p><strong>Bounded, not broad.</strong> A named taskforce, board, authorship group, or small cohort can qualify. “Same institution” cannot.</p></div>
          <div class="principle"><span class="principle-index">02</span><p><strong>Overlapping, not timeless.</strong> Dated roles must overlap. Unknown dates remain unknown.</p></div>
          <div class="principle"><span class="principle-index">03</span><p><strong>Receipted, not inferred.</strong> Shared context does not establish contact, influence, coordination, intent, or wrongdoing.</p></div>
        </div>
      </aside>
    </div>
    <div class="home-grid">
      <div class="panel why-no-hop"><span class="panel-label">${verifiedRefusals ? 'Checked negative findings' : 'Refusal evidence under review'}</span><h3>No documented connection can be a result</h3><p>${verifiedRefusals} refusal${verifiedRefusals === 1 ? '' : 's'} currently meet the public evidence standard; ${reviewRefusals} compiler rejection${reviewRefusals === 1 ? ' is' : 's are'} preserved as review-required because decisive window receipts are not publicly re-verifiable. ${denseContext} large roster surface${denseContext === 1 ? ' is' : 's are'} preserved as context without manufacturing thousands of person-to-person hops.</p><button class="result" data-kind="desk" data-id=""><span class="kind-glyph">×</span><span class="result-label">Open the connection checker<small>Every accepted step carries receipts; every refusal exposes its publication status and evidence limit.</small></span></button></div>
      <div class="panel case-entry"><span class="panel-label">Compiled case files</span><h3>Follow decisions to later outcomes</h3><p>Cases keep verified, review-required, unresolved, disputed, and rejected claims visibly distinct.</p><div class="results">${caseList || '<p class="meta">No compiled case files in this release.</p>'}</div></div>
    </div>
    ${samplePath ? `<details class="panel advanced-record"><summary>Advanced research view: inspect one documented route</summary><div class="advanced-record-body"><h3>${esc(labelActor(sampleId))} → ${esc(labelActor(state.hopGraph.anchor_actor_id))}</h3>${renderTopologyMap(samplePath)}<p class="evidence-note">The diagram is optional. The actor page carries the readable route, roles, overlap windows, and receipts.</p><div class="results">${routeList}</div></div></details>` : ''}`;
  bindResults();
  bindEvidenceActions($('#detail'));
  announce(`Public record loaded: ${state.catalogCounts.tracks ?? state.tracks.size} research tracks, ${state.catalogCounts.cases ?? state.caseIndex.size} cases, ${state.catalogCounts.claims ?? state.claimCatalog.size} public-indexed claims, and ${publicReceiptCount()} unique receipt records.`);
}

const NETWORK_FULL_VIEW = { x: 0, y: 0, width: 1400, height: 900 };

function evidenceBand(value) {
  const evidence = norm(value);
  if (['official', 'confirmed'].includes(evidence)) return 'confirmed';
  if (evidence === 'primary_public') return 'primary';
  if (evidence === 'reported') return 'reported';
  return 'derived';
}

function clusterForNode(node) {
  const text = norm([node.id, node.type, ...(node.tags ?? [])].join(' '));
  if (text.includes('dialog') || text.includes('private-forum')) return 'dialog';
  if (text.includes('government') || text.includes('policy') || text.includes('uk-ai') || text.includes('public-sector')) return 'policy';
  if (text.includes('defen') || text.includes('military') || text.includes('army') || text.includes('palantir')) return 'defense';
  if (text.includes('capital') || text.includes('fund') || text.includes('venture') || text.includes('invest')) return 'capital';
  if (text.includes('company') || text.includes('technology') || text.includes('frontier-ai') || text.includes('data')) return 'technology';
  return 'other';
}

function researchNetworkModel() {
  const graph = state.legacyGraph;
  const degree = new Map((graph.nodes ?? []).map(node => [node.id, 0]));
  const adjacency = new Map((graph.nodes ?? []).map(node => [node.id, []]));
  for (const edge of graph.edges ?? []) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }
  const fixed = new Map(Object.entries({
    dialog: [300, 440],
    'matt-clifford': [690, 415],
    'clifford-policy-machine': [835, 415],
    'ai-opportunities-action-plan': [790, 235],
    palantir: [1080, 570],
    'entrepreneur-first': [700, 700],
    'detachment-201': [1130, 285]
  }));
  const centers = {
    dialog: [300, 440], policy: [805, 365], defense: [1110, 520],
    capital: [700, 690], technology: [1080, 190], other: [505, 745]
  };
  const raw = (graph.nodes ?? []).map(node => {
    let cluster = clusterForNode(node);
    if ((adjacency.get(node.id) ?? []).includes('dialog') && !fixed.has(node.id)) cluster = 'dialog';
    return { ...node, degree: degree.get(node.id) ?? 0, cluster };
  });
  const groups = new Map();
  for (const node of raw.filter(node => !fixed.has(node.id))) {
    if (!groups.has(node.cluster)) groups.set(node.cluster, []);
    groups.get(node.cluster).push(node);
  }
  const positions = new Map();
  for (const [id, point] of fixed) positions.set(id, { x: point[0], y: point[1] });
  for (const [cluster, nodes] of groups) {
    const [cx, cy] = centers[cluster] ?? centers.other;
    nodes.sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));
    nodes.forEach((node, index) => {
      const angle = index * 2.3999632297;
      const spread = cluster === 'dialog' ? 27 : 34;
      const radius = 62 + Math.sqrt(index + 1) * spread;
      positions.set(node.id, {
        x: Math.max(28, Math.min(1372, cx + Math.cos(angle) * radius)),
        y: Math.max(28, Math.min(872, cy + Math.sin(angle) * radius))
      });
    });
  }
  const nodes = raw.map(node => ({ ...node, ...(positions.get(node.id) ?? { x: 700, y: 450 }) }));
  return {
    mode: 'research', nodes, edges: graph.edges ?? [], nodeById: new Map(nodes.map(node => [node.id, node])),
    defaultNode: 'dialog', fullView: { ...NETWORK_FULL_VIEW }
  };
}

function hopNetworkModel() {
  const actorIds = new Set();
  const degree = new Map();
  for (const edge of state.hopGraph.edges ?? []) {
    actorIds.add(edge.actor_a); actorIds.add(edge.actor_b);
    degree.set(edge.actor_a, (degree.get(edge.actor_a) ?? 0) + 1);
    degree.set(edge.actor_b, (degree.get(edge.actor_b) ?? 0) + 1);
  }
  const levels = new Map();
  for (const id of actorIds) {
    const score = state.actorScores.get(id);
    levels.set(id, Number.isInteger(score?.clifford_number) ? score.clifford_number : 3);
  }
  levels.set(state.hopGraph.anchor_actor_id, 0);
  const byLevel = new Map();
  for (const id of actorIds) {
    const level = Math.max(0, Math.min(4, levels.get(id) ?? 3));
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(id);
  }
  const positions = new Map([[state.hopGraph.anchor_actor_id, { x: 700, y: 450 }]]);
  for (const [level, ids] of byLevel) {
    if (level === 0) continue;
    ids.sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || labelActor(a).localeCompare(labelActor(b)));
    const radiusX = Math.min(600, 180 + level * 115);
    const radiusY = Math.min(370, 120 + level * 70);
    ids.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, ids.length)) * Math.PI * 2 + level * .22;
      positions.set(id, { x: 700 + Math.cos(angle) * radiusX, y: 450 + Math.sin(angle) * radiusY });
    });
  }
  const nodes = [...actorIds].map(id => ({
    id, label: labelActor(id), type: 'person', cluster: 'hop', degree: degree.get(id) ?? 0,
    ...(positions.get(id) ?? { x: 700, y: 450 })
  }));
  const edges = (state.hopGraph.edges ?? []).map((edge, index) => ({
    ...edge, id: `hop-${index}-${edge.actor_a}-${edge.actor_b}`, from: edge.actor_a, to: edge.actor_b,
    evidence_class: [...(edge.surfaces ?? [])].sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))[0]?.evidence_class ?? 'judgment'
  }));
  return {
    mode: 'hops', nodes, edges, nodeById: new Map(nodes.map(node => [node.id, node])),
    defaultNode: state.hopGraph.anchor_actor_id, fullView: { ...NETWORK_FULL_VIEW }
  };
}

function applyNetworkView() {
  const svg = $('#network-svg');
  if (!svg) return;
  const view = state.networkView;
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
}

function zoomNetwork(factor, center = null) {
  const current = state.networkView;
  const nextWidth = Math.max(260, Math.min(1400, current.width * factor));
  const nextHeight = nextWidth * (900 / 1400);
  const cx = center?.x ?? current.x + current.width / 2;
  const cy = center?.y ?? current.y + current.height / 2;
  state.networkView = {
    x: Math.max(0, Math.min(1400 - nextWidth, cx - nextWidth / 2)),
    y: Math.max(0, Math.min(900 - nextHeight, cy - nextHeight / 2)),
    width: nextWidth, height: nextHeight
  };
  applyNetworkView();
}

function resetNetworkView() {
  state.networkView = { ...NETWORK_FULL_VIEW };
  applyNetworkView();
}

function networkNodeRadius(node) {
  return Math.max(5, Math.min(31, 4 + Math.sqrt(node.degree || 1) * 2.35));
}

function renderNetworkAtlas(mode = state.networkMode, selectedId = null) {
  const layer = $('#network-layer');
  if (!layer) return;
  state.networkMode = mode;
  state.networkModel = mode === 'hops' ? hopNetworkModel() : researchNetworkModel();
  const model = state.networkModel;
  const edgeMarkup = model.edges.map(edge => {
    const from = model.nodeById.get(edge.from);
    const to = model.nodeById.get(edge.to);
    if (!from || !to) return '';
    const band = evidenceBand(edge.evidence_class);
    const topology = model.mode === 'research' && legacyIsTopology(edge) ? ' network-edge--topology' : '';
    return `<line class="network-edge network-edge--${band}${topology}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/><line class="network-edge-hit" data-network-edge="${esc(edge.id)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
  }).join('');
  const nodeMarkup = model.nodes.map(node => {
    const radius = networkNodeRadius(node);
    const hot = node.degree >= 5 || node.id === model.defaultNode;
    const showLabel = hot || model.mode === 'hops';
    return `<g class="atlas-node atlas-node--${esc(node.cluster)}${hot ? ' atlas-node--hot' : ''}" data-network-node="${esc(node.id)}" transform="translate(${node.x} ${node.y})" tabindex="0" role="button" aria-label="${esc(`${node.label}, ${node.degree} documented edges`)}">
      ${hot ? `<circle class="atlas-node-halo" r="${radius + 12}"/>` : ''}
      <circle class="atlas-node-core" r="${radius}"/>
      ${showLabel ? `<text class="atlas-node-label" y="${-(radius + 10)}" text-anchor="middle">${esc(shortLabel(node.label, 28))}</text><text class="atlas-node-degree" y="4" text-anchor="middle">${node.degree}</text>` : ''}
      <title>${esc(node.label)} · ${node.degree} documented edge${node.degree === 1 ? '' : 's'}</title>
    </g>`;
  }).join('');
  layer.innerHTML = `<g class="network-edges">${edgeMarkup}</g><g class="network-nodes">${nodeMarkup}</g>`;
  const uniqueSurfaces = new Set((state.hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).map(surfaceItem => surfaceItem.surface_id)));
  $('#atlas-stats').innerHTML = model.mode === 'research'
    ? `<strong>${model.nodes.length}</strong> public nodes <span>·</span> <strong>${model.edges.length}</strong> sourced edges <span>·</span> <strong>${model.nodeById.get('dialog')?.degree ?? 0}</strong> edges at Dialog`
    : `<strong>${model.nodes.length}</strong> admitted actors <span>·</span> <strong>${model.edges.length}</strong> valid hops <span>·</span> <strong>${uniqueSurfaces.size}</strong> bounded surfaces`;
  for (const button of document.querySelectorAll('[data-network-mode]')) {
    const active = button.dataset.networkMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const nodeEl of layer.querySelectorAll('[data-network-node]')) {
    const select = () => selectNetworkNode(nodeEl.dataset.networkNode);
    nodeEl.addEventListener('click', select);
    nodeEl.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); select();
    });
  }
  for (const edgeEl of layer.querySelectorAll('[data-network-edge]')) {
    edgeEl.addEventListener('click', () => openNetworkEdge(edgeEl.dataset.networkEdge));
  }
  resetNetworkView();
  selectNetworkNode(selectedId && model.nodeById.has(selectedId) ? selectedId : model.defaultNode);
}

function selectNetworkNode(id) {
  const model = state.networkModel;
  const node = model?.nodeById.get(id);
  const inspector = $('#network-inspector');
  if (!node || !inspector) return;
  for (const element of $('#network-layer').querySelectorAll('[data-network-node]')) element.classList.toggle('is-selected', element.dataset.networkNode === id);
  const related = model.edges.filter(edge => edge.from === id || edge.to === id)
    .sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))
    .slice(0, 12);
  const cards = related.map(edge => {
    const otherId = edge.from === id ? edge.to : edge.from;
    const other = model.nodeById.get(otherId);
    if (model.mode === 'hops') {
      const surfaces = edge.surfaces ?? [];
      return `<article class="network-edge-card"><div><span class="badge">${esc(humanLabel(edge.evidence_class))}</span><strong>${esc(other?.label ?? otherId)}</strong></div>${surfaces.map(surfaceItem => `<p><b>${esc(surfaceItem.surface_label)}</b><br><span>${esc(surfaceItem.actor_a_role || '')} ↔ ${esc(surfaceItem.actor_b_role || '')}</span></p><div class="network-receipt-buttons">${(surfaceItem.receipt_ids ?? []).slice(0, 3).map(receiptId => `<button type="button" data-open-receipt="${esc(receiptId)}">Receipt · ${esc(shortLabel(receiptId, 28))}</button>`).join('')}</div>`).join('')}</article>`;
    }
    const claimKey = state.claimKeyById.get(`clm-${edge.id}`);
    return `<article class="network-edge-card"><div><span class="badge">${esc(humanLabel(edge.evidence_class || 'context'))}</span><strong>${esc(other?.label ?? otherId)}</strong></div><p>${esc(edge.claim || humanLabel(edge.type))}</p>${claimKey ? `<button type="button" class="edge-evidence-button" data-open-claim="${esc(claimKey)}">Open claim + ${(edge.source_ids ?? []).length} receipt${(edge.source_ids ?? []).length === 1 ? '' : 's'} →</button>` : ''}</article>`;
  }).join('');
  inspector.innerHTML = `<p class="section-kicker">${esc(model.mode === 'hops' ? 'Verified surface-hop node' : humanLabel(node.cluster) + ' cluster')}</p><h3>${esc(node.label)}</h3><div class="network-node-metric"><strong>${node.degree}</strong><span>documented edge${node.degree === 1 ? '' : 's'}</span></div>${node.description ? `<p>${esc(node.description)}</p>` : ''}<button class="result network-profile-link" data-kind="actor" data-id="${esc(node.id)}"><span class="kind-glyph">A</span><span class="result-label">Open the full record<small>routes, roles, windows, and receipts</small></span></button><h4>Strongest visible edges</h4><div class="network-edge-list">${cards || '<p>No edge is visible in this view.</p>'}</div>`;
  bindEvidenceActions(inspector);
  for (const button of inspector.querySelectorAll('.result')) button.addEventListener('click', () => activateResult(button.dataset.kind, button.dataset.id));
}

function openNetworkEdge(id) {
  if (state.networkMode === 'research') {
    const claimKey = state.claimKeyById.get(`clm-${id}`);
    if (claimKey) openClaimDialog(claimKey);
    return;
  }
  const edge = state.networkModel?.edges.find(item => item.id === id);
  if (edge) selectNetworkNode(edge.from);
}

function focusNetworkNode(id) {
  if (state.networkMode !== 'research' || !state.networkModel?.nodeById.has(id)) renderNetworkAtlas('research', id);
  else selectNetworkNode(id);
  const node = state.networkModel?.nodeById.get(id);
  if (node) {
    state.networkView = { x: Math.max(0, Math.min(960, node.x - 220)), y: Math.max(0, Math.min(617, node.y - 142)), width: 440, height: 283 };
    applyNetworkView();
  }
  $('#network-atlas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderHopSpine() {
  const root = $('#hop-spine-routes');
  if (!root) return;
  const preferred = ['ben-warner', 'fiona-hill', 'simon-case', 'keir-starmer', 'dominic-cummings'];
  const ids = preferred.filter(id => state.hopGraph.shortest_paths[id]?.number > 0).slice(0, 4);
  root.innerHTML = ids.map(id => {
    const path = state.hopGraph.shortest_paths[id];
    const route = [];
    path.actor_path.forEach((actorId, index) => {
      route.push(labelActor(actorId));
      const basis = path.hops[index]?.shared_surfaces?.[0];
      if (basis) route.push(basis.surface_label);
    });
    return `<button class="hop-route" type="button" data-kind="actor" data-id="${esc(id)}"><span><strong>Clifford Number ${path.number}</strong>${esc(labelActor(id))}</span><small>${route.map(item => esc(shortLabel(item, 34))).join(' → ')}</small></button>`;
  }).join('');
  for (const button of root.querySelectorAll('[data-kind]')) button.addEventListener('click', () => go(button.dataset.kind, button.dataset.id));
}

function initNetworkAtlas() {
  renderNetworkAtlas('research');
  renderHopSpine();
  const model = state.networkModel;
  if (model) {
    const degree = id => model.nodeById.get(id)?.degree || 0;
    const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
    setText('#hero-node-count', `${model.nodes.length} public nodes`);
    setText('#hero-edge-count', `${model.edges.length} sourced edges`);
    setText('#hotspot-dialog-count', `${degree('dialog')} public graph edges`);
    setText('#hotspot-action-plan-count', `${degree('ai-opportunities-action-plan')} public graph edges`);
    setText('#hotspot-palantir-count', `${degree('palantir')} public graph edges`);
    const dialogExample = document.querySelector('#try-examples [data-network-focus="dialog"]');
    if (dialogExample) dialogExample.textContent = `Dialog · ${degree('dialog')} edges`;
  }
  for (const button of document.querySelectorAll('[data-network-mode]')) button.addEventListener('click', () => renderNetworkAtlas(button.dataset.networkMode));
  for (const button of document.querySelectorAll('[data-network-focus]')) button.addEventListener('click', () => focusNetworkNode(button.dataset.networkFocus));
  for (const button of document.querySelectorAll('[data-network-zoom]')) button.addEventListener('click', () => {
    if (button.dataset.networkZoom === 'reset') resetNetworkView();
    else zoomNetwork(button.dataset.networkZoom === 'in' ? .72 : 1.28);
  });
  const svg = $('#network-svg');
  if (!svg) return;
  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomNetwork(event.deltaY > 0 ? 1.12 : .88);
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', event => {
    if (event.target.closest?.('[data-network-node], [data-network-edge]')) return;
    drag = { x: event.clientX, y: event.clientY, view: { ...state.networkView } };
    svg.setPointerCapture?.(event.pointerId);
    svg.classList.add('is-panning');
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = (event.clientX - drag.x) * drag.view.width / Math.max(1, svg.clientWidth);
    const dy = (event.clientY - drag.y) * drag.view.height / Math.max(1, svg.clientHeight);
    state.networkView = {
      ...drag.view,
      x: Math.max(0, Math.min(1400 - drag.view.width, drag.view.x - dx)),
      y: Math.max(0, Math.min(900 - drag.view.height, drag.view.y - dy))
    };
    applyNetworkView();
  });
  const endDrag = () => { drag = null; svg.classList.remove('is-panning'); };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
}

function rankMatch(q, label, id, aliases = []) {
  const values = [{ value: norm(label), context: 'name' }, ...aliases.map(value => ({ value: norm(value), context: `alias: ${value}` })), { value: norm(id), context: 'canonical ID' }];
  let best = null;
  for (const item of values) {
    let score = null;
    if (item.value === q) score = 0;
    else if (item.value.startsWith(q)) score = 1;
    else if (item.value.split(/\s+/).some(word => word.startsWith(q))) score = 2;
    else if (item.value.includes(q)) score = 3;
    if (score !== null && (!best || score < best.score)) best = { score, context: item.context };
  }
  return best;
}

function onSearch(e) {
  const q = norm(e.target.value).trim();
  const results = [];
  if (q.length >= 2) {
    for (const a of state.surfaceGraph.actors) {
      const aliases = state.aliasesByKey.get(`actor:${a.id}`) ?? [];
      const match = rankMatch(q, a.label, a.id, aliases);
      if (match) results.push({ kind: 'actor', id: a.id, label: a.label, ...match });
    }
    for (const o of state.surfaceGraph.organizations) {
      const aliases = state.aliasesByKey.get(`organization:${o.id}`) ?? [];
      const match = rankMatch(q, o.label, o.id, aliases);
      if (match) results.push({ kind: 'organization', id: o.id, label: o.label, ...match });
    }
    for (const s of state.surfaceGraph.surfaces) { const match = rankMatch(q, s.surface_label, s.surface_id); if (match) results.push({ kind: 'surface', id: s.surface_id, label: s.surface_label, ...match }); }
    for (const c of state.chains.values()) { const match = rankMatch(q, c.chain_label, c.chain_id); if (match) results.push({ kind: 'chain', id: c.chain_id, label: c.chain_label, ...match }); }
    for (const c of state.candidates.values()) {
      const match = rankMatch(q, c.label, c.id, c.aliases ?? []);
      if (match) results.push({ kind: 'candidate', id: c.id, label: c.label, ...match });
    }
    for (const c of state.caseIndex.values()) {
      const match = rankMatch(q, c.title, c.case_id, [c.tracking_id, c.subtitle]);
      if (match) results.push({ kind: 'case', id: c.case_id, label: c.title, ...match });
    }
    for (const track of state.tracks.values()) {
      const match = rankMatch(q, track.label, track.track_id, [track.question]);
      if (match) results.push({ kind: 'track', id: track.track_id, label: track.label, ...match });
    }
    for (const claim of state.claimCatalog.values()) {
      const match = rankMatch(q, claim.plain, claim.claim_id, [claim.case_title, claim.event_label]);
      if (match) results.push({ kind: 'claim', id: claim.key, label: claim.plain, ...match });
    }
    for (const receipt of publicReceiptRecords().values()) {
      const match = rankMatch(q, receiptTitle(receipt), receipt.receipt_id, [receipt.publisher, receipt.extract, receipt.notes, receipt.path]);
      if (match) results.push({ kind: 'receipt', id: receipt.receipt_id, label: receiptTitle(receipt), ...match });
    }
  }
  const kindOrder = { track: 0, case: 1, actor: 2, organization: 3, claim: 4, receipt: 5, surface: 6, chain: 7, candidate: 8 };
  state.searchResults = results.sort((a, b) => a.score - b.score || kindOrder[a.kind] - kindOrder[b.kind] || a.label.localeCompare(b.label)).slice(0, 12);
  state.searchActiveIndex = -1;
  const box = $('#results');
  box.innerHTML = state.searchResults.length
    ? state.searchResults.map((r, i) => `<button id="search-option-${i}" class="result" role="option" tabindex="-1" aria-selected="false" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}"><span class="kind-glyph">${kindGlyph(r.kind)}</span><span class="result-label">${esc(r.label)}<small>${esc(r.kind)} · ${esc(r.context)}</small></span></button>`).join('')
    : q.length >= 2 ? `<div class="meta" role="option" aria-disabled="true">No public record in this release matches “${esc(e.target.value.trim())}”. Absence here is not evidence of absence.</div>` : '';
  $('#search').setAttribute('aria-expanded', String(q.length >= 2));
  $('#search').removeAttribute('aria-activedescendant');
  for (const btn of box.querySelectorAll('.result')) btn.addEventListener('click', () => activateResult(btn.dataset.kind, btn.dataset.id));
}

function browseAll() {
  const items = [
    ...state.surfaceGraph.actors.map(item => ({ kind: 'actor', id: item.id, label: item.label })),
    ...state.surfaceGraph.organizations.map(item => ({ kind: 'organization', id: item.id, label: item.label })),
    ...state.surfaceGraph.surfaces.map(item => ({ kind: 'surface', id: item.surface_id, label: item.surface_label })),
    ...[...state.chains.values()].map(item => ({ kind: 'chain', id: item.chain_id, label: item.chain_label })),
    ...[...state.caseIndex.values()].map(item => ({ kind: 'case', id: item.case_id, label: item.title })),
    ...[...state.tracks.values()].map(item => ({ kind: 'track', id: item.track_id, label: item.label })),
    ...[...state.claimCatalog.values()].map(item => ({ kind: 'claim', id: item.key, label: item.plain })),
    ...[...publicReceiptRecords().values()].map(item => ({ kind: 'receipt', id: item.receipt_id, label: receiptTitle(item) }))
  ].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 80);
  state.searchResults = items;
  state.searchActiveIndex = -1;
  $('#search').value = '';
  $('#search').setAttribute('aria-expanded', 'true');
  $('#search').removeAttribute('aria-activedescendant');
  const box = $('#results');
  box.innerHTML = items.length
    ? items.map((item, i) => `<button id="search-option-${i}" class="result" role="option" tabindex="0" aria-selected="false" data-kind="${esc(item.kind)}" data-id="${esc(item.id)}"><span class="kind-glyph">${kindGlyph(item.kind)}</span><span class="result-label">${esc(item.label)}<small>${esc(item.kind)}</small></span></button>`).join('')
    : `<div class="meta" role="option" aria-disabled="true">${esc(translate(state.locale, 'noRecords'))}</div>`;
  for (const btn of box.querySelectorAll('.result')) btn.addEventListener('click', () => activateResult(btn.dataset.kind, btn.dataset.id));
  announce(translate(state.locale, 'browseShowing', { count: items.length }));
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function onSearchKeydown(e) {
  if (!state.searchResults.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    state.searchActiveIndex = (state.searchActiveIndex + delta + state.searchResults.length) % state.searchResults.length;
    const options = [...$('#results').querySelectorAll('.result')];
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === state.searchActiveIndex)));
    const active = options[state.searchActiveIndex];
    $('#search').setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const selected = state.searchResults[Math.max(0, state.searchActiveIndex)];
    activateResult(selected.kind, selected.id);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    clearSearchResults();
  }
}

function clearSearchResults() {
  state.searchResults = [];
  state.searchActiveIndex = -1;
  $('#results').innerHTML = '';
  $('#search').setAttribute('aria-expanded', 'false');
  $('#search').removeAttribute('aria-activedescendant');
}

function kindGlyph(kind) {
  return { actor: 'A', organization: 'O', surface: 'S', chain: 'C', case: 'F', track: 'T', claim: 'K', receipt: 'R', candidate: '?' }[kind] || '•';
}

function renderMethod(section = 'overview') {
  setDocumentTitle('Method');
  const tabs = [
    ['overview', 'How a hop works'], ['definitions', 'Definitions'],
    ['redaction', 'Publication boundaries'], ['rules', 'Compiler rules']
  ];
  $('#summary').innerHTML = [
    metricPanel('Admitted hops', state.hopGraph.edges.length),
    metricPanel('Bounded surfaces', state.surfaceGraph.surfaces.length),
    metricPanel('Public graph edges', state.legacyGraph.edges.length),
    metricPanel('Unique receipts', publicReceiptCount())
  ].join('');
  const methodNav = `<nav class="method-nav" aria-label="Method sections">${tabs.map(([id, label]) => `<a class="${section === id ? 'is-active' : ''}" href="#method/${id}">${esc(label)}</a>`).join('')}</nav>`;
  const sections = {
    overview: `<div class="panel method-panel"><span class="panel-label">The shortest honest explanation</span><h2>Actor → named surface → actor.</h2><p>A Clifford Number is not a generic social-network edge. Two people become adjacent only when public records place both on the same named, bounded surface during compatible dates.</p><div class="method-equation"><span>Person</span><b>→</b><span>Bounded surface</span><b>→</b><span>Person</span></div><p>Examples of qualifying surfaces include a named board, authorship group, taskforce, commissioned review, or small documented cohort. “Both worked near government” is not a hop.</p><a class="primary-action" href="#desk">Run the connection checker →</a></div>`,
    definitions: `<div class="panel method-panel"><span class="panel-label">Terms used everywhere</span><h2>Do not collapse distinct predicates.</h2><dl class="definition-grid"><div><dt>Listed</dt><dd>A name appears in a directory. It does not prove membership or attendance.</dd></div><div><dt>Registered</dt><dd>A registration record exists. It does not prove attendance.</dd></div><div><dt>Attended</dt><dd>A source specifically supports presence at an event.</dd></div><div><dt>Surface</dt><dd>A named, bounded public process or cohort that can support an actor-to-actor hop.</dd></div><div><dt>Research edge</dt><dd>A sourced relationship in the wider public graph. It may be context rather than a valid hop.</dd></div><div><dt>Receipt</dt><dd>The source record, archive, locator, and qualification attached to a claim.</dd></div></dl></div>`,
    redaction: `<div class="panel method-panel"><span class="panel-label">Publication boundary</span><h2>Publish the record. Preserve the limit.</h2><p>Public pages include published claims, graph edges, bounded surfaces, and receipt metadata. Intake queues, crawler state, private or local material, and unreviewed promotion candidates stay outside the Pages artifact.</p><div class="boundary-grid"><article><strong>Shown</strong><p>Exact sourced claim, evidence class, date window, qualification, source, archive, and publication status.</p></article><article><strong>Not manufactured</strong><p>Contact, coordination, influence, intent, benefit, wrongdoing, or causation not established by the source.</p></article></div></div>`,
    rules: `<div class="panel method-panel"><span class="panel-label">Compiler contract</span><h2>No edge without a receipt. No dated hop without overlap.</h2><ol class="rule-list"><li><strong>Bound the surface.</strong> Broad institutions do not create hops.</li><li><strong>Type the predicate.</strong> Listed, registered, attended, appointed, funded, and reported remain distinct.</li><li><strong>Intersect the dates.</strong> Disjoint windows produce a compiler refusal, not a connection.</li><li><strong>Carry the evidence floor.</strong> A route cannot be stronger than its weakest admitted basis.</li><li><strong>Show the receipt.</strong> Every material claim opens inside the instrument before linking outward.</li></ol></div>`
  };
  $('#detail').innerHTML = `${methodNav}${sections[section] ?? sections.overview}`;
}

function renderReceiptArchive() {
  setDocumentTitle('Evidence archive');
  const receipts = [...publicReceiptRecords().values()].sort((a, b) => receiptTitle(a).localeCompare(receiptTitle(b)));
  const archived = receipts.filter(receipt => receipt.archive_url || receipt.archive?.url || receipt.archive?.ref).length;
  const official = receipts.filter(receipt => ['official', 'official_reference'].includes(norm(receipt.source_type))).length;
  $('#summary').innerHTML = [
    metricPanel('Unique receipts', receipts.length), metricPanel('Archived', archived),
    metricPanel('Official sources', official), metricPanel('Claims indexed', state.claimCatalog.size)
  ].join('');
  $('#detail').innerHTML = `<section class="panel receipt-archive"><span class="panel-label">Public evidence archive</span><h2>The receipts, inside the instrument.</h2><p>Open a receipt here to see what it supports, its evidence class, publisher, dates, qualification, original source, archive, and every indexed claim that uses it.</p><div class="receipt-archive-grid">${receipts.map(receipt => `<article><span class="badge">${esc(humanLabel(receipt.source_type || receipt.evidence_class || 'source'))}</span><h3>${esc(receiptTitle(receipt))}</h3><p>${esc(receipt.notes || receipt.extract || receipt.publisher || 'Source metadata is available in this release.')}</p><button type="button" data-open-receipt="${esc(receipt.receipt_id)}">Inspect receipt →</button></article>`).join('')}</div></section>`;
}

async function renderEntity(kind, id) {
  if (kind === 'actor') renderActor(id);
  else if (kind === 'organization') renderOrg(id);
  else if (kind === 'chain') renderChain(id);
  else if (kind === 'candidate') renderCandidate(id);
  else if (kind === 'surface') renderSurface(id);
  else if (kind === 'case') await renderCase(id);
  else if (kind === 'track') await renderTrack(id);
  else if (kind === 'method') renderMethod(id);
  else if (kind === 'receipts') renderReceiptArchive();
  else renderNotFound(kind, id);
  announce(`${document.title.replace(' — The Clifford Number', '')} loaded.`);
}

function renderNotFound(kind, id) {
  state.citation = null;
  setDocumentTitle('Not found');
  $('#summary').innerHTML = '';
  $('#detail').innerHTML = `<div class="panel why-no-hop"><span class="panel-label">Stale or unknown link</span><h2>Not found in this release.</h2><p>The ${esc(kind || 'item')} “${esc(id || '')}” is not present in the current public corpus. It may have been renamed, withheld, or never promoted from intake.</p><p><button class="copy-link" type="button" onclick="location.hash=''">Return to the explorer</button></p></div>`;
}

function metricPanel(label, value) { return `<div class="panel"><div class="metric">${esc(value ?? '—')}</div><div class="metric-label">${esc(label)}</div></div>`; }

async function renderTrack(id) {
  const track = state.tracks.get(id);
  if (!track) return renderNotFound('research track', id);
  const harness = await loadTrackHarness(id);
  setDocumentTitle(track.label);
  const coverage = harness?.coverage_seed ?? [];
  const openCoverage = coverage.filter(item => item.state !== 'complete');
  const stages = harness?.scan?.spine ?? [];
  const relatedCases = (harness?.derived_from ?? []).map(caseId => state.caseIndex.get(caseId)).filter(Boolean);
  $('#summary').innerHTML = [
    metricPanel('Research state', trackStatus(track)),
    metricPanel('Research axis', trackAxisLabel(track.axis)),
    metricPanel('Declared stages', stages.length),
    metricPanel('Visible coverage gaps', openCoverage.length)
  ].join('');
  const ladder = stages.map((stage, index) => `<li class="track-ladder-step"><span class="track-ladder-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${esc(stage.label)}</strong><span>${esc(humanLabel(stage.target_domain || 'source domain'))}</span></div></li>`).join('');
  const gaps = openCoverage.map(item => `<li><strong>${esc(humanLabel(item.state))}</strong><span>${esc(item.topic)}</span></li>`).join('');
  const caseLinks = relatedCases.map(item => `<button class="result" data-kind="case" data-id="${esc(item.case_id)}"><span class="kind-glyph">F</span><span class="result-label">${esc(item.title)}<small>${esc(humanLabel(item.status))} · ${item.counts.claims} typed claims · ${item.claim_status_counts.verified} verified</small></span></button>`).join('');
  $('#detail').innerHTML = `
    <article class="panel track-hero">
      <div class="entity-heading"><h2>${esc(track.label)}</h2><div class="entity-actions"><button class="copy-link" type="button" onclick="copyLink(this)">Copy link</button></div></div>
      <div class="track-status-line"><span class="badge badge--exploratory">${esc(trackStatus(track))}</span><span>${esc(trackAxisLabel(track.axis))}</span></div>
      <p class="track-question">${esc(harness?.question || 'The public research question has not yet been promoted.')}</p>
      <p class="evidence-note"><strong>Publication state.</strong> This track is visible as a bounded research program, not as a published finding. Its current custody state is ${esc(humanLabel(track.custody_status || 'incomplete'))}.</p>
    </article>
    <div class="home-grid track-explainer">
      <section class="panel"><span class="panel-label">What is being examined</span><h3>The public-record sequence</h3><ol class="track-ladder">${ladder || '<li>No research stages are published.</li>'}</ol></section>
      <section class="panel"><span class="panel-label">What the current evidence can say</span><h3>No finding has been admitted by this harness.</h3><p>The track defines a question, a bounded denominator, source surfaces, and visible coverage states. Those are research commitments—not proof of a relationship or outcome.</p><div class="claim-boundary"><strong>What it cannot say.</strong> ${esc(harness?.epistemic_contract?.forbidden_inference || 'No inference may be strengthened beyond the published evidence.')}</div></section>
    </div>
    <section class="panel coverage-panel"><span class="panel-label">Coverage gaps</span><h3>What remains unsearched or incomplete</h3><ul class="coverage-list">${gaps || '<li><span>No coverage gaps are declared.</span></li>'}</ul></section>
    ${caseLinks ? `<section class="panel"><span class="panel-label">Related compiled case</span><h3>Enter the receipted record</h3><p>This case is a separate public object with its own statuses, claims, and receipts. Opening it does not promote this track to a finding.</p><div class="results">${caseLinks}</div></section>` : ''}`;
  bindResults();
}

function formatCaseValue(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (value.currency && Number.isFinite(value.amount)) return `${value.amount_kind}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currency, maximumFractionDigits: 0 }).format(value.amount)}${value.fiscal_year ? ` · FY${value.fiscal_year}` : ''}`;
  if (Number.isFinite(value.value) && Object.keys(value).length <= 2) return `${Math.round(value.value * 100)}%`;
  return Object.entries(value).map(([key, item]) => `${humanLabel(key)}: ${item}`).join(' · ');
}

function renderCaseClaim(claim, caseId) {
  const receiptCount = claim.receipts?.length ?? 0;
  return `<article class="case-claim case-claim--${esc(claim.claim_status)}"><div class="case-claim-head"><span class="badge">${esc(humanLabel(claim.claim_status))}</span><span class="meta">${esc(humanLabel(claim.evidence_class || claim.evidence_state))} · causality: ${esc(humanLabel(claim.causal_status))}</span></div><p>${esc(claim.plain)}</p>${claim.value != null ? `<p class="case-value">${esc(formatCaseValue(claim.value))}</p>` : ''}${claim.qualification ? `<p class="evidence-note">${esc(claim.qualification)}</p>` : ''}<button class="claim-open" type="button" data-open-claim="${esc(`${caseId}::${claim.claim_id}`)}">Open claim and ${receiptCount} receipt${receiptCount === 1 ? '' : 's'} →</button></article>`;
}

function caseBriefingHref(item) {
  const href = String(item?.briefing?.href || '');
  if (!/^briefs\/[a-z0-9][a-z0-9._\/-]*\.html$/i.test(href)) return null;
  if (document.body.dataset.portableRelease === 'true') return null;
  return href;
}

async function renderCase(id) {
  const item = await loadCase(id);
  if (!item) return renderNotFound('case', id);
  setDocumentTitle(item.title);
  const briefingHref = caseBriefingHref(item);
  const briefingAction = briefingHref
    ? `<a class="copy-link case-brief-link" href="${esc(briefingHref)}">${esc(item.briefing?.label || 'Open reporter brief')}</a>`
    : '';
  $('#summary').innerHTML = [
    metricPanel('Typed events', item.counts.events),
    metricPanel('Claims', item.counts.claims),
    metricPanel('Verified', item.claim_status_counts.verified),
    metricPanel('Review required', item.claim_status_counts.review_required)
  ].join('');
  const sections = item.sections.map((section, index) => {
    const records = section.records.map(event => `<article class="case-event"><div class="case-event-marker" aria-hidden="true"></div><div class="case-event-body"><div class="case-event-head"><h3>${esc(event.label)}</h3><span class="badge">${esc(humanLabel(event.event_type))}</span></div><p class="meta">Observed or asserted: ${esc(event.occurred_at)}</p>${event.claims.map(claim => renderCaseClaim(claim, item.case_id)).join('')}</div></article>`).join('');
    if (item.presentation === 'research_graph_projection' && index > 0) {
      return `<details class="panel case-section case-ladder advanced-record"><summary>${esc(section.label)} · ${section.records.length} record${section.records.length === 1 ? '' : 's'}</summary><div class="advanced-record-body">${records}</div></details>`;
    }
    return `<section class="panel case-section case-ladder"><span class="panel-label">${esc(section.label)}</span>${records}</section>`;
  }).join('');
  const eventById = new Map(item.events.map(event => [event.event_id, event]));
  const relationFlow = item.relations.map(relation => `<article class="relation-row"><div><span class="meta">${esc(eventById.get(relation.from_event_id)?.occurred_at || '')}</span><strong>${esc(eventById.get(relation.from_event_id)?.label || relation.from_event_id)}</strong></div><span class="relation-arrow" aria-hidden="true">→</span><div><span class="meta">${esc(eventById.get(relation.to_event_id)?.occurred_at || '')}</span><strong>${esc(eventById.get(relation.to_event_id)?.label || relation.to_event_id)}</strong></div><aside><span class="badge">${esc(humanLabel(relation.relation_type))}</span><span class="causal-status">Causality: ${esc(humanLabel(relation.causal_status))}</span></aside></article>`).join('');
  const beacon = item.beacons[0];
  const dimensions = (beacon?.dimensions ?? []).map(dimension => `<li><strong>${esc(humanLabel(dimension.id))}</strong><span>${esc(dimension.formula)}</span></li>`).join('');
  const graphBridge = item.presentation === 'research_graph_projection' ? `<section class="panel case-network-bridge"><span class="panel-label">The graph this case was hiding</span><h3>${item.source_counts?.nodes ?? state.legacyGraph.nodes.length} nodes · ${item.source_counts?.edges ?? state.legacyGraph.edges.length} sourced edges</h3><p>The case ladder is the ledger view. The network atlas is the whole-machine view. Dialog is the largest public cluster; the Action Plan is the policy spine; each edge opens the exact claim and receipts.</p><div class="case-policy-spine" aria-label="Official policy spine"><span>Matt Clifford</span><b>commissioned to lead</b><span>AI Opportunities Action Plan</span><b>adopted by</b><span>Starmer government</span></div><div class="case-network-actions"><button type="button" data-network-focus="dialog">Open the Dialog spine · ${state.networkModel?.nodeById.get('dialog')?.degree ?? 124} edges</button><button type="button" data-network-focus="ai-opportunities-action-plan">Open the policy spine · ${state.networkModel?.nodeById.get('ai-opportunities-action-plan')?.degree ?? 16} edges</button><button type="button" data-network-focus="palantir">Open the Palantir cluster · ${state.networkModel?.nodeById.get('palantir')?.degree ?? 10} edges</button></div></section>` : '';
  $('#detail').innerHTML = `
    <div class="panel case-hero">${entityHeading(item.title, [])}<div class="case-print-row"><p class="case-subtitle">${esc(item.subtitle)} · ${esc(item.tracking_id)} · as known ${esc(item.as_of)}</p>${briefingAction}<button class="copy-link print-dossier" type="button" onclick="window.print()">Print dossier</button></div><p>${esc(item.scope)}</p><div class="evidence-note"><strong>Publication boundary.</strong> ${esc(item.boundary)}</div><p class="meta">${esc(item.disclaimer)}</p></div>
    ${graphBridge}
    ${relationFlow ? `<div class="panel relation-panel"><span class="panel-label">Decision-to-outcome map</span><h3>What is linked—and how strongly</h3><p>Each arrow is typed. It can preserve a long time gap without upgrading sequence into causation.</p><div class="relation-list">${relationFlow}</div></div>` : ''}
    ${beacon ? `<div class="panel beacon-panel"><span class="panel-label">Explainable beacon · ${esc(beacon.version || '')}</span><h3>${esc(beacon.label || 'No beacon')}</h3><div class="beacon-meter"><span style="width:${Math.round((beacon.evidence_coverage?.ratio || 0) * 100)}%"></span></div><p><strong>${beacon.evidence_coverage?.verified || 0} of ${beacon.evidence_coverage?.total || 0}</strong> beacon inputs are independently verified in this ledger.</p><ol class="beacon-dimensions">${dimensions}</ol><p class="evidence-note">${esc(beacon.prohibited_interpretation || '')}</p></div>` : ''}
    ${sections}`;
  bindEvidenceActions($('#detail'));
  for (const button of $('#detail').querySelectorAll('[data-network-focus]')) button.addEventListener('click', () => focusNetworkNode(button.dataset.networkFocus));
}

function metricPanelRatio(label, value, max) {
  if (value == null) return metricPanel(label, 'N/A');
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `<div class="panel"><div class="metric">${pct}</div><div class="metric-bar"><div class="metric-bar-fill" style="width:${pct}%"></div></div><div class="metric-label">${esc(label)} · relative 0–100 index, not probability</div></div>`;
}

function renderTopologyMap(path) {
  if (!path?.actor_path?.length) return '';
  const items = [];
  path.actor_path.forEach((actorId, i) => {
    items.push({ kind: actorId === state.hopGraph.anchor_actor_id ? 'anchor' : 'actor', label: labelActor(actorId) });
    const basis = path.hops[i]?.shared_surfaces?.[0];
    if (basis) items.push({ kind: 'surface', label: basis.surface_label, meta: basis.evidence_class });
  });
  const width = Math.max(760, items.length * 155);
  const points = items.map((item, i) => ({ ...item, x: 85 + i * ((width - 170) / Math.max(1, items.length - 1)), y: item.kind === 'surface' ? 170 : 105 }));
  const lines = points.slice(1).map((p, i) => `<path class="route-edge-shadow" d="M${points[i].x} ${points[i].y} L${p.x} ${p.y}"/><path class="route-edge" d="M${points[i].x} ${points[i].y} L${p.x} ${p.y}"/>`).join('');
  const nodes = points.map(p => {
    if (p.kind === 'surface') return `<rect class="route-surface-node" x="${p.x - 15}" y="${p.y - 15}" width="30" height="30" rx="3" transform="rotate(45 ${p.x} ${p.y})"/><text class="route-label" x="${p.x}" y="${p.y + 45}">${esc(shortLabel(p.label, 28))}</text><text class="route-meta" x="${p.x}" y="${p.y + 63}">${esc(p.meta || 'surface')}</text>`;
    const anchor = p.kind === 'anchor';
    return `<circle class="${anchor ? 'route-anchor-node' : 'route-actor-node'}" cx="${p.x}" cy="${p.y}" r="22"/><text class="route-label${anchor ? ' route-label--anchor' : ''}" x="${p.x}" y="${p.y + 4}">${anchor ? '0' : 'A'}</text><text class="route-label" x="${p.x}" y="${p.y - 39}">${esc(shortLabel(p.label, 24))}</text>`;
  }).join('');
  const aria = `${path.actor_path.map(labelActor).join(' to ')}, through ${path.hops.map(h => h.shared_surfaces?.[0]?.surface_label).filter(Boolean).join(', ')}`;
  return `<div class="route-map" role="img" aria-label="${esc(aria)}"><svg viewBox="0 0 ${width} 260" aria-hidden="true" preserveAspectRatio="xMidYMid meet" style="min-width:${width}px">${lines}${nodes}</svg></div>`;
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
  if (!actor && !legacyNode) return renderNotFound('actor', id);
  setDocumentTitle(actor?.label ?? legacyNode.label);
  if (!score && legacyNode) {
    const related = (state.legacyGraph.edges ?? []).filter(edge => edge.from === id || edge.to === id).slice(0, 10);
    $('#summary').innerHTML = [
      metricPanel('Legacy Edge Number', legacyPath?.number ?? 'N/A'),
      metricPanel('Surface-Hop Number', 'N/A'),
      metricPanelRatio('Structural context index', 0, 1),
      metricPanel('Source', 'legacy graph'),
    ].join('');
    $('#detail').innerHTML = `
      <div class="panel">${entityHeading(actor?.label ?? legacyNode.label, actor ? entityReceiptIds('actor', id) : [])}<p>${esc(legacyNode.description || 'Legacy graph node imported for search continuity.')}</p><div class="badge-row">${(legacyNode.tags ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>
      <div class="panel why-no-hop"><h3>Surface-hop status</h3><p>This actor is search-visible through the legacy edge graph bridge, but has not yet been promoted into bounded surface-hop ledgers. The path below is legacy edge-graph context, not a newly manufactured surface hop.</p></div>
      <div class="panel"><h3>Legacy edge-graph path</h3>${renderLegacyPath(legacyPath)}</div>
      <div class="panel"><h3>Legacy public edges</h3>${related.length ? related.map(edge => `<div class="receipts">${esc(state.legacyNodes.get(edge.from)?.label ?? edge.from)} → ${esc(state.legacyNodes.get(edge.to)?.label ?? edge.to)}: ${esc(edge.claim || edge.type || edge.id)}</div>`).join('') : '<p>None.</p>'}</div>
    `;
    return;
  }
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', score?.clifford_number ?? 'N/A'),
    metricPanel('Documented Surfaces', score?.surfaces?.length ?? 0),
    metricPanelRatio('Structural context index', score?.machine_score ?? 0, 1),
    metricPanel('Recurring Surface Types', Object.keys(score?.surface_type_recurrence ?? {}).length),
  ].join('');

  const noHop = path?.number === null || path?.number === undefined;
  const pathHtml = noHop
    ? `<p class="why-no-hop"><strong>Clifford Number: N/A.</strong> ${esc(score?.why_no_hop || 'No valid surface-hop path to Matt Clifford.')}</p>`
    : renderPath(path);

  const recur = score?.surface_type_recurrence ?? {};
  const recurHtml = Object.keys(recur).length
    ? `<div class="panel"><span class="panel-label">Structural context</span><h3>Recurring surface types</h3><p class="meta">The same surface logic appearing across unrelated venues. This is a pattern signal, not an actor-to-actor hop.</p>${Object.entries(recur).map(([t, sids]) => `<div class="receipts"><span class="badge">${esc(humanLabel(t))}</span> across ${sids.length}: ${sids.map(s => esc(surface(s)?.surface_label || s)).join('; ')}</div>`).join('')}</div>`
    : '';

  const chainsHtml = (score?.chains ?? []).length
    ? `<div class="panel"><span class="panel-label">Context only · never a hop</span><h3>Multi-stage institutional pathways</h3><div class="results">${(score.chains).map(cid => { const c = state.chains.get(cid); return `<button class="result" data-kind="chain" data-id="${esc(cid)}"><span class="kind-glyph">C</span><span class="result-label">${esc(c?.chain_label || cid)}<small>${c?.chain_length ?? 0} documented stages</small></span></button>`; }).join('')}</div></div>`
    : '';

  const profile = actor.plain;
  const profileHtml = profile
    ? `<div class="profile-copy"><p><strong>Who this is.</strong> ${esc(profile.who)}</p><p><strong>Why they appear.</strong> ${esc(profile.why_here)}</p></div>${renderReceiptGrid(profile.receipt_ids, 'Profile receipts')}`
    : `<div class="profile-copy"><p><strong>Editorial profile pending.</strong> This entry is visible because it participates in receipted surfaces, but no human-written plain-language profile has been promoted yet.</p></div>`;

  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(actor.label, entityReceiptIds('actor', id))}<div class="profile-intro"><div>${profileHtml}<div class="badge-row">${(score?.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(humanLabel(t))}</span>`).join('')}</div></div><aside class="profile-boundary"><strong>What this entry supports</strong><br>Documented participation on named public-role surfaces.<br><br><strong>What it does not support</strong><br>Claims about motive, agreement, influence, coordination, character, or wrongdoing.</aside></div></div>
    <div class="panel"><span class="panel-label">Shortest defensible route</span><h3>Documented surface path</h3>${noHop ? pathHtml : `${renderTopologyMap(path)}${pathHtml}`}</div>
    ${chainsHtml}
    ${recurHtml}
    <div class="panel"><span class="panel-label">Source ledger</span><h3>Bounded surfaces</h3><div class="surface-list">${(score?.surfaces ?? []).map(renderSurfaceCard).join('')}</div></div>
  `;
  bindResults();
}

function bindResults() {
  for (const btn of document.querySelectorAll('#detail .result')) btn.addEventListener('click', () => activateResult(btn.dataset.kind, btn.dataset.id));
}

function renderChain(id) {
  const c = state.chains.get(id);
  if (!c) return renderNotFound('pathway', id);
  setDocumentTitle(c.chain_label);
  $('#summary').innerHTML = [
    metricPanel('Clifford Number', 'N/A'),
    metricPanel('Context Stages', c.chain_length),
    metricPanelRatio('Structural context index', c.machine_score, 1),
    metricPanel('Creates Hops', 'No'),
  ].join('');
  const stages = (c.stages ?? []).map(s => `
    <div class="surface-card surface-card--nonhop">
      <h4>${esc(s.order)}. ${esc(s.stage_category.replace(/_/g, ' '))}</h4>
      <div class="meta">${esc(s.surface_label)}${s.actor_id ? ' · ' + esc(labelActor(s.actor_id)) : ''}${s.organization_id ? ' · ' + esc(labelOrg(s.organization_id)) : ''}</div>
      <p>${esc(s.note)}</p>
      ${renderReceiptGrid(s.receipt_ids, 'Stage receipts')}
    </div>`).join('<div class="chain-arrow">↓</div>');
  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(c.chain_label, entityReceiptIds('chain', id))}<div class="badge-row"><span class="badge">${esc(humanLabel(c.pattern))}</span>${evidenceBadge(c.evidence_class)}</div></div>
    <div class="panel why-no-hop"><span class="panel-label">Inference boundary</span><h3>Why this is context, not a hop</h3><p>${esc(c.why_no_hop)}</p></div>
    <div class="panel"><span class="panel-label">Documented sequence</span><h3>Pathway stages</h3><div class="surface-list">${stages}</div></div>
  `;
}

function hopWindow(basis) {
  if (!basis || basis.temporal_status === 'undated' || (!basis.valid_from && !basis.valid_until)) return ' [date unknown; all-time only]';
  if (basis.temporal_status !== 'dated') return ' [dates incomplete; not time-sliceable]';
  return ` [${basis.valid_from ?? '…'} → ${basis.valid_until ?? 'ongoing'}]`;
}

function pathRole(hop, basis, actorId) {
  const edge = state.hopEdgeByPair.get(`${hop.from}||${hop.to}`);
  if (!edge) return 'named participant';
  return actorId === edge.actor_a ? (basis.actor_a_role || 'named participant') : (basis.actor_b_role || 'named participant');
}

function renderPath(path) {
  const steps = [];
  for (let i = 0; i < path.actor_path.length; i++) {
    steps.push(`<div class="path-step" role="listitem"><span class="path-node">${esc(labelActor(path.actor_path[i]))}</span></div>`);
    const hop = path.hops[i];
    if (hop) {
      const basis = hop.shared_surfaces[0];
      const extra = hop.shared_surfaces.length > 1 ? ` + ${hop.shared_surfaces.length - 1} alternate basis${hop.shared_surfaces.length === 2 ? '' : 'es'}` : '';
      steps.push(`<div class="path-step path-connector" role="listitem"><span class="path-surface">via ${esc(basis?.surface_label || basis?.surface_id)}${esc(hopWindow(basis))}${esc(extra)}</span></div>`);
    }
  }
  const hopCards = path.hops.map((h, index) => `<div class="panel" style="box-shadow:none"><span class="panel-label">Hop ${index + 1} · ${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}</span><div class="surface-list">${h.shared_surfaces.map(basis => `
      <div class="surface-card surface-card--basis">
        <h4>${esc(basis.surface_label)}</h4>
        <div class="badge-row">${evidenceBadge(basis.evidence_class)}<span class="badge">${esc(humanLabel(basis.temporal_status))}</span></div>
        <p class="meta"><strong>${esc(labelActor(h.from))}</strong>: ${esc(pathRole(h, basis, h.from))}<br><strong>${esc(labelActor(h.to))}</strong>: ${esc(pathRole(h, basis, h.to))}<br>${esc(hopWindow(basis).replace(/^ \[|\]$/g, ''))}</p>
        ${renderReceiptGrid(basis.receipt_ids, 'Hop receipts')}
        <div class="evidence-note">Supports documented shared context on this bounded surface. Does not establish contact, influence, coordination, agreement, or wrongdoing.</div>
      </div>`).join('')}</div></div>`).join('');
  return `<div class="path-timeline" role="list" aria-label="Text version of the route">${steps.join('')}</div>${hopCards}`;
}

function renderReceiptGrid(ids, label = 'Receipts') {
  const refs = receiptRefs(ids);
  if (!refs.length) return '<p class="meta">No receipt record is available.</p>';
  return `<div class="receipt-grid" role="list" aria-label="${esc(label)}">${refs.map(ref => {
    const healthClass = ref.health === 'lost' ? 'receipt-health--lost' : ref.health === 'warning' ? 'receipt-health--warn' : '';
    const actions = [
      `<button class="receipt-link receipt-link--internal" type="button" data-open-receipt="${esc(ref.id)}">Inspect receipt</button>`,
      ref.url ? `<a class="receipt-link" href="${esc(ref.url)}" target="_blank" rel="noreferrer">${ref.local ? 'Open record' : 'Original source'} ↗</a>` : '',
      ref.archiveUrl ? `<a class="receipt-link" href="${esc(ref.archiveUrl)}" target="_blank" rel="noreferrer">Archived copy ↗</a>` : '',
    ].filter(Boolean).join('');
    return `<article class="receipt-card" role="listitem"><div class="receipt-card-header"><h4>${esc(ref.label)}</h4><span class="receipt-health ${healthClass}" title="${esc(ref.healthLabel)}" aria-hidden="true"></span><span class="sr-only">${esc(ref.healthLabel)}</span></div><div class="meta">${esc(humanLabel(ref.evidenceClass || 'unknown'))} · ${esc(humanLabel(ref.sourceType || 'source'))}${ref.checked ? ` · checked ${esc(ref.checked)}` : ''}</div>${actions ? `<div class="receipt-actions">${actions}</div>` : `<p class="meta">${esc(ref.healthLabel)}</p>`}</article>`;
  }).join('')}</div>`;
}

function renderSurfaceCard(id) {
  const s = surface(id);
  if (!s) return '';
  const cls = s.hop_eligible ? 'surface-card--hop' : 'surface-card--nonhop';
  return `<article class="surface-card ${cls}"><h4>${esc(s.surface_label)}</h4><div class="meta">${esc(humanLabel(s.surface_type))} · ${s.hop_eligible ? 'hop-eligible' : 'context only'} · ${esc(humanLabel(s.status))}</div><div class="badge-row">${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(humanLabel(t))}</span>`).join('')}</div><p>${esc(s.notes || '')}</p>${renderReceiptGrid(s.receipt_ids, 'Surface receipts')}<div class="surface-card-footer"><span class="meta">${(s.participants ?? []).length} documented participant${(s.participants ?? []).length === 1 ? '' : 's'}</span><a href="#surface/${encodeURIComponent(s.surface_id)}">Inspect surface →</a></div></article>`;
}

function renderOrg(id) {
  const org = state.orgs.get(id);
  const score = state.orgScores.get(id);
  if (!org) return renderNotFound('organization', id);
  setDocumentTitle(org.label);
  $('#summary').innerHTML = [
    metricPanel('Surface Count', score?.surface_count),
    metricPanel('Factory Score', score?.factory_score),
    metricPanel('Surface Factory', score?.surface_factory ? 'yes' : 'no'),
    metricPanel('Types', score?.surface_types?.length ?? 0),
  ].join('');
  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(org.label, entityReceiptIds('organization', id))}<p>${score?.surface_factory ? 'This organization behaves as a surface factory. It must be decomposed into bounded surfaces, not used as a generic hop node.' : 'Organization context. It does not create Clifford hops by itself.'}</p></div>
    <div class="panel"><h3>Surfaces</h3><div class="surface-list">${(score?.surfaces ?? []).map(renderSurfaceCard).join('')}</div></div>
  `;
}

function humanLabel(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function renderCandidate(id) {
  const candidate = state.candidates.get(id);
  if (!candidate) return renderNotFound('candidate', id);
  setDocumentTitle(candidate.label);
  const sourceUrl = safeExternalUrl(candidate.source_url);
  $('#summary').innerHTML = [
    metricPanel('Status', humanLabel(candidate.status ?? 'intake only')),
    metricPanel('Kind', humanLabel(candidate.kind ?? 'candidate')),
    metricPanel('Clifford Number', 'N/A'),
    metricPanel('Graph Effect', 'None'),
  ].join('');
  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(candidate.label, entityReceiptIds('candidate', id))}<div class="badge-row"><span class="badge">intake candidate</span><span class="badge">${esc(candidate.kind)}</span></div></div>
    <div class="panel why-no-hop"><h3>Not a graph claim yet</h3><p>${esc(candidate.why_visible || 'Visible for intake only. This is not a Clifford hop, score, or relationship claim.')}</p></div>
    <div class="panel"><h3>Promotion path</h3><p>${esc(candidate.next_step || 'Promote only after a bounded public surface and receipt are available.')}</p><p class="meta">Source to review: ${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noreferrer">${esc(sourceUrl)}</a>` : candidate.source_url ? `${esc(candidate.source_url)} (unsafe or unsupported URL)` : 'none'}</p></div>
    ${(candidate.aliases ?? []).length ? `<div class="panel"><h3>Search aliases</h3><p>${candidate.aliases.map(esc).join(', ')}</p></div>` : ''}
  `;
}

function renderSurface(id) {
  const s = surface(id);
  if (!s) return renderNotFound('surface', id);
  setDocumentTitle(s.surface_label);
  $('#summary').innerHTML = [
    metricPanel('Hop Eligible', s.hop_eligible ? 'yes' : 'no'),
    metricPanel('Scorable', s.scorable ? 'yes' : 'no'),
    metricPanel('Participants', s.participants?.length ?? 0),
    metricPanel('Type', s.surface_type),
  ].join('');
  const roster = partitionParticipantRows(s.participants ?? []);
  const renderRows = rows => rows.map(p => `<li>${p.participant_type === 'actor' ? esc(labelActor(p.actor_id)) : esc(labelOrg(p.organization_id))}: ${esc(p.role)} <span class="meta">${esc(p.participation_type)}</span></li>`).join('');
  const parts = `<ul>${renderRows(roster.preview)}</ul>${roster.remaining.length ? `
    <p class="meta">First ${roster.preview.length} of ${roster.total} participant records. Display order is unchanged; this is not a count of unique people.</p>
    <details class="participant-overflow"><summary>Show remaining ${roster.remaining.length} participant records</summary><ul>${renderRows(roster.remaining)}</ul></details>` : ''}`;
  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(s.surface_label, entityReceiptIds('surface', id))}<div class="badge-row"><span class="badge">${esc(s.surface_type)}</span>${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes || '')}</p></div>
    <div class="panel"><h3>Participants</h3>${parts}</div>
    <div class="panel"><h3>Bounded by</h3><p>${(s.bounded_by ?? []).map(esc).join(', ')}</p>${renderReceiptGrid(s.receipt_ids, 'Surface receipts')}</div>
  `;
}

/* ---------------- Claims Desk ----------------
   Editor-facing verification: two names in, a verdict out — documented or
   not, for which dates, on what class of source — plus copy-ready standards
   language and the map's standing refusals. All checks run client-side on
   the same built artifacts the map uses. */

const EVIDENCE_RANK = { confirmed: 0, official: 1, government_record: 1, primary_public: 2, reported: 3, derived: 4, judgment: 5, open: 6 };
const EVIDENCE_LABEL = {
  confirmed: 'confirmed source', official: 'official document', government_record: 'government record', primary_public: 'primary public source', reported: 'news reporting',
  derived: 'derived inference', judgment: 'editorial judgment', open: 'open/unverified',
};

function periodStart(v) { if (!v) return null; v = String(v).trim(); if (/^\d{4}$/.test(v)) return `${v}-01-01`; if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`; return v; }
function periodEnd(v) {
  if (!v) return null; v = String(v).trim();
  if (/^\d{4}$/.test(v)) return `${v}-12-31`;
  if (/^\d{4}-\d{2}$/.test(v)) { const [y, m] = v.split('-').map(Number); return `${v}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; }
  return v;
}
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
  if (basis.temporal_status !== 'dated') return 'dates incomplete — available for all-time topology, not a dated claim';
  return `${basis.valid_from ?? '…'} → ${basis.valid_until ?? 'ongoing'}`;
}
function chainWeakest(hops) {
  let worst = 'confirmed';
  for (const h of hops) {
    const best = h.bases.reduce((acc, b) => (EVIDENCE_RANK[b.evidence_class] ?? 5) < (EVIDENCE_RANK[acc] ?? 5) ? b.evidence_class : acc, h.bases[0]?.evidence_class ?? 'judgment');
    if ((EVIDENCE_RANK[best] ?? 5) > (EVIDENCE_RANK[worst] ?? 5)) worst = best;
  }
  return worst;
}
function receiptRefs(ids) {
  return (ids ?? []).map(id => {
    const r = mergeReceiptRecords(state.receiptCatalog.get(id), state.receipts.get(id), state.caseReceipts.get(id));
    if (!r) return { id, label: id, url: null, archiveUrl: null, health: 'warning', healthLabel: 'Receipt record missing' };
    const path = String(r.path || '');
    const localPath = safeLocalReceiptPath(path);
    const externalUrl = safeExternalUrl(r.url || r.source_url || path);
    const local = Boolean(localPath && !externalUrl);
    const url = externalUrl || localPath;
    const archiveUrl = safeExternalUrl(r.archive_url || r.archive?.url || r.archive?.ref);
    const lost = r.archive?.method === 'unrecoverable_local_paste';
    const warning = !lost && !r.archive?.ref;
    return {
      id,
      label: r.label || id,
      url,
      local,
      archiveUrl,
      evidenceClass: r.evidence_class,
      sourceType: r.source_type,
      checked: r.archive?.checked,
      health: lost ? 'lost' : warning ? 'warning' : 'healthy',
      healthLabel: lost ? 'Original source is recorded as unrecoverable' : warning ? 'No archived copy recorded' : 'Source has an archival reference',
    };
  });
}

function citationContext(label, receiptIds = []) {
  const receipts = receiptRefs([...new Set(receiptIds)]).map(receipt => ({
    id: receipt.id,
    label: receipt.label,
    url: receipt.url ? new URL(receipt.url, location.href).href : null,
    archive_url: receipt.archiveUrl || null
  }));
  return {
    title: label,
    url: location.href,
    accessed: new Date().toISOString().slice(0, 10),
    receipts
  };
}
function evidenceBadge(cls) { return `<span class="badge ev ev-${esc(cls)}">${esc(EVIDENCE_LABEL[cls] || cls)}</span>`; }

function deskRejectionsFor(a, b) {
  return (state.hopGraph.rejected_hop_pairs ?? []).filter(p =>
    (!a && !b) || ((p.actor_a === a && p.actor_b === b) || (p.actor_a === b && p.actor_b === a)));
}

async function copyDeskText(btnId, text) {
  try {
    const btn = document.getElementById(btnId);
    await copyFeedback(btn, text);
  } catch (err) {
    console.warn('Could not copy desk text', err);
  }
}
window.copyDeskText = copyDeskText;

function bestDeskBasis(hop) {
  return [...(hop.bases ?? [])].sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))[0];
}

function buildPrintableText(fromId, toId, asOf, path) {
  const lines = [];
  const when = asOf ? ` during ${asOf}` : '';
  lines.push(`${labelActor(fromId)} is ${path.number} documented step${path.number === 1 ? '' : 's'} from ${labelActor(toId)} in the Clifford Number map${when}.`);
  lines.push('');
  path.hops.forEach((h, i) => {
    const b = bestDeskBasis(h);
    const win = b.temporal_status === 'dated' ? ` between ${b.valid_from} and ${b.valid_until ?? 'the present'}` : ' (the source does not support placing this shared context in time)';
    const roles = [`${labelActor(h.from)} as ${roleOnBasis(b, h.edge, h.from) || 'named participant'}`, `${labelActor(h.to)} as ${roleOnBasis(b, h.edge, h.to) || 'named participant'}`].join('; ');
    const refs = receiptRefs(b.receipt_ids).map(r => r.url ? `${r.label} — ${r.url}` : r.archiveUrl ? `${r.label} — ${r.archiveUrl}` : `${r.label} [source unavailable]`).join(' · ');
    lines.push(`${i + 1}. ${labelActor(h.from)} and ${labelActor(h.to)} were both named participants in ${b.surface_label}${win} (${roles}). Source: ${refs}`);
  });
  lines.push('');
  lines.push(`Sourcing floor for this chain: ${EVIDENCE_LABEL[chainWeakest(path.hops)]}.`);
  lines.push('This asserts documented shared context only. It is not a claim of influence, coordination, or wrongdoing.');
  return lines.join('\n');
}

function renderDeskHop(h) {
  const bases = h.bases.map(b => `
    <div class="surface-card surface-card--basis">
      <h4>${esc(b.surface_label)}</h4>
      <div class="meta">${esc(deskWindowText(b))}</div>
      <div class="badge-row">${evidenceBadge(b.evidence_class)}${b.temporal_status !== 'dated' ? '<span class="badge">not time-sliceable</span>' : ''}</div>
      <p class="meta">${esc(labelActor(h.from))}: ${esc(roleOnBasis(b, h.edge, h.from) || 'named participant')}<br>${esc(labelActor(h.to))}: ${esc(roleOnBasis(b, h.edge, h.to) || 'named participant')}</p>
      ${renderReceiptGrid(b.receipt_ids, 'Connection receipts')}
      <div class="evidence-note">Supports documented shared context on this bounded surface only. It does not establish contact, influence, coordination, agreement, or wrongdoing.</div>
    </div>`).join('');
  return `<div class="panel"><h3>${esc(labelActor(h.from))} ↔ ${esc(labelActor(h.to))}</h3><p class="meta">Both named in:</p><div class="surface-list">${bases}</div></div>`;
}

function renderStandingRefusals() {
  const rejected = state.hopGraph.rejected_hop_pairs ?? [];
  const dense = state.surfaceGraph.surfaces.filter(s => !s.hop_eligible && (s.participants ?? []).filter(p => p.participant_type === 'actor').length >= 20);
  const items = rejected.map(p => {
    const verified = p.publication_status === 'verified';
    const status = verified ? 'Verified refusal' : 'Review required';
    const finding = verified
      ? `The directly supported actor windows do not overlap. No connection is asserted through this surface.`
      : `The ledger windows do not overlap, but the decisive actor-window receipts are not publicly re-verifiable. This compiler rejection is not published as a checked negative finding.`;
    return `<div class="receipts"><div class="badge-row"><span class="badge">${status}</span>${evidenceBadge(p.evidence_class || 'judgment')}</div><p>${esc(labelActor(p.actor_a))} × ${esc(labelActor(p.actor_b))} — both appear on ${esc(surface(p.surface_id)?.surface_label || p.surface_id)} (${esc(p.actor_a_window?.valid_from ?? '?')} → ${esc(p.actor_a_window?.valid_until ?? 'ongoing')} vs ${esc(p.actor_b_window?.valid_from ?? '?')} → ${esc(p.actor_b_window?.valid_until ?? 'ongoing')}). ${esc(finding)}</p>${renderReceiptGrid(p.receipt_ids, 'Window and surface receipts')}</div>`;
  }).join('');
  return `<div class="panel why-no-hop"><h3>What this map declines to say</h3>
    <p>Compiler refusals remain visible with their publication status. Only refusals whose two actor windows have direct, publicly re-verifiable receipts qualify as checked findings.</p>
    ${items || '<p class="meta">No standing rejections.</p>'}
    ${dense.length ? `<p class="meta"><strong>Dense-surface guard:</strong> ${dense.map(s => `${esc(s.surface_label)} (${(s.participants ?? []).filter(p => p.participant_type === 'actor').length} actors)`).join('; ')} remain visible context but create no person-to-person hops.</p>` : ''}
    <p class="meta">Undated participation is never placed in time: a person whose stint carries no documented dates can appear in all-time results but never in an "as of" answer.</p></div>`;
}

function initDesk() {
  $('#desk-actors').innerHTML = state.surfaceGraph.actors
    .filter(a => state.actorScores.has(a.id))
    .map(a => `<option value="${esc(a.label)}"></option>`).join('');
  const examples = [
    { from: 'keir-starmer', to: 'matt-clifford', asOf: '2025', label: 'Starmer × Clifford, as of 2025' },
    { from: 'ben-warner', to: 'dominic-cummings', asOf: '2020', label: 'Ben Warner × Dominic Cummings, as of 2020' },
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
  state.citation = null;

  if (fromId === toId) {
    parts.push(deskVerdict('warn', 'Same person', '<p>Both names resolve to the same entry.</p>'));
  } else if (path) {
    setDocumentTitle(`${labelActor(fromId)} → ${labelActor(toId)}`);
    const pathReceiptIds = [...new Set(path.hops.flatMap(hop => hop.bases.flatMap(basis => basis.receipt_ids ?? [])))];
    state.citation = citationContext(`${labelActor(fromId)} → ${labelActor(toId)}${asOf ? `, as of ${asOf}` : ''}`, pathReceiptIds);
    const floor = chainWeakest(path.hops);
    const officialClass = (EVIDENCE_RANK[floor] ?? 9) <= 1;
    parts.push(deskVerdict('ok', `Documented: ${path.number} step${path.number === 1 ? '' : 's'}${asOf ? ` as of ${asOf}` : ''}`,
      `<p>${esc(labelActor(fromId))} connects to ${esc(labelActor(toId))} through ${path.number === 1 ? 'a shared bounded surface' : `${path.number} shared bounded surfaces`}${asOf ? `, with every link's documented window overlapping ${esc(asOf)}` : ''}.</p>
       <div class="badge-row"><span class="badge">sourcing floor:</span>${evidenceBadge(floor)}</div>
       ${!officialClass ? `<p class="meta">At least one link rests on ${esc(EVIDENCE_LABEL[floor])} rather than an official-class record. Flag before print.</p>` : '<p class="meta">Every link in this chain carries official-class sourcing.</p>'}`));
    const topologyPath = { actor_path: [fromId, ...path.hops.map(h => h.to)], hops: path.hops.map(h => ({ from: h.from, to: h.to, shared_surfaces: h.bases })) };
    parts.push(`<div class="panel"><span class="panel-label">Route overview</span><h3>${esc(labelActor(fromId))} → ${esc(labelActor(toId))}</h3>${renderTopologyMap(topologyPath)}</div>`);
    parts.push(...path.hops.map(renderDeskHop));
    const printable = buildPrintableText(fromId, toId, asOf, path);
    parts.push(`<div class="panel"><div class="entity-heading"><h3>What you can print</h3><div class="entity-actions"><button id="desk-copy-btn" class="copy-link" onclick="copyDeskText('desk-copy-btn', this.dataset.text)" data-text="${esc(printable)}">Copy text</button>${citationActions()}</div></div><pre class="printable">${esc(printable)}</pre></div>`);
  } else if (asOf && allTime) {
    parts.push(deskVerdict('warn', `Not documented for ${asOf}`,
      `<p>A documented all-time connection exists (${allTime.number} step${allTime.number === 1 ? '' : 's'}), but it cannot be placed at ${esc(asOf)}: either the documented windows do not overlap that period, or a link in the chain involves a stint with no documented dates — and this map never asserts co-presence it cannot date.</p>
       <p class="meta">You can report the connection without the date, or find a document that dates the undated stint. Clear the "as of" field to see the all-time chain.</p>`));
  } else {
    parts.push(deskVerdict('no', 'No documented connection',
      `<p>No chain of shared bounded surfaces connects ${esc(labelActor(fromId))} and ${esc(labelActor(toId))}${asOf ? ` during ${esc(asOf)}` : ''} in this corpus. That is a statement about the documentation gathered here, not proof of absence.</p>`));
  }

  if (directRejections.length) {
    const verifiedDirect = directRejections.filter(p => p.publication_status === 'verified').length;
    parts.push(`<div class="panel why-no-hop"><h3>${verifiedDirect === directRejections.length ? 'Checked and declined' : 'Compiler refusal · review required'}</h3>${directRejections.map(p => {
      const verified = p.publication_status === 'verified';
      const finding = verified
        ? 'The direct actor-window receipts support the non-overlap, so the compiler declined this connection.'
        : 'The ledger windows do not overlap, but their decisive receipts are judgment-class and unrecoverable. This remains review-required and is not a verified negative finding.';
      return `<div class="receipts"><div class="badge-row"><span class="badge">${verified ? 'Verified refusal' : 'Review required'}</span>${evidenceBadge(p.evidence_class || 'judgment')}</div><p>These two both appear on <strong>${esc(surface(p.surface_id)?.surface_label || p.surface_id)}</strong> (${esc(labelActor(p.actor_a))}: ${esc(p.actor_a_window?.valid_from ?? '?')} → ${esc(p.actor_a_window?.valid_until ?? 'ongoing')}; ${esc(labelActor(p.actor_b))}: ${esc(p.actor_b_window?.valid_from ?? '?')} → ${esc(p.actor_b_window?.valid_until ?? 'ongoing')}). ${esc(finding)}</p>${renderReceiptGrid(p.receipt_ids, 'Window and surface receipts')}</div>`;
    }).join('')}</div>`);
  }
  parts.push(renderStandingRefusals());
  out.innerHTML = parts.join('');
  announce(`Connection check updated for ${labelActor(fromId)} and ${labelActor(toId)}${asOf ? ` as of ${asOf}` : ''}.`);
}

init().catch(err => {
  console.error(err);
  const status = $('#app-status');
  if (status) status.innerHTML = `<span>Could not load the compiled release: ${esc(err.message)}</span>`;
  $('#detail').innerHTML = `<div class="panel why-no-hop"><h2>Load error</h2><p>${esc(err.message)}</p><p>Run <code>npm run compile</code>, then reload this page.</p></div>`;
});
