import assert from 'node:assert/strict';
import { decodeHashPart, formatCitation, safeExternalUrl, safeLocalReceiptPath, validAsOf } from '../src/ui-utils.js';
import { normalizeLocale, translate } from '../src/i18n.js';

assert.equal(safeExternalUrl('https://example.com/source'), 'https://example.com/source');
assert.equal(safeExternalUrl('http://example.com/source'), 'http://example.com/source');
for (const unsafe of ['javascript:alert(1)', 'data:text/html,boom', 'file:///etc/passwd', '//example.com/path', 'not a url']) {
  assert.equal(safeExternalUrl(unsafe), null, `${unsafe} must not become a link`);
}

assert.equal(safeLocalReceiptPath('docs/methodology.md'), 'docs/methodology.md');
assert.equal(safeLocalReceiptPath('receipts/dialog-human-layer.md'), 'receipts/dialog-human-layer.md');
for (const unsafe of ['../secret.txt', 'assets/file.svg', 'docs/../../secret', 'javascript:alert(1)', '/docs/file.md']) {
  assert.equal(safeLocalReceiptPath(unsafe), null, `${unsafe} must not become a local receipt link`);
}

for (const valid of ['2020', '2020-02', '2020-02-29', '2000-02-29', '2025-12-31']) assert.equal(validAsOf(valid), true, valid);
for (const invalid of ['2020-00', '2020-13', '2020-02-30', '1900-02-29', '2025-04-31', '20', '2020-1', 'nope']) assert.equal(validAsOf(invalid), false, invalid);

assert.equal(decodeHashPart('ben-warner'), 'ben-warner');
assert.equal(decodeHashPart('Dr%20Fiona%20Hill'), 'Dr Fiona Hill');
assert.equal(decodeHashPart('%E0%A4%A'), null);

const citation = {
  title: 'Ben Warner — public topology',
  url: 'https://example.test/#actor/ben-warner',
  accessed: '2026-07-12',
  receipts: [{ id: 'official-role', label: 'Official role biography', url: 'https://example.test/receipt' }]
};
assert.match(formatCitation(citation, 'plain'), /Supporting receipts: Official role biography/);
assert.match(formatCitation(citation, 'markdown'), /\[Official role biography\]\(https:\/\/example\.test\/receipt\)/);
assert.match(formatCitation(citation, 'bibtex'), /^@misc\{/);
assert.deepEqual(JSON.parse(formatCitation(citation, 'json')).receipts[0].id, 'official-role');

assert.equal(normalizeLocale('es-MX'), 'es');
assert.equal(normalizeLocale('de'), 'en');
assert.equal(translate('fr', 'themeDark'), 'Sombre');
assert.equal(translate('es', 'browseShowing', { count: 12 }), 'Índice: se muestran 12 registros públicos.');

console.log('ui-utils.test.js: OK');
