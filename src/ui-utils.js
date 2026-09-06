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

function citationKey(value) {
  const key = String(value ?? 'clifford-number')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  return key || 'clifford-number';
}

/** Format a stable citation for a client-side route. Receipt labels and URLs are
 * carried through as supporting sources; no new factual prose is invented. */
export function formatCitation({ title, url, accessed, receipts = [] }, format = 'plain') {
  const safeTitle = String(title || 'The Clifford Number').trim();
  const safeUrl = String(url || '').trim();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(accessed || ''))
    ? String(accessed)
    : new Date().toISOString().slice(0, 10);
  const safeReceipts = receipts.map(receipt => ({
    id: String(receipt?.id || receipt?.receipt_id || '').trim(),
    label: String(receipt?.label || receipt?.id || receipt?.receipt_id || '').trim(),
    url: String(receipt?.url || '').trim() || null,
    archive_url: String(receipt?.archive_url || '').trim() || null
  })).filter(receipt => receipt.id || receipt.label);
  const sourceText = safeReceipts.length
    ? ` Supporting receipts: ${safeReceipts.map(receipt => receipt.url ? `${receipt.label} (${receipt.url})` : receipt.label).join('; ')}.`
    : '';

  if (format === 'markdown') {
    const sources = safeReceipts.length
      ? `\n\nSupporting receipts:\n${safeReceipts.map(receipt => `- ${receipt.url ? `[${receipt.label}](${receipt.url})` : receipt.label}`).join('\n')}`
      : '';
    return `The Clifford Number. “${safeTitle}.” Accessed ${safeDate}. [${safeUrl}](${safeUrl}).${sources}`;
  }
  if (format === 'bibtex') {
    const year = safeDate.slice(0, 4);
    const key = `${citationKey(safeTitle).slice(0, 36)}-${year}`;
    const escapedTitle = safeTitle.replace(/[{}]/g, '');
    return `@misc{${key},\n  author = {{The Clifford Number}},\n  title = {${escapedTitle}},\n  year = {${year}},\n  url = {${safeUrl}},\n  note = {Accessed ${safeDate}; ${safeReceipts.length} supporting receipt${safeReceipts.length === 1 ? '' : 's'}}\n}`;
  }
  if (format === 'json') {
    return JSON.stringify({
      type: 'webpage',
      publisher: 'The Clifford Number',
      title: safeTitle,
      url: safeUrl,
      accessed: safeDate,
      receipts: safeReceipts
    }, null, 2);
  }
  return `The Clifford Number. “${safeTitle}.” Accessed ${safeDate}. ${safeUrl}.${sourceText}`;
}

// Presentation-only partition of participation records, not a person count.
// Keep input order, duplicates, dates and evidence intact. The remainder must
// remain reachable in the same view; display budgeting never filters evidence.
export function partitionParticipantRows(rows, limit = 18) {
  if (!Array.isArray(rows)) throw new TypeError('participant rows must be an array');
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError('participant preview limit must be a nonnegative safe integer');
  }
  return {
    preview: rows.slice(0, limit),
    remaining: rows.slice(limit),
    total: rows.length,
  };
}
