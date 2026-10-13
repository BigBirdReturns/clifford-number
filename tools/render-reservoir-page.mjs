#!/usr/bin/env node
// Render build/reservoir/index.html: the page through which the body of
// inquiry is entered by question, actor, path or mechanism; where attention
// pooled (hubs); what moved since the last pass; and, for one inquiry, what
// drew attention, what supports or challenges its explanations, what it
// touches, and how to return a result. Built from build/reservoir/* only.
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';
import { readJsonlFile, RECONNECT_HUB_LIMIT } from './lib/reservoir.mjs';

const dir = path.join(root, process.argv[2] || 'build/reservoir');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const inquiries = readJsonlFile(path.join(dir, 'inquiries.compiled.jsonl'));
const delta = fs.existsSync(path.join(dir, 'delta.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'delta.json'), 'utf8')) : null;
const decisions = readJsonlFile(path.join(root, 'data/decisions/prune-decisions.jsonl'));
const disagreements = readJsonlFile(path.join(root, 'data/reservoir/disagreements.jsonl'));

// Keep the embedded payload to what the page uses.
const slim = inquiries.map((row) => ({
  id: `${row.project}:${row.inquiry_id}`,
  project: row.project,
  inquiry_id: row.inquiry_id,
  question: row.question,
  qo: row.question_origin,
  prompt: row.prompting_observation || null,
  prompt_status: row.prompting_observation_status || null,
  assessments: row.assessments || [],
  explanations: row.competing_explanations,
  history: row.dispositions,
  locators: row.locators,
  related: row.related_inquiry_ids,
  next: row.next_examination,
  recorded_at: row.recorded_at,
  last_activity: row.last_activity || null,
  source: row.derived ? row.derived.source : 'canonical',
  kind: row.derived ? (row.derived.kind || null) : 'canonical',
  tier: row.derived && row.derived.tier ? row.derived.tier : null,
  text: row.derived && row.derived.text ? row.derived.text : null,
}));

const data = {
  as_of: manifest.as_of,
  fingerprint: manifest.fingerprint,
  counts: manifest.counts,
  hubs: manifest.hubs,
  reconnections: manifest.reconnections,
  contradictions: manifest.contradictions,
  delta,
  decisions,
  disagreements,
  hub_limit: RECONNECT_HUB_LIMIT,
  inquiries: slim,
};
const json = JSON.stringify(data).replace(/<\//gu, '<\\/');

const html = `<title>Clifford Reservoir</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..800&family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
/* Layout: a header strip of counts and what moved, then two columns: the register of inquiries on the left (entry by search, hub, state, origin) and one opened inquiry on the right. Stacks on a phone. Same faces and accent as the trail map; state carries semantic colour, teal is the only accent. */
:root {
  --bg: #f2f5f4; --surface: #ffffff; --ink: #14201d; --muted: #56645f; --line: #d3dbd8;
  --accent: #0d5c63; --accent-soft: #e1eeee;
  --held: #5f6965; --held-bg: #e9edeb;
  --open: #1d5aa0; --open-bg: #e4edf8;
  --narrowed: #8a5f00; --narrowed-bg: #f6eed9;
  --answered: #1c7340; --answered-bg: #e3f2e8;
  --disproved: #ad2a20; --disproved-bg: #f9e5e2;
  --human: #6b2d8f; --human-bg: #efe4f6;
  --font-display: "Archivo", "Arial Narrow", system-ui, sans-serif;
  --font-body: "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0e1413; --surface: #151e1d; --ink: #e3ebe8; --muted: #93a29d; --line: #293533;
    --accent: #63b9bf; --accent-soft: #16302f;
    --held: #a2ada8; --held-bg: #1d2523; --open: #82b3ee; --open-bg: #142235;
    --narrowed: #e2b24d; --narrowed-bg: #2b2210; --answered: #63c98a; --answered-bg: #13281b;
    --disproved: #f08a80; --disproved-bg: #321715; --human: #c79be0; --human-bg: #2a1b33;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0e1413; --surface: #151e1d; --ink: #e3ebe8; --muted: #93a29d; --line: #293533;
  --accent: #63b9bf; --accent-soft: #16302f;
  --held: #a2ada8; --held-bg: #1d2523; --open: #82b3ee; --open-bg: #142235;
  --narrowed: #e2b24d; --narrowed-bg: #2b2210; --answered: #63c98a; --answered-bg: #13281b;
  --disproved: #f08a80; --disproved-bg: #321715; --human: #c79be0; --human-bg: #2a1b33;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 15px; line-height: 1.5; padding-inline: 16px; padding-block: 0 48px; }
a { color: var(--accent); }
h1, h2, h3 { font-family: var(--font-display); font-stretch: 85%; letter-spacing: -0.01em; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; }
h2 { font-size: 18px; font-weight: 700; }
h3 { font-size: 15px; font-weight: 700; }
.wrap { max-width: 1320px; margin: 0 auto; }
header.top { padding-block: 28px 16px; border-bottom: 1px solid var(--line); display: grid; gap: 10px; }
.lede { max-width: 68ch; color: var(--muted); margin: 0; }
.eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.counts { display: flex; flex-wrap: wrap; gap: 8px 22px; font-variant-numeric: tabular-nums; margin-top: 4px; }
.counts div { display: grid; }
.counts b { font-family: var(--font-display); font-size: 22px; font-weight: 700; line-height: 1.1; }
.counts span { font-size: 12px; color: var(--muted); }
section.moved { margin-top: 16px; padding: 12px 14px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 0 6px 6px 0; }
section.moved ul { margin: 6px 0 0; padding-left: 18px; }
section.moved code, .mono { font-family: var(--font-mono); font-size: 12.5px; }
main { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 20px; margin-top: 20px; align-items: start; }
@media (max-width: 860px) { main { grid-template-columns: minmax(0, 1fr); } #detail { order: -1; } }
.register { display: grid; gap: 12px; min-width: 0; }
.search { display: grid; gap: 6px; }
.search input { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink); }
.search input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: inherit; font-size: 12.5px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); cursor: pointer; }
.chip[aria-pressed="true"] { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.chip:focus-visible, .row:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.hubs { display: grid; gap: 4px; }
.hubs details { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
.hubs summary { cursor: pointer; padding: 8px 12px; font-weight: 600; }
.hubs .hub { display: flex; justify-content: space-between; gap: 10px; width: 100%; text-align: left; font: inherit; background: none; border: 0; border-top: 1px solid var(--line); padding: 7px 12px; color: var(--ink); cursor: pointer; min-width: 0; }
.hubs .hub span:first-child { font-family: var(--font-mono); font-size: 12.5px; overflow-wrap: anywhere; }
.hubs .hub b { font-variant-numeric: tabular-nums; white-space: nowrap; }
.hubs .hub:hover, .row:hover { background: var(--accent-soft); }
.list { display: grid; gap: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); overflow: hidden; }
.row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; width: 100%; text-align: left; font: inherit; border: 0; border-top: 1px solid var(--line); background: none; color: var(--ink); padding: 10px 12px; cursor: pointer; min-width: 0; }
.row:first-child { border-top: 0; }
.row[aria-current="true"] { background: var(--accent-soft); box-shadow: inset 3px 0 0 var(--accent); }
.row .q { overflow-wrap: anywhere; }
.row .meta { font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 2px; }
.pill { display: inline-block; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
.pill.held { color: var(--held); background: var(--held-bg); }
.pill.open, .pill.parked { color: var(--open); background: var(--open-bg); }
.pill.narrowed { color: var(--narrowed); background: var(--narrowed-bg); }
.pill.answered { color: var(--answered); background: var(--answered-bg); }
.pill.disproved, .pill.retired, .pill.superseded { color: var(--disproved); background: var(--disproved-bg); }
.pill.live { color: var(--open); background: var(--open-bg); }
.tag { display: inline-block; font-size: 11.5px; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--muted); }
.tag.human_words { color: var(--human); border-color: var(--human); background: var(--human-bg); }
.tag.human_relayed { color: var(--human); border-color: var(--human); }
.more { font: inherit; padding: 10px; border: 0; border-top: 1px solid var(--line); background: var(--surface); color: var(--accent); cursor: pointer; width: 100%; }
.empty { padding: 14px; color: var(--muted); }
#detail { position: sticky; top: env(safe-area-inset-top, 0px); max-height: calc(100vh - env(safe-area-inset-top, 0px)); overflow: auto; min-width: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); padding: 18px; display: grid; gap: 16px; align-content: start; }
@media (max-width: 860px) { #detail { position: static; max-height: none; } }
#detail .id { font-family: var(--font-mono); font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
#detail h2.q { font-size: 20px; font-stretch: 90%; }
.block { display: grid; gap: 6px; }
.block > .eyebrow { margin-bottom: 2px; }
blockquote { margin: 0; padding: 10px 14px; border-left: 3px solid var(--human); background: var(--human-bg); border-radius: 0 6px 6px 0; }
blockquote.agent { border-left-color: var(--line); background: var(--bg); }
blockquote cite { display: block; font-style: normal; font-size: 12px; color: var(--muted); margin-top: 6px; }
.hist { display: grid; gap: 6px; padding-left: 0; margin: 0; list-style: none; }
.hist li { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 8px; align-items: baseline; }
.hist .d { font-family: var(--font-mono); font-size: 12px; color: var(--muted); white-space: nowrap; }
.ex { border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; display: grid; gap: 6px; }
.ex .bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ex .sc { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.ex ul { margin: 0; padding-left: 18px; font-size: 13.5px; }
.loc { display: grid; gap: 4px; padding-left: 0; margin: 0; list-style: none; font-size: 13.5px; }
.loc li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: baseline; }
.loc .k { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.loc .v { overflow-wrap: anywhere; }
.loc .note { color: var(--muted); }
.rel { display: grid; gap: 4px; padding-left: 0; margin: 0; list-style: none; font-size: 13.5px; }
.rel button { font: inherit; text-align: left; background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; text-decoration: underline; overflow-wrap: anywhere; }
.assess { display: grid; gap: 6px; font-size: 13.5px; }
.assess div { padding: 8px 10px; background: var(--bg); border-radius: 6px; }
.assess .who { font-size: 12px; color: var(--muted); }
.ret { padding: 10px 12px; background: var(--accent-soft); border-radius: 6px; font-size: 13.5px; }
footer { margin-top: 28px; border-top: 1px solid var(--line); padding-top: 12px; font-size: 12.5px; color: var(--muted); display: grid; gap: 4px; }
@media (prefers-reduced-motion: no-preference) { .row, .chip, .hub { transition: background-color 120ms ease; } }
</style>
<div class="wrap">
<header class="top">
  <div class="eyebrow">Clifford Number · the continuing body of inquiry</div>
  <h1>Clifford Reservoir</h1>
  <p class="lede">Enter by a question, an actor, a path or a mechanism. Open an inquiry to recover what drew attention there, what supports or challenges each explanation, what it touches, and how to return a result to its history. Nothing here is a claim, hop or graph edge.</p>
  <div class="counts" id="counts"></div>
</header>
<section class="moved" id="moved" hidden></section>
<main>
  <section class="register" aria-label="Register of inquiries">
    <div class="search">
      <label class="eyebrow" for="q">Enter by</label>
      <input id="q" type="search" placeholder="question, actor, path, mechanism, id" autocomplete="off">
    </div>
    <div class="chips" id="states" aria-label="State"></div>
    <div class="chips" id="origins" aria-label="Origin of the question"></div>
    <div class="chips" id="sources" aria-label="Source"></div>
    <div class="hubs" id="hubs"></div>
    <div class="eyebrow" id="summary"></div>
    <div class="list" id="list"></div>
  </section>
  <section id="detail" aria-live="polite"></section>
</main>
<footer id="foot"></footer>
</div>
<script type="application/json" id="reservoir-data">${json}</script>
<script>
(function () {
  var D = JSON.parse(document.getElementById('reservoir-data').textContent);
  var byId = {}; D.inquiries.forEach(function (r) { byId[r.id] = r; });
  var projects = {}; D.inquiries.forEach(function (r) { projects[r.project] = true; });
  function qualify(ref, project) { for (var p in projects) if (ref.indexOf(p + ':') === 0) return ref; return project + ':' + ref; }
  function state(r) { return r.history[r.history.length - 1].state; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sourceLabel(r) {
    if (r.source === 'canonical') return 'canonical';
    if (r.source === 'retrospective-2026-10-12') return 'retrospective trail';
    if (r.kind === 'github_issue_disposition') return 'ledger: issue';
    if (r.kind === 'github_pull_request_disposition') return 'ledger: pull request';
    if (r.kind === 'view_provenance') return 'ledger: provenance';
    if (/\\.view\\.jsonl$/.test(r.source)) return 'view: ' + r.project;
    return 'main: ' + r.source.replace(/^data\\/project\\//, '').replace(/\\.json$/, '');
  }
  function sourceKey(r) {
    if (r.source === 'canonical') return 'canonical';
    if (r.source === 'retrospective-2026-10-12') return 'retrospective';
    if (r.kind === 'github_issue_disposition') return 'ledger-issues';
    if (r.kind === 'github_pull_request_disposition') return 'ledger-prs';
    if (/\\.view\\.jsonl$/.test(r.source)) return 'view';
    return 'main';
  }
  function locText(l) {
    return l.path || l.branch || l.commit || l.url || l.name || (l.number !== undefined ? '#' + l.number : '') || l.text || l.id || '';
  }
  function locHref(l) {
    var repo = l.repo && /^[\\w.-]+\\/[\\w.-]+$/.test(l.repo) ? l.repo : null;
    if (l.kind === 'url' || l.kind === 'conversation') return l.url;
    if (l.kind === 'github_item' && repo) return 'https://github.com/' + repo + '/issues/' + l.number;
    if (l.kind === 'git_path' && repo) return 'https://github.com/' + repo + '/blob/' + (l.ref || 'main') + '/' + l.path;
    if (l.kind === 'git_path' && !l.repo) return 'https://github.com/BigBirdReturns/clifford-number/blob/main/' + l.path;
    if (l.kind === 'git_branch' && repo) return 'https://github.com/' + repo + '/tree/' + l.branch;
    return null;
  }
  D.inquiries.forEach(function (r) {
    var parts = [r.inquiry_id, r.question, r.prompt ? r.prompt.text : '', r.text || ''];
    r.locators.forEach(function (l) { parts.push(locText(l)); parts.push(l.note || ''); });
    r.assessments.forEach(function (a) { parts.push(a.meaning); parts.push(a.note || ''); parts.push(a.headline || ''); });
    r.explanations.forEach(function (e) { parts.push(e.text); });
    r.hay = parts.join(' \\n ').toLowerCase();
  });
  var hubOf = {}; D.hubs.forEach(function (h) { h.inquiries.forEach(function (id) { (hubOf[id] = hubOf[id] || []).push(h); }); });

  // Counts
  var c = D.counts;
  document.getElementById('counts').innerHTML = [
    [c.total_inquiries, 'inquiries'], [c.held, 'held, no disposition made'], [c.open_or_parked, 'open, narrowed or parked'],
    [c.without_prompting_observation, 'original prompt not located'], [c.explanations_disproved_with_evidence, 'explanations disproved'],
    [c.hubs, 'hubs'], [c.reconnections, 'pairwise reconnections'], [c.decisions, 'prune decisions'], [c.disagreements, 'model disagreements']
  ].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');

  // What moved
  var moved = document.getElementById('moved');
  if (D.delta) {
    var d = D.delta, items = [];
    if (d.first_build) items.push('First build in this output directory; every input and inquiry is new.');
    else if (d.unchanged) items.push('No input changed since fingerprint <code>' + esc(d.previous_fingerprint) + '</code>. Nothing needs reconsidering.');
    else {
      d.inputs_changed.forEach(function (p) { items.push('input changed: <code>' + esc(p) + '</code>'); });
      d.inputs_added.forEach(function (p) { items.push('input added: <code>' + esc(p) + '</code>'); });
      d.inputs_removed.forEach(function (p) { items.push('input removed: <code>' + esc(p) + '</code>'); });
      if (d.inquiries_changed.length) items.push(d.inquiries_changed.length + ' inquiries changed' + (d.inquiries_changed.length <= 8 ? ': ' + d.inquiries_changed.map(function (id) { return '<a href="#" data-open="' + esc(id) + '">' + esc(id) + '</a>'; }).join(', ') : ''));
      if (d.inquiries_added.length) items.push(d.inquiries_added.length + ' inquiries added' + (d.inquiries_added.length <= 8 ? ': ' + d.inquiries_added.map(function (id) { return '<a href="#" data-open="' + esc(id) + '">' + esc(id) + '</a>'; }).join(', ') : ''));
      if (d.inquiries_removed.length) items.push(d.inquiries_removed.length + ' inquiries removed');
      items.push('reconnections added ' + d.reconnections_added + ', removed ' + d.reconnections_removed);
    }
    moved.innerHTML = '<div class="eyebrow">What moved since the previous pass</div><ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
    moved.hidden = false;
  }

  // Filters
  var filter = { q: '', state: null, origin: null, source: null, hub: null };
  function chips(elId, values, key, labels) {
    var el = document.getElementById(elId);
    el.innerHTML = values.map(function (v) { return '<button class="chip" type="button" data-v="' + esc(v) + '" aria-pressed="false">' + esc(labels ? labels[v] || v : v) + '</button>'; }).join('');
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip'); if (!b) return;
      filter[key] = filter[key] === b.dataset.v ? null : b.dataset.v;
      Array.prototype.forEach.call(el.children, function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === filter[key])); });
      render();
    });
  }
  chips('states', ['held', 'open', 'narrowed', 'answered', 'parked', 'retired'], 'state');
  chips('origins', ['human_words', 'human_relayed', 'agent_observation', 'agent_interpretation', 'retrospective_interpretation', 'derived_from_record'], 'origin',
    { human_words: 'owner\\u2019s words', human_relayed: 'owner, relayed', agent_observation: 'agent observed', agent_interpretation: 'agent interpreted', retrospective_interpretation: 'retrospective judged', derived_from_record: 'derived from a record' });
  chips('sources', ['canonical', 'retrospective', 'main', 'ledger-issues', 'ledger-prs', 'view'], 'source',
    { canonical: 'canonical ledger', retrospective: '79 retrospective trails', main: 'question records on main', 'ledger-issues': 'Git ledger: issues', 'ledger-prs': 'Git ledger: pull requests', view: 'other projects\\u2019 views' });

  // Hubs
  var hubsEl = document.getElementById('hubs');
  hubsEl.innerHTML = '<details><summary>Where attention pooled: ' + D.hubs.length + ' hubs, each a path cited by more than ' + D.hub_limit + ' records</summary>' +
    D.hubs.slice().sort(function (a, b) { return b.inquiries.length - a.inquiries.length; }).map(function (h) {
      var p = h.path.slice(h.path.indexOf('|') + 1);
      return '<button class="hub" type="button" data-hub="' + esc(h.path) + '"><span>' + esc(p) + '</span><b>' + h.inquiries.length + '</b></button>';
    }).join('') + '</details>';
  hubsEl.addEventListener('click', function (ev) {
    var b = ev.target.closest('.hub'); if (!b) return;
    filter.hub = filter.hub === b.dataset.hub ? null : b.dataset.hub;
    Array.prototype.forEach.call(hubsEl.querySelectorAll('.hub'), function (x) { x.style.fontWeight = x.dataset.hub === filter.hub ? '700' : ''; });
    render();
  });

  var input = document.getElementById('q');
  input.addEventListener('input', function () { filter.q = input.value.trim().toLowerCase(); render(); });

  var limit = 120, current = null;
  var order = { narrowed: 0, open: 1, parked: 2, answered: 3, held: 4, retired: 5, disproved: 5, superseded: 5 };
  function matches(r) {
    if (filter.state && state(r) !== filter.state) return false;
    if (filter.origin && r.qo.kind !== filter.origin) return false;
    if (filter.source && sourceKey(r) !== filter.source) return false;
    if (filter.hub) { var hs = hubOf[r.id] || []; if (!hs.some(function (h) { return h.path === filter.hub; })) return false; }
    if (filter.q) { var terms = filter.q.split(/\\s+/); for (var i = 0; i < terms.length; i++) if (r.hay.indexOf(terms[i]) < 0) return false; }
    return true;
  }
  function render() {
    var rows = D.inquiries.filter(matches).sort(function (a, b) {
      var oa = order[state(a)] == null ? 9 : order[state(a)], ob = order[state(b)] == null ? 9 : order[state(b)];
      if (oa !== ob) return oa - ob;
      var la = a.last_activity || a.recorded_at, lb = b.last_activity || b.recorded_at;
      if (la !== lb) return la < lb ? 1 : -1;
      return a.id < b.id ? -1 : 1;
    });
    document.getElementById('summary').textContent = rows.length + ' of ' + D.inquiries.length + ' inquiries';
    var list = document.getElementById('list');
    if (!rows.length) { list.innerHTML = '<div class="empty">Nothing matches. Clear a filter or try another word.</div>'; return; }
    var shown = rows.slice(0, limit);
    list.innerHTML = shown.map(function (r) {
      return '<button class="row" type="button" data-id="' + esc(r.id) + '" aria-current="' + (r.id === current) + '">' +
        '<span class="pill ' + esc(state(r)) + '">' + esc(state(r)) + '</span>' +
        '<span><div class="q">' + esc(r.question.length > 220 ? r.question.slice(0, 217) + '\\u2026' : r.question) + '</div>' +
        '<div class="meta"><span class="tag ' + esc(r.qo.kind) + '">' + esc(r.qo.kind.replace(/_/g, ' ')) + '</span><span>' + esc(sourceLabel(r)) + '</span>' +
        (r.tier ? '<span>tier ' + esc(r.tier) + '</span>' : '') + (r.last_activity ? '<span class="mono">' + esc(r.last_activity) + '</span>' : '') +
        (r.prompt ? '' : '<span>prompt not located</span>') + '</div></span></button>';
    }).join('') + (rows.length > limit ? '<button class="more" type="button" id="more">Show ' + Math.min(120, rows.length - limit) + ' more of ' + (rows.length - limit) + '</button>' : '');
  }
  document.getElementById('list').addEventListener('click', function (ev) {
    var m = ev.target.closest('#more'); if (m) { limit += 120; render(); return; }
    var b = ev.target.closest('.row'); if (!b) return;
    open(b.dataset.id);
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-open]'); if (!a) return;
    ev.preventDefault(); open(a.dataset.open);
  });

  function quote(p, cls) {
    return '<blockquote' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(p.text) + '<cite>' + esc(p.origin.kind.replace(/_/g, ' ')) + ' \\u00b7 ' + esc(p.origin.author) + (p.origin.note ? ' \\u00b7 ' + esc(p.origin.note) : '') + '</cite></blockquote>';
  }
  function locItem(l) {
    var href = locHref(l), t = locText(l);
    return '<li><span class="k">' + esc(l.kind.replace(/_/g, ' ')) + '</span><span class="v">' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(t) + '</a>' : esc(t)) +
      (l.repo && l.kind !== 'github_item' ? ' <span class="note">' + esc(l.repo) + (l.ref ? ' @ ' + esc(l.ref) : '') + '</span>' : '') + (l.host ? ' <span class="note">on ' + esc(l.host) + '</span>' : '') +
      (l.verified === false ? ' <span class="pill narrowed">unverified</span>' : '') + (l.note ? '<div class="note">' + esc(l.note) + '</div>' : '') + '</span></li>';
  }
  function open(id) {
    var r = byId[id]; if (!r) return;
    current = id; render();
    var el = document.getElementById('detail');
    var h = '<div class="id">' + esc(r.id) + '</div><h2 class="q">' + esc(r.question) + '</h2>' +
      '<div class="meta"><span class="tag ' + esc(r.qo.kind) + '">' + esc(r.qo.kind.replace(/_/g, ' ')) + '</span> ' + esc(r.qo.author) + (r.qo.note ? ' <span class="note">\\u00b7 ' + esc(r.qo.note) + '</span>' : '') + '</div>';
    h += '<div class="block"><div class="eyebrow">What drew attention</div>' + (r.prompt ? quote(r.prompt, r.prompt.origin.kind.indexOf('human') === 0 ? '' : 'agent') :
      '<blockquote class="agent">Original prompt not located in these inputs. A later headline or finding does not stand in for it; recovery continues through conversations and estate records.</blockquote>') + '</div>';
    h += '<div class="block"><div class="eyebrow">History \\u00b7 current state <span class="pill ' + esc(state(r)) + '">' + esc(state(r)) + '</span></div><ul class="hist">' +
      r.history.map(function (d) { return '<li><span class="d">' + esc(d.at) + '</span><span class="pill ' + esc(d.state) + '">' + esc(d.state) + '</span><span>' + esc(d.reason) + ' <span class="note">(' + esc(d.by.replace(/_/g, ' ')) + ')</span></span></li>'; }).join('') + '</ul></div>';
    if (r.assessments.length) h += '<div class="block"><div class="eyebrow">Assessments \\u00b7 attributed judgments, not dispositions</div><div class="assess">' +
      r.assessments.map(function (a) { return '<div><b>' + esc(a.rating) + '</b> = ' + esc(a.meaning) + (a.note ? '<div>' + esc(a.note) + '</div>' : '') + (a.headline ? '<div>' + esc(a.headline) + '</div>' : '') + '<div class="who">' + esc(a.at) + ' \\u00b7 ' + esc(a.by.author) + '</div></div>'; }).join('') + '</div></div>';
    h += '<div class="block"><div class="eyebrow">Competing explanations \\u00b7 ' + r.explanations.length + '</div>' + (r.explanations.length ? r.explanations.map(function (e) {
      return '<div class="ex"><div class="bar"><span class="pill ' + esc(e.status) + '">' + esc(e.status) + '</span><b>' + esc(e.explanation_id) + '</b><span class="sc">supported by ' + e.evidence_for.length + ' \\u00b7 challenged by ' + e.evidence_against.length + '</span></div><div>' + esc(e.text) + '</div>' +
        '<div class="note" style="font-size:12px;color:var(--muted)">' + esc(e.origin.kind.replace(/_/g, ' ')) + ' \\u00b7 ' + esc(e.origin.author) + '</div>' +
        (e.narrowed_by ? '<div><b>Narrowed by:</b> ' + esc(e.narrowed_by) + '</div>' : '') +
        (e.evidence_for.length ? '<div><b>Supported by</b><ul>' + e.evidence_for.map(function (l) { var hr = locHref(l); return '<li>' + (hr ? '<a href="' + esc(hr) + '" target="_blank" rel="noopener">' + esc(locText(l)) + '</a>' : esc(locText(l))) + (l.note ? ' <span class="note">' + esc(l.note) + '</span>' : '') + '</li>'; }).join('') + '</ul></div>' : '') +
        (e.evidence_against.length ? '<div><b>Challenged by</b><ul>' + e.evidence_against.map(function (l) { var hr = locHref(l); return '<li>' + (hr ? '<a href="' + esc(hr) + '" target="_blank" rel="noopener">' + esc(locText(l)) + '</a>' : esc(locText(l))) + (l.note ? ' <span class="note">' + esc(l.note) + '</span>' : '') + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
    }).join('') : '<div class="note" style="color:var(--muted)">None recorded. Returning one is how a result enters this history.</div>') + '</div>';
    h += '<div class="block"><div class="eyebrow">Touches \\u00b7 ' + r.locators.length + ' locators</div><ul class="loc">' + r.locators.map(locItem).join('') + '</ul></div>';
    var related = r.related.map(function (ref) { return byId[qualify(ref, r.project)]; }).filter(Boolean);
    var incoming = D.inquiries.filter(function (o) { return o !== r && o.related.some(function (ref) { return qualify(ref, o.project) === r.id; }); });
    var pairs = D.reconnections.filter(function (p) { return p.a === r.id || p.b === r.id; });
    var hubs = hubOf[r.id] || [];
    if (related.length || incoming.length || pairs.length || hubs.length) {
      h += '<div class="block"><div class="eyebrow">Connected</div><ul class="rel">' +
        related.map(function (o) { return '<li>relates to <button type="button" data-open="' + esc(o.id) + '">' + esc(o.question.slice(0, 140)) + '</button> <span class="pill ' + esc(state(o)) + '">' + esc(state(o)) + '</span></li>'; }).join('') +
        incoming.map(function (o) { return '<li>returned to by <button type="button" data-open="' + esc(o.id) + '">' + esc(o.question.slice(0, 140)) + '</button> <span class="pill ' + esc(state(o)) + '">' + esc(state(o)) + '</span></li>'; }).join('') +
        pairs.map(function (p) { var oid = p.a === r.id ? p.b : p.a, o = byId[oid]; return '<li>shares <span class="mono">' + esc(p.shared_paths.map(function (s) { return s.slice(s.indexOf('|') + 1); }).join(', ')) + '</span> with <button type="button" data-open="' + esc(oid) + '">' + esc(o ? o.question.slice(0, 120) : oid) + '</button></li>'; }).join('') +
        hubs.map(function (hb) { return '<li>meets at hub <button type="button" data-hubfilter="' + esc(hb.path) + '">' + esc(hb.path.slice(hb.path.indexOf('|') + 1)) + '</button> with ' + (hb.inquiries.length - 1) + ' others</li>'; }).join('') + '</ul></div>';
    }
    var decs = D.decisions.filter(function (d) { return d.inquiry_ids.some(function (ref) { return qualify(ref, d.project) === r.id; }); });
    var dis = D.disagreements.filter(function (d) { return d.inquiry_ids.some(function (ref) { return qualify(ref, d.project) === r.id; }); });
    if (decs.length) h += '<div class="block"><div class="eyebrow">Prune decisions</div>' + decs.map(function (d) { return '<blockquote>' + esc(d.reason) + '<cite>' + esc(d.decided_at) + ' \\u00b7 ' + esc(d.action) + ' (' + esc(d.reason_code) + (d.verified ? '' : ', subject not yet verified here') + ') \\u00b7 ' + esc(d.decided_by.author) + '</cite></blockquote>'; }).join('') + '</div>';
    if (dis.length) h += '<div class="block"><div class="eyebrow">Model disagreements</div>' + dis.map(function (d) { return '<div class="ex"><div class="bar"><span class="pill ' + (d.current_disposition === 'corrected' ? 'answered' : 'open') + '">' + esc(d.current_disposition) + '</span><b>' + esc(d.disagreement_id) + '</b></div>' + quote(d.original_human_claim) + quote(d.model_reformulation, 'agent') + '<div><b>Rejected because:</b> ' + esc(d.reason_for_rejection) + '</div><div><b>Missing distinction:</b> ' + esc(d.missing_distinction) + '</div></div>'; }).join('') + '</div>';
    h += '<div class="block"><div class="eyebrow">Next examination</div><div>' + (r.next ? esc(r.next.what) : 'None recorded.') + '</div>' + (r.next && r.next.where.length ? '<ul class="loc">' + r.next.where.map(locItem).join('') + '</ul>' : '') + '</div>';
    h += '<div class="ret"><b>To return a result:</b> ' + (r.source === 'canonical' ? 'append a disposition or a competing explanation to <span class="mono">' + esc(r.inquiry_id) + '</span> in <span class="mono">data/reservoir/inquiries.jsonl</span>, citing evidence locators.' :
      'this row is derived from <span class="mono">' + esc(r.source) + '</span>. Add a canonical inquiry whose <span class="mono">related_inquiry_ids</span> names <span class="mono">' + esc(r.id) + '</span>, or correct the source record.') + '</div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-hubfilter]').forEach(function (b) { b.addEventListener('click', function () { filter.hub = b.dataset.hubfilter; render(); window.scrollTo({ top: 0 }); }); });
    if (window.innerWidth <= 860) el.scrollIntoView({ block: 'start' });
  }

  document.getElementById('foot').innerHTML = '<div>Built ' + esc(D.as_of) + ' from the build clock, not an evidence date. Fingerprint <span class="mono">' + esc(D.fingerprint) + '</span>.</div>' +
    '<div>graph_effect none \\u00b7 conclusion_generated false \\u00b7 promotes_to candidate_only \\u00b7 retrospective tiers are not an outside review.</div>' +
    (D.contradictions.length ? '<div>' + D.contradictions.length + ' contradictions between the retrospective\\u2019s on_main judgment and main.</div>' : '');

  render();
  var first = D.inquiries.filter(function (r) { return r.source === 'canonical'; }).sort(function (a, b) { return a.recorded_at < b.recorded_at ? -1 : 1; })[0];
  if (first) open(first.id);
})();
</script>
`;

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`render-reservoir-page: ${path.relative(root, path.join(dir, 'index.html'))} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${slim.length} inquiries, ${manifest.hubs.length} hubs)`);
