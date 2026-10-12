import fs from 'node:fs';
import path from 'node:path';
import { root as repoRoot } from './ledger.mjs';
import { matchesHeldRule } from './publication-allowlist.mjs';

// Mechanical gates for two BUILD-INSTRUCTIONS section 1 rules that had none.
//
// 1.6 No identity-adjacent aggregation. No rollups, scores, or surfaces built on
//     ethnicity, religion, ancestry, national origin, or unit affiliation.
// 1.9 The tool maps capture; it must not become capture. No paid placement in
//     registries, no undisclosed sponsor influence on canonical decisions, no
//     private forks with divergent facts presented as this instrument.
//
// These are pattern gates, not classifiers. They look for the fields and wording
// that would IMPLEMENT the forbidden thing (a protected-attribute field, a group
// or surface whose stated basis is a protected attribute, a paid-placement field,
// an undisclosed sponsor field). Country and institutional facts recorded
// neutrally are not flagged. Extend the pattern tables below when a new shape
// appears; each addition needs a case in test/constitution-gates.test.js.

// ---------------------------------------------------------------- 1.6 patterns

/** Field names that are themselves protected attributes or protected-attribute rollups. */
export const PROTECTED_FIELD = new RegExp(
  '^(?:'
  + 'ethnicit(?:y|ies)|ethnic_.+|race_ethnicity'
  + '|nationalit(?:y|ies)|national_origins?'
  + '|religions?|religious_.+'
  + '|ancestry|ancestral_.+'
  + '|military_units?|unit_affiliations?'
  + '|idf|idf_.+|.+_idf'
  + '|cohort_by_origin|origin_cohort'
  + '|.+_by_(?:ethnicity|religion|nationality|national_origin|ancestry|military_unit|unit_affiliation)'
  + ')$',
  'i',
);

/** Fields whose value STATES the basis on which a group, cohort, surface or score is built. */
export const BASIS_FIELD = new RegExp(
  '^(?:bounded_by|linkage_basis|.+_linkage_basis|cohort_definition|cohort_basis|cohort_rule'
  + '|membership_basis|membership_rule|inclusion_rule|grouping|group_by|rollup_basis|score_basis|defined_by)$',
  'i',
);

/** Surface/claim type vocabularies that would name a protected attribute as the bounding dimension. */
export const TYPE_FIELD = /^(?:surface_type|secondary_surface_types|surface_types|cohort_type|group_by|grouping)$/i;
export const PROTECTED_TYPE_VALUE = /(?:^|[_\s-])(?:ethnic(?:ity)?|religio(?:n|us)|national_origin|nationality|ancestry|military_unit|unit_affiliation|idf)(?:$|[_\s-])/i;

// Nationality adjectives for "<nationality> military/army/..." phrases. Deliberately a
// symmetric list (no party or region favoured); extend it as new corridors are declared.
const DEMONYMS = [
  'American', 'British', 'Canadian', 'Chinese', 'Egyptian', 'Emirati', 'French', 'German', 'Indian',
  'Iranian', 'Israeli', 'Italian', 'Japanese', 'Korean', 'Pakistani', 'Polish', 'Russian', 'Saudi',
  'Taiwanese', 'Turkish', 'Ukrainian',
].join('|');

/** Wording that names a protected attribute (ethnicity, religion, ancestry, national origin, unit/service affiliation). */
export const PROTECTED_VALUE = [
  /\bethnic(?:ity|ities)?\b/i,
  /\breligio(?:n|ns|us)\b/i,
  /\bancestr(?:y|al)\b/i,
  /\bnational[ -]origins?\b/i,
  /\bnationalit(?:y|ies)\b/i,
  /\bcountry of origin\b/i,
  /\bmilitary[ -]units?\b/i,
  /\bunit[ -]affiliations?\b/i,
  /\bIDF\b/,
  /\bUnit 8200\b/i,
  /\b[A-Za-z]+-born\b/i,
  /\bmoved to (?:the )?(?:US|U\.S\.|United States|America|UK|U\.K\.|Britain) from\b/i,
  /\b(?:immigrated|emigrated|immigrants?|émigrés?|emigres?)\b/i,
  new RegExp(`\\b(?:${DEMONYMS})(?:'s)? (?:[Mm]ilitary|[Aa]rmy|[Aa]ir [Ff]orce|[Nn]avy|[Aa]rmed [Ff]orces|[Dd]efen[cs]e [Ff]orces|[Ii]ntelligence)\\b`),
  /\b(?:military|army|air force|naval) (?:service|veterans?)\b/i,
];

