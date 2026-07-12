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

export function periodStart(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-01-01`;
  if (precision === 'month') return `${v}-01`;
  return v;
}

export function periodEnd(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision, year, month } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-12-31`;
  if (precision === 'month') {
    return `${v}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`;
  }
  return v;
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
  if (window.dated === false) return 'date unknown';
  const from = window.valid_from ?? '…';
  const until = window.valid_until ?? 'ongoing';
  return `${from} → ${until}`;
}
