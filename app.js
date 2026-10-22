import { decodeHashPart, formatCitation, safeExternalUrl, safeLocalReceiptPath, validAsOf, partitionParticipantRows } from './src/ui-utils.js';
import { applyTranslations, normalizeLocale, translate } from './src/i18n.js';
import { shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections } from './src/route-projections.js';
import { releaseDelta, summarizeDelta } from './src/release-delta.js';
import { EVIDENCE_RANK } from './src/evidence-rank.js';
// One-line import on purpose: tools/build-standalone.mjs strips import lines with a single-line regex, and the flattened aperture bundle then supplies these names on globalThis.
import { buildTimelineModel, entityTimelineSummary, entityLaneLayout, layoutTimeline, filterTimelineRows, timelineDay, TIMELINE_DESKTOP_METRICS, TIMELINE_PHONE_METRICS } from './src/visual-aperture-timeline.mjs';

const PREFERENCES_KEY = 'clifford-preferences';
const state = {
  searchResults: [], searchActiveIndex: -1, locale: 'en', preferences: {}, citation: null,
  tracks: new Map(), trackHarnesses: new Map(), cases: new Map(), caseIndex: new Map(),
  claims: new Map(), caseReceipts: new Map(), claimCatalog: new Map(), receiptCatalog: new Map(), claimKeyById: new Map(), catalogCounts: {},
  deskProjection: 'clifford',
  releaseDeltaModel: null, dataBoundary: null,
  // The ledger timeline model (src/visual-aperture-timeline.mjs) built once at
  // init from the loaded surface and hop graphs; every record page reads it.
  timeline: null, receiptGraph: null, record: null, recordFloor: 'open', recordText: ''
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
  return `<div class="entity-heading"><h1>${esc(label)}</h1><div class="entity-actions">${citationActions()}</div></div>`;
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

/* ---------------- Record inspector provenance ----------------
   inspectorBreadcrumbModel is the pure crumb-list builder (vm-testable):
   mode -> object -> claim, each optional, in that fixed order, so a partial
   origin (e.g. no claim yet) still produces an honest partial breadcrumb.
   atlasInspectorOrigin/renderInspectorBreadcrumb/openEvidenceDialog/
   closeEvidenceDialog are the impure wiring around it -- only they touch
   state/DOM. The dialog is shared across the whole site (claim/receipt
   buttons exist in the aperture deck, on case pages, in search results and on
   the desk), so `origin` is optional everywhere: without it the toolbar keeps
   its plain label and no origin-anchored animation runs. */

function inspectorBreadcrumbModel({ mode, objectLabel, objectId, claimLabel } = {}) {
  const crumbs = [];
  if (mode) crumbs.push({ kind: 'mode', label: mode });
  if (objectLabel) crumbs.push({ kind: 'object', label: objectLabel, objectId: objectId ?? null });
  if (claimLabel) crumbs.push({ kind: 'claim', label: claimLabel });
  return crumbs;
}

// Origin context for a claim/receipt opened from inside the aperture deck
// (#network-atlas): { mode, objectId, objectLabel, rect, selectObject? } --
// which mode was mounted, which object was selected, the clicked element's
// screen rect (for the open animation's transform-origin) and an optional
// selectObject(objectId) callback for the object crumb. The legacy SVG atlas
// that used to supply this from its own selection state is retired, and the
// Visual Aperture does not yet hand its mode/object over, so there is no live
// origin provider: this returns null and the dialog opens with its plain
// toolbar label instead of a breadcrumb naming a provenance the click did not
// produce. inspectorBreadcrumbModel stays exported for the aperture to feed.
function atlasInspectorOrigin(el) {
  void el;
  return null;
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
      if (crumb.kind === 'object' && crumb.objectId) origin?.selectObject?.(crumb.objectId);
    });
  }
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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

// On close, the originating object is untouched: nothing here touches the
// aperture's selection or camera -- the origin object simply stays selected,
// exactly per the acceptance check.
function closeEvidenceDialog() {
  $('#evidence-dialog')?.close();
}

function initEvidenceDialog() {
  const dialog = $('#evidence-dialog');
  $('#evidence-dialog-close')?.addEventListener('click', closeEvidenceDialog);
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeEvidenceDialog();
  });
  // The dialog's origin is honest about where the click came from: the
  // aperture deck supplies its own mode and object; a record page supplies
  // the record; anywhere else opens with the plain toolbar label.
  const originFor = button => (button.closest('#network-atlas') ? atlasInspectorOrigin(button) : button.closest('#detail .record') ? recordInspectorOrigin(button) : null);
  document.addEventListener('click', event => {
    const claimButton = event.target.closest?.('[data-open-claim]');
    if (claimButton) {
      event.preventDefault();
      openClaimDialog(claimButton.dataset.openClaim, originFor(claimButton));
      return;
    }
    const receiptButton = event.target.closest?.('[data-open-receipt]');
    if (receiptButton) {
      event.preventDefault();
      openReceiptDialog(receiptButton.dataset.openReceipt, originFor(receiptButton));
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
  openEvidenceDialog(origin);
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

// Participant counts for the hero/case "focus" buttons come from the canonical
// bounded-surface ledger (build/surface-graph.json), never from a literal: the
// largest surface whose id or label carries the focus token, counted by its
// actor participants (the same vocabulary the aperture's hotspots use). Returns
// null when no surface documents the focus -- e.g. an organization with no
// surface rows -- so callers omit the count rather than invent one.
function focusSurfaceSummary(focusId) {
  const token = norm(focusId);
  if (!token) return null;
  const ranked = [...(state.surfaces?.values() ?? [])]
    .filter(item => norm(`${item.surface_id} ${item.surface_label}`).includes(token))
    .map(item => ({ surface: item, actorCount: (item.participants ?? []).filter(p => p.participant_type === 'actor').length }))
    .sort((a, b) => b.actorCount - a.actorCount);
  return ranked[0] ?? null;
}

function focusButtonLabel(prefix, focusId) {
  const summary = focusSurfaceSummary(focusId);
  if (!summary) return prefix;
  return `${prefix} · ${summary.actorCount} documented actor${summary.actorCount === 1 ? '' : 's'}`;
}

function labelActor(id) { return state.actors.get(id)?.label || id; }
function labelOrg(id) { return state.orgs.get(id)?.label || id; }
function surface(id) { return state.surfaces.get(id); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function shortLabel(s, max = 26) { const value = String(s ?? ''); return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'Topology explorer — The Clifford Number'; }
function announce(message) { const status = $('#view-status'); if (status) status.textContent = message; }

async function init() {
  initPreferences();
  const [surfaceGraph, hopGraph, scores, legacyGraph, receiptGraph, publicCatalog, dataBoundary] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] })),
    loadJson('build/public-data-boundary.json').catch(() => null)
  ]);
  state.surfaceGraph = surfaceGraph;
  // No release-baseline artifact ships with the public app, and the legacy
  // atlas that consumed build/atlas-projection.json is retired, so the strip
  // reports the absent baseline honestly instead of fetching a projection
  // nothing on this page reads.
  state.releaseDeltaModel = releaseStripModel(null, null);
  state.dataBoundary = dataBoundary;
  state.hopGraph = hopGraph;
  state.scores = scores;
  state.legacyGraph = legacyGraph;
  // Hand the loaded public artifacts to the Visual Aperture before
  // #app-status gets is-ready: src/visual-aperture-part-1.js readData reads
  // these before it would fetch, so the aperture no longer re-requests the
  // surface, hop and receipt graphs and graph.json the page already holds.
  globalThis.__cliffordPublicData = { surfaceGraph, hopGraph, receiptGraph, legacyGraph };
  state.receiptGraph = receiptGraph;
  state.timeline = buildTimelineModel(surfaceGraph, hopGraph);
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
  // Ledger-derived examples: every count is read from the timeline model, never typed.
  $('#try-examples').innerHTML = recordExampleButtons(flagshipCase).map(item => `<button data-kind="${esc(item.kind)}" data-id="${esc(item.id)}">${esc(item.label)}</button>`).join('');
  for (const btn of document.querySelectorAll('#try-examples [data-kind], .hero-records [data-kind]')) btn.addEventListener('click', () => go(btn.dataset.kind, btn.dataset.id));
  for (const node of document.querySelectorAll('[data-record-fact]')) {
    const [kind, ...rest] = String(node.dataset.recordFact).split(':');
    node.textContent = recordFactLine(kind, rest.join(':'));
  }

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

  renderPublicDataBoundary(state.dataBoundary);
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

