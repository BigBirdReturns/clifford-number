import { decodeHashPart, formatCitation, safeExternalUrl, validAsOf } from './src/ui-utils.js';
import { applyTranslations, normalizeLocale, translate } from './src/i18n.js';
import { shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections } from './src/route-projections.js';
import { releaseDelta, summarizeDelta } from './src/release-delta.js';
import { EVIDENCE_RANK } from './src/evidence-rank.js';

const PREFERENCES_KEY = 'clifford-preferences';
const state = {
  searchResults: [], searchActiveIndex: -1, locale: 'en', preferences: {}, citation: null,
  tracks: new Map(), trackHarnesses: new Map(), cases: new Map(), caseIndex: new Map(),
  claims: new Map(), caseReceipts: new Map(), claimCatalog: new Map(), receiptCatalog: new Map(), claimKeyById: new Map(), catalogCounts: {},
  networkMode: 'research', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null,
  networkLevel: null, networkScale: 1, networkSelectedId: null,
  networkPinned: new Set(), networkSearchIds: new Set(), networkRouteIds: new Set(),
  overviewActiveTab: 'visible', overviewSortKey: null, overviewSortDirection: 'asc',
  overviewSurfaceId: null, overviewHighlightSurfaceId: null,
  deskProjection: 'clifford', activeRoute: null,
  atlasProjection: null, atlasProjectionBaseline: null, releaseDeltaModel: null
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

/* ---------------- Record inspector provenance (ladder step 5, "Record inspector provenance") ----------------
   inspectorBreadcrumbModel is the pure crumb-list builder (vm-testable):
   mode -> object -> claim, each optional, in that fixed order, so a partial
   origin (e.g. no claim yet) still produces an honest partial breadcrumb.
   atlasInspectorOrigin/renderInspectorBreadcrumb/openEvidenceDialog/
   closeEvidenceDialog are the impure wiring around it -- only they touch
   state/DOM. The dialog is shared across the whole site (claim/receipt
   buttons exist outside the atlas too), so `origin` is optional everywhere:
   without it the toolbar keeps its old plain label and no origin-anchored
   animation runs. */

function inspectorBreadcrumbModel({ mode, objectLabel, objectId, claimLabel } = {}) {
  const crumbs = [];
  if (mode) crumbs.push({ kind: 'mode', label: mode });
  if (objectLabel) crumbs.push({ kind: 'object', label: objectLabel, objectId: objectId ?? null });
  if (claimLabel) crumbs.push({ kind: 'claim', label: claimLabel });
  return crumbs;
}

// Origin context for a claim/receipt opened from inside the atlas: which
// mode was mounted, which object was selected, and the clicked element's
// screen rect (for the open animation's transform-origin). Returns null
// outside the atlas so non-atlas call sites (case pages, search results,
// the evidence overview) keep the plain non-animated open they had before.
function atlasInspectorOrigin(el) {
  const model = state.networkModel;
  if (!model) return null;
  const node = model.nodeById.get(state.networkSelectedId);
  return {
    mode: model.mode === 'hops' ? 'Verified surface hops' : 'Research network',
    objectId: state.networkSelectedId ?? null,
    objectLabel: node?.label ?? null,
    rect: el?.getBoundingClientRect?.() ?? null
  };
}

function renderInspectorBreadcrumb(origin, claimLabel) {
  const nav = $('#evidence-dialog-breadcrumb');
  const toolbarLabel = $('#evidence-dialog-toolbar-label');
  if (!nav) return;
  const crumbs = inspectorBreadcrumbModel({ mode: origin?.mode, objectLabel: origin?.objectLabel, objectId: origin?.objectId, claimLabel });
  if (!crumbs.length) {
    nav.innerHTML = '';
    nav.hidden = true;
    if (toolbarLabel) toolbarLabel.hidden = false;
    return;
  }
  if (toolbarLabel) toolbarLabel.hidden = true;
  nav.hidden = false;
  nav.innerHTML = crumbs.map((crumb, i) => `${i > 0 ? '<span class="evidence-breadcrumb-sep" aria-hidden="true">/</span>' : ''}<button type="button" class="evidence-breadcrumb-crumb" data-breadcrumb-kind="${esc(crumb.kind)}">${esc(crumb.label)}</button>`).join('');
  for (const [i, btn] of [...nav.querySelectorAll('[data-breadcrumb-kind]')].entries()) {
    const crumb = crumbs[i];
    if (crumb.kind === 'claim') continue; // the claim crumb names the current view; nothing to navigate to
    btn.addEventListener('click', () => {
      closeEvidenceDialog();
      if (crumb.kind === 'object' && crumb.objectId) selectNetworkNode(crumb.objectId);
    });
  }
}

// Contract Section 5 Rebuild, "Origin anchoring": scale/fade from the click
// origin's screen position, instant under reduced-motion. dialog.showModal()
// runs first so the (now fixed, side-anchored -- see styles.css) frame has a
// real layout box to compute the origin offset against.
function openEvidenceDialog(origin) {
  const dialog = $('#evidence-dialog');
  const frame = dialog?.querySelector('.evidence-dialog-frame');
  if (!dialog || !frame) return;
  state.evidenceDialogOrigin = origin ?? null;
  if (!dialog.open) dialog.showModal();
  const reduced = prefersReducedMotion();
  frame.classList.remove('evidence-dialog-frame--opening', 'evidence-dialog-frame--open');
  if (origin?.rect && !reduced) {
    const frameRect = frame.getBoundingClientRect();
    const originX = origin.rect.left + origin.rect.width / 2 - frameRect.left;
    const originY = origin.rect.top + origin.rect.height / 2 - frameRect.top;
    frame.style.transformOrigin = `${originX}px ${originY}px`;
    frame.classList.add('evidence-dialog-frame--opening');
    void frame.getBoundingClientRect();
    frame.classList.add('evidence-dialog-frame--open');
    setTimeout(() => frame.classList.remove('evidence-dialog-frame--opening', 'evidence-dialog-frame--open'), 220);
  } else {
    frame.style.transformOrigin = '';
  }
}

// On close, the originating object is untouched: nothing here ever writes
// state.networkView or calls selectNetworkNode -- the origin object (already
// selected before the dialog opened, in every atlas call site) simply stays
// selected and haloed, camera unmoved, exactly per the acceptance check.
function closeEvidenceDialog() {
  $('#evidence-dialog')?.close();
}

function initEvidenceDialog() {
  const dialog = $('#evidence-dialog');
  $('#evidence-dialog-close')?.addEventListener('click', closeEvidenceDialog);
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeEvidenceDialog();
  });
  document.addEventListener('click', event => {
    const claimButton = event.target.closest?.('[data-open-claim]');
    if (claimButton) {
      event.preventDefault();
      const inAtlas = !!claimButton.closest('#network-atlas, #evidence-overview');
      openClaimDialog(claimButton.dataset.openClaim, inAtlas ? atlasInspectorOrigin(claimButton) : null);
      return;
    }
    const receiptButton = event.target.closest?.('[data-open-receipt]');
    if (receiptButton) {
      event.preventDefault();
      const inAtlas = !!receiptButton.closest('#network-atlas, #evidence-overview');
      openReceiptDialog(receiptButton.dataset.openReceipt, inAtlas ? atlasInspectorOrigin(receiptButton) : null);
    }
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
  const sourceUrl = safeExternalUrl(receipt.url || receipt.source_url || '');
  const archiveUrl = safeExternalUrl(receipt.archive_url || receipt.archive?.url || '');
  const links = [
    sourceUrl ? `<a class="receipt-link" href="${esc(sourceUrl)}" target="_blank" rel="noreferrer">Open original source ↗</a>` : '',
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
      ${receipt.published_at ? `<div><dt>Published</dt><dd>${esc(receipt.published_at)}</dd></div>` : ''}
      ${receipt.retrieved_at ? `<div><dt>Retrieved</dt><dd>${esc(receipt.retrieved_at)}</dd></div>` : ''}
    </dl>
    ${receipt.extract ? `<div class="receipt-locator"><strong>Relevant locator or excerpt</strong><p>${esc(receipt.extract)}</p></div>` : receipt.notes ? `<div class="receipt-locator"><strong>What this receipt supports</strong><p>${esc(receipt.notes)}</p></div>` : '<p class="meta">The public record has source metadata but no stored excerpt.</p>'}
    ${receipt.extract && receipt.notes ? `<p class="evidence-note"><strong>Qualification.</strong> ${esc(receipt.notes)}</p>` : ''}
    ${links ? `<div class="receipt-actions">${links}</div>` : '<p class="evidence-note">No safe public URL is available for this receipt.</p>'}
    ${claimLinks ? `<div class="related-claims"><strong>Claims using this receipt</strong>${claimLinks}</div>` : ''}
  </article>`;
}

async function openClaimDialog(id, origin = null) {
  const catalogItem = state.claimCatalog.get(id);
  if (catalogItem && !state.claims.has(id)) await loadCase(catalogItem.case_id);
  const claim = state.claims.get(id) ?? catalogItem;
  const dialog = $('#evidence-dialog');
  const content = $('#evidence-dialog-content');
  if (!claim || !dialog || !content) return;
  renderInspectorBreadcrumb(origin, shortLabel(claim.plain, 60));
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
  openEvidenceDialog(origin);
}

async function openReceiptDialog(id, origin = null) {
  const receiptId = id.includes('::') ? id.split('::').at(-1) : id;
  const catalogItem = state.receiptCatalog.get(receiptId);
  if (catalogItem && !state.caseReceipts.has(receiptId)) await loadCase(catalogItem.case_id);
  const raw = state.caseReceipts.get(receiptId);
  const graphReceipt = state.receipts.get(receiptId);
  const dialog = $('#evidence-dialog');
  const content = $('#evidence-dialog-content');
  const receipt = mergeReceiptRecords(catalogItem, graphReceipt, raw);
  if (!dialog || !content || !receipt) return;
  renderInspectorBreadcrumb(origin, receiptTitle(receipt));
  content.innerHTML = `<div><h2 id="evidence-dialog-title">Evidence receipt</h2>${receiptInspector(receipt)}</div>`;
  bindEvidenceActions(content);
  openEvidenceDialog(origin);
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
function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'Topology explorer — The Clifford Number'; }
function announce(message) { const status = $('#view-status'); if (status) status.textContent = message; }

async function init() {
  initPreferences();
  const [surfaceGraph, hopGraph, scores, legacyGraph, scout, receiptGraph, publicCatalog, atlasProjection, atlasProjectionBaseline] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] })),
    // Ladder step 6 (corridors + release deltas): both are optional, derived,
    // disposable display artifacts. The atlas must keep working without them.
    loadJson('build/atlas-projection.json').catch(() => null),
    loadJson('build/atlas-projection-baseline.json').catch(() => null)
  ]);
  state.surfaceGraph = surfaceGraph;
  state.atlasProjection = atlasProjection;
  state.atlasProjectionBaseline = atlasProjectionBaseline;
  state.releaseDeltaModel = releaseStripModel(atlasProjection, atlasProjectionBaseline);
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
  $('#release-strip').innerHTML = `<div>${esc(`${state.catalogCounts.tracks ?? state.tracks.size} research tracks · ${state.catalogCounts.cases ?? state.caseIndex.size} compiled cases · ${state.catalogCounts.claims ?? state.claimCatalog.size} public-indexed claims · ${publicReceiptCount()} unique receipt records`)}</div><div class="release-delta-line">${esc(state.releaseDeltaModel.message)}</div>`;
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

/* ---------------- Atlas representation ladder ----------------
   docs/atlas-representation-ladder.md governs this section. Zoom changes
   *representation*, never the underlying hop/edge data. Four independent
   layers — aggregate, corridor (placeholder; corridors ship in a later
   phase), local topology, screen-space label/selection — mount only what
   the current semantic level calls for. Selection persists across level
   changes because a selected node is always a suppression-bypass node:
   it never stops being individually rendered. */

const SEMANTIC_LEVEL_THRESHOLDS = {
  corpusToMachine: { enter: 1.40, exit: 1.25 },
  machineToSurface: { enter: 2.45, exit: 2.20 },
  surfaceToEvidence: { enter: 4.00, exit: 3.60 }
};
const SEMANTIC_LEVEL_RANK = { corpus: 0, machine: 1, surface: 2, evidence: 3 };
// Matches the dense-surface guard used elsewhere in this file (renderHome/renderMethod-adjacent context).
const DENSE_SURFACE_PARTICIPANT_THRESHOLD = 20;
// Legibility addendum rule 4: at the machine level, ordinary (non-bypass)
// nodes render small and unlabeled — the machine-level container overlay
// (buildAtlasMachineContainers) carries the labels that matter at this
// level. A selected/searched/routed/pinned node still gets a label because
// selectLabeledNodeIds always keeps the bypass set regardless of budget.
const LABEL_BUDGET = { corpus: 64, machine: 0, surface: 30, evidence: 48, route: 48 };
const NODE_KIND_RADIUS = { person: 7, entity: 9 };

// Legibility addendum rule 2: shape carries the ontology, not fill alone.
// Every node.type actually occurring in graph.json (the research-mode
// corpus) is mapped explicitly rather than relying on the fallback, plus the
// generic kinds the hop/surface corpus and the aggregate/container layers
// use. Unrecognised future types default to 'square' (organization-like —
// the safer default for an unknown institutional object, never 'circle',
// since a circle asserts "this is a person").
const GLYPH_SHAPE_BY_TYPE = {
  // circle — actors / individual people
  person: 'circle', actor: 'circle',
  // diamond — bounded surfaces / policy objects (the compiler's own
  // "bounded, named, receipted" object class)
  policy: 'diamond', 'infrastructure-policy': 'diamond', 'government-program': 'diamond',
  'private-forum': 'diamond', 'procurement-surface': 'diamond', surface: 'diamond',
  // square — organizations, companies, institutions, government bodies
  'control-plane': 'square', 'government-layer': 'square', 'government-office': 'square',
  'government-department': 'square', 'government-unit': 'square', 'data-infrastructure': 'square',
  'compute-infrastructure': 'square', 'state-market-unit': 'square', 'government-institute': 'square',
  'company-builder': 'square', 'education-org': 'square', 'government-agency': 'square',
  'data-company': 'square', company: 'square', 'military-unit': 'square', nonprofit: 'square',
  'sovereign-fund': 'square', 'capital-fund': 'square', 'government-institution': 'square',
  umbrella: 'square', organization: 'square', institution: 'square',
  // ring — aggregate/container objects (never a real node.type; the
  // aggregate and machine-container renderers ask for this shape directly)
  aggregate: 'ring', container: 'ring'
};
function glyphShapeFor(kind) {
  return GLYPH_SHAPE_BY_TYPE[kind] ?? 'square';
}

function atlasScale(view) {
  return NETWORK_FULL_VIEW.width / view.width;
}

// Legibility addendum rule 1: "ink never magnifies." Every point-anchored
// glyph is mounted as `translate(anchorX anchorY) scale(factor)` with a
// data-ink-anchor-x/y pair carrying the anchor forward; everything inside is
// authored in local/base (factor === 1) coordinates. Since factor is exactly
// the reciprocal of atlasScale (the amount the viewBox has zoomed), the group
// scale cancels the viewBox zoom for every child — radii, stroke width
// (already vector-effect: non-scaling-stroke for borders) and, crucially,
// CSS font-size, which SVG has no other way to hold constant under a viewBox
// zoom. applyInkScale re-runs this on every view change (zoom AND pan), not
// just on a level change, so ink stays screen-constant mid-gesture without a
// full remount.
function screenSpaceFactor(view) {
  return view.width / NETWORK_FULL_VIEW.width;
}

function applyInkScale(root, factor) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-ink-anchor-x]')) {
    el.setAttribute('transform', `translate(${el.dataset.inkAnchorX} ${el.dataset.inkAnchorY}) scale(${factor})`);
  }
  root.style?.setProperty?.('--atlas-ink-scale', String(factor));
}

// Local congestion: documented nodes per view-area, a coarse density proxy.
// Reserved for the R(e) = f(z, q, s, t, d, g, b) suppression formula in the
// design note; semanticLevel's own provisional bands do not gate on it
// either, but it is computed honestly here rather than stubbed at 0 so a
// later suppression pass has a real signal to read.
function atlasCongestion(model, view) {
  if (!model?.nodes?.length) return 0;
  const x1 = view.x + view.width, y1 = view.y + view.height;
  const visible = model.nodes.filter(node => node.x >= view.x && node.x <= x1 && node.y >= view.y && node.y <= y1).length;
  return (visible / Math.max(1, view.width * view.height)) * 100000;
}

// Provisional bands per the design note, plus hysteresis against the
// previously active level so the scene cannot flicker at a boundary: a
// crossing takes the "enter" threshold, holding the level takes the looser
// "exit" threshold in the same direction it was entered from.
function semanticLevel(scale, congestion, hasRoute, previousLevel) {
  if (hasRoute && scale >= 2.0) return 'route';
  const t = SEMANTIC_LEVEL_THRESHOLDS;
  // 'route' implies scale was already >= 2.0 (past the machine enter line), so treat it
  // as at-least-machine for hysteresis purposes without assuming it ever cleared surface.
  const prevRank = previousLevel === 'route' ? SEMANTIC_LEVEL_RANK.machine : (SEMANTIC_LEVEL_RANK[previousLevel] ?? 0);
  const atLeastMachine = scale >= (prevRank >= SEMANTIC_LEVEL_RANK.machine ? t.corpusToMachine.exit : t.corpusToMachine.enter);
  const atLeastSurface = atLeastMachine && scale >= (prevRank >= SEMANTIC_LEVEL_RANK.surface ? t.machineToSurface.exit : t.machineToSurface.enter);
  const atLeastEvidence = atLeastSurface && scale >= (prevRank >= SEMANTIC_LEVEL_RANK.evidence ? t.surfaceToEvidence.exit : t.surfaceToEvidence.enter);
  if (atLeastEvidence) return 'evidence';
  if (atLeastSurface) return 'surface';
  if (atLeastMachine) return 'machine';
  return 'corpus';
}

// Fixed per-type size. Degree no longer encodes visual mass anywhere in the
// atlas; it stays available as a displayed statistic (title/aria-label/badge).
// This is the LOCAL/base half-size (world units at factor === 1) that the
// shape renderer draws around its own glyph origin; screenSpaceFactor scales
// it the same way as everything else, so it never grows with degree AND
// never grows with zoom.
function atlasNodeRadius(node) {
  return NODE_KIND_RADIUS[node.type === 'person' ? 'person' : 'entity'];
}

function selectLabeledNodeIds(nodes, level, bypassIds) {
  const budget = LABEL_BUDGET[level] ?? 24;
  const always = nodes.filter(node => bypassIds.has(node.id));
  const rest = nodes.filter(node => !bypassIds.has(node.id)).sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0));
  return new Set([...always, ...rest.slice(0, Math.max(0, budget - always.length))].map(node => node.id));
}

// Search matches, the current selection, route members, and explicit pins
// bypass ordinary corpus-level suppression exactly per the design note.
function computeAtlasBypass(model, { searchIds, selectedId, routeIds, pinnedIds } = {}) {
  const bypass = new Set();
  for (const id of searchIds ?? []) if (model.nodeById.has(id)) bypass.add(id);
  if (selectedId && model.nodeById.has(selectedId)) bypass.add(selectedId);
  for (const id of routeIds ?? []) if (model.nodeById.has(id)) bypass.add(id);
  for (const id of pinnedIds ?? []) if (model.nodeById.has(id)) bypass.add(id);
  return bypass;
}

// Legibility addendum rule 6: which of two overlapping screen-space label
// boxes wins. Highest priority survives; a lower-priority label that
// overlaps a kept, higher-priority label is dropped rather than drawn on
// top of it. Order matches the design note exactly: selection outranks
// route membership, which outranks a search match, which outranks an
// explicit pin, which outranks an aggregate/container's own name, which
// outranks a plain statistic label.
const LABEL_PRIORITY_ORDER = ['selected', 'route', 'search', 'pinned', 'name', 'statistic'];
const LABEL_BOX_HEIGHT = 16;

function labelPriorityFor(id, { selectedId, routeIds, searchIds, pinnedIds } = {}) {
  if (id === selectedId) return 'selected';
  if (routeIds?.has(id)) return 'route';
  if (searchIds?.has(id)) return 'search';
  if (pinnedIds?.has(id)) return 'pinned';
  return 'statistic';
}

// `labels` are {id, x, y, widthEst, priority} with x/y in WORLD coordinates
// and widthEst already a constant SCREEN-space estimate (rule 1 keeps text
// screen-constant, so a label's on-screen footprint does not itself vary
// with zoom). What DOES vary with zoom is the screen-space DISTANCE between
// two world points: zooming in spreads them apart. `factor` (screenSpaceFactor
// of the current view) converts world coordinates to comparable screen-space
// ones via `1 / factor`, so re-running this with a new factor after a zoom
// naturally changes which labels collide — geometry decides the budget, not
// a fixed count. Greedy: process highest priority first, keep a label only
// if its screen-space box does not overlap an already-kept box.
function resolveLabelCollisions(labels, factor = 1) {
  const toScreen = factor > 0 ? 1 / factor : 1;
  const ranked = labels
    .map((label, index) => ({ ...label, index }))
    .sort((a, b) => (LABEL_PRIORITY_ORDER.indexOf(a.priority) - LABEL_PRIORITY_ORDER.indexOf(b.priority)) || a.index - b.index);
  const kept = new Set();
  const boxes = [];
  for (const label of ranked) {
    const w = label.widthEst ?? 60;
    const sx = label.x * toScreen, sy = label.y * toScreen;
    const box = { left: sx - w / 2, right: sx + w / 2, top: sy - LABEL_BOX_HEIGHT / 2, bottom: sy + LABEL_BOX_HEIGHT / 2 };
    const collides = boxes.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
    if (!collides) { kept.add(label.id); boxes.push(box); }
  }
  return kept;
}

function labelWidthEstimate(text, max) {
  return shortLabel(text, max).length * 6.4 + 12;
}

// Legibility addendum rule 3: corpus aggregates anchor across the FULL
// 1400x900 canvas rather than clustering near a centroid of their own
// members (the "six tiny circles in a black void" the operator rejected).
// A real per-organization/region anchor from build/atlas-projection.json is
// used when the aggregate's group id actually matches one (a future step,
// once aggregateGroup and atlas-projection ids share a vocabulary); every
// other group falls back to a deterministic grid cell — sorted group order,
// never Math.random/Date.now, so the same group always lands in the same
// cell release over release (stable geography).
function atlasFallbackGridAnchor(index, total) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, total))));
  const rows = Math.max(1, Math.ceil(Math.max(1, total) / cols));
  const marginX = 190, marginY = 160;
  const col = index % cols, row = Math.floor(index / cols);
  const x = cols === 1 ? 700 : marginX + (col * (1400 - marginX * 2)) / (cols - 1);
  const y = rows === 1 ? 450 : marginY + (row * (900 - marginY * 2)) / (rows - 1);
  return { x, y };
}

function atlasAggregateAnchor(group, index, total, atlasProjection) {
  const machine = (atlasProjection?.machines ?? []).find(m => m.organization_id === group);
  if (machine?.position) return { x: machine.position.x, y: machine.position.y };
  const region = (atlasProjection?.regions ?? []).find(r => r.case_id === group);
  if (region?.position) return { x: region.position.x, y: region.position.y };
  return atlasFallbackGridAnchor(index, total);
}

// sqrt-area-encodes the declared count (member population), clamped so an
// aggregate is always "large enough to read at arm's length" even for a
// one-member group, and never dominates the canvas for a large one. This is
// the LOCAL/base radius at factor === 1; screenSpaceFactor keeps it
// screen-constant exactly like every other glyph.
const AGGREGATE_RADIUS_MIN = 55, AGGREGATE_RADIUS_MAX = 130;
function atlasAggregateRadius(memberCount) {
  return Math.max(AGGREGATE_RADIUS_MIN, Math.min(AGGREGATE_RADIUS_MAX, 28 + Math.sqrt(Math.max(1, memberCount)) * 13));
}

// Honest evidence-class composition of the edges actually internal to this
// aggregate (both endpoints members) — never a fabricated or borrowed
// number. Buckets reuse evidenceBand() so the ring's colors match the
// existing edge/legend palette exactly.
function atlasAggregateEvidenceComposition(model, memberSet) {
  const byBand = {};
  let total = 0;
  for (const edge of model.edges) {
    if (!memberSet.has(edge.from) || !memberSet.has(edge.to)) continue;
    const band = evidenceBand(edge.evidence_class);
    byBand[band] = (byBand[band] ?? 0) + 1;
    total += 1;
  }
  return { total, byBand };
}

// Corpus-level aggregate objects. Every aggregate names its denominator:
// "<edgeCount> documented edges of <totalEdgeCount> total". Grouping reuses
// the existing keyword cluster in research mode and the existing Clifford
// Number ring in hops mode (see aggregateGroup on each model node) — an
// additive representation label, not a change to hop/edge data. `atlasProjection`
// is optional (defaults to null, matching state.atlasProjection's own default)
// so every existing call site/test that only passes `model` keeps working.
function buildAtlasAggregates(model, atlasProjection = null) {
  const groups = new Map();
  for (const node of model.nodes) {
    const group = node.aggregateGroup ?? node.cluster ?? 'other';
    if (!groups.has(group)) groups.set(group, { group, nodeIds: [] });
    groups.get(group).nodeIds.push(node.id);
  }
  const totalEdgeCount = model.edges.length;
  const orderedGroups = [...groups.keys()].sort();
  return orderedGroups.map((group, index) => {
    const bucket = groups.get(group);
    const memberSet = new Set(bucket.nodeIds);
    const edgeCount = model.edges.filter(edge => memberSet.has(edge.from) && memberSet.has(edge.to)).length;
    const anchor = atlasAggregateAnchor(group, index, orderedGroups.length, atlasProjection);
    return {
      id: `agg-${bucket.group}`,
      group: bucket.group,
      label: humanLabel(bucket.group.replace(/^hop-ring-/, 'hop distance ')),
      memberIds: bucket.nodeIds,
      memberCount: bucket.nodeIds.length,
      edgeCount, totalEdgeCount,
      metricLabel: `${edgeCount} documented edge${edgeCount === 1 ? '' : 's'} of ${totalEdgeCount} total`,
      evidenceComposition: atlasAggregateEvidenceComposition(model, memberSet),
      radius: atlasAggregateRadius(bucket.nodeIds.length),
      x: anchor.x,
      y: anchor.y
    };
  });
}

// Contract Section 2/3 Rebuild, "Region washes": faint labeled background
// zones so spacing means territory, persisting (fainter) into machine level.
// Deterministic from the same aggregate anchor data already computed for the
// ring layer -- one wash per aggregate group, an ellipse sized off that
// aggregate's own radius, so it never needs a second anchor system or a
// second pass over model.nodes.
function buildAtlasRegionWashes(aggregates) {
  return aggregates.map(agg => ({
    id: `wash-${agg.group}`,
    group: agg.group,
    label: agg.label,
    x: agg.x, y: agg.y,
    rx: agg.radius * 2.7,
    ry: agg.radius * 2.05
  }));
}

function renderRegionWashGlyph(wash, factor = 1) {
  const encoding = `${wash.label} -- region wash (territory, not a count)`;
  return `<g class="atlas-wash" data-encoding="${esc(encoding)}">
    <ellipse class="atlas-wash-fill" cx="${wash.x}" cy="${wash.y}" rx="${wash.rx}" ry="${wash.ry}"/>
    <g data-ink-anchor-x="${wash.x}" data-ink-anchor-y="${wash.y - wash.ry - 6}" transform="translate(${wash.x} ${wash.y - wash.ry - 6}) scale(${factor})">
      <text class="atlas-wash-label" text-anchor="middle">${esc(shortLabel(wash.label, 30))}</text>
    </g>
  </g>`;
}

// Individually-rendered nodes for the current level. At corpus, only the
// suppression-bypass set renders individually — the rest of the corpus is
// represented by aggregates, never by a silently hidden node. At
// machine/surface/evidence every node renders, all at the same fixed radius.
function buildAtlasIndividualNodes(model, level, bypassIds) {
  const nodes = level === 'corpus' ? model.nodes.filter(node => bypassIds.has(node.id)) : model.nodes;
  const labeled = selectLabeledNodeIds(nodes, level, bypassIds);
  return nodes.map(node => ({
    id: node.id, label: node.label, cluster: node.cluster, degree: node.degree, kind: node.type ?? 'person',
    x: node.x, y: node.y, radius: atlasNodeRadius(node),
    bypass: bypassIds.has(node.id), showLabel: labeled.has(node.id)
  }));
}

function surfaceParticipantCount(surfaceId) {
  const s = state.surfaces?.get(surfaceId);
  if (!s) return null;
  return (s.participants ?? []).filter(participant => participant.participant_type === 'actor').length;
}

// The bipartite close-range grammar: Actor -> Participation -> Surface <-
// Participation <- Actor. Every returned expansion names the surface basis
// it renders from (surfaceId/surfaceLabel), never a bare line. Dense/roster
// surfaces (participant population at or over the visible threshold, e.g.
// Dialog) never expand into pairwise spokes — isRoster marks them so the
// renderer draws a labelled roster container with a count instead.
function buildBipartiteExpansions(model, level, { selectedEdgeId, selectedNodeId } = {}) {
  if (model.mode !== 'hops' || !['surface', 'evidence', 'route'].includes(level)) return [];
  const closeZoom = level === 'evidence' || level === 'route';
  const expansions = [];
  for (const edge of model.edges) {
    const isSelected = edge.id === selectedEdgeId || edge.from === selectedNodeId || edge.to === selectedNodeId;
    if (!closeZoom && !isSelected) continue;
    const basis = [...(edge.surfaces ?? [])].sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))[0];
    if (!basis) continue;
    const participantCount = surfaceParticipantCount(basis.surface_id);
    expansions.push({
      edgeId: edge.id, actorA: edge.from, actorB: edge.to,
      surfaceId: basis.surface_id, surfaceLabel: basis.surface_label, evidenceClass: basis.evidence_class,
      isRoster: Number.isFinite(participantCount) && participantCount >= DENSE_SURFACE_PARTICIPANT_THRESHOLD,
      participantCount: participantCount ?? null
    });
  }
  return expansions;
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
    return { ...node, degree: degree.get(node.id) ?? 0, cluster, aggregateGroup: cluster };
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
  const nodes = [...actorIds].map(id => {
    const hopLevel = Math.max(0, Math.min(4, levels.get(id) ?? 3));
    return {
      id, label: labelActor(id), type: 'person', cluster: 'hop', degree: degree.get(id) ?? 0, hopLevel,
      aggregateGroup: id === state.hopGraph.anchor_actor_id ? 'anchor' : `hop-ring-${hopLevel}`,
      ...(positions.get(id) ?? { x: 700, y: 450 })
    };
  });
  const edges = (state.hopGraph.edges ?? []).map((edge, index) => ({
    ...edge, id: `hop-${index}-${edge.actor_a}-${edge.actor_b}`, from: edge.actor_a, to: edge.actor_b,
    evidence_class: [...(edge.surfaces ?? [])].sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))[0]?.evidence_class ?? 'judgment'
  }));
  return {
    mode: 'hops', nodes, edges, nodeById: new Map(nodes.map(node => [node.id, node])),
    defaultNode: state.hopGraph.anchor_actor_id, fullView: { ...NETWORK_FULL_VIEW }
  };
}

/* ---------------- Route subordination (ladder step 5, "Route (tactical)") ----------------
   With a route active at the 'route' semantic level, the mounted topology
   layer must visually subordinate: route members bright, everything else
   strongly dimmed. computeRouteSubordinationClasses is the pure class-
   assignment function (vm-testable); it never decides opacity itself —
   only which of two CSS classes (opacity-only, no motion) an id gets. */

function routeMemberIdsForSelection(hopGraph, mode, selectedId) {
  if (mode !== 'hops' || !selectedId) return new Set();
  const path = hopGraph?.shortest_paths?.[selectedId];
  return new Set(path?.actor_path ?? []);
}

function computeRouteSubordinationClasses(ids, routeMemberIds) {
  const classes = new Map();
  for (const id of ids) classes.set(id, routeMemberIds.has(id) ? 'is-route-member' : 'is-route-dimmed');
  return classes;
}

/* ---------------- Selection model (ladder step 4, "Close range: locality and selection") ----------------
   computeAtlasSelectionModel is the pure fact-finder: given a model and a
   selected id, which node ids/edge ids are adjacent to the selection.
   computeSelectionSubordinationClasses turns that into the same kind of
   id->class map computeRouteSubordinationClasses already returns for route
   mode, so mountAtlasLevel can treat "a plain selection is active" and "a
   route is active" as the same rendering shape. Unmistakable selection
   itself (the halo + edge highlight + persistent chip) lives in the glyph
   renderers; this is only the id bookkeeping, vm-testable without a DOM. */

function computeAtlasSelectionModel(model, selectedId) {
  if (!model || !selectedId) return { selectedId: null, adjacentEdgeIds: new Set(), adjacentNodeIds: new Set(), dimNodeIds: new Set() };
  const adjacentEdgeIds = new Set();
  const adjacentNodeIds = new Set([selectedId]);
  for (const edge of model.edges) {
    if (edge.from === selectedId || edge.to === selectedId) {
      adjacentEdgeIds.add(edge.id);
      adjacentNodeIds.add(edge.from);
      adjacentNodeIds.add(edge.to);
    }
  }
  const dimNodeIds = new Set((model.nodes ?? []).filter(node => !adjacentNodeIds.has(node.id)).map(node => node.id));
  return { selectedId, adjacentEdgeIds, adjacentNodeIds, dimNodeIds };
}

function computeSelectionSubordinationClasses(ids, selectionModel) {
  const classes = new Map();
  if (!selectionModel?.selectedId) return classes;
  for (const id of ids) classes.set(id, selectionModel.adjacentNodeIds.has(id) ? 'is-selection-adjacent' : 'is-selection-dim');
  return classes;
}

// Contract Section 3 Rebuild, "The opened cluster is primary": objects
// belonging to the cluster whose ring the camera entered render at full
// strength; other clusters dim until the camera crosses into their
// territory. "Whose ring the camera entered" is read off the current view
// center against the same aggregate anchors the wash/ring layer already
// uses. Only applies with no active selection -- Section 4's unmistakable
// selection is the higher-priority subordination once something is picked.
function nearestAtlasClusterGroup(aggregates, cx, cy) {
  let best = null, bestDist = Infinity;
  for (const agg of aggregates) {
    const d = (agg.x - cx) ** 2 + (agg.y - cy) ** 2;
    if (d < bestDist) { bestDist = d; best = agg.group; }
  }
  return best;
}

function computeClusterPrimaryClasses(nodes, aggregates, view) {
  const classes = new Map();
  if (!aggregates.length) return classes;
  const primaryGroup = nearestAtlasClusterGroup(aggregates, view.x + view.width / 2, view.y + view.height / 2);
  for (const node of nodes) {
    const group = node.aggregateGroup ?? node.cluster ?? 'other';
    classes.set(node.id, group === primaryGroup ? 'is-cluster-primary' : 'is-cluster-dimmed');
  }
  return classes;
}

/* ---------------- Corridor overlay (ladder step 6, "Corridors and release deltas") ----------------
   build/atlas-projection.json's corridors are structural, multi-stage
   pathways with graph_effect always "none" (enforced by the compiler that
   builds that artifact). buildCorridorLayerModel re-asserts that
   constitutional fact defensively here and NEVER renders a corridor that
   ever claims a different graph_effect. Anchors are the seeded machine
   (organization) positions each corridor's stages actually touch, in stage
   order, so the overlay is a real geometric path, not an invented one. */

function corridorAnchorPositions(corridor, machineById) {
  const orgIds = [];
  for (const stage of corridor.stages ?? []) {
    if (stage.organization_id && !orgIds.includes(stage.organization_id)) orgIds.push(stage.organization_id);
  }
  return orgIds.map(id => machineById.get(id)).filter(Boolean).map(machine => ({ id: machine.organization_id, x: machine.position.x, y: machine.position.y }));
}

function buildCorridorLayerModel(atlasProjection) {
  if (!atlasProjection) return { corridors: [], excludedCount: 0 };
  const machineById = new Map((atlasProjection.machines ?? []).map(m => [m.organization_id, m]));
  const all = atlasProjection.corridors ?? [];
  const corridors = [];
  for (const corridor of all) {
    if (corridor.graph_effect !== 'none') continue; // never render a corridor that claims a Clifford Number effect
    corridors.push({
      id: corridor.chain_id,
      label: corridor.label,
      graphEffect: corridor.graph_effect,
      stageCount: corridor.chain_length ?? (corridor.stages ?? []).length,
      anchors: corridorAnchorPositions(corridor, machineById)
    });
  }
  return { corridors, excludedCount: all.length - corridors.length };
}

// Contract Section 2 Rebuild, "Corridor as a labeled object": the label
// competes fairly in the collision system (mountAtlasLevel sets
// corridor.showLabel) instead of always drawing regardless of overlap -- the
// old "unreadable fly-speck label" the operator flagged. A hover chip (via
// data-encoding, Section 2 "Hover = meaning") and a click target
// (bindAtlasLayerInteractions -> selectAtlasCorridor) are always present
// even when the label itself loses the collision budget.
function renderCorridorGlyph(corridor, factor = 1) {
  if (corridor.anchors.length < 2) return '';
  const points = corridor.anchors.map(a => `${a.x},${a.y}`).join(' ');
  const mid = corridor.anchors[Math.floor((corridor.anchors.length - 1) / 2)];
  const encoding = `${corridor.label} — structural corridor, no Clifford Number effect — ${corridor.stageCount} documented stage${corridor.stageCount === 1 ? '' : 's'}`;
  const labelMarkup = corridor.showLabel === false ? '' : `<g data-ink-anchor-x="${mid.x}" data-ink-anchor-y="${mid.y}" transform="translate(${mid.x} ${mid.y}) scale(${factor})">
      <rect class="atlas-corridor-chip" x="-98" y="-24" width="196" height="18" rx="4"/>
      <text class="atlas-corridor-label" y="-10" text-anchor="middle">${esc(shortLabel(corridor.label, 26))} · corridor, no hop effect</text>
    </g>`;
  return `<g class="atlas-corridor" data-atlas-corridor="${esc(corridor.id)}" data-encoding="${esc(encoding)}" tabindex="0" role="button" aria-label="${esc(encoding)}">
    <polyline class="atlas-corridor-path" points="${esc(points)}"/>
    ${labelMarkup}
    <title>${esc(encoding)}</title>
  </g>`;
}

// Legibility addendum rule 4: "machine level means containers." The top
// surface-factory organizations in build/atlas-projection.json render as
// labeled boxes with their bounded surfaces docked inside as diamonds,
// grouped by surfaces_by_type — completely independent of which model
// (research/hops) is mounted, exactly like the corridor overlay above,
// because atlas-projection is the compiler's own machine-level ontology, not
// a re-derivation from either graph. Ranking prefers a declared factory,
// then raw surface count, so the level shows real containers even before
// every organization in a small corpus carries the declared-factory flag.
// Every docked surface is accounted for: shown.length + overflowCount always
// sums to the machine's own surface_count.
const MACHINE_CONTAINER_LIMIT = 8;
const MACHINE_CONTAINER_SURFACE_LIMIT = 6;

function buildAtlasMachineContainers(atlasProjection) {
  const machines = atlasProjection?.machines ?? [];
  const ranked = [...machines].sort((a, b) =>
    Number(!!b.declared_surface_factory) - Number(!!a.declared_surface_factory)
    || (b.surface_count?.count ?? 0) - (a.surface_count?.count ?? 0)
    || String(a.organization_id).localeCompare(String(b.organization_id))
  );
  return ranked.slice(0, MACHINE_CONTAINER_LIMIT).map(machine => {
    const groups = (machine.surfaces_by_type ?? []).map(group => ({
      surfaceType: group.surface_type,
      label: humanLabel(String(group.surface_type).replace(/_surface$/, '')),
      surfaceIds: group.surface_ids ?? []
    }));
    const shown = [];
    let overflowCount = 0;
    for (const group of groups) {
      for (const surfaceId of group.surfaceIds) {
        if (shown.length < MACHINE_CONTAINER_SURFACE_LIMIT) shown.push({ surfaceId, surfaceType: group.surfaceType, label: group.label });
        else overflowCount += 1;
      }
    }
    return {
      organizationId: machine.organization_id,
      label: machine.label,
      isDeclaredFactory: !!machine.declared_surface_factory,
      surfaceCount: machine.surface_count?.count ?? 0,
      surfaceDenominator: machine.surface_count?.denominator ?? 0,
      x: machine.position?.x ?? 0, y: machine.position?.y ?? 0,
      surfaces: shown,
      overflowCount
    };
  });
}

/* ---------------- Release delta strip (ladder step 6) ----------------
   releaseStripModel wraps src/release-delta.js's pure releaseDelta/summarizeDelta
   into a one-line, honest render model for #release-strip. baseline is
   normally null/undefined today (build/atlas-projection-baseline.json is not
   shipped yet) -- that must read as an explicit statement, never silence. */

const RELEASE_DELTA_KIND_ORDER = ['added', 'removed', 'window-changed', 'population-changed', 'evidence-upgraded', 'evidence-decayed', 'graph-effect-changed'];

function releaseStripModel(current, baseline) {
  const delta = releaseDelta(current ?? null, baseline ?? null);
  const summary = summarizeDelta(delta);
  if (summary.baselineAbsent) {
    return { baselineAbsent: true, message: 'release delta: no baseline artifact in this release', summary, delta };
  }
  const parts = RELEASE_DELTA_KIND_ORDER
    .map(kind => ({ kind, ...summary.byKind[kind] }))
    .filter(bucket => bucket.count > 0)
    .map(bucket => `${bucket.count} ${humanLabel(bucket.kind)} of ${bucket.denominator}`);
  const message = parts.length
    ? `release delta: ${parts.join(' · ')}`
    : `release delta: no changes across ${summary.totalObjectsCompared} compared objects`;
  return { baselineAbsent: false, message, summary, delta };
}

// Legibility addendum rule 2: draws one glyph shape at the LOCAL origin
// (0,0) of whatever ink-anchor group calls it — circle for actors, square
// for organizations, diamond (a rotated square) for bounded surfaces, ring
// for aggregates (a hollow circle; fill/stroke distinction lives in CSS).
function shapeGlyphMarkup(shape, className, size) {
  const half = size / 2;
  if (shape === 'square') return `<rect class="${className}" x="${-half}" y="${-half}" width="${size}" height="${size}"/>`;
  if (shape === 'diamond') return `<rect class="${className}" x="${-half}" y="${-half}" width="${size}" height="${size}" transform="rotate(45)"/>`;
  return `<circle class="${className}" r="${half}"/>`; // circle and ring share a tag; CSS tells them apart
}

// Legibility addendum rule 3: the evidence-composition ring — stroke-dasharray
// segments, one per evidence class actually present, using the same
// evidenceBand() palette as every edge/legend line elsewhere in the atlas.
// aria-hidden because the same composition is already spoken in the
// aggregate's <title>.
const EVIDENCE_ARC_BAND_ORDER = ['confirmed', 'primary', 'reported', 'derived'];
const EVIDENCE_BAND_HUMAN = { confirmed: 'official / confirmed', primary: 'primary public', reported: 'reported', derived: 'derived / context' };

// Contract Section 2 Rebuild, "Every aggregate is a sentence": a quiet second
// line naming the evidence arc in words ("evidence mix: mostly primary
// public") rather than a bare palette a cold reader cannot decode. Derived
// honestly from the same evidenceComposition every arc segment already
// renders from -- never a new number.
function evidenceMixSentence(evidenceComposition) {
  const total = evidenceComposition?.total ?? 0;
  if (!total) return 'evidence mix: no internal edges yet';
  let topBand = EVIDENCE_ARC_BAND_ORDER[0], topCount = -1;
  for (const band of EVIDENCE_ARC_BAND_ORDER) {
    const count = evidenceComposition.byBand[band] ?? 0;
    if (count > topCount) { topCount = count; topBand = band; }
  }
  const share = topCount / total;
  const qualifier = share >= 0.66 ? 'mostly' : share >= 0.4 ? 'largely' : 'mixed, led by';
  return `evidence mix: ${qualifier} ${EVIDENCE_BAND_HUMAN[topBand] ?? humanLabel(topBand)}`;
}

function renderEvidenceCompositionArc(evidenceComposition, radius) {
  const total = evidenceComposition?.total ?? 0;
  if (!total) return '';
  const arcRadius = radius + 7;
  const circumference = 2 * Math.PI * arcRadius;
  let offset = 0;
  const segments = EVIDENCE_ARC_BAND_ORDER.map(band => {
    const count = evidenceComposition.byBand[band] ?? 0;
    if (!count) return '';
    const length = (count / total) * circumference;
    const encoding = `evidence composition: ${count} ${EVIDENCE_BAND_HUMAN[band] ?? humanLabel(band)} of ${total} total internal edges`;
    const el = `<circle class="atlas-agg-arc atlas-agg-arc--${band}" data-encoding="${esc(encoding)}" r="${arcRadius}" stroke-dasharray="${length.toFixed(1)} ${(circumference - length).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}"/>`;
    offset += length;
    return el;
  }).join('');
  return `<g class="atlas-agg-arc-group" aria-hidden="true">${segments}</g>`;
}

function renderAggregateGlyph(agg, factor = 1) {
  const metricText = shortLabel(agg.metricLabel, 40);
  const mixSentence = evidenceMixSentence(agg.evidenceComposition);
  const coreEncoding = `${agg.label} boundary — dashed ring marks an aggregate, not a single documented object`;
  return `<g class="atlas-agg" data-network-node="${esc(agg.id)}" data-atlas-agg="${esc(agg.group)}" data-ink-anchor-x="${agg.x}" data-ink-anchor-y="${agg.y}" transform="translate(${agg.x} ${agg.y}) scale(${factor})" tabindex="0" role="button" aria-label="${esc(`${agg.label}, ${agg.metricLabel}, ${mixSentence}`)}">
    <circle class="atlas-agg-core" data-encoding="${esc(coreEncoding)}" r="${agg.radius}"/>
    ${renderEvidenceCompositionArc(agg.evidenceComposition, agg.radius)}
    ${agg.showLabel === false ? '' : `<text class="atlas-agg-label" y="${-(agg.radius + 14)}" text-anchor="middle">${esc(shortLabel(agg.label, 30))}</text>`}
    <text class="atlas-agg-metric" y="4" text-anchor="middle">${esc(metricText)}</text>
    <text class="atlas-agg-mix" y="${agg.radius * 0.42 + 16}" text-anchor="middle">${esc(mixSentence)}</text>
    <title>${esc(agg.label)} · ${esc(agg.metricLabel)} · ${agg.memberCount} member${agg.memberCount === 1 ? '' : 's'} · ${esc(mixSentence)}</title>
  </g>`;
}

// Legibility addendum rules 1, 2 and 5: shape carries the ontology, the
// glyph is wrapped in an ink-anchor group so its radius and any label stay
// screen-constant, and the per-node bare degree digit is gone — degree
// survives only as a displayed statistic in the title/aria-label, never as
// a scattered orphan number in the markup.
// Contract Section 4 Rebuild, "Unmistakable selection": the selected glyph
// gets a dedicated .atlas-selected treatment (thick halo, CSS carries the
// gold + white outer stroke) and a persistent screen-space name chip -- a
// filled background behind the label, not just the stroke-outlined text
// every other label uses -- so it reads in a screenshot at arm's length.
// Contract Section 2, "stray glyph" diagnosis: at corpus level the default
// selection (Dialog, type private-forum -> diamond) rendered as an
// unexplained individual glyph next to its own aggregate ring, because the
// bypass node's own layout anchor and its aggregate's grid/projection anchor
// are two different points. Decision: INTEGRATE, don't suppress -- the
// contract's own corpus acceptance check explicitly allows bypass objects at
// corpus level, and suppressing the default selection would contradict
// Section 4's "same [selection] treatment across all levels." mountAtlasLevel
// passes tetherTo/tetherLabel for corpus bypass nodes whose cluster has an
// aggregate; a thin tether line (drawn in the aggregate layer, see
// mountAtlasLevel) plus this label's "part of <aggregate>" note replace the
// orphan reading with a legible one.
function renderIndividualNodeGlyph(view, level, factor = 1, subordinationClass = null) {
  const bypass = view.bypass ? ' atlas-node--bypass' : '';
  const selected = view.selected ? ' atlas-selected' : '';
  const subordination = subordinationClass ? ` ${subordinationClass}` : '';
  const shape = glyphShapeFor(view.kind);
  const size = view.radius * 2;
  const labelText = view.showLabel ? shortLabel(view.label, 28) : '';
  const chipWidth = labelText ? labelWidthEstimate(view.label, 28) : 0;
  const labelMarkup = !labelText ? '' : view.selected
    ? `<g class="atlas-name-chip"><rect class="atlas-name-chip-bg" x="${-chipWidth / 2}" y="${-(size / 2 + 9) - 13}" width="${chipWidth}" height="18" rx="4"/><text class="atlas-node-label atlas-node-label--selected" y="${-(size / 2 + 9)}" text-anchor="middle">${esc(labelText)}</text></g>`
    : `<text class="atlas-node-label" y="${-(size / 2 + 9)}" text-anchor="middle">${esc(labelText)}</text>`;
  const tetherNote = view.tetherLabel ? ` · part of ${view.tetherLabel}` : '';
  return `<g class="atlas-node atlas-node--${esc(view.cluster)}${bypass}${selected}${subordination}" data-network-node="${esc(view.id)}" data-ink-anchor-x="${view.x}" data-ink-anchor-y="${view.y}" transform="translate(${view.x} ${view.y}) scale(${factor})" tabindex="0" role="button" aria-label="${esc(`${view.label}, ${view.degree} documented edges${tetherNote}`)}">
    ${view.bypass ? `<circle class="atlas-node-halo${selected}" r="${size / 2 + 10}"/>` : ''}
    ${shapeGlyphMarkup(shape, 'atlas-node-core', size)}
    ${labelMarkup}
    <title>${esc(view.label)} · ${view.degree} documented edge${view.degree === 1 ? '' : 's'}${level ? ` · ${level} level` : ''}${tetherNote}</title>
  </g>`;
}

function renderBipartiteGlyph(expansion, model, factor = 1, subordinationClass = null) {
  const from = model.nodeById.get(expansion.actorA);
  const to = model.nodeById.get(expansion.actorB);
  if (!from || !to) return '';
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  const subordination = subordinationClass ? ` ${subordinationClass}` : '';
  if (expansion.isRoster) {
    return `<g class="atlas-hop-expansion atlas-hop-expansion--roster${subordination}" data-hop-basis="${esc(expansion.surfaceId)}">
      <line class="atlas-hop-link" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>
      <g data-ink-anchor-x="${mx}" data-ink-anchor-y="${my}" transform="translate(${mx} ${my}) scale(${factor})">
        <rect class="atlas-hop-roster" x="-46" y="-16" width="92" height="32" rx="6"/>
        <text class="atlas-hop-roster-label" y="4" text-anchor="middle">${esc(shortLabel(expansion.surfaceLabel, 16))} · ${expansion.participantCount ?? '?'} participants</text>
      </g>
    </g>`;
  }
  return `<g class="atlas-hop-expansion${subordination}" data-hop-basis="${esc(expansion.surfaceId)}">
    <line class="atlas-hop-link" x1="${from.x}" y1="${from.y}" x2="${mx}" y2="${my}"/>
    <line class="atlas-hop-link" x1="${mx}" y1="${my}" x2="${to.x}" y2="${to.y}"/>
    <g data-ink-anchor-x="${mx}" data-ink-anchor-y="${my}" transform="translate(${mx} ${my}) scale(${factor})">
      ${shapeGlyphMarkup('diamond', 'atlas-hop-surface', 20)}
      <text class="atlas-hop-surface-label" y="26" text-anchor="middle">${esc(shortLabel(expansion.surfaceLabel, 24))}</text>
    </g>
  </g>`;
}

// Legibility addendum rule 4: one labeled container per top surface-factory
// organization, its docked bounded surfaces rendered as small diamonds
// (rule 2: a surface is always a diamond, even inside a container), grouped
// visually by surfaces_by_type order, with an honest "+N more surfaces"
// count for anything past MACHINE_CONTAINER_SURFACE_LIMIT. The whole
// container — box, diamonds, and text — lives inside one ink-anchor group so
// it (and its labels) stay screen-constant together, never overflowing its
// own box as zoom changes.
function renderMachineContainerGlyph(container, factor = 1) {
  const pad = 10, headerH = 34, diamondSize = 14, gap = 10;
  const slotCount = Math.max(1, container.surfaces.length);
  const cols = Math.max(1, Math.min(4, slotCount));
  const rows = Math.max(1, Math.ceil(slotCount / cols));
  const gridW = cols * diamondSize + (cols - 1) * gap;
  const gridH = rows * diamondSize + (rows - 1) * gap;
  const overflowH = container.overflowCount ? 18 : 0;
  const boxW = Math.max(150, gridW + pad * 2);
  const boxH = headerH + pad + gridH + overflowH + pad;
  const diamonds = container.surfaces.map((surfaceItem, index) => {
    const col = index % cols, row = Math.floor(index / cols);
    const cx = pad + col * (diamondSize + gap) + diamondSize / 2;
    const cy = headerH + pad + row * (diamondSize + gap) + diamondSize / 2;
    const half = diamondSize / 2;
    return `<rect class="atlas-container-surface" x="${cx - half}" y="${cy - half}" width="${diamondSize}" height="${diamondSize}" transform="rotate(45 ${cx} ${cy})"><title>${esc(surfaceItem.label)} · ${esc(surfaceItem.surfaceId)}</title></rect>`;
  }).join('');
  const metric = `${container.surfaceCount} of ${container.surfaceDenominator} total surfaces`;
  const overflowText = container.overflowCount
    ? `<text class="atlas-container-overflow" x="${pad}" y="${headerH + pad + gridH + 13}">+${container.overflowCount} more surface${container.overflowCount === 1 ? '' : 's'}</text>`
    : '';
  return `<g class="atlas-container${container.isDeclaredFactory ? ' atlas-container--factory' : ''}" data-ink-anchor-x="${container.x}" data-ink-anchor-y="${container.y}" transform="translate(${container.x} ${container.y}) scale(${factor})" role="group" aria-label="${esc(`${container.label}, ${metric}`)}">
    <rect class="atlas-container-box" x="0" y="0" width="${boxW}" height="${boxH}" rx="6"/>
    <text class="atlas-container-title" x="${pad}" y="16">${esc(shortLabel(container.label, 26))}</text>
    <text class="atlas-container-metric" x="${pad}" y="${headerH - 8}">${esc(metric)}</text>
    <g class="atlas-container-surfaces">${diamonds}</g>
    ${overflowText}
    <title>${esc(container.label)} · ${esc(metric)}${container.isDeclaredFactory ? ' · declared surface factory' : ''}</title>
  </g>`;
}

// One edge line + its wider invisible hit-line, factored out of the old
// inline model.edges.map so machine/surface/evidence rendering can all call
// the same renderer instead of three copies of the same markup.
function renderEdgeLineGlyph(edge, model, subordinationClass = null) {
  const from = model.nodeById.get(edge.from);
  const to = model.nodeById.get(edge.to);
  if (!from || !to) return '';
  const band = evidenceBand(edge.evidence_class);
  const topology = model.mode === 'research' && legacyIsTopology(edge) ? ' network-edge--topology' : '';
  const subordination = subordinationClass ? ` ${subordinationClass}` : '';
  return `<line class="network-edge network-edge--${band}${topology}${subordination}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/><line class="network-edge-hit" data-network-edge="${esc(edge.id)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
}

/* ---------------- Machine-level edge banding (ladder step 3, "Continuity into machine level") ----------------
   Contract Section 3 Rebuild, "Edges arrive banded, not raw": at machine
   level, individual edges render only for the selection neighborhood;
   everything else aggregates into count-labeled inter-cluster bands.
   buildMachineEdgeBands is the pure grouping step (vm-testable): it never
   touches geometry, only decides which edges stay individual and how the
   rest bucket by unordered cluster-pair. Rendering supplies the anchors. */

function buildMachineEdgeBands(model, selectedId) {
  const individualEdgeIds = new Set();
  if (selectedId) {
    for (const edge of model.edges) {
      if (edge.from === selectedId || edge.to === selectedId) individualEdgeIds.add(edge.id);
    }
  }
  const bandByKey = new Map();
  for (const edge of model.edges) {
    if (individualEdgeIds.has(edge.id)) continue;
    const from = model.nodeById.get(edge.from), to = model.nodeById.get(edge.to);
    if (!from || !to) continue;
    const groupA = from.aggregateGroup ?? from.cluster ?? 'other';
    const groupB = to.aggregateGroup ?? to.cluster ?? 'other';
    const key = [groupA, groupB].sort().join('::');
    if (!bandByKey.has(key)) bandByKey.set(key, { key, groupA, groupB, count: 0, edgeIds: [] });
    const bucket = bandByKey.get(key);
    bucket.count += 1;
    bucket.edgeIds.push(edge.id);
  }
  return { individualEdgeIds, bands: [...bandByKey.values()] };
}

function machineEdgeBandLabel(band) {
  return `${band.count} documented edge${band.count === 1 ? '' : 's'}`;
}

function renderEdgeBandGlyph(band, groupAnchorById, factor = 1) {
  const a = groupAnchorById.get(band.groupA), b = groupAnchorById.get(band.groupB);
  if (!a || !b) return '';
  const width = Math.max(1.5, Math.sqrt(band.count));
  const label = machineEdgeBandLabel(band);
  const title = `${label} between ${humanLabel(band.groupA)} and ${humanLabel(band.groupB)}`;
  if (band.groupA === band.groupB) {
    const r = 22 + width;
    return `<g class="atlas-edge-band atlas-edge-band--self" data-atlas-band="${esc(band.key)}" data-encoding="${esc(title)}">
      <circle class="atlas-edge-band-path" cx="${a.x}" cy="${a.y}" r="${r}" style="stroke-width:${width}"/>
      <g data-ink-anchor-x="${a.x + r}" data-ink-anchor-y="${a.y - r}" transform="translate(${a.x + r} ${a.y - r}) scale(${factor})">
        <rect class="atlas-edge-band-chip" x="-6" y="-10" width="112" height="20" rx="5"/>
        <text class="atlas-edge-band-count" x="6" y="4">${esc(label)}</text>
      </g>
      <title>${esc(title)}</title>
    </g>`;
  }
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return `<g class="atlas-edge-band" data-atlas-band="${esc(band.key)}" data-encoding="${esc(title)}">
    <line class="atlas-edge-band-path" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" style="stroke-width:${width}"/>
    <g data-ink-anchor-x="${mx}" data-ink-anchor-y="${my}" transform="translate(${mx} ${my}) scale(${factor})">
      <rect class="atlas-edge-band-chip" x="-54" y="-10" width="108" height="20" rx="5"/>
      <text class="atlas-edge-band-count" y="4" text-anchor="middle">${esc(label)}</text>
    </g>
    <title>${esc(title)}</title>
  </g>`;
}

/* ---------------- Edge locality (ladder step 4, "Close range: locality and selection") ----------------
   Contract Section 4 Rebuild, "Edge locality": at surface/evidence levels,
   render an edge only if at least one endpoint is inside (or near) the
   viewport; a fully off-screen edge is dropped, a one-off-screen edge
   renders as a short directional stub from the visible endpoint, and a node
   carrying >=3 off-screen partners gets one honest "+N offscreen" chip
   instead of N unreadable stub labels. Pure geometry against a view rect --
   no DOM, vm-testable against a synthetic or real model. */

function isPointInView(x, y, view, margin = 0) {
  return x >= view.x - margin && x <= view.x + view.width + margin
    && y >= view.y - margin && y <= view.y + view.height + margin;
}

const ATLAS_EDGE_STUB_LENGTH = 60;
const ATLAS_EDGE_LOCALITY_MARGIN = 40;

function buildEdgeLocalityModel(model, view, margin = 40) {
  const rendered = [];
  const stubs = [];
  const offscreenPartnerCount = new Map();
  for (const edge of model.edges) {
    const from = model.nodeById.get(edge.from), to = model.nodeById.get(edge.to);
    if (!from || !to) continue;
    const fromIn = isPointInView(from.x, from.y, view, margin);
    const toIn = isPointInView(to.x, to.y, view, margin);
    if (!fromIn && !toIn) continue; // both endpoints off-screen: dropped, never "line soup that connects nothing visible"
    if (fromIn && toIn) { rendered.push(edge); continue; }
    const visibleNode = fromIn ? from : to;
    const offscreenNode = fromIn ? to : from;
    const dx = offscreenNode.x - visibleNode.x, dy = offscreenNode.y - visibleNode.y;
    const dist = Math.hypot(dx, dy) || 1;
    stubs.push({
      edgeId: edge.id, evidenceClass: edge.evidence_class,
      nodeId: visibleNode.id, partnerId: offscreenNode.id,
      x1: visibleNode.x, y1: visibleNode.y,
      x2: visibleNode.x + (dx / dist) * ATLAS_EDGE_STUB_LENGTH,
      y2: visibleNode.y + (dy / dist) * ATLAS_EDGE_STUB_LENGTH
    });
    offscreenPartnerCount.set(visibleNode.id, (offscreenPartnerCount.get(visibleNode.id) ?? 0) + 1);
  }
  return { rendered, stubs, offscreenPartnerCount };
}

function buildOffscreenChips(offscreenPartnerCount, nodeById) {
  const chips = [];
  for (const [nodeId, count] of offscreenPartnerCount) {
    if (count < 3) continue;
    const node = nodeById.get(nodeId);
    if (!node) continue;
    chips.push({ nodeId, count, x: node.x, y: node.y });
  }
  return chips;
}

function renderEdgeStubGlyph(stub, factor = 1) {
  const band = evidenceBand(stub.evidenceClass);
  return `<line class="network-edge network-edge--${band} atlas-edge-stub" x1="${stub.x1}" y1="${stub.y1}" x2="${stub.x2}" y2="${stub.y2}"/>`;
}

function renderOffscreenChipGlyph(chip, factor = 1) {
  const text = `+${chip.count} offscreen`;
  const w = labelWidthEstimate(text, 20);
  return `<g class="atlas-offscreen-chip" data-encoding="${esc(`${chip.count} edges leave the current view from this node`)}" data-ink-anchor-x="${chip.x}" data-ink-anchor-y="${chip.y}" transform="translate(${chip.x} ${chip.y}) scale(${factor})">
    <rect class="atlas-offscreen-chip-bg" x="${18}" y="${-10}" width="${w}" height="20" rx="5"/>
    <text class="atlas-offscreen-chip-text" x="${18 + w / 2}" y="4" text-anchor="middle">${esc(text)}</text>
  </g>`;
}

function bindAtlasLayerInteractions(layer) {
  for (const nodeEl of layer.querySelectorAll('[data-network-node]')) {
    const isAggregate = nodeEl.hasAttribute('data-atlas-agg');
    const activate = () => {
      state.dismissAtlasOrientationStrip?.();
      if (isAggregate) openAtlasAggregate(nodeEl.dataset.networkNode);
      else selectNetworkNode(nodeEl.dataset.networkNode);
    };
    nodeEl.addEventListener('click', activate);
    nodeEl.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); activate();
    });
  }
  for (const edgeEl of layer.querySelectorAll('[data-network-edge]')) {
    edgeEl.addEventListener('click', () => { state.dismissAtlasOrientationStrip?.(); openNetworkEdge(edgeEl.dataset.networkEdge, edgeEl); });
  }
  for (const corridorEl of layer.querySelectorAll('[data-atlas-corridor]')) {
    corridorEl.addEventListener('click', () => { state.dismissAtlasOrientationStrip?.(); selectAtlasCorridor(corridorEl.dataset.atlasCorridor); });
    corridorEl.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      state.dismissAtlasOrientationStrip?.();
      selectAtlasCorridor(corridorEl.dataset.atlasCorridor);
    });
  }
}

