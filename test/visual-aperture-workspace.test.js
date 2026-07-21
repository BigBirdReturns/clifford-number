import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APERTURE_WORKSPACE_STORAGE_KEY,
  APERTURE_WORKSPACE_VERSION,
  emptyApertureWorkspace,
  getApertureWorkspacePins,
  normalizeApertureWorkspace,
  parseApertureWorkspace,
  recordApertureWorkspaceRoute,
  removeApertureWorkspaceCompare,
  removeApertureWorkspaceView,
  saveApertureWorkspaceView,
  serializeApertureWorkspace,
  setApertureWorkspacePins,
  toggleApertureWorkspaceCompare
} from '../src/visual-aperture-workspace.mjs';

assert.equal(APERTURE_WORKSPACE_VERSION, '1');
assert.equal(APERTURE_WORKSPACE_STORAGE_KEY, 'clifford-aperture-workspace');
assert.deepEqual(parseApertureWorkspace('{bad json'), emptyApertureWorkspace());
assert.deepEqual(normalizeApertureWorkspace({ version: '2', savedViews: [{ id: 'stale' }] }), emptyApertureWorkspace());

const query = new URLSearchParams({
  ap_v: '1', ap_mode: 'surface', ap_surface_id: 'surface-a', ap_surface_query: 'official',
  ap_surface_budget: '18', unrelated: 'must not persist', ap_evidence_prose: 'must not persist either'
}).toString();
let workspace = saveApertureWorkspaceView(emptyApertureWorkspace(), {
  id: 'view-a', name: '  Surface   review  ', query, savedAt: '2026-07-21T01:00:00Z',
  plain: 'This sentence must never enter local storage.', receipts: ['receipt-secret']
});
assert.equal(workspace.savedViews.length, 1);
assert.equal(workspace.savedViews[0].name, 'Surface review');
const storedViewQuery = new URLSearchParams(workspace.savedViews[0].query);
assert.equal(storedViewQuery.get('ap_surface_id'), 'surface-a');
assert.equal(storedViewQuery.has('unrelated'), false);
assert.equal(storedViewQuery.has('ap_evidence_prose'), false);
assert.deepEqual(Object.keys(workspace.savedViews[0]).sort(), ['id', 'name', 'query', 'savedAt']);

for (let index = 0; index < 15; index += 1) {
  workspace = saveApertureWorkspaceView(workspace, {
    id: `view-${index}`,
    name: `View ${index}`,
    query: 'ap_v=1&ap_mode=map&ap_map_scale=1',
    savedAt: new Date(Date.UTC(2026, 6, 21, 2, index)).toISOString()
  });
}
assert.equal(workspace.savedViews.length, 12);
assert.equal(workspace.savedViews[0].id, 'view-14');
workspace = removeApertureWorkspaceView(workspace, 'view-14');
assert.equal(workspace.savedViews.some(view => view.id === 'view-14'), false);

for (let index = 0; index < 11; index += 1) {
  workspace = recordApertureWorkspaceRoute(workspace, {
    fromId: `actor-${index}`,
    toId: 'anchor',
    asOf: index % 2 ? '2025' : '',
    evidenceFloor: index % 3 ? 'reported' : 'official',
    visitedAt: new Date(Date.UTC(2026, 6, 21, 3, index)).toISOString(),
    result: 'must not persist', receipts: ['must-not-persist']
  });
}
assert.equal(workspace.recentRoutes.length, 8);
assert.equal(workspace.recentRoutes[0].fromId, 'actor-10');
assert.deepEqual(Object.keys(workspace.recentRoutes[0]).sort(), ['asOf', 'evidenceFloor', 'fromId', 'toId', 'visitedAt']);
workspace = recordApertureWorkspaceRoute(workspace, {
  ...workspace.recentRoutes[0],
  visitedAt: '2026-07-21T05:00:00Z'
});
assert.equal(workspace.recentRoutes.filter(route => route.fromId === 'actor-10').length, 1, 'duplicate route controls must move rather than multiply');

const manyActors = Array.from({ length: 50 }, (_, index) => `actor-${String(49 - index).padStart(2, '0')}`);
workspace = setApertureWorkspacePins(workspace, {
  surfaceId: 'surface-a', actorIds: manyActors, updatedAt: '2026-07-21T06:00:00Z',
  labels: ['must not persist']
});
assert.deepEqual(getApertureWorkspacePins(workspace, 'surface-a'), [...manyActors].sort().slice(0, 36));
for (let index = 0; index < 24; index += 1) {
  workspace = setApertureWorkspacePins(workspace, {
    surfaceId: `surface-${index}`,
    actorIds: [`actor-${index}`],
    updatedAt: new Date(Date.UTC(2026, 6, 21, 7, index)).toISOString()
  });
}
assert.equal(workspace.pinSets.length, 20);

workspace = toggleApertureWorkspaceCompare(workspace, { kind: 'actor', id: 'actor-a', label: 'must not persist' });
workspace = toggleApertureWorkspaceCompare(workspace, { kind: 'surface', id: 'surface-a' });
workspace = toggleApertureWorkspaceCompare(workspace, { kind: 'actor', id: 'actor-b' });
assert.deepEqual(workspace.compare, [{ kind: 'surface', id: 'surface-a' }, { kind: 'actor', id: 'actor-b' }], 'the compare tray must remain a two-slot identifier list');
workspace = toggleApertureWorkspaceCompare(workspace, { kind: 'actor', id: 'actor-b' });
assert.deepEqual(workspace.compare, [{ kind: 'surface', id: 'surface-a' }]);
workspace = removeApertureWorkspaceCompare(workspace, 'surface', 'surface-a');
assert.deepEqual(workspace.compare, []);

const serialized = serializeApertureWorkspace(workspace);
assert.deepEqual(parseApertureWorkspace(serialized), normalizeApertureWorkspace(workspace));
for (const forbidden of ['This sentence must never enter', 'receipt-secret', 'must not persist', 'result']) assert.equal(serialized.includes(forbidden), false, `${forbidden} must not enter workspace storage`);

const moduleFiles = ['src/visual-aperture-core.mjs', 'src/visual-aperture-state.mjs', 'src/visual-aperture-workspace.mjs'];
const moduleRecords = moduleFiles.map(file => {
  const source = readFileSync(file, 'utf8');
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  return { names, body: source.replace(/^export\s+/gm, '') };
});
const names = [...new Set(moduleRecords.flatMap(record => record.names))];
const modules = moduleRecords.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
const runtime = [
  readFileSync('src/visual-aperture-workspace-runtime.js', 'utf8'),
  ...Array.from({ length: 11 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8'))
].join('\n\n');
const standaloneShape = `(function visualApertureBundle() {\n${modules}\n(function visualApertureRuntime() {\nconst { ${names.join(', ')} } = globalThis;\n${runtime}\n})();\n})();`;
assert.doesNotThrow(() => new Function(standaloneShape), 'the workspace and aperture runtime must parse in the exact standalone concatenation order');

console.log('visual-aperture-workspace.test.js: OK');