function formatPublicProjectionBoundary(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Not declared';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function renderPublicDataBoundary(boundary) {
  const research = boundary?.views?.research_network;
  const surfaces = boundary?.views?.bounded_surfaces;
  const hops = boundary?.views?.verified_hops;
  const root = $('#public-data-boundary');
  if (!root) return;
  root.dataset.mixed = String(Boolean(boundary?.alignment?.mixed_projection_boundaries));
  const set = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
  set('#public-boundary-research', formatPublicProjectionBoundary(research?.projection_generated));
  set('#public-boundary-research-base', formatPublicProjectionBoundary(research?.context_base_as_of));
  set('#public-boundary-surfaces', formatPublicProjectionBoundary(surfaces?.projection_generated));
  set('#public-boundary-hops', formatPublicProjectionBoundary(hops?.projection_generated));
  set('#public-boundary-contract', boundary?.interpretation_contract?.statement
    ?? 'Projection timestamps identify deterministic artifacts; source dates remain in their owning receipts.');
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
  const documentedSurfaces = actorId => state.timeline?.lanes.actor.get(actorId)?.surface_count ?? 0;
  const fallback = [...state.actorScores.values()]
    .filter(score => Number.isInteger(score.clifford_number) && score.clifford_number > 0)
    .sort((a, b) => a.clifford_number - b.clifford_number || documentedSurfaces(b.actor_id) - documentedSurfaces(a.actor_id))
    .map(score => score.actor_id);
  const routeIds = [...new Set([...preferred, ...fallback])]
    .filter(id => Number.isInteger(state.actorScores.get(id)?.clifford_number) && state.actorScores.get(id).clifford_number > 0)
    .slice(0, 5);
  const routeList = routeIds.map(id => {
    const score = state.actorScores.get(id);
    return `<button class="result" data-kind="actor" data-id="${esc(id)}"><span class="kind-glyph">A</span><span class="result-label">${esc(labelActor(id))}<small>Clifford Number ${score.clifford_number} · ${documentedSurfaces(id)} documented surface${documentedSurfaces(id) === 1 ? '' : 's'} of ${state.timeline.counts.surfaces}</small></span></button>`;
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
  announce(`Public record loaded: ${state.catalogCounts.tracks ?? state.tracks.size} research tracks, ${state.catalogCounts.cases ?? state.caseIndex.size} cases, ${state.catalogCounts.claims ?? state.claimCatalog.size} public-indexed claims, and ${publicReceiptCount()} unique receipt records.`);
}

/* ---------------- Release strip ----------------
   releaseStripModel is the pure model behind #release-strip's second line
   (vm-tested in test/route-modes.test.js). No baseline artifact ships with the
   public app, so it currently always reports the honest absent-baseline line. */
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

// One fact line per searchable object, read from the timeline model: a count
// with its noun, a dated span, and for people the Clifford Number. Zero-row and
// legacy-only records say so instead of showing nothing.
function recordFactLine(kind, id, extra = null) {
  const model = state.timeline;
  if (!model) return '';
  if (kind === 'actor') {
    const summary = entityTimelineSummary(model, 'actor', id);
    const path = state.hopGraph?.shortest_paths?.[id];
    const cn = Number.isInteger(path?.number) ? `Clifford Number ${path.number}` : 'Clifford Number N/A';
    if (!summary) return state.actorScores.has(id) ? `no documented surface in this release · ${cn}` : 'legacy research node · no canonical record';
    const years = recordRowYears(summary.rows);
    const rosterOnly = summary.surface_count === 1 && summary.dense_memberships.length ? ' · listed on one contained roster only' : '';
    return `${recordPlural(summary.surface_count, 'surface')} · ${recordPlural(Object.keys(summary.type_counts).length, 'type')} · ${years[0]}${years.length > 1 ? ` → ${years.at(-1)}` : ''}${rosterOnly} · ${cn}`;
  }
  if (kind === 'organization') {
    const summary = entityTimelineSummary(model, 'organization', id);
    if (!summary) return state.orgScores.has(id) ? 'no documented surface in this release' : 'legacy research node · no canonical record';
    const years = recordRowYears(summary.rows);
    return `${recordPlural(summary.surface_count, 'surface')} · ${recordPlural(Object.keys(summary.type_counts).length, 'type')} · ${years[0]}${years.length > 1 ? ` → ${years.at(-1)}` : ''}${summary.hop_eligible_surface_count ? ` · ${summary.hop_eligible_surface_count} hop-eligible` : ' · context only'}`;
  }
  if (kind === 'surface') {
    const mark = model.surfaceMarks.find(item => item.surface_id === id);
    if (!mark) return '';
    return `${humanLabel(mark.surface_type || 'unknown')} · ${recordWindowText(mark)} · ${recordPlural(mark.actor_count, 'person', 'people')} · ${mark.surface_hop_eligible ? 'hop-eligible' : 'context only'}${mark.dense ? ' · contained roster' : ''}`;
  }
  if (kind === 'type') {
    const lane = model.lanes.type.get(id);
    if (!lane) return '';
    return `${recordPlural(lane.surface_count, 'surface')} of ${model.counts.surfaces} · ${lane.hop_eligible_surface_count} hop-eligible`;
  }
  if (kind === 'year') {
    const started = model.surfaceMarks.filter(mark => String(mark.time_start ?? '').startsWith(id)).length;
    return `${recordPlural(started, 'surface')} started · ${recordPlural(model.counts.hop_bases_by_year?.[id] ?? 0, 'hop basis', 'hop bases')} dated in the year`;
  }
  if (kind === 'receipt' && extra) {
    return `${recordEvidenceWord(extra.evidence_class || 'open')} · ${extra.publisher || 'publisher not recorded'} · ${extra.source_published_at || extra.published_at || 'published date not recorded'}`;
  }
  return '';
}

// The "Start with" buttons: labels and counts come from the ledger, never from a literal.
function recordExampleButtons(flagshipCase) {
  const model = state.timeline;
  const items = [];
  const warner = model.lanes.actor.get('ben-warner');
  if (warner) items.push({ kind: 'actor', id: 'ben-warner', label: `${labelActor('ben-warner')} · ${recordPlural(warner.surface_count, 'surface')}` });
  const twin = model.lanes.organization.get('electric-twin');
  if (twin) items.push({ kind: 'organization', id: 'electric-twin', label: `${labelOrg('electric-twin')} · ${recordPlural(twin.surface_count, 'surface')}` });
  const block = model.dense[0];
  if (block) {
    const organizationRow = (model.surfaceRows.get(block.surface_id) ?? []).find(row => row.participant_type === 'organization');
    items.push({ kind: 'surface', id: block.surface_id, label: `${organizationRow?.entity_label ?? 'Roster'} roster · ${recordPlural(block.listed_count, 'listed name')}` });
  }
  if (flagshipCase) items.push({ kind: 'case', id: flagshipCase.case_id, label: 'Clifford → Starmer · official' });
  return items;
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
    // Surface types and the years with rows are searchable records of the timeline model.
    for (const lane of state.timeline?.lanes.type.values() ?? []) {
      const match = rankMatch(q, lane.label, lane.id, [`${lane.label} surface type`]);
      if (match) results.push({ kind: 'type', id: lane.id, label: lane.label, ...match });
    }
    for (const year of state.timeline?.range.years_with_rows ?? []) {
      const match = rankMatch(q, `Year ${year}`, year);
      if (match) results.push({ kind: 'year', id: year, label: `Year ${year}`, ...match });
    }
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
      if (match) results.push({ kind: 'receipt', id: receipt.receipt_id, label: receiptTitle(receipt), fact: recordFactLine('receipt', receipt.receipt_id, receipt), ...match });
    }
  }
  for (const result of results) if (result.fact === undefined) result.fact = recordFactLine(result.kind, result.id);
  state.searchResults = results.sort(compareSearchResults).slice(0, 12);
  state.searchActiveIndex = -1;
  const box = $('#results');
  box.innerHTML = state.searchResults.length
    ? state.searchResults.map((r, i) => `<button id="search-option-${i}" class="result" role="option" tabindex="-1" aria-selected="false" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}"><span class="kind-glyph">${kindGlyph(r.kind)}</span><span class="result-label">${esc(r.label)}<small>${esc(searchKindLabel(r.kind))} · ${esc(r.context)}</small>${r.fact ? `<span class="result-fact">${esc(r.fact)}</span>` : ''}</span></button>`).join('')
    : q.length >= 2 ? `<div class="meta" role="option" aria-disabled="true">No public record in this release matches “${esc(e.target.value.trim())}”. Absence here is not evidence of absence.</div>` : '';
  $('#search').setAttribute('aria-expanded', String(q.length >= 2));
  $('#search').removeAttribute('aria-activedescendant');
  for (const btn of box.querySelectorAll('.result')) btn.addEventListener('click', () => activateResult(btn.dataset.kind, btn.dataset.id));
}

// Ranking: match quality, then kind, then records with ledger rows before
// zero-row records, then label. The kind order puts the ledger's own objects first.
const SEARCH_KIND_ORDER = { actor: 0, organization: 1, surface: 2, type: 3, year: 4, case: 5, track: 6, chain: 7, claim: 8, receipt: 9, candidate: 10 };
const SEARCH_KIND_LABEL = { actor: 'person', organization: 'organization', surface: 'surface', type: 'surface type', year: 'year', case: 'case', track: 'track', chain: 'pathway', claim: 'claim', receipt: 'receipt', candidate: 'candidate' };
function searchKindLabel(kind) { return SEARCH_KIND_LABEL[kind] ?? kind; }
function searchHasRows(result) {
  if (result.kind === 'actor' || result.kind === 'organization') return (state.timeline?.lanes[result.kind].get(result.id)?.row_count ?? 0) > 0 ? 0 : 1;
  return 0;
}
function compareSearchResults(a, b) {
  return a.score - b.score
    || (SEARCH_KIND_ORDER[a.kind] ?? 99) - (SEARCH_KIND_ORDER[b.kind] ?? 99)
    || searchHasRows(a) - searchHasRows(b)
    || a.label.localeCompare(b.label);
}

function browseAll() {
  const items = [
    ...state.surfaceGraph.actors.map(item => ({ kind: 'actor', id: item.id, label: item.label })),
    ...state.surfaceGraph.organizations.map(item => ({ kind: 'organization', id: item.id, label: item.label })),
    ...state.surfaceGraph.surfaces.map(item => ({ kind: 'surface', id: item.surface_id, label: item.surface_label })),
    ...[...(state.timeline?.lanes.type.values() ?? [])].map(lane => ({ kind: 'type', id: lane.id, label: lane.label })),
    ...(state.timeline?.range.years_with_rows ?? []).map(year => ({ kind: 'year', id: year, label: `Year ${year}` })),
    ...[...state.chains.values()].map(item => ({ kind: 'chain', id: item.chain_id, label: item.chain_label })),
    ...[...state.caseIndex.values()].map(item => ({ kind: 'case', id: item.case_id, label: item.title })),
    ...[...state.tracks.values()].map(item => ({ kind: 'track', id: item.track_id, label: item.label })),
    ...[...state.claimCatalog.values()].map(item => ({ kind: 'claim', id: item.key, label: item.plain })),
    ...[...publicReceiptRecords().values()].map(item => ({ kind: 'receipt', id: item.receipt_id, label: receiptTitle(item) }))
  ].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 80);
  for (const item of items) item.fact = recordFactLine(item.kind, item.id, item.kind === 'receipt' ? publicReceiptRecords().get(item.id) : null);
  state.searchResults = items;
  state.searchActiveIndex = -1;
  $('#search').value = '';
  $('#search').setAttribute('aria-expanded', 'true');
  $('#search').removeAttribute('aria-activedescendant');
  const box = $('#results');
  box.innerHTML = items.length
    ? items.map((item, i) => `<button id="search-option-${i}" class="result" role="option" tabindex="0" aria-selected="false" data-kind="${esc(item.kind)}" data-id="${esc(item.id)}"><span class="kind-glyph">${kindGlyph(item.kind)}</span><span class="result-label">${esc(item.label)}<small>${esc(searchKindLabel(item.kind))}</small>${item.fact ? `<span class="result-fact">${esc(item.fact)}</span>` : ''}</span></button>`).join('')
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
  return { actor: 'A', organization: 'O', surface: 'S', type: '#', year: 'Y', chain: 'C', case: 'F', track: 'T', claim: 'K', receipt: 'R', candidate: '?' }[kind] || '•';
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
    overview: `<div class="panel method-panel"><span class="panel-label">The shortest honest explanation</span><h1>Actor → named surface → actor.</h1><p>A Clifford Number is not a generic social-network edge. Two people become adjacent only when public records place both on the same named, bounded surface during compatible dates.</p><div class="method-equation"><span>Person</span><b>→</b><span>Bounded surface</span><b>→</b><span>Person</span></div><p>Examples of qualifying surfaces include a named board, authorship group, taskforce, commissioned review, or small documented cohort. “Both worked near government” is not a hop.</p><a class="primary-action" href="#desk">Run the connection checker →</a></div>`,
    definitions: `<div class="panel method-panel"><span class="panel-label">Terms used everywhere</span><h1>Do not collapse distinct predicates.</h1><dl class="definition-grid"><div><dt>Listed</dt><dd>A name appears in a directory. It does not prove membership or attendance.</dd></div><div><dt>Registered</dt><dd>A registration record exists. It does not prove attendance.</dd></div><div><dt>Attended</dt><dd>A source specifically supports presence at an event.</dd></div><div><dt>Surface</dt><dd>A named, bounded public process or cohort that can support an actor-to-actor hop.</dd></div><div><dt>Research edge</dt><dd>A sourced relationship in the wider public graph. It may be context rather than a valid hop.</dd></div><div><dt>Receipt</dt><dd>The source record, archive, locator, and qualification attached to a claim.</dd></div></dl></div>`,
    redaction: `<div class="panel method-panel"><span class="panel-label">Publication boundary</span><h1>Publish the record. Preserve the limit.</h1><p>Public pages include published claims, graph edges, bounded surfaces, and receipt metadata. Intake queues, crawler state, private or local material, and unreviewed promotion candidates stay outside the Pages artifact.</p><div class="boundary-grid"><article><strong>Shown</strong><p>Exact sourced claim, evidence class, date window, qualification, source, archive, and publication status.</p></article><article><strong>Not manufactured</strong><p>Contact, coordination, influence, intent, benefit, wrongdoing, or causation not established by the source.</p></article></div></div>`,
    rules: `<div class="panel method-panel"><span class="panel-label">Compiler contract</span><h1>No edge without a receipt. No dated hop without overlap.</h1><ol class="rule-list"><li><strong>Bound the surface.</strong> Broad institutions do not create hops.</li><li><strong>Type the predicate.</strong> Listed, registered, attended, appointed, funded, and reported remain distinct.</li><li><strong>Intersect the dates.</strong> Disjoint windows produce a compiler refusal, not a connection.</li><li><strong>Carry the evidence floor.</strong> A route cannot be stronger than its weakest admitted basis.</li><li><strong>Show the receipt.</strong> Every material claim opens inside the instrument before linking outward.</li></ol></div>`
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
  $('#detail').innerHTML = `<section class="panel receipt-archive"><span class="panel-label">Public evidence archive</span><h1>The receipts, inside the instrument.</h1><p>Open a receipt here to see what it supports, its evidence class, publisher, dates, qualification, original source, archive, and every indexed claim that uses it.</p><div class="receipt-archive-grid">${receipts.map(receipt => `<article><span class="badge">${esc(humanLabel(receipt.source_type || receipt.evidence_class || 'source'))}</span><h3>${esc(receiptTitle(receipt))}</h3><p>${esc(receipt.notes || receipt.extract || receipt.publisher || 'Source metadata is available in this release.')}</p><button type="button" data-open-receipt="${esc(receipt.receipt_id)}">Inspect receipt →</button></article>`).join('')}</div></section>`;
}