// Contract Section 1 Rebuild, "Level cross-fade": keep the outgoing scene
// mounted alongside the incoming one for the fade duration (opacity only,
// <=250ms), instead of the old same-frame `layer.innerHTML = ...` swap. The
// selected glyph's `.is-selected`/`.atlas-selected` classes are applied to
// the NEW scene synchronously below, before the browser's next paint, so
// selection halo continuity holds "from first paint" without extra work.
// prefers-reduced-motion still gets an instant swap, per the design note's
// own rule ("respect the reduced-motion contract") and this contract's own
// text ("instant under prefers-reduced-motion").
const ATLAS_CROSSFADE_MS = 220;

function mountAtlasSceneWithCrossFade(layer, sceneMarkup) {
  const reduced = prefersReducedMotion();
  const existingScenes = [...layer.querySelectorAll(':scope > .atlas-scene')];
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holder.innerHTML = sceneMarkup;
  const newScene = holder.firstElementChild;
  layer.appendChild(newScene);
  if (reduced || !existingScenes.length) {
    for (const old of existingScenes) old.remove();
    newScene.classList.add('is-visible');
    return newScene;
  }
  void newScene.getBoundingClientRect(); // force layout before flipping the class so the 0->1 transition actually runs
  newScene.classList.add('is-visible');
  for (const old of existingScenes) {
    old.classList.add('atlas-layer--leaving');
    let done = false;
    const cleanup = () => { if (done) return; done = true; old.remove(); };
    old.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, ATLAS_CROSSFADE_MS + 30);
  }
  return newScene;
}

