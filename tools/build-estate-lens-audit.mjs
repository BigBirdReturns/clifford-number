#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const readJsonl = rel => read(rel).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(JSON.parse);
const exists = rel => fs.existsSync(path.join(root, rel));
const writeJson = (rel, value) => {
  const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const write = (rel, value) => {
  const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value);
};
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const uniq = values => [...new Set(values.filter(Boolean))];
const slugLabel = value => String(value ?? '').replace(/^source-route:[^:]+:/, '').replace(/^custody:[^:]+:/, '').replace(/[-_:]+/g, ' ').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const thesis = readJson('data/project/core-thesis.json');
const alignment = readJson('data/project/estate-thesis-alignment.json');
const shock = readJson('data/project/phase-shocks/ukraine-war.json');
const methodology = readJson('data/project/estate-lens-audit-methodology.json');
const explicitMappings = readJsonl('data/project/estate-lens-mappings.jsonl');
const estateIndex = readJson('build/estates/index.json');
const catalog = readJson('build/public-catalog.json');
const reportFrontier = readJson('build/report-frontier.json');

const phaseById = new Map(thesis.historical_phases.map(item => [item.phase_id, item]));
const stageById = new Map(thesis.conversion_stages.map(item => [item.stage_id, item]));
const archetypeById = new Map(thesis.archetypes.map(item => [item.archetype_id, item]));
const alignmentByEstate = new Map(alignment.estates.map(item => [item.estate_id, item]));
const mappingByKey = new Map(explicitMappings.map(item => [`${item.estate_id}|${item.object_kind}|${item.object_id}`, item]));
const caseById = new Map((catalog.cases ?? []).map(item => [item.case_id, item]));
const trackById = new Map((catalog.tracks ?? []).map(item => [item.track_id, item]));
const reportByCase = new Map((reportFrontier.cases ?? []).filter(item => item.report_id).map(item => [item.case_id, item]));
const directShock = new Set(shock.direct_estate_ids ?? []);
const adjacentShock = new Set(shock.adjacent_estate_ids ?? []);

const stageRules = [
  ['C7-reversibility-and-counterpower', /\b(?:gao|court|pacer|adjudicat|appeal|protest|audit|inspector|recusal|ethics|termination|substitution|unsuccessful|denied|rejected|null|control case|comparator|review|clawback|recovery|default)\b/i],
  ['C5-dependency-and-compulsion', /\b(?:mandatory|required|accredit|fedramp|continuity|dependency|interoperab|portab|workflow|access control|lock-in|indispensable|operating system|platform|default|marketplace|identity and access)\b/i],
  ['C4-control-architecture', /\b(?:data rights|interface|standard|patent|assignment|license|intellectual property|governance right|board right|deed|title|lease|mortgage|lien|ucc|secured debt|ontology|schema|source code|technical baseline|architecture|ownership|beneficial owner|corporate control)\b/i],
  ['C6-residual-value', /\b(?:outlay|payment|revenue|equity|valuation|financ|capital|bond|tax increment|opportunity zone|land value|residual|profit|compensation|stock|award amount|obligation|subsidy|incentive|royalty|recurring)\b/i],
  ['C3-public-conversion', /\b(?:contract|award|procure|solicitation|approval|authoriz|appropriat|grant|order|appointment|resolution|program of record|prototype|acceptance|public authority|zoning|incentive agreement|production agreement)\b/i],
  ['C2-option-set-formation', /\b(?:cohort|denominator|accelerator|fund|portfolio|selection|eligib|market research|supplier|vendor|evaluation|testing|prototype|fellowship|roster|competition|candidate|challenge)\b/i],
  ['C1-agenda-formation', /\b(?:policy|strategy|doctrine|agenda|consultation|conven|dialog|task force|commission|action plan|recommendation|lobby|advis|problem frame|planning narrative|legitim|think tank|philanthrop)\b/i],
];

const defaultStagesByKind = {
  estate_root: [],
  asset_ref: [],
  case: ['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C7-reversibility-and-counterpower'],
  research_track: ['C2-option-set-formation','C7-reversibility-and-counterpower'],
  estate_slice: ['C3-public-conversion','C4-control-architecture','C6-residual-value'],
  frontier_survey: ['C1-agenda-formation','C2-option-set-formation','C7-reversibility-and-counterpower'],
  source_route: [],
  game_trail: [],
  report: ['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C4-control-architecture','C5-dependency-and-compulsion','C6-residual-value','C7-reversibility-and-counterpower'],
  fog_item: [],
  next_acquisition: [],
};