/** Wording that says a group, rollup, score or surface is being built. */
export const AGGREGATION_CUE = /\b(?:cohorts?|roll-?ups?|aggregat(?:e|es|ed|ion|ions)|group(?:ed|ing|s)? by|bucket(?:ed|s)?|cluster(?:ed|s|ing)?|segment(?:ed|s|ation)?|tall(?:y|ies)|census of|counts? of|ranked by|ranking|scored? by|scores? on|membership|defined by|selected by|filtered by|criteri(?:on|a))\b/i;

/**
 * Field names that carry a country-named cohort or linkage (e.g. the Austin-Israel
 * corridor). Country facts may be recorded neutrally, so these are REVIEW findings
 * (warnings), never blocking: they flag derived counts and linkage fields so the
 * owner can confirm no rollup is built on them. The tokens are the country names that
 * currently appear in cohort-defining field names; add a token when a new corridor
 * lane is declared (each lane must be admitted under the same facts, per 1.10).
 */
export const ORIGIN_LINKAGE_TOKEN = /(?:^|_)(?:israel|israeli)(?:_|$)/i;

// ---------------------------------------------------------------- 1.9 patterns

/** Paid placement is forbidden outright: no such field may exist in published or canonical data. */
export const PAID_PLACEMENT_FIELD = /^(?:paid_placement|placement_fee|paid_priority|sponsored_placement|sponsor_rank|sponsored|promoted|promoted_until|featured|featured_until|featured_rank|ad_slot|advertiser)$/i;
/** Sponsor-influence fields: allowed on canonical registry rows only when disclosed. */
export const SPONSOR_FIELD = /^(?:sponsor|sponsors|sponsor_id|sponsored_by|sponsorship|sponsor_influence|funded_by_sponsor)$/i;
export const SPONSOR_DISCLOSURE_FIELDS = ['sponsor_disclosure', 'sponsor_disclosure_receipt_ids'];

// ---------------------------------------------------------------- scanning

const ID_FIELDS = ['surface_id', 'claim_id', 'receipt_id', 'actor_id', 'org_id', 'organization_id', 'member_id', 'chain_id', 'event_id', 'id', 'label'];

function isEmptyValue(value) {
  return value === null || value === undefined || value === ''
    || (Array.isArray(value) && value.length === 0);
}

function snippet(text, max = 110) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function sentences(text) {
  return String(text).split(/(?<=[.;!?])\s+|\n+/).filter(Boolean);
}

export function protectedCue(text) {
  for (const pattern of PROTECTED_VALUE) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
}

// A sentence that forbids or disclaims aggregation ("nothing in this case may be aggregated
// into ... ethnicity") is a guardrail, not an implementation, and is exempt from the text rule.
const PROHIBITION_CUE = /\b(?:not|no|never|nothing|none|neither|nor|cannot|without|forbid(?:s|den)?|prohibit(?:s|ed)?|refus(?:e|es|ed)|rather than)\b|n't\b/i;

/** First sentence of `text` that both builds a group/rollup and names a protected attribute, or null. */
export function aggregatesOnProtected(text) {
  for (const sentence of sentences(text)) {
    if (PROHIBITION_CUE.test(sentence)) continue;
    if (!AGGREGATION_CUE.test(sentence)) continue;
    const cue = protectedCue(sentence);
    if (cue) return { sentence, cue };
  }
  return null;
}

function rowIdOf(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
  for (const field of ID_FIELDS) {
    if (typeof node[field] === 'string' && node[field]) return node[field];
  }
  return null;
}

/**
 * Walk one parsed JSON document/row and return findings.
 * `ctx` = { canonicalRegistry: boolean } selects the registry-only 1.9 sponsor rule.
 */
