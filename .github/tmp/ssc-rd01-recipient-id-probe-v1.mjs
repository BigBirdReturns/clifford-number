import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = 'rd01-recipient-id-probe-v2';
const names = ['Anduril', 'Saronic Technologies', 'Sierra Space', 'Shield AI', 'Anthropic'];
const awardGroups = {
  contracts: ['A','B','C','D'],
  idvs: ['IDV_A','IDV_B','IDV_B_A','IDV_B_B','IDV_B_C','IDV_C','IDV_D','IDV_E'],
  loans: ['07','08','F003','F004'],
  grants: ['02','03','04','05','F001','F002'],
  other_financial_assistance: ['06','10','F006','F007'],
  direct_payments: ['09','11','-1','F005','F008','F009','F010']
};
const fields = ['Recipient Name','Recipient UEI','recipient_id','Recipient Location','Award ID','generated_internal_id'];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const safe = (s) => s.replace(/[^A-Za-z0-9._-]+/g, '_');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const receipts = [];
for (const name of names) {
  for (const [group, awardTypeCodes] of Object.entries(awardGroups)) {
    const dir = path.join(OUT, safe(name), group);
    fs.mkdirSync(dir, { recursive: true });
    const body = Buffer.from(JSON.stringify({
      subawards: false,
      limit: 25,
      page: 1,
      filters: { award_type_codes: awardTypeCodes, recipient_search_text: [name] },
      fields
    }));
    fs.writeFileSync(path.join(dir, 'request.json'), body);
    const started = new Date().toISOString();
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'BigBirdReturns-clifford-number RD-01 recipient identifier probe (https://github.com/BigBirdReturns/clifford-number)'
      },
      body,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
    const responseBody = Buffer.from(await response.arrayBuffer());
    const headers = Buffer.from([...response.headers.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}: ${v}`).join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'body.bin'), responseBody);
    fs.writeFileSync(path.join(dir, 'headers.txt'), headers);
    let parsed = null;
    try { parsed = JSON.parse(responseBody.toString('utf8')); } catch {}
    const receipt = {
      name,
      award_group: group,
      award_type_codes: awardTypeCodes,
      started_at: started,
      requested_url: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      request_sha256: sha256(body),
      http_status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type'),
      response_body_bytes: responseBody.length,
      response_body_sha256: sha256(responseBody),
      response_headers_sha256: sha256(headers),
      parsed_json: parsed !== null,
      result_count: Array.isArray(parsed?.results) ? parsed.results.length : null,
      sample_results: Array.isArray(parsed?.results) ? parsed.results.slice(0, 10) : null,
      page_metadata: parsed?.page_metadata ?? null,
      messages: parsed?.messages ?? null,
      validation_payload: Array.isArray(parsed?.results) ? null : parsed
    };
    fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    receipts.push(receipt);
    console.log(JSON.stringify({ name, group, status: response.status, results: receipt.result_count }));
  }
}
const sampleResults = receipts.flatMap((x) => x.sample_results ?? []);
const summary = {
  schema_version: 'ssc-rd01-recipient-id-probe@2',
  routes: receipts.length,
  names,
  award_groups: awardGroups,
  requested_fields: fields,
  http_successes: receipts.filter((x) => x.http_status >= 200 && x.http_status < 300).length,
  parsed_json_responses: receipts.filter((x) => x.parsed_json).length,
  responses_with_results: receipts.filter((x) => (x.result_count ?? 0) > 0).length,
  results_sampled: sampleResults.length,
  results_with_recipient_uei: sampleResults.filter((r) => r['Recipient UEI']).length,
  results_with_recipient_id: sampleResults.filter((r) => r.recipient_id).length,
  distinct_validation_payloads: [...new Set(receipts.map((x) => JSON.stringify(x.validation_payload)).filter((x) => x !== 'null'))].length,
  external_contacts: 0,
  external_reviews: 0,
  outside_human_dependency: false,
  graph_effect: 'none'
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const files = [];
for (const entry of fs.readdirSync(OUT, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const full = path.join(entry.parentPath ?? entry.path, entry.name);
  if (full.endsWith(`${path.sep}manifest.json`)) continue;
  const bytes = fs.readFileSync(full);
  files.push({ path: path.relative(OUT, full).replaceAll('\\','/'), bytes: bytes.length, sha256: sha256(bytes) });
}
files.sort((a,b) => a.path.localeCompare(b.path));
const combined_sha256 = sha256(Buffer.from(files.map((f) => `${f.sha256}  ${f.path}\n`).join('')));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ schema_version: 'ssc-rd01-recipient-id-probe-manifest@2', entries: files.length, combined_sha256, files }, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, manifest_entries: files.length, manifest_combined_sha256: combined_sha256 }, null, 2));
