import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root as repoRoot, slug } from './ledger.mjs';
import { readBuildClock } from './build-clock.mjs';

const readJsonFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export const SCHEMAS = {
  inquiry: 'reservoir-inquiry@1',
  decision: 'reservoir-decision@1',
  disagreement: 'reservoir-disagreement@1',
  manifest: 'reservoir-manifest@1',
};

export const ORIGIN_KINDS = [
  'human_words',
  'human_relayed',
  'agent_observation',
  'agent_interpretation',
  'retrospective_interpretation',
  'derived_from_record',
];
export const HUMAN_ORIGIN_KINDS = ['human_words', 'human_relayed'];
export const DISPOSITION_STATES = ['open', 'narrowed', 'answered', 'disproved', 'superseded', 'parked', 'retired'];
export const EXPLANATION_STATES = ['live', 'narrowed', 'disproved', 'superseded', 'retired'];
export const DECISION_ACTIONS = ['accept', 'reject', 'merge', 'split', 'downgrade', 'reframe', 'retire'];
export const REASON_CODES = [
  'insufficient_receipt',
  'wrong_frame',
  'duplicate',
  'out_of_scope',
  'privacy',
  'density',
  'superseded',
  'cost_over_yield',
  'objective_correction',
  'other',
];
export const DISAGREEMENT_DISPOSITIONS = ['open', 'corrected', 'model_upheld', 'human_withdrawn'];
export const LOCATOR_REQUIRED = {
  git_path: ['path'],
  git_commit: ['commit'],
  git_branch: ['branch'],
  github_item: ['number'],
  github_artifact: ['run_id'],
  estate_path: ['host', 'path'],
  local_file: ['name'],
  conversation: ['url'],
  url: ['url'],
  reservoir: ['project', 'id'],
  text: ['text'],
};
export const DEFAULT_PROJECT = 'clifford-number';
export const RETROSPECTIVE_SOURCE_ID = 'retrospective-2026-10-12';
export const TIER_MEANING = {
  A: { label: 'show it', state: 'answered' },
  B: { label: 'keep and finish', state: 'open' },
  C: { label: 'park it', state: 'parked' },
  D: { label: 'let it go', state: 'retired' },
};