async function renderEntity(kind, id) {
  if (kind === 'actor') renderActor(id);
  else if (kind === 'organization') renderOrg(id);
  else if (kind === 'chain') renderChain(id);
  else if (kind === 'candidate') renderCandidate(id);
  else if (kind === 'surface') renderSurface(id);
  else if (kind === 'type') renderType(id);
  else if (kind === 'year') renderYear(id);
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
  $('#detail').innerHTML = `<div class="panel why-no-hop"><span class="panel-label">Stale or unknown link</span><h1>Not found in this release.</h1><p>The ${esc(kind || 'item')} “${esc(id || '')}” is not present in the current public corpus. It may have been renamed, withheld, or never promoted from intake.</p><p><button class="copy-link" type="button" onclick="location.hash=''">Return to the explorer</button></p></div>`;
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
      <div class="entity-heading"><h1>${esc(track.label)}</h1><div class="entity-actions"><button class="copy-link" type="button" onclick="copyLink(this)">Copy link</button></div></div>
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
  if (document.body.dataset.portableRelease) return null;
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
  const graphBridge = item.presentation === 'research_graph_projection' ? `<section class="panel case-network-bridge"><span class="panel-label">The graph this case was hiding</span><h3>${item.source_counts?.nodes ?? state.legacyGraph.nodes.length} nodes · ${item.source_counts?.edges ?? state.legacyGraph.edges.length} sourced edges</h3><p>The case ladder is the ledger view. The network atlas is the whole-machine view. Dialog is the largest public cluster; the Action Plan is the policy spine; each edge opens the exact claim and receipts.</p><div class="case-policy-spine" aria-label="Official policy spine"><span>Matt Clifford</span><b>commissioned to lead</b><span>AI Opportunities Action Plan</span><b>adopted by</b><span>Starmer government</span></div><div class="case-network-actions"><button type="button" data-network-focus="dialog">${esc(focusButtonLabel('Open the Dialog spine', 'dialog'))}</button><button type="button" data-network-focus="ai-opportunities-action-plan">${esc(focusButtonLabel('Open the policy spine', 'ai-opportunities-action-plan'))}</button><button type="button" data-network-focus="palantir">${esc(focusButtonLabel('Open the Palantir cluster', 'palantir'))}</button></div></section>` : '';
  $('#detail').innerHTML = `
    <div class="panel case-hero">${entityHeading(item.title, [])}<div class="case-print-row"><p class="case-subtitle">${esc(item.subtitle)} · ${esc(item.tracking_id)} · as known ${esc(item.as_of)}</p>${briefingAction}<button class="copy-link print-dossier" type="button" onclick="window.print()">Print dossier</button></div><p>${esc(item.scope)}</p><div class="evidence-note"><strong>Publication boundary.</strong> ${esc(item.boundary)}</div><p class="meta">${esc(item.disclaimer)}</p></div>
    ${graphBridge}
    ${relationFlow ? `<div class="panel relation-panel"><span class="panel-label">Decision-to-outcome map</span><h3>What is linked—and how strongly</h3><p>Each arrow is typed. It can preserve a long time gap without upgrading sequence into causation.</p><div class="relation-list">${relationFlow}</div></div>` : ''}
    ${beacon ? `<div class="panel beacon-panel"><span class="panel-label">Explainable beacon · ${esc(beacon.version || '')}</span><h3>${esc(beacon.label || 'No beacon')}</h3><div class="beacon-meter"><span style="width:${Math.round((beacon.evidence_coverage?.ratio || 0) * 100)}%"></span></div><p><strong>${beacon.evidence_coverage?.verified || 0} of ${beacon.evidence_coverage?.total || 0}</strong> beacon inputs are independently verified in this ledger.</p><ol class="beacon-dimensions">${dimensions}</ol><p class="evidence-note">${esc(beacon.prohibited_interpretation || '')}</p></div>` : ''}
    ${sections}`;
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

/* ---------------- Record pages ----------------
   Design 2's entity pages (actor, organization, surface, surface type, year),
   fed by the ledger timeline model in src/visual-aperture-timeline.mjs: the
   same derived model the aperture's Timeline mode draws. Every table row is
   one participation row of that model; every count names its denominator; a
   hop basis is listed with its surface and day and never drawn as a line
   between two people; a dense roster stays one contained object; undated rows
   are listed, never placed on an axis; no composite score is read.

   The *RecordModel functions are pure (vm-tested in test/record-pages.test.js):
   they read only the model and data handed to them. The render* functions
   below them are the DOM wiring. */

const RECORD_BOUNDARY = 'Documented participation on bounded public surfaces only. Shared context does not establish contact, influence, coordination, agreement, or wrongdoing.';
const RECORD_MACHINE_NOTE = '[machine-derived from ledger; no editorial profile yet]';
const RECORD_EVIDENCE_ORDER = ['official', 'confirmed', 'government_record', 'primary_public', 'reported', 'derived', 'judgment', 'open', 'not_recorded'];
const RECORD_FLOORS = [['open', 'All admitted evidence'], ['reported', 'Reported or stronger'], ['primary_public', 'Primary public or stronger'], ['official', 'Official only']];
const RECORD_PREVIEW_ROWS = 18;

function recordPlural(count, noun, pluralNoun = `${noun}s`) { return `${count} ${count === 1 ? noun : pluralNoun}`; }
function recordCompare(a, b) { return String(a ?? '').localeCompare(String(b ?? '')); }
function recordUnique(values) { return [...new Set((values ?? []).filter(Boolean))]; }
function recordEvidenceWord(cls) {
  const value = String(cls || 'open');
  if (value === 'primary_public') return 'primary public';
  if (value === 'government_record') return 'government record';
  if (value === 'not_recorded') return 'not recorded';
  return value.replace(/_/g, ' ');
}
function recordEvidenceOrder(cls) { const index = RECORD_EVIDENCE_ORDER.indexOf(cls); return index === -1 ? RECORD_EVIDENCE_ORDER.length : index; }
function recordEvidenceMix(counts) {
  return Object.entries(counts ?? {})
    .sort((a, b) => recordEvidenceOrder(a[0]) - recordEvidenceOrder(b[0]))
    .map(([cls, count]) => `${count} ${recordEvidenceWord(cls)}`).join(' · ');
}
function recordCountEntries(counts, labelFor) {
  return Object.entries(counts ?? {})
    .map(([id, count]) => ({ id, label: labelFor(id), count }))
    .sort((a, b) => b.count - a.count || recordCompare(a.label, b.label));
}
// The date cell: precision and open ends are spelled out, never rounded away.
function recordWindowText(row) {
  if (!row || row.precision === 'undated' || row.start_day == null) return 'not dated';
  if (row.kind === 'open') return `${row.time_start} → end not recorded`;
  if (row.precision === 'year') return `${row.time_start} · year precision`;
  if (row.precision === 'month') return `${row.time_start}${row.time_end && row.time_end !== row.time_start ? ` → ${row.time_end}` : ''} · month precision`;
  if (row.kind === 'span') return `${row.time_start} → ${row.time_end}`;
  return row.time_start;
}
function recordSpanText(summary) {
  if (!summary?.first_day) return 'no dated row';
  const last = summary.has_open_end ? 'end not recorded' : summary.last_day;
  return summary.first_day === last ? summary.first_day : `${summary.first_day} → ${last}`;
}
function recordRowYears(rows) {
  return [...new Set((rows ?? []).filter(row => row.start_day != null).map(row => String(row.time_start).slice(0, 4)))].sort();
}
function recordRowsByDate(rows) {
  return [...(rows ?? [])].sort((a, b) => (a.start_day ?? Infinity) - (b.start_day ?? Infinity) || recordCompare(a.surface_label, b.surface_label) || recordCompare(a.key, b.key));
}
function recordLabels(model, labels = {}) {
  return {
    actor: labels.actor ?? (id => model.lanes.actor.get(id)?.label ?? id),
    organization: labels.organization ?? (id => model.lanes.organization.get(id)?.label ?? id)
  };
}
function recordSurfaceRows(model, surfaceId, participantType) {
  return (model.surfaceRows.get(surfaceId) ?? []).filter(row => row.participant_type === participantType);
}
function recordDenseBlock(model, surfaceId) {
  return (model.dense ?? []).find(block => block.surface_id === surfaceId) ?? null;
}

// Admitted hop partners of one actor from hop-graph edges: every basis names
// its surface and day. temporal_envelope is never read.
function actorHopPartners(hopGraph, model, actorId, labelActorFor) {
  const partners = new Map();
  for (const edge of hopGraph?.edges ?? []) {
    if (edge.actor_a !== actorId && edge.actor_b !== actorId) continue;
    const partnerId = edge.actor_a === actorId ? edge.actor_b : edge.actor_a;
    const bases = (edge.surfaces ?? []).map(basis => ({
      surface_id: basis.surface_id,
      surface_label: basis.surface_label || model.lanes.surface.get(basis.surface_id)?.label || basis.surface_id,
      day: basis.valid_from ?? null,
      evidence_class: basis.evidence_class ?? 'open',
      role: (edge.actor_a === actorId ? basis.actor_a_role : basis.actor_b_role) ?? null,
      partner_role: (edge.actor_a === actorId ? basis.actor_b_role : basis.actor_a_role) ?? null,
      receipt_ids: recordUnique(basis.receipt_ids)
    })).sort((a, b) => recordCompare(a.day ?? '9999', b.day ?? '9999') || recordCompare(a.surface_id, b.surface_id));
    partners.set(partnerId, { actor_id: partnerId, label: labelActorFor(partnerId), bases });
  }
  return [...partners.values()].sort((a, b) => recordCompare(a.bases[0]?.day ?? '9999', b.bases[0]?.day ?? '9999') || recordCompare(a.label, b.label));
}

// Counted co-presence from the rows alone: people documented beside this
// actor on at least `minimum` non-dense surfaces. Dense rosters are excluded
// by rule and reported separately so the exclusion is visible.
function actorRecurringCoPresence(rows, labelActorFor, { minimum = 2 } = {}) {
  const shared = new Map();
  for (const row of rows ?? []) {
    if (row.dense) continue;
    for (const other of row.co_actor_ids ?? []) {
      if (!shared.has(other)) shared.set(other, { actor_id: other, label: labelActorFor(other), surface_ids: [], surface_labels: [], dates: [] });
      const entry = shared.get(other);
      entry.surface_ids.push(row.surface_id);
      entry.surface_labels.push(row.surface_label);
      entry.dates.push(recordWindowText(row));
    }
  }
  return [...shared.values()]
    .filter(entry => entry.surface_ids.length >= minimum)
    .sort((a, b) => b.surface_ids.length - a.surface_ids.length || recordCompare(a.label, b.label));
}

function actorRecordModel(model, hopGraph, score, id, labels = {}) {
  const label = recordLabels(model, labels);
  const summary = entityTimelineSummary(model, 'actor', id);
  const rows = recordRowsByDate(summary?.rows);
  const surfaceTotal = model.counts.surfaces;
  const path = hopGraph?.shortest_paths?.[id] ?? null;
  const cliffordNumber = Number.isInteger(path?.number) ? path.number : null;
  const typeCounts = recordCountEntries(summary?.type_counts, type => humanLabel(type));
  const organizationCounts = recordCountEntries(summary?.co_organization_counts, label.organization);
  const hopPartners = actorHopPartners(hopGraph, model, id, label.actor);
  const recurring = actorRecurringCoPresence(rows, label.actor);
  const denseMemberships = (summary?.dense_memberships ?? []).map(surfaceId => recordDenseBlock(model, surfaceId)).filter(Boolean)
    .map(block => ({ surface_id: block.surface_id, surface_label: block.surface_label, listed_count: block.listed_count }));
  const years = recordRowYears(rows);
  const surfaceCount = summary?.surface_count ?? 0;
  const facts = [{ key: 'surfaces', text: `${recordPlural(surfaceCount, 'documented surface')} of ${surfaceTotal}` }];
  if (rows.length) {
    facts.push({ key: 'types', text: `across ${recordPlural(typeCounts.length, 'surface type')}` });
    facts.push({ key: 'organizations', text: `with ${recordPlural(organizationCounts.length, 'organization')} on those surfaces` });
    facts.push({ key: 'span', text: `${recordSpanText(summary)} · ${recordPlural(years.length, 'active year')}` });
    facts.push({ key: 'hop', text: `${summary.hop_eligible_surface_count} hop-eligible · ${summary.context_surface_count} context-only` });
    facts.push({ key: 'receipts', text: `${recordPlural(summary.receipt_ids.length, 'receipt')} on ${recordPlural(rows.length, 'row')}: ${recordEvidenceMix(summary.evidence_counts)}` });
  }
  facts.push({ key: 'cn', text: cliffordNumber == null ? 'Clifford Number N/A' : `Clifford Number ${cliffordNumber}` });
  const machineSentence = rows.length
    ? `Documented on ${recordPlural(surfaceCount, 'surface')} of ${recordPlural(typeCounts.length, 'type')} ${summary.first_day === (summary.has_open_end ? null : summary.last_day) ? `on ${summary.first_day}` : `between ${summary.first_day} and ${summary.has_open_end ? 'an end not recorded' : summary.last_day}`}, beside ${recordPlural(organizationCounts.length, 'organization')}.`
    : 'No participation row in this release.';
  return {
    kind: 'actor', id, label: label.actor(id), summary, rows,
    row_count: rows.length, surface_count: surfaceCount, surface_total: surfaceTotal,
    type_counts: typeCounts, type_count: typeCounts.length,
    organization_counts: organizationCounts, organization_count: organizationCounts.length,
    hop_partners: hopPartners, hop_partner_count: hopPartners.length,
    recurring, dense_memberships: denseMemberships, years,
    clifford: { number: cliffordNumber, path, why_no_hop: score?.why_no_hop ?? null },
    receipt_ids: summary?.receipt_ids ?? [],
    facts, machine_sentence: machineSentence
  };
}

function organizationRecordModel(model, organization, id, labels = {}) {
  const label = recordLabels(model, labels);
  const summary = entityTimelineSummary(model, 'organization', id);
  const rows = recordRowsByDate(summary?.rows);
  const surfaceTotal = model.counts.surfaces;
  const typeCounts = recordCountEntries(summary?.type_counts, type => humanLabel(type));
  // People documented on these surfaces, from the rows: dense rosters are one
  // line each, never 112 names folded into the count.
  const actorCounts = {};
  const organizationCounts = {};
  const denseLines = [];
  for (const row of rows) {
    if (row.dense) {
      const block = recordDenseBlock(model, row.surface_id);
      if (block) denseLines.push({ surface_id: block.surface_id, surface_label: block.surface_label, listed_count: block.listed_count });
    } else {
      for (const actorId of row.co_actor_ids ?? []) actorCounts[actorId] = (actorCounts[actorId] ?? 0) + 1;
    }
    for (const orgId of row.co_organization_ids ?? []) organizationCounts[orgId] = (organizationCounts[orgId] ?? 0) + 1;
  }
  const people = recordCountEntries(actorCounts, label.actor);
  const coOrganizations = recordCountEntries(organizationCounts, label.organization);
  const years = recordRowYears(rows);
  const surfaceCount = summary?.surface_count ?? 0;
  const facts = [{ key: 'surfaces', text: `${recordPlural(surfaceCount, 'documented surface')} of ${surfaceTotal}` }];
  if (rows.length) {
    facts.push({ key: 'types', text: `across ${recordPlural(typeCounts.length, 'surface type')}` });
    facts.push({ key: 'people', text: `${recordPlural(people.length, 'person', 'people')} documented on them${denseLines.length ? ` · plus ${denseLines.map(line => `${line.listed_count} names on one contained roster`).join(', ')}` : ''}` });
    facts.push({ key: 'span', text: `${recordSpanText(summary)} · ${recordPlural(years.length, 'active year')}` });
    facts.push({ key: 'hop', text: `${summary.hop_eligible_surface_count} hop-eligible · ${summary.context_surface_count} context-only` });
    facts.push({ key: 'receipts', text: `${recordPlural(summary.receipt_ids.length, 'receipt')} on ${recordPlural(rows.length, 'row')}: ${recordEvidenceMix(summary.evidence_counts)}` });
  }
  const machineSentence = rows.length
    ? `Documented on ${recordPlural(surfaceCount, 'surface')} of ${recordPlural(typeCounts.length, 'type')} between ${summary.first_day} and ${summary.has_open_end ? 'an end not recorded' : summary.last_day}, beside ${recordPlural(people.length, 'person', 'people')}${denseLines.length ? ` and ${denseLines.map(line => `${line.listed_count} roster names`).join(', ')}` : ''}.`
    : 'No participation row in this release.';
  return {
    kind: 'organization', id, label: label.organization(id), summary, rows,
    row_count: rows.length, surface_count: surfaceCount, surface_total: surfaceTotal,
    type_counts: typeCounts, type_count: typeCounts.length,
    people, people_count: people.length, dense_lines: denseLines,
    co_organizations: coOrganizations, years,
    declared: { surface_factory: organization?.surface_factory === true, broad_institution: organization?.broad_institution === true, kind: organization?.kind ?? null },
    receipt_ids: summary?.receipt_ids ?? [],
    facts, machine_sentence: machineSentence
  };
}

function surfaceRecordModel(model, hopGraph, receiptGraph, surface, labels = {}) {
  const label = recordLabels(model, labels);
  const id = surface.surface_id;
  const rows = model.surfaceRows.get(id) ?? [];
  const mark = model.surfaceMarks.find(item => item.surface_id === id) ?? null;
  const dense = model.denseSurfaceIds.has(id);
  const actorRows = rows.filter(row => row.participant_type === 'actor');
  const organizationRows = rows.filter(row => row.participant_type === 'organization');
  const participants = actorRows.map(row => ({ row, elsewhere: Math.max(0, (model.lanes.actor.get(row.entity_id)?.surface_count ?? 1) - 1) }));
  // Ledger order for ordinary surfaces; a dense roster is sorted by the only
  // cross-reference the ledger supports: how many other surfaces name the person.
  if (dense) participants.sort((a, b) => b.elsewhere - a.elsewhere || recordCompare(a.row.entity_label, b.row.entity_label));
  const elsewhereCount = participants.filter(entry => entry.elsewhere > 0).length;
  const bases = (model.hopBases ?? []).filter(basis => basis.surface_id === id)
    .sort((a, b) => recordCompare(a.iso_day ?? '9999', b.iso_day ?? '9999') || recordCompare(label.actor(a.actor_a), label.actor(b.actor_a)) || recordCompare(label.actor(a.actor_b), label.actor(b.actor_b)));
  const basisDays = recordUnique(bases.map(basis => basis.iso_day));
  const refusal = surface.hop_eligible ? null : (model.refusalReasons.get(id) ?? { reason: surface.hop_refusal_reason ?? null, reason_recorded: Boolean(surface.hop_refusal_reason) });
  const claims = (receiptGraph?.claims ?? []).filter(claim => (claim.surface_ids ?? []).includes(id))
    .sort((a, b) => recordCompare(a.date ?? '9999', b.date ?? '9999') || recordCompare(a.claim_id, b.claim_id));
  const evidenceCounts = {};
  for (const row of rows) evidenceCounts[row.evidence_class] = (evidenceCounts[row.evidence_class] ?? 0) + 1;
  const receiptIds = recordUnique([...(surface.receipt_ids ?? []), ...rows.flatMap(row => row.participant_receipt_ids ?? [])]);
  const windowText = mark ? recordWindowText(mark) : 'not dated';
  const hopStatus = surface.hop_eligible
    ? `Hop-eligible · ${recordPlural(bases.length, 'admitted actor-pair basis', 'admitted actor-pair bases')}${basisDays.length ? ` dated ${basisDays.join(', ')}` : ''}`
    : `Context only · ${refusal?.reason_recorded ? `reason: ${refusal.reason}` : 'no reason recorded in the ledger'}`;
  const facts = [
    { key: 'people', text: `${recordPlural(participants.length, 'person', 'people')} documented${dense ? ' on one contained roster' : ''}` },
    { key: 'organizations', text: recordPlural(organizationRows.length, 'organization') },
    { key: 'evidence', text: rows.length ? `rows: ${recordEvidenceMix(evidenceCounts)}` : 'no participation row' },
    { key: 'receipts', text: `${recordPlural(receiptIds.length, 'receipt')} (${recordPlural(recordUnique(surface.receipt_ids).length, 'surface receipt')})` },
    { key: 'hop', text: surface.hop_eligible ? recordPlural(bases.length, 'admitted hop basis', 'admitted hop bases') : 'no hop basis · context only' },
    { key: 'claims', text: `${recordPlural(claims.length, 'claim')} referencing this surface` }
  ];
  if (dense) facts.splice(1, 0, { key: 'elsewhere', text: `${elsewhereCount} of ${participants.length} listed people appear on any other documented surface` });
  return {
    kind: 'surface', id, label: surface.surface_label || id, surface, mark, dense, rows,
    actor_rows: actorRows, organization_rows: organizationRows, participants,
    participant_count: participants.length, elsewhere_count: elsewhereCount, nowhere_else_count: participants.length - elsewhereCount,
    bases, basis_count: bases.length, basis_days: basisDays, refusal, claims, evidence_counts: evidenceCounts,
    receipt_ids: receiptIds, window_text: windowText, hop_status: hopStatus, facts
  };
}

function typeRecordModel(model, type) {
  const lane = model.lanes.type.get(type) ?? null;
  if (!lane) return null;
  const surfaces = recordRowsByDate(lane.rows);
  const rows = recordRowsByDate(model.rows.filter(row => row.surface_type === type));
  const actorRows = rows.filter(row => row.participant_type === 'actor');
  const organizationRows = rows.filter(row => row.participant_type === 'organization');
  const peopleCounts = {};
  for (const row of actorRows) if (!row.dense) peopleCounts[row.entity_id] = (peopleCounts[row.entity_id] ?? 0) + 1;
  const organizationCounts = {};
  for (const row of organizationRows) organizationCounts[row.entity_id] = (organizationCounts[row.entity_id] ?? 0) + 1;
  const people = recordCountEntries(peopleCounts, id => model.lanes.actor.get(id)?.label ?? id).filter(entry => entry.count >= 2);
  const organizations = recordCountEntries(organizationCounts, id => model.lanes.organization.get(id)?.label ?? id);
  const denseLines = surfaces.filter(mark => mark.dense).map(mark => recordDenseBlock(model, mark.surface_id)).filter(Boolean)
    .map(block => ({ surface_id: block.surface_id, surface_label: block.surface_label, listed_count: block.listed_count }));
  const years = recordRowYears(surfaces);
  const hopCount = surfaces.filter(mark => mark.surface_hop_eligible).length;
  const facts = [
    { key: 'surfaces', text: `${recordPlural(surfaces.length, 'surface')} of ${model.counts.surfaces}` },
    { key: 'hop', text: `${hopCount} hop-eligible · ${surfaces.length - hopCount} context-only` },
    { key: 'rows', text: `${recordPlural(actorRows.length, 'person row', 'people rows')} · ${recordPlural(organizationRows.length, 'organization row')}` },
    { key: 'span', text: years.length ? `${years[0]}${years.length > 1 ? ` → ${years.at(-1)}` : ''} · ${recordPlural(years.length, 'active year')}` : 'no dated surface' }
  ];
  return { kind: 'type', id: type, label: humanLabel(type), lane, surfaces, rows, actor_rows: actorRows, organization_rows: organizationRows, people, organizations, dense_lines: denseLines, years, hop_count: hopCount, facts, receipt_ids: recordUnique(rows.flatMap(row => row.receipt_ids)) };
}

// A year page lists the rows active in that calendar year. A row that began
// earlier is flagged, not re-dated; hop bases are counted by basis day (never
// by an edge envelope); receipts without a published date are counted as such.
function yearRecordModel(model, year, receipts = []) {
  const text = String(year ?? '').trim();
  if (!/^\d{4}$/.test(text)) return null;
  const fromDay = timelineDay(text);
  const toDay = timelineDay(text, true);
  const active = row => row.start_day != null && row.start_day <= toDay && (row.kind === 'open' ? Infinity : (row.end_day ?? row.start_day)) >= fromDay;
  const startsIn = row => row.start_day != null && String(row.time_start).slice(0, 4) === text;
  const rowsActive = recordRowsByDate(model.rows.filter(active)).map(row => ({ row, began_earlier: !startsIn(row) }));
  const rowsStarted = rowsActive.filter(entry => !entry.began_earlier).length;
  const surfacesActive = model.surfaceMarks.filter(active);
  const surfacesStarted = surfacesActive.filter(startsIn).length;
  if (!rowsActive.length && !surfacesActive.length) return null;
  const published = receipts.filter(receipt => String(receipt?.source_published_at ?? '').startsWith(text)).length;
  const undatedReceipts = receipts.filter(receipt => !receipt?.source_published_at).length;
  const hopBases = model.counts.hop_bases_by_year?.[text] ?? 0;
  const peopleCounts = {};
  const organizationCounts = {};
  for (const { row } of rowsActive) {
    if (row.participant_type === 'actor' && !row.dense) peopleCounts[row.entity_id] = (peopleCounts[row.entity_id] ?? 0) + 1;
    if (row.participant_type === 'organization') organizationCounts[row.entity_id] = (organizationCounts[row.entity_id] ?? 0) + 1;
  }
  const people = recordCountEntries(peopleCounts, id => model.lanes.actor.get(id)?.label ?? id).filter(entry => entry.count >= 2);
  const organizations = recordCountEntries(organizationCounts, id => model.lanes.organization.get(id)?.label ?? id).filter(entry => entry.count >= 2);
  const denseLines = surfacesActive.filter(mark => mark.dense).map(mark => recordDenseBlock(model, mark.surface_id)).filter(Boolean)
    .map(block => ({ surface_id: block.surface_id, surface_label: block.surface_label, listed_count: block.listed_count }));
  const facts = [
    { key: 'surfaces', text: `${recordPlural(surfacesStarted, 'surface')} started of ${model.counts.surfaces} · ${surfacesActive.length} active in the year` },
    { key: 'rows', text: `${recordPlural(rowsActive.length, 'row')} active of ${model.counts.rows} · ${rowsStarted} started in the year · ${rowsActive.length - rowsStarted} began earlier` },
    { key: 'hop', text: `${recordPlural(hopBases, 'admitted hop basis', 'admitted hop bases')} dated in the year, of ${model.counts.hop_bases}` },
    { key: 'receipts', text: `${recordPlural(published, 'receipt')} published in the year, of ${receipts.length} (${undatedReceipts} without a published date)` }
  ];
  return { kind: 'year', id: text, label: `Year ${text}`, from_day: fromDay, to_day: toDay, rows_active: rowsActive, rows_started: rowsStarted, surfaces_active: surfacesActive, surfaces_started: surfacesStarted, hop_bases: hopBases, receipts_published: published, people, organizations, dense_lines: denseLines, facts, receipt_ids: recordUnique(rowsActive.flatMap(entry => entry.row.receipt_ids)) };
}

// The evidence floor never hides a row silently: the status line names the
// shown count, the denominator, and what each filter removed.
function recordFloorPartition(rows, floor = 'open') {
  const kept = new Set(filterTimelineRows(rows, { evidenceFloor: floor }).map(row => row.key));
  const shown = rows.filter(row => kept.has(row.key));
  const undated = shown.filter(row => row.start_day == null).length;
  return { shown, hidden_by_floor: rows.length - shown.length, undated, floor, hidden_keys: rows.filter(row => !kept.has(row.key)).map(row => row.key) };
}
function recordStatusText(partition, total, noun = 'row') {
  const floorLabel = (RECORD_FLOORS.find(([value]) => value === partition.floor) ?? RECORD_FLOORS[0])[1];
  const parts = [`Showing ${partition.shown.length} of ${recordPlural(total, noun)}`];
  parts.push(partition.hidden_by_floor ? `${partition.hidden_by_floor} hidden by the evidence floor (${floorLabel})` : 'nothing hidden by a filter');
  if (partition.undated) parts.push(`${partition.undated} not dated (listed, never placed on the axis)`);
  return parts.join(' · ');
}

// Plain-text ledger: the facts, one line per visible row, then the boundary.
function ledgerText(record, rows, { organizationsFor = () => [] } = {}) {
  const lines = [`${record.label} — ${record.facts.map(fact => fact.text).join(' · ')}`, ''];
  rows.forEach((row, index) => {
    const organizations = organizationsFor(row).map(entry => entry.label).join(', ');
    const who = record.kind === 'actor' ? '' : ` · ${row.entity_label}`;
    lines.push(`${String(index + 1).padStart(2, '0')}. ${recordWindowText(row)} · ${row.surface_label}${who} · ${row.role || humanLabel(row.participation_type || 'participant')}${organizations ? ` · ${organizations}` : ''} · ${recordEvidenceWord(row.evidence_class)} · ${row.surface_hop_eligible ? 'hop-eligible' : 'context only'} · receipts: ${row.receipt_ids.join(', ')}`);
  });
  lines.push('', RECORD_BOUNDARY);
  return lines.join('\n');
}

// ---- Render (impure: everything below touches the DOM or module state) ----

function recordFloorControl(floor) {
  return `<label class="ledger-control">Evidence floor <select id="record-floor">${RECORD_FLOORS.map(([value, text]) => `<option value="${value}"${value === floor ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}
function recordFacts(facts) {
  return `<ul class="record-facts" aria-label="Ledger facts">${facts.map(fact => `<li class="record-fact record-fact--${esc(fact.key)}">${fact.href ? `<a href="${esc(fact.href)}">${esc(fact.text)}</a>` : esc(fact.text)}</li>`).join('')}</ul>`;
}
function recordTypeLink(type) {
  return `<a class="badge badge--link" href="#type/${encodeURIComponent(type)}">${esc(humanLabel(type))}</a>`;
}
function recordSurfaceCell(row) {
  return `<a href="#surface/${encodeURIComponent(row.surface_id)}">${esc(row.surface_label)}</a><small>${esc(humanLabel(row.surface_type || 'unknown'))} · ${row.surface_hop_eligible ? 'hop-eligible' : 'context only'}${row.dense ? ' · contained roster' : ''}</small>`;
}
function recordRoleCell(row) {
  return `${esc(row.role || humanLabel(row.participation_type || 'participant'))}${row.participation_type ? `<small>${esc(humanLabel(row.participation_type))}</small>` : ''}`;
}
function recordOrganizationEntries(row) {
  return recordSurfaceRows(state.timeline, row.surface_id, 'organization')
    .filter(item => !(row.participant_type === 'organization' && item.entity_id === row.entity_id))
    .map(item => ({ id: item.entity_id, label: labelOrg(item.entity_id), role: item.role || humanLabel(item.participation_type || 'organization') }));
}
function recordOrganizationsCell(row) {
  const entries = recordOrganizationEntries(row);
  if (!entries.length) return '<span class="meta">none on this surface</span>';
  return `<ul class="ledger-list">${entries.map(entry => `<li><a href="#organization/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a><small>${esc(entry.role)}</small></li>`).join('')}</ul>`;
}
function recordPeopleCell(row) {
  if (row.dense) {
    const block = recordDenseBlock(state.timeline, row.surface_id);
    return `<span>${recordPlural(block?.listed_count ?? 0, 'person', 'people')} (contained roster)</span><small><a href="#surface/${encodeURIComponent(row.surface_id)}">open the roster</a></small>`;
  }
  const people = recordSurfaceRows(state.timeline, row.surface_id, 'actor');
  if (!people.length) return '<span class="meta">no person documented on this surface</span>';
  const shown = people.slice(0, 3);
  return `<span>${recordPlural(people.length, 'person', 'people')}</span><ul class="ledger-list">${shown.map(item => `<li><a href="#actor/${encodeURIComponent(item.entity_id)}">${esc(item.entity_label)}</a><small>${esc(item.role || humanLabel(item.participation_type || 'participant'))}</small></li>`).join('')}${people.length > shown.length ? `<li><a href="#surface/${encodeURIComponent(row.surface_id)}">+${people.length - shown.length} more on the surface page</a></li>` : ''}</ul>`;
}
function recordReceiptsCell(ids, label = 'Row receipts') {
  const unique = recordUnique(ids);
  if (!unique.length) return '<span class="meta">no receipt id on this row</span>';
  return `<details class="ledger-receipts"><summary>${recordPlural(unique.length, 'receipt')}</summary>${renderReceiptGrid(unique, label)}</details>`;
}
function recordTable(columns, rows, cellsFor, { rowAttributes = () => '' } = {}) {
  if (!rows.length) return '<p class="meta ledger-empty">No row passes the current filters. The status line above names what hid them.</p>';
  const head = `<thead><tr>${columns.map(column => `<th scope="col">${esc(column)}</th>`).join('')}</tr></thead>`;
  const body = rows.map((row, index) => `<tr${rowAttributes(row, index)}>${cellsFor(row, index).map((cell, cellIndex) => `<td data-label="${esc(columns[cellIndex])}">${cell}</td>`).join('')}</tr>`).join('');
  return `<div class="ledger-scroll"><table class="ledger">${head}<tbody>${body}</tbody></table></div>`;
}
function recordRowAttributes(row, index) {
  return ` class="ledger-row ${row.surface_hop_eligible ? 'is-hop' : 'is-context'}${row.dense ? ' is-dense' : ''}" data-row-key="${esc(row.key)}" data-row-index="${index + 1}"`;
}
function recordLegend() {
  return `<ul class="record-legend" aria-label="How to read the strip">
    <li><i class="record-key ev-official"></i>official / confirmed</li><li><i class="record-key ev-primary_public"></i>primary public</li><li><i class="record-key ev-reported"></i>reported</li><li><i class="record-key ev-open"></i>derived / judgment / open</li><li><i class="record-key ev-not_recorded"></i>class not recorded</li>
    <li><i class="record-key is-hop"></i>hop-eligible surface</li><li><i class="record-key is-context"></i>context only</li><li><i class="record-key record-key--span"></i>documented span</li><li><i class="record-key has-basis"></i>row is an admitted hop basis</li><li><span class="record-key-text">+N</span>rows stacked on one day</li>
  </ul>`;
}
// The single-lane mini timeline (Design 1's layoutTimeline, one lane, no
// strip, blocks or columns) above each ledger table. Marks are buttons that
// focus their ledger row; filtered rows stay drawn at low opacity.
function recordTimelineLayout(kind, id, { dense = false } = {}) {
  const width = Math.max(280, $('#detail')?.clientWidth || 1000);
  const metrics = width < 600 ? TIMELINE_PHONE_METRICS : TIMELINE_DESKTOP_METRICS;
  const options = { plotWidth: Math.max(140, width - metrics.labelWidth - metrics.padding * 2 - 4), ...metrics };
  if (dense) options.maxSlots = 1;
  return entityLaneLayout(state.timeline, kind, id, options);
}
function recordTimelineMarkup(layout, { filteredKeys = new Set(), title = 'Documented rows on the corpus axis' } = {}) {
  if (!layout?.lanes?.length) return '';
  const axisHeight = 22;
  const height = layout.height + axisHeight;
  const labelChars = Math.max(6, Math.floor(layout.metrics.labelWidth / 6.8));
  const lanes = layout.lanes.map((lane, index) => `<g class="record-lane"><rect class="record-lane-bg${index % 2 ? ' is-alt' : ''}" x="0" y="${lane.y}" width="${layout.width}" height="${lane.height}"/><text class="record-lane-label" x="6" y="${lane.y + lane.height / 2 + 4}"><title>${esc(lane.label)}</title>${esc(shortLabel(lane.label, labelChars))}</text></g>`).join('');
  const ticks = layout.axisTicks.map(tick => tick.kind === 'year'
    ? `<line class="record-axis-year" x1="${tick.x}" x2="${tick.x}" y1="0" y2="${layout.height}"/><text class="record-axis-label" x="${tick.x + 3}" y="${layout.height + 15}">${esc(tick.label)}</text>`
    : `<line class="record-axis-month" x1="${tick.x}" x2="${tick.x}" y1="${layout.height - 4}" y2="${layout.height}"/>`).join('');
  const marks = layout.marks.map(mark => {
    const evidence = mark.evidence_class ?? 'not_recorded';
    const classes = ['record-mark', `record-mark--${mark.kind}`, `ev-${evidence}`, mark.hop_eligible ? 'is-hop' : 'is-context', filteredKeys.has(mark.key) ? 'is-filtered' : '', mark.hop_basis_count ? 'has-basis' : '', mark.clipped_end ? 'is-clipped' : ''].filter(Boolean).join(' ');
    const who = mark.participant_type === 'surface' ? '' : ` · ${mark.entity_label}`;
    const title = `${recordWindowText(mark)} · ${mark.surface_label}${who}${mark.role ? ` · ${mark.role}` : ''} · ${recordEvidenceWord(evidence)} · ${recordPlural(mark.receipt_ids.length, 'receipt')} · ${mark.hop_eligible ? 'hop-eligible' : 'context only'}${mark.hop_basis_count ? ` · ${recordPlural(mark.hop_basis_count, 'admitted hop basis', 'admitted hop bases')}` : ''}${filteredKeys.has(mark.key) ? ' · hidden from the table by the evidence floor' : ''}`;
    return `<g role="listitem"><rect class="${classes}" x="${mark.x.toFixed(2)}" y="${mark.y.toFixed(2)}" width="${mark.w.toFixed(2)}" height="${mark.h}" rx="1.5" tabindex="0" role="button" data-record-mark="${esc(mark.key)}" aria-label="${esc(title)}"><title>${esc(title)}</title></rect>${mark.hop_basis_count ? `<circle class="record-mark-basis" cx="${(mark.x + Math.min(mark.w, layout.metrics.markWidth) / 2).toFixed(2)}" cy="${(mark.y + mark.h / 2).toFixed(2)}" r="1.6"/>` : ''}</g>`;
  }).join('');
  const aggregates = layout.aggregates.map(aggregate => {
    const title = `${recordPlural(aggregate.count, 'more row')} on this day: ${recordEvidenceMix(aggregate.evidence_counts)} · ${recordPlural(aggregate.hop_eligible_count, 'hop-eligible row')}`;
    const wide = aggregate.count > 9;
    return `<g role="listitem"><rect class="record-aggregate" x="${aggregate.x.toFixed(2)}" y="${aggregate.y.toFixed(2)}" width="${wide ? 34 : 22}" height="${aggregate.h}" rx="2" tabindex="0" role="button" data-record-rows="${esc(aggregate.hidden_keys.join(' '))}" aria-label="${esc(title)}"><title>${esc(title)}</title></rect><text class="record-aggregate-label" x="${(aggregate.x + 3).toFixed(2)}" y="${(aggregate.y + aggregate.h - 2).toFixed(2)}">+${aggregate.count}</text></g>`;
  }).join('');
  const placed = layout.counts.rows_in_view;
  const caption = `${title} · axis ${layout.domain.from} → ${layout.domain.to} · ${placed} of ${recordPlural(layout.counts.candidate_rows, 'row')} placed${layout.counts.undated ? ` · ${layout.counts.undated} not dated (listed in the table, never placed)` : ''}${filteredKeys.size ? ` · ${filteredKeys.size} dimmed by the evidence floor, never removed` : ''}`;
  return `<figure class="record-strip"><figcaption class="meta">${esc(caption)}</figcaption><svg class="record-strip-svg" viewBox="0 0 ${layout.width} ${height}" width="${layout.width}" height="${height}" role="list" aria-label="${esc(title)}">${lanes}${ticks}<line class="record-axis-base" x1="${layout.plotLeft}" x2="${layout.plotLeft + layout.plotWidth}" y1="${layout.height}" y2="${layout.height}"/>${marks}${aggregates}</svg>${recordLegend()}</figure>`;
}
function recordPatternList(items, { empty = 'None in these rows.' } = {}) {
  return items.length ? `<ul class="record-pattern-list">${items.join('')}</ul>` : `<p class="meta">${esc(empty)}</p>`;
}
function recordHopPartnerItems(partners) {
  return partners.map(partner => `<li><a href="#desk/${encodeURIComponent(partner.actor_id)}">${esc(partner.label)}</a> · ${recordPlural(partner.bases.length, 'admitted hop basis', 'admitted hop bases')}<ul>${partner.bases.map(basis => `<li><a href="#surface/${encodeURIComponent(basis.surface_id)}">${esc(basis.surface_label)}</a> · ${esc(basis.day ?? 'not dated')} · ${evidenceBadge(basis.evidence_class)}</li>`).join('')}</ul></li>`);
}
function recordRecurringItems(entries) {
  return entries.map(entry => `<li><a href="#actor/${encodeURIComponent(entry.actor_id)}">${esc(entry.label)}</a> · also on the same surface ${recordPlural(entry.surface_ids.length, 'time')}: ${esc(entry.dates.join(', '))}<small>shared context only; listed above only where the compiler admitted a hop</small></li>`);
}
function recordDenseNote(denseLines, verb = 'excluded from the counted co-presence by rule') {
  return denseLines.length ? `<p class="meta">Dense rosters ${verb}: ${denseLines.map(line => `<a href="#surface/${encodeURIComponent(line.surface_id)}">${esc(line.surface_label)}</a> (${line.listed_count} listed names, one contained object)`).join('; ')}.</p>` : '';
}
function recordActions(record, { timelineToken, desk = false, copyLedger = true, extra = '' } = {}) {
  return [
    copyLedger ? '<button class="copy-link" type="button" onclick="copyLedgerText(this)">Copy ledger as text</button>' : '',
    timelineToken ? `<button class="copy-link" type="button" data-ap-open-timeline="${esc(timelineToken)}">Open in the timeline</button>` : '',
    desk ? `<a class="copy-link" href="#desk/${encodeURIComponent(record.id)}">Check a connection</a>` : '',
    extra
  ].filter(Boolean).join('');
}
function recordHeading(label, receiptIds, actionsHtml) {
  state.citation = citationContext(label, receiptIds);
  return `<div class="entity-heading"><h1>${esc(label)}</h1><div class="entity-actions">${actionsHtml}${citationActions()}</div></div>`;
}
// Receipts opened from a record page carry the record as the dialog's origin
// crumb ("Record / <label> / <receipt>"); the object crumb returns to the page.
function recordInspectorOrigin(element) {
  const record = state.record;
  if (!record) return null;
  return {
    mode: 'Record',
    objectLabel: record.label,
    objectId: `${record.kind}/${record.id}`,
    rect: element?.getBoundingClientRect?.() ?? null,
    selectObject: objectId => { const target = `#${objectId}`; if (location.hash !== target) location.hash = target; }
  };
}
async function copyLedgerText(button) {
  try {
    await copyFeedback(button, state.recordText || RECORD_BOUNDARY);
  } catch (err) {
    console.warn('Could not copy the ledger text', err);
  }
}
window.copyLedgerText = copyLedgerText;

function setRecord(kind, id, label) {
  if (state.record?.kind !== kind || state.record?.id !== id) state.recordFloor = 'open';
  state.record = { kind, id, label };
}
function focusLedgerRow(key, { open = true } = {}) {
  const row = [...document.querySelectorAll('#detail [data-row-key]')].find(element => element.dataset.rowKey === key);
  if (!row) { announce('That row is hidden from the table by the evidence floor; widen the floor to list it.'); return; }
  for (const hot of document.querySelectorAll('#detail .ledger-row.is-hot')) hot.classList.remove('is-hot');
  row.classList.add('is-hot');
  row.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  if (open) { const details = row.querySelector('details'); if (details) details.open = true; }
  row.querySelector('a, button, summary')?.focus({ preventScroll: true });
}
function bindRecordPage(record) {
  const detail = $('#detail');
  const activate = (element, handler) => {
    element.addEventListener('click', handler);
    element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); } });
  };
  for (const mark of detail.querySelectorAll('[data-record-mark]')) activate(mark, () => focusLedgerRow(mark.dataset.recordMark));
  for (const aggregate of detail.querySelectorAll('[data-record-rows]')) activate(aggregate, () => focusLedgerRow(aggregate.dataset.recordRows.split(' ')[0], { open: false }));
  detail.querySelector('#record-floor')?.addEventListener('change', event => {
    state.recordFloor = RECORD_FLOORS.some(([value]) => value === event.target.value) ? event.target.value : 'open';
    renderEntity(record.kind, record.id);
  });
  bindResults();
}
function recordLedgerPanel({ title, kicker = 'Dated ledger', columns, rows, cellsFor, partition, total, noun = 'row', before = '', after = '' }) {
  return `<section class="panel record-ledger"><span class="panel-label">${esc(kicker)}</span><h3>${esc(title)}</h3>${before}<div class="ledger-controls">${recordFloorControl(partition.floor)}<p class="ledger-status" id="record-ledger-status" role="status">${esc(recordStatusText(partition, total, noun))}</p></div>${recordTable(columns, rows, cellsFor, { rowAttributes: recordRowAttributes })}${after}<p class="meta record-boundary">${esc(RECORD_BOUNDARY)}</p></section>`;
}

