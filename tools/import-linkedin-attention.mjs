#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const inputArg = value('input');
if (!inputArg) {
  console.error('Usage: node tools/import-linkedin-attention.mjs --input <extracted LinkedIn archive directory> [--since YYYY-MM-DD] [--output path]');
  process.exit(1);
}
const input = path.resolve(inputArg);
if (!fs.existsSync(input) || !fs.statSync(input).isDirectory()) {
  throw new Error(`--input must be an extracted LinkedIn archive directory: ${input}`);
}

const asOf = parseDay(value('as-of', new Date().toISOString().slice(0, 10)), '--as-of');
const defaultSince = new Date(Date.UTC(asOf.getUTCFullYear() - 2, asOf.getUTCMonth(), asOf.getUTCDate()));
const since = parseDay(value('since', defaultSince.toISOString().slice(0, 10)), '--since');
if (since > asOf) throw new Error('--since must be on or before --as-of');

const outputArg = value('output', 'data/local/linkedin-attention.jsonl');
const output = path.isAbsolute(outputArg) ? outputArg : path.join(root, outputArg);
const importedAt = new Date().toISOString();

const categoryRules = [
  { category: 'reactions', file: /^reactions?$/, urls: ['link', 'url', 'posturl'], dates: ['date', 'time', 'createdat'], details: ['type', 'reactiontype'] },
  { category: 'saved_items', file: /^saveditems?$/, urls: ['url', 'link', 'posturl', 'saveditem'], dates: ['saveddate', 'createdtime', 'date', 'time'], details: ['title', 'type'] },
  { category: 'comments', file: /^comments?$/, urls: ['link', 'url', 'posturl'], dates: ['date', 'time', 'createdat'], details: ['message', 'comment', 'content'] },
  { category: 'shares', file: /^shares?$/, urls: ['sharelink', 'sharedurl', 'link', 'url', 'posturl'], dates: ['date', 'time', 'createdat'], details: ['sharecommentary', 'commentary', 'content', 'text'] },
  { category: 'instant_reposts', file: /^instantreposts?$/, urls: ['link', 'url', 'posturl'], dates: ['date', 'time', 'repostdate'], details: [] },
  { category: 'search_queries', file: /^searchquer(?:y|ies)$/, urls: [], dates: ['date', 'time', 'searchdate'], details: ['searchquery', 'query'] },
  { category: 'member_follows', file: /^memberfollows?$/, urls: ['url', 'profileurl', 'link'], dates: ['followdate', 'date', 'time'], details: ['fullname', 'firstname', 'lastname', 'name'] },
  { category: 'company_follows', file: /^companyfollows?$/, urls: ['url', 'companyurl', 'link'], dates: ['followedon', 'followdate', 'date', 'time'], details: ['organization', 'companyname', 'organizationname', 'name'] },
  { category: 'votes', file: /^votes?$/, urls: ['url', 'link', 'pollurl'], dates: ['votingdate', 'date', 'time'], details: ['optiontext', 'votingselection', 'selection'] },
];

const csvFiles = walk(input).filter(file => path.extname(file).toLowerCase() === '.csv');
const observations = [];
const stats = { csv_files_seen: csvFiles.length, matched_files: 0, rows_seen: 0, outside_window: 0, undated: 0, duplicate: 0 };
const seen = new Set();