const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;
const isDate = (value) => typeof value === 'string' && DATE_RE.test(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

// ---------------------------------------------------------------------------
// Validation (no schema library; the constraints mirror schemas/reservoir.schema.json)
// ---------------------------------------------------------------------------

export function validateLocator(locator, where, errors) {
  if (!locator || typeof locator !== 'object') {
    errors.push(`${where}: locator must be an object`);
    return;
  }
  const required = LOCATOR_REQUIRED[locator.kind];
  if (!required) {
    errors.push(`${where}: unknown locator kind ${JSON.stringify(locator.kind)}`);
    return;
  }
  for (const field of required) {
    const value = locator[field];
    const ok = field === 'number' ? Number.isInteger(value) : nonEmpty(value);
    if (!ok) errors.push(`${where}: locator kind ${locator.kind} needs ${field}`);
  }
  if ('verified' in locator && typeof locator.verified !== 'boolean') {
    errors.push(`${where}: locator.verified must be boolean`);
  }
}

export function validateOrigin(origin, where, errors, { human = false } = {}) {
  if (!origin || typeof origin !== 'object') {
    errors.push(`${where}: origin must be an object`);
    return;
  }
  if (!ORIGIN_KINDS.includes(origin.kind)) errors.push(`${where}: origin.kind ${JSON.stringify(origin.kind)} is not allowed`);
  if (!nonEmpty(origin.author)) errors.push(`${where}: origin.author is required`);
  if (human && !HUMAN_ORIGIN_KINDS.includes(origin.kind)) errors.push(`${where}: origin.kind must be human_words or human_relayed`);
  if (origin.locator) validateLocator(origin.locator, `${where}.locator`, errors);
}

function validateCommon(row, where, errors) {
  if (!nonEmpty(row.project)) errors.push(`${where}: project is required`);
  if (row.graph_effect !== 'none') errors.push(`${where}: graph_effect must be "none"`);
}

export function validateInquiry(row, index = 0, errors = []) {
  const where = `inquiry[${index}]${row && row.inquiry_id ? ` ${row.inquiry_id}` : ''}`;
  if (!row || typeof row !== 'object') {
    errors.push(`${where}: must be an object`);
    return errors;
  }
  if (row.schema_version !== SCHEMAS.inquiry) errors.push(`${where}: schema_version must be ${SCHEMAS.inquiry}`);
  validateCommon(row, where, errors);
  if (row.conclusion_generated !== false) errors.push(`${where}: conclusion_generated must be false`);
  if (!nonEmpty(row.inquiry_id)) errors.push(`${where}: inquiry_id is required`);
  if (!isDate(row.recorded_at)) errors.push(`${where}: recorded_at must be YYYY-MM-DD`);
  if ('last_activity' in row && row.last_activity !== null && !isDate(row.last_activity)) errors.push(`${where}: last_activity must be YYYY-MM-DD or null`);
  if (!nonEmpty(row.question)) errors.push(`${where}: question is required`);
  validateOrigin(row.question_origin, `${where}.question_origin`, errors);
  if (row.prompting_observation !== undefined && row.prompting_observation !== null) {
    if (!nonEmpty(row.prompting_observation.text)) errors.push(`${where}.prompting_observation: text is required`);
    validateOrigin(row.prompting_observation.origin, `${where}.prompting_observation.origin`, errors);
  }
  if (!Array.isArray(row.competing_explanations)) {
    errors.push(`${where}: competing_explanations must be an array`);
  } else {
    const seen = new Set();
    row.competing_explanations.forEach((explanation, i) => {
      const at = `${where}.competing_explanations[${i}]`;
      if (!nonEmpty(explanation.explanation_id)) errors.push(`${at}: explanation_id is required`);
      else if (seen.has(explanation.explanation_id)) errors.push(`${at}: duplicate explanation_id ${explanation.explanation_id}`);
      seen.add(explanation.explanation_id);
      if (!nonEmpty(explanation.text)) errors.push(`${at}: text is required`);
      validateOrigin(explanation.origin, `${at}.origin`, errors);
      if (!EXPLANATION_STATES.includes(explanation.status)) errors.push(`${at}: status ${JSON.stringify(explanation.status)} is not allowed`);
      for (const side of ['evidence_for', 'evidence_against']) {
        if (!Array.isArray(explanation[side])) errors.push(`${at}: ${side} must be an array`);
        else explanation[side].forEach((locator, j) => validateLocator(locator, `${at}.${side}[${j}]`, errors));
      }
      if (['disproved', 'superseded'].includes(explanation.status) && !(Array.isArray(explanation.evidence_against) && explanation.evidence_against.length > 0)) {
        errors.push(`${at}: a ${explanation.status} explanation must keep at least one evidence_against entry`);
      }
      if (explanation.status === 'narrowed' && !nonEmpty(explanation.narrowed_by)) {
        errors.push(`${at}: a narrowed explanation must say what narrowed it (narrowed_by)`);
      }
    });
  }
  if (!Array.isArray(row.dispositions) || row.dispositions.length === 0) {
    errors.push(`${where}: dispositions must be a non-empty array`);
  } else {
    row.dispositions.forEach((disposition, i) => {
      const at = `${where}.dispositions[${i}]`;
      if (!isDate(disposition.at)) errors.push(`${at}: at must be YYYY-MM-DD`);
      if (!DISPOSITION_STATES.includes(disposition.state)) errors.push(`${at}: state ${JSON.stringify(disposition.state)} is not allowed`);
      if (!ORIGIN_KINDS.includes(disposition.by)) errors.push(`${at}: by must be an origin kind`);
      if (!nonEmpty(disposition.reason)) errors.push(`${at}: reason is required`);
      if (!Array.isArray(disposition.evidence)) errors.push(`${at}: evidence must be an array`);
      else disposition.evidence.forEach((locator, j) => validateLocator(locator, `${at}.evidence[${j}]`, errors));
      if (['disproved', 'superseded'].includes(disposition.state) && !(Array.isArray(disposition.evidence) && disposition.evidence.length > 0)) {
        errors.push(`${at}: a ${disposition.state} disposition must cite evidence`);
      }
    });
  }
  if (!Array.isArray(row.locators)) errors.push(`${where}: locators must be an array`);
  else row.locators.forEach((locator, i) => validateLocator(locator, `${where}.locators[${i}]`, errors));
  if (!Array.isArray(row.related_inquiry_ids) || row.related_inquiry_ids.some((id) => !nonEmpty(id))) {
    errors.push(`${where}: related_inquiry_ids must be an array of ids`);
  }
  if (row.next_examination !== undefined && row.next_examination !== null) {
    if (!nonEmpty(row.next_examination.what)) errors.push(`${where}.next_examination: what is required`);
    if (!Array.isArray(row.next_examination.where)) errors.push(`${where}.next_examination: where must be an array`);
    else row.next_examination.where.forEach((locator, i) => validateLocator(locator, `${where}.next_examination.where[${i}]`, errors));
  }
  if (row.retired_machinery !== undefined) {
    if (!Array.isArray(row.retired_machinery)) errors.push(`${where}: retired_machinery must be an array`);
    else row.retired_machinery.forEach((item, i) => {
      if (!nonEmpty(item.what) || !nonEmpty(item.what_it_taught)) errors.push(`${where}.retired_machinery[${i}]: what and what_it_taught are required`);
      if (item.locator) validateLocator(item.locator, `${where}.retired_machinery[${i}].locator`, errors);
    });
  }
  return errors;
}

export function validateDecision(row, index = 0, errors = []) {
  const where = `decision[${index}]${row && row.decision_id ? ` ${row.decision_id}` : ''}`;
  if (!row || typeof row !== 'object') {
    errors.push(`${where}: must be an object`);
    return errors;
  }
  if (row.schema_version !== SCHEMAS.decision) errors.push(`${where}: schema_version must be ${SCHEMAS.decision}`);
  validateCommon(row, where, errors);
  if (!nonEmpty(row.decision_id)) errors.push(`${where}: decision_id is required`);
  if (!isDate(row.decided_at)) errors.push(`${where}: decided_at must be YYYY-MM-DD`);
  validateOrigin(row.decided_by, `${where}.decided_by`, errors, { human: true });
  if (!DECISION_ACTIONS.includes(row.action)) errors.push(`${where}: action ${JSON.stringify(row.action)} is not allowed`);
  if (!row.subject || !nonEmpty(row.subject.text)) errors.push(`${where}.subject: text is required`);
  if (!row.subject || !Array.isArray(row.subject.locators)) errors.push(`${where}.subject: locators must be an array`);
  else row.subject.locators.forEach((locator, i) => validateLocator(locator, `${where}.subject.locators[${i}]`, errors));
  if (!REASON_CODES.includes(row.reason_code)) errors.push(`${where}: reason_code ${JSON.stringify(row.reason_code)} is not allowed`);
  if (!nonEmpty(row.reason)) errors.push(`${where}: reason is required`);
  if (typeof row.verified !== 'boolean') errors.push(`${where}: verified must be boolean`);
  if (!Array.isArray(row.inquiry_ids)) errors.push(`${where}: inquiry_ids must be an array`);
  return errors;
}

export function validateDisagreement(row, index = 0, errors = []) {
  const where = `disagreement[${index}]${row && row.disagreement_id ? ` ${row.disagreement_id}` : ''}`;
  if (!row || typeof row !== 'object') {
    errors.push(`${where}: must be an object`);
    return errors;
  }
  if (row.schema_version !== SCHEMAS.disagreement) errors.push(`${where}: schema_version must be ${SCHEMAS.disagreement}`);
  validateCommon(row, where, errors);
  if (row.conclusion_generated !== false) errors.push(`${where}: conclusion_generated must be false`);
  if (!nonEmpty(row.disagreement_id)) errors.push(`${where}: disagreement_id is required`);
  if (!isDate(row.recorded_at)) errors.push(`${where}: recorded_at must be YYYY-MM-DD`);
  for (const field of ['original_human_claim', 'model_reformulation']) {
    const value = row[field];
    if (!value || !nonEmpty(value.text)) errors.push(`${where}.${field}: text is required`);
    validateOrigin(value && value.origin, `${where}.${field}.origin`, errors, { human: field === 'original_human_claim' });
  }
  for (const field of ['reason_for_rejection', 'missing_distinction']) {
    if (!nonEmpty(row[field])) errors.push(`${where}: ${field} is required`);
  }
  if (!Array.isArray(row.later_evidence)) errors.push(`${where}: later_evidence must be an array`);
  else row.later_evidence.forEach((locator, i) => validateLocator(locator, `${where}.later_evidence[${i}]`, errors));
  if (!DISAGREEMENT_DISPOSITIONS.includes(row.current_disposition)) errors.push(`${where}: current_disposition ${JSON.stringify(row.current_disposition)} is not allowed`);
  if (!Array.isArray(row.inquiry_ids)) errors.push(`${where}: inquiry_ids must be an array`);
  return errors;
}

export function validateCanonical({ inquiries, decisions, disagreements }) {
  const errors = [];
  inquiries.forEach((row, i) => validateInquiry(row, i, errors));
  decisions.forEach((row, i) => validateDecision(row, i, errors));
  disagreements.forEach((row, i) => validateDisagreement(row, i, errors));
  const ids = new Map();
  for (const [kind, rows, key] of [['inquiry', inquiries, 'inquiry_id'], ['decision', decisions, 'decision_id'], ['disagreement', disagreements, 'disagreement_id']]) {
    for (const row of rows) {
      const id = `${row.project}:${row[key]}`;
      if (ids.has(id)) errors.push(`${kind} ${row[key]} is duplicated within project ${row.project}`);
      ids.set(id, kind);
    }
  }
  const inquiryIds = new Set(inquiries.map((row) => `${row.project}:${row.inquiry_id}`));
  const resolve = (project, id) => (id.includes(':') ? id : `${project}:${id}`);
  for (const row of inquiries) {
    for (const id of row.related_inquiry_ids) {
      if (!inquiryIds.has(resolve(row.project, id))) errors.push(`inquiry ${row.inquiry_id}: related_inquiry_ids names unknown inquiry ${id}`);
    }
  }
  for (const row of [...decisions, ...disagreements]) {
    for (const id of row.inquiry_ids) {
      if (!inquiryIds.has(resolve(row.project, id))) errors.push(`${row.decision_id || row.disagreement_id}: inquiry_ids names unknown inquiry ${id}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function readJsonlFile(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${i + 1}: ${error.message}`);
      }
    });
}