// Mounts only the layers relevant to `level`: region washes at corpus and
// machine (Section 2/3, "washes persist"), aggregate ring at corpus,
// corridor overlay at corpus/machine (ladder step 6), machine containers +
// banded edges at machine only (Section 3/Legibility rule 4), local topology
// (+ bipartite expansions, + edge locality at surface/evidence, + route
// subordination at 'route') everywhere else. Every point-anchored glyph is
// built with the CURRENT screenSpaceFactor baked into its ink-anchor
// transform so a fresh mount mid-zoom starts correctly scaled;
// applyNetworkView's cheap applyInkScale pass keeps it correct afterward
// without remounting on every zoom tick.
function mountAtlasLevel(level) {
  const layer = $('#network-layer');
  const model = state.networkModel;
  if (!layer || !model) return;
  const factor = screenSpaceFactor(state.networkView);
  const routeMemberIds = level === 'route' ? routeMemberIdsForSelection(state.hopGraph, model.mode, state.networkSelectedId) : new Set();
  state.networkRouteIds = routeMemberIds;
  const bypassIds = computeAtlasBypass(model, {
    searchIds: state.networkSearchIds, selectedId: state.networkSelectedId,
    routeIds: state.networkRouteIds, pinnedIds: state.networkPinned
  });
  const priorityCtx = { selectedId: state.networkSelectedId, routeIds: routeMemberIds, searchIds: state.networkSearchIds, pinnedIds: state.networkPinned };

  const aggregates = (level === 'corpus' || level === 'machine') ? buildAtlasAggregates(model, state.atlasProjection) : [];
  const groupAnchorById = new Map(aggregates.map(agg => [agg.group, { x: agg.x, y: agg.y, label: agg.label }]));
  const washMarkup = aggregates.length ? buildAtlasRegionWashes(aggregates).map(wash => renderRegionWashGlyph(wash, factor)).join('') : '';

  const corridorModel = (level === 'corpus' || level === 'machine') ? buildCorridorLayerModel(state.atlasProjection) : { corridors: [] };
  const labelCandidates = corridorModel.corridors.filter(c => c.anchors.length > 1).map(corridor => {
    const mid = corridor.anchors[Math.floor((corridor.anchors.length - 1) / 2)];
    return { id: `corridor-${corridor.id}`, x: mid.x, y: mid.y, widthEst: labelWidthEstimate(corridor.label, 26), priority: 'statistic' };
  });

  let aggregateMarkup = '', topologyMarkup = '', containerMarkup = '';
  if (level === 'corpus') {
    const bypassNodes = buildAtlasIndividualNodes(model, level, bypassIds).map(node => {
      const modelNode = model.nodeById.get(node.id);
      const group = modelNode?.aggregateGroup ?? modelNode?.cluster;
      const tether = groupAnchorById.get(group);
      return { ...node, selected: node.id === state.networkSelectedId, tetherTo: tether ?? null, tetherLabel: tether?.label ?? null };
    });
    // Legibility addendum rule 6: a budget-approved label can still lose to
    // real geometric overlap. Aggregate names always compete fairly against
    // any bypassed individual node (and now the corridor label) that shares
    // the corpus view.
    labelCandidates.push(
      ...aggregates.map(agg => ({ id: agg.id, x: agg.x, y: agg.y, widthEst: labelWidthEstimate(agg.label, 30), priority: 'name' })),
      ...bypassNodes.filter(node => node.showLabel).map(node => ({ id: node.id, x: node.x, y: node.y, widthEst: labelWidthEstimate(node.label, 28), priority: labelPriorityFor(node.id, priorityCtx) }))
    );
    const shownLabels = resolveLabelCollisions(labelCandidates, factor);
    for (const corridor of corridorModel.corridors) corridor.showLabel = shownLabels.has(`corridor-${corridor.id}`);
    // Section 2 "stray glyph" fix: a thin tether from a bypassed individual
    // glyph back to its own aggregate ring, so a selection like the default
    // Dialog landing reads as "this dot belongs to that ring" instead of an
    // unexplained orphan (see the renderIndividualNodeGlyph comment above).
    const tetherMarkup = bypassNodes.filter(n => n.tetherTo).map(n => `<line class="atlas-bypass-tether" x1="${n.tetherTo.x}" y1="${n.tetherTo.y}" x2="${n.x}" y2="${n.y}"/>`).join('');
    aggregateMarkup = tetherMarkup
      + aggregates.map(agg => renderAggregateGlyph({ ...agg, showLabel: shownLabels.has(agg.id) }, factor)).join('')
      + bypassNodes.map(view => renderIndividualNodeGlyph({ ...view, showLabel: view.showLabel && shownLabels.has(view.id) }, level, factor)).join('');
  } else {
    const selectionModel = level !== 'route' ? computeAtlasSelectionModel(model, state.networkSelectedId) : null;
    const nodeClassById = level === 'route'
      ? computeRouteSubordinationClasses(model.nodes.map(n => n.id), routeMemberIds)
      : selectionModel?.selectedId
        ? computeSelectionSubordinationClasses(model.nodes.map(n => n.id), selectionModel)
        : (level === 'machine' ? computeClusterPrimaryClasses(model.nodes, aggregates, state.networkView) : null);
    const selectedEdgeClass = edge => selectionModel?.adjacentEdgeIds.has(edge.id) ? 'atlas-edge--selected' : null;

    let edgeMarkup;
    if (level === 'machine') {
      // Section 3 Rebuild, "Edges arrive banded, not raw": everything except
      // the selection neighborhood collapses into count-labeled inter-
      // cluster bands, keeping on-screen individual edges small regardless
      // of corpus size (acceptance check: <=30 with nothing selected).
      const bandModel = buildMachineEdgeBands(model, state.networkSelectedId);
      const individualEdges = model.edges.filter(edge => bandModel.individualEdgeIds.has(edge.id));
      edgeMarkup = individualEdges.map(edge => renderEdgeLineGlyph(edge, model, selectedEdgeClass(edge))).join('')
        + bandModel.bands.map(band => renderEdgeBandGlyph(band, groupAnchorById, factor)).join('');
    } else if (level === 'surface' || level === 'evidence') {
      // Section 4 Rebuild, "Edge locality": drop through-traffic, stub the
      // rest toward their off-screen partner.
      const locality = buildEdgeLocalityModel(model, state.networkView, ATLAS_EDGE_LOCALITY_MARGIN);
      const offscreenChips = buildOffscreenChips(locality.offscreenPartnerCount, model.nodeById);
      edgeMarkup = locality.rendered.map(edge => renderEdgeLineGlyph(edge, model, selectedEdgeClass(edge))).join('')
        + locality.stubs.map(stub => renderEdgeStubGlyph(stub, factor)).join('')
        + offscreenChips.map(chip => renderOffscreenChipGlyph(chip, factor)).join('');
    } else {
      edgeMarkup = model.edges.map(edge => renderEdgeLineGlyph(edge, model,
        level === 'route' ? (routeMemberIds.has(edge.from) && routeMemberIds.has(edge.to) ? 'is-route-member' : 'is-route-dimmed') : null
      )).join('');
    }

    const nodeViews = buildAtlasIndividualNodes(model, level, bypassIds).map(node => ({ ...node, selected: node.id === state.networkSelectedId }));
    labelCandidates.push(...nodeViews.filter(node => node.showLabel).map(node => ({ id: node.id, x: node.x, y: node.y, widthEst: labelWidthEstimate(node.label, 28), priority: labelPriorityFor(node.id, priorityCtx) })));
    const shownLabels = resolveLabelCollisions(labelCandidates, factor);
    for (const corridor of corridorModel.corridors) corridor.showLabel = shownLabels.has(`corridor-${corridor.id}`);
    const nodeMarkup = nodeViews.map(view => renderIndividualNodeGlyph({ ...view, showLabel: view.showLabel && shownLabels.has(view.id) }, level, factor, nodeClassById?.get(view.id) ?? null)).join('');
    const expansions = buildBipartiteExpansions(model, level, { selectedNodeId: state.networkSelectedId });
    const expansionMarkup = expansions.map(expansion => renderBipartiteGlyph(expansion, model, factor,
      level === 'route' ? (routeMemberIds.has(expansion.actorA) && routeMemberIds.has(expansion.actorB) ? 'is-route-member' : 'is-route-dimmed') : null
    )).join('');
    topologyMarkup = `<g class="network-edges">${edgeMarkup}</g><g class="atlas-hop-expansions">${expansionMarkup}</g><g class="network-nodes">${nodeMarkup}</g>`;
  }
  // corridor.showLabel is decided inside whichever branch ran above (both set it); render after both branches agree.
  const corridorMarkup = corridorModel.corridors.map(corridor => renderCorridorGlyph(corridor, factor)).join('');
  const containers = level === 'machine' ? buildAtlasMachineContainers(state.atlasProjection) : [];
  containerMarkup = containers.map(container => renderMachineContainerGlyph(container, factor)).join('');

  const sceneMarkup = `<g class="atlas-scene" data-atlas-scene-level="${esc(level)}">`
    + `<g class="atlas-layer atlas-layer--wash" data-atlas-layer="wash"${washMarkup ? '' : ' hidden'}>${washMarkup}</g>`
    + `<g class="atlas-layer atlas-layer--aggregate" data-atlas-layer="aggregate"${level === 'corpus' ? '' : ' hidden'}>${aggregateMarkup}</g>`
    + `<g class="atlas-layer atlas-layer--corridor" data-atlas-layer="corridor"${corridorMarkup ? '' : ' hidden'}>${corridorMarkup}</g>`
    + `<g class="atlas-layer atlas-layer--container" data-atlas-layer="container"${containerMarkup ? '' : ' hidden'}>${containerMarkup}</g>`
    + `<g class="atlas-layer atlas-layer--topology${level === 'route' ? ' is-route-active' : ''}" data-atlas-layer="topology"${level === 'corpus' ? ' hidden' : ''}>${topologyMarkup}</g>`
    + `</g>`;

  const scene = mountAtlasSceneWithCrossFade(layer, sceneMarkup);
  bindAtlasLayerInteractions(scene);
  if (state.networkSelectedId) {
    for (const element of scene.querySelectorAll('[data-network-node]')) {
      element.classList.toggle('is-selected', element.dataset.networkNode === state.networkSelectedId);
    }
  }
  if (state.overviewHighlightSurfaceId) highlightOverviewSurface(state.overviewHighlightSurfaceId);
  renderEvidenceOverview();
}

