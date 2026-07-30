#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPublicationArtifact,
  refreshPublicationManifest,
  validatePublicationArtifact,
  validatePublicationPlan,
} from '../tools/lib/publication-manifest.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-publication-'));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const plan = {
  schema_version: 'clifford-publication-plan@1',
  publication_id: 'fixture',
  as_of: '2026-07-29',
  status: 'active_status_aware_positive_allowlist',
  origin: 'https://example.invalid/',
  default_decision: 'exclude',
  public_status: 'public',
  entries: [
    { path: 'index.html', kind: 'file', status: 'public' },
    { path: 'app.js', kind: 'file', status: 'public' },
    { path: 'build/public-catalog.json', kind: 'file', status: 'public' },
  ],
  catalog_guards: [
    { path: 'build/public-catalog.json', collection: 'cases', status_field: 'status', allowed_statuses: ['review_required'], href_keys: ['href'], nested_href_keys: [], failure_mode: 'fail_closed' },
  ],
  allowed_dependency_prefixes: ['assets/', 'build/cases/'],
  generated_outputs: ['.nojekyll', 'Standalone.html'],
  held_surfaces: [
    { path: 'reports/private/', status: 'staged_nonpublic', may_publish_to_github_pages: false, graph_effect: 'none' },
  ],
  forbidden_dist_paths: ['graph.json'],
  forbidden_dist_prefixes: ['legacy/', 'reports/private/'],
  boundaries: {
    recursive_repository_copy_allowed: false,
    unclassified_dependency_allowed: false,
    held_surface_is_deployed: false,
    generic_edge_graph_is_public_route_product: false,
    graph_effect: 'none',
  },
};
write('index.html', '<link rel="stylesheet" href="assets/site.css"><script src="app.js"></script>');
write('app.js', "fetch('build/public-catalog.json');");
write('assets/site.css', 'body{background:url("paper.png")}');
write('assets/paper.png', Buffer.from([1, 2, 3]));
write('build/public-catalog.json', JSON.stringify({ cases: [{ case_id: 'C1', status: 'review_required', href: 'build/cases/C1.json' }] }));
write('build/cases/C1.json', '{"ok":true}');
write('reports/private/index.html', 'private');
write('graph.json', '{"edges":[]}');
write('data/project/publication-plan.json', JSON.stringify(plan, null, 2));
write('tools/build-pages.mjs', "import { buildPublicationArtifact } from './lib/publication-manifest.mjs';\nbuildPublicationArtifact();\n");

const validation = validatePublicationPlan(plan, { root });
assert.equal(validation.ok, true, validation.failures.join('\n'));
buildPublicationArtifact({ root, destination: path.join(root, 'dist') });
for (const relative of ['index.html', 'app.js', 'assets/site.css', 'assets/paper.png', 'build/public-catalog.json', 'build/cases/C1.json', '.nojekyll']) {
  assert.ok(fs.existsSync(path.join(root, 'dist', relative)), relative);
}
assert.equal(fs.existsSync(path.join(root, 'dist', 'graph.json')), false);
assert.equal(fs.existsSync(path.join(root, 'dist', 'reports/private/index.html')), false);
write('dist/Standalone.html', '<!doctype html>');
refreshPublicationManifest({ root, destination: path.join(root, 'dist') });
assert.equal(validatePublicationArtifact({ root, destination: path.join(root, 'dist') }).ok, true);

write('dist/unclassified.txt', 'leak');
let checked = validatePublicationArtifact({ root, destination: path.join(root, 'dist') });
assert.equal(checked.ok, false);
assert.ok(checked.failures.some(item => item.includes('unclassified')));
fs.rmSync(path.join(root, 'dist', 'unclassified.txt'));
refreshPublicationManifest({ root, destination: path.join(root, 'dist') });

const unsafe = structuredClone(plan);
unsafe.entries[0].path = '../escape.html';
assert.equal(validatePublicationPlan(unsafe, { root }).ok, false);

write('build/public-catalog.json', JSON.stringify({ cases: [{ case_id: 'C1', status: 'blocked', href: 'build/cases/C1.json' }] }));
assert.throws(() => buildPublicationArtifact({ root, destination: path.join(root, 'blocked-dist') }), /non-public status/);
write('build/public-catalog.json', JSON.stringify({ cases: [{ case_id: 'C1', status: 'review_required', href: 'build/cases/C1.json' }] }));

write('index.html', '<script src="secret/runtime.js"></script>');
write('secret/runtime.js', 'console.log("secret")');
assert.throws(() => buildPublicationArtifact({ root, destination: path.join(root, 'unclassified-dist') }), /not classified/);

fs.rmSync(root, { recursive: true, force: true });
console.log('publication-manifest.test: OK');