const archetypesByStage = {
  'C1-agenda-formation':['A1-convener','A2-translator','A9-legitimizer'],
  'C2-option-set-formation':['A2-translator','A3-selector','A5-personnel-router','A9-legitimizer'],
  'C3-public-conversion':['A4-public-market-maker','A6-paper-architect'],
  'C4-control-architecture':['A6-paper-architect','A7-integrator-platform-owner','A8-residual-rights-holder'],
  'C5-dependency-and-compulsion':['A6-paper-architect','A7-integrator-platform-owner'],
  'C6-residual-value':['A4-public-market-maker','A8-residual-rights-holder'],
  'C7-reversibility-and-counterpower':['A6-paper-architect','A10-adjudicator'],
};

function suggestStages(kind, text) {
  const hits = stageRules.filter(([, re]) => re.test(text)).map(([id]) => id);
  const defaults = defaultStagesByKind[kind] ?? [];
  const result = uniq([...hits, ...defaults]).filter(id => stageById.has(id));
  if (result.length) return result;
  return [];
}

function suggestArchetypes(stageIds) {
  return uniq(stageIds.flatMap(id => archetypesByStage[id] ?? [])).filter(id => archetypeById.has(id));
}

function shockFor(estateId, text) {
  const objectDirect = /\b(?:ukraine|russia|nato|munition|ammunition|artillery|drone|uav|battlefield|combat|electronic warfare|air defence|air defense|stockpile|rearmament|mobilization|mobilisation|readiness|allied production|commercial space|satellite)\b/i.test(text);
  let state = 'not_reached';
  if (objectDirect) state = 'direct_object_candidate';
  else if (directShock.has(estateId)) state = 'estate_inherited_direct_candidate';
  else if (adjacentShock.has(estateId)) state = 'estate_inherited_adjacent_candidate';
  const subphaseIds = [];
  if (/\b(?:2022|2023|emergency|stockpile|transfer|improvis)\b/i.test(text)) subphaseIds.push('U1-emergency-improvisation-stockpile-liquidation');
  if (/\b(?:production|capacity|rearmament|industrial|munition|ammunition|shell|explosive|supply chain)\b/i.test(text)) subphaseIds.push('U2-coalition-rearmament-industrial-catchup');
  if (/\b(?:battlefield|combat|drone|uav|telemetry|marketplace|rapid adoption|electronic warfare|feedback|delta)\b/i.test(text)) subphaseIds.push('U3-battlefield-integrated-market-making');
  if (/\b(?:readiness|standard|alliance|framework|continuity|mobilization|mobilisation|permanent|interoperab|accredit)\b/i.test(text)) subphaseIds.push('U4-permanent-readiness-mobilized-infrastructure');
  if (!subphaseIds.length && state === 'estate_inherited_direct_candidate') subphaseIds.push(...shock.subphases.map(item => item.subphase_id));
  if (!subphaseIds.length && state === 'estate_inherited_adjacent_candidate') subphaseIds.push('U4-permanent-readiness-mobilized-infrastructure');
  return { state, candidate_subphase_ids: uniq(subphaseIds), mapping_status: state === 'not_reached' ? 'not_reached' : 'machine_suggested_not_evidence' };
}

function sequenceBand(kind, stages, unresolved) {
  if (unresolved) return 'unresolved_requires_review';
  if (['case','report','asset_ref','fog_item','next_acquisition'].includes(kind) && stages.some(id => ['C4-control-architecture','C5-dependency-and-compulsion','C7-reversibility-and-counterpower'].includes(id))) return 'decisive_instrument_or_control';
  if (stages.some(id => ['C1-agenda-formation','C2-option-set-formation','C3-public-conversion','C6-residual-value'].includes(id))) return 'conversion_or_option_set';
  return 'custody_or_source_infrastructure';
}

