#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const catalog=read('data/intake/security-state-organism-source-routes.json');
const registry=read('data/project/security-state-entity-registry.json');
const estates=read('data/project/security-state-estate-alignment.json');
const work=read('data/project/security-state-work-packages.json');
const declared=new Set();
for(const row of registry.entities) for(const id of row.primary_source_routes??[]) declared.add(id);
for(const row of estates.estates) for(const id of row.source_route_ids??[]) declared.add(id);
for(const row of work.packages) for(const id of row.source_route_ids??[]) declared.add(id);
const present=new Set(catalog.routes.map(x=>x.route_id));
const missing=[...declared].filter(x=>!present.has(x)).sort();
const jurisdiction=id=>id.startsWith('ISRAEL')||id.startsWith('IDF')?'Israel':id.startsWith('UK-')?'United Kingdom':id.startsWith('EU-')?'European Union':id.startsWith('NATO')?'NATO':id.startsWith('UKRAINE')?'Ukraine':'United States';
for(const route_id of missing){catalog.routes.push({route_id,label:route_id.replaceAll('-',' '),venue:'Declared official or primary-public source family',jurisdiction:jurisdiction(route_id),url:'https://www.usa.gov/',access:'exact_locator_pending',evidence_classes:['identity','roles','transactions','public gates','deployment','rights','consequences','counterpower'],notes:'This route was declared by an entity or proof packet but lacked a catalog row. It remains acquisition infrastructure pending an exact official locator; route presence is not evidence.'});}
catalog.routes.sort((a,b)=>a.route_id.localeCompare(b.route_id));
catalog.counts={routes:catalog.routes.length,reconciled_missing_routes:missing.length};
write('data/intake/security-state-organism-source-routes.json',catalog);
console.log(JSON.stringify({declared:declared.size,previously_present:present.size,reconciled:missing},null,2));
