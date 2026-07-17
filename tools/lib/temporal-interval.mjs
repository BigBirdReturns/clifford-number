const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function strictDate(value) {
  if (typeof value !== 'string') return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day) return null;
  return parsed.getTime();
}

function parseInterval(interval) {
  if (!interval) return null;
  const from = interval.valid_from ? strictDate(interval.valid_from) : null;
  const until = interval.valid_until ? strictDate(interval.valid_until) : null;
  const invalid_from = Boolean(interval.valid_from) && from === null;
  const invalid_until = Boolean(interval.valid_until) && until === null;
  return { from, until, invalid: invalid_from || invalid_until };
}

export function temporalRelation(a, b) {
  const ia = parseInterval(a);
  const ib = parseInterval(b);
  if (!ia || !ib || ia.invalid || ib.invalid) return 'temporally_unknown';
  if ((ia.from !== null && ia.until !== null && ia.from > ia.until)
    || (ib.from !== null && ib.until !== null && ib.from > ib.until)) return 'temporally_unknown';
  const aOpen = ia.from === null && ia.until === null;
  const bOpen = ib.from === null && ib.until === null;
  if (aOpen || bOpen) return 'temporally_unknown';
  const aStart = ia.from ?? -Infinity;
  const aEnd = ia.until ?? Infinity;
  const bStart = ib.from ?? -Infinity;
  const bEnd = ib.until ?? Infinity;
  if (aEnd < bStart || bEnd < aStart) return 'non_overlapping';
  if (ia.until === null || ib.until === null || ia.from === null || ib.from === null) return 'possibly_overlapping';
  return 'overlapping';
}