function objectRow({ estate, kind, id, label, description = '', membership = 'origin', sourceRefs = [] }) {
  const inherited = alignmentByEstate.get(estate.estate_id);
  const explicit = mappingByKey.get(`${estate.estate_id}|${kind}|${id}`);
  const fullText = [estate.label, estate.domain, label, description, ...sourceRefs].join(' ');
  const suggestedStages = explicit?.conversion_stage_ids ?? suggestStages(kind, fullText);
  const suggestedArchetypes = explicit?.archetype_ids ?? suggestArchetypes(suggestedStages);
  const unresolved = !explicit && suggestedStages.length === 0;
  const mapState = kind === 'estate_root' || explicit ? 'explicit_mapped' : unresolved ? 'unresolved' : 'known_unmapped';
  const shockState = shockFor(estate.estate_id, fullText);
  return {
    object_key: `${estate.estate_id}::${kind}::${id}`,
    estate_id: estate.estate_id,
    estate_label: estate.label,
    object_kind: kind,
    object_id: id,
    label,
    description,
    membership,
    source_refs: uniq(sourceRefs),
    mapping_state: mapState,
    explicit_mapping_id: explicit?.mapping_id ?? null,
    inherited_alignment_ref: `data/project/estate-thesis-alignment.json#${estate.estate_id}`,
    candidate_phase_ids: explicit?.phase_ids ?? [],
    candidate_conversion_stage_ids: suggestedStages,
    candidate_archetype_ids: suggestedArchetypes,
    candidate_status: explicit ? 'explicit_checked_in_mapping' : unresolved ? 'requires_human_mapping' : 'machine_suggested_not_evidence',
    sequence_band: sequenceBand(kind, suggestedStages, unresolved),
    ukraine_war_shock: shockState,
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
  };
}

const objects = [];
function add(row) {
  if (!objects.some(item => item.object_key === row.object_key)) objects.push(row);
}

