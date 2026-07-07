#!/usr/bin/env node
// Cross-case join layer (BUILD-INSTRUCTIONS 3.2).
//
// Identity is kind-based (tools/lib/axm-identity.mjs): every actor,
// organization, and surface derives an AXM entity id from (kind, label), so the
// SAME entity mentioned in two independently built cases derives the SAME id.
// That is the join precondition. This tool reads every pipeline case's built
// identity artifact (build/cases/<id>/axm-identity.json) and groups entities
// ACROSS cases by shared AXM id: an entity in case A joins an entity in case B
// when any of A's ids (canonical or alias-derived) equals any of B's ids.
//
// Joins are mechanical — a deterministic function of the identity layer. Denials
// are canonical: a match may be suppressed only by an entry in the OPTIONAL
// data/canonical/join-exclusions.json, and an excluded match is MOVED to the
// `excluded` array WITH its members and reason, never silently dropped
// (constitution 1.4 — canonical controls identity, and a denial must stay
// visible). A dangling exclusion (one whose id has no multi-case match) is a
// defect: the denial no longer denies anything. That is caught by validate:release.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, readJson, writeJson, root } from './lib/ledger.mjs';

export const JOIN_RULE =
  'Entities across cases are the same entity when any of their kind-based AXM ids (canonical label or alias-derived) coincide; joins are derived mechanically from the identity layer and denials live only in data/canonical/join-exclusions.json.';

// Derive the raw cross-case matches from a list of per-case identity layers.
// caseIdentities: [{ case_id, entities: [{ local_id, label, kind, axm_entity_id,
// alias_axm_ids }] }]. Returns matches sorted by axm_entity_id; members sorted
// by (case_id, local_id). Only entities present in >= 2 cases become a match.
export function deriveMatches(caseIdentities) {
  const members = [];
  for (const ci of caseIdentities) {
    for (const e of ci.entities) {
      members.push({
        case_id: ci.case_id,
        local_id: e.local_id,
        label: e.label,
        kind: e.kind,
        canonical: e.axm_entity_id,
        ids: [e.axm_entity_id, ...(e.alias_axm_ids ?? [])],
      });
    }
  }

  // Union-find over members that share any id (canonical or alias-derived).
  const parent = members.map((_, i) => i);
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  const idToMembers = new Map();
  members.forEach((m, i) => {
    for (const id of m.ids) {
      if (!idToMembers.has(id)) idToMembers.set(id, []);
      idToMembers.get(id).push(i);
    }
  });
  for (const idxs of idToMembers.values()) {
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);
  }

  const comps = new Map();
  members.forEach((_, i) => {
    const r = find(i);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r).push(members[i]);
  });

  const matches = [];
  for (const comp of comps.values()) {
    const caseIds = new Set(comp.map(m => m.case_id));
    if (caseIds.size < 2) continue; // a join needs the entity in >= 2 cases

    // The matching id is an id carried by >= 2 members of the component. Prefer
    // the one that is the canonical id of the most members, so the join is
    // labelled by its canonical AXM id; via is "canonical_label" only when every
    // member's canonical id already equals it, else the join required an alias.
    const idCount = new Map();
    for (const m of comp) for (const id of m.ids) idCount.set(id, (idCount.get(id) ?? 0) + 1);
    const shared = [...idCount.entries()].filter(([, c]) => c >= 2).map(([id]) => id);
    const canonicalCount = id => comp.filter(m => m.canonical === id).length;
    shared.sort((a, b) => canonicalCount(b) - canonicalCount(a) || a.localeCompare(b));
    const axmId = shared[0];
    const via = comp.every(m => m.canonical === axmId) ? 'canonical_label' : 'alias';

    const memberRows = comp
      .map(m => {
        const row = { case_id: m.case_id, local_id: m.local_id, label: m.label };
        if (m.canonical !== axmId) row.alias_matched = axmId;
        return row;
      })
      .sort((a, b) => a.case_id.localeCompare(b.case_id) || a.local_id.localeCompare(b.local_id));

    matches.push({ axm_entity_id: axmId, kind: comp[0].kind, via, members: memberRows });
  }
  matches.sort((a, b) => a.axm_entity_id.localeCompare(b.axm_entity_id));
  return matches;
}

// Partition raw matches into joins vs excluded (per canonical denials), and
// surface any dangling exclusions (an exclusion whose id has no multi-case
// match). Pure — the sole authority for both build and validate.
export function computeJoins(caseIdentities, exclusions = []) {
  const matches = deriveMatches(caseIdentities);
  const exclById = new Map(exclusions.map(e => [e.axm_entity_id, e]));
  const joins = [];
  const excluded = [];
  for (const m of matches) {
    const ex = exclById.get(m.axm_entity_id);
    if (ex) {
      excluded.push({
        axm_entity_id: m.axm_entity_id,
        reason: ex.reason,
        decided_by: ex.decided_by,
        date: ex.date,
        members: m.members,
      });
    } else {
      joins.push(m);
    }
  }
  const matchIds = new Set(matches.map(m => m.axm_entity_id));
  const dangling = exclusions.filter(e => !matchIds.has(e.axm_entity_id));
  return { joins, excluded, dangling, matchIds };
}

// Recompute joins and compare to the built artifact. Returns { errors }.
// Shared by validate:release and the join tests.
export function checkJoins({ built, caseIdentities, exclusions = [] }) {
  const errors = [];
  const recomputed = computeJoins(caseIdentities, exclusions);
  if (JSON.stringify(built.joins ?? []) !== JSON.stringify(recomputed.joins)) {
    errors.push('build/joins.json joins drift from the identity layer — run npm run build:joins');
  }
  if (JSON.stringify(built.excluded ?? []) !== JSON.stringify(recomputed.excluded)) {
    errors.push('build/joins.json excluded drift from the identity layer — run npm run build:joins');
  }
  for (const d of recomputed.dangling) {
    errors.push(`join-exclusions.json references ${d.axm_entity_id} which has no multi-case match (dangling denial — it no longer denies anything)`);
  }
  return { errors, recomputed };
}

// Read every pipeline case's built identity artifact.
export function loadCaseIdentities() {
  const { cases } = loadCases();
  return cases.map(c => ({
    case_id: c.id,
    entities: readJson(`build/cases/${c.id}/axm-identity.json`).entities,
  }));
}

// Optional canonical denials. Absence is normal — do NOT create the file.
export function loadExclusions() {
  const rel = 'data/canonical/join-exclusions.json';
  if (!fs.existsSync(path.join(root, rel))) return [];
  return readJson(rel).exclusions ?? [];
}

function main() {
  const caseIdentities = loadCaseIdentities();
  const exclusions = loadExclusions();
  const { joins, excluded, dangling } = computeJoins(caseIdentities, exclusions);

  for (const d of dangling) {
    console.warn(`build-joins: WARNING dangling exclusion ${d.axm_entity_id} has no multi-case match (validate:release will fail on this)`);
  }

  writeJson('build/joins.json', {
    generated: new Date().toISOString(),
    rule: JOIN_RULE,
    joins,
    excluded,
  });

  console.log(`build-joins: ${joins.length} cross-case join(s), ${excluded.length} excluded (denied).`);
  for (const j of joins) {
    console.log(`  ${j.kind} ${j.axm_entity_id} via ${j.via}: ${j.members.map(m => `${m.case_id}:${m.local_id}`).join(' + ')}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) main();