// Legibility addendum rule 7: a level change may alter the map, never the
// page scroll position or surrounding layout height. This function only
// ever touches the SVG viewBox and the atlas layer's own contents/ink scale
// — no scrollIntoView or focus call lives on this path (mountAtlasLevel's
// own renderEvidenceOverview call has its own scroll guard, keyed to
// selection change, not to a level/zoom re-render).
function applyNetworkView() {
  const svg = $('#network-svg');
  if (!svg) return;
  const view = state.networkView;
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  const model = state.networkModel;
  if (!model) return;
  const scale = atlasScale(view);
  const factor = screenSpaceFactor(view);
  const congestion = atlasCongestion(model, view);
  const hasRoute = model.mode === 'hops' && !!state.networkSelectedId && !!state.hopGraph.shortest_paths?.[state.networkSelectedId]?.number;
  const level = semanticLevel(scale, congestion, hasRoute, state.networkLevel);
  const levelChanged = level !== state.networkLevel;
  state.networkLevel = level;
  state.networkScale = scale;
  if (levelChanged) mountAtlasLevel(level);
  // Rule 1: re-run on EVERY view change, not just a level change, so ink
  // (radii, strokes, and — via each glyph's ink-anchor scale transform —
  // font sizes) stays screen-constant through a plain zoom or pan too.
  applyInkScale($('#network-layer'), factor);
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

// Contract section 1 "Cursor-anchored zoom": the world point under the pointer must
// stay under the pointer. Solve the new view rect directly from the anchor's
// FRACTIONAL position inside the current view (fx, fy) rather than the view
// center zoomNetwork() uses -- that fraction is preserved exactly by
// construction, so drift is 0 whenever the clamp does not bind, and the
// clamp (same [260,1400] width / canvas-bounds rule as zoomNetwork) still
// applies at the edges exactly "as now" per the operator's implementation
// note. Pure and vm-testable: takes/returns plain view rects, no state.
function zoomViewAboutPoint(view, factor, worldX, worldY) {
  const nextWidth = Math.max(260, Math.min(1400, view.width * factor));
  const nextHeight = nextWidth * (900 / 1400);
  const fx = view.width > 0 ? (worldX - view.x) / view.width : 0.5;
  const fy = view.height > 0 ? (worldY - view.y) / view.height : 0.5;
  return {
    x: Math.max(0, Math.min(1400 - nextWidth, worldX - fx * nextWidth)),
    y: Math.max(0, Math.min(900 - nextHeight, worldY - fy * nextHeight)),
    width: nextWidth, height: nextHeight
  };
}

function resetNetworkView() {
  state.networkView = { ...NETWORK_FULL_VIEW };
  applyNetworkView();
}

function centerNetworkViewOn(x, y, width) {
  const nextWidth = Math.max(260, Math.min(1400, width));
  const nextHeight = nextWidth * (900 / 1400);
  state.networkView = {
    x: Math.max(0, Math.min(1400 - nextWidth, x - nextWidth / 2)),
    y: Math.max(0, Math.min(900 - nextHeight, y - nextHeight / 2)),
    width: nextWidth, height: nextHeight
  };
  applyNetworkView();
}

// The width just past each level's own "enter" threshold from the semantic
// zoom design note, so re-centering here actually lands ON that level
// rather than merely approaching its boundary.
function atlasZoomWidthForLevel(level) {
  const t = SEMANTIC_LEVEL_THRESHOLDS;
  const targetScale = level === 'machine' ? t.corpusToMachine.enter
    : level === 'surface' ? t.machineToSurface.enter
    : level === 'evidence' ? t.surfaceToEvidence.enter
    : 1;
  return NETWORK_FULL_VIEW.width / (targetScale * 1.05);
}

// Contract section 1 Rebuild, "Aggregates open, not swap": clicking a corpus
// aggregate re-centers and zooms to just past the machine threshold at the
// SAME anchor the ring occupied -- no separate bookkeeping is needed because
// buildAtlasMachineContainers positions containers from the identical
// build/atlas-projection.json machine.position an aggregate whose group
// matches an organization_id already anchors to (atlasAggregateAnchor), so
// the incoming machine-level objects for that cluster appear centered where
// the ring was. The camera itself still makes no representational decision
// (section 1 "Unique decision enabled: None") -- it only answers section 2's "which cluster
// do I open?".
function openAtlasAggregate(aggId) {
  const model = state.networkModel;
  if (!model) return;
  const aggregates = buildAtlasAggregates(model, state.atlasProjection);
  const agg = aggregates.find(a => a.id === aggId);
  if (!agg) return;
  centerNetworkViewOn(agg.x, agg.y, atlasZoomWidthForLevel('machine'));
}

// Contract section 2 Rebuild, "Corridor as a labeled object": a corridor gets a
// hover/selection state that opens its detail in the inspector panel like
// any other object. A corridor is not a graph node (it has no actor/org id
// of its own), so selecting one clears any node selection rather than
// reusing selectNetworkNode.
function selectAtlasCorridor(corridorId) {
  const corridorModel = buildCorridorLayerModel(state.atlasProjection);
  const corridor = corridorModel.corridors.find(c => c.id === corridorId);
  const inspector = $('#network-inspector');
  if (!corridor || !inspector) return;
  state.networkSelectedId = null;
  const layer = $('#network-layer');
  for (const element of layer?.querySelectorAll('[data-network-node]') ?? []) element.classList.remove('is-selected');
  for (const element of layer?.querySelectorAll('[data-atlas-corridor]') ?? []) element.classList.toggle('is-selected', element.dataset.atlasCorridor === corridorId);
  inspector.innerHTML = `<p class="section-kicker">Structural corridor</p><h3>${esc(corridor.label)}</h3>
    <p class="corridor-effect-note"><strong>No Clifford Number effect.</strong> A structural corridor is a documented multi-stage sequence, not actor co-presence -- it never changes an admitted hop.</p>
    <div class="network-node-metric"><strong>${corridor.stageCount}</strong><span>documented stage${corridor.stageCount === 1 ? '' : 's'}</span></div>`;
}

function toggleNetworkPin(id) {
  if (state.networkPinned.has(id)) state.networkPinned.delete(id);
  else state.networkPinned.add(id);
  if (state.networkLevel) mountAtlasLevel(state.networkLevel);
}

function renderNetworkAtlas(mode = state.networkMode, selectedId = null) {
  const layer = $('#network-layer');
  if (!layer) return;
  state.networkMode = mode;
  state.networkModel = mode === 'hops' ? hopNetworkModel() : researchNetworkModel();
  const model = state.networkModel;
  state.networkLevel = null; // force a fresh mount against the new model
  const uniqueSurfaces = new Set((state.hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).map(surfaceItem => surfaceItem.surface_id)));
  $('#atlas-stats').innerHTML = model.mode === 'research'
    ? `<strong>${model.nodes.length}</strong> public nodes <span>·</span> <strong>${model.edges.length}</strong> sourced edges <span>·</span> <strong>${model.nodeById.get('dialog')?.degree ?? 0}</strong> edges at Dialog`
    : `<strong>${model.nodes.length}</strong> admitted actors <span>·</span> <strong>${model.edges.length}</strong> valid hops <span>·</span> <strong>${uniqueSurfaces.size}</strong> bounded surfaces`;
  for (const button of document.querySelectorAll('[data-network-mode]')) {
    const active = button.dataset.networkMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  resetNetworkView();
  selectNetworkNode(selectedId && model.nodeById.has(selectedId) ? selectedId : model.defaultNode);
}

function selectNetworkNode(id) {
  const model = state.networkModel;
  const node = model?.nodeById.get(id);
  const inspector = $('#network-inspector');
  if (!node || !inspector) return;
  const selectionChanged = state.networkSelectedId !== id;
  state.networkSelectedId = id;
  if (selectionChanged && state.networkLevel) mountAtlasLevel(state.networkLevel);
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

function openNetworkEdge(id, el = null) {
  if (state.networkMode === 'research') {
    const claimKey = state.claimKeyById.get(`clm-${id}`);
    if (claimKey) openClaimDialog(claimKey, atlasInspectorOrigin(el));
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
    state.dismissAtlasOrientationStrip?.();
    // Contract Section 1 Keep: "The +/- buttons zoom toward the view center
    // (their anchor is the button metaphor, not the pointer)" -- only the
    // wheel/pinch handler below uses the cursor-anchored zoomViewAboutPoint.
    if (button.dataset.networkZoom === 'reset') resetNetworkView();
    else zoomNetwork(button.dataset.networkZoom === 'in' ? .72 : 1.28);
  });
  const svg = $('#network-svg');
  if (!svg) return;
  // Contract Section 1 Rebuild, "Cursor-anchored zoom": wheel (and trackpad
  // pinch, which the browser also dispatches as ctrl+wheel) zooms toward the
  // pointer instead of the view center -- the world point under the cursor
  // stays under the cursor (see zoomViewAboutPoint).
  svg.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const view = state.networkView;
    const px = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
    const py = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
    const worldX = view.x + px * view.width;
    const worldY = view.y + py * view.height;
    state.networkView = zoomViewAboutPoint(view, event.deltaY > 0 ? 1.12 : .88, worldX, worldY);
    applyNetworkView();
    state.dismissAtlasOrientationStrip?.();
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
  initAtlasHoverChip();
  initAtlasOrientationStrip();
}

/* ---------------- Hover chips (ladder step 2, "Corpus view self-explanation") ----------------
   Contract Section 2 Rebuild, "Hover = meaning": every encoded channel on
   screen (arc segment, wash, corridor, aggregate boundary, edge band) must
   be nameable by hover. One shared HTML chip absolutely positioned over the
   map container reads whichever data-encoding string the pointer is over --
   simpler and more legible than an SVG <text> that would have to wrap
   itself, and it never affects page layout since it is position:absolute
   inside the already-relative .atlas-canvas-wrap. */

function initAtlasHoverChip() {
  const wrap = $('.atlas-canvas-wrap');
  const chip = $('#atlas-hover-chip');
  if (!wrap || !chip) return;
  const show = event => {
    const el = event.target.closest?.('[data-encoding]');
    if (!el) return;
    chip.textContent = el.dataset.encoding;
    chip.hidden = false;
  };
  const move = event => {
    if (chip.hidden) return;
    const rect = wrap.getBoundingClientRect();
    chip.style.left = `${event.clientX - rect.left + 16}px`;
    chip.style.top = `${event.clientY - rect.top + 16}px`;
  };
  const hide = event => {
    const el = event.target.closest?.('[data-encoding]');
    if (!el || (event.relatedTarget && el.contains(event.relatedTarget))) return;
    chip.hidden = true;
  };
  wrap.addEventListener('pointerover', show);
  wrap.addEventListener('pointermove', move);
  wrap.addEventListener('pointerout', hide);
  wrap.addEventListener('focusin', event => {
    const el = event.target.closest?.('[data-encoding]');
    if (!el) return;
    chip.textContent = el.dataset.encoding;
    chip.hidden = false;
    const box = el.getBoundingClientRect(), wrapBox = wrap.getBoundingClientRect();
    chip.style.left = `${box.left - wrapBox.left}px`;
    chip.style.top = `${box.bottom - wrapBox.top + 8}px`;
  });
  wrap.addEventListener('focusout', () => { chip.hidden = true; });
}

/* ---------------- First three minutes (ladder step 2/Section 6) ----------------
   Contract Section 6 Rebuild: a one-line orientation strip in document flow,
   dismissible, and permanently backgrounded (localStorage) once the reader
   zooms or selects -- "playing is dismissal." computeOrientationStripState
   is the pure decision (vm-testable); initAtlasOrientationStrip is the only
   impure wiring around it (localStorage + the DOM hidden attribute). Once
   dismissed is true, it must stay true regardless of further events --
   dismissal is a one-way door, not a toggle. */

const ORIENTATION_STRIP_KEY = 'clifford-atlas-orientation-dismissed';

function computeOrientationStripState(prevDismissed, event) {
  if (prevDismissed) return { dismissed: true, visible: false };
  const dismissed = event === 'zoom' || event === 'select' || event === 'dismiss';
  return { dismissed, visible: !dismissed };
}

function initAtlasOrientationStrip() {
  const strip = $('#atlas-orientation-strip');
  if (!strip) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem(ORIENTATION_STRIP_KEY) === '1'; } catch {}
  const render = () => { strip.hidden = dismissed; };
  const dismiss = () => {
    const next = computeOrientationStripState(dismissed, 'dismiss');
    if (next.dismissed === dismissed) return;
    dismissed = next.dismissed;
    try { localStorage.setItem(ORIENTATION_STRIP_KEY, '1'); } catch {}
    render();
  };
  render();
  $('#atlas-orientation-dismiss')?.addEventListener('click', dismiss);
  // Exposed on state so every map interaction (wheel zoom, zoom buttons,
  // node/aggregate/corridor selection) can call it without each call site
  // needing to know about localStorage or the strip element.
  state.dismissAtlasOrientationStrip = dismiss;
}