for (const estate of estateIndex.estates) {
  const alignmentRow = alignmentByEstate.get(estate.estate_id);
  add({
    object_key: `${estate.estate_id}::estate_root::${estate.estate_id}`,
    estate_id: estate.estate_id,
    estate_label: estate.label,
    object_kind: 'estate_root',
    object_id: estate.estate_id,
    label: estate.label,
    description: estate.scope,
    membership: 'root',
    source_refs: [`data/estates/definitions/${estate.estate_id}.json`, 'data/project/estate-thesis-alignment.json'],
    mapping_state: 'explicit_mapped',
    explicit_mapping_id: `estate-root:${estate.estate_id}`,
    inherited_alignment_ref: `data/project/estate-thesis-alignment.json#${estate.estate_id}`,
    candidate_phase_ids: [],
    candidate_conversion_stage_ids: [],
    candidate_archetype_ids: [],
    candidate_status: 'explicit_checked_in_mapping',
    sequence_band: 'custody_or_source_infrastructure',
    ukraine_war_shock: shockFor(estate.estate_id, `${estate.label} ${estate.domain} ${estate.scope}`),
    promotes_to: 'candidate_only', graph_effect:'none', conclusion_generated:false
  });

  for (const [index, asset] of (estate.asset_refs ?? []).entries()) {
    const id = asset.path ?? asset.ref ?? `asset-${index + 1}`;
    add(objectRow({ estate, kind:'asset_ref', id, label: asset.role ?? slugLabel(id), description: `${asset.kind ?? ''} ${id}`, sourceRefs:[id] }));
  }

  for (const id of estate.membership?.primary_cases ?? []) {
    const row = caseById.get(id); add(objectRow({ estate, kind:'case', id, label: row?.title ?? id, description: row?.subtitle ?? '', membership:'primary', sourceRefs:[row?.href, `data/estates/case-map.jsonl`] }));
  }
  for (const id of estate.membership?.related_cases ?? []) {
    const row = caseById.get(id); add(objectRow({ estate, kind:'case', id, label: row?.title ?? id, description: row?.subtitle ?? '', membership:'related', sourceRefs:[row?.href, `data/estates/case-map.jsonl`] }));
  }
  for (const id of estate.membership?.primary_tracks ?? []) {
    const row = trackById.get(id); add(objectRow({ estate, kind:'research_track', id, label: row?.label ?? id, description: row?.question ?? '', membership:'primary', sourceRefs:[row?.href, 'data/estates/track-map.jsonl'] }));
  }
  for (const id of estate.membership?.related_tracks ?? []) {
    const row = trackById.get(id); add(objectRow({ estate, kind:'research_track', id, label: row?.label ?? id, description: row?.question ?? '', membership:'related', sourceRefs:[row?.href, 'data/estates/track-map.jsonl'] }));
  }
  for (const id of estate.membership?.primary_slices ?? []) add(objectRow({ estate, kind:'estate_slice', id, label:slugLabel(id), membership:'primary', sourceRefs:['data/estates/slice-map.jsonl'] }));
  for (const id of estate.membership?.related_slices ?? []) add(objectRow({ estate, kind:'estate_slice', id, label:slugLabel(id), membership:'related', sourceRefs:['data/estates/slice-map.jsonl'] }));

  if (exists(`data/estates/surveys/${estate.estate_id}.json`)) {
    const survey = readJson(`data/estates/surveys/${estate.estate_id}.json`);
    add(objectRow({ estate, kind:'frontier_survey', id:estate.estate_id, label:`${estate.label} frontier survey`, description:[survey.research_question, survey.decisive_next_acquisition].filter(Boolean).join(' '), sourceRefs:[`data/estates/surveys/${estate.estate_id}.json`] }));
  }

  const packetPath = `build/estate-game-trails/estates/${estate.estate_id}.json`;
  if (exists(packetPath)) {
    const packet = readJson(packetPath);
    for (const id of packet.source_route_trail_ids ?? []) {
      const sourcePath = `build/estate-game-trails/source-routes/${id.replace(/:/g,'-')}.json`;
      let description = '';
      if (exists(sourcePath)) {
        const route = readJson(sourcePath); description = [route.route_label, route.source_label, route.residual_fog, route.next_acquisition].filter(Boolean).join(' ');
      }
      add(objectRow({ estate, kind:'source_route', id, label:slugLabel(id), description, sourceRefs:[sourcePath] }));
    }
    for (const id of packet.legacy_trail_ids ?? []) add(objectRow({ estate, kind:'game_trail', id, label:slugLabel(id), description:'Preserved authored trail', sourceRefs:[`build/estate-game-trails/legacy/${id}.json`] }));
    for (const id of packet.custody_trail_ids ?? []) add(objectRow({ estate, kind:'game_trail', id, label:slugLabel(id), description:'Canonical custody trail', sourceRefs:[`build/estate-game-trails/custody/${id.replace(/:/g,'-')}.json`] }));
    const frontierId = packet.frontier_summary?.trail_id;
    if (frontierId) add(objectRow({ estate, kind:'game_trail', id:frontierId, label:`${estate.label} frontier summary`, description:packet.frontier_summary?.residual_fog ?? '', sourceRefs:[packetPath] }));
  }

  for (const caseId of [...(estate.membership?.primary_cases ?? []), ...(estate.membership?.related_cases ?? [])]) {
    const report = reportByCase.get(caseId);
    if (report) add(objectRow({ estate, kind:'report', id:report.report_id, label:report.title, description:`${report.current_stage} → ${report.next_transition}`, membership:(estate.membership?.primary_cases ?? []).includes(caseId) ? 'primary_case_report' : 'related_case_report', sourceRefs:[`briefs/${report.report_id}.html`, 'build/report-frontier.json'] }));
  }

  for (const [index, fog] of (estate.fog ?? []).entries()) add(objectRow({ estate, kind:'fog_item', id:`fog-${index+1}`, label:fog, description:`Dominant fog: ${estate.dominant_fog}`, sourceRefs:[`data/estates/definitions/${estate.estate_id}.json`] }));
  if (estate.next_acquisition?.operation) add(objectRow({ estate, kind:'next_acquisition', id:'next-acquisition', label:estate.next_acquisition.operation, description:estate.next_acquisition.decisive_output ?? '', sourceRefs:[`data/estates/definitions/${estate.estate_id}.json`] }));
}

objects.sort((a,b) => a.estate_id.localeCompare(b.estate_id) || a.object_kind.localeCompare(b.object_kind) || a.object_id.localeCompare(b.object_id));