for (const file of csvFiles) {
  const normalizedName = normalize(path.basename(file, path.extname(file)));
  const rule = categoryRules.find(candidate => candidate.file.test(normalizedName));
  if (!rule) continue;
  stats.matched_files += 1;
  const bytes = fs.readFileSync(file);
  const sourceSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const rows = parseCsv(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (rows.length < 2) continue;
  const headers = rows[0].map(normalize);

  for (let index = 1; index < rows.length; index += 1) {
    const fields = rows[index];
    if (!fields.some(field => clean(field))) continue;
    stats.rows_seen += 1;
    const get = names => {
      for (const name of names) {
        const column = headers.indexOf(name);
        if (column >= 0 && clean(fields[column])) return clean(fields[column]);
      }
      return null;
    };
    const rawDate = get(rule.dates);
    const observed = parseLinkedInDate(rawDate);
    if (!observed) {
      stats.undated += 1;
      continue;
    }
    if (observed < since || observed >= addUtcDays(asOf, 1)) {
      stats.outside_window += 1;
      continue;
    }

    const url = get(rule.urls);
    const details = rule.details.map(name => {
      const column = headers.indexOf(name);
      return column >= 0 ? clean(fields[column]) : null;
    }).filter(Boolean);
    const activitySummary = details.join(' ').slice(0, 500) || null;
    const core = {
      category: rule.category,
      observed_at: observed.toISOString(),
      url,
      activity_summary: activitySummary,
    };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
    if (seen.has(fingerprint)) {
      stats.duplicate += 1;
      continue;
    }
    seen.add(fingerprint);
    observations.push({
      schema_version: 'linkedin-attention@1',
      attention_id: `liattn_${fingerprint.slice(0, 24)}`,
      source_platform: 'linkedin',
      source_class: 'member_data_export',
      attention_mode: 'retrospective_archive',
      category: rule.category,
      observed_at: observed.toISOString(),
      url,
      activity_summary: activitySummary,
      provenance: {
        archive_file: path.relative(input, file).replaceAll(path.sep, '/'),
        archive_row: index + 1,
        source_sha256: sourceSha256,
        imported_at: importedAt,
      },
      publication_status: 'private_intake',
      evidence_state: 'observed',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    });
  }
}

observations.sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.attention_id.localeCompare(b.attention_id));
fs.mkdirSync(path.dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
fs.writeFileSync(temporary, observations.map(row => JSON.stringify(row)).join('\n') + (observations.length ? '\n' : ''));
fs.renameSync(temporary, output);

console.log(`LinkedIn retrospective intake: ${observations.length} observation(s)`);
console.log(`  window: ${since.toISOString().slice(0, 10)} through ${asOf.toISOString().slice(0, 10)}`);
console.log(`  matched ${stats.matched_files} of ${stats.csv_files_seen} CSV file(s); ${stats.rows_seen} row(s) inspected`);
console.log(`  skipped: ${stats.outside_window} outside window, ${stats.undated} undated, ${stats.duplicate} duplicate`);
console.log(`  private output: ${path.relative(root, output) || output}`);

function clean(inputValue) {
  return String(inputValue ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(inputValue) {
  return clean(inputValue).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseDay(inputValue, flag) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inputValue ?? '')) throw new Error(`${flag} must use YYYY-MM-DD`);
  const parsed = new Date(`${inputValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`${flag} is not a valid date`);
  return parsed;
}

function parseLinkedInDate(inputValue) {
  if (!inputValue) return null;
  const normalized = inputValue.replace(/\bUTC\b/i, 'Z').trim();
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.valueOf())) return parsed;
  const dayFirst = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(.*))?$/);
  if (!dayFirst) return null;
  const [, month, day, year, time = '00:00:00'] = dayFirst;
  const fallback = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time.replace(' ', 'T')}Z`);
  return Number.isNaN(fallback.valueOf()) ? null : fallback;
}

function addUtcDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && field.endsWith('\\')) {
        // LinkedIn escapes quotes in long comment bodies as \" rather than
        // RFC 4180's doubled quote. Keep the quote as content and drop the
        // transport backslash so it cannot terminate the multiline record.
        field = `${field.slice(0, -1)}"`;
      } else if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        // LinkedIn's Comments.csv can contain bare quotes inside a quoted,
        // multiline message. Only a quote at the field boundary closes it.
        const next = text[index + 1];
        if (next === ',' || next === '\n' || next === '\r' || next === undefined) quoted = false;
        else field += character;
      } else {
        field += character;
      }
    } else if (character === '"') {
      // A quote starts a quoted CSV field only at the field boundary. LinkedIn
      // comment exports can contain a literal quote inside an unquoted message;
      // treating that as a delimiter merges many subsequent records.
      if (field === '') quoted = true;
      else field += character;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}
