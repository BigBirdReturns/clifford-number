#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(root, rel));
const methodology = readJson('data/project/m04e-constitutional-awareness-methodology.json');
const wave = readJson('data/intake/m04e-constitutional-awareness-estate-wave-01.json');
const estate = readJson('data/project/m04e-constitutional-awareness-estate.json');
const build = readJson('build/core-thesis/constitutional-awareness/manifest.json');
const report = readJson('reports/core-thesis/constitutional-awareness/data.json');
const errors=[]; const assert=(v,m)=>{if(!v)errors.push(m)};
const unique=(items,key,label)=>assert(new Set(items.map(x=>x[key])).size===items.length,`duplicate ${label}`);

assert(methodology.schema_version==='m04e-constitutional-awareness-methodology@1','methodology schema mismatch');
assert(wave.schema_version==='m04e-constitutional-awareness-wave@1','wave schema mismatch');
assert(estate.schema_version==='m04e-constitutional-awareness-estate@1','estate schema mismatch');
assert(estate.status==='candidate_cross_estate'&&wave.status==='candidate_cross_estate','estate must remain candidate cross-estate');
assert(wave.estate_id===estate.estate_id,'estate id mismatch');
unique(methodology.class_catalog,'class_id','class id'); unique(wave.source_registry,'source_id','source id'); unique(wave.subjects,'subject_id','subject id'); unique(wave.records,'record_id','record id');

const positions=new Set(methodology.axes.constitutional_position.map(x=>x.position_id));
const awareness=new Set(methodology.axes.awareness_level.map(x=>x.awareness_id));
const orientations=new Set(methodology.axes.orientation.map(x=>x.orientation_id));
const powers=new Set(methodology.axes.effective_power_level.map(x=>x.power_id));
const materials=new Set(methodology.axes.material_relation.map(x=>x.material_id));
const actions=new Set(methodology.axes.action_rights);
const classes=new Map(methodology.class_catalog.map(x=>[x.class_id,x]));
const sources=new Set(wave.source_registry.map(x=>x.source_id));
const subjects=new Set(wave.subjects.map(x=>x.subject_id));
const terminal=new Set(methodology.terminal_states);
const forbidden=/\b(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|verdict|publication_approval)\b/i;