/* ---------------- Evidence Overview (ladder step 4) ----------------
   docs/atlas-representation-ladder.md §"5. Evidence inspection" +
   §"Per-level requirements" item 4. A persistent, sortable panel — never a
   transient popup — with six tabs. The model half below (evidenceOverviewModel,
   sortOverviewRows, and their per-tab row builders) is pure: every one takes
   an explicit `state`-shaped object plus an `options` object and returns a
   fresh value, so it is vm-testable in isolation exactly like the atlas
   ladder functions above, independent of the module-level `state` this file
   otherwise mutates directly. The render/wiring functions further below are
   the only impure part; they are the sole place that reads the real module
   `state` and touches the DOM. */

const EVIDENCE_OVERVIEW_TABS = [
  { id: 'visible', label: 'Visible objects' },
  { id: 'route', label: 'Active route' },
  { id: 'participants', label: 'Surface participants' },
  { id: 'rejected', label: 'Rejected steps' },
  { id: 'warnings', label: 'Evidence warnings' },
  { id: 'gaps', label: 'Research gaps' }
];
const EVIDENCE_OVERVIEW_TAB_IDS = new Set(EVIDENCE_OVERVIEW_TABS.map(tab => tab.id));
const EVIDENCE_OVERVIEW_COLUMNS = [
  { key: 'classification', label: 'Type', sortable: true },
  { key: 'label', label: 'Label', sortable: true },
  { key: 'evidenceClass', label: 'Evidence', sortable: true },
  { key: 'receiptCount', label: 'Receipts', sortable: true },
  { key: 'temporal', label: 'Temporal', sortable: true },
  { key: 'graphEffect', label: 'Graph effect', sortable: false },
  { key: 'inferenceBoundary', label: 'Inference boundary', sortable: false }
];