function renderActor(id) {
  const actor = state.actors.get(id);
  const legacyNode = state.legacyNodes.get(id);
  if (!actor && !legacyNode) return renderNotFound('actor', id);
  const label = actor?.label ?? legacyNode.label;
  setDocumentTitle(label);
  setRecord('actor', id, label);
  const canonical = state.actorScores.has(id);
  const record = actorRecordModel(state.timeline, state.hopGraph, state.actorScores.get(id) ?? null, id, { actor: labelActor, organization: labelOrg });
  record.label = label;
  const partition = recordFloorPartition(record.rows, state.recordFloor);
  state.recordText = ledgerText(record, partition.shown, { organizationsFor: recordOrganizationEntries });
  $('#summary').innerHTML = '';

  const badges = [
    `<span class="badge">${esc(actor?.kind || legacyNode?.type || 'person')}</span>`,
    canonical ? '<span class="badge">canonical record</span>' : '<span class="badge">legacy research node · no canonical record</span>',
    actor?.anchor ? '<span class="badge">anchor</span>' : ''
  ].filter(Boolean).join('');
  const profile = actor?.plain;
  const profileHtml = profile
    ? `<div class="profile-copy"><p><strong>Who this is.</strong> ${esc(profile.who)}</p><p><strong>Why they appear.</strong> ${esc(profile.why_here)}</p></div>${renderReceiptGrid(profile.receipt_ids, 'Profile receipts')}`
    : record.rows.length
      ? `<div class="profile-copy"><p>${esc(record.machine_sentence)} <span class="record-machine-note">${esc(RECORD_MACHINE_NOTE)}</span></p></div>`
      : `<div class="profile-copy"><p><strong>No participation row in this release.</strong> ${canonical ? 'This canonical record has no row in the bounded-surface ledger yet, so it has no dated record, no receipts and no Clifford Number here.' : 'This name is search-visible from the research graph only; it has no canonical record and no ledger row.'}</p>${legacyNode?.description ? `<p>${esc(legacyNode.description)} <span class="record-machine-note">[legacy research-graph description, not a ledger fact]</span></p>` : ''}</div>`;
  const isHopEndpoint = (state.hopGraph.edges ?? []).some(edge => edge.actor_a === id || edge.actor_b === id);
  const actions = recordActions(record, { timelineToken: record.rows.length ? `actor:${id}` : null, desk: isHopEndpoint, copyLedger: record.rows.length > 0 });
  const headPanel = `<header class="panel record-head">${recordHeading(label, actor ? entityReceiptIds('actor', id) : [], actions)}<div class="badge-row record-kind-line">${badges}</div>${profileHtml}${recordFacts(record.facts)}<aside class="profile-boundary"><strong>What this entry supports</strong><br>Documented participation on named public-role surfaces.<br><br><strong>What it does not support</strong><br>Claims about motive, agreement, influence, coordination, character, or wrongdoing.</aside></header>`;

  if (!record.rows.length) {
    $('#detail').innerHTML = headPanel;
    bindRecordPage(record);
    return;
  }

  const strip = recordTimelineMarkup(recordTimelineLayout('actor', id), { filteredKeys: new Set(partition.hidden_keys), title: `${label}: one mark per documented row` });
  const ledger = recordLedgerPanel({
    title: `${recordPlural(record.rows.length, 'participation row')} on ${recordPlural(record.surface_count, 'surface')}, by date`,
    columns: ['#', 'Date or window', 'Surface', 'Role', 'Organizations on the surface', 'Evidence', 'Receipts'],
    rows: partition.shown,
    cellsFor: (row, index) => [String(index + 1), esc(recordWindowText(row)), recordSurfaceCell(row), recordRoleCell(row), recordOrganizationsCell(row), evidenceBadge(row.evidence_class), recordReceiptsCell(row.receipt_ids)],
    partition, total: record.rows.length,
    before: `<section class="record-strip-wrap">${strip}</section>`
  });

  const patterns = `<section class="panel record-patterns"><span class="panel-label">Patterns in the rows</span><h3>Counted from the ${recordPlural(record.rows.length, 'row')} above. Nothing here is a line between two people.</h3>
    <div class="record-pattern-grid">
      <div><h4>Surface types</h4>${recordPatternList(record.type_counts.map(entry => `<li><a href="#type/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${entry.count} of ${recordPlural(record.rows.length, 'row')}</li>`))}</div>
      <div><h4>Organizations on these surfaces</h4>${recordPatternList(record.organization_counts.map(entry => `<li><a href="#organization/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${entry.count} of ${recordPlural(record.rows.length, 'surface row')}</li>`))}</div>
      <div><h4>Co-documented people</h4><p class="meta">Admitted hop partners first (each basis names its surface and day), then counted co-presence on non-dense surfaces.</p>${recordPatternList(recordHopPartnerItems(record.hop_partners), { empty: 'No admitted hop basis names this person.' })}${recordPatternList(recordRecurringItems(record.recurring), { empty: 'No one is documented beside this person on two or more non-dense surfaces.' })}${recordDenseNote(record.dense_memberships)}</div>
    </div></section>`;

  const path = record.clifford.path;
  const noHop = record.clifford.number == null;
  const routeHtml = noHop
    ? `<p class="why-no-hop"><strong>Clifford Number: N/A.</strong> ${esc(record.clifford.why_no_hop || 'No valid surface-hop path to Matt Clifford.')}</p>`
    : `${renderTopologyMap(path)}${renderPath(path)}`;
  const anchorLabel = labelActor(state.hopGraph.anchor_actor_id);
  const route = `<section class="panel record-route"><span class="panel-label">Shortest documented route</span><h3>${noHop ? 'Clifford Number N/A' : `Clifford Number ${record.clifford.number} · shortest documented route to ${esc(anchorLabel)}`}</h3>${routeHtml}</section>`;
  const score = state.actorScores.get(id);
  const chainsHtml = (score?.chains ?? []).length
    ? `<section class="panel"><span class="panel-label">Context only · never a hop</span><h3>Multi-stage institutional pathways</h3><div class="results">${score.chains.map(cid => { const c = state.chains.get(cid); return `<button class="result" data-kind="chain" data-id="${esc(cid)}"><span class="kind-glyph">C</span><span class="result-label">${esc(c?.chain_label || cid)}<small>${c?.chain_length ?? 0} documented stages</small></span></button>`; }).join('')}</div></section>`
    : '';

  $('#detail').innerHTML = `<article class="record record--actor" data-record-kind="actor" data-record-id="${esc(id)}">${headPanel}${ledger}${patterns}${route}${chainsHtml}</article>`;
  bindRecordPage(record);
}

function bindResults() {
  for (const btn of document.querySelectorAll('#detail .result')) btn.addEventListener('click', () => activateResult(btn.dataset.kind, btn.dataset.id));
}

function renderChain(id) {
  const c = state.chains.get(id);
  if (!c) return renderNotFound('pathway', id);
  setDocumentTitle(c.chain_label);
  setRecord('chain', id, c.chain_label);
  $('#summary').innerHTML = '';
  const model = state.timeline;
  const stageMarks = (c.stages ?? []).map(stage => model.surfaceMarks.find(mark => mark.surface_id === stage.surface_id) ?? null);
  const facts = [
    { key: 'stages', text: recordPlural(c.chain_length ?? (c.stages ?? []).length, 'documented context stage') },
    { key: 'hop', text: 'creates hops: no' },
    { key: 'cn', text: 'Clifford Number N/A' },
    { key: 'span', text: stageMarks.some(Boolean) ? `${recordSpanText({ first_day: stageMarks.filter(Boolean).map(mark => mark.time_start).sort()[0], last_day: stageMarks.filter(Boolean).map(mark => mark.kind === 'open' ? null : (mark.time_end || mark.time_start)).filter(Boolean).sort().at(-1), has_open_end: stageMarks.some(mark => mark?.kind === 'open') })}` : 'stage windows not dated' }
  ];
  // The stages drawn on the corpus axis, one lane per stage surface in date
  // order, so a stage that began earlier than stage 1 visibly precedes it.
  const laneIds = recordUnique(stageMarks.filter(Boolean).sort((a, b) => (a.start_day ?? Infinity) - (b.start_day ?? Infinity)).map(mark => mark.surface_id));
  const width = Math.max(280, $('#detail')?.clientWidth || 1000);
  const metrics = width < 600 ? TIMELINE_PHONE_METRICS : TIMELINE_DESKTOP_METRICS;
  const layout = laneIds.length ? layoutTimeline(model, { by: 'surface', laneIds, includeStrip: false, includeBlocks: false, includeColumns: false, domainFrom: model.range.first_day, domainTo: model.range.last_day, plotWidth: Math.max(140, width - metrics.labelWidth - metrics.padding * 2 - 4), ...metrics }) : null;
  const stages = (c.stages ?? []).map((s, index) => {
    const mark = stageMarks[index];
    return `
    <div class="surface-card surface-card--nonhop" data-row-key="${esc(mark?.key ?? '')}">
      <h4>${esc(s.order)}. ${esc(humanLabel(s.stage_category))}</h4>
      <div class="meta"><a href="#surface/${encodeURIComponent(s.surface_id)}">${esc(s.surface_label)}</a>${s.actor_id ? ' · ' + esc(labelActor(s.actor_id)) : ''}${s.organization_id ? ' · ' + esc(labelOrg(s.organization_id)) : ''}</div>
      <div class="badge-row"><span class="badge">${esc(mark ? recordWindowText(mark) : 'window not in the ledger')}</span>${mark ? (mark.evidence_class ? evidenceBadge(mark.evidence_class) : '<span class="badge">surface evidence class not recorded</span>') : ''}<span class="badge">${mark?.hop_eligible ? 'hop-eligible surface' : 'context only'}</span></div>
      <p>${esc(s.note)}</p>
      ${renderReceiptGrid(s.receipt_ids, 'Stage receipts')}
    </div>`;
  }).join('<div class="chain-arrow">↓</div>');
  $('#detail').innerHTML = `<article class="record record--chain" data-record-kind="chain" data-record-id="${esc(id)}">
    <header class="panel record-head">${recordHeading(c.chain_label, entityReceiptIds('chain', id), '')}<div class="badge-row record-kind-line"><span class="badge">${esc(humanLabel(c.pattern))}</span>${evidenceBadge(c.evidence_class)}</div>${recordFacts(facts)}</header>
    <div class="panel why-no-hop"><span class="panel-label">Inference boundary</span><h3>Why this is context, not a hop</h3><p>${esc(c.why_no_hop)}</p></div>
    ${layout ? `<section class="panel"><span class="panel-label">Stages on the corpus axis</span><h3>Each lane is one stage surface; the order of the ledger is the order of the dates, not of the stage numbers.</h3>${recordTimelineMarkup(layout, { title: 'Stage surfaces: one mark per documented row' })}</section>` : ''}
    <div class="panel"><span class="panel-label">Documented sequence</span><h3>Pathway stages</h3><div class="surface-list">${stages}</div></div>
  </article>`;
  bindRecordPage({ kind: 'chain', id });
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

function renderOrg(id) {
  const org = state.orgs.get(id);
  if (!org) return renderNotFound('organization', id);
  setDocumentTitle(org.label);
  setRecord('organization', id, org.label);
  const record = organizationRecordModel(state.timeline, org, id, { actor: labelActor, organization: labelOrg });
  record.label = org.label;
  const partition = recordFloorPartition(record.rows, state.recordFloor);
  state.recordText = ledgerText(record, partition.shown, { organizationsFor: recordOrganizationEntries });
  $('#summary').innerHTML = '';
  const canonical = state.orgScores.has(id);
  const badges = [
    `<span class="badge">${esc(org.kind || 'organization')}</span>`,
    canonical ? '<span class="badge">canonical record</span>' : '<span class="badge">legacy research node · no canonical record</span>',
    record.declared.surface_factory ? '<span class="badge">declared surface factory in the canonical registry</span>' : '',
    record.declared.broad_institution ? '<span class="badge">broad institution: venue context only</span>' : ''
  ].filter(Boolean).join('');
  const intro = `<div class="profile-copy"><p><strong>Organizations never create hops.</strong> Hops happen between people documented together on these surfaces.</p><p>${esc(record.machine_sentence)} <span class="record-machine-note">${esc(RECORD_MACHINE_NOTE)}</span></p>${org.notes ? `<p>${esc(org.notes)}</p>` : ''}${!canonical && org.description ? `<p>${esc(org.description)} <span class="record-machine-note">[legacy research-graph description, not a ledger fact]</span></p>` : ''}</div>`;
  const actions = recordActions(record, { timelineToken: record.rows.length ? `organization:${id}` : null, copyLedger: record.rows.length > 0 });
  const headPanel = `<header class="panel record-head">${recordHeading(org.label, entityReceiptIds('organization', id), actions)}<div class="badge-row record-kind-line">${badges}</div>${intro}${recordFacts(record.facts)}</header>`;
  if (!record.rows.length) {
    $('#detail').innerHTML = `<article class="record record--organization" data-record-kind="organization" data-record-id="${esc(id)}">${headPanel}</article>`;
    bindRecordPage(record);
    return;
  }
  const strip = recordTimelineMarkup(recordTimelineLayout('organization', id), { filteredKeys: new Set(partition.hidden_keys), title: `${org.label}: one mark per surface it bounds` });
  const ledger = recordLedgerPanel({
    title: `${recordPlural(record.surface_count, 'surface')} this organization bounds, by date`,
    columns: ['#', 'Date or window', 'Surface', "This organization's role", 'People on this surface', 'Evidence', 'Receipts'],
    rows: partition.shown,
    cellsFor: (row, index) => [String(index + 1), esc(recordWindowText(row)), recordSurfaceCell(row), recordRoleCell(row), recordPeopleCell(row), evidenceBadge(row.evidence_class), recordReceiptsCell(row.receipt_ids)],
    partition, total: record.rows.length,
    before: `<section class="record-strip-wrap">${strip}</section>`
  });
  const patterns = `<section class="panel record-patterns"><span class="panel-label">Patterns in the rows</span><h3>Counted from the ${recordPlural(record.rows.length, 'row')} above. Organizations are context; no line is drawn.</h3>
    <div class="record-pattern-grid">
      <div><h4>Surface types</h4>${recordPatternList(record.type_counts.map(entry => `<li><a href="#type/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${entry.count} of ${recordPlural(record.rows.length, 'surface')}</li>`))}</div>
      <div><h4>People documented on these surfaces</h4>${recordPatternList(record.people.map(entry => `<li><a href="#actor/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'shared surface')}</li>`), { empty: 'No person is documented on these surfaces.' })}${recordDenseNote(record.dense_lines, 'are one contained line each, never folded into the people count')}</div>
      <div><h4>Co-present organizations</h4>${recordPatternList(record.co_organizations.map(entry => `<li><a href="#organization/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'shared surface')}</li>`), { empty: 'No other organization is documented on these surfaces.' })}</div>
    </div></section>`;
  $('#detail').innerHTML = `<article class="record record--organization" data-record-kind="organization" data-record-id="${esc(id)}">${headPanel}${ledger}${patterns}</article>`;
  bindRecordPage(record);
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
  setRecord('surface', id, s.surface_label);
  const record = surfaceRecordModel(state.timeline, state.hopGraph, state.receiptGraph, s, { actor: labelActor, organization: labelOrg });
  const participantRows = record.participants.map(entry => entry.row);
  const partition = recordFloorPartition(participantRows, state.recordFloor);
  const elsewhereFor = new Map(record.participants.map(entry => [entry.row.key, entry.elsewhere]));
  state.recordText = ledgerText({ ...record, facts: [{ text: record.window_text }, { text: record.hop_status }, ...record.facts] }, partition.shown);
  $('#summary').innerHTML = '';
  const badges = [
    recordTypeLink(s.surface_type),
    ...(s.secondary_surface_types ?? []).map(type => `<span class="badge">${esc(humanLabel(type))}</span>`),
    `<span class="badge">${s.hop_eligible ? 'hop-eligible' : 'context only'}</span>`,
    record.dense ? '<span class="badge">dense roster · one contained object</span>' : ''
  ].filter(Boolean).join('');
  const actions = recordActions(record, { timelineToken: record.rows.length ? `surface:${id}` : null, copyLedger: record.rows.length > 0 });
  const status = `<dl class="record-status"><div><dt>Window</dt><dd>${esc(record.window_text)}</dd></div><div><dt>Hop status</dt><dd>${esc(record.hop_status)}</dd></div><div><dt>Surface evidence class</dt><dd>${s.evidence_class ? evidenceBadge(s.evidence_class) : 'not recorded'}</dd></div><div><dt>Status</dt><dd>${esc(humanLabel(s.status || 'not recorded'))}</dd></div><div><dt>Bounded by</dt><dd>${(s.bounded_by ?? []).length ? (s.bounded_by ?? []).map(esc).join('; ') : 'not recorded'}</dd></div></dl>${s.notes ? `<p class="record-notes">${esc(s.notes)}</p>` : ''}`;
  const headPanel = `<header class="panel record-head">${recordHeading(s.surface_label, entityReceiptIds('surface', id), actions)}<div class="badge-row record-kind-line">${badges}</div>${status}${recordFacts(record.facts)}</header>`;

  const strip = record.rows.length
    ? recordTimelineMarkup(recordTimelineLayout('surface', id, { dense: record.dense }), { filteredKeys: new Set(partition.hidden_keys), title: record.dense ? `${s.surface_label}: the roster as one contained object on its day` : `${s.surface_label}: one mark per participant row` })
    : '<p class="meta">No participation row to place on the axis; the surface window above is the only dated fact.</p>';

  const columns = ['#', 'Participant', 'Role', 'Window', 'Evidence', 'Receipts', 'Also documented on'];
  const cellsFor = (row, index) => [
    String(index + 1),
    `<a href="#actor/${encodeURIComponent(row.entity_id)}">${esc(row.entity_label)}</a>`,
    recordRoleCell(row),
    esc(recordWindowText(row)),
    evidenceBadge(row.evidence_class),
    recordReceiptsCell(row.receipt_ids),
    (elsewhereFor.get(row.key) ?? 0) > 0 ? `<a href="#actor/${encodeURIComponent(row.entity_id)}">${recordPlural(elsewhereFor.get(row.key), 'other surface')}</a>` : '<span class="meta">only here</span>'
  ];
  let participantsTable;
  let rosterStatus = '';
  if (record.dense) {
    const roster = partitionParticipantRows(partition.shown, RECORD_PREVIEW_ROWS);
    rosterStatus = `<p class="ledger-status" role="status">${record.elsewhere_count} of ${record.participant_count} listed people appear on any other documented surface; ${record.nowhere_else_count} appear only here. Sorted by that count, then by name.</p>`;
    participantsTable = `${recordTable(columns, roster.preview, cellsFor, { rowAttributes: recordRowAttributes })}${roster.remaining.length ? `<p class="meta">First ${roster.preview.length} of ${roster.total} participant records shown. This is a count of ledger rows, not a verdict about any person.</p><details class="participant-overflow"><summary>Show remaining ${recordPlural(roster.remaining.length, 'participant record')}</summary>${recordTable(columns, roster.remaining, (row, index) => cellsFor(row, index + roster.preview.length), { rowAttributes: (row, index) => recordRowAttributes(row, index + roster.preview.length) })}</details>` : ''}`;
  } else {
    participantsTable = recordTable(columns, partition.shown, cellsFor, { rowAttributes: recordRowAttributes });
  }
  const participants = record.actor_rows.length
    ? `<section class="panel record-ledger"><span class="panel-label">Participants</span><h3>${recordPlural(record.participant_count, 'person', 'people')} documented on this surface${record.dense ? ', one contained roster' : ''}</h3><section class="record-strip-wrap">${strip}</section><div class="ledger-controls">${recordFloorControl(partition.floor)}<p class="ledger-status" id="record-ledger-status" role="status">${esc(recordStatusText(partition, participantRows.length, 'participant row'))}</p></div>${rosterStatus}${participantsTable}<p class="meta record-boundary">${esc(RECORD_BOUNDARY)}</p></section>`
    : `<section class="panel record-ledger"><span class="panel-label">Participants</span><h3>No person is documented on this surface</h3><section class="record-strip-wrap">${strip}</section><p class="meta">${recordPlural(record.organization_rows.length, 'organization row')} only; a surface without two people can never be a hop basis.</p></section>`;

  const organizations = `<section class="panel"><span class="panel-label">Organizations on this surface</span><h3>${recordPlural(record.organization_rows.length, 'organization')}</h3>${recordPatternList(record.organization_rows.map(row => `<li><a href="#organization/${encodeURIComponent(row.entity_id)}">${esc(row.entity_label)}</a> · ${esc(row.role || humanLabel(row.participation_type || 'organization'))} <small>${esc(humanLabel(row.participation_type || ''))} · ${esc(recordWindowText(row))} · ${esc(recordEvidenceWord(row.evidence_class))}</small></li>`), { empty: 'No organization row on this surface.' })}</section>`;

  const bases = s.hop_eligible
    ? `<section class="panel record-bases"><span class="panel-label">Admitted hop bases</span><h3>${recordPlural(record.basis_count, 'actor pair')} share this surface${record.basis_days.length ? ` on ${esc(record.basis_days.join(', '))}` : ''}</h3><p class="meta">Each basis is one compiler-admitted pair on this surface's day. It is listed, never drawn as a line; open the connection checker to see the pair with its receipts.</p>${record.basis_count ? `<details class="participant-overflow"><summary>List the ${recordPlural(record.basis_count, 'pair')}</summary><ul class="record-pattern-list">${record.bases.map(basis => `<li><a href="#desk/${encodeURIComponent(basis.actor_a)}/${encodeURIComponent(basis.actor_b)}">${esc(labelActor(basis.actor_a))} × ${esc(labelActor(basis.actor_b))}</a> · ${esc(basis.iso_day ?? 'not dated')} · ${evidenceBadge(basis.evidence_class)}<small>${esc(labelActor(basis.actor_a))}: ${esc(basis.actor_a_role || 'named participant')} · ${esc(labelActor(basis.actor_b))}: ${esc(basis.actor_b_role || 'named participant')}</small></li>`).join('')}</ul></details>` : '<p class="meta">The compiler admitted no pair on this surface.</p>'}</section>`
    : `<section class="panel why-no-hop"><span class="panel-label">Standing refusal</span><h3>Context only: no actor-pair basis</h3><p>${record.refusal?.reason_recorded ? `Ledger reason: <code>${esc(record.refusal.reason)}</code>.` : 'No reason is recorded in the ledger for this surface; the compiler marks it only as not hop-eligible.'} ${record.dense ? `The ${record.participant_count}-name roster is one contained object; the only cross-reference the ledger supports is the "Also documented on" column above.` : ''}</p></section>`;

  const claims = `<section class="panel"><span class="panel-label">Claims referencing this surface</span><h3>${recordPlural(record.claims.length, 'claim')} in the receipt graph</h3>${record.claims.length ? `<ul class="record-pattern-list record-claims">${record.claims.map(claim => `<li>${evidenceBadge(claim.evidence_class || 'open')} <span>${esc(claim.text)}</span><small>${esc(claim.date || 'date not recorded')}${claim.limits ? ` · Limits: ${esc(claim.limits)}` : ''}</small>${recordReceiptsCell(claim.receipt_ids, 'Claim receipts')}</li>`).join('')}</ul>` : '<p class="meta">No claim in the receipt graph references this surface. The participation rows above carry their own receipts.</p>'}</section>`;

  const receipts = `<section class="panel"><span class="panel-label">Surface receipts</span><h3>${recordPlural(recordUnique(s.receipt_ids).length, 'receipt')} attached to the surface record</h3>${renderReceiptGrid(s.receipt_ids, 'Surface receipts')}</section>`;

  $('#detail').innerHTML = `<article class="record record--surface" data-record-kind="surface" data-record-id="${esc(id)}">${headPanel}${participants}${organizations}${bases}${claims}${receipts}</article>`;
  bindRecordPage(record);
}

