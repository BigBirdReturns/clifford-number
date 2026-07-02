// Temporal windows for surfaces, participations, and hops.
//
// Field vocabulary follows the AXM temporal@1 extension (axm-core
// EXTENSIONS_REGISTRY.md): valid_from / valid_until, ISO 8601 date strings,
// null for an open end ("always" on the from side, "ongoing / until
// superseded" on the until side).
//
// Ledger dates arrive at year ("2016"), month ("2019-12"), or day
// ("2019-12-15") precision. A window's valid_from is the first day of its
// start period and valid_until the last day of its end period, so year- and
// month-precision rows behave as the full period they name.

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function periodStart(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (YEAR_RE.test(v)) return `${v}-01-01`;
  if (MONTH_RE.test(v)) return `${v}-01`;
  if (DAY_RE.test(v)) return v;
  throw new Error(`unparseable temporal value: ${JSON.stringify(value)}`);
}

export function periodEnd(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (YEAR_RE.test(v)) return `${v}-12-31`;
  if (MONTH_RE.test(v)) {
    const [y, m] = v.split('-').map(Number);
    return `${v}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`;
  }
  if (DAY_RE.test(v)) return v;
  throw new Error(`unparseable temporal value: ${JSON.stringify(value)}`);
}

// A window from a ledger row's time_start/time_end. `dated` records whether
// the row carried any temporal claim at all: an undated row is "we do not
// know when", which is different from "unbounded".
export function windowOf(row) {
  const start = row?.time_start ?? null;
  const end = row?.time_end ?? null;
  return {
    valid_from: periodStart(start),
    valid_until: periodEnd(end),
    dated: Boolean(start || end),
  };
}

export const UNBOUNDED = Object.freeze({ valid_from: null, valid_until: null, dated: false });

// Intersection treating null as -inf / +inf. Returns null when empty.
// ISO date strings compare correctly as strings.
export function intersect(a, b) {
  const from = a.valid_from === null ? b.valid_from
    : b.valid_from === null ? a.valid_from
    : (a.valid_from > b.valid_from ? a.valid_from : b.valid_from);
  const until = a.valid_until === null ? b.valid_until
    : b.valid_until === null ? a.valid_until
    : (a.valid_until < b.valid_until ? a.valid_until : b.valid_until);
  if (from !== null && until !== null && from > until) return null;
  return { valid_from: from, valid_until: until, dated: a.dated || b.dated };
}

export function intersectAll(windows) {
  let acc = UNBOUNDED;
  for (const w of windows) {
    acc = intersect(acc, w);
    if (acc === null) return null;
  }
  return acc;
}

// Does a window overlap a query period ("2020", "2020-03", "2020-03-14")?
// The period is widened to its full extent, so asOf "2020" means
// "at any point during 2020".
export function overlapsPeriod(window, period) {
  const q = { valid_from: periodStart(period), valid_until: periodEnd(period), dated: true };
  if (q.valid_from === null && q.valid_until === null) return true;
  return intersect(window, q) !== null;
}

export function formatWindow(window) {
  if (!window) return 'no overlap';
  const from = window.valid_from ?? '…';
  const until = window.valid_until ?? 'ongoing';
  return `${from} → ${until}`;
}
