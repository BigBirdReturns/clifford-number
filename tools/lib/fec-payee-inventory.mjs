import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { once } from 'node:events';

export const PAYEE_NORMALIZATION_VERSION = 'fec-payee-candidate-normalization@1';
const EXAMPLE_SOURCE_ID_LIMIT = 20;
const ADDRESS_FIELDS = [
  'payee_address_as_reported',
  'payee_street_1_as_reported',
  'payee_street_2_as_reported',
  'payee_city_as_reported',
  'payee_state_as_reported',
  'payee_zip_as_reported',
  'street_address_as_reported',
  'address_as_reported',
  'city_as_reported',
  'state_as_reported',
  'zip_code_as_reported',
];

const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonLine = value => `${JSON.stringify(value)}\n`;
const portable = value => value.replaceAll('\\', '/');

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableObject(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableObject(value));
}

function normalizeTokenString(value) {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replaceAll('&', ' AND ')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePayeeName(value) {
  const raw = text(value);
  return raw ? normalizeTokenString(raw) : null;
}

export function classifyPayeeName(value) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return { disposition: 'blank_payee_name', normalized_name: null };
  }
  if (typeof value !== 'string' || value.length > 512 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    return { disposition: 'malformed_payee_name', normalized_name: null };
  }
  const normalizedName = normalizePayeeName(value);
  if (!normalizedName || !/[\p{L}\p{N}]/u.test(normalizedName)) {
    return { disposition: 'malformed_payee_name', normalized_name: normalizedName };
  }
  if (new Set(['N A', 'NA', 'NONE', 'UNKNOWN', 'NOT PROVIDED', 'PAYEE NOT PROVIDED']).has(normalizedName)) {
    return { disposition: 'placeholder_payee_name', normalized_name: normalizedName };
  }
  return { disposition: 'candidate_eligible', normalized_name: normalizedName };
}

export function extractPayeeAddress(record) {
  const fieldsAsReported = {};
  for (const field of ADDRESS_FIELDS) {
    if (Object.hasOwn(record, field)) fieldsAsReported[field] = record[field];
  }
  const first = fields => fields.map(field => text(record[field])).find(Boolean) ?? null;
  const structured = {
    street_1: first(['payee_street_1_as_reported', 'payee_address_as_reported', 'street_address_as_reported', 'address_as_reported']),
    street_2: first(['payee_street_2_as_reported']),
    city: first(['payee_city_as_reported', 'city_as_reported']),
    state: first(['payee_state_as_reported', 'state_as_reported']),
    postal_code: first(['payee_zip_as_reported', 'zip_code_as_reported']),
  };
  const observed = Object.values(structured).some(Boolean);
  const upstreamOmission = /address.*not retained|city.*state.*zip.*not retained/i.test(record.privacy_projection ?? '');
  const status = observed
    ? 'observed_in_input_projection'
    : upstreamOmission
      ? 'unavailable_by_upstream_privacy_projection'
      : 'absent_in_input_record';
  return { status, fields_as_reported: fieldsAsReported, structured };
}

export function normalizePayeeAddress(address) {
  if (address.status !== 'observed_in_input_projection') return null;
  return Object.fromEntries(Object.entries(address.structured).map(([key, value]) => [
    key,
    value ? normalizeTokenString(value) : null,
  ]));
}

function inferCycle(file) {
  const match = path.basename(file).match(/oppexp-(\d{4})\.jsonl$/i);
  if (!match) throw new Error(`cannot infer cycle from input filename: ${file}`);
  return Number(match[1]);
}

function sourceIds(record) {
  return {
    sub_id: record.sub_id ?? null,
    transaction_id: record.transaction_id ?? null,
    back_reference_transaction_id: record.back_reference_transaction_id ?? null,
    file_number: record.file_number ?? null,
    image_number: record.image_number ?? null,
    report_year: record.report_year ?? null,
    report_type: record.report_type ?? null,
    line_number: record.line_number ?? null,
    form_type: record.form_type ?? null,
    schedule_type: record.schedule_type ?? null,
  };
}

function sourceRecordId(record, cycle, relativeInput, inputLine) {
  const subId = text(record.sub_id);
  if (subId) return `fec-oppexp:${cycle}:sub:${subId}`;
  const identityMaterial = stableJson({
    cycle,
    committee_id: record.committee_id ?? null,
    file_number: record.file_number ?? null,
    transaction_id: record.transaction_id ?? null,
    back_reference_transaction_id: record.back_reference_transaction_id ?? null,
    source_sha256: record.source_sha256 ?? null,
    source_line: record.source_line ?? null,
    relative_input: relativeInput,
    input_line: inputLine,
  });
  return `fec-oppexp:${cycle}:derived:${sha256(identityMaterial).slice(0, 32)}`;
}