function renderType(type) {
  const record = typeRecordModel(state.timeline, type);
  if (!record) return renderNotFound('surface type', type);
  setDocumentTitle(`${record.label} (surface type)`);
  setRecord('type', type, record.label);
  const partition = recordFloorPartition(record.rows, state.recordFloor);
  state.recordText = ledgerText(record, partition.shown, { organizationsFor: recordOrganizationEntries });
  $('#summary').innerHTML = '';
  const actions = recordActions(record, { timelineToken: `type:${type}` });
  const strip = recordTimelineMarkup(recordTimelineLayout('type', type), { title: `${record.label}: one mark per surface of this type` });
  const ledger = recordLedgerPanel({
    title: `${recordPlural(record.rows.length, 'participation row')} on ${recordPlural(record.surfaces.length, 'surface')} of this type, by date`,
    columns: ['#', 'Date or window', 'Surface', 'Participant', 'Role', 'Evidence', 'Receipts'],
    rows: partition.shown,
    cellsFor: (row, index) => [String(index + 1), esc(recordWindowText(row)), recordSurfaceCell(row), `<a href="#${row.participant_type === 'organization' ? 'organization' : 'actor'}/${encodeURIComponent(row.entity_id)}">${esc(row.entity_label)}</a><small>${row.participant_type}</small>`, recordRoleCell(row), evidenceBadge(row.evidence_class), recordReceiptsCell(row.receipt_ids)],
    partition, total: record.rows.length,
    before: `<section class="record-strip-wrap">${strip}</section>`
  });
  const patterns = `<section class="panel record-patterns"><span class="panel-label">Patterns in the rows</span><h3>Who recurs inside this surface type</h3><div class="record-pattern-grid">
    <div><h4>People on two or more rows of this type</h4>${recordPatternList(record.people.map(entry => `<li><a href="#actor/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'row')}</li>`), { empty: 'No person appears on two rows of this type.' })}${recordDenseNote(record.dense_lines)}</div>
    <div><h4>Organizations</h4>${recordPatternList(record.organizations.map(entry => `<li><a href="#organization/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'row')}</li>`), { empty: 'No organization row of this type.' })}</div>
  </div></section>`;
  $('#detail').innerHTML = `<article class="record record--type" data-record-kind="type" data-record-id="${esc(type)}"><header class="panel record-head">${recordHeading(record.label, record.receipt_ids, actions)}<div class="badge-row record-kind-line"><span class="badge">surface type</span><span class="badge">${esc(type)}</span></div><p class="profile-copy">Every surface the compiler typed as <code>${esc(type)}</code>, with every participation row on those surfaces. A type groups surfaces for navigation; it creates no hop.</p>${recordFacts(record.facts)}</header>${ledger}${patterns}</article>`;
  bindRecordPage(record);
}

function renderYear(year) {
  const record = yearRecordModel(state.timeline, year, [...state.receipts.values()]);
  if (!record) return renderNotFound('year', year);
  setDocumentTitle(record.label);
  setRecord('year', record.id, record.label);
  const rows = record.rows_active.map(entry => entry.row);
  const beganEarlier = new Set(record.rows_active.filter(entry => entry.began_earlier).map(entry => entry.row.key));
  const partition = recordFloorPartition(rows, state.recordFloor);
  state.recordText = ledgerText(record, partition.shown, { organizationsFor: recordOrganizationEntries });
  $('#summary').innerHTML = '';
  const width = Math.max(280, $('#detail')?.clientWidth || 1000);
  const metrics = width < 600 ? TIMELINE_PHONE_METRICS : TIMELINE_DESKTOP_METRICS;
  const layout = layoutTimeline(state.timeline, { by: 'type', includeStrip: false, includeBlocks: false, includeColumns: false, domainFrom: `${record.id}-01-01`, domainTo: `${record.id}-12-31`, plotWidth: Math.max(140, width - metrics.labelWidth - metrics.padding * 2 - 4), ...metrics });
  const strip = recordTimelineMarkup(layout, { title: `Surfaces active in ${record.id}, one lane per surface type` });
  const ledger = recordLedgerPanel({
    title: `${recordPlural(rows.length, 'participation row')} active in ${record.id}, by date`,
    columns: ['#', 'Date or window', 'Surface', 'Participant', 'Role', 'Evidence', 'Receipts'],
    rows: partition.shown,
    cellsFor: (row, index) => [String(index + 1), `${esc(recordWindowText(row))}${beganEarlier.has(row.key) ? '<small>began before this year</small>' : ''}`, recordSurfaceCell(row), `<a href="#${row.participant_type === 'organization' ? 'organization' : 'actor'}/${encodeURIComponent(row.entity_id)}">${esc(row.entity_label)}</a><small>${row.participant_type}</small>`, recordRoleCell(row), evidenceBadge(row.evidence_class), recordReceiptsCell(row.receipt_ids)],
    partition, total: rows.length,
    before: `<section class="record-strip-wrap">${strip}</section><p class="meta">Surfaces that began before ${esc(record.id)} and were still documented inside it are listed with that note; the axis above shows only the calendar year.</p>`
  });
  const patterns = `<section class="panel record-patterns"><span class="panel-label">Patterns in the rows</span><h3>Who recurs inside ${esc(record.id)}</h3><div class="record-pattern-grid">
    <div><h4>People on two or more rows active this year</h4>${recordPatternList(record.people.map(entry => `<li><a href="#actor/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'row')}</li>`), { empty: 'No person appears on two rows active this year.' })}${recordDenseNote(record.dense_lines)}</div>
    <div><h4>Organizations on two or more rows</h4>${recordPatternList(record.organizations.map(entry => `<li><a href="#organization/${encodeURIComponent(entry.id)}">${esc(entry.label)}</a> · ${recordPlural(entry.count, 'row')}</li>`), { empty: 'No organization appears on two rows active this year.' })}</div>
  </div></section>`;
  $('#detail').innerHTML = `<article class="record record--year" data-record-kind="year" data-record-id="${esc(record.id)}"><header class="panel record-head">${recordHeading(record.label, record.receipt_ids, recordActions(record, { copyLedger: true }))}<div class="badge-row record-kind-line"><span class="badge">calendar year</span></div><p class="profile-copy">Every participation row whose documented window touches ${esc(record.id)}. Hop bases are counted by their basis day, never by an edge envelope.</p>${recordFacts(record.facts)}</header>${ledger}${patterns}</article>`;
  bindRecordPage(record);
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

/* ---------------- Route projections (ladder step 5, "Route (tactical)") ----------------
   docs/atlas-representation-ladder.md: the minimum-hop route is always the
   Clifford Number and is always displayed first; every other projection
   (strongest evidence, best dated, official only, as-of) is a clearly
   labelled secondary that never redefines it and never silently substitutes
   for it when absent. routeModesModel is pure -- it reads only the
   `state.hopGraph` and `options` it is handed and returns a fresh value
   every call, so it is vm-testable (test/route-modes.test.js). The
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
  $('#detail').innerHTML = `<div class="panel why-no-hop"><h1>Load error</h1><p>${esc(err.message)}</p><p>Run <code>npm run compile</code>, then reload this page.</p></div>`;
});
