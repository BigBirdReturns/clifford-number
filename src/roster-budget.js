/** Pure, browser-safe roster budgeting over a compiled surface graph
 * (`build/surface-graph.json`), for rendering a dense bounded surface (a
 * roster with dozens or hundreds of actor participants) as a bracketed,
 * budgeted overview instead of an unreadable wall of nodes. No DOM, no Node
 * built-ins; its only import is the canonical evidence ranking, so it can be
 * loaded straight into the browser and unit-tested with plain `node:test`.
 *
 * Reads a `surface` object from `build/surface-graph.json`'s `surfaces[]`:
 * `{ surface_id, surface_label, participants: [...] }`, where a participant
 * with `participant_type === 'actor'` carries `actor_id`, `role`,
 * `participation_type`, `evidence_class`, `time_start`, `time_end`, and
 * `receipt_ids`.
 *
 * Temporal widening is duplicated here to preserve a small browser-safe
 * module, while evidence ranking imports the single canonical vocabulary.
 * A participant's window is `time_start`/`time_end` (no
 * `temporal_status` field — participant records are never partially dated),
 * so the as-of gate here is a plain window-overlap check, not the
 * dated-only gate `src/route-diagnostics.js` applies to hop bases.
 */

import { evidenceRank, meetsEvidenceFloor } from './evidence-rank.js';

