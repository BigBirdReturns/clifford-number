/** Pure browser-facing validation helpers. Kept DOM-free so the release suite
 * can exercise URL and date safety without a browser dependency. */

export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

export function safeLocalReceiptPath(value) {
  const path = String(value ?? '').trim().replace(/\\/g, '/');
  return /^(docs|receipts)\/[a-z0-9][a-z0-9._() /-]*$/i.test(path) && !path.includes('..') ? path : null;
}

export function validAsOf(value) {
  const text = String(value ?? '').trim();
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (year < 1000 || year > 9999) return false;
  if (month !== null && (month < 1 || month > 12)) return false;
  if (day === null) return true;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= lastDay;
}

export function decodeHashPart(value) {
  if (value === undefined) return undefined;
  try { return decodeURIComponent(value); } catch { return null; }
}