for(const source of wave.source_registry){
  assert(/^https?:\/\//.test(source.url||''),`${source.source_id} lacks safe public URL`);
  assert(source.publisher&&source.title&&source.source_type,`${source.source_id} lacks source metadata`);
}
for(const record of wave.records){
  const c=record.classification||{};
  assert(record.subject_ids?.length>0,`${record.record_id} lacks subjects`); for(const id of record.subject_ids||[])assert(subjects.has(id),`${record.record_id} missing subject ${id}`);
  assert(record.source_ids?.length>0||record.disposition!=='supported_for_human_review',`${record.record_id} supported without source`); for(const id of record.source_ids||[])assert(sources.has(id),`${record.record_id} missing source ${id}`);
  assert(record.proposition&&record.observation&&record.supports?.length&&record.does_not_support?.length,`${record.record_id} incomplete evidence contract`);
  assert(terminal.has(record.disposition),`${record.record_id} invalid disposition`);
  assert(c.constitutional_position_ids?.length>0,`${record.record_id} lacks position`); for(const id of c.constitutional_position_ids||[])assert(positions.has(id),`${record.record_id} unknown position ${id}`);
  assert(awareness.has(c.awareness_id),`${record.record_id} invalid awareness`); assert(orientations.has(c.orientation_id),`${record.record_id} invalid orientation`); assert(powers.has(c.effective_power_id),`${record.record_id} invalid power`);
  assert(c.material_relation_ids?.length>0,`${record.record_id} lacks material relation`); for(const id of c.material_relation_ids||[])assert(materials.has(id),`${record.record_id} unknown material ${id}`);
  for(const id of c.action_rights||[])assert(actions.has(id),`${record.record_id} unknown action/capacity ${id}`);
  assert(c.class_ids?.length>0,`${record.record_id} lacks class`);
  for(const id of c.class_ids||[]){
    const cls=classes.get(id); assert(Boolean(cls),`${record.record_id} unknown class ${id}`); if(!cls)continue;
    assert(cls.awareness_range.includes(c.awareness_id),`${record.record_id} awareness outside ${id}`);
    assert(cls.orientation_range.includes(c.orientation_id),`${record.record_id} orientation outside ${id}`);
    assert(c.constitutional_position_ids.some(p=>cls.default_positions.includes(p)),`${record.record_id} position outside ${id}`);
  }
  if(c.awareness_id==='A0-no-demonstrated-systemic-awareness') assert(/not|no demonstrated|structural|represented|role|formal/i.test(c.mental_state_ceiling||''),`${record.record_id} A0 could imply ignorance`);
  if(c.awareness_id==='A2-tacit-constitutional-awareness') assert(record.disposition!=='supported_for_human_review'||Boolean(c.repeated_conduct_refs&&c.alternative_explanation_review),`${record.record_id} tacit awareness lacks repeated conduct and alternatives`);
  if(c.class_ids.includes('C09-counter-sovereign')) assert(c.constitutional_position_ids.includes('K4-counter-sovereign')&&c.effective_power_id==='P4-compulsory-revision-reversal-or-termination',`${record.record_id} counter-sovereign lacks compulsory power`);
  if(c.effective_power_id==='P4-compulsory-revision-reversal-or-termination') assert(c.constitutional_position_ids.includes('K4-counter-sovereign'),`${record.record_id} P4 lacks K4`);
  if(c.constitutional_position_ids.includes('R0-represented-subject')) assert(c.voice_basis,`${record.record_id} represented subject lacks voice basis`);
}

const used=new Set(wave.records.flatMap(x=>x.source_ids)); assert(used.size===wave.source_registry.length,'source registry contains unused source');
const countBy=values=>Object.fromEntries([...values.reduce((m,v)=>m.set(v,(m.get(v)||0)+1),new Map())].sort(([a],[b])=>a.localeCompare(b)));
const counts={
 subjects:wave.subjects.length,records:wave.records.length,sources:wave.source_registry.length,sources_used:used.size,systems:estate.system_chains.length,
 by_position:countBy(wave.records.flatMap(x=>x.classification.constitutional_position_ids)),
 by_awareness:countBy(wave.records.map(x=>x.classification.awareness_id)),
 by_orientation:countBy(wave.records.map(x=>x.classification.orientation_id)),
 by_power:countBy(wave.records.map(x=>x.classification.effective_power_id)),
 by_material_relation:countBy(wave.records.flatMap(x=>x.classification.material_relation_ids)),
 by_class:countBy(wave.records.flatMap(x=>x.classification.class_ids)),
 by_disposition:countBy(wave.records.map(x=>x.disposition)),
 represented_records:wave.records.filter(x=>x.classification.constitutional_position_ids.includes('R0-represented-subject')).length,
 represented_records_with_direct_subject_voice:wave.records.filter(x=>x.classification.constitutional_position_ids.includes('R0-represented-subject')&&/^(?:self-|collective-self-|direct-subject)/.test(x.classification.voice_basis)).length,
};
for(const key of Object.keys(counts))assert(JSON.stringify(estate.counts[key])===JSON.stringify(counts[key]),`count mismatch ${key}`);
assert(estate.system_chains.length>=5,'insufficient bounded system cross-sections');
for(const system of estate.system_chains){assert(system.system_id&&system.record_ids?.length,`invalid system chain`);for(const id of system.record_ids||[])assert(wave.records.some(r=>r.record_id===id),`${system.system_id} missing record ${id}`);assert(Object.keys(system.coverage||{}).length>=4,`${system.system_id} lacks coverage matrix`)}
assert(estate.counts.records>=30,'initial sample too small'); assert(estate.counts.represented_records>=3,'represented class absent');
assert(estate.counts.represented_records_with_direct_subject_voice===0,'Wave 01 direct represented voice result changed without milestone update');
assert(estate.counts.by_class['C04-aware-accommodator']>=1,'aware accommodation class absent');
assert(estate.counts.by_class['C17-constitutionally-subordinate-resource-provider']>=1,'subordinate resource-provider class absent');
assert(estate.counts.by_class['C18-public-host-sovereign']>=1,'public host sovereign class absent');
assert(estate.counts.by_power['P4-compulsory-revision-reversal-or-termination']===1,'P4 must remain singular in Wave 01');
assert(!forbidden.test(JSON.stringify({methodology,wave,estate})),'forbidden scoring or verdict language');
for(const b of [methodology.boundaries,wave.boundaries,estate.boundaries])assert(b.promotes_to==='candidate_only'&&b.graph_effect==='none'&&b.conclusion_generated===false&&b.estate_completion_claimed===false,'boundary exceeded');
for(const rel of ['build/core-thesis/constitutional-awareness/manifest.json','build/core-thesis/constitutional-awareness/class-matrix.json','reports/core-thesis/constitutional-awareness/data.json','reports/core-thesis/constitutional-awareness/index.html'])assert(exists(rel),`missing build output ${rel}`);
assert(build.source_fingerprint===report.source_fingerprint,'build/report fingerprint mismatch'); assert(report.counts.records===wave.records.length,'report record count mismatch');
if(errors.length){console.error('validate-m04e-constitutional-awareness failed:');for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log(`validate-m04e-constitutional-awareness: OK (${wave.records.length} records, ${wave.subjects.length} subjects, ${wave.source_registry.length} sources, ${estate.system_chains.length} systems)`);
