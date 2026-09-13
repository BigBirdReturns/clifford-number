/** Pure, browser-safe diagnostics over the compiled hop graph
 * (`build/hop-graph.json`), for explaining *why* a filtered route search
 * comes back empty rather than just returning nothing. No DOM, no Node
 * built-ins; its only import is the canonical evidence ranking, like `src/ui-utils.js`
 * and `src/route-projections.js` are, so it can be loaded straight into the
 * browser and unit-tested with plain `node:test`.
 *
 * Reads the same `hopGraph` shape as `src/route-projections.js`: an object
 * with an `edges` array (each `{ actor_a, actor_b, surfaces: [...] }`, where
 * a `surfaces` entry — a "basis" — is one bounded surface supporting that
 * actor pair's hop, carrying `evidence_class`, `temporal_status`,
 * `valid_from`, and `valid_until`).
 *
 * Evidence ranking and temporal widening are duplicated here rather than
 * imported from `src/route-projections.js`, matching that module's own
 * precedent (it duplicates from `tools/lib/temporal.mjs` instead of
 * importing it) of keeping every browser-safe module free of local imports.
 * The behavior is identical: same evidence-rank table, same year/month/day
 * widening and as-of intersection, and the same rule that only a basis with
 * `temporal_status === 'dated'` can ever satisfy a time-sliced query.
 */

// ---------------------------------------------------------------------------
// Evidence ranking — the canonical shared ordering (src/evidence-rank.js).
// Lower number = stronger evidence; unknown classes rank weakest.
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
// Exports

/** For every edge in `hopGraph`, classify each of its bases (`surfaces[]`)
 * against `{ evidenceFloor, asOf }` and tally why a basis was, or was not,
 * usable for traversal. An edge counts as `traversableEdges` when at least
 * one of its bases survives both checks. Every basis on every edge lands in
 * exactly one of: usable (contributes to `traversableEdges`),
 * `evidenceBlockedBases` (evidence class ranks weaker than `evidenceFloor`),
 * `undatedBlockedBases` (an `asOf` filter is active but the basis is not
 * `temporal_status === 'dated'`), or `timeBlockedBases` (dated, but its
 * window does not overlap `asOf`). This mirrors the evidence and temporal
 * semantics `src/route-projections.js` uses for `officialOnlyRoute` /
 * `asOfRoute`, so a basis this module marks blocked is a basis those
 * traversals would also refuse to use, and vice versa. */
export function diagnosePathFilters(hopGraph, filters = {}) {
  const evidenceFloor = filters.evidenceFloor ?? 'open';
  const asOf = filters.asOf;

  const diagnostics = {
    totalEdges: 0,
    traversableEdges: 0,
    evidenceBlockedBases: 0,
    timeBlockedBases: 0,
    undatedBlockedBases: 0,
  };

  for (const edge of hopGraph?.edges ?? []) {
    diagnostics.totalEdges += 1;
    let traversable = false;
    for (const basis of edge.surfaces ?? []) {
      if (!meetsEvidenceFloor(basis.evidence_class, evidenceFloor)) {
        diagnostics.evidenceBlockedBases += 1;
        continue;
      }
      if (asOf) {
        if (basis.temporal_status !== 'dated') {
          diagnostics.undatedBlockedBases += 1;
          continue;
        }
        if (!overlapsPeriod(basis.valid_from, basis.valid_until, asOf)) {
          diagnostics.timeBlockedBases += 1;
          continue;
        }
      }
      traversable = true;
    }
    if (traversable) diagnostics.traversableEdges += 1;
  }

  return diagnostics;
}

/** Render a `diagnosePathFilters` result as an honest, human-readable
 * summary that names its own denominators rather than asserting a bare
 * conclusion — e.g. "0 of 31 edges are traversable: 4 bases fell below the
 * evidence floor, 2 were outside the time slice, and 1 was never dated." */
export function explainDiagnostics(diagnostics) {
  const {
    totalEdges = 0,
    traversableEdges = 0,
    evidenceBlockedBases = 0,
    timeBlockedBases = 0,
    undatedBlockedBases = 0,
  } = diagnostics ?? {};

  const headline = `${traversableEdges} of ${totalEdges} edge${totalEdges === 1 ? '' : 's'} ${traversableEdges === 1 ? 'is' : 'are'} traversable under the current filters.`;

  const plural = n => (n === 1 ? 'basis' : 'bases');
  const reasons = [];
  if (evidenceBlockedBases > 0) {
    reasons.push(`${evidenceBlockedBases} ${plural(evidenceBlockedBases)} fell below the evidence floor`);
  }
  if (timeBlockedBases > 0) {
    reasons.push(`${timeBlockedBases} ${plural(timeBlockedBases)} fell outside the as-of time slice`);
  }
  if (undatedBlockedBases > 0) {
    reasons.push(`${undatedBlockedBases} ${plural(undatedBlockedBases)} ${undatedBlockedBases === 1 ? 'was' : 'were'} undated and excluded by the as-of filter`);
  }

  if (!reasons.length) return headline;

  const reasonText = reasons.length === 1
    ? reasons[0]
    : `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;

  return `${headline} ${reasonText}.`;
}