export function loadCanonical(dir, { decisionsDir } = {}) {
  const read = (file) => readJsonlFile(file);
  const inquiries = read(path.join(dir, 'inquiries.jsonl'));
  const disagreements = read(path.join(dir, 'disagreements.jsonl'));
  const decisions = read(path.join(decisionsDir || path.join(path.dirname(dir), 'decisions'), 'prune-decisions.jsonl'));
  return { inquiries, decisions, disagreements };
}

// ---------------------------------------------------------------------------
// Derivation from records already on main
// ---------------------------------------------------------------------------

const derivedOrigin = (sourcePath, note) => ({ kind: 'derived_from_record', author: sourcePath, ...(note ? { note } : {}) });

function baseRow(project, id, question, origin, extra) {
  return {
    schema_version: SCHEMAS.inquiry,
    project,
    inquiry_id: id,
    recorded_at: extra.recorded_at,
    last_activity: extra.last_activity ?? null,
    question,
    question_origin: origin,
    ...(extra.prompting_observation ? { prompting_observation: extra.prompting_observation } : {}),
    competing_explanations: extra.competing_explanations || [],
    dispositions: extra.dispositions,
    locators: extra.locators || [],
    related_inquiry_ids: extra.related_inquiry_ids || [],
    next_examination: extra.next_examination || null,
    derived: extra.derived,
    graph_effect: 'none',
    conclusion_generated: false,
  };
}