export function scanValue(root, ctx = {}) {
  const findings = [];
  const add = (rule, pointer, rowId, field, value, message, severity = 'error') => {
    findings.push({ rule, severity, pointer, row_id: rowId, field, value: snippet(value), message });
  };

  // key = nearest property name; inBasis / inType = an enclosing property is a basis / type field.
  function visit(node, pointer, inheritedId, key, inBasis, inType) {
    if (typeof node === 'string') {
      if (inBasis) {
        const cue = protectedCue(node);
        if (cue) {
          add('1.6/protected-basis', pointer, inheritedId, key, node,
            `"${key}" states a basis that names a protected attribute ("${cue}"); a surface, cohort or score may not be built on it (1.6)`);
        }
      } else if (inType) {
        if (PROTECTED_TYPE_VALUE.test(node)) {
          add('1.6/protected-surface-type', pointer, inheritedId, key, node,
            `"${node}" names a protected attribute as the bounding type of a surface or group (1.6)`);
        }
      } else if (node.length > 20) {
        const hit = aggregatesOnProtected(node);
        if (hit) {
          add('1.6/protected-aggregation-text', pointer, inheritedId, key, hit.sentence,
            `text builds a group or rollup on a protected attribute ("${hit.cue}") (1.6)`);
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${pointer}[${index}]`, inheritedId, key, inBasis, inType));
      return;
    }
    if (!node || typeof node !== 'object') return;
    const rowId = rowIdOf(node) ?? inheritedId;
    for (const [k, value] of Object.entries(node)) {
      const where = `${pointer}.${k}`;
      if (PROTECTED_FIELD.test(k)) {
        add('1.6/protected-field', where, rowId, k, JSON.stringify(value) ?? 'undefined',
          `field "${k}" is a protected attribute or a rollup on one (BUILD-INSTRUCTIONS 1.6)`);
      }
      if (!isEmptyValue(value) && ORIGIN_LINKAGE_TOKEN.test(k)) {
        add('1.6/review-origin-linkage-field', where, rowId, k, JSON.stringify(value),
          `field "${k}" carries a country-named linkage or count; confirm no rollup or surface is built on it (1.6)`,
          'warning');
      }
      if (PAID_PLACEMENT_FIELD.test(k) && !isEmptyValue(value) && value !== false) {
        add('1.9/paid-placement', where, rowId, k, JSON.stringify(value),
          `field "${k}" implements paid or sponsored placement (BUILD-INSTRUCTIONS 1.9)`);
      }
      if (ctx.canonicalRegistry && SPONSOR_FIELD.test(k) && !isEmptyValue(value)) {
        const disclosed = SPONSOR_DISCLOSURE_FIELDS.some(field => !isEmptyValue(node[field]));
        if (!disclosed) {
          add('1.9/undisclosed-sponsor', where, rowId, k, JSON.stringify(value),
            `canonical registry field "${k}" has no ${SPONSOR_DISCLOSURE_FIELDS.join(' / ')} (undisclosed sponsor influence, 1.9)`);
        }
      }
      visit(value, where, rowId, k, inBasis || BASIS_FIELD.test(k), inType || TYPE_FIELD.test(k));
    }
  }

  visit(root, '$', rowIdOf(root), '$', false, false);
  return findings;
}

export function scanFileContent(text, file, ctx = {}) {
  const findings = [];
  if (file.endsWith('.jsonl')) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch (error) {
        findings.push({ rule: 'parse', severity: 'error', pointer: '$', row_id: null, field: null, value: '', message: `${file}:${i + 1}: invalid JSONL: ${error.message}`, line: i + 1, file });
        continue;
      }
      for (const f of scanValue(row, ctx)) findings.push({ ...f, line: i + 1, file });
    }
  } else {
    let doc;
    try {
      doc = JSON.parse(text);
    } catch (error) {
      return [{ rule: 'parse', severity: 'error', pointer: '$', row_id: null, field: null, value: '', message: `${file}: invalid JSON: ${error.message}`, line: null, file }];
    }
    for (const f of scanValue(doc, ctx)) findings.push({ ...f, line: null, file });
  }
  return findings;
}

// ---------------------------------------------------------------- scopes

function listFiles(base, dir, predicate, out = []) {
  const full = path.join(base, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(base, rel, predicate, out);
    else if (predicate(rel)) out.push(rel);
  }
  return out.sort();
}

const isJsonData = rel => /\.jsonl?$/.test(rel);

export function readAllowlist(base) {
  const file = path.join(base, 'data/project/publication-allowlist.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function isHeldPath(allowlist, rel) {
  if ((allowlist.held_exact_paths ?? []).includes(rel)) return true;
  return (allowlist.held_rules ?? []).some(rule => matchesHeldRule(rel, rule));
}

/** Files the gates run over, by tier. Paths are repository-relative, POSIX style. */
export function gateScopes(base = repoRoot) {
  const allowlist = readAllowlist(base);
  const ledger = listFiles(base, 'data/ledger', rel => rel.endsWith('.jsonl') && rel.split('/').length === 3);
  const canonical = listFiles(base, 'data/canonical', rel => rel.endsWith('.json') && rel.split('/').length === 3);
  const cases = listFiles(base, 'cases', rel => rel.endsWith('.jsonl') && rel.split('/').length === 3);
  const core = [...ledger, ...canonical, ...cases];
  const coreSet = new Set(core);
  const published = allowlist
    ? allowlist.paths.filter(rel => isJsonData(rel) && !coreSet.has(rel) && !rel.startsWith('data/intake/') && fs.existsSync(path.join(base, rel)))
    : [];
  const intake = listFiles(base, 'data/intake', isJsonData);
  return { allowlist, core, canonicalRegistry: new Set(canonical), published, intake };
}

/**
 * Run both gates. Blocking scope: canonical ledger/registries, cases, and every
 * JSON data file on the publication allowlist. Intake is scanned for 1.6 only and
 * reported as non-blocking warnings, unless an intake file with findings is itself
 * publishable (listed in the allowlist or not held back), which is an error.
 */
export function checkConstitutionGates({ root: base = repoRoot } = {}) {
  const scopes = gateScopes(base);
  const errors = [];
  const warnings = [];
  const stats = { blocking_files: 0, blocking_bytes: 0, intake_files: 0 };

  const scan = (rel, ctx) => {
    const text = fs.readFileSync(path.join(base, rel), 'utf8');
    stats.blocking_bytes += text.length;
    return scanFileContent(text, rel, ctx);
  };

  for (const rel of [...scopes.core, ...scopes.published]) {
    stats.blocking_files += 1;
    for (const f of scan(rel, { canonicalRegistry: scopes.canonicalRegistry.has(rel) })) {
      (f.severity === 'warning' ? warnings : errors).push({ ...f, scope: scopes.published.includes(rel) ? 'published' : 'canonical' });
    }
  }

  const intakeWithFindings = new Set();
  for (const rel of scopes.intake) {
    stats.intake_files += 1;
    const text = fs.readFileSync(path.join(base, rel), 'utf8');
    for (const f of scanFileContent(text, rel, {})) {
      if (!f.rule.startsWith('1.6/')) continue;
      intakeWithFindings.add(rel);
      warnings.push({ ...f, severity: 'warning', scope: 'intake' });
    }
  }

  if (scopes.allowlist) {
    for (const rel of intakeWithFindings) {
      const listed = scopes.allowlist.paths.includes(rel);
      if (listed || !isHeldPath(scopes.allowlist, rel)) {
        errors.push({
          rule: '1.6/intake-publishable', severity: 'error', scope: 'intake', file: rel, line: null, pointer: '$',
          row_id: null, field: null, value: '',
          message: `${rel} has 1.6 findings but is ${listed ? 'listed in the publication allowlist' : 'not held back by a publication hold rule'}; intake with identity-adjacent cohorts must stay unpublished`,
        });
      }
    }
  }
  return { errors, warnings, stats, scopes };
}

export function formatFinding(f) {
  const where = f.line ? `${f.file}:${f.line}` : f.file;
  const id = f.row_id ? ` row ${JSON.stringify(f.row_id)}` : '';
  const val = f.value ? ` = ${f.value}` : '';
  return `[${f.rule}] ${where}${id} ${f.pointer}${val}\n      ${f.message}`;
}

/** Collapse warnings per file/rule/field so the owner sees shape and size, not 800 lines. */
export function groupWarnings(warnings) {
  const groups = new Map();
  for (const w of warnings) {
    const key = `${w.file}|${w.rule}|${w.field ?? ''}`;
    const group = groups.get(key) ?? { file: w.file, rule: w.rule, field: w.field, scope: w.scope, count: 0, lines: [], sample: w };
    group.count += 1;
    if (w.line && group.lines.length < 6) group.lines.push(w.line);
    groups.set(key, group);
  }
  return [...groups.values()];
}
