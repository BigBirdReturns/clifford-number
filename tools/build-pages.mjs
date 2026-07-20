#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const files = ['index.html', 'app.js', 'styles.css', 'package.json', 'graph.json'];
const directories = ['assets', 'docs', 'data', 'build', 'cases', 'contributions', 'demos', 'legacy', 'src', 'receipts'];

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
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log(`build-pages: ${files.length} files and ${directories.length} directories copied`);
