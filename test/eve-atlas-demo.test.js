import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  denseSurfaces,
  diagnosePathFilters,
  selectBudgetedParticipants,
  semanticLevel,
  shortestFilteredPath,
  summarizeClusters
} from '../demos/eve-atlas/demo-core.mjs';
import { sampleData } from '../demos/eve-atlas/sample-data.mjs';

const data = sampleData();
const labels = new Map(data.surfaceGraph.actors.map(actor => [actor.id, actor.label]));

assert.equal(semanticLevel(1), 'corpus');
assert.equal(semanticLevel(1.8), 'machine');
assert.equal(semanticLevel(3.2), 'surface');
assert.equal(semanticLevel(4.4), 'evidence');

const clusters = summarizeClusters(data.surfaceGraph);
assert.ok(clusters.some(cluster => cluster.id === 'policy' && cluster.surfaceCount >= 2));
assert.ok(clusters.some(cluster => cluster.id === 'forums' && cluster.actorCount >= 30));

const openPath = shortestFilteredPath(data.hopGraph, 'ben-warner', 'matt-clifford');
assert.equal(openPath.number, 2);
assert.deepEqual(openPath.actorPath, ['ben-warner', 'alex-cooper', 'matt-clifford']);
assert.deepEqual(openPath.hops.map(hop => hop.basis.surface_id), [
  'electric-twin-founder-2023',
  'founders-policy-forum-2024'
]);

const pathDuring2024 = shortestFilteredPath(data.hopGraph, 'ben-warner', 'matt-clifford', { asOf: '2024' });
assert.equal(pathDuring2024.number, 2);
assert.equal(shortestFilteredPath(data.hopGraph, 'ben-warner', 'matt-clifford', { asOf: '2025' }), null);
assert.equal(shortestFilteredPath(data.hopGraph, 'ben-warner', 'matt-clifford', { evidenceFloor: 'official' }), null);

const diagnostics = diagnosePathFilters(data.hopGraph, { evidenceFloor: 'official', asOf: '2024' });
assert.ok(diagnostics.evidenceBlockedBases > 0);
assert.ok(diagnostics.timeBlockedBases + diagnostics.undatedBlockedBases > 0);

const dense = denseSurfaces(data.surfaceGraph)[0];
assert.equal(dense.surface.surface_id, 'dialog-public-directory-2026');
assert.ok(dense.actorCount >= 30);
assert.equal(dense.surface.hop_eligible, false);

const pinnedId = 'directory-person-20';
const budgeted = selectBudgetedParticipants(dense.surface, {
  budget: 6,
  pinnedIds: new Set([pinnedId]),
  labels
});
assert.equal(budgeted.visible.length, 6);
assert.equal(budgeted.visible[0].actor_id, pinnedId);
assert.ok(budgeted.hiddenByBudget > 0);

const queried = selectBudgetedParticipants(dense.surface, {
  query: 'Public official',
  budget: 36,
  labels
});
assert.ok(queried.visible.length > 0);
assert.ok(queried.visible.every(participant => participant.role.includes('Public official')));

const html = readFileSync('demos/eve-atlas/index.html', 'utf8');
const css = readFileSync('demos/eve-atlas/styles.css', 'utf8');
const app = ['app.mjs', 'app-part-1.js', 'app-part-2.js', 'app-part-3.js', 'app-part-4.js', 'app-part-5.js']
  .map(file => readFileSync(`demos/eve-atlas/${file}`, 'utf8'))
  .join('\n');
const readme = readFileSync('demos/eve-atlas/README.md', 'utf8');

for (const id of ['panel-semantic', 'panel-route', 'panel-dense', 'semantic-svg', 'route-svg', 'dense-svg']) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must ship in the demo shell`);
}
assert.match(html, /Visual prominence does not establish contact, influence, coordination, intent, wrongdoing, or importance/);
assert.match(html, /role="tablist"/);
assert.match(html, /aria-labelledby="tab-semantic"/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /:focus-visible/);
assert.match(app, /shortestFilteredPath/);
assert.match(app, /selectBudgetedParticipants/);
assert.match(app, /No pairwise lines|no pairwise lines/i);
assert.match(readme, /do not modify canonical identity/);

console.log('eve-atlas-demo.test.js: OK');
