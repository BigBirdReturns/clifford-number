import assert from 'node:assert/strict';

export const PDF_RENDERER_ID = 'deterministic-courier-text-pdf@1';
export const DEFAULT_PDF_LAYOUT = Object.freeze({
  page_width_points: 595,
  page_height_points: 842,
  margin_left_points: 72,
  margin_top_points: 72,
  font: 'Courier',
  font_size_points: 9.5,
  line_height_points: 12,
  max_characters_per_line: 79,
  lines_per_page: 57,
});

const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function codePoints(value) {
  return [...value];
}

function splitCodePoints(value, width) {
  const points = codePoints(value);
  const chunks = [];
  for (let index = 0; index < points.length; index += width) {
    chunks.push(points.slice(index, index + width).join(''));
  }
  return chunks;
}

function linePrefix(line) {
  const match = line.match(/^(\s*(?:(?:\d+\.|[-*])\s+)?)/u);
  return match?.[1] ?? '';
}

function wrapLine(rawLine, maxCharacters) {
  const line = rawLine.replaceAll('\t', '    ').replace(/[ \t]+$/u, '');
  if (codePoints(line).length <= maxCharacters) return [line];

  const prefix = linePrefix(line);
  const continuationPrefix = ' '.repeat(codePoints(prefix).length);
  const body = line.slice(prefix.length).trim();
  if (!body) return [line.slice(0, maxCharacters)];

  const words = body.split(/\s+/u);
  const lines = [];
  let current = prefix;
  let activePrefix = prefix;

  function flush() {
    lines.push(current.trimEnd());
    activePrefix = continuationPrefix;
    current = activePrefix;
  }

  for (const word of words) {
    const available = maxCharacters - codePoints(activePrefix).length;
    if (codePoints(word).length > available) {
      if (codePoints(current).length > codePoints(activePrefix).length) flush();
      const chunks = splitCodePoints(word, Math.max(1, available));
      for (const chunk of chunks.slice(0, -1)) {
        lines.push(`${activePrefix}${chunk}`);
        activePrefix = continuationPrefix;
      }
      current = `${activePrefix}${chunks.at(-1)}`;
      continue;
    }

    const separator = current === activePrefix ? '' : ' ';
    const candidate = `${current}${separator}${word}`;
    if (codePoints(candidate).length <= maxCharacters) {
      current = candidate;
    } else {
      flush();
      current = `${activePrefix}${word}`;
    }
  }

  if (codePoints(current).length > codePoints(activePrefix).length || lines.length === 0) lines.push(current.trimEnd());
  return lines;
}

export function layoutTextLines(text, layout = DEFAULT_PDF_LAYOUT) {
  assert.equal(typeof text, 'string', 'PDF source text must be a string');
  assert.equal(text.includes('\0'), false, 'PDF source text must not contain NUL bytes');
  assert.ok(Number.isInteger(layout.max_characters_per_line) && layout.max_characters_per_line >= 40,
    'max_characters_per_line must be an integer of at least 40');
  assert.ok(Number.isInteger(layout.lines_per_page) && layout.lines_per_page >= 20,
    'lines_per_page must be an integer of at least 20');

  const normalized = text.replace(/\r\n?/gu, '\n').replace(/\n+$/u, '');
  const rawLines = normalized.split('\n');
  const lines = rawLines.flatMap((line) => wrapLine(line, layout.max_characters_per_line));
  if (lines.length === 0) lines.push('');
  const pages = [];
  for (let index = 0; index < lines.length; index += layout.lines_per_page) {
    pages.push(lines.slice(index, index + layout.lines_per_page));
  }
  return { rawLines, lines, pages };
}

