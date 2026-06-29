#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [input, output = 'data/import-queues/master-v3.import-queue.json'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run import:master:v3 -- <master.md> [output.json]');
  process.exit(1);
}

const EVIDENCE_MAP = { official: 'confirmed', confirmed: 'confirmed', primary_public: 'primary_public', primary: 'primary_public', reported: 'reported', derived: 'derived', judgment: 'judgment', open: 'open' };
const STATUS_MAP = { listed: 'listed', registered: 'registered', attended: 'attended', appointed: 'appointed', contracted: 'contracted', reported: 'reported', published: 'published', derived: 'derived', 'public-role': 'public-role', public_role: 'public-role' };
const BANNED = [/\bemail\b/i, /\bphone\b/i, /\bbirthdate\b/i, /\bmobile\b/i, /\bemergency\b/i, /\bdietary\b/i, /sex life/i, /\bmatchmaking\b/i, /looking for love/i, /political leaning/i, /home city/i, /\baddress\b/i, /\btoken\b/i, /assistant email/i];
const text = fs.readFileSync(input, 'utf8');
const rows = extractRows(text);
const queue = { generated: new Date().toISOString(), input: path.resolve(input), ready: [], review: [], verify: [], hold: [], reject: [] };
for (const row of rows) {
  const serialized = JSON.stringify(row);
  if (BANNED.some((pattern) => pattern.test(serialized))) { queue.reject.push({ row, reason: 'private-field-guard' }); continue; }
  const evidence = normalize(row.evidence, EVIDENCE_MAP);
  const status = normalize(row.status, STATUS_MAP);
  const item = { ...row, evidence_class: evidence, status };
  if (!evidence || !status || evidence === 'open') queue.hold.push({ item, reason: 'open-or-unmapped' });
  else if (['confirmed', 'primary_public'].includes(evidence) && ['published', 'appointed', 'contracted', 'listed', 'public-role', 'reported'].includes(status)) queue.ready.push(item);
  else if (evidence === 'reported') queue.review.push(item);
  else if (['derived', 'judgment'].includes(evidence)) queue.verify.push(item);
  else queue.hold.push({ item, reason: 'needs-human-review' });
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Wrote ${output}: ${queue.ready.length} ready, ${queue.review.length} review, ${queue.verify.length} verify, ${queue.hold.length} hold, ${queue.reject.length} reject.`);

function extractRows(markdown) {
  return markdown.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line)).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim())).filter((cells) => cells.length >= 4).map((cells) => ({ raw: cells.join(' | '), subject: cells[0], predicate: cells[1], object: cells[2], evidence: cells[3], status: cells[4] ?? 'reported', source: cells[5] ?? '' }));
}
function normalize(value, map) {
  return map[String(value ?? '').trim().toLowerCase().replaceAll(' ', '_')] ?? null;
}
