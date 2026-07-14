import fs from 'node:fs';
import readline from 'node:readline';

export function parseCsvRecord(record) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < record.length; index += 1) {
    const char = record[index];
    if (char === '"') {
      if (quoted && record[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('unterminated quoted CSV field');
  fields.push(field.replace(/\r$/, ''));
  return fields;
}

export async function* readCsvObjects(file) {
  const lines = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let header = null;
  let logical = '';
  let quoteCount = 0;
  let physicalLine = 0;
  let recordNumber = 0;
  for await (const line of lines) {
    physicalLine += 1;
    logical += logical ? `\n${line}` : line;
    quoteCount += (line.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 1) continue;
    const fields = parseCsvRecord(logical);
    logical = '';
    quoteCount = 0;
    if (!header) {
      header = fields.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, '') : value);
      continue;
    }
    recordNumber += 1;
    const row = Object.fromEntries(header.map((key, index) => [key, fields[index] ?? '']));
    yield { row, record_number: recordNumber, physical_line_end: physicalLine };
  }
  if (logical) throw new Error(`unterminated CSV record at physical line ${physicalLine}`);
}