function overviewActorLabel(state, id) { return state.actors?.get(id)?.label || id; }
function overviewOrgLabel(state, id) { return state.orgs?.get(id)?.label || id; }

// Pure temporal-precision text for a basis/participation-shaped record.
// Reads only the fields it is handed, never module state.
function overviewTemporalText(record) {
  if (!record) return null;
  if (record.temporal_status === 'undated' || (!record.valid_from && !record.valid_until)) return 'Undated — all-time context only';
  if (record.temporal_status && record.temporal_status !== 'dated') return 'Dates incomplete — not time-sliceable';
  if (!record.valid_from && !record.valid_until) return null;
  return `${record.valid_from ?? '…'} → ${record.valid_until ?? 'ongoing'}`;
}

function overviewRejectionWindowText(pair) {
  if (!pair?.actor_a_window && !pair?.actor_b_window) return null;
  const fmt = window => window ? `${window.valid_from ?? '…'} → ${window.valid_until ?? 'ongoing'}` : 'undated';
  return `${fmt(pair.actor_a_window)} vs ${fmt(pair.actor_b_window)}`;
}

function actorSurfaceReceiptIds(state, actorId) {
  const ids = new Set();
  for (const item of state.surfaceGraph?.surfaces ?? []) {
    for (const participant of item.participants ?? []) {
      if (participant.participant_type !== 'actor' || participant.actor_id !== actorId) continue;
      for (const receiptId of item.receipt_ids ?? []) ids.add(receiptId);
      for (const receiptId of participant.receipt_ids ?? []) ids.add(receiptId);
    }
  }
  return [...ids];
}

// Tab: Visible objects — what the current semantic level actually renders as
// individually-addressable nodes (reuses the already-tested buildAtlasIndividualNodes,
// never re-derives visibility on its own).
function buildVisibleObjectRows(state, options = {}) {
  const model = state.networkModel;
  if (!model) return [];
  const level = options.level ?? state.networkLevel ?? 'corpus';
  const bypassIds = options.bypassIds ?? computeAtlasBypass(model, {
    searchIds: state.networkSearchIds, selectedId: state.networkSelectedId,
    routeIds: state.networkRouteIds, pinnedIds: state.networkPinned
  });
  return buildAtlasIndividualNodes(model, level, bypassIds).map(view => {
    const node = model.nodeById.get(view.id);
    const receiptIds = state.surfaceGraph ? actorSurfaceReceiptIds(state, view.id) : [];
    return {
      key: `visible:${view.id}`,
      classification: node?.type === 'person' ? 'actor' : 'organization',
      label: view.label,
      evidenceClass: null,
      receiptIds,
      receiptCount: receiptIds.length,
      temporal: null,
      graphEffect: `${view.degree} documented edge${view.degree === 1 ? '' : 's'} rendered at ${level} level`,
      inferenceBoundary: null,
      objectId: view.id,
      objectKind: 'node'
    };
  });
}

// Route step -> Evidence Overview row, for a src/route-projections.js-shaped
// step ({actorA, actorB, surfaceId, surfaceLabel, evidenceClass, receiptIds,
// window: {validFrom, validUntil, dated}, temporalPrecision}).
function overviewTemporalTextFromProjectedWindow(window, temporalPrecision) {
  if (!window) return null;
  if (temporalPrecision === 'undated' || (!window.validFrom && !window.validUntil)) return 'Undated — all-time context only';
  if (temporalPrecision && temporalPrecision !== 'dated') return 'Dates incomplete — not time-sliceable';
  return `${window.validFrom ?? '…'} → ${window.validUntil ?? 'ongoing'}`;
}

// Tab: Active route — the current hop route/selection chain, alternating
// actor and surface steps exactly per ladder §"4. Route (tactical)". When
// `state.activeRoute` (a src/route-projections.js-shaped route, set by the
// connection desk's projection selector) is present, it takes priority over
// the atlas selection so this tab always reflects the currently displayed
// projection — never a stale atlas pick from before the desk check ran.
function buildActiveRouteRows(state, options = {}) {
  const explicitRoute = options.activeRoute ?? state.activeRoute ?? null;
  if (explicitRoute?.steps?.length) {
    const rows = [];
    const actorPath = [explicitRoute.steps[0].actorA, ...explicitRoute.steps.map(step => step.actorB)];
    actorPath.forEach((actorId, index) => {
      rows.push({
        key: `route:actor:${index}:${actorId}`,
        classification: 'actor',
        label: overviewActorLabel(state, actorId),
        evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: null,
        graphEffect: `Route step ${index + 1} of ${actorPath.length}`,
        inferenceBoundary: null, objectId: actorId, objectKind: 'node'
      });
      const step = explicitRoute.steps[index];
      if (step) {
        rows.push({
          key: `route:surface:${index}:${step.surfaceId}`,
          classification: 'surface',
          label: step.surfaceLabel,
          evidenceClass: step.evidenceClass ?? null,
          receiptIds: step.receiptIds ?? [],
          receiptCount: (step.receiptIds ?? []).length,
          temporal: overviewTemporalTextFromProjectedWindow(step.window, step.temporalPrecision),
          graphEffect: `Bridges route step ${index + 1} to ${index + 2}`,
          inferenceBoundary: 'Supports documented shared context on this bounded surface only. It does not establish contact, influence, coordination, agreement, or wrongdoing.',
          objectId: step.surfaceId, objectKind: 'surface'
        });
      }
    });
    return rows;
  }
  const model = state.networkModel;
  if (!model || model.mode !== 'hops') return [];
  const selectedId = options.selectedId ?? state.networkSelectedId;
  const path = selectedId ? state.hopGraph?.shortest_paths?.[selectedId] : null;
  if (!path?.actor_path?.length) return [];
  const rows = [];
  path.actor_path.forEach((actorId, index) => {
    rows.push({
      key: `route:actor:${index}:${actorId}`,
      classification: 'actor',
      label: overviewActorLabel(state, actorId),
      evidenceClass: null,
      receiptIds: [],
      receiptCount: 0,
      temporal: null,
      graphEffect: `Route step ${index + 1} of ${path.actor_path.length}`,
      inferenceBoundary: null,
      objectId: actorId,
      objectKind: 'node'
    });
    const hop = path.hops[index];
    const basis = hop?.shared_surfaces?.[0];
    if (basis) {
      rows.push({
        key: `route:surface:${index}:${basis.surface_id}`,
        classification: 'surface',
        label: basis.surface_label,
        evidenceClass: basis.evidence_class ?? null,
        receiptIds: basis.receipt_ids ?? [],
        receiptCount: (basis.receipt_ids ?? []).length,
        temporal: overviewTemporalText(basis),
        graphEffect: `Bridges route step ${index + 1} to ${index + 2}`,
        inferenceBoundary: 'Supports documented shared context on this bounded surface only. It does not establish contact, influence, coordination, agreement, or wrongdoing.',
        objectId: basis.surface_id,
        objectKind: 'surface'
      });
    }
  });
  return rows;
}