function candidateId(normalizedName, normalizedAddress) {
  const material = `${PAYEE_NORMALIZATION_VERSION}\u0000${normalizedName}\u0000${stableJson(normalizedAddress)}`;
  return `fec-payee-candidate:${sha256(material).slice(0, 32)}`;
}

async function write(stream, value) {
  if (!stream.write(jsonLine(value))) await once(stream, 'drain');
}

async function close(stream) {
  stream.end();
  await once(stream, 'finish');
}

async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

function increment(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

function candidateSummary(candidate) {
  return {
    schema_version: 'fec-payee-candidate@1',
    candidate_id: candidate.candidate_id,
    candidate_status: 'unresolved_normalized_candidate',
    normalization_version: PAYEE_NORMALIZATION_VERSION,
    grouping_basis: candidate.normalized_address
      ? 'normalized_payee_name_and_normalized_address'
      : 'normalized_payee_name_only_address_unavailable',
    normalized_payee_name: candidate.normalized_name,
    normalized_address: candidate.normalized_address,
    observed_name_variants: [...candidate.name_variants.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count })),
    observed_cycles: [...candidate.cycles].sort((a, b) => a - b),
    observed_committee_ids: [...candidate.committees].sort(),
    source_record_count: candidate.record_count,
    date_range_observed: {
      earliest: candidate.earliest_date,
      latest: candidate.latest_date,
    },
    example_source_record_ids: candidate.examples,
    example_source_record_id_limit: EXAMPLE_SOURCE_ID_LIMIT,
    membership: 'Every eligible row in payee-records.jsonl carries this candidate_id.',
    allowed_language: 'These source rows share a conservatively normalized payee label and address projection. This is a candidate grouping, not an entity resolution.',
    forbidden_inferences: [
      'same_normalized_payee_candidate_is_same_legal_entity',
      'payee_identity_resolved_from_name_or_address_alone',
      'beneficial_ownership_from_payee_label',
      'wrongdoing_from_reported_disbursement',
    ],
    graph_effect: 'none',
  };
}

/**
 * Stream normalized cycle JSONL emitted by acquire-fec-oppexp-cohort.mjs into a
 * record-preserving payee inventory plus explicitly unresolved candidate groups.
 */