// ---------------------------------------------------------------------------
// Temporal widening — ported verbatim in behavior from
// src/route-projections.js (itself mirroring tools/lib/temporal.mjs).

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function lastDayOfMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseTemporalValue(value) {
  const v = String(value).trim();
  let precision;
  if (YEAR_RE.test(v)) precision = 'year';
  else if (MONTH_RE.test(v)) precision = 'month';
  else if (DAY_RE.test(v)) precision = 'day';
  else throw new Error(`unparseable temporal value: ${JSON.stringify(value)}`);

  const [year, month, day] = v.split('-').map(Number);
  if (year === 0) throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (year 0000 is invalid)`);
  if (precision !== 'year' && (month < 1 || month > 12)) {
    throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (month must be 01..12)`);
  }
  if (precision === 'day') {
    const maxDay = lastDayOfMonth(year, month);
    if (day < 1 || day > maxDay) {
      throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (day must be 01..${String(maxDay).padStart(2, '0')})`);
    }
  }
  return { v, precision, year, month, day };
}

function periodStart(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-01-01`;
  if (precision === 'month') return `${v}-01`;
  return v;
}

function periodEnd(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision, year, month } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-12-31`;
  if (precision === 'month') return `${v}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`;
  return v;
}

// Null treated as -inf / +inf, same as tools/lib/temporal.mjs#intersect.
function intersects(a, b) {
  const from = a.valid_from === null ? b.valid_from
    : b.valid_from === null ? a.valid_from
    : (a.valid_from > b.valid_from ? a.valid_from : b.valid_from);
  const until = a.valid_until === null ? b.valid_until
    : b.valid_until === null ? a.valid_until
    : (a.valid_until < b.valid_until ? a.valid_until : b.valid_until);
  return !(from !== null && until !== null && from > until);
}

/** Does a `[validFrom, validUntil]` window overlap the query period
 * ("2020", "2020-03", "2020-03-14")? The period is widened to its full
 * extent first, exactly as the compiler's --as-of does. */
function overlapsPeriod(validFrom, validUntil, period) {
  const window = { valid_from: validFrom ?? null, valid_until: validUntil ?? null };
  const q = { valid_from: periodStart(period), valid_until: periodEnd(period) };
  if (q.valid_from === null && q.valid_until === null) return true;
  return intersects(window, q);
}

// ---------------------------------------------------------------------------
// Small shared helpers

function humanLabel(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

/** Every participant on `surface` that is an actor (as opposed to an
 * organization) with a resolvable `actor_id`. */
export function actorParticipants(surface) {
  return (surface?.participants ?? []).filter(participant => participant.participant_type === 'actor' && participant.actor_id);
}

/** Does `participant` pass the evidence floor and (if given) the as-of time
 * slice? Unlike a hop basis, a participant record carries no
 * `temporal_status`, so any participant with a `time_start`/`time_end`
 * window overlapping `asOf` passes — there is no separate "undated" bucket
 * to gate on here. */
function participantMatches(participant, { evidenceFloor = 'open', asOf = '' } = {}) {
  if (!meetsEvidenceFloor(participant?.evidence_class, evidenceFloor)) return false;
  if (!asOf) return true;
  return overlapsPeriod(participant?.time_start, participant?.time_end, asOf);
}

// ---------------------------------------------------------------------------
// Exports

/** Select which of `surface`'s actor participants are visible under a
 * search query, evidence floor, as-of slice, and a display budget — without
 * ever silently dropping anyone. Pinned actors (`pinnedIds`) are always
 * visible: the effective budget floor rises to at least the pinned count,
 * so a pin is never itself the reason an actor disappears.
 *
 * Ordering (and therefore which unpinned actors fill the remaining budget)
 * is deterministic: pinned first, then strongest evidence first, then dated
 * before undated, then alphabetically by display label.
 *
 * The returned counts always reconcile: every actor participant on the
 * surface is exactly one of `visible`, `hiddenByBudget` (matched the query
 * and evidence/time filters but the budget ran out), or `filteredOut`
 * (excluded by evidence floor, as-of, or the search query) —
 * `visible.length + hiddenByBudget + filteredOut === totalActors`. */
export function selectBudgetedParticipants(surface, {
  query = '',
  evidenceFloor = 'open',
  asOf = '',
  budget = 18,
  pinnedIds = new Set(),
  labels = new Map(),
} = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds ?? []);

  const eligible = actorParticipants(surface).filter(participant => participantMatches(participant, { evidenceFloor, asOf }));

  const matchesQuery = participant => {
    if (!normalizedQuery) return true;
    const label = labels.get(participant.actor_id) || participant.actor_id;
    return [label, participant.actor_id, participant.role, participant.participation_type]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  };

  const candidates = eligible.filter(participant => pinned.has(participant.actor_id) || matchesQuery(participant));

  candidates.sort((a, b) => {
    const pinDelta = Number(pinned.has(b.actor_id)) - Number(pinned.has(a.actor_id));
    if (pinDelta) return pinDelta;
    const evidenceDelta = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    if (evidenceDelta) return evidenceDelta;
    const datedDelta = Number(Boolean(b.time_start || b.time_end)) - Number(Boolean(a.time_start || a.time_end));
    if (datedDelta) return datedDelta;
    const aLabel = labels.get(a.actor_id) || a.actor_id;
    const bLabel = labels.get(b.actor_id) || b.actor_id;
    return aLabel.localeCompare(bLabel);
  });

  const pinnedCandidates = candidates.filter(participant => pinned.has(participant.actor_id));
  const unpinnedCandidates = candidates.filter(participant => !pinned.has(participant.actor_id));
  const targetBudget = Math.max(Number(budget) || 0, pinnedCandidates.length);
  const visible = [...pinnedCandidates, ...unpinnedCandidates.slice(0, Math.max(0, targetBudget - pinnedCandidates.length))];

  const candidateIds = new Set(candidates.map(participant => participant.actor_id));
  const filteredOut = eligible.filter(participant => !candidateIds.has(participant.actor_id)).length;

  return {
    visible,
    eligibleCount: eligible.length,
    hiddenByBudget: Math.max(0, candidates.length - visible.length),
    filteredOut,
    totalActors: actorParticipants(surface).length,
  };
}

/** Group heuristic for `groupDenseSurface`: classify a participant into a
 * coarse role category from its `participation_type` and `role` text. Order
 * matters — the first matching category wins. */
function denseGroupKey(participant) {
  const type = String(participant?.participation_type || '').toLowerCase();
  const role = String(participant?.role || '').toLowerCase();
  const text = `${type} ${role}`;
  if (/minister|official|government|civil service|adviser/.test(text)) return 'public_office';
  if (/invest|fund|capital|shareholder/.test(text)) return 'capital';
  // \b keeps "director" from swallowing "directory": a directory listing is
  // listed_or_attending, not leadership.
  if (/founder|chief|ceo|officer|\bdirector\b|board/.test(text)) return 'leadership';
  if (/staff|employee|scientist|engineer|research/.test(text)) return 'operators';
  if (/listed|directory|member|attend|register/.test(text)) return 'listed_or_attending';
  return type || 'other';
}

/** Group every actor participant on `surface` into role-category buckets
 * (see `denseGroupKey`), sorted by descending group size and then label.
 * Every actor participant lands in exactly one group, so the group counts
 * always sum to `actorParticipants(surface).length`. */
export function groupDenseSurface(surface) {
  const groups = new Map();
  for (const participant of actorParticipants(surface)) {
    const id = denseGroupKey(participant);
    if (!groups.has(id)) groups.set(id, { id, label: humanLabel(id), participants: [] });
    groups.get(id).participants.push(participant);
  }
  return [...groups.values()]
    .map(group => ({ ...group, count: group.participants.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