// Tab: Surface participants — participants of options.surfaceId. Dense/roster
// surfaces (constitutional rule, same threshold as the atlas bipartite guard)
// render as one honest count+category aggregate row, never pairwise rows.
function buildSurfaceParticipantRows(state, options = {}) {
  const surfaceId = options.surfaceId ?? null;
  const surfaceRecord = surfaceId ? state.surfaces?.get(surfaceId) : null;
  if (!surfaceRecord) return [];
  const participants = surfaceRecord.participants ?? [];
  const actorCount = participants.filter(p => p.participant_type === 'actor').length;
  if (actorCount >= DENSE_SURFACE_PARTICIPANT_THRESHOLD) {
    const categories = new Map();
    for (const p of participants) {
      const category = humanLabel(p.participation_type || p.role || 'participant');
      categories.set(category, (categories.get(category) ?? 0) + 1);
    }
    const surfaceWindow = overviewTemporalText({
      temporal_status: surfaceRecord.time_start || surfaceRecord.time_end ? 'dated' : 'undated',
      valid_from: surfaceRecord.time_start, valid_until: surfaceRecord.time_end
    });
    return [{
      key: `participants:roster:${surfaceId}`,
      classification: 'surface',
      label: `${surfaceRecord.surface_label} — full roster`,
      evidenceClass: null,
      receiptIds: surfaceRecord.receipt_ids ?? [],
      receiptCount: (surfaceRecord.receipt_ids ?? []).length,
      temporal: surfaceWindow,
      graphEffect: `${participants.length} documented participant${participants.length === 1 ? '' : 's'} across ${categories.size} categor${categories.size === 1 ? 'y' : 'ies'} — roster honestly counted, never expanded into pairwise adjacency`,
      inferenceBoundary: 'A dense surface roster documents presence only. It is never expanded into person-to-person adjacency.',
      objectId: surfaceId,
      objectKind: 'surface',
      rosterCategories: [...categories.entries()].map(([category, count]) => ({ category, count }))
    }];
  }
  return participants.map((participant, index) => {
    const isActor = participant.participant_type === 'actor';
    const objectId = isActor ? participant.actor_id : participant.organization_id;
    return {
      key: `participants:${surfaceId}:${index}:${objectId}`,
      classification: isActor ? 'actor' : 'organization',
      label: isActor ? overviewActorLabel(state, objectId) : overviewOrgLabel(state, objectId),
      evidenceClass: participant.evidence_class ?? null,
      receiptIds: participant.receipt_ids ?? [],
      receiptCount: (participant.receipt_ids ?? []).length,
      temporal: overviewTemporalText({
        temporal_status: participant.time_start || participant.time_end ? 'dated' : 'undated',
        valid_from: participant.time_start, valid_until: participant.time_end
      }),
      graphEffect: participant.role || humanLabel(participant.participation_type || '') || 'Named participant',
      inferenceBoundary: null,
      objectId,
      objectKind: 'node'
    };
  });
}

// Tab: Rejected steps — hop-graph's rejected_hop_pairs (actor-pair refusals)
// and rejected_hop_surfaces (surfaces excluded from hop admission entirely).
function buildRejectedStepRows(state, options = {}) {
  const rows = [];
  (state.hopGraph?.rejected_hop_pairs ?? []).forEach((pair, index) => {
    const verified = pair.publication_status === 'verified';
    rows.push({
      key: `rejected:pair:${index}:${pair.actor_a}:${pair.actor_b}:${pair.surface_id}`,
      classification: 'hop',
      label: `${overviewActorLabel(state, pair.actor_a)} × ${overviewActorLabel(state, pair.actor_b)} — ${humanLabel(pair.reason)}`,
      evidenceClass: pair.evidence_class ?? null,
      receiptIds: pair.receipt_ids ?? [],
      receiptCount: (pair.receipt_ids ?? []).length,
      temporal: overviewRejectionWindowText(pair),
      graphEffect: 'No hop admitted: rejected at the bounded-surface compiler.',
      inferenceBoundary: verified
        ? 'The directly supported actor windows do not overlap. No connection is asserted through this surface.'
        : 'Ledger windows do not overlap, but decisive receipts are not publicly re-verifiable. This rejection is not published as a checked negative finding.',
      objectId: pair.surface_id ?? null,
      objectKind: 'surface',
      publicationStatus: pair.publication_status ?? null
    });
  });
  (state.hopGraph?.rejected_hop_surfaces ?? []).forEach((item, index) => {
    rows.push({
      key: `rejected:surface:${index}:${item.surface_id}`,
      classification: 'surface',
      label: `${state.surfaces?.get(item.surface_id)?.surface_label || item.surface_id} — ${humanLabel(item.reason)}`,
      evidenceClass: null,
      receiptIds: [],
      receiptCount: 0,
      temporal: null,
      graphEffect: 'Surface excluded from hop admission entirely.',
      inferenceBoundary: null,
      objectId: item.surface_id ?? null,
      objectKind: 'surface',
      publicationStatus: null
    });
  });
  return rows;
}

// Tab: Evidence warnings — receipts (build/receipt-graph.json) with archival
// distress (archive.method === 'unrecoverable_local_paste', a missing
// archive.ref, or an explicit archive.note), plus claims (public-catalog)
// still held at claim_status === 'review_required'.
function buildEvidenceWarningRows(state, options = {}) {
  const rows = [];
  for (const [id, receipt] of state.receipts ?? []) {
    const lost = receipt.archive?.method === 'unrecoverable_local_paste';
    const noArchiveRef = !lost && !receipt.archive?.ref;
    if (!lost && !noArchiveRef && !receipt.archive?.note) continue;
    rows.push({
      key: `warning:receipt:${id}`,
      classification: 'claim',
      label: receipt.label || id,
      evidenceClass: receipt.evidence_class ?? null,
      receiptIds: [id],
      receiptCount: 1,
      temporal: receipt.archive?.checked ? `Archive checked ${receipt.archive.checked}` : null,
      graphEffect: lost ? 'Original source recorded as unrecoverable.' : 'No archived copy recorded for this receipt.',
      inferenceBoundary: receipt.archive?.note ?? null,
      objectId: id,
      objectKind: 'receipt',
      severity: lost ? 'lost' : 'warning'
    });
  }
  for (const claim of state.claimCatalog?.values?.() ?? []) {
    if (claim.claim_status !== 'review_required') continue;
    rows.push({
      key: `warning:claim:${claim.key}`,
      classification: 'claim',
      label: claim.plain,
      evidenceClass: claim.evidence_class ?? null,
      receiptIds: [],
      receiptCount: claim.receipt_count ?? 0,
      temporal: claim.occurred_at ?? null,
      graphEffect: 'Claim held at review-required status; not published as a checked finding.',
      inferenceBoundary: null,
      objectId: claim.key,
      objectKind: 'claim',
      severity: 'review'
    });
  }
  return rows;
}

// Tab: Research gaps — honest aggregates of what is absent. Every row names
// its denominator, matching the aggregate-labeling convention used by the
// corpus-level atlas aggregates above.
function buildResearchGapRows(state, options = {}) {
  const rows = [];
  const surfaces = state.surfaceGraph?.surfaces ?? [];
  let undated = 0, totalParticipants = 0;
  for (const s of surfaces) for (const p of s.participants ?? []) { totalParticipants++; if (!p.time_start && !p.time_end) undated++; }
  if (totalParticipants) {
    rows.push({
      key: 'gap:undated-participations',
      classification: 'surface', label: 'Undated participations',
      evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: 'No time window recorded',
      graphEffect: `${undated} of ${totalParticipants} documented participations carry no date and support no time-sliced ("as of") query.`,
      inferenceBoundary: 'Undated participation is never placed in time and never supports an "as of" answer.',
      objectId: null, objectKind: null
    });
  }
  const rejections = state.hopGraph?.rejected_hop_pairs ?? [];
  if (rejections.length) {
    const reviewRequired = rejections.filter(p => p.publication_status !== 'verified').length;
    rows.push({
      key: 'gap:review-required-rejections',
      classification: 'hop', label: 'Review-required refusals',
      evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: null,
      graphEffect: `${reviewRequired} of ${rejections.length} compiler refusals are review-required, not published as checked negative findings.`,
      inferenceBoundary: null, objectId: null, objectKind: null
    });
  }
  const receiptsArr = [...(state.receipts?.values?.() ?? [])];
  if (receiptsArr.length) {
    const noArchive = receiptsArr.filter(r => !r.archive?.ref).length;
    rows.push({
      key: 'gap:unarchived-receipts',
      classification: 'claim', label: 'Receipts without an archived reference',
      evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: null,
      graphEffect: `${noArchive} of ${receiptsArr.length} indexed receipts carry no recorded archive reference.`,
      inferenceBoundary: null, objectId: null, objectKind: null
    });
  }
  if (surfaces.length) {
    const contextOnly = surfaces.filter(s => !s.hop_eligible).length;
    const dense = surfaces.filter(s => !s.hop_eligible && (s.participants ?? []).filter(p => p.participant_type === 'actor').length >= DENSE_SURFACE_PARTICIPANT_THRESHOLD).length;
    rows.push({
      key: 'gap:context-only-surfaces',
      classification: 'surface', label: 'Context-only surfaces',
      evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: null,
      graphEffect: `${contextOnly} of ${surfaces.length} bounded surfaces are context-only and never generate a hop (${dense} of those are dense-roster surfaces).`,
      inferenceBoundary: null, objectId: null, objectKind: null
    });
  }
  const tracks = [...(state.tracks?.values?.() ?? [])];
  if (tracks.length) {
    const openGaps = tracks.filter(t => (t.coverage_gap_count ?? 0) > 0).length;
    rows.push({
      key: 'gap:research-track-coverage',
      classification: 'claim', label: 'Research track coverage gaps',
      evidenceClass: null, receiptIds: [], receiptCount: 0, temporal: null,
      graphEffect: `${openGaps} of ${tracks.length} declared research tracks carry a visible, unfinished coverage gap.`,
      inferenceBoundary: null, objectId: null, objectKind: null
    });
  }
  return rows;
}

const EVIDENCE_OVERVIEW_BUILDERS = {
  visible: buildVisibleObjectRows, route: buildActiveRouteRows, participants: buildSurfaceParticipantRows,
  rejected: buildRejectedStepRows, warnings: buildEvidenceWarningRows, gaps: buildResearchGapRows
};

// The two functions the ladder note names explicitly. Pure: given the same
// (state, options) this returns the same { tabs, activeTab, rows, sortKey,
// sortDirection } every time. Sorting is only ever applied when the caller
// passes an explicit sortKey — i.e. when the user clicked a column — so a
// re-render triggered by hover, keyboard focus, opening a receipt, a tab
// switch, or an unrelated selection change (which calls this with the same
// sortKey/sortDirection it already had) can never reorder rows underneath
// the pointer.
function evidenceOverviewModel(state, options = {}) {
  const sortKey = options.sortKey ?? null;
  const sortDirection = options.sortDirection === 'desc' ? 'desc' : 'asc';
  const rowsByTab = {};
  for (const tab of EVIDENCE_OVERVIEW_TABS) rowsByTab[tab.id] = EVIDENCE_OVERVIEW_BUILDERS[tab.id](state, options);
  const activeTab = EVIDENCE_OVERVIEW_TAB_IDS.has(options.activeTab) ? options.activeTab : 'visible';
  const tabs = EVIDENCE_OVERVIEW_TABS.map(tab => ({ id: tab.id, label: tab.label, count: rowsByTab[tab.id].length }));
  const activeRows = rowsByTab[activeTab];
  const rows = sortKey ? sortOverviewRows(activeRows, sortKey, sortDirection) : activeRows;
  return { tabs, activeTab, rows, sortKey, sortDirection };
}

function overviewSortValue(row, sortKey) {
  if (sortKey === 'receiptCount') return row.receiptCount ?? 0;
  if (sortKey === 'evidenceClass') return row.evidenceClass ? (EVIDENCE_RANK[row.evidenceClass] ?? 8) : 9;
  if (sortKey === 'temporal') return row.temporal ?? '';
  if (sortKey === 'classification') return row.classification ?? '';
  return row.label ?? '';
}

function compareOverviewValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// Stable sort: rows are decorated with their original index before sorting,
// and that index is the final tie-break, so rows that compare equal on
// sortKey never swap relative order. Re-sorting only ever happens because a
// caller passed a new sortKey/direction (a column click) — never as a side
// effect of filtering the input array first or of calling this again with
// unchanged inputs.
function sortOverviewRows(rows, sortKey, direction = 'asc') {
  const dir = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const cmp = compareOverviewValues(overviewSortValue(a.row, sortKey), overviewSortValue(b.row, sortKey));
      if (cmp !== 0) return cmp * dir;
      return a.index - b.index;
    })
    .map(entry => entry.row);
}

// ---- Render/wiring (impure: the only part of this section that reads the
// real module `state` and touches the DOM). Map <-> table coupling: mountAtlasLevel
// (below) calls renderEvidenceOverview() on every level/selection/search/pin
// change, and activateOverviewRow() below selects the matching map object
// when a row is activated. ----

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function currentOverviewSurfaceId() {
  if (state.overviewSurfaceId) return state.overviewSurfaceId;
  const model = state.networkModel;
  if (!model || model.mode !== 'hops' || !state.networkSelectedId) return null;
  const path = state.hopGraph?.shortest_paths?.[state.networkSelectedId];
  const fromRoute = path?.hops?.[0]?.shared_surfaces?.[0]?.surface_id;
  if (fromRoute) return fromRoute;
  const edge = model.edges.find(e => e.from === state.networkSelectedId || e.to === state.networkSelectedId);
  return edge?.surfaces?.[0]?.surface_id ?? null;
}

// Highlights the bipartite hop-expansion glyph(s) for a surface picked from
// the overview table. Reuses the existing data-hop-basis attribute already
// rendered by renderBipartiteGlyph — no new map data model needed.
function highlightOverviewSurface(surfaceId) {
  for (const el of document.querySelectorAll('[data-hop-basis]')) {
    el.classList.toggle('is-overview-highlight', !!surfaceId && el.dataset.hopBasis === surfaceId);
  }
}

function evidenceOverviewRowAriaLabel(row) {
  const parts = [humanLabel(row.classification), row.label];
  if (row.evidenceClass) parts.push(humanLabel(row.evidenceClass));
  if (row.receiptCount) parts.push(`${row.receiptCount} receipt${row.receiptCount === 1 ? '' : 's'}`);
  return parts.join(', ');
}

function renderEvidenceOverviewTabs(model) {
  const nav = $('#evidence-overview-tabs');
  if (!nav) return;
  nav.innerHTML = model.tabs.map(tab => `<button type="button" role="tab" id="eo-tab-${esc(tab.id)}" aria-selected="${tab.id === model.activeTab}" aria-controls="evidence-overview-tbody" data-overview-tab="${esc(tab.id)}" tabindex="${tab.id === model.activeTab ? '0' : '-1'}">${esc(tab.label)} <span class="eo-tab-count">${tab.count}</span></button>`).join('');
  const buttons = [...nav.querySelectorAll('[data-overview-tab]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      state.overviewActiveTab = button.dataset.overviewTab;
      renderEvidenceOverview();
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = buttons.indexOf(button);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
      buttons[next].click();
    });
  }
}

function renderEvidenceOverviewHead(model) {
  const head = $('#evidence-overview-head');
  if (!head) return;
  head.innerHTML = `<tr>${EVIDENCE_OVERVIEW_COLUMNS.map(col => {
    if (!col.sortable) return `<th scope="col">${esc(col.label)}</th>`;
    const active = model.sortKey === col.key;
    const sortAttr = active ? (model.sortDirection === 'desc' ? 'descending' : 'ascending') : 'none';
    return `<th scope="col" aria-sort="${sortAttr}"><button type="button" data-sort-key="${esc(col.key)}">${esc(col.label)}${active ? `<span aria-hidden="true">${model.sortDirection === 'desc' ? ' ▼' : ' ▲'}</span>` : ''}</button></th>`;
  }).join('')}</tr>`;
  for (const button of head.querySelectorAll('[data-sort-key]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.sortKey;
      state.overviewSortDirection = state.overviewSortKey === key && state.overviewSortDirection === 'asc' ? 'desc' : 'asc';
      state.overviewSortKey = key;
      renderEvidenceOverview();
    });
  }
}