export async function buildFecPayeeInventory({ inputFiles, inputRoot, outputDir }) {
  if (!Array.isArray(inputFiles) || !inputFiles.length) throw new Error('no normalized acquisition JSONL inputs found');
  const orderedInputs = inputFiles
    .map(file => ({ file: path.resolve(file), cycle: inferCycle(file) }))
    .sort((a, b) => a.cycle - b.cycle || a.file.localeCompare(b.file));
  const resolvedInputRoot = path.resolve(inputRoot);
  fs.mkdirSync(outputDir, { recursive: true });

  const recordsPath = path.join(outputDir, 'payee-records.jsonl');
  const candidatesPath = path.join(outputDir, 'payee-candidates.jsonl');
  const dispositionsPath = path.join(outputDir, 'payee-dispositions.jsonl');
  const recordsTmp = `${recordsPath}.tmp`;
  const candidatesTmp = `${candidatesPath}.tmp`;
  const dispositionsTmp = `${dispositionsPath}.tmp`;
  for (const file of [recordsTmp, candidatesTmp, dispositionsTmp]) fs.rmSync(file, { force: true });

  const recordsOut = fs.createWriteStream(recordsTmp, { encoding: 'utf8' });
  const dispositionsOut = fs.createWriteStream(dispositionsTmp, { encoding: 'utf8' });
  const candidates = new Map();
  const totals = {
    input_lines: 0,
    blank_input_lines: 0,
    parsed_records: 0,
    inventory_records_written: 0,
    candidate_eligible_rows: 0,
    blank_payee_name_rows: 0,
    malformed_payee_name_rows: 0,
    placeholder_payee_name_rows: 0,
    malformed_record_lines: 0,
    invalid_json_lines: 0,
  };
  const addressCoverage = {};
  const sourceIdCoverage = {};
  const perCycle = {};
  const committeesObserved = new Set();
  const inputManifest = [];

  for (const { file, cycle } of orderedInputs) {
    const relativeInput = portable(path.relative(resolvedInputRoot, file));
    const inputHash = crypto.createHash('sha256');
    let inputBytes = 0;
    let inputLine = 0;
    const cycleCounts = perCycle[cycle] = {
      input_lines: 0,
      parsed_records: 0,
      candidate_eligible_rows: 0,
      blank_payee_name_rows: 0,
      malformed_payee_name_rows: 0,
      placeholder_payee_name_rows: 0,
      malformed_record_lines: 0,
      invalid_json_lines: 0,
    };
    const source = fs.createReadStream(file);
    source.on('data', chunk => { inputHash.update(chunk); inputBytes += chunk.length; });
    const lines = readline.createInterface({ input: source, crlfDelay: Infinity });
    for await (const line of lines) {
      inputLine += 1;
      totals.input_lines += 1;
      cycleCounts.input_lines += 1;
      if (!line.trim()) {
        totals.blank_input_lines += 1;
        await write(dispositionsOut, {
          schema_version: 'fec-payee-disposition@1', cycle, input_file: relativeInput,
          input_line: inputLine, disposition: 'blank_input_line', graph_effect: 'none',
        });
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        totals.invalid_json_lines += 1;
        cycleCounts.invalid_json_lines += 1;
        await write(dispositionsOut, {
          schema_version: 'fec-payee-disposition@1', cycle, input_file: relativeInput,
          input_line: inputLine, disposition: 'invalid_json', line_sha256: sha256(line),
          error: String(error?.message ?? error), graph_effect: 'none',
        });
        continue;
      }
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        totals.malformed_record_lines += 1;
        cycleCounts.malformed_record_lines += 1;
        await write(dispositionsOut, {
          schema_version: 'fec-payee-disposition@1', cycle, input_file: relativeInput,
          input_line: inputLine, disposition: 'malformed_record', line_sha256: sha256(line), graph_effect: 'none',
        });
        continue;
      }

      totals.parsed_records += 1;
      cycleCounts.parsed_records += 1;
      const name = classifyPayeeName(record.payee_name_as_reported);
      increment(totals, `${name.disposition}_rows`);
      increment(cycleCounts, `${name.disposition}_rows`);
      const address = extractPayeeAddress(record);
      increment(addressCoverage, address.status);
      const normalizedAddress = normalizePayeeAddress(address);
      const ids = sourceIds(record);
      for (const [field, value] of Object.entries(ids)) if (value !== null && value !== '') increment(sourceIdCoverage, field);
      const recordId = sourceRecordId(record, cycle, relativeInput, inputLine);
      let payeeCandidateId = null;
      if (name.disposition === 'candidate_eligible') {
        payeeCandidateId = candidateId(name.normalized_name, normalizedAddress);
        let candidate = candidates.get(payeeCandidateId);
        if (!candidate) {
          candidate = {
            candidate_id: payeeCandidateId,
            normalized_name: name.normalized_name,
            normalized_address: normalizedAddress,
            name_variants: new Map(), cycles: new Set(), committees: new Set(),
            record_count: 0, earliest_date: null, latest_date: null, examples: [],
          };
          candidates.set(payeeCandidateId, candidate);
        }
        candidate.record_count += 1;
        candidate.name_variants.set(
          record.payee_name_as_reported,
          (candidate.name_variants.get(record.payee_name_as_reported) ?? 0) + 1,
        );
        candidate.cycles.add(cycle);
        if (text(record.committee_id)) candidate.committees.add(record.committee_id);
        if (/^\d{4}-\d{2}-\d{2}$/.test(record.disbursement_date ?? '')) {
          if (!candidate.earliest_date || record.disbursement_date < candidate.earliest_date) candidate.earliest_date = record.disbursement_date;
          if (!candidate.latest_date || record.disbursement_date > candidate.latest_date) candidate.latest_date = record.disbursement_date;
        }
        if (candidate.examples.length < EXAMPLE_SOURCE_ID_LIMIT) candidate.examples.push(recordId);
      }
      if (text(record.committee_id)) committeesObserved.add(record.committee_id);

      const inventoryRecord = {
        schema_version: 'fec-payee-inventory-record@1',
        source_record_id: recordId,
        cycle,
        source_locator: {
          cycle,
          input_file: relativeInput,
          input_line: inputLine,
          source_url: record.source_url ?? null,
          source_sha256: record.source_sha256 ?? null,
          source_line: record.source_line ?? null,
        },
        cohort_id: record.cohort_id ?? null,
        person_id: record.person_id ?? null,
        candidate_id: record.candidate_id ?? null,
        committee_id: record.committee_id ?? null,
        committee_name: record.committee_name ?? null,
        source_ids: ids,
        payee_name_as_reported: record.payee_name_as_reported ?? null,
        normalized_payee_name: name.normalized_name,
        address_status: address.status,
        address_fields_as_reported: address.fields_as_reported,
        address_as_reported: address.structured,
        normalized_address: normalizedAddress,
        disbursement_date: record.disbursement_date ?? null,
        disbursement_amount: record.disbursement_amount ?? null,
        disbursement_description: record.disbursement_description ?? null,
        memo_code: record.memo_code ?? null,
        memo_text: record.memo_text ?? null,
        report_amendment_indicator: record.report_amendment_indicator ?? null,
        payee_disposition: name.disposition,
        payee_candidate_id: payeeCandidateId,
        evidence_state: record.evidence_state ?? 'observed',
        allowed_language: 'The named committee reported this itemization with these source-projected fields.',
        forbidden_inferences: [
          'payee_identity_resolved_from_normalization',
          'beneficial_ownership_from_payee_label',
          'reported_itemization_is_unique_payment',
          'wrongdoing_from_disbursement',
        ],
        graph_effect: 'none',
      };
      await write(recordsOut, inventoryRecord);
      totals.inventory_records_written += 1;
      if (name.disposition !== 'candidate_eligible') {
        await write(dispositionsOut, {
          schema_version: 'fec-payee-disposition@1', source_record_id: recordId, cycle,
          input_file: relativeInput, input_line: inputLine, disposition: name.disposition,
          payee_name_as_reported: record.payee_name_as_reported ?? null, graph_effect: 'none',
        });
      }
    }
    inputManifest.push({
      cycle,
      path: relativeInput,
      bytes: inputBytes,
      sha256: inputHash.digest('hex'),
      input_lines: cycleCounts.input_lines,
    });
  }

  await close(recordsOut);
  await close(dispositionsOut);
  const candidatesOut = fs.createWriteStream(candidatesTmp, { encoding: 'utf8' });
  for (const candidate of [...candidates.values()].sort((a, b) => a.candidate_id.localeCompare(b.candidate_id))) {
    await write(candidatesOut, candidateSummary(candidate));
  }
  await close(candidatesOut);
  for (const file of [recordsPath, candidatesPath, dispositionsPath]) fs.rmSync(file, { force: true });
  fs.renameSync(recordsTmp, recordsPath);
  fs.renameSync(candidatesTmp, candidatesPath);
  fs.renameSync(dispositionsTmp, dispositionsPath);

  const outputs = {};
  for (const [key, file] of Object.entries({ records: recordsPath, candidates: candidatesPath, dispositions: dispositionsPath })) {
    outputs[key] = { path: path.basename(file), ...await hashFile(file) };
  }
  const manifest = {
    schema_version: 'fec-payee-inventory-manifest@1',
    normalization_version: PAYEE_NORMALIZATION_VERSION,
    input_contract: 'normalized/oppexp-YYYY.jsonl emitted by tools/acquire-fec-oppexp-cohort.mjs',
    inputs: inputManifest,
    outputs,
    coverage: {
      ...totals,
      distinct_unresolved_payee_candidates: candidates.size,
      committees_observed: committeesObserved.size,
      cycles_observed: orderedInputs.map(input => input.cycle),
      address_status_rows: stableObject(addressCoverage),
      source_id_present_rows: stableObject(sourceIdCoverage),
      per_cycle: stableObject(perCycle),
    },
    disposition_contract: {
      candidate_eligible: 'A nonblank, structurally valid payee label was normalized into a candidate group; no identity was resolved.',
      blank_payee_name: 'The parsed source projection contained no payee label.',
      malformed_payee_name: 'The payee field was non-string, structurally invalid, or contained no letter or number after normalization.',
      placeholder_payee_name: 'The payee field contained a generic missing-value placeholder and was not made a candidate.',
      invalid_json: 'The input line could not be parsed; its content hash and location are retained in payee-dispositions.jsonl.',
      malformed_record: 'The JSON value was not an object; its content hash and location are retained in payee-dispositions.jsonl.',
    },
    interpretation: [
      'Candidate aggregation groups source rows by conservative name/address normalization for later entity-resolution work; it does not resolve a legal entity.',
      'When the acquisition projection omits payee city, state, ZIP, and street address, rows report that limitation explicitly; this inventory cannot recover fields absent upstream.',
      'Reported itemizations are not asserted to be unique underlying payments, and no candidate grouping establishes beneficial ownership, coordination, intent, or wrongdoing.',
    ],
    verification_status: 'machine_generated_unreviewed',
    graph_effect: 'none',
  };
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}