export function encodeWinAnsi(value) {
  const bytes = [];
  for (const character of codePoints(value)) {
    const codePoint = character.codePointAt(0);
    if (codePoint === 0x09) {
      bytes.push(0x20, 0x20, 0x20, 0x20);
    } else if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) {
      bytes.push(codePoint);
    } else if (CP1252.has(codePoint)) {
      bytes.push(CP1252.get(codePoint));
    } else {
      throw new Error(`unsupported character for deterministic WinAnsi PDF: U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }
  return Buffer.from(bytes);
}

function escapePdfLiteral(value) {
  const bytes = encodeWinAnsi(value);
  let escaped = '';
  for (const byte of bytes) {
    if (byte === 0x28) escaped += '\\(';
    else if (byte === 0x29) escaped += '\\)';
    else if (byte === 0x5c) escaped += '\\\\';
    else if (byte >= 0x20 && byte <= 0x7e) escaped += String.fromCharCode(byte);
    else escaped += `\\${byte.toString(8).padStart(3, '0')}`;
  }
  return escaped;
}

function contentStream(lines, layout) {
  const originY = layout.page_height_points - layout.margin_top_points;
  const commands = [
    'BT',
    `/F1 ${layout.font_size_points} Tf`,
    `${layout.line_height_points} TL`,
    `${layout.margin_left_points} ${originY} Td`,
  ];
  for (const line of lines) {
    commands.push(`(${escapePdfLiteral(line)}) Tj`, 'T*');
  }
  commands.push('ET', '');
  return Buffer.from(commands.join('\n'), 'latin1');
}

function indirectObject(number, body) {
  const prefix = Buffer.from(`${number} 0 obj\n`, 'ascii');
  const suffix = Buffer.from('\nendobj\n', 'ascii');
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'ascii');
  return Buffer.concat([prefix, buffer, suffix]);
}

function streamObject(stream) {
  return Buffer.concat([
    Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'ascii'),
    stream,
    Buffer.from('endstream', 'ascii'),
  ]);
}

export function renderTextPdf(text, options = {}) {
  const layout = { ...DEFAULT_PDF_LAYOUT, ...(options.layout ?? {}) };
  assert.equal(layout.font, 'Courier', 'deterministic renderer supports Courier only');
  const laidOut = layoutTextLines(text, layout);
  const pageObjectNumbers = laidOut.pages.map((_, index) => 4 + index * 2);
  const objectCount = 3 + laidOut.pages.length * 2;
  const objects = new Map();

  objects.set(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'));
  objects.set(2, Buffer.from(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${laidOut.pages.length} >>`,
    'ascii',
  ));
  objects.set(3, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>', 'ascii'));

  laidOut.pages.forEach((pageLines, index) => {
    const pageNumber = pageObjectNumbers[index];
    const contentNumber = pageNumber + 1;
    objects.set(pageNumber, Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${layout.page_width_points} ${layout.page_height_points}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>`,
      'ascii',
    ));
    objects.set(contentNumber, streamObject(contentStream(pageLines, layout)));
  });

  const chunks = [Buffer.from('%PDF-1.4\n%\xD3\xEB\xE9\xE1\n', 'latin1')];
  const offsets = Array(objectCount + 1).fill(0);
  let length = chunks[0].length;
  for (let number = 1; number <= objectCount; number += 1) {
    offsets[number] = length;
    const object = indirectObject(number, objects.get(number));
    chunks.push(object);
    length += object.length;
  }

  const xrefOffset = length;
  const xrefLines = [`xref`, `0 ${objectCount + 1}`, '0000000000 65535 f '];
  for (let number = 1; number <= objectCount; number += 1) {
    xrefLines.push(`${String(offsets[number]).padStart(10, '0')} 00000 n `);
  }
  xrefLines.push(
    'trailer',
    `<< /Size ${objectCount + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
    '',
  );
  chunks.push(Buffer.from(xrefLines.join('\n'), 'ascii'));
  const bytes = Buffer.concat(chunks);

  return {
    bytes,
    pageCount: laidOut.pages.length,
    sourceLineCount: laidOut.rawLines.length,
    renderedLineCount: laidOut.lines.length,
    layout,
    renderer: PDF_RENDERER_ID,
  };
}