const countBy = (items, key) => Object.fromEntries([...items.reduce((m,item)=>m.set(item[key],(m.get(item[key])??0)+1),new Map())].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
const stageCandidateCounts = Object.fromEntries(thesis.conversion_stages.map(stage => [stage.stage_id, objects.filter(item => item.mapping_state !== 'explicit_mapped' && item.candidate_conversion_stage_ids.includes(stage.stage_id)).length]));
const estatePackets = estateIndex.estates.map(estate => {
  const rows = objects.filter(item => item.estate_id === estate.estate_id);
  const unmapped = rows.filter(item => item.mapping_state === 'known_unmapped');
  const unresolved = rows.filter(item => item.mapping_state === 'unresolved');
  return {
    estate_id: estate.estate_id,
    estate_label: estate.label,
    generation: estate.generation,
    inherited_alignment: { alignment_ref: `data/project/estate-thesis-alignment.json#${estate.estate_id}`, mapping_state: 'explicit_estate_root_alignment' },
    counts: {
      known_objects: rows.length,
      explicit_mapped: rows.filter(item => item.mapping_state === 'explicit_mapped').length,
      known_unmapped: unmapped.length,
      unresolved: unresolved.length,
      ukraine_direct_or_adjacent_candidates: rows.filter(item => item.ukraine_war_shock.state !== 'not_reached').length,
    },
    object_kind_counts: countBy(rows, 'object_kind'),
    mapping_state_counts: countBy(rows, 'mapping_state'),
    sequence_band_counts: countBy(rows.filter(item => item.mapping_state !== 'explicit_mapped'), 'sequence_band'),
    candidate_stage_counts: Object.fromEntries(thesis.conversion_stages.map(stage => [stage.stage_id, rows.filter(item => item.mapping_state !== 'explicit_mapped' && item.candidate_conversion_stage_ids.includes(stage.stage_id)).length])),
    decisive_mapping_queue: rows.filter(item => item.mapping_state !== 'explicit_mapped' && item.sequence_band === 'decisive_instrument_or_control').map(item => item.object_key),
    conversion_mapping_queue: rows.filter(item => item.mapping_state !== 'explicit_mapped' && item.sequence_band === 'conversion_or_option_set').map(item => item.object_key),
    infrastructure_mapping_queue: rows.filter(item => item.mapping_state !== 'explicit_mapped' && item.sequence_band === 'custody_or_source_infrastructure').map(item => item.object_key),
    unresolved_queue: unresolved.map(item => item.object_key),
    ukraine_shock_queue: rows.filter(item => item.ukraine_war_shock.state !== 'not_reached').map(item => item.object_key),
    next_action: `Review ${unmapped.length + unresolved.length} inherited-only or unresolved objects and admit only object-specific phase, stage, archetype, shock, and report mappings supported by their own records.`,
    graph_effect:'none', conclusion_generated:false, estate_completion_claimed:false,
  };
});

const audit = {
  schema_version:'estate-lens-audit@1',
  audit_id:methodology.audit_id,
  as_of:methodology.as_of,
  thesis_id:thesis.thesis_id,
  phase_shock_id:shock.shock_id,
  methodology,
  counts:{
    estates:estatePackets.length,
    known_object_memberships:objects.length,
    explicit_mapped:objects.filter(item=>item.mapping_state==='explicit_mapped').length,
    known_unmapped:objects.filter(item=>item.mapping_state==='known_unmapped').length,
    unresolved:objects.filter(item=>item.mapping_state==='unresolved').length,
    ukraine_direct_object_candidates:objects.filter(item=>item.ukraine_war_shock.state==='direct_object_candidate').length,
    ukraine_inherited_direct_candidates:objects.filter(item=>item.ukraine_war_shock.state==='estate_inherited_direct_candidate').length,
    ukraine_inherited_adjacent_candidates:objects.filter(item=>item.ukraine_war_shock.state==='estate_inherited_adjacent_candidate').length,
  },
  object_kind_counts:countBy(objects,'object_kind'),
  mapping_state_counts:countBy(objects,'mapping_state'),
  sequence_band_counts:countBy(objects.filter(item=>item.mapping_state!=='explicit_mapped'),'sequence_band'),
  candidate_stage_counts:stageCandidateCounts,
  estates:estatePackets,
  objects,
  boundaries:methodology.boundaries,
  promotes_to:'candidate_only', graph_effect:'none', conclusion_generated:false, estate_completion_claimed:false,
};
audit.fingerprint = hash({counts:audit.counts,objects:objects.map(item=>[item.object_key,item.mapping_state,item.candidate_conversion_stage_ids,item.ukraine_war_shock.state])}).slice(0,24);

function renderMarkdown() {
  const lines = [
    '# Known but unmapped estate sections', '',
    '> Estate-root alignment is complete. Object-level alignment is not. These counts describe mapping debt, not evidentiary weakness, importance, risk, or wrongdoing.', '',
    `- Estates: **${audit.counts.estates}**`,
    `- Known object memberships: **${audit.counts.known_object_memberships}**`,
    `- Explicitly object-mapped: **${audit.counts.explicit_mapped}**`,
    `- Known but unmapped: **${audit.counts.known_unmapped}**`,
    `- Unresolved even for conservative routing: **${audit.counts.unresolved}**`,
    `- Ukraine-shock direct object candidates: **${audit.counts.ukraine_direct_object_candidates}**`, '',
    '## Mapping debt by estate', '',
    '| Estate | Known | Explicit | Unmapped | Unresolved | Ukraine lens |',
    '|---|---:|---:|---:|---:|---:|',
    ...estatePackets.map(item => `| ${item.estate_label} | ${item.counts.known_objects} | ${item.counts.explicit_mapped} | ${item.counts.known_unmapped} | ${item.counts.unresolved} | ${item.counts.ukraine_direct_or_adjacent_candidates} |`),
    '', '## Candidate conversion-stage workload', '',
    ...thesis.conversion_stages.map(stage => `- **${stage.label}:** ${stageCandidateCounts[stage.stage_id]} inherited-only or unresolved object memberships`),
    '', '## Operating law', '',
    '```text',
    'known custody object',
    '→ inherited estate context',
    '→ object-specific mapping review',
    '→ explicit phase / conversion stage / archetype / shock mapping',
    '→ evidence and report use only after the normal claim and review gates',
    '```', '',
    'Machine stage suggestions are routing aids. They create no claim, intentionality assignment, graph effect, conclusion, allegation, or publication approval.', ''
  ];
  return lines.join('\n');
}

function renderEstatePacket(packet) {
  const rows = objects.filter(item => item.estate_id === packet.estate_id && item.mapping_state !== 'explicit_mapped');
  const lines = [
    `# Full-lens mapping lane: ${packet.estate_label}`, '',
    '> This packet inventories known custody and acquisition objects that still lack an explicit object-level mapping under the core thesis. Inherited estate context is not a finding.', '',
    `- Known objects: **${packet.counts.known_objects}**`,
    `- Explicitly mapped: **${packet.counts.explicit_mapped}**`,
    `- Known but unmapped: **${packet.counts.known_unmapped}**`,
    `- Unresolved: **${packet.counts.unresolved}**`,
    `- Ukraine-shock candidates: **${packet.counts.ukraine_direct_or_adjacent_candidates}**`, '',
    '## Inherited conversion context', '',
    `- ${packet.inherited_alignment?.alignment_ref ?? 'alignment missing'}`, '',
    '## Decisive instrument and control queue', '',
    ...rows.filter(item=>item.sequence_band==='decisive_instrument_or_control').slice(0,30).map(item => `- **${item.object_kind}: ${item.label}** — candidate stages: ${item.candidate_conversion_stage_ids.map(id=>stageById.get(id)?.label??id).join(', ') || 'unresolved'}`),
    '', '## Conversion and option-set queue', '',
    ...rows.filter(item=>item.sequence_band==='conversion_or_option_set').slice(0,30).map(item => `- **${item.object_kind}: ${item.label}** — candidate stages: ${item.candidate_conversion_stage_ids.map(id=>stageById.get(id)?.label??id).join(', ') || 'unresolved'}`),
    '', '## Custody and source-infrastructure queue', '',
    ...rows.filter(item=>item.sequence_band==='custody_or_source_infrastructure').slice(0,30).map(item => `- **${item.object_kind}: ${item.label}** — candidate stages: ${item.candidate_conversion_stage_ids.map(id=>stageById.get(id)?.label??id).join(', ') || 'unresolved'}`),
    '', '## Ukraine-war shock queue', '',
    ...rows.filter(item=>item.ukraine_war_shock.state!=='not_reached').slice(0,30).map(item => `- **${item.object_kind}: ${item.label}** — ${item.ukraine_war_shock.state}; subphases: ${item.ukraine_war_shock.candidate_subphase_ids.join(', ') || 'requires review'}`),
    '', '## Next action', '', packet.next_action, '',
    '`promotes_to: candidate_only` · `graph_effect: none` · `conclusion_generated: false` · `estate_completion_claimed: false`', ''
  ];
  return lines.join('\n');
}

function renderHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Known but unmapped estate sections</title>
<style>
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#f7f4ed}body{margin:0}.shell{max-width:1500px;margin:auto;padding:28px}.kicker{font:600 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.lede{font-size:1.15rem;max-width:88ch}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:24px 0}.metric,.panel{background:#fff;border:1px solid #d8d2c5;border-radius:12px;padding:16px}.metric strong{display:block;font-size:1.8rem}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.controls input,.controls select{font:inherit;padding:9px 11px;border:1px solid #aaa;border-radius:8px;background:#fff}.table-wrap{overflow:auto;background:#fff;border:1px solid #d8d2c5;border-radius:12px}table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{padding:9px 10px;border-bottom:1px solid #ece7dc;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#f0ece2;z-index:1}.pill{display:inline-block;border:1px solid #bbb;border-radius:999px;padding:2px 7px;margin:1px;font-size:.75rem}.boundary{border-left:4px solid #222;padding-left:14px}.hidden{display:none!important}@media(max-width:700px){.shell{padding:16px}table{font-size:.78rem}th,td{padding:7px}}
</style></head><body><main class="shell"><p class="kicker">Core thesis · estate coverage audit</p><h1>Known—but not yet mapped—sections of the estates</h1><p class="lede">Every estate root has a thesis alignment. This view shows the cases, tracks, slices, trails, source routes, reports, instruments, fog items, and acquisition steps that still inherit that alignment without their own checked-in phase, conversion-stage, archetype, and Ukraine-shock mapping.</p>
<div class="metrics" id="metrics"></div>
<section class="panel boundary"><strong>Boundary.</strong> Counts are mapping debt, not scores. Suggested stages route review only. A source route, repeated term, trail, phase, or shock association does not prove coordination, intent, control, coercion, profit, or wrongdoing.</section>
<div class="controls"><input id="q" type="search" placeholder="Search estate or object"><select id="estate"><option value="">All estates</option></select><select id="kind"><option value="">All object kinds</option></select><select id="state"><option value="">All mapping states</option><option>explicit_mapped</option><option>known_unmapped</option><option>unresolved</option></select><select id="stage"><option value="">All candidate stages</option></select><select id="shock"><option value="">All Ukraine lens states</option><option>direct_object_candidate</option><option>estate_inherited_direct_candidate</option><option>estate_inherited_adjacent_candidate</option><option>not_reached</option></select></div>
<p id="status">Loading audit…</p><div class="table-wrap"><table><thead><tr><th>Estate</th><th>Kind</th><th>Object</th><th>Mapping</th><th>Candidate stages</th><th>Ukraine shock</th><th>Sequence</th></tr></thead><tbody id="rows"></tbody></table></div>
</main><script>
const $=s=>document.querySelector(s);const h=v=>String(v??'').replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));const controls=['q','estate','kind','state','stage','shock'];let DATA=null;let OBJECTS=[];
async function load(){DATA=await fetch('data.json').then(r=>{if(!r.ok)throw new Error('manifest '+r.status);return r.json()});const payloads=await Promise.all(DATA.estates.map(e=>fetch('estates/'+e.estate_id+'.json').then(r=>{if(!r.ok)throw new Error(e.estate_id+' '+r.status);return r.json()})));OBJECTS=payloads.flatMap(p=>p.objects);for(const e of DATA.estates){const o=document.createElement('option');o.value=e.estate_id;o.textContent=e.estate_label;$('#estate').append(o)}for(const k of [...new Set(OBJECTS.map(x=>x.object_kind))].sort()){const o=document.createElement('option');o.value=k;o.textContent=k;$('#kind').append(o)}for(const s of DATA.stages){const o=document.createElement('option');o.value=s.stage_id;o.textContent=s.label;$('#stage').append(o)}const c=DATA.counts;$('#metrics').innerHTML=[['Estates',c.estates],['Known memberships',c.known_object_memberships],['Explicit mappings',c.explicit_mapped],['Known unmapped',c.known_unmapped],['Unresolved',c.unresolved],['Ukraine direct objects',c.ukraine_direct_object_candidates]].map(([l,v])=>'<div class="metric"><span>'+h(l)+'</span><strong>'+h(v)+'</strong></div>').join('');render()}
function render(){if(!DATA)return;const f=Object.fromEntries(controls.map(id=>[id,$('#'+id).value.trim().toLowerCase()]));const rows=OBJECTS.filter(x=>(!f.q||JSON.stringify(x).toLowerCase().includes(f.q))&&(!f.estate||x.estate_id===f.estate)&&(!f.kind||x.object_kind===f.kind)&&(!f.state||x.mapping_state===f.state)&&(!f.stage||x.candidate_conversion_stage_ids.includes(f.stage))&&(!f.shock||x.ukraine_war_shock.state===f.shock));$('#status').textContent=rows.length+' object memberships shown';$('#rows').innerHTML=rows.slice(0,1500).map(x=>'<tr><td>'+h(x.estate_label)+'</td><td>'+h(x.object_kind)+'</td><td><strong>'+h(x.label)+'</strong><br><small>'+h(x.object_id)+'</small></td><td>'+h(x.mapping_state)+'</td><td>'+x.candidate_conversion_stage_ids.map(id=>'<span class="pill">'+h(DATA.stages.find(s=>s.stage_id===id)?.label||id)+'</span>').join('')+'</td><td>'+h(x.ukraine_war_shock.state)+'</td><td>'+h(x.sequence_band)+'</td></tr>').join('')}
for(const id of controls)$('#'+id).addEventListener('input',render);load().catch(err=>{$('#status').textContent='Audit failed to load: '+err.message});
</script></body></html>`;
}

const publicManifest = {
  schema_version:'estate-lens-audit-manifest@1',
  audit_id:audit.audit_id,
  as_of:audit.as_of,
  thesis_id:audit.thesis_id,
  phase_shock_id:audit.phase_shock_id,
  counts:audit.counts,
  object_kind_counts:audit.object_kind_counts,
  mapping_state_counts:audit.mapping_state_counts,
  sequence_band_counts:audit.sequence_band_counts,
  candidate_stage_counts:audit.candidate_stage_counts,
  stages:thesis.conversion_stages,
  shock:{shock_id:shock.shock_id,label:shock.label,subphases:shock.subphases,boundary:shock.boundary},
  estates:estatePackets.map(packet => ({
    estate_id:packet.estate_id,
    estate_label:packet.estate_label,
    generation:packet.generation,
    counts:packet.counts,
    object_kind_counts:packet.object_kind_counts,
    mapping_state_counts:packet.mapping_state_counts,
    sequence_band_counts:packet.sequence_band_counts,
    candidate_stage_counts:packet.candidate_stage_counts,
    inherited_alignment:packet.inherited_alignment,
    build_href:`estate-lens-audit/estates/${packet.estate_id}.json`,
    public_href:`unmapped-sections/estates/${packet.estate_id}.json`,
    handoff_href:`estate-lens-fanout/${packet.estate_id}.md`,
  })),
  boundaries:audit.boundaries,
  fingerprint:audit.fingerprint,
  promotes_to:'candidate_only',graph_effect:'none',conclusion_generated:false,estate_completion_claimed:false,
};
writeJson('build/core-thesis/estate-lens-audit-manifest.json', publicManifest);
write('build/core-thesis/estate-lens-audit.md', `${renderMarkdown()}\n`);
writeJson('reports/core-thesis/unmapped-sections/data.json', publicManifest);
for (const packet of estatePackets) {
  const estateObjects = objects.filter(item => item.estate_id === packet.estate_id);
  const estateOutput = {
    schema_version:'estate-lens-audit-estate@1',
    audit_id:audit.audit_id,
    thesis_id:audit.thesis_id,
    phase_shock_id:audit.phase_shock_id,
    estate:packet,
    objects:estateObjects,
    promotes_to:'candidate_only',graph_effect:'none',conclusion_generated:false,estate_completion_claimed:false,
    fingerprint:hash(estateObjects.map(item=>[item.object_key,item.mapping_state,item.candidate_conversion_stage_ids,item.ukraine_war_shock.state])).slice(0,24),
  };
  writeJson(`build/core-thesis/estate-lens-audit/estates/${packet.estate_id}.json`, estateOutput);
  writeJson(`reports/core-thesis/unmapped-sections/estates/${packet.estate_id}.json`, estateOutput);
  write(`build/core-thesis/estate-lens-fanout/${packet.estate_id}.md`, `${renderEstatePacket(packet)}\n`);
}
write('reports/core-thesis/unmapped-sections/index.html', renderHtml());

console.log(`estate-lens-audit: ${audit.counts.known_object_memberships} known object memberships; ${audit.counts.explicit_mapped} explicit; ${audit.counts.known_unmapped} unmapped; ${audit.counts.unresolved} unresolved`);
