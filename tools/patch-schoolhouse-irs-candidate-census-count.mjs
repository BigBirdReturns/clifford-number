import fs from 'node:fs';
import path from 'node:path';

const builderPath = path.resolve(process.argv[2] || '');
const routesPath = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !fs.existsSync(builderPath) || !process.argv[3] || !fs.existsSync(routesPath)) {
  throw new Error(
    'usage: node tools/patch-schoolhouse-irs-candidate-census-count.mjs <builder-path> <source-routes-jsonl>'
  );
}

const routes = fs.readFileSync(routesPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${routesPath}:${index + 1}: ${error.message}`);
    }
  });

if (routes.length !== 6) {
  throw new Error(`expected 6 terminal IRS source routes, found ${routes.length}`);
}
if (routes.some(route => route.state !== 'captured_and_scanned')) {
  throw new Error('all IRS source routes must be captured_and_scanned before fixture repair');
}

const sourceRowsScanned = routes.reduce((routeTotal, route) => {
  if (!Array.isArray(route.members) || route.members.length === 0) {
    throw new Error(`route ${route.source_id || 'unknown'} has no scanned members`);
  }
  return routeTotal + route.members.reduce((memberTotal, member) => {
    if (!Number.isInteger(member.row_count) || member.row_count < 0) {
      throw new Error(`route ${route.source_id || 'unknown'} has invalid member row_count`);
    }
    return memberTotal + member.row_count;
  }, 0);
}, 0);

if (sourceRowsScanned !== 4428541) {
  throw new Error(`terminal IRS artifact scanned-row denominator drift: ${sourceRowsScanned}`);
}

let source = fs.readFileSync(builderPath, 'utf8');
const staleNumericFixtures = ['4394541', '7020930'];
const staleFormattedFixtures = ['4,394,541', '7,020,930'];
const replacements = [];

for (const fixture of staleNumericFixtures) {
  const count = source.split(fixture).length - 1;
  if (count > 0) {
    source = source.replaceAll(fixture, String(sourceRowsScanned));
    replacements.push({ fixture, count });
  }
}
for (const fixture of staleFormattedFixtures) {
  const count = source.split(fixture).length - 1;
  if (count > 0) {
    source = source.replaceAll(fixture, sourceRowsScanned.toLocaleString('en-US'));
    replacements.push({ fixture, count });
  }
}

for (const fixture of [...staleNumericFixtures, ...staleFormattedFixtures]) {
  if (source.includes(fixture)) {
    throw new Error(`stale scanned-row fixture survived repair: ${fixture}`);
  }
}
if (!source.includes(String(sourceRowsScanned))) {
  throw new Error('correct numeric scanned-row denominator is absent after repair');
}
if (!source.includes(sourceRowsScanned.toLocaleString('en-US'))) {
  throw new Error('correct formatted scanned-row denominator is absent after repair');
}

fs.writeFileSync(builderPath, source);
console.log(JSON.stringify({
  patched_file: builderPath,
  source_routes_file: routesPath,
  source_routes: routes.length,
  source_rows_scanned: sourceRowsScanned,
  replacements
}));