function activateOverviewRow(row) {
  if (!row) return;
  if (row.objectKind === 'node' && row.objectId) {
    selectNetworkNode(row.objectId);
  } else if (row.objectKind === 'surface' && row.objectId) {
    state.overviewSurfaceId = row.objectId;
    state.overviewHighlightSurfaceId = row.objectId;
    if (state.networkLevel) mountAtlasLevel(state.networkLevel);
    else renderEvidenceOverview();
  } else if (row.objectKind === 'receipt' && row.objectId) {
    openReceiptDialog(row.objectId);
  } else if (row.objectKind === 'claim' && row.objectId) {
    openClaimDialog(row.objectId);
  }
}

function renderEvidenceOverviewRows(model) {
  const body = $('#evidence-overview-tbody');
  const empty = $('#evidence-overview-empty');
  if (!body) return;
  if (!model.rows.length) {
    body.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  body.innerHTML = model.rows.map(row => {
    const isSelected = (row.objectKind === 'node' && row.objectId === state.networkSelectedId)
      || (row.objectKind === 'surface' && row.objectId === state.overviewSurfaceId);
    return `<tr class="evidence-overview-row${isSelected ? ' is-selected' : ''}" data-row-key="${esc(row.key)}" tabindex="0" aria-label="${esc(evidenceOverviewRowAriaLabel(row))}">
      <td>${esc(humanLabel(row.classification))}</td>
      <td>${esc(row.label)}</td>
      <td>${row.evidenceClass ? evidenceBadge(row.evidenceClass) : '<span class="meta">—</span>'}</td>
      <td title="${esc((row.receiptIds ?? []).join(', '))}">${row.receiptCount || 0}</td>
      <td>${row.temporal ? esc(row.temporal) : '<span class="meta">Undated</span>'}</td>
      <td>${esc(row.graphEffect || '')}</td>
      <td>${row.inferenceBoundary ? `<span class="eo-boundary">${esc(row.inferenceBoundary)}</span>` : '<span class="meta">—</span>'}</td>
    </tr>`;
  }).join('');
  for (const rowEl of body.querySelectorAll('.evidence-overview-row')) {
    const row = model.rows.find(r => r.key === rowEl.dataset.rowKey);
    const activate = () => activateOverviewRow(row);
    rowEl.addEventListener('click', activate);
    rowEl.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });
  }
}

function renderEvidenceOverview() {
  if (!$('#evidence-overview')) return;
  const model = evidenceOverviewModel(state, {
    activeTab: state.overviewActiveTab,
    sortKey: state.overviewSortKey,
    sortDirection: state.overviewSortDirection,
    level: state.networkLevel,
    selectedId: state.networkSelectedId,
    surfaceId: currentOverviewSurfaceId()
  });
  state.overviewActiveTab = model.activeTab;
  renderEvidenceOverviewTabs(model);
  renderEvidenceOverviewHead(model);
  renderEvidenceOverviewRows(model);
  const summary = $('#evidence-overview-summary');
  const activeLabel = model.tabs.find(tab => tab.id === model.activeTab)?.label ?? model.activeTab;
  if (summary) summary.textContent = `${model.rows.length} row${model.rows.length === 1 ? '' : 's'} in ${activeLabel}`;
  const selectedRow = model.rows.find(row => (row.objectKind === 'node' && row.objectId === state.networkSelectedId) || (row.objectKind === 'surface' && row.objectId === state.overviewSurfaceId));
  // Scroll only when the selection itself changes. Re-renders (zoom level
  // transitions, pans, filter passes) must never move the page.
  if (selectedRow && selectedRow.key !== state.overviewScrolledForKey) {
    state.overviewScrolledForKey = selectedRow.key;
    const el = [...document.querySelectorAll('.evidence-overview-row')].find(node => node.dataset.rowKey === selectedRow.key);
    el?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  } else if (!selectedRow) {
    state.overviewScrolledForKey = null;
  }
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
  state.networkSearchIds = new Set(state.searchResults.filter(r => r.kind === 'actor').map(r => r.id));
  if (state.networkLevel) mountAtlasLevel(state.networkLevel);
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
  state.networkSearchIds = new Set();
  if (state.networkLevel) mountAtlasLevel(state.networkLevel);
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

async function renderCase(id) {
  const item = await loadCase(id);
  if (!item) return renderNotFound('case', id);
  setDocumentTitle(item.title);
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
    <div class="panel case-hero">${entityHeading(item.title, [])}<div class="case-print-row"><p class="case-subtitle">${esc(item.subtitle)} · ${esc(item.tracking_id)} · as known ${esc(item.as_of)}</p><button class="copy-link print-dossier" type="button" onclick="window.print()">Print dossier</button></div><p>${esc(item.scope)}</p><div class="evidence-note"><strong>Publication boundary.</strong> ${esc(item.boundary)}</div><p class="meta">${esc(item.disclaimer)}</p></div>
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
  const parts = (s.participants ?? []).map(p => `<li>${p.participant_type === 'actor' ? esc(labelActor(p.actor_id)) : esc(labelOrg(p.organization_id))}: ${esc(p.role)} <span class="meta">${esc(p.participation_type)}</span></li>`).join('');
  $('#detail').innerHTML = `
    <div class="panel">${entityHeading(s.surface_label, entityReceiptIds('surface', id))}<div class="badge-row"><span class="badge">${esc(s.surface_type)}</span>${(s.secondary_surface_types ?? []).map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(s.notes || '')}</p></div>
    <div class="panel"><h3>Participants</h3><ul>${parts}</ul></div>
    <div class="panel"><h3>Bounded by</h3><p>${(s.bounded_by ?? []).map(esc).join(', ')}</p>${renderReceiptGrid(s.receipt_ids, 'Surface receipts')}</div>
  `;
}

/* ---------------- Claims Desk ----------------
   Editor-facing verification: two names in, a verdict out — documented or
   not, for which dates, on what class of source — plus copy-ready standards
   language and the map's standing refusals. All checks run client-side on
   the same built artifacts the map uses. */

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
    const externalUrl = safeExternalUrl(r.url || r.source_url || path);
    const local = false;
    const url = externalUrl;
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

/* ---------------- Route projections (ladder step 5, "Route (tactical)") ----------------
   docs/atlas-representation-ladder.md: the minimum-hop route is always the
   Clifford Number and is always displayed first; every other projection
   (strongest evidence, best dated, official only, as-of) is a clearly
   labelled secondary that never redefines it and never silently substitutes
   for it when absent. routeModesModel is pure -- it reads only the
   `state.hopGraph` and `options` it is handed and returns a fresh value
   every call, so it is vm-testable exactly like evidenceOverviewModel. The
   underlying engines (shortestRoute, strongestEvidenceRoute, bestDatedRoute,
   officialOnlyRoute, asOfRoute, blockedSegments, routeProjections) live in
   src/route-projections.js and are never re-implemented here. */

const ROUTE_PROJECTION_SECONDARY_NOTICE = 'secondary projection — does not redefine the Clifford Number';
const ROUTE_PROJECTION_KEYS = new Set(['clifford', 'strongest-evidence', 'best-dated', 'official-only']);
const ROUTE_PROJECTION_DEFS = {
  'strongest-evidence': { label: 'Strongest evidence', pick: p => p.strongestEvidence, absenceMessage: 'No strongest-evidence route exists between these two actors.' },
  'best-dated': { label: 'Best dated', pick: p => p.bestDated, absenceMessage: 'No fully-dated route exists between these two actors.' },
  'official-only': { label: 'Official only', pick: p => p.officialOnly, absenceMessage: 'No official-only route exists between these two actors.' }
};

function routeModesModel(state, options = {}) {
  const hops = state?.hopGraph ?? null;
  const fromId = options.fromId ?? null;
  const toId = options.toId ?? null;
  const asOf = options.asOf || null;
  const selectedProjection = ROUTE_PROJECTION_KEYS.has(options.selectedProjection) ? options.selectedProjection : 'clifford';

  if (!hops || !fromId || !toId) {
    return { fromId, toId, asOf, selectedProjection, canonical: null, secondary: null, asOfEntry: null, blocked: [], entries: [] };
  }

  const projections = routeProjections(hops, fromId, toId, asOf ? { asOf } : {});

  const canonical = {
    kind: 'clifford', label: 'The Clifford Number', canonical: true, secondaryNotice: null,
    isNull: projections.clifford === null,
    absenceMessage: projections.clifford === null ? 'No documented route exists between these two actors.' : null,
    route: projections.clifford
  };

  let secondary = null;
  if (selectedProjection !== 'clifford') {
    const def = ROUTE_PROJECTION_DEFS[selectedProjection];
    const route = def.pick(projections);
    secondary = {
      kind: selectedProjection, label: def.label, canonical: false, secondaryNotice: ROUTE_PROJECTION_SECONDARY_NOTICE,
      isNull: route === null, absenceMessage: route === null ? def.absenceMessage : null,
      route
    };
  }

  let asOfEntry = null;
  if (asOf) {
    const route = projections.asOf ?? null;
    asOfEntry = {
      kind: 'as-of', label: `As of ${asOf}`, canonical: false, secondaryNotice: ROUTE_PROJECTION_SECONDARY_NOTICE,
      period: asOf, isNull: route === null,
      absenceMessage: route === null ? `No documented route exists as of ${asOf}.` : null,
      route
    };
  }

  const entries = [canonical, ...(secondary ? [secondary] : []), ...(asOfEntry ? [asOfEntry] : [])];
  return { fromId, toId, asOf, selectedProjection, canonical, secondary, asOfEntry, blocked: blockedSegments(hops, fromId, toId), entries };
}

// ---- Render (impure: the only part of this section that touches the DOM) ----

function projectedStepWindowText(step) {
  const window = step.window ?? {};
  if (step.temporalPrecision === 'undated' || (!window.validFrom && !window.validUntil)) return 'dates not documented';
  if (step.temporalPrecision && step.temporalPrecision !== 'dated') return 'dates incomplete — available for all-time topology, not a dated claim';
  return `${window.validFrom ?? '…'} → ${window.validUntil ?? 'ongoing'}`;
}

function renderProjectionStepCard(step) {
  const receiptCount = (step.receiptIds ?? []).length;
  return `<div class="surface-card surface-card--basis">
    <h4>${esc(step.surfaceLabel || step.surfaceId)}</h4>
    <div class="meta">${esc(projectedStepWindowText(step))} · ${esc(humanLabel(step.temporalPrecision || 'unknown'))} precision</div>
    <div class="badge-row">${evidenceBadge(step.evidenceClass)}<span class="badge">${receiptCount} receipt${receiptCount === 1 ? '' : 's'}</span></div>
    <p class="meta">${esc(labelActor(step.actorA))}: ${esc(step.roles?.a || 'named participant')}<br>${esc(labelActor(step.actorB))}: ${esc(step.roles?.b || 'named participant')}</p>
    ${renderReceiptGrid(step.receiptIds, 'Route receipts')}
    <div class="evidence-note">Supports documented shared context on this bounded surface only. It does not establish contact, influence, coordination, agreement, or wrongdoing.</div>
  </div>`;
}

function renderRouteProjectionEntry(entry) {
  if (!entry) return '';
  const heading = entry.canonical
    ? `<h3>The Clifford Number${entry.route ? ` · ${entry.route.hopCount} step${entry.route.hopCount === 1 ? '' : 's'}` : ''}</h3>`
    : `<h3>${esc(entry.label)}</h3><p class="secondary-projection-notice">${esc(entry.secondaryNotice)}</p>`;
  if (entry.isNull) {
    return `<div class="panel route-projection-entry route-projection-entry--absent">
      <span class="panel-label">${entry.canonical ? 'Canonical route — always shown first' : 'Secondary projection'}</span>
      ${heading}
      <p class="evidence-note">${esc(entry.absenceMessage)}</p>
    </div>`;
  }
  const topologyPath = {
    actor_path: [entry.route.steps[0].actorA, ...entry.route.steps.map(s => s.actorB)],
    hops: entry.route.steps.map(s => ({ shared_surfaces: [{ surface_label: s.surfaceLabel, evidence_class: s.evidenceClass }] }))
  };
  return `<div class="panel route-projection-entry${entry.canonical ? ' route-projection-entry--canonical' : ' route-projection-entry--secondary'}">
    <span class="panel-label">${entry.canonical ? 'Canonical route — always shown first' : 'Secondary projection'}</span>
    ${heading}
    ${renderTopologyMap(topologyPath)}
    <div class="route-projection-steps">${entry.route.steps.map(renderProjectionStepCard).join('')}</div>
  </div>`;
}

function blockedWindowText(window) {
  return window?.dated ? `${window.validFrom ?? '…'} → ${window.validUntil ?? 'ongoing'}` : 'undated';
}

function renderBlockedSegmentRow(segment) {
  return `<div class="blocked-segment">
    <div class="blocked-segment-track">
      <div class="blocked-segment-window blocked-segment-window--a"><strong>${esc(labelActor(segment.actorA.id))}</strong><span>${esc(blockedWindowText(segment.actorA.window))}</span></div>
      <div class="blocked-segment-gap" aria-hidden="true"><span class="blocked-segment-surface">${esc(segment.surfaceLabel || segment.surfaceId)}</span></div>
      <div class="blocked-segment-window blocked-segment-window--b"><strong>${esc(labelActor(segment.actorB.id))}</strong><span>${esc(blockedWindowText(segment.actorB.window))}</span></div>
    </div>
    <p class="meta">Blocked: ${esc(humanLabel(segment.reason))} — both documented participation windows approach ${esc(segment.surfaceLabel || segment.surfaceId)} and stop without overlapping.</p>
  </div>`;
}

function renderRouteProjectionsPanel(model) {
  if (!model?.canonical) return '';
  const sections = [renderRouteProjectionEntry(model.canonical)];
  if (model.secondary) sections.push(renderRouteProjectionEntry(model.secondary));
  if (model.asOfEntry) sections.push(renderRouteProjectionEntry(model.asOfEntry));
  const blocked = model.blocked ?? [];
  const blockedMarkup = blocked.length
    ? `<div class="panel blocked-segments"><span class="panel-label">Blocked route segments</span><h3>What the compiler declined to connect here</h3>${blocked.map(renderBlockedSegmentRow).join('')}</div>`
    : '';
  return `<section id="desk-projections" class="route-projections">${sections.join('')}${blockedMarkup}</section>`;
}

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
  for (const input of document.querySelectorAll('input[name="desk-projection"]')) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      state.deskProjection = ROUTE_PROJECTION_KEYS.has(input.value) ? input.value : 'clifford';
      if ($('#desk-from').value.trim()) runDeskCheck({ updateHash: false });
    });
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
  state.activeRoute = null;

  if (fromId === toId) {
    parts.push(deskVerdict('warn', 'Same person', '<p>Both names resolve to the same entry.</p>'));
  } else if (path) {
    setDocumentTitle(`${labelActor(fromId)} → ${labelActor(toId)}`);
    const pathReceiptIds = [...new Set(path.hops.flatMap(hop => hop.bases.flatMap(basis => basis.receipt_ids ?? [])))];
    state.citation = citationContext(`${labelActor(fromId)} → ${labelActor(toId)}${asOf ? `, as of ${asOf}` : ''}`, pathReceiptIds);
    const floor = chainWeakest(path.hops);
    const officialClass = (EVIDENCE_RANK[floor] ?? 9) === 0;
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

  // Route projections (ladder step 5): the canonical Clifford route is
  // always shown first; the selected secondary projection (if any) and the
  // as-of view (if given) render alongside it, each explicitly labelled and
  // never silently substituting for an absent projection.
  if (fromId !== toId) {
    const projectionsModel = routeModesModel(state, { fromId, toId, asOf, selectedProjection: state.deskProjection });
    parts.push(renderRouteProjectionsPanel(projectionsModel));
    const displayedRoute = (projectionsModel.secondary && !projectionsModel.secondary.isNull) ? projectionsModel.secondary.route
      : (projectionsModel.asOfEntry && !projectionsModel.asOfEntry.isNull) ? projectionsModel.asOfEntry.route
      : projectionsModel.canonical?.route ?? null;
    state.activeRoute = displayedRoute;
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
  renderEvidenceOverview();
  announce(`Connection check updated for ${labelActor(fromId)} and ${labelActor(toId)}${asOf ? ` as of ${asOf}` : ''}.`);
}

init().catch(err => {
  console.error(err);
  const status = $('#app-status');
  if (status) status.innerHTML = `<span>Could not load the compiled release: ${esc(err.message)}</span>`;
  $('#detail').innerHTML = `<div class="panel why-no-hop"><h2>Load error</h2><p>${esc(err.message)}</p><p>Run <code>npm run compile</code>, then reload this page.</p></div>`;
});
