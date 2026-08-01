#!/usr/bin/env bash
set -euo pipefail

runner='tools/run-wave27-public-interest-downstream-materializer.sh'
self='tools/run-wave27-public-interest-downstream-materializer-v2.sh'

test -f "$runner"
python3 - <<'PY'
from pathlib import Path
import re

path = Path('tools/run-wave27-public-interest-downstream-materializer.sh')
text = path.read_text()
pattern = re.compile(r"function insertIntoNamedExactArray\(text, basinId, values\) \{.*?\n\}\n\nconst wave27PolicyPath", re.S)
replacement = r'''function insertIntoNamedExactArray(text, basinId, values) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.includes("['" + basinId + "', ["));
  if (start < 0) throw new Error(basinId + ': exact basin array start absent');
  const inlineClose = lines[start].lastIndexOf(']]');
  if (inlineClose > lines[start].indexOf("['" + basinId + "', [")) {
    const missing = values.filter(value => !lines[start].includes("'" + value + "'"));
    if (!missing.length) return text;
    const prefix = lines[start].slice(0, inlineClose);
    const suffix = lines[start].slice(inlineClose);
    const separator = prefix.trim().endsWith('[') ? '' : ', ';
    lines[start] = prefix + separator + missing.map(value => "'" + value + "'").join(', ') + suffix;
    return lines.join('\n');
  }
  let end = start + 1;
  while (end < lines.length && !/^\s*\]\],?\s*$/.test(lines[end])) end += 1;
  if (end >= lines.length) throw new Error(basinId + ': exact basin array end absent');
  const existing = new Set();
  for (let i = start + 1; i < end; i += 1) {
    const match = lines[i].match(/['"]([^'"]+)['"]/);
    if (match) existing.add(match[1]);
  }
  const missing = values.filter(value => !existing.has(value));
  if (!missing.length) return text;
  let last = end - 1;
  while (last > start && !lines[last].trim()) last -= 1;
  if (!lines[last].trim().endsWith(',')) lines[last] += ',';
  const indent = (lines[last].match(/^\s*/) || ['      '])[0];
  lines.splice(end, 0, ...missing.map((value, index) => indent + "'" + value + "'" + (index === missing.length - 1 ? '' : ',')));
  return lines.join('\n');
}

const wave27PolicyPath'''
updated, count = pattern.subn(replacement, text)
if count != 1:
    raise SystemExit(f'expected one named-array helper replacement, found {count}')
path.write_text(updated)
PY
rm -f "$self"
exec bash "$runner"