export function parseWhere(entry) {
  const text = String(entry).trim();
  let match = text.match(/^BigBirdReturns\/clifford-number#(\d+)\s*(.*)$/u);
  if (match) return { kind: 'github_item', repo: 'BigBirdReturns/clifford-number', number: Number(match[1]), ...(match[2] ? { note: match[2].replace(/^\(|\)$/gu, '') } : {}) };
  match = text.match(/^branch\s+(\S+)\s*(.*)$/u);
  if (match) return { kind: 'git_branch', repo: 'BigBirdReturns/clifford-number', branch: match[1], ...(match[2] ? { note: match[2].replace(/^\(|\)$/gu, '') } : {}) };
  match = text.match(/^([A-Za-z0-9_][A-Za-z0-9_./*-]*)\s*(.*)$/u);
  if (match && match[1].includes('/')) return { kind: 'git_path', path: match[1], ...(match[2] ? { note: match[2].replace(/^\(|\)$/gu, '') } : {}) };
  return { kind: 'text', text };
}

function lastDateOf(active) {
  if (typeof active !== 'string') return null;
  const dates = active.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/gu);
  return dates ? dates[dates.length - 1] : null;
}

export function existsOnMain(locator, root) {
  if (locator.kind !== 'git_path') return null;
  const target = locator.path.replace(/\*.*$/u, '');
  return fs.existsSync(path.join(root, target));
}

export function deriveRetrospective({ root, project, asOfDate }) {
  const dir = path.join(root, 'data/reservoir/sources', RETROSPECTIVE_SOURCE_ID);
  if (!fs.existsSync(path.join(dir, 'provenance.json'))) return { inquiries: [], contradictions: [], provenance: null };
  const provenance = readJsonFile(path.join(dir, 'provenance.json'));
  const tiered = readJsonFile(path.join(dir, 'tiered-trails.json'));
  const raw = readJsonFile(path.join(dir, 'raw-trails.json'));
  const rawByName = new Map(raw.map((row) => [row.trail, row]));
  const sourceLocator = { kind: 'git_branch', repo: 'BigBirdReturns/clifford-number', branch: provenance.origin.branch, note: `commit ${provenance.origin.commit}` };
  const inquiries = [];
  const contradictions = [];
  tiered.forEach((trail, index) => {
    const rows = (trail.rows || []).map((name) => rawByName.get(name)).filter(Boolean);
    const missingRows = (trail.rows || []).filter((name) => !rawByName.has(name));
    const whereEntries = new Set([trail.where, ...rows.flatMap((row) => row.where || [])].filter(Boolean));
    const locators = [...whereEntries].map(parseWhere);
    const presence = locators.filter((locator) => locator.kind === 'git_path').map((locator) => ({ path: locator.path, present: existsOnMain(locator, root) }));
    const anyPresent = presence.some((entry) => entry.present);
    const allAbsent = presence.length > 0 && presence.every((entry) => !entry.present);
    if (trail.on_main === 'yes' && allAbsent) {
      contradictions.push({ kind: 'on_main_yes_but_paths_absent', trail: trail.name, tier: trail.tier, paths: presence.map((entry) => entry.path) });
    }
    if (trail.on_main === 'no' && anyPresent) {
      contradictions.push({ kind: 'on_main_no_but_path_present', trail: trail.name, tier: trail.tier, paths: presence.filter((entry) => entry.present).map((entry) => entry.path) });
    }
    const tier = TIER_MEANING[trail.tier] || { label: trail.tier, state: 'open' };
    const questions = rows.map((row) => row.question).filter(nonEmpty);
    const lastActivity = rows.map((row) => lastDateOf(row.active)).filter(Boolean).sort().pop() || null;
    const id = `retro-2026-10-12:${String(index + 1).padStart(2, '0')}:${slug(trail.name)}`;
    const origin = { kind: 'retrospective_interpretation', author: 'retrospective tiering model (a judgment, not an outside review)', locator: sourceLocator };
    const competing = rows
      .filter((row) => nonEmpty(row.why) || nonEmpty(row.worth))
      .map((row, i) => ({
        explanation_id: `why-${i + 1}`,
        text: [row.worth ? `worth: ${row.worth}` : null, row.why ? `why: ${row.why}` : null].filter(Boolean).join(' '),
        origin: { kind: 'retrospective_interpretation', author: 'retrospective capture agents', note: `raw trail: ${row.trail}` },
        status: 'live',
        evidence_for: [],
        evidence_against: [],
      }));
    inquiries.push(baseRow(project, id, questions.length ? questions.join(' | ') : trail.headline, origin, {
      recorded_at: asOfDate,
      last_activity: lastActivity,
      prompting_observation: nonEmpty(trail.headline)
        ? { text: trail.headline, origin: { kind: 'retrospective_interpretation', author: 'retrospective tiering model', note: 'The headline is what the retrospective found, not what first drew attention; the original reason for looking was not recorded on the trail.' } }
        : undefined,
      competing_explanations: competing,
      dispositions: [{
        at: asOfDate,
        state: tier.state,
        by: 'retrospective_interpretation',
        reason: `Tier ${trail.tier} (${tier.label}). ${trail.note || ''}`.trim(),
        evidence: [sourceLocator],
      }],
      locators: [sourceLocator, ...locators],
      next_examination: tier.state === 'open' || tier.state === 'parked'
        ? { what: `Decide whether the ${rows.length} underlying trail${rows.length === 1 ? '' : 's'} still carr${rows.length === 1 ? 'ies' : 'y'} a live question; the retrospective recorded stage(s) ${[...new Set(rows.map((row) => row.stage))].join(', ') || 'unknown'} and ${rows.reduce((sum, row) => sum + (Number(row.real_sources) || 0), 0)} real sources.`, where: locators.filter((locator) => locator.kind !== 'text') }
        : null,
      derived: {
        source: RETROSPECTIVE_SOURCE_ID,
        tiered_index: index,
        tier: trail.tier,
        on_main: trail.on_main,
        raw_rows: rows.map((row) => row.trail),
        raw_rows_missing: missingRows,
        stages: [...new Set(rows.map((row) => row.stage))],
        real_sources: rows.reduce((sum, row) => sum + (Number(row.real_sources) || 0), 0),
        risk: rows.map((row) => row.risk).filter(nonEmpty),
        path_presence: presence,
      },
    }));
  });
  return { inquiries, contradictions, provenance };
}

export function deriveFromMain({ root, project, asOfDate }) {
  const inquiries = [];
  const sources = [];
  const push = (row) => inquiries.push(row);

  // 1. Game-trail unresolved ledger and per-estate next acquisitions.
  const gametrailsPath = path.join(root, 'gametrails/data.json');
  if (fs.existsSync(gametrailsPath)) {
    const data = readJsonFile(gametrailsPath);
    sources.push('gametrails/data.json');
    const asOf = isDate(String(data.as_of).slice(0, 10)) ? String(data.as_of).slice(0, 10) : asOfDate;
    for (const row of data.unresolved_ledger || []) {
      push(baseRow(project, `gametrail-unresolved:${row.trail_id}`, row.next_acquisition, derivedOrigin('gametrails/data.json', 'unresolved_ledger.next_acquisition'), {
        recorded_at: asOf,
        last_activity: asOf,
        prompting_observation: { text: row.residual_fog, origin: derivedOrigin('gametrails/data.json', 'unresolved_ledger.residual_fog') },
        dispositions: [{ at: asOf, state: 'open', by: 'derived_from_record', reason: 'Listed in the game-trail unresolved ledger; no later record closes it.', evidence: [{ kind: 'git_path', path: 'gametrails/data.json' }] }],
        locators: [{ kind: 'git_path', path: 'gametrails/data.json', note: row.trail_id }],
        derived: { source: 'gametrails/data.json', trail_id: row.trail_id, origin_estate_id: row.origin_estate_id },
      }));
    }
    for (const summary of data.estate_summaries || []) {
      if (!nonEmpty(summary.next_acquisition)) continue;
      push(baseRow(project, `gametrail-estate:${summary.origin_estate_id}`, summary.next_acquisition, derivedOrigin('gametrails/data.json', 'estate_summaries.next_acquisition'), {
        recorded_at: asOf,
        last_activity: asOf,
        prompting_observation: nonEmpty(summary.residual_fog) ? { text: summary.residual_fog, origin: derivedOrigin('gametrails/data.json', 'estate_summaries.residual_fog') } : undefined,
        dispositions: [{ at: asOf, state: 'open', by: 'derived_from_record', reason: `Estate handoff names a next acquisition; terminal_state ${summary.terminal_state}. The handoff is rendered and posted but never read back.`, evidence: [{ kind: 'git_path', path: `gametrail-handoffs/${summary.origin_estate_id}.md` }] }],
        locators: [{ kind: 'git_path', path: `gametrail-handoffs/${summary.origin_estate_id}.md` }, { kind: 'git_path', path: 'gametrails/data.json', note: summary.trail_id }],
        derived: { source: 'gametrails/data.json', trail_id: summary.trail_id, outcome_class: summary.outcome_class, terminal_state: summary.terminal_state },
      }));
    }
  }

  // 2. Arcadia field-autopsy hypotheses (preserved, never closed, no falsifier field).
  const hypothesesPath = path.join(root, 'cases/arcadia-field-autopsy/hypotheses.jsonl');
  if (fs.existsSync(hypothesesPath)) {
    sources.push('cases/arcadia-field-autopsy/hypotheses.jsonl');
    for (const row of readJsonlFile(hypothesesPath)) {
      push(baseRow(project, `arcadia-hypothesis:${row.hypothesis_id}`, row.plain || row.label, derivedOrigin('cases/arcadia-field-autopsy/hypotheses.jsonl', 'plain'), {
        recorded_at: asOfDate,
        last_activity: null,
        competing_explanations: nonEmpty(row.tradition_classification)
          ? [{ explanation_id: 'tradition_classification', text: row.tradition_classification, origin: derivedOrigin('cases/arcadia-field-autopsy/hypotheses.jsonl', 'tradition_classification'), status: 'live', evidence_for: [], evidence_against: [] }]
          : [],
        dispositions: [{ at: asOfDate, state: row.status === 'preserved' ? 'open' : 'parked', by: 'derived_from_record', reason: `Hypothesis status ${row.status}; evidence_state ${row.evidence_state}. The record has no falsifier field, so nothing says what would close it.`, evidence: [{ kind: 'git_path', path: 'cases/arcadia-field-autopsy/hypotheses.jsonl' }] }],
        locators: [{ kind: 'git_path', path: 'cases/arcadia-field-autopsy/hypotheses.jsonl', note: row.hypothesis_id }],
        next_examination: { what: 'Record a falsifier for this hypothesis and the search that would test it.', where: [{ kind: 'git_path', path: 'cases/arcadia-field-autopsy/searches.jsonl' }] },
        derived: { source: 'cases/arcadia-field-autopsy/hypotheses.jsonl', hypothesis_id: row.hypothesis_id, status: row.status, observation_ids: row.observation_ids || [], mechanism_search_ids: row.mechanism_search_ids || [] },
      }));
    }
  }

  // 3. M-04D next decisive frontier.
  const m04dPath = path.join(root, 'data/project/m04d-adversarial-triage-ledger.json');
  if (fs.existsSync(m04dPath)) {
    const ledger = readJsonFile(m04dPath);
    sources.push('data/project/m04d-adversarial-triage-ledger.json');
    const asOf = isDate(String(ledger.as_of).slice(0, 10)) ? String(ledger.as_of).slice(0, 10) : asOfDate;
    for (const frontier of ledger.next_decisive_frontier || []) {
      push(baseRow(project, `m04d-frontier:${frontier.frontier_id}`, frontier.question, derivedOrigin('data/project/m04d-adversarial-triage-ledger.json', 'next_decisive_frontier.question'), {
        recorded_at: asOf,
        last_activity: asOf,
        dispositions: [{ at: asOf, state: 'open', by: 'derived_from_record', reason: `Priority ${frontier.priority}. Terminal condition: ${frontier.terminal_condition}`, evidence: [{ kind: 'git_path', path: 'data/project/m04d-adversarial-triage-ledger.json' }] }],
        locators: [{ kind: 'git_path', path: 'data/project/m04d-adversarial-triage-ledger.json', note: frontier.frontier_id }],
        next_examination: { what: `Acquire: ${(frontier.required_objects || []).join('; ')}`, where: [{ kind: 'git_path', path: 'data/project/m04d-adversarial-triage-ledger.json' }] },
        derived: { source: 'data/project/m04d-adversarial-triage-ledger.json', frontier_id: frontier.frontier_id, priority: frontier.priority },
      }));
    }
  }

  // 4. Hydrology catchments and the two fan-out lane sets, with their falsifiers.
  const catchmentsPath = path.join(root, 'data/project/m04g-evidence-hydrology-catchments.json');
  if (fs.existsSync(catchmentsPath)) {
    const catchments = readJsonFile(catchmentsPath);
    sources.push('data/project/m04g-evidence-hydrology-catchments.json');
    const asOf = isDate(String(catchments.as_of).slice(0, 10)) ? String(catchments.as_of).slice(0, 10) : asOfDate;
    for (const catchment of catchments.catchments || []) {
      push(baseRow(project, `hydrology-catchment:${catchment.catchment_id}`, catchment.question, derivedOrigin('data/project/m04g-evidence-hydrology-catchments.json', 'catchments.question'), {
        recorded_at: asOf,
        last_activity: asOf,
        dispositions: [{ at: asOf, state: 'open', by: 'derived_from_record', reason: `Catchment ${catchment.label}. Required mix: ${(catchment.required_mix || []).join(', ')}. Its existing_estate_routes never feed back into estate registries.`, evidence: [{ kind: 'git_path', path: 'data/project/m04g-evidence-hydrology-catchments.json' }] }],
        locators: [{ kind: 'git_path', path: 'data/project/m04g-evidence-hydrology-catchments.json', note: catchment.catchment_id }],
        derived: { source: 'data/project/m04g-evidence-hydrology-catchments.json', catchment_id: catchment.catchment_id, existing_estate_routes: catchment.existing_estate_routes || [] },
      }));
    }
  }
  for (const [file, prefix] of [['data/project/m04g-evidence-hydrology-fanout.json', 'hydrology-lane'], ['data/project/m04g-global-circulation-fanout.json', 'circulation-lane']]) {
    const fanoutPath = path.join(root, file);
    if (!fs.existsSync(fanoutPath)) continue;
    const fanout = readJsonFile(fanoutPath);
    sources.push(file);
    const asOf = isDate(String(fanout.as_of).slice(0, 10)) ? String(fanout.as_of).slice(0, 10) : asOfDate;
    for (const lane of fanout.lanes || []) {
      push(baseRow(project, `${prefix}:${lane.lane_id}`, lane.question, derivedOrigin(file, 'lanes.question'), {
        recorded_at: asOf,
        last_activity: asOf,
        competing_explanations: nonEmpty(lane.falsifier)
          ? [{ explanation_id: 'falsifier', text: lane.falsifier, origin: derivedOrigin(file, 'lanes.falsifier'), status: 'live', evidence_for: [], evidence_against: [] }]
          : [],
        dispositions: [{ at: asOf, state: 'open', by: 'derived_from_record', reason: `Lane ${lane.title}. Stopping rule: ${lane.stopping_rule || 'none recorded'}. The master issue and lane issues named by master_marker ${fanout.master_marker} were never created.`, evidence: [{ kind: 'git_path', path: file }] }],
        locators: [{ kind: 'git_path', path: file, note: lane.lane_id }],
        derived: { source: file, lane_id: lane.lane_id, catchments: lane.catchments || [], master_marker: fanout.master_marker },
      }));
    }
  }

  return { inquiries, sources };
}

// ---------------------------------------------------------------------------
// Reconnection: which retrospective trails and which main-side records share a path
// ---------------------------------------------------------------------------

export function reconnect(inquiries) {
  // A reconnection joins two inquiries that came from different places and
  // share a path. Rows derived from the same source file already sit
  // together, so pairing them would only restate that file.
  const sourceOf = new Map(inquiries.map((row) => [`${row.project}:${row.inquiry_id}`, row.derived ? `${row.project}/${row.derived.source}` : `${row.project}/canonical/${row.inquiry_id}`]));
  const byPath = new Map();
  for (const row of inquiries) {
    for (const locator of row.locators) {
      if (locator.kind !== 'git_path') continue;
      const key = locator.path.replace(/\/$/u, '');
      if (!byPath.has(key)) byPath.set(key, new Set());
      byPath.get(key).add(`${row.project}:${row.inquiry_id}`);
    }
  }
  const pairs = new Map();
  const keys = [...byPath.keys()].sort();
  for (const a of keys) {
    for (const b of keys) {
      if (a > b) continue;
      if (a !== b && !(b.startsWith(`${a}/`) || a.startsWith(`${b}/`))) continue;
      for (const left of byPath.get(a)) {
        for (const right of byPath.get(b)) {
          if (left === right) continue;
          if (sourceOf.get(left) === sourceOf.get(right)) continue;
          const [x, y] = [left, right].sort();
          const key = `${x}|${y}`;
          if (!pairs.has(key)) pairs.set(key, { a: x, b: y, shared_paths: new Set() });
          pairs.get(key).shared_paths.add(a === b ? a : [a, b].sort()[0]);
        }
      }
    }
  }
  return [...pairs.values()]
    .map((pair) => ({ a: pair.a, b: pair.b, shared_paths: [...pair.shared_paths].sort() }))
    .sort((p, q) => (p.a + p.b).localeCompare(q.a + q.b));
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function currentState(row) {
  return row.dispositions[row.dispositions.length - 1].state;
}

function count(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row);
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function buildReservoir({ root = repoRoot, write = true, join = [], outDir = 'build/reservoir' } = {}) {
  const clock = readBuildClock({ root });
  const asOfDate = clock.timestamp.slice(0, 10);
  const projects = [];
  const canonical = { inquiries: [], decisions: [], disagreements: [] };

  const ownDir = path.join(root, 'data/reservoir');
  const own = loadCanonical(ownDir, { decisionsDir: path.join(root, 'data/decisions') });
  projects.push({ project: DEFAULT_PROJECT, dir: 'data/reservoir', joined: false });
  for (const kind of Object.keys(canonical)) canonical[kind].push(...own[kind]);

  for (const joinDir of join) {
    const resolved = path.resolve(root, joinDir);
    const other = loadCanonical(resolved, { decisionsDir: path.join(resolved, 'decisions') });
    const names = new Set([...other.inquiries, ...other.decisions, ...other.disagreements].map((row) => row.project));
    if (names.size === 0) throw new Error(`joined reservoir at ${joinDir} holds no rows`);
    if (names.has(DEFAULT_PROJECT)) throw new Error(`joined reservoir at ${joinDir} must not use project ${DEFAULT_PROJECT}`);
    for (const name of names) projects.push({ project: name, dir: joinDir, joined: true });
    for (const kind of Object.keys(canonical)) canonical[kind].push(...other[kind]);
  }

  const errors = validateCanonical(canonical);
  if (errors.length) throw new Error(`reservoir canonical rows invalid:\n  ${errors.join('\n  ')}`);

  const retrospective = deriveRetrospective({ root, project: DEFAULT_PROJECT, asOfDate });
  const main = deriveFromMain({ root, project: DEFAULT_PROJECT, asOfDate });
  const derived = [...retrospective.inquiries, ...main.inquiries];
  const derivedErrors = [];
  derived.forEach((row, i) => validateInquiry(row, i, derivedErrors));
  if (derivedErrors.length) throw new Error(`reservoir derived rows invalid:\n  ${derivedErrors.join('\n  ')}`);

  const all = [...canonical.inquiries, ...derived];
  const seen = new Set();
  for (const row of all) {
    const key = `${row.project}:${row.inquiry_id}`;
    if (seen.has(key)) throw new Error(`duplicate inquiry id across canonical and derived rows: ${key}`);
    seen.add(key);
  }

  const reconnections = reconnect(all);
  const open = all.filter((row) => ['open', 'narrowed', 'parked'].includes(currentState(row)));
  const withoutPrompting = all.filter((row) => !row.prompting_observation);
  const disproved = all.flatMap((row) => row.competing_explanations.filter((e) => e.status === 'disproved').map((e) => ({ inquiry_id: row.inquiry_id, explanation_id: e.explanation_id, evidence_against: e.evidence_against.length })));
  const narrowed = all.flatMap((row) => row.competing_explanations.filter((e) => e.status === 'narrowed').map((e) => ({ inquiry_id: row.inquiry_id, explanation_id: e.explanation_id, narrowed_by: e.narrowed_by })));
  const nextExaminations = all.filter((row) => row.next_examination).map((row) => ({ inquiry_id: row.inquiry_id, project: row.project, state: currentState(row), what: row.next_examination.what }));
  const oldestOpen = [...open]
    .sort((a, b) => String(a.last_activity || a.recorded_at).localeCompare(String(b.last_activity || b.recorded_at)) || a.inquiry_id.localeCompare(b.inquiry_id))
    .slice(0, 15)
    .map((row) => ({ inquiry_id: row.inquiry_id, project: row.project, last_activity: row.last_activity || row.recorded_at, state: currentState(row), origin_kind: row.question_origin.kind }));

  const compiledJsonl = `${all.map((row) => JSON.stringify(row)).join('\n')}\n`;
  const fingerprint = crypto.createHash('sha256').update(compiledJsonl).digest('hex').slice(0, 20);

  const manifest = {
    schema_version: SCHEMAS.manifest,
    as_of: clock.timestamp,
    not_evidence_date: true,
    projects,
    sources: {
      canonical: ['data/reservoir/inquiries.jsonl', 'data/reservoir/disagreements.jsonl', 'data/decisions/prune-decisions.jsonl'],
      retrospective: retrospective.provenance ? { source_id: retrospective.provenance.source_id, commit: retrospective.provenance.origin.commit, branch: retrospective.provenance.origin.branch, files: retrospective.provenance.files.map((file) => ({ path: file.path, sha256: file.sha256 || null, rows: file.rows || null })) } : null,
      derived_from_main: main.sources,
    },
    counts: {
      projects: projects.length,
      canonical_inquiries: canonical.inquiries.length,
      decisions: canonical.decisions.length,
      disagreements: canonical.disagreements.length,
      retrospective_inquiries: retrospective.inquiries.length,
      main_derived_inquiries: main.inquiries.length,
      total_inquiries: all.length,
      by_state: count(all, currentState),
      by_question_origin: count(all, (row) => row.question_origin.kind),
      open_or_parked: open.length,
      without_prompting_observation: withoutPrompting.length,
      explanations_disproved_with_evidence: disproved.length,
      explanations_narrowed: narrowed.length,
      next_examinations: nextExaminations.length,
      reconnections: reconnections.length,
      contradictions: retrospective.contradictions.length,
      decisions_by_action: count(canonical.decisions, (row) => row.action),
      disagreements_by_disposition: count(canonical.disagreements, (row) => row.current_disposition),
    },
    attention_lost: {
      inquiries_without_prompting_observation: withoutPrompting.map((row) => row.inquiry_id),
      note: 'Rows derived from records that kept a question but not the reason for looking. The reason can only be restored from the owner or from a record that holds it; the build does not invent one.',
    },
    contradictions: retrospective.contradictions,
    reconnections,
    disproved,
    narrowed,
    oldest_open: oldestOpen,
    next_examinations: nextExaminations,
    boundaries: {
      promotes_to: 'candidate_only',
      graph_effect: 'none',
      conclusion_generated: false,
      estate_completion_claimed: false,
      retrospective_tiers_are_outside_review: false,
    },
    fingerprint,
  };

  const report = renderReport(manifest, canonical);

  if (write) {
    const target = path.join(root, outDir);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(target, 'inquiries.compiled.jsonl'), compiledJsonl);
    fs.writeFileSync(path.join(target, 'circulation-report.md'), report);
  }
  return { manifest, inquiries: all, canonical, report };
}

function renderReport(manifest, canonical) {
  const c = manifest.counts;
  const lines = [];
  lines.push('# Reservoir circulation report');
  lines.push('');
  lines.push(`Built at ${manifest.as_of} (build clock, not an evidence date). Fingerprint ${manifest.fingerprint}.`);
  lines.push('');
  lines.push('Nothing in this report is a claim, hop, graph edge or publication state. It shows what the body of inquiry holds, what is still open, what was disproved and with what, and what to examine next.');
  lines.push('');
  lines.push('## Holdings');
  lines.push('');
  lines.push('| Measure | Count |');
  lines.push('|---|---|');
  lines.push(`| Projects joined | ${c.projects} |`);
  lines.push(`| Canonical inquiries (hand-maintained) | ${c.canonical_inquiries} |`);
  lines.push(`| Inquiries circulated in from the retrospective's 79 tiered trails | ${c.retrospective_inquiries} |`);
  lines.push(`| Inquiries derived from question-bearing records on main | ${c.main_derived_inquiries} |`);
  lines.push(`| Total inquiries | ${c.total_inquiries} |`);
  lines.push(`| Open, narrowed or parked | ${c.open_or_parked} |`);
  lines.push(`| Prune decisions | ${c.decisions} |`);
  lines.push(`| Model disagreements | ${c.disagreements} |`);
  lines.push(`| Explanations disproved with evidence | ${c.explanations_disproved_with_evidence} |`);
  lines.push(`| Explanations narrowed | ${c.explanations_narrowed} |`);
  lines.push(`| Reconnections (records sharing a path) | ${c.reconnections} |`);
  lines.push(`| Contradictions between the retrospective and main | ${c.contradictions} |`);
  lines.push(`| Inquiries whose reason for looking was never recorded | ${c.without_prompting_observation} |`);
  lines.push('');
  lines.push('### By current state');
  lines.push('');
  for (const [state, n] of Object.entries(c.by_state)) lines.push(`- ${state}: ${n}`);
  lines.push('');
  lines.push('### By origin of the question');
  lines.push('');
  for (const [kind, n] of Object.entries(c.by_question_origin)) lines.push(`- ${kind}: ${n}`);
  lines.push('');
  lines.push('## Contradictions');
  lines.push('');
  if (manifest.contradictions.length === 0) lines.push('None found between the retrospective\'s on_main judgment and the paths present on main.');
  for (const item of manifest.contradictions) lines.push(`- ${item.kind}: tier ${item.tier} "${item.trail}" (${item.paths.join(', ')})`);
  lines.push('');
  lines.push('## Disproved and narrowed explanations');
  lines.push('');
  if (manifest.disproved.length === 0 && manifest.narrowed.length === 0) lines.push('None recorded yet.');
  for (const item of manifest.disproved) lines.push(`- disproved: ${item.inquiry_id} / ${item.explanation_id} (${item.evidence_against} evidence entries against)`);
  for (const item of manifest.narrowed) lines.push(`- narrowed: ${item.inquiry_id} / ${item.explanation_id}: ${item.narrowed_by}`);
  lines.push('');
  lines.push('## Oldest open inquiries');
  lines.push('');
  lines.push('| Last activity | State | Origin of question | Inquiry |');
  lines.push('|---|---|---|---|');
  for (const item of manifest.oldest_open) lines.push(`| ${item.last_activity} | ${item.state} | ${item.origin_kind} | ${item.project === DEFAULT_PROJECT ? '' : `${item.project}:`}${item.inquiry_id} |`);
  lines.push('');
  lines.push('## Prune decisions');
  lines.push('');
  if (canonical.decisions.length === 0) lines.push('None recorded.');
  for (const row of canonical.decisions) lines.push(`- ${row.decided_at} ${row.action} (${row.reason_code}${row.verified ? '' : ', subject not yet verified here'}): ${row.subject.text}`);
  lines.push('');
  lines.push('## Model disagreements');
  lines.push('');
  if (canonical.disagreements.length === 0) lines.push('None recorded.');
  for (const row of canonical.disagreements) lines.push(`- ${row.recorded_at} ${row.disagreement_id}: ${row.current_disposition}. Missing distinction: ${row.missing_distinction}`);
  lines.push('');
  lines.push('## Next examinations');
  lines.push('');
  for (const item of manifest.next_examinations.filter((entry) => entry.state !== 'retired').slice(0, 40)) lines.push(`- [${item.state}] ${item.project === DEFAULT_PROJECT ? '' : `${item.project}:`}${item.inquiry_id}: ${item.what}`);
  if (manifest.next_examinations.length > 40) lines.push(`- ... ${manifest.next_examinations.length - 40} more in manifest.json`);
  lines.push('');
  lines.push('## Attention lost');
  lines.push('');
  lines.push(`${c.without_prompting_observation} inquiries carry a question but not what first drew attention to it. ${manifest.attention_lost.note}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
