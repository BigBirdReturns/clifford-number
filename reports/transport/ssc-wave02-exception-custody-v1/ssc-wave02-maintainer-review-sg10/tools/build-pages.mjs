#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const files = ['index.html', 'app.js', 'styles.css', 'package.json', 'graph.json'];
const directories = ['assets', 'docs', 'data', 'build', 'cases', 'contributions', 'legacy', 'src', 'receipts', 'briefs', 'reports', 'estates', 'gametrails'];

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(destination, file));
for (const directory of directories) fs.cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true });
// Intake is public-record research material in the repository, but it is not
// part of the published corpus until separately promoted into canonical truth.
// Local support data is private and must never enter a deploy artifact.
fs.rmSync(path.join(destination, 'data', 'crawl'), { recursive: true, force: true });
fs.rmSync(path.join(destination, 'data', 'intake'), { recursive: true, force: true });
fs.rmSync(path.join(destination, 'data', 'local'), { recursive: true, force: true });
fs.rmSync(path.join(destination, 'receipts', 'crawl'), { recursive: true, force: true });
// SSC-H01 is a canonical field hypothesis but remains publication-blocked.
// Keep its exact source and review products in repository custody while the
// positive publication allowlist is still an open dependency.
for (const heldPath of [
  ['build', 'core-thesis', 'status-sovereignty'],
  ['reports', 'core-thesis', 'status-sovereignty'],
  ['data', 'project', 'status-sovereignty-compact.json'],
  ['data', 'project', 'status-sovereignty-fanout.json'],
  ['data', 'project', 'status-sovereignty-release-manifest.json'],
  ['data', 'project', 'status-sovereignty-source-registry.json'],
  ['data', 'project', 'status-sovereignty-wave-01-release-manifest.json'],
  ['data', 'project', 'status-sovereignty-wave-01-maintainer-review-release-manifest.json'],
  ['data', 'project', 'status-sovereignty-wave-01-targeted-acquisition-release-manifest.json'],
  ['data', 'research', 'status-sovereignty-wave-01-source-receipts.json'],
  ['data', 'research', 'status-sovereignty-wave-01.json'],
  ['data', 'research', 'status-sovereignty-wave-01-maintainer-review.json'],
  ['data', 'research', 'status-sovereignty-wave-01-targeted-acquisition-source-receipts.json'],
  ['data', 'research', 'status-sovereignty-wave-01-targeted-acquisition.json'],
  ['data', 'project', 'status-sovereignty-wave-01-second-party-review-campaign.json'],
  ['data', 'project', 'status-sovereignty-wave-01-second-party-review-packet-registry.json'],
  ['data', 'project', 'status-sovereignty-wave-01-second-party-review-release-manifest.json'],
  ['data', 'research', 'status-sovereignty-wave-01-second-party-review-candidates.json'],
  ['data', 'research', 'status-sovereignty-wave-01-second-party-review-responses.json'],
  ['data', 'project', 'status-sovereignty-wave-02-intake-release-manifest.json'],
  ['data', 'project', 'status-sovereignty-wave-02-maintainer-review-release-manifest.json'],
  ['data', 'research', 'status-sovereignty-wave-02.json'],
  ['data', 'research', 'status-sovereignty-wave-02-maintainer-review.json'],
  ['docs', 'methods', 'status-sovereignty-compact.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-fanout.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-01.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-01-review.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-01-targeted-acquisition.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-01-second-party-review.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-02-intake.md'],
  ['docs', 'milestones', 'm05-status-sovereignty-wave-02-review.md'],
]) fs.rmSync(path.join(destination, ...heldPath), { recursive: true, force: true });
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log(`build-pages: ${files.length} files and ${directories.length} directories copied`);
