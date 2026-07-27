#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverFrozenRoutes, runSourceEcologyOrbit } from './lib/m04g-source-ecology-v2.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=new Map();
for(let i=2;i<process.argv.length;i++){
  const token=process.argv[i];
  if(token.startsWith('--')){
    const [key,inline]=token.split('=',2);
    if(inline!==undefined)args.set(key,inline);
    else if(process.argv[i+1]&&!process.argv[i+1].startsWith('--'))args.set(key,process.argv[++i]);
    else args.set(key,true);
  }
}
const policy=JSON.parse(fs.readFileSync(path.join(root,'data/project/m04g-source-ecology-v2-policy.json'),'utf8'));
const outputDir=path.resolve(root,String(args.get('--output-dir')||'build/m04g-source-ecology-v2'));
if(args.has('--discover-only')||args.has('--dry-run')){
  const discovery=discoverFrozenRoutes(root,{expectedRoutes:policy.denominator.expected_routes,expectedBasins:policy.denominator.expected_basins,expectedPerBasin:policy.denominator.expected_routes_per_basin});
  fs.mkdirSync(outputDir,{recursive:true});
  fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-discovery.json'),JSON.stringify(discovery,null,2)+'\n');
  console.log(`m04g-source-ecology-v2 discovery: ${discovery.routes.length} routes, ${discovery.basins.length} basins, ${discovery.registry_file}:${discovery.registry_path}`);
  process.exit(0);
}
const result=await runSourceEcologyOrbit(root,policy,{outputDir,live:true});
console.log(JSON.stringify(result.summary,null,2));
if(args.has('--strict')&&!result.summary.coverage_healthy)process.exitCode=2;
